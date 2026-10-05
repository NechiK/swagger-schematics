/**
 * Writes the Angular output for every swagger fixture into each
 * `compat/angular-<version>/generated/` project at the repository root, where
 * `npm run typecheck` compiles it against that Angular version under `strict`.
 *
 * Not part of `npm test` (the file name doesn't match `*.spec.ts`); run it with
 * `npm run compat:generate`.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ANGULAR_SCHEMATIC_OPTIONS, resetFetchMocks, runFullSchematics, SchematicOptions } from '@helpers/setup';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';
import { SWAGGER_SCHEMA } from '@fixtures/swagger/full-schema.fixture';
import { AGGREGATABLE_SWAGGER_SCHEMA } from '@fixtures/swagger/aggregatable-schema.fixture';
import { BINARY_SWAGGER_SCHEMA } from '@fixtures/swagger/binary-schema.fixture';
import { EDGE_CASES_SWAGGER_SCHEMA } from '@fixtures/swagger/edge-cases-schema.fixture';
import { HEADER_PARAMS_SWAGGER_SCHEMA } from '@fixtures/swagger/header-params-schema.fixture';
import { OPENAPI_31_SWAGGER_SCHEMA } from '@fixtures/swagger/openapi-31-schema.fixture';
import { V1_PREFIX_SWAGGER_SCHEMA } from '@fixtures/swagger/v1-prefix-schema.fixture';

const COMPAT_ROOT = path.join(__dirname, '../../../../compat');
const OUTPUT_PATH = ANGULAR_SCHEMATIC_OPTIONS.path;

interface ICompatCase {
  schema: ISwaggerSchema<string>;
  options?: Partial<SchematicOptions>;
}

const CASES: Record<string, ICompatCase> = {
  full: { schema: SWAGGER_SCHEMA },
  'full-legacy-optional': { schema: SWAGGER_SCHEMA, options: { legacyOptionalProperties: true } },
  'full-exclude-deprecated': { schema: SWAGGER_SCHEMA, options: { excludeDeprecated: true } },
  aggregatable: { schema: AGGREGATABLE_SWAGGER_SCHEMA },
  binary: { schema: BINARY_SWAGGER_SCHEMA },
  'edge-cases': { schema: EDGE_CASES_SWAGGER_SCHEMA },
  'edge-cases-legacy-optional': { schema: EDGE_CASES_SWAGGER_SCHEMA, options: { legacyOptionalProperties: true } },
  'header-params': { schema: HEADER_PARAMS_SWAGGER_SCHEMA as ISwaggerSchema<string> },
  'openapi-31': { schema: OPENAPI_31_SWAGGER_SCHEMA },
  'v1-prefix': { schema: V1_PREFIX_SWAGGER_SCHEMA, options: { apiPathKey: '/v1/' } },
};

// How an app wires the generated services up, so `provideApi()` is checked
// from the caller's side as well.
const USAGE_SOURCE = `import { InjectionToken, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

import { provideApi } from './_provide-api';

const APP_CONFIG = new InjectionToken<{ apiUrl: string }>('APP_CONFIG');

export const staticBaseUrlProviders = [provideHttpClient(), provideApi({ baseUrl: 'https://api.example.com' })];
export const runtimeBaseUrlProviders = [provideHttpClient(), provideApi({ baseUrl: () => inject(APP_CONFIG).apiUrl })];
`;

const compatProjects = (): string[] =>
  fs.readdirSync(COMPAT_ROOT)
    .filter(name => name.startsWith('angular-'))
    .map(name => path.join(COMPAT_ROOT, name, 'generated'));

describe('compat: generate Angular output', () => {
  afterEach(() => resetFetchMocks());

  it('writes every case into each compat project', async () => {
    const outputDirs = compatProjects();
    expect(outputDirs.length).toBeGreaterThan(0);
    outputDirs.forEach(dir => fs.rmSync(dir, { recursive: true, force: true }));

    for (const [name, { schema, options }] of Object.entries(CASES)) {
      const tree = await runFullSchematics(schema, {
        ...ANGULAR_SCHEMATIC_OPTIONS,
        swaggerSchemaUrl: `https://api.example.com/compat/${name}.json`,
        ...options,
      });
      const files = tree.files.filter(file => file.startsWith(`${OUTPUT_PATH}/`) && file.endsWith('.ts'));
      expect(files).toContain(`${OUTPUT_PATH}/_provide-api.ts`);

      for (const dir of outputDirs) {
        const caseDir = path.join(dir, name);
        for (const file of files) {
          const target = path.join(caseDir, path.relative(OUTPUT_PATH, file));
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, tree.readContent(file));
        }
        fs.writeFileSync(path.join(caseDir, 'usage.ts'), USAGE_SOURCE);
      }
    }
  });
});
