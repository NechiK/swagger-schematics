import { buildApiModel } from '@lib/helpers/api-changes/api-model';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';

const SCHEMA = {
  openapi: '3.0.1',
  info: { title: 'T', version: 'v1' },
  paths: {
    '/api/Users/{id}': {
      get: {
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserDto' } } } } }
      }
    },
    '/other/Skipped': { get: { responses: { '200': { description: 'ok' } } } }
  },
  components: {
    schemas: {
      UserDto: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' }, email: { type: 'string', nullable: true } }
      },
      OrderStatus: { type: 'string', enum: ['New', 'in progress'] },
      Priority: { type: 'integer', enum: [1, 2], 'x-enum-varnames': ['Low', 'High'] },
      AnyId: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
      UserId: { type: 'string', format: 'uuid' }
    }
  }
} as unknown as ISwaggerSchema;

describe('buildApiModel', () => {
  const model = buildApiModel(SCHEMA, { framework: 'angular' });

  it('names types the way the templates do and skips schemas that generate no file', () => {
    expect(Object.keys(model.types).sort()).toEqual(['IUserDto', 'TAnyId', 'TOrderStatus', 'TPriority']);
  });

  it('renders interface properties as they appear in the generated interface', () => {
    expect(model.types.IUserDto).toEqual({
      kind: 'interface',
      properties: { id: 'id: number', email: 'email?: string | null' }
    });
  });

  it('uses the generated enum member names', () => {
    expect(model.types.TOrderStatus).toEqual({ kind: 'enum', members: { New: '"New"', InProgress: '"in progress"' } });
    expect(model.types.TPriority).toEqual({ kind: 'enum', members: { Low: '1', High: '2' } });
  });

  it('renders composition schemas as their type expression', () => {
    expect(model.types.TAnyId).toEqual({ kind: 'type-alias', expression: 'string | number' });
  });

  it('keys endpoints by method and path, with the Angular service method and signature', () => {
    expect(model.endpoints).toEqual({
      'GET /api/Users/{id}': {
        label: 'GET /api/Users/{id}',
        symbol: 'UsersApiService.getById()',
        signature: '(id: number) => IUserDto'
      }
    });
  });

  it('names endpoints after the RTK slice, scoped with tags when configured', () => {
    expect(buildApiModel(SCHEMA, { framework: 'react-rtk' }).endpoints['GET /api/Users/{id}'].symbol)
      .toBe('usersApi.getById');
    expect(buildApiModel(SCHEMA, { framework: 'react-rtk', scopeEndpointsWithTags: true }).endpoints['GET /api/Users/{id}'].symbol)
      .toBe('usersApi.usersGetById');
  });

  it('shows what callers pass: positional parameters for Angular, the request object for RTK', () => {
    expect(buildApiModel(SCHEMA, { framework: 'angular' }).endpoints['GET /api/Users/{id}'].signature).toBe('(id: number) => IUserDto');
    expect(buildApiModel(SCHEMA, { framework: 'react-rtk' }).endpoints['GET /api/Users/{id}'].signature).toBe('({ id: number }) => IUserDto');
  });

  it('applies typeMapping like the generator', () => {
    const mapped = buildApiModel(SCHEMA, { framework: 'angular', typeMapping: { UserDto: 'unknown' } });
    expect(mapped.endpoints['GET /api/Users/{id}'].signature).toBe('(id: number) => unknown');
  });

  it('applies legacyOptionalProperties to parameters like the generator', () => {
    const schema = {
      ...SCHEMA,
      paths: {
        '/api/Users': {
          get: {
            tags: ['Users'],
            parameters: [{ name: 'page', in: 'query', required: true, schema: { type: 'integer', nullable: true } }],
            responses: { '204': { description: 'ok' } }
          }
        }
      }
    } as unknown as ISwaggerSchema;
    const signature = (legacyOptionalProperties: boolean) =>
      buildApiModel(schema, { framework: 'angular', legacyOptionalProperties }).endpoints['GET /api/Users'].signature;

    expect(signature(false)).toBe('({ page }: { page: number | null }) => void');
    expect(signature(true)).toBe('({ page }: { page?: number | null }) => void');
  });
});
