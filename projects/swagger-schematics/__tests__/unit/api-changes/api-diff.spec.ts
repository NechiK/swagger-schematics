import { diffApiModels } from '@lib/helpers/api-changes/api-diff';
import { IApiModel, buildApiModel } from '@lib/helpers/api-changes/api-model';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';

// The path params and result a signature shows, as buildApiModel records them: `(id: number) => IUserDto`
const endpoint = (label: string, symbol: string, signature: string) => {
  const [, paramList, response] = /^\((.*)\) => (.*)$/.exec(signature)!;
  const params: Record<string, string> = Object.fromEntries(
    paramList ? paramList.split(', ').map(param => [`path ${param.split(':')[0]}`, param]) : []
  );
  return { label, symbol, signature, response, params, args: Object.keys(params).map(id => ({ id, optional: false })) };
};

const PREVIOUS: IApiModel = {
  types: {
    IUserDto: { kind: 'interface', properties: { id: 'id: number', middleName: 'middleName?: string', email: 'email?: string' } },
    TOrderStatus: { kind: 'enum', members: { New: '"New"', Cancelled: '"Cancelled"' } },
    TAnyId: { kind: 'type-alias', expression: 'string | number' },
    IOrderDto: { kind: 'interface', properties: {} },
    TKind: { kind: 'enum', members: {} }
  },
  endpoints: {
    'DELETE /api/Orders/{id}': endpoint('DELETE /api/Orders/{id}', 'OrdersApiService.delete()', '(id: number) => void'),
    'GET /api/Users/{id}': endpoint('GET /api/Users/{id}', 'UsersApiService.getById()', '(id: number) => IUserDto'),
    'GET /api/Users': endpoint('GET /api/Users', 'UsersApiService.getAll()', '() => IUserDto[]')
  }
};

const CURRENT: IApiModel = {
  types: {
    IUserDto: { kind: 'interface', properties: { id: 'id: number', email: 'email?: string | null', roles: 'roles?: IRoleDto[]' } },
    TOrderStatus: { kind: 'enum', members: { New: '"New"', Done: '"Done"' } },
    TAnyId: { kind: 'type-alias', expression: 'string' },
    IRoleDto: { kind: 'interface', properties: {} },
    TKind: { kind: 'type-alias', expression: 'string' }
  },
  endpoints: {
    'GET /api/Users/{id}': endpoint('GET /api/Users/{id}', 'UsersApiService.getById()', '(id: string) => IUserDto'),
    'GET /api/Users': endpoint('GET /api/Users', 'UsersApiService.list()', '() => IUserDto[]'),
    'GET /api/Users/{id}/roles': endpoint('GET /api/Users/{id}/roles', 'UsersApiService.getRoles()', '(id: number) => IRoleDto[]')
  }
};

describe('diffApiModels', () => {
  const changes = diffApiModels(PREVIOUS, CURRENT);

  it('lists every change: breaking first, then types (by symbol) before endpoints (by method and path)', () => {
    expect(changes).toEqual([
      { severity: 'breaking', kind: 'Interface removed', subject: 'IOrderDto' },
      { severity: 'breaking', kind: 'Property changed', subject: 'IUserDto.email', from: 'email?: string', to: 'email?: string | null' },
      { severity: 'breaking', kind: 'Property removed', subject: 'IUserDto.middleName' },
      { severity: 'breaking', kind: 'Type changed', subject: 'TAnyId', from: 'string | number', to: 'string' },
      { severity: 'breaking', kind: 'Type changed', subject: 'TKind', from: 'enum', to: 'type' },
      { severity: 'breaking', kind: 'Enum member removed', subject: 'TOrderStatus.Cancelled' },
      { severity: 'breaking', kind: 'Endpoint removed', subject: 'DELETE /api/Orders/{id}', ref: 'OrdersApiService.delete()' },
      {
        severity: 'breaking', kind: 'Endpoint changed', subject: 'GET /api/Users',
        from: 'UsersApiService.getAll() () => IUserDto[]', to: 'UsersApiService.list() () => IUserDto[]'
      },
      {
        severity: 'breaking', kind: 'Endpoint changed', subject: 'GET /api/Users/{id}',
        ref: 'UsersApiService.getById()', from: '(id: number) => IUserDto', to: '(id: string) => IUserDto'
      },
      { severity: 'added', kind: 'Interface added', subject: 'IRoleDto' },
      { severity: 'added', kind: 'Property added', subject: 'IUserDto.roles', ref: 'roles?: IRoleDto[]' },
      { severity: 'added', kind: 'Enum member added', subject: 'TOrderStatus.Done', ref: '"Done"' },
      { severity: 'added', kind: 'Endpoint added', subject: 'GET /api/Users/{id}/roles', ref: 'UsersApiService.getRoles()' }
    ]);
  });

  it('reports a new required property as breaking and a new optional one as added', () => {
    const withProperties = (properties: Record<string, string>): IApiModel =>
      ({ types: { ICreateOrderDto: { kind: 'interface', properties } }, endpoints: {} });

    const changes = diffApiModels(
      withProperties({ name: 'name: string' }),
      withProperties({ name: 'name: string', customerId: 'customerId: number', note: 'note?: string' })
    );

    expect(changes).toEqual([
      { severity: 'breaking', kind: 'Required property added', subject: 'ICreateOrderDto.customerId', ref: 'customerId: number' },
      { severity: 'added', kind: 'Property added', subject: 'ICreateOrderDto.note', ref: 'note?: string' }
    ]);
  });

  it('finds nothing between identical models', () => {
    expect(diffApiModels(CURRENT, CURRENT)).toEqual([]);
  });

  it('treats members and properties named like Object.prototype keys as real entries', () => {
    const schemaWith = (schemas: Record<string, unknown>) =>
      ({ openapi: '3.0.1', info: { title: 'T', version: '1' }, paths: {}, components: { schemas } }) as unknown as ISwaggerSchema;
    const before = buildApiModel(schemaWith({
      Kind: { type: 'string', enum: ['A'] },
      Dto: { type: 'object', properties: { id: { type: 'integer' } } }
    }), { framework: 'angular' });
    const after = buildApiModel(schemaWith({
      Kind: { type: 'string', enum: ['A', 'constructor', 'toString'] },
      Dto: { type: 'object', properties: { id: { type: 'integer' }, constructor: { type: 'string' } } }
    }), { framework: 'angular' });

    expect(diffApiModels(before, after)).toEqual([
      { severity: 'added', kind: 'Property added', subject: 'IDto.constructor', ref: 'constructor?: string' },
      { severity: 'added', kind: 'Enum member added', subject: 'TKind.constructor', ref: '"constructor"' },
      { severity: 'added', kind: 'Enum member added', subject: 'TKind.toString', ref: '"toString"' }
    ]);
    expect(diffApiModels(after, before).map(change => change.kind)).toEqual(['Property removed', 'Enum member removed', 'Enum member removed']);
  });

  it('reports a new optional property whose name is quoted as added', () => {
    const schemaWith = (properties: Record<string, unknown>, required: string[] = []) =>
      ({ openapi: '3.0.1', info: { title: 'T', version: '1' }, paths: {}, components: { schemas: { Dto: { type: 'object', properties, required } } } }) as unknown as ISwaggerSchema;
    const diff = (before: ISwaggerSchema, after: ISwaggerSchema) =>
      diffApiModels(buildApiModel(before, { framework: 'angular' }), buildApiModel(after, { framework: 'angular' }));
    const id = { id: { type: 'integer' } };
    const name = { type: 'string' };

    expect(diff(schemaWith(id), schemaWith({ ...id, 'first-name': name, '@odata.type': name }))).toEqual([
      { severity: 'added', kind: 'Property added', subject: 'IDto.@odata.type', ref: "'@odata.type'?: string" },
      { severity: 'added', kind: 'Property added', subject: 'IDto.first-name', ref: "'first-name'?: string" }
    ]);
    expect(diff(schemaWith(id), schemaWith({ ...id, 'first-name': name }, ['first-name']))).toEqual([
      { severity: 'breaking', kind: 'Required property added', subject: 'IDto.first-name', ref: "'first-name': string" }
    ]);
  });

  it('reports an index signature that appears, goes or changes type as breaking', () => {
    const schemaWith = (additionalProperties?: unknown) =>
      ({
        openapi: '3.0.1', info: { title: 'T', version: '1' }, paths: {},
        components: { schemas: { Dto: { type: 'object', required: ['id'], properties: { id: { type: 'string' } }, additionalProperties } } }
      }) as unknown as ISwaggerSchema;
    const diff = (before: ISwaggerSchema, after: ISwaggerSchema) =>
      diffApiModels(buildApiModel(before, { framework: 'angular' }), buildApiModel(after, { framework: 'angular' }));

    expect(diff(schemaWith({ type: 'string' }), schemaWith({ type: 'integer' }))).toEqual([
      { severity: 'breaking', kind: 'Index signature changed', subject: 'IDto[key: string]', from: 'string', to: 'number | string' }
    ]);
    expect(diff(schemaWith(), schemaWith(true))).toEqual([
      { severity: 'breaking', kind: 'Index signature added', subject: 'IDto[key: string]', ref: '[key: string]: any' }
    ]);
    expect(diff(schemaWith({ type: 'string' }), schemaWith(false))).toEqual([
      { severity: 'breaking', kind: 'Index signature removed', subject: 'IDto[key: string]', ref: '[key: string]: string' }
    ]);
    expect(diff(schemaWith(true), schemaWith(true))).toEqual([]);
    // Reordered properties reorder the union, which is still the same type
    const bag = (properties: Record<string, unknown>) =>
      ({ openapi: '3.0.1', info: { title: 'T', version: '1' }, paths: {}, components: { schemas: { Bag: { type: 'object', properties, additionalProperties: { type: 'boolean' } } } } }) as unknown as ISwaggerSchema;
    expect(diff(bag({ a: { type: 'string' }, b: { type: 'integer' } }), bag({ b: { type: 'integer' }, a: { type: 'string' } }))).toEqual([]);
  });

  describe('new endpoint parameters', () => {
    const ok = { '204': { description: 'ok' } };
    const schemaWith = (parameters: unknown[], requestBody?: unknown) => ({
      openapi: '3.0.1',
      info: { title: 'T', version: '1' },
      paths: { '/api/Orders/{id}': { put: { tags: ['Orders'], parameters, requestBody, responses: ok } } },
      components: { schemas: {} }
    }) as unknown as ISwaggerSchema;
    const id = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
    const query = (name: string, required = false) => ({ name, in: 'query', required, schema: { type: 'string' } });
    const header = (name: string, required = false) => ({ name, in: 'header', required, schema: { type: 'string' } });
    const body = { content: { 'application/json': { schema: { type: 'string' } } } };
    const severityOf = (framework: 'angular' | 'react-rtk', before: ISwaggerSchema, after: ISwaggerSchema) =>
      diffApiModels(buildApiModel(before, { framework }), buildApiModel(after, { framework })).map(change => `${change.severity}: ${change.kind}`);

    it('reports an optional parameter existing calls can leave out as added', () => {
      // Next to existing query params, or a new headers object (it defaults to {})
      expect(severityOf('angular', schemaWith([id, query('a')], body), schemaWith([id, query('a'), query('b')], body)))
        .toEqual(['added: Optional parameter added']);
      expect(severityOf('angular', schemaWith([id], body), schemaWith([id, header('X-Trace')], body)))
        .toEqual(['added: Optional parameter added']);
      expect(severityOf('react-rtk', schemaWith([id]), schemaWith([id, query('a'), header('X-Trace')])))
        .toEqual(['added: Optional parameter added']);
      // An RTK endpoint without an argument may be called without one when every new field is optional
      expect(severityOf('react-rtk', schemaWith([]), schemaWith([query('a')]))).toEqual(['added: Optional parameter added']);
    });

    it('reports a required parameter, or one that shifts the positional arguments, as breaking', () => {
      expect(severityOf('angular', schemaWith([id]), schemaWith([id, query('a', true)]))).toEqual(['breaking: Endpoint changed']);
      expect(severityOf('react-rtk', schemaWith([id]), schemaWith([id, header('X-Trace', true)]))).toEqual(['breaking: Endpoint changed']);
      // Angular's first query param adds a positional object before the body, which has no default
      expect(severityOf('angular', schemaWith([id], body), schemaWith([id, query('a')], body))).toEqual(['breaking: Endpoint changed']);
      // An existing parameter that changes stays breaking, even next to a new optional one
      expect(severityOf('angular', schemaWith([id, query('a')]), schemaWith([id, query('a', true), query('b')]))).toEqual(['breaking: Endpoint changed']);
    });

    it('reports a new optional parameter that takes an existing one\'s variable as breaking', () => {
      // `page_size` declared first gets `pageSize`, so existing `{ pageSize }` calls now fill it instead
      const renamed = (framework: 'angular' | 'react-rtk') =>
        severityOf(framework, schemaWith([id, query('pageSize')]), schemaWith([id, query('page_size'), query('pageSize')]));

      expect(renamed('angular')).toEqual(['breaking: Endpoint changed']);
      expect(renamed('react-rtk')).toEqual(['breaking: Endpoint changed']);
    });

    it('finds no change when only the order of params passed by name changes', () => {
      const before = schemaWith([id, query('page'), query('size'), header('X-A'), header('X-B')], body);
      const after = schemaWith([id, query('size'), query('page'), header('X-B'), header('X-A')], body);

      expect(severityOf('angular', before, after)).toEqual([]);
      expect(severityOf('react-rtk', before, after)).toEqual([]);
      // Path params are positional in Angular, so their order still matters
      const twoIds = (first: string, second: string) => schemaWith([
        { name: first, in: 'path', required: true, schema: { type: 'integer' } },
        { name: second, in: 'path', required: true, schema: { type: 'integer' } }
      ]);
      expect(severityOf('angular', twoIds('id', 'sub'), twoIds('sub', 'id'))).toEqual(['breaking: Endpoint changed']);
    });

    it('compares header names case-insensitively, as HTTP does', () => {
      // Re-casing a header keeps its variable, so a new optional query param next to it is still only added
      expect(severityOf('angular', schemaWith([id, query('a'), header('X-Tenant')]), schemaWith([id, query('a'), header('x-tenant'), query('b')])))
        .toEqual(['added: Optional parameter added']);
    });
  });
});
