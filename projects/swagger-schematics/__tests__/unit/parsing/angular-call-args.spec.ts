import { transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import { buildAngularHttpCallArgs } from '@lib/api/helpers/angular-template.helper';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';

/**
 * HttpClient's signatures differ per method: post/put/patch take (url, body, options),
 * delete and get take (url, options). The generated arguments must follow them, or the
 * options object lands where the body belongs and the real body is never sent.
 */
const ok = { '204': { description: 'ok' } };
const id = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const dryRun = { name: 'dryRun', in: 'query', schema: { type: 'boolean' } };
const requestBody = { content: { 'application/json': { schema: { type: 'object' } } } };

const callArgs = (method: string, operation: Record<string, unknown>) => {
  const schema = {
    openapi: '3.0.1', info: { title: 'T', version: '1' }, components: { schemas: {} },
    paths: { '/api/Orders/{id}': { [method]: { tags: ['Orders'], responses: ok, ...operation } } }
  } as unknown as ISwaggerSchema;
  return buildAngularHttpCallArgs(transformSwaggerSchema(schema, { silent: true }).Orders.apiList[0]);
};

describe('Angular HttpClient call arguments', () => {
  it.each(['post', 'put', 'patch'])('%s: body second, options third', method => {
    expect(callArgs(method, { parameters: [id, dryRun], requestBody })).toEqual([
      'body',
      '{ params: { ...(dryRun != null ? { dryRun } : {}) } }'
    ]);
  });

  it.each(['post', 'put', 'patch'])('%s without a request body still passes the required body argument', method => {
    expect(callArgs(method, { parameters: [id] })).toEqual(['{}']);
  });

  it('delete: body inside the options object', () => {
    expect(callArgs('delete', { parameters: [id, dryRun], requestBody })).toEqual([
      '{ body: body, params: { ...(dryRun != null ? { dryRun } : {}) } }'
    ]);
  });

  it('get: options only', () => {
    expect(callArgs('get', { parameters: [id, dryRun] })).toEqual(['{ params: { ...(dryRun != null ? { dryRun } : {}) } }']);
    expect(callArgs('get', { parameters: [id] })).toEqual([]);
  });
});
