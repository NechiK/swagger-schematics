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
      trace: { tags: ['Probe'], operationId: 'Trace', responses: ok },
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

  it('sends the body of a GET or OPTIONS operation that declares one through request()', () => {
    expect(buildAngularHttpCall(byName('search'))).toEqual({
      method: 'request',
      args: ["'GET'", "this.getUrl('/')", '{ body: body, params: { ...(page != null ? { page } : {}) } }']
    });
    expect(buildAngularHttpCall(byName('check'))).toEqual({ method: 'request', args: ["'OPTIONS'", "this.getUrl('/')", '{ body: body }'] });
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
    expect(service).toContain('return this.httpClient.request<string>(\n      \'GET\',');
    expect(service).toContain('list({ page }: { page?: number } = {}): Observable<string> {');
    // A body follows, so a default wouldn't let callers leave the object out
    expect(service).toContain('search({ page }: { page?: number }, body: Record<string, string>): Observable<string> {');
  });
});
