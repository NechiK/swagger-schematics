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

  it('resolves $ref parameters at path and operation level, and drops unresolvable ones', () => {
    const schema = {
      ...schemaWithPaths({
        '/api/Things/{id}': {
          parameters: [{ $ref: '#/components/parameters/ThingId' }, { $ref: '#/components/parameters/Missing' }],
          get: { tags: ['Things'], parameters: [{ $ref: '#/components/parameters/Tenant' }], responses: ok }
        }
      }),
      components: {
        schemas: {},
        parameters: {
          ThingId: { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          Tenant: { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string' } }
        }
      }
    } as unknown as ISwaggerSchema;

    const item = transformSwaggerSchema(schema, { silent: true }).Things.apiList[0];

    expect(item.apiMethodParams).toBe('id: number, { xTenantId }: { xTenantId: string }');
    expect(item.headerParamsFormatted).toBe("headers: { 'X-Tenant-Id': String(xTenantId) }");
  });

  it('decodes $ref names as JSON Pointers: ~1 is /, ~0 is ~, and %-escapes', () => {
    const schema = {
      ...schemaWithPaths({
        '/api/Things/{id}': {
          parameters: [{ $ref: '#/components/parameters/ids~1thing' }],
          get: { tags: ['Things'], parameters: [{ $ref: '#/components/parameters/tenant~0x%20header' }], responses: ok }
        }
      }),
      components: {
        schemas: {},
        parameters: {
          'ids/thing': { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          'tenant~x header': { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string' } }
        }
      }
    } as unknown as ISwaggerSchema;

    const item = transformSwaggerSchema(schema, { silent: true }).Things.apiList[0];

    expect(item.apiMethodParams).toBe('id: number, { xTenantId }: { xTenantId: string }');
  });

  it('follows a $ref to another $ref, and any local JSON Pointer', () => {
    const schema = {
      ...schemaWithPaths({
        '/api/Things/{id}': {
          parameters: [{ $ref: '#/components/parameters/IdAlias' }],
          get: { tags: ['Things'], parameters: [{ $ref: '#/paths/~1api~1Things~1{id}/parameters/1' }], responses: ok }
        }
      }),
      components: {
        schemas: {},
        parameters: {
          IdAlias: { $ref: '#/components/parameters/Id' },
          Id: { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        }
      }
    } as unknown as ISwaggerSchema;
    (schema.paths['/api/Things/{id}'] as IPath).parameters!.push({ name: 'verbose', in: 'query', schema: { type: 'boolean' } } as never);

    const item = transformSwaggerSchema(schema, { silent: true }).Things.apiList[0];

    expect(item.apiMethodParams).toBe('id: number, { verbose }: { verbose?: boolean } = {}');
  });

  it('warns about a $ref it cannot resolve (dangling, circular or external), naming the endpoint', () => {
    const schema = {
      ...schemaWithPaths({
        '/api/Things/{id}': {
          parameters: [{ $ref: '#/components/parameters/Missing' }],
          get: {
            tags: ['Things'],
            parameters: [{ $ref: '#/components/parameters/Loop' }, { $ref: 'common.yaml#/parameters/Id' }],
            responses: ok
          }
        }
      }),
      components: { schemas: {}, parameters: { Loop: { $ref: '#/components/parameters/Loop' } } }
    } as unknown as ISwaggerSchema;
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    try {
      transformSwaggerSchema(schema);
      const messages = warn.mock.calls.map(call => String(call[0]));

      expect(messages).toEqual(expect.arrayContaining([
        expect.stringContaining("'#/components/parameters/Missing' of path /api/Things/{id} can't be resolved"),
        expect.stringContaining("'#/components/parameters/Loop' of GET /api/Things/{id} can't be resolved"),
        expect.stringContaining("'common.yaml#/parameters/Id' of GET /api/Things/{id} can't be resolved")
      ]));

      warn.mockClear();
      transformSwaggerSchema(schema, { silent: true });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('matches header names case-insensitively, so an operation header overrides a path-level one in another case', () => {
    const [[, get]] = getPathOperations({
      parameters: [{ name: 'X-Tenant', in: 'header', schema: { type: 'string' } }],
      get: { tags: ['Things'], parameters: [{ name: 'x-tenant', in: 'header', required: true, schema: { type: 'string' } }], responses: ok }
    } as unknown as IPath);

    expect(get.parameters?.map(param => [param.name, param.required])).toEqual([['x-tenant', true]]);
  });

  it('still tells query parameters apart by case, since query names are case-sensitive', () => {
    const [[, get]] = getPathOperations({
      parameters: [{ name: 'Page', in: 'query', schema: { type: 'string' } }],
      get: { tags: ['Things'], parameters: [{ name: 'page', in: 'query', schema: { type: 'string' } }], responses: ok }
    } as unknown as IPath);

    expect(get.parameters).toHaveLength(2);
  });

  it('ignores specification extensions and other path-item fields, which are not operations', () => {
    const path = {
      summary: 'Things',
      'x-controller': 'ThingsController',
      'x-internal': { owner: 'team-a' },
      get: { tags: ['Things'], responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'string' } } } } } }
    } as unknown as IPath;

    expect(getPathOperations(path).map(([key]) => key)).toEqual(['get']);
    const item = transformSwaggerSchema(schemaWithPaths({ '/api/Things': path }), { silent: true }).Things.apiList;
    expect(item.map(api => api.httpMethod)).toEqual(['GET']);
  });
});
