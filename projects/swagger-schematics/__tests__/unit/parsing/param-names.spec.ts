import { resetFetchMocks, runFullSchematics, RTK_SCHEMATIC_OPTIONS } from '@helpers/setup';
import { transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import { toParamSymbol } from '@lib/types/utils/params';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';

const ok = { '204': { description: 'ok' } };
const parse = (path: string, parameters: unknown[], method = 'get', extra: Record<string, unknown> = {}) => transformSwaggerSchema({
  openapi: '3.0.1',
  info: { title: 'T', version: '1' },
  paths: { [path]: { [method]: { tags: ['Items'], parameters, responses: ok, ...extra } } },
  components: { schemas: {} }
} as unknown as ISwaggerSchema, { silent: true }).Items.apiList[0];
const query = (name: string) => ({ name, in: 'query', schema: { type: 'string' } });
const pathParam = (name: string) => ({ name, in: 'path', required: true, schema: { type: 'integer' } });

/** Path and query parameters are sent under their declared names; only their variables are camelized. */
describe('path and query parameter names', () => {
  it.each([
    ['page_size', 'pageSize'],
    ['PageSize', 'pageSize'],
    ['filter.name', 'filterName'],
    ['filter[name]', 'filterName'],
    ['$top', '$top'],
    ['2fa', '_2fa'],
    ['default', 'defaultParam'],
    ['class', 'classParam'],
    ['arguments', 'argumentsParam'],
    ['[]', 'param'],
    ['[Object]', 'object'],
    ['ñame', 'ame']
  ])('turns %p into the variable %p', (name, symbol) => {
    expect(toParamSymbol(name)).toBe(symbol);
  });

  it('sends query params under their declared names', () => {
    const item = parse('/api/Items', [query('page_size'), query('page')]);

    expect(item.apiMethodParams).toBe('{ pageSize, page }: { pageSize?: string; page?: string } = {}');
    expect(item.queryParamsFormatted)
      .toBe("params: { ...(pageSize != null ? { 'page_size': pageSize } : {}), ...(page != null ? { page } : {}) }");
    expect(item.queryParams.map(param => param.originalParam.name)).toEqual(['page_size', 'page']);
  });

  it('renames reserved words and keeps them on the wire', () => {
    const item = parse('/api/Items/{class}', [pathParam('class'), query('default')]);

    expect(item.apiMethodParams).toBe('classParam: number, { defaultParam }: { defaultParam?: string } = {}');
    expect(item.apiUrl).toBe('${classParam}');
    expect(item.queryParamsFormatted).toBe("params: { ...(defaultParam != null ? { 'default': defaultParam } : {}) }");
  });

  it('interpolates path params with non-camelCase names', () => {
    expect(parse('/api/Items/{item_id}', [pathParam('item_id')]).apiUrl).toBe('${itemId}');
  });

  it('keeps the literal text around path params and interpolates every one in a segment', () => {
    const file = (name: string) => ({ name, in: 'path', required: true, schema: { type: 'string' } });

    expect(parse('/api/Items/{name}.{ext}', [file('name'), file('ext')]).apiUrl).toBe('${name}.${ext}');
    expect(parse('/api/Items/{item_id}.json', [pathParam('item_id')]).apiUrl).toBe('${itemId}.json');
  });

  it('names a method without an operationId after every param of a segment', () => {
    const file = (name: string) => ({ name, in: 'path', required: true, schema: { type: 'string' } });

    // Not `getItemsByName}{ext`, which doesn't compile
    expect(parse('/api/Items/{name}.{ext}', [file('name'), file('ext')]).apiMethodName).toBe('getItemsByNameExt');
    expect(parse('/api/Items/{item_id}.json', [pathParam('item_id')]).apiMethodName).toBe('getItemsByItemId');
  });

  it('sends a query param named __proto__ as an entry, not as the params object\'s prototype', () => {
    const item = parse('/api/Items', [{ ...query('__proto__'), required: true }]);

    expect(item.queryParamsFormatted).toBe("params: { ['__proto__']: proto }");
  });

  it('gives a query param whose variable another param already has its location as a suffix', () => {
    const item = parse('/api/Items/{id}', [pathParam('id'), query('id'), query('page_size'), query('pageSize')]);

    expect(item.apiMethodParamNames).toEqual(['id', 'idQuery', 'pageSize', 'pageSizeQuery']);
    expect(item.queryParamsFormatted).toContain("{ 'id': idQuery }");
    expect(item.queryParamsFormatted).toContain("{ 'pageSize': pageSizeQuery }");
  });

  it('keeps a query param named body apart from the request body', () => {
    const item = parse('/api/Items', [query('body')], 'post', { requestBody: { content: { 'application/json': { schema: { type: 'string' } } } } });

    expect(item.apiMethodParamNames).toEqual(['bodyQuery', 'body']);
  });

  it('sends RTK query params under their declared names too', async () => {
    const tree = await runFullSchematics({
      openapi: '3.0.1',
      info: { title: 'T', version: '1' },
      paths: { '/api/Items': { get: { tags: ['Items'], parameters: [query('page_size'), query('default')], responses: ok } } },
      components: { schemas: {} }
    } as unknown as ISwaggerSchema, { ...RTK_SCHEMATIC_OPTIONS, scopeEndpointsWithTags: false });
    resetFetchMocks();

    const slice = tree.readContent(`${RTK_SCHEMATIC_OPTIONS.path}/items.api.ts`);
    expect(slice).toContain("query: ({ pageSize, defaultParam } = {}) => ({");
    expect(slice).toContain("params: omitBy({ 'page_size': pageSize, 'default': defaultParam }, isNil),");
  });
});
