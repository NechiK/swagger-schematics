import '@helpers/matchers';
import {
  resetFetchMocks,
  runFullSchematics,
  ANGULAR_SCHEMATIC_OPTIONS,
  RTK_SCHEMATIC_OPTIONS
} from '@helpers/setup';
import { HEADER_PARAMS_SWAGGER_SCHEMA } from '@fixtures/swagger/header-params-schema.fixture';

describe('header parameters in generated code', () => {
  afterEach(() => {
    resetFetchMocks();
  });

  it('Angular: passes headers in the HttpClient options for GET, PUT and DELETE', async () => {
    const tree = await runFullSchematics(HEADER_PARAMS_SWAGGER_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const service = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/orders-api.service.ts`);

    expect(service).toContain("{ headers: { 'X-Tenant-Id': String(xTenantId), ...(ifNoneMatch != null ? { 'If-None-Match': String(ifNoneMatch) } : {}) } }");
    expect(service).toContain("{ headers: { 'Idempotency-Key': String(idempotencyKey) } }");
    expect(service).toContain("{ params: omitBy({ page }, isNil), headers: {");
    expect(service).not.toContain('Authorization');
    expect(service).toMatchSnapshot();
  });

  it('RTK: passes headers in the query definition', async () => {
    const tree = await runFullSchematics(HEADER_PARAMS_SWAGGER_SCHEMA, RTK_SCHEMATIC_OPTIONS);
    const slice = tree.readContent(`${RTK_SCHEMATIC_OPTIONS.path}/orders.api.ts`);

    expect(slice).toContain('query: ({ id, xTenantId, ifNoneMatch }) => ({');
    expect(slice).toContain("headers: { 'Idempotency-Key': String(idempotencyKey) },");
    expect(slice).not.toContain('Authorization');
    expect(slice).toMatchSnapshot();
  });
});
