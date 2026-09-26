import '@helpers/matchers';
import { resetFetchMocks, runFullSchematics, runApiSchematic, setupSwaggerMock, ANGULAR_SCHEMATIC_OPTIONS } from '@helpers/setup';
import { matchesApiName, transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import { buildApiModel } from '@lib/helpers/api-changes/api-model';
import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';

const OUT = ANGULAR_SCHEMATIC_OPTIONS.path;
const ok = { '204': { description: 'ok' } };
const SCHEMA = {
  openapi: '3.0.1',
  info: { title: 'Filtering', version: 'v1' },
  paths: {
    '/api/Orders': { get: { tags: ['Orders'], responses: ok }, post: { tags: ['Orders'], deprecated: true, responses: ok } },
    '/api/Users': { get: { tags: ['Users'], responses: ok } },
    '/api/Admin': { get: { tags: ['Admin'], responses: ok } },
    '/api/InternalJobs': { get: { tags: ['InternalJobs'], responses: ok } },
    '/api/replacement-queue': { get: { tags: ['Queue'], responses: ok } },
    '/api/Legacy': { get: { tags: ['Legacy'], deprecated: true, responses: ok } }
  },
  components: { schemas: {} }
} as unknown as ISwaggerSchema;

const apis = (options: Parameters<typeof transformSwaggerSchema>[1]) =>
  Object.keys(transformSwaggerSchema(SCHEMA, { silent: true, ...options })).sort();

describe('API filtering', () => {
  afterEach(() => {
    resetFetchMocks();
  });

  it('generates every API by default', () => {
    expect(apis({})).toEqual(['Admin', 'InternalJobs', 'Legacy', 'Orders', 'Users', 'replacement-queue']);
    expect(apis({ includeApis: [], excludeApis: [] })).toHaveLength(6);
  });

  it('matches case-insensitively, with * and by the classified name', () => {
    expect(matchesApiName('Orders', 'orders')).toBe(true);
    expect(matchesApiName('InternalJobs', 'Internal*')).toBe(true);
    expect(matchesApiName('replacement-queue', 'ReplacementQueue')).toBe(true);
    expect(matchesApiName('Orders', 'Order')).toBe(false);
    expect(matchesApiName('a.b', 'a.b')).toBe(true);
    expect(matchesApiName('axb', 'a.b')).toBe(false);
  });

  it('includes only the listed APIs, then drops excluded ones', () => {
    expect(apis({ includeApis: ['Orders', 'Users', 'Admin'] })).toEqual(['Admin', 'Orders', 'Users']);
    expect(apis({ excludeApis: ['Admin', 'Internal*'] })).toEqual(['Legacy', 'Orders', 'Users', 'replacement-queue']);
    expect(apis({ includeApis: ['Orders', 'Admin'], excludeApis: ['Admin'] })).toEqual(['Orders']);
  });

  it('skips deprecated operations, and an API left without any quietly', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    try {
      const parsed = transformSwaggerSchema(SCHEMA, { excludeDeprecated: true });

      expect(parsed.Orders.apiList.map(item => item.httpMethod)).toEqual(['GET']);
      expect(parsed.Legacy).toBeUndefined();
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("'Legacy'"));
    } finally {
      warn.mockRestore();
    }
  });

  it('warns about a filter entry that matches no API', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    try {
      transformSwaggerSchema(SCHEMA, { includeApis: ['Orders', 'Ordrs'], excludeApis: ['Nope*'] });

      expect(warn).toHaveBeenCalledWith("includeApis entry 'Ordrs' matches no API in the document.");
      expect(warn).toHaveBeenCalledWith("excludeApis entry 'Nope*' matches no API in the document.");
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("'Orders'"));
    } finally {
      warn.mockRestore();
    }
  });

  it('deletes the service of an API that gets excluded', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    expect(tree.files).toContain(`${OUT}/admin-api.service.ts`);

    setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SCHEMA);
    const filtered = await runApiSchematic({ ...ANGULAR_SCHEMATIC_OPTIONS, excludeApis: ['Admin'] }, tree);

    expect(filtered.files).not.toContain(`${OUT}/admin-api.service.ts`);
    expect(filtered.files).toContain(`${OUT}/orders-api.service.ts`);
  });

  it('deletes every service when the filters leave nothing to generate (the document is not empty)', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);

    setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SCHEMA);
    const filtered = await runApiSchematic({ ...ANGULAR_SCHEMATIC_OPTIONS, includeApis: ['Legacy'], excludeDeprecated: true }, tree);

    expect(filtered.files.filter(file => file.endsWith('-api.service.ts'))).toEqual([]);
  });

  it('keeps filtered APIs out of the change summary model', () => {
    const model = buildApiModel(SCHEMA, { framework: 'angular', excludeApis: ['Admin'], excludeDeprecated: true });
    const labels = Object.keys(model.endpoints);

    expect(labels).not.toContain('GET /api/Admin');
    expect(labels).not.toContain('POST /api/Orders');
    expect(labels).toContain('GET /api/Orders');
  });
});
