import '@helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { resetFetchMocks, runFullSchematics, runApiSchematic, setupSwaggerMock, ANGULAR_SCHEMATIC_OPTIONS, RTK_SCHEMATIC_OPTIONS } from '@helpers/setup';
import { V1_PREFIX_SWAGGER_SCHEMA } from '@fixtures/swagger/v1-prefix-schema.fixture';

const OPTIONS = { ...ANGULAR_SCHEMATIC_OPTIONS, apiPathKey: '/v1/' };
const PROVIDER = `${OPTIONS.path}/_provide-api.ts`;

describe('provideApi (Angular)', () => {
  afterEach(() => {
    resetFetchMocks();
  });

  it('generates provideApi next to the base files, building on API_BASE_URL', async () => {
    const tree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, OPTIONS);
    const provider = tree.readContent(PROVIDER);

    expect(provider).toContain("import { API_BASE_URL } from './_api-base-url.token';");
    expect(provider).toContain('export function provideApi(config: IApiConfig): EnvironmentProviders {');
    expect(provider).toContain("{ provide: API_BASE_URL, useFactory: baseUrl }");
    expect(provider).toContain("{ provide: API_BASE_URL, useValue: baseUrl }");
    expect(provider).toMatchSnapshot();
  });

  it('regenerates it on every run', async () => {
    const tree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, OPTIONS);
    const original = tree.readContent(PROVIDER);
    tree.overwrite(PROVIDER, '// edited\n');

    setupSwaggerMock(OPTIONS.swaggerSchemaUrl, V1_PREFIX_SWAGGER_SCHEMA);
    const rerun = await runApiSchematic(OPTIONS, tree);

    expect(rerun.readContent(PROVIDER)).toBe(original);
  });

  it('follows a custom baseApiPath', async () => {
    const tree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, { ...OPTIONS, baseApiPath: '/core/http' });

    expect(tree.files).toContain('/core/http/_provide-api.ts');
    expect(tree.files).toContain('/core/http/_api-base-url.token.ts');
  });

  it('is not recorded as schema output, so an empty schema still deletes nothing', async () => {
    const tree: UnitTestTree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, OPTIONS);
    const manifest = JSON.parse(tree.readContent(`${OPTIONS.path}/.swagger-schematics-manifest.json`));
    expect(manifest.api).not.toContain('_provide-api.ts');

    setupSwaggerMock(OPTIONS.swaggerSchemaUrl, { ...V1_PREFIX_SWAGGER_SCHEMA, paths: {} } as typeof V1_PREFIX_SWAGGER_SCHEMA);
    const emptied = await runApiSchematic(OPTIONS, tree);

    expect(emptied.files).toContain(`${OPTIONS.path}/widget-api.service.ts`);
  });

  it('is not generated for RTK', async () => {
    const tree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, { ...RTK_SCHEMATIC_OPTIONS, apiPathKey: '/v1/' });

    expect(tree.files.some(file => file.endsWith('_provide-api.ts'))).toBe(false);
  });
});
