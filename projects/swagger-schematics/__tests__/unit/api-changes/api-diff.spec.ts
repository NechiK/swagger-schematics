import { diffApiModels } from '@lib/helpers/api-changes/api-diff';
import { IApiModel } from '@lib/helpers/api-changes/api-model';

const endpoint = (label: string, symbol: string, signature: string) => ({ label, symbol, signature });

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

  it('finds nothing between identical models', () => {
    expect(diffApiModels(CURRENT, CURRENT)).toEqual([]);
  });
});
