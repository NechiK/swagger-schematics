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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
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

/**
 * OpenAPI requires every `{placeholder}` to be declared as a path parameter. When a document
 * leaves one out, the generated method still takes a real argument for it.
 */
describe('undeclared path parameters', () => {
  const schema = schemaWithPaths({
    '/api/Orders/{id}': {
      put: {
        tags: ['Orders'],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } },
        responses: ok
      }
    },
    '/api/Orders/{orderId}/lines': { get: { tags: ['Orders'], responses: ok } },
    '/api/Orders/{ID}/notes': { get: { tags: ['Orders'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: ok } }
  });
  const parse = () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      return { apiList: transformSwaggerSchema(schema).Orders.apiList, warnings: warn.mock.calls.map(call => String(call[0])) };
    } finally {
      warn.mockRestore();
    }
  };

  it('become required string params, not a guess at a property of the body', () => {
    const [put, get] = parse().apiList;

    // Was `this.getUrl(`/${body.id}`)` with `(body)`, which sends `undefined` when the body has no id
    expect(put.apiMethodParams).toBe('id: string, body: object');
    expect(put.apiUrl).toBe('${id}');
    // Was `${orderId}`, a variable nothing declared
    expect(get.apiMethodParams).toBe('orderId: string');
    expect(get.apiUrl).toBe('${orderId}/lines');
  });

  it('use a declared param whose name differs only in case', () => {
    const notes = parse().apiList[2];

    // Was `${iD}` (the placeholder camelized), a variable nothing declared

    expect(notes.apiMethodParams).toBe('id: number');
    expect(notes.apiUrl).toBe('${id}/notes');
  });

  it('are reported, so the document can be fixed', () => {
    const { warnings } = parse();

    expect(warnings).toContainEqual(expect.stringContaining("Path parameter 'id' of PUT /api/Orders/{id} is not declared"));
    expect(warnings).toContainEqual(expect.stringContaining("Path parameter 'orderId' of GET /api/Orders/{orderId}/lines is not declared"));
    expect(warnings).toContainEqual(expect.stringContaining("Path parameter '{ID}' of GET /api/Orders/{ID}/notes is declared as 'id'"));
    expect(transformSwaggerSchema(schema, { silent: true }).Orders.apiList).toHaveLength(3);
  });
});

/**
 * A path parameter must match a `{placeholder}` in the path. One that doesn't is an argument
 * the generated method would take and never send, so it is left out.
 */
describe('path parameters without a placeholder', () => {
  const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
  const schema = schemaWithPaths({
    '/api/Orders/summary': { get: { tags: ['Orders'], parameters: [idParam], responses: ok } },
    '/api/Orders/{ID}/lines': {
      // Path-level, and a placeholder that matches it only by case
      parameters: [idParam, { name: 'lineId', in: 'path', required: true, schema: { type: 'integer' } }],
      get: { tags: ['Orders'], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }], responses: ok }
    }
  });
  const parse = () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      return { apiList: transformSwaggerSchema(schema).Orders.apiList, warnings: warn.mock.calls.map(call => String(call[0])) };
    } finally {
      warn.mockRestore();
    }
  };

  it('are left out of the generated method', () => {
    const [summary, lines] = parse().apiList;

    // Was `id: number`, never interpolated into the URL
    expect(summary.apiMethodParams).toBe('');
    expect(summary.apiUrl).toBe('summary');
    expect(lines.apiMethodParams).toBe('id: number, { page }: { page?: number } = {}');
    expect(lines.apiUrl).toBe('${id}/lines');
  });

  it('are reported, so the document can be fixed', () => {
    const { warnings } = parse();

    expect(warnings).toContainEqual(expect.stringContaining("Path parameter 'id' of GET /api/Orders/summary has no '{id}' placeholder"));
    expect(warnings).toContainEqual(expect.stringContaining("Path parameter 'lineId' of GET /api/Orders/{ID}/lines has no '{lineId}' placeholder"));
    expect(warnings.filter(warning => warning.includes('has no'))).toHaveLength(2);
  });
});
