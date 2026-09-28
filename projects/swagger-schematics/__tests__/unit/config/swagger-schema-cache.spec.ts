import type * as SchemaHelper from '@lib/helpers/swagger-schema.helper';

/**
 * The cache is module state, so every test loads a fresh copy of the helper
 * rather than inheriting a cache another test enabled.
 */
describe('fetchSwaggerSchema cache', () => {
  const URL_A = 'https://example.com/a/swagger.json';
  const URL_B = 'https://example.com/b/swagger.json';
  const schemaFor = (title: string) => ({ openapi: '3.0.1', info: { title, version: 'v1' }, paths: {}, components: { schemas: {} } });

  const originalFetch = globalThis.fetch;
  let fetchMock: jest.Mock;
  let helper: typeof SchemaHelper;

  beforeEach(() => {
    fetchMock = jest.fn(async (url: string) => ({ ok: true, status: 200, json: async () => schemaFor(url) }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'info').mockImplementation();
    jest.isolateModules(() => {
      helper = require('@lib/helpers/swagger-schema.helper');
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('loads the source on every call when the cache is off (the default)', async () => {
    await helper.fetchSwaggerSchema(URL_A);
    await helper.fetchSwaggerSchema(URL_A);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('loads a source once when the cache is on', async () => {
    helper.enableSwaggerSchemaCache();

    const first = await helper.fetchSwaggerSchema(URL_A);
    const second = await helper.fetchSwaggerSchema(URL_A);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining(`Reusing the swagger schema already loaded from '${URL_A}'`));
  });

  it('shares one load between concurrent calls', async () => {
    helper.enableSwaggerSchemaCache();

    await Promise.all([helper.fetchSwaggerSchema(URL_A), helper.fetchSwaggerSchema(URL_A)]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives each caller its own copy of the document', async () => {
    helper.enableSwaggerSchemaCache();

    const first = await helper.fetchSwaggerSchema(URL_A);
    first.info.title = 'changed by the first caller';
    const second = await helper.fetchSwaggerSchema(URL_A);

    expect(second.info.title).toBe(URL_A);
  });

  it('caches each source separately', async () => {
    helper.enableSwaggerSchemaCache();

    const a = await helper.fetchSwaggerSchema(URL_A);
    const b = await helper.fetchSwaggerSchema(URL_B);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(a.info.title).toBe(URL_A);
    expect(b.info.title).toBe(URL_B);
  });

  it('does not keep a failed load', async () => {
    helper.enableSwaggerSchemaCache();
    fetchMock.mockImplementationOnce(async () => ({ ok: false, status: 503, statusText: 'Service Unavailable' }));

    await expect(helper.fetchSwaggerSchema(URL_A)).rejects.toThrow('503 Service Unavailable');
    await expect(helper.fetchSwaggerSchema(URL_A)).resolves.toEqual(schemaFor(URL_A));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
