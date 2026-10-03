import '@helpers/matchers';
import { resetFetchMocks, runFullSchematics, ANGULAR_SCHEMATIC_OPTIONS } from '@helpers/setup';
import { buildAngularHttpCall } from '@lib/api/helpers/angular-template.helper';
import { transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';

const OUT = ANGULAR_SCHEMATIC_OPTIONS.path;
const json = (schema: unknown) => ({ content: { 'application/json': { schema } } });
const ok = { '200': { description: 'ok', ...json({ type: 'string' }) } };
const SCHEMA = {
  openapi: '3.0.1',
  info: { title: 'Calls', version: 'v1' },
  paths: {
    '/api/Probe': {
      trace: { tags: ['Probe'], operationId: 'Trace', requestBody: json({ type: 'string' }), responses: ok },
      get: {
        tags: ['Probe'],
        operationId: 'Search',
        parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }],
        requestBody: json({ type: 'object', additionalProperties: { type: 'string' } }),
        responses: ok
      },
      options: { tags: ['Probe'], operationId: 'Check', requestBody: json({ type: 'string' }), responses: ok },
      head: { tags: ['Probe'], operationId: 'Exists', responses: ok },
      delete: { tags: ['Probe'], operationId: 'Remove', requestBody: json({ type: 'string' }), responses: ok }
    },
    '/api/Probe/list': {
      get: { tags: ['Probe'], operationId: 'List', parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }], responses: ok }
    }
  },
  components: { schemas: {} }
} as unknown as ISwaggerSchema;

describe('Angular HttpClient calls', () => {
  const byName = (name: string) => transformSwaggerSchema(SCHEMA, { silent: true }).Probe.apiList.find(item => item.apiMethodName === name)!;

  afterEach(() => {
    resetFetchMocks();
  });

  it('sends TRACE through request(), since HttpClient has no trace()', () => {
    expect(buildAngularHttpCall(byName('trace'))).toEqual({ method: 'request', args: ["'TRACE'", "this.getUrl('/')"] });
  });

  it('sends the body of an OPTIONS operation that declares one through request()', () => {
    expect(buildAngularHttpCall(byName('check'))).toEqual({ method: 'request', args: ["'OPTIONS'", "this.getUrl('/')", '{ body: body }'] });
  });

  it("leaves out a GET, HEAD or TRACE body, which a browser can't send, with a warning", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const items = transformSwaggerSchema(SCHEMA).Probe.apiList;
      const search = items.find(item => item.apiMethodName === 'search')!;

      expect(search.bodyParam).toBeNull();
      expect(buildAngularHttpCall(search)).toEqual({ method: 'get', args: ["this.getUrl('/')", '{ params: { ...(page != null ? { page } : {}) } }'] });
      // TRACE still goes through request(), since HttpClient has no trace(), but without the body
      expect(items.find(item => item.apiMethodName === 'trace')!.bodyParam).toBeNull();
      expect(warn).toHaveBeenCalledWith("Request body of GET /api/Probe is left out: a browser can't send a body with GET. The generated method will not take it.");
      expect(warn).toHaveBeenCalledWith("Request body of TRACE /api/Probe is left out: a browser can't send a body with TRACE. The generated method will not take it.");
    } finally {
      warn.mockRestore();
    }
  });

  it('lets params use the `body` variable a left-out body would have taken', () => {
    const withParam = (location: string, name: string) => transformSwaggerSchema({
      ...SCHEMA,
      paths: { '/api/Probe': { get: {
        tags: ['Probe'],
        parameters: [{ name, in: location, schema: { type: 'string' } }],
        requestBody: json({ type: 'string' }),
        responses: ok
      } } }
    } as unknown as ISwaggerSchema, { silent: true }).Probe.apiList[0];

    expect(withParam('query', 'body').apiMethodParams).toBe('{ body }: { body?: string } = {}');
    // Not skipped as a clash with the body
    expect(withParam('header', 'Body').headerParamsFormatted).toBe("headers: { ...(body != null ? { 'Body': String(body) } : {}) }");
  });

  it('keeps the shorthand methods otherwise, including DELETE with a body', () => {
    expect(buildAngularHttpCall(byName('exists'))).toEqual({ method: 'head', args: ["this.getUrl('/')"] });
    expect(buildAngularHttpCall(byName('remove'))).toEqual({ method: 'delete', args: ["this.getUrl('/')", '{ body: body }'] });
    expect(buildAngularHttpCall(byName('list')).method).toBe('get');
  });

  it('generates the calls in the service, and lets a method whose query params are all optional be called without them', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const service = tree.readContent(`${OUT}/probe-api.service.ts`);

    expect(service).toContain([
      '  trace(): Observable<string> {',
      '    return this.httpClient.request<string>(',
      "      'TRACE',",
      "      this.getUrl('/')",
      '    );'
    ].join('\n'));
    expect(service).toContain('list({ page }: { page?: number } = {}): Observable<string> {');
    // The GET body is left out, so no body follows the query object and it can default
    expect(service).toContain('search({ page }: { page?: number } = {}): Observable<string> {');
  });
});
