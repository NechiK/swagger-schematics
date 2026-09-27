import { transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import { toHeaderParamSymbol } from '@lib/types/utils/params';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';
import { HEADER_PARAMS_SWAGGER_SCHEMA } from '@fixtures/swagger/header-params-schema.fixture';

describe('header parameters', () => {
  const apiList = transformSwaggerSchema(HEADER_PARAMS_SWAGGER_SCHEMA, { silent: true }).Orders.apiList;
  const byMethod = (httpMethod: string, apiPath: string) =>
    apiList.find(item => item.httpMethod === httpMethod && item.apiPath === apiPath)!;

  const getById = byMethod('GET', '/api/Orders/{id}');
  const put = byMethod('PUT', '/api/Orders/{id}');
  const del = byMethod('DELETE', '/api/Orders/{id}');
  const list = byMethod('GET', '/api/Orders');

  it('keeps the wire name and camelizes the variable name', () => {
    expect(getById.headerParams.map(p => [p.originalParam.name, p.objectSymbol])).toEqual([
      ['X-Tenant-Id', 'xTenantId'],
      ['If-None-Match', 'ifNoneMatch']
    ]);
  });

  it.each([
    ['X-Tenant-Id', 'xTenantId'],
    ['If-None-Match', 'ifNoneMatch'],
    ['X-API-Key', 'xAPIKey'],
    ['x_request_id', 'xRequestId']
  ])('turns header %p into the variable %p', (header, symbol) => {
    expect(toHeaderParamSymbol(header)).toBe(symbol);
  });

  it.each(["X-Odd'Name", 'x.request+id', '1-Hop', 'delete', 'New'])('has no variable for header %p', header => {
    expect(toHeaderParamSymbol(header)).toBeNull();
  });

  it('skips unsupported header names with a warning naming the header and the endpoint', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    try {
      const parsed = transformSwaggerSchema(HEADER_PARAMS_SWAGGER_SCHEMA).Orders.apiList
        .find(item => item.httpMethod === 'GET' && item.apiPath === '/api/Orders')!;

      expect(parsed.headerParams.map(p => p.originalParam.name)).toEqual(['X-Trace']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Header parameter 'X-Odd'Name' of GET /api/Orders is skipped"));
    } finally {
      warn.mockRestore();
    }
  });

  it('does not warn in silent mode', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    try {
      transformSwaggerSchema(HEADER_PARAMS_SWAGGER_SCHEMA, { silent: true });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('ignores Accept, Content-Type and Authorization in any case, per the OpenAPI spec', () => {
    const names = getById.headerParams.map(p => p.originalParam.name.toLowerCase());
    expect(names).not.toEqual(expect.arrayContaining(['authorization']));
    expect(names).not.toContain('accept');
    expect(names).not.toContain('content-type');
  });

  it('adds headers as a trailing object parameter', () => {
    expect(getById.apiMethodParams).toBe('id: number, { xTenantId, ifNoneMatch }: { xTenantId: string; ifNoneMatch?: string }');
    expect(del.apiMethodParams).toBe('id: number, { idempotencyKey }: { idempotencyKey: string }');
  });

  it('defaults the headers object to {} when every header is optional, so existing calls still compile', () => {
    expect(put.apiMethodParams).toBe('id: number, body: IOrderDto, { ifMatch, xVersion }: { ifMatch?: string; xVersion?: number | null } = {}');
    expect(list.apiMethodParams).toBe('{ page }: { page?: number } = {}, { xTrace }: { xTrace?: string } = {}');
  });

  it('sends required headers as strings and optional ones only when they have a value', () => {
    expect(getById.headerParamsFormatted).toBe(
      "headers: { 'X-Tenant-Id': String(xTenantId), ...(ifNoneMatch != null ? { 'If-None-Match': String(ifNoneMatch) } : {}) }"
    );
    expect(put.headerParamsFormatted).toBe(
      "headers: { ...(ifMatch != null ? { 'If-Match': String(ifMatch) } : {}), ...(xVersion != null ? { 'X-Version': String(xVersion) } : {}) }"
    );
  });

  it('includes headers in the RTK argument names and request type', () => {
    expect(getById.apiMethodParamNames).toEqual(['id', 'xTenantId', 'ifNoneMatch']);
    expect(put.apiMethodRequestType).toBe('{ id: number; ifMatch?: string; xVersion?: number | null; body: IOrderDto }');
  });

  it('marks an RTK request whose fields are all optional, so the endpoint can be called without an argument', () => {
    expect(list.apiMethodRequestType).toBe('{ page?: number; xTrace?: string }');
    expect(list.isApiMethodRequestOptional).toBe(true);
    // A path param, a body or a required header makes the argument required
    expect(getById.isApiMethodRequestOptional).toBe(false);
    expect(put.isApiMethodRequestOptional).toBe(false);
    expect(del.isApiMethodRequestOptional).toBe(false);
  });

  describe('required nullable parameters', () => {
    // OpenAPI 3.1: parameters keep the boolean `required`, nullability is a `null` type member
    const schema = {
      ...HEADER_PARAMS_SWAGGER_SCHEMA,
      openapi: '3.1.0',
      paths: {
        '/api/Things': {
          get: {
            tags: ['Things'],
            parameters: [
              { name: 'page', in: 'query', required: true, schema: { type: ['integer', 'null'] } },
              { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: ['string', 'null'] } }
            ],
            responses: { '204': { description: 'ok' } }
          }
        }
      }
    } as unknown as ISwaggerSchema;

    it('are required, and null leaves them out of the request', () => {
      const item = transformSwaggerSchema(schema, { silent: true }).Things.apiList[0];

      // No `?` and no `= {}`: the caller has to pass them, but null means "don't send it"
      expect(item.apiMethodParams).toBe('{ page }: { page: number | null }, { xTenantId }: { xTenantId: string | null }');
      expect(item.apiMethodRequestType).toBe('{ page: number | null; xTenantId: string | null }');
      expect(item.queryParamsFormatted).toBe('params: { ...(page != null ? { page } : {}) }');
      expect(item.hasOmittableQueryParams).toBe(true);
      expect(item.headerParamsFormatted).toBe("headers: { ...(xTenantId != null ? { 'X-Tenant-Id': String(xTenantId) } : {}) }");
    });

    it('are optional with legacyOptionalProperties, as before', () => {
      const item = transformSwaggerSchema(schema, { silent: true, legacyOptionalProperties: true }).Things.apiList[0];

      expect(item.apiMethodParams).toBe('{ page }: { page?: number | null } = {}, { xTenantId }: { xTenantId?: string | null } = {}');
      expect(item.apiMethodRequestType).toBe('{ page?: number | null; xTenantId?: string | null }');
      expect(item.queryParamsFormatted).toBe('params: { ...(page != null ? { page } : {}) }');
      expect(item.headerParamsFormatted).toBe("headers: { ...(xTenantId != null ? { 'X-Tenant-Id': String(xTenantId) } : {}) }");
    });

    it('treat the OpenAPI 3.1 oneOf "null" member like any other nullable schema', () => {
      const oneOfNull = {
        ...schema,
        components: { schemas: { Dto: { type: 'object', properties: { a: { type: 'string' } } } } },
        paths: {
          '/api/Things': {
            get: {
              tags: ['Things'],
              parameters: [{ name: 'filter', in: 'query', required: true, schema: { oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/Dto' }] } }],
              responses: { '204': { description: 'ok' } }
            }
          }
        }
      } as unknown as ISwaggerSchema;
      const parse = (legacyOptionalProperties: boolean) =>
        transformSwaggerSchema(oneOfNull, { silent: true, legacyOptionalProperties }).Things.apiList[0];

      // null is left out of the request, not put in the params as is
      expect(parse(false).hasOmittableQueryParams).toBe(true);
      expect(parse(false).queryParamsFormatted).toBe('params: { ...(filter != null ? { filter } : {}) }');
      expect(parse(false).apiMethodParams).toBe('{ filter }: { filter: IDto | null }');
      expect(parse(true).apiMethodParams).toBe('{ filter }: { filter?: IDto | null } = {}');
    });

    it('keep a required non-nullable parameter required either way', () => {
      const required = {
        ...schema,
        paths: { '/api/Things': { get: { tags: ['Things'], parameters: [{ name: 'page', in: 'query', required: true, schema: { type: 'integer' } }], responses: { '204': { description: 'ok' } } } } }
      } as unknown as ISwaggerSchema;

      [false, true].forEach(legacyOptionalProperties => {
        const item = transformSwaggerSchema(required, { silent: true, legacyOptionalProperties }).Things.apiList[0];
        expect(item.apiMethodParams).toBe('{ page }: { page: number }');
        expect(item.queryParamsFormatted).toBe('params: { page }');
      });
    });
  });

  it('leaves cookie parameters out of the method: a browser sends cookies itself', () => {
    expect(getById.cookieParams.map(p => p.originalParam.name)).toEqual(['session']);
    expect(getById.apiMethodParams).not.toContain('session');
    expect(getById.headerParamsFormatted).not.toContain('session');
  });

  it('adds nothing to operations without header parameters', () => {
    const parsed = transformSwaggerSchema({
      ...HEADER_PARAMS_SWAGGER_SCHEMA,
      paths: { '/api/Plain': { get: { tags: ['Plain'], responses: { '204': { description: 'ok' } } } } }
    } as typeof HEADER_PARAMS_SWAGGER_SCHEMA).Plain.apiList[0];

    expect(parsed.headerParamsFormatted).toBe('');
    expect(parsed.apiMethodParams).toBe('');
  });

  describe('value serialization (style: simple)', () => {
    const item = transformSwaggerSchema({
      openapi: '3.0.1',
      info: { title: 'T', version: '1' },
      components: { schemas: { Filter: { type: 'object', properties: { role: { type: 'string' }, id: { type: 'integer' } } } } },
      paths: {
        '/api/Items': {
          get: {
            tags: ['Items'],
            parameters: [
              { name: 'X-Filter', in: 'header', required: true, schema: { $ref: '#/components/schemas/Filter' } },
              { name: 'X-Exploded', in: 'header', explode: true, schema: { type: 'object', additionalProperties: { type: 'string' } } },
              { name: 'X-Context', in: 'header', content: { 'application/json': { schema: { type: 'object' } } } },
              { name: 'X-Ids', in: 'header', required: true, schema: { type: 'array', items: { type: 'integer' } } }
            ],
            responses: { '204': { description: 'ok' } }
          }
        }
      }
    } as unknown as ISwaggerSchema, { silent: true }).Items.apiList[0];

    it('sends an object as key,value pairs (key=value when exploded), leaving out unset properties', () => {
      expect(item.headerParamsFormatted).toContain(
        "'X-Filter': Object.entries(xFilter).filter(entry => entry[1] != null).map(entry => entry.join(',')).join(',')"
      );
      expect(item.headerParamsFormatted).toContain(
        "...(xExploded != null ? { 'X-Exploded': Object.entries(xExploded).filter(entry => entry[1] != null).map(entry => entry.join('=')).join(',') } : {})"
      );
    });

    it('sends a header whose $ref is mapped by typeMapping with String(), since the mapped type decides', () => {
      const mapped = transformSwaggerSchema({
        openapi: '3.0.1',
        info: { title: 'T', version: '1' },
        components: { schemas: { Filter: { type: 'object', properties: { role: { type: 'string' } } } } },
        paths: { '/api/Items': { get: {
          tags: ['Items'],
          parameters: [{ name: 'X-Filter', in: 'header', required: true, schema: { $ref: '#/components/schemas/Filter' } }],
          responses: { '204': { description: 'ok' } }
        } } }
      } as unknown as ISwaggerSchema, { silent: true, typeMapping: { Filter: 'string' } }).Items.apiList[0];

      expect(mapped.headerParamsFormatted).toBe("headers: { 'X-Filter': String(xFilter) }");
    });

    it('sends a JSON content header as JSON, and an array as comma-separated values', () => {
      expect(item.headerParamsFormatted).toContain("...(xContext != null ? { 'X-Context': JSON.stringify(xContext) } : {})");
      expect(item.headerParamsFormatted).toContain("'X-Ids': String(xIds)");
    });

    describe('schemas beyond a plain object', () => {
      const headersOf = (schema: unknown, explode = false) => transformSwaggerSchema({
        openapi: '3.1.0',
        info: { title: 'T', version: '1' },
        components: { schemas: {
          Filter: { type: 'object', properties: { role: { type: 'string' } } },
          Filters: { type: 'array', items: { $ref: '#/components/schemas/Filter' } },
          FilterOrText: { oneOf: [{ $ref: '#/components/schemas/Filter' }, { type: 'string' }] }
        } },
        paths: { '/api/Items': { get: {
          tags: ['Items'],
          parameters: [{ name: 'X-Value', in: 'header', required: true, explode, schema }],
          responses: { '204': { description: 'ok' } }
        } } }
      } as unknown as ISwaggerSchema, { silent: true }).Items.apiList[0].headerParamsFormatted;
      const filter = { $ref: '#/components/schemas/Filter' };
      const asObject = (separator: string) =>
        `Object.entries(xValue).filter(entry => entry[1] != null).map(entry => entry.join('${separator}')).join(',')`;

      it('sends a oneOf/anyOf of objects (with or without a null member) as an object', () => {
        expect(headersOf({ oneOf: [filter, { type: 'object', additionalProperties: { type: 'string' } }] }))
          .toBe(`headers: { 'X-Value': ${asObject(',')} }`);
        expect(headersOf({ anyOf: [filter, { type: 'null' }] }, true))
          .toBe(`headers: { ...(xValue != null ? { 'X-Value': ${asObject('=')} } : {}) }`);
      });

      it('checks at runtime for a oneOf/anyOf mixing objects and primitives', () => {
        expect(headersOf({ oneOf: [filter, { type: 'string' }] }))
          .toBe(`headers: { 'X-Value': (typeof xValue === 'object' && !Array.isArray(xValue) ? ${asObject(',')} : String(xValue)) }`);
      });

      it('sends an array of objects as JSON, since simple style does not define one', () => {
        expect(headersOf({ type: 'array', items: filter })).toBe("headers: { 'X-Value': JSON.stringify(xValue) }");
        expect(headersOf({ type: 'array', items: { anyOf: [filter, { type: 'null' }] } })).toBe("headers: { 'X-Value': JSON.stringify(xValue) }");
      });

      it('sends an object whose oneOf members only list required properties as an object', () => {
        const schema = { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } }, oneOf: [{ required: ['a'] }, { required: ['b'] }] };

        expect(headersOf(schema)).toBe(`headers: { 'X-Value': ${asObject(',')} }`);
      });

      it('sends an allOf as an object only when one of its members is an object', () => {
        expect(headersOf({ allOf: [filter, { description: 'The filter' }] })).toBe(`headers: { 'X-Value': ${asObject(',')} }`);
        expect(headersOf({ allOf: [{ type: 'string', enum: ['active', 'closed'] }] })).toBe("headers: { 'X-Value': String(xValue) }");
      });

      it('sends an allOf wrapping an array of objects or a union like the wrapped schema', () => {
        // NSwag and Swashbuckle wrap a $ref in allOf to add a description or nullability
        expect(headersOf({ allOf: [{ $ref: '#/components/schemas/Filters' }] })).toBe("headers: { 'X-Value': JSON.stringify(xValue) }");
        expect(headersOf({ allOf: [{ $ref: '#/components/schemas/FilterOrText' }] }))
          .toBe(`headers: { 'X-Value': (typeof xValue === 'object' && !Array.isArray(xValue) ? ${asObject(',')} : String(xValue)) }`);
      });

      it('sends a prefixItems tuple holding an object as JSON', () => {
        expect(headersOf({ type: 'array', prefixItems: [{ type: 'string' }, filter] })).toBe("headers: { 'X-Value': JSON.stringify(xValue) }");
        expect(headersOf({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }] })).toBe("headers: { 'X-Value': String(xValue) }");
      });

      it('checks arrays first at runtime for a oneOf/anyOf with an array of objects among its members', () => {
        const mixed = (separator: string) =>
          "(Array.isArray(xValue) ? (xValue.some((item: unknown) => typeof item === 'object' && item !== null) ? JSON.stringify(xValue) : String(xValue)) : " +
          `typeof xValue === 'object' ? ${asObject(separator)} : String(xValue))`;

        expect(headersOf({ oneOf: [filter, { type: 'array', items: filter }] })).toBe(`headers: { 'X-Value': ${mixed(',')} }`);
        expect(headersOf({ anyOf: [{ type: 'string' }, { type: 'array', items: filter }] }, true)).toBe(`headers: { 'X-Value': ${mixed('=')} }`);
      });

      it('sends a primitive array of such a union comma-separated, and only an array holding an object as JSON', () => {
        const headers = headersOf({ oneOf: [{ type: 'array', items: filter }, { type: 'array', items: { type: 'string' } }] });
        const value = headers.slice("headers: { 'X-Value': ".length, -' }'.length).replace('(item: unknown)', 'item');
        const send = new Function('xValue', `return ${value};`) as (header: unknown) => string;

        expect(send(['a', 'b'])).toBe('a,b');
        expect(send([{ role: 'admin' }])).toBe('[{"role":"admin"}]');
        expect(send({ role: 'admin' })).toBe('role,admin');
      });

      it('keeps String() for primitives, arrays of primitives and unions of them', () => {
        expect(headersOf({ oneOf: [{ type: 'string' }, { type: 'integer' }] })).toBe("headers: { 'X-Value': String(xValue) }");
        expect(headersOf({ type: 'array', items: { type: 'string' } })).toBe("headers: { 'X-Value': String(xValue) }");
      });
    });
  });

  describe('variable names and clashes', () => {
    it.each(['eval', 'arguments'])('rejects %p, which strict code cannot bind', header => {
      expect(toHeaderParamSymbol(header)).toBeNull();
    });

    const operationWith = (parameters: unknown[], extra: Record<string, unknown> = {}) =>
      ({ openapi: '3.0.1', info: { title: 'T', version: '1' }, components: { schemas: {} }, paths: { '/api/Things/{id}': { post: { tags: ['Things'], parameters, responses: { '204': { description: 'ok' } }, ...extra } } } }) as unknown as ISwaggerSchema;

    const parse = (schema: ISwaggerSchema) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation();
      try {
        return { item: transformSwaggerSchema(schema).Things.apiList[0], warnings: warn.mock.calls.map(call => String(call[0])) };
      } finally {
        warn.mockRestore();
      }
    };

    it('skips a header whose variable repeats a query parameter, with a warning', () => {
      const { item, warnings } = parse(operationWith([
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'xTenantId', in: 'query', schema: { type: 'string' } },
        { name: 'X-Tenant-Id', in: 'header', schema: { type: 'string' } }
      ]));

      expect(item.headerParams).toEqual([]);
      expect(item.apiMethodParamNames).toEqual(['id', 'xTenantId']);
      expect(warnings).toContainEqual(expect.stringContaining("'X-Tenant-Id' of POST /api/Things/{id} is skipped: its variable name 'xTenantId' is already used"));
    });

    it('keeps the first of two headers with the same variable and skips the second', () => {
      const { item } = parse(operationWith([
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'X-Foo', in: 'header', schema: { type: 'string' } },
        { name: 'x_foo', in: 'header', schema: { type: 'string' } }
      ]));

      expect(item.headerParams.map(p => p.originalParam.name)).toEqual(['X-Foo']);
    });

    it('keeps a header named Body when the operation has no request body', () => {
      const schema = {
        openapi: '3.0.1', info: { title: 'T', version: '1' }, components: { schemas: {} },
        paths: { '/api/Things': { get: { tags: ['Things'], parameters: [{ name: 'Body', in: 'header', schema: { type: 'string' } }], responses: { '204': { description: 'ok' } } } } }
      } as unknown as ISwaggerSchema;
      const item = transformSwaggerSchema(schema, { silent: true }).Things.apiList[0];

      expect(item.headerParams.map(p => p.objectSymbol)).toEqual(['body']);
    });

    it('keeps a header whose variable matches a cookie name: cookies generate no variable', () => {
      const schema = {
        openapi: '3.0.1', info: { title: 'T', version: '1' }, components: { schemas: {} },
        paths: {
          '/api/Things': {
            get: {
              tags: ['Things'],
              parameters: [{ name: 'session', in: 'cookie', schema: { type: 'string' } }, { name: 'Session', in: 'header', schema: { type: 'string' } }],
              responses: { '204': { description: 'ok' } }
            }
          }
        }
      } as unknown as ISwaggerSchema;
      const item = transformSwaggerSchema(schema, { silent: true }).Things.apiList[0];

      expect(item.headerParams.map(p => [p.originalParam.name, p.objectSymbol])).toEqual([['Session', 'session']]);
    });

    it("skips a header named like the request body's variable", () => {
      const { item } = parse(operationWith(
        [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, { name: 'Body', in: 'header', schema: { type: 'string' } }],
        { requestBody: { content: { 'application/json': { schema: { type: 'string' } } } } }
      ));

      expect(item.headerParams).toEqual([]);
      expect(item.apiMethodParams).toBe('id: number, body: string');
    });
  });
});
