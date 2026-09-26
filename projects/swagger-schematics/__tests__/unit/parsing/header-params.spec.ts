import { transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import { toHeaderParamSymbol } from '@lib/types/utils/params';
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
    expect(list.apiMethodParams).toBe('{ page }: { page?: number }, { xTrace }: { xTrace?: string } = {}');
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
});
