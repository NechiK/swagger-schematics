import type { MockInstance } from 'vitest';
import '@helpers/matchers';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resetFetchMocks, runFullSchematics, runApiSchematic, setupSwaggerMock, ANGULAR_SCHEMATIC_OPTIONS } from '@helpers/setup';
import { V1_PREFIX_SWAGGER_SCHEMA } from '@fixtures/swagger/v1-prefix-schema.fixture';

const OPTIONS = { ...ANGULAR_SCHEMATIC_OPTIONS, apiPathKey: '/v1/' };
const SERVICE = `${OPTIONS.path}/widget-api.service.ts`;
const FIXTURES = path.join(__dirname, '../../__fixtures__');

describe('Custom template paths', () => {
  let cwd: MockInstance;

  beforeEach(() => {
    // The project root: relative template paths resolve from here
    cwd = vi.spyOn(process, 'cwd').mockReturnValue(FIXTURES);
  });

  afterEach(() => {
    cwd.mockRestore();
    resetFetchMocks();
  });

  it('resolves a relative apiServiceTemplatePath from the project root', async () => {
    const tree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, {
      ...OPTIONS,
      apiServiceTemplatePath: './templates/angular-custom-api-service'
    });

    expect(tree.readContent(SERVICE)).toContain('// Custom template');
  });

  it('resolves a relative baseApiTemplatePath from the project root', async () => {
    const tree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, {
      ...OPTIONS,
      baseApiTemplatePath: 'templates/angular-base-without-token'
    });

    expect(tree.files).toContain(`${OPTIONS.path}/_api-base.service.ts`);
    expect(tree.files).not.toContain(`${OPTIONS.path}/_api-base-url.token.ts`);
  });

  it('accepts an absolute path', async () => {
    const tree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, {
      ...OPTIONS,
      apiServiceTemplatePath: path.join(FIXTURES, 'templates/angular-custom-api-service')
    });

    expect(tree.readContent(SERVICE)).toContain('// Custom template');
  });

  it.each(['apiServiceTemplatePath', 'baseApiTemplatePath'])(
    'fails on a missing %s and keeps the services generated earlier',
    async option => {
      const tree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, OPTIONS);
      setupSwaggerMock(OPTIONS.swaggerSchemaUrl, V1_PREFIX_SWAGGER_SCHEMA);

      await expect(runApiSchematic({ ...OPTIONS, [option]: './templates/typo' }, tree))
        .rejects.toThrow(`${option}: template directory '${path.join(FIXTURES, 'templates/typo')}' not found`);
      expect(tree.files).toContain(SERVICE);
    }
  );

  it('fails on a directory without .template files', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swagger-schematics-templates-'));
    fs.writeFileSync(path.join(emptyDir, 'README.md'), 'not a template\n');
    setupSwaggerMock(OPTIONS.swaggerSchemaUrl, V1_PREFIX_SWAGGER_SCHEMA);

    try {
      await expect(runApiSchematic({ ...OPTIONS, apiServiceTemplatePath: emptyDir }))
        .rejects.toThrow(`apiServiceTemplatePath: '${emptyDir}' contains no .template files`);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
