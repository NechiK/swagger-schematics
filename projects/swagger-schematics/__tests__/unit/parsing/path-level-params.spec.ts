import { getPathOperations, transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import { ISwaggerSchema, IPath } from '@lib/interfaces/version_3_1/swagger.interface';

const ok = { '204': { description: 'ok' } };
const schemaWithPaths = (paths: Record<string, unknown>) =>
  ({ openapi: '3.0.1', info: { title: 'T', version: '1' }, paths, components: { schemas: {} } }) as unknown as ISwaggerSchema;

/**
 * OpenAPI allows `parameters` on the path item; they apply to every operation under it,
 * and an operation's own parameter with the same name and location overrides them.
 */
describe('path-level parameters', () => {
  const path = {
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string' } },
      { name: 'verbose', in: 'query', schema: { type: 'boolean' } }
    ],
    get: { tags: ['Things'], responses: ok },
    delete: {
      tags: ['Things'],
      // Same name and location as the path-level one: the operation's own wins
      parameters: [{ name: 'verbose', in: 'query', required: true, schema: { type: 'string' } }],
      responses: ok
    }
  };

  it('apply to every operation under the path', () => {
    const [[, get]] = getPathOperations(path as unknown as IPath);
    expect(get.parameters?.map(param => `${param.in}:${param.name}`)).toEqual(['path:id', 'header:X-Tenant-Id', 'query:verbose']);
  });

  it('are overridden by an operation parameter with the same name and location', () => {
    const [, [, del]] = getPathOperations(path as unknown as IPath);
    const verbose = del.parameters?.filter(param => param.name === 'verbose');
    expect(verbose).toHaveLength(1);
    expect(verbose?.[0].required).toBe(true);
  });

  it('reach the generated method, so a path-level {id} is a real argument', () => {
    const item = transformSwaggerSchema(schemaWithPaths({ '/api/Things/{id}': path }), { silent: true }).Things.apiList[0];

    expect(item.apiMethodParams).toBe('id: number, { verbose }: { verbose?: boolean }, { xTenantId }: { xTenantId: string }');
    expect(item.apiUrl).toBe('${id}');
  });
});
