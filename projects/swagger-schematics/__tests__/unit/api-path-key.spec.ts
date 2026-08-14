import { transformSwaggerSchema } from '../../api/helpers/api.helper';
import { ISwaggerSchema } from '../../interfaces/version_3_1/swagger.interface';

describe('apiPathKey option', () => {
  const swagger = (paths: Record<string, unknown>): ISwaggerSchema => ({
    openapi: '3.0.1',
    info: { title: 'Test API', version: '1.0.0' },
    components: { schemas: {} },
    paths
  } as unknown as ISwaggerSchema);

  const V1_PATHS = {
    '/v1/Widget': {
      get: {
        responses: { '200': { description: 'ok' } }
      }
    },
    '/v1/Widget/{id}': {
      get: {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'ok' } }
      }
    }
  };

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('selects and strips a custom prefix', () => {
    const parsed = transformSwaggerSchema(swagger(V1_PATHS), { apiPathKey: '/v1/' });

    expect(Object.keys(parsed)).toEqual(['Widget']);
    expect(parsed['Widget'].apiList.map(item => item.apiMethodName)).toEqual(['getWidget', 'getById']);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('normalizes a prefix missing slashes', () => {
    const parsed = transformSwaggerSchema(swagger(V1_PATHS), { apiPathKey: 'v1' });

    expect(Object.keys(parsed)).toEqual(['Widget']);
  });

  it('still skips paths outside the prefix, defaulting to /api/', () => {
    const parsed = transformSwaggerSchema(swagger(V1_PATHS));

    expect(Object.keys(parsed)).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('keeps default /api/ behavior unchanged', () => {
    const parsed = transformSwaggerSchema(swagger({
      '/api/Widget/{id}': {
        get: {
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'ok' } }
        }
      }
    }));

    expect(parsed['Widget'].apiList[0].apiMethodName).toBe('getById');
  });
});
