import '../helpers/matchers';
import { IParsedApiSchema, transformSwaggerSchema, buildScopedApiMethodName } from '../../api/helpers/api.helper';
import { getApiMethodName } from '../../types/utils/api';
import { SWAGGER_SCHEMA, MOCK_GROUP } from '../__fixtures__/swagger/full-schema.fixture';
import { createGetOperation, createPathParam, createSwaggerSchema } from '../helpers/factories';

describe('API Helper - transformSwaggerSchema', () => {
  let parsedSchema: IParsedApiSchema;

  beforeAll(() => {
    parsedSchema = transformSwaggerSchema(SWAGGER_SCHEMA);
  });

  describe('Schema Parsing', () => {
    it('should return parsed schema', () => {
      expect(parsedSchema).toBeDefined();
      expect(parsedSchema[MOCK_GROUP]).toBeDefined();
    });

    it('should parse correct tag group', () => {
      const claimSchema = parsedSchema[MOCK_GROUP];
      expect(claimSchema).toBeDefined();
      expect(claimSchema.name).toBe(MOCK_GROUP);
    });
  });

  describe('Import References', () => {
    it('should have importRefs without duplicates', () => {
      const importRefs = parsedSchema[MOCK_GROUP].importRefs.map(ref => ref.importSymbol);
      expect(importRefs).toHaveUniqueItems();
    });

    it('should include enum import from parameter', () => {
      // This tests the bug fix: when a parameter has an enum type, the enum should be imported
      const enumImportRef = parsedSchema[MOCK_GROUP].importRefs.find(
        ref => ref.importSymbol === 'TClaimStatuses'
      );

      expect(enumImportRef).toBeDefined();
      expect(enumImportRef?.type).toBe('enum');
      expect(enumImportRef?.fileName).toBe('claim-statuses');
    });

    it('should include interface imports', () => {
      const interfaceImports = parsedSchema[MOCK_GROUP].importRefs.filter(
        ref => ref.type === 'interface'
      );

      expect(interfaceImports.length).toBeGreaterThan(0);
      expect(interfaceImports.some(ref => ref.importSymbol === 'IClaimDetailDTO')).toBe(true);
    });
  });

  describe('API Methods', () => {
    it('should have unique apiList methods', () => {
      expect(parsedSchema[MOCK_GROUP]).toHaveUniqueApiMethods();
    });

    it('should parse GET by ID operation', () => {
      const getById = parsedSchema[MOCK_GROUP].apiList.find(api => api.apiMethodName === 'getById');
      expect(getById).toBeDefined();
      expect(getById?.apiMethodType).toBe('get');
    });

    it('should parse POST with body operation', () => {
      const postMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'createClaimByIdNote'
      );
      expect(postMethod).toBeDefined();
      expect(postMethod?.apiMethodType).toBe('post');
    });

    it('should parse DELETE many operation', () => {
      const deleteMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'deleteClaimDeletemany'
      );
      expect(deleteMethod).toBeDefined();
      expect(deleteMethod?.apiMethodType).toBe('delete');
    });
  });

  describe('Full parsed schema structure', () => {
    it('should match snapshot', () => {
      // Snapshot of the full parsed structure for regression testing
      expect(parsedSchema).toMatchSnapshot();
    });
  });
});

describe('buildScopedApiMethodName', () => {
  it('should prefix method name with camelized tag name', () => {
    expect(buildScopedApiMethodName('getById', 'Claim')).toBe('claimGetById');
    expect(buildScopedApiMethodName('create', 'User')).toBe('userCreate');
  });

  it('should handle hyphenated tag names', () => {
    expect(buildScopedApiMethodName('getAll', 'user-profile')).toBe('userProfileGetAll');
    expect(buildScopedApiMethodName('update', 'api-settings')).toBe('apiSettingsUpdate');
  });

  it('should avoid redundant prefix when suffix starts with prefix (case-insensitive)', () => {
    // "UsersGet" starts with "users" (case-insensitive), should become "usersGet"
    expect(buildScopedApiMethodName('UsersGet', 'users')).toBe('usersGet');
    expect(buildScopedApiMethodName('usersGet', 'users')).toBe('usersGet');
    // classify('USERSGET') = 'USERSGET', so remaining part after prefix removal is 'GET'
    expect(buildScopedApiMethodName('USERSGET', 'users')).toBe('usersGET');
  });

  it('should handle mixed case correctly when removing redundant prefix', () => {
    // The suffix "UsersGetAll" starts with "Users" which matches "users" case-insensitively
    expect(buildScopedApiMethodName('UsersGetAll', 'users')).toBe('usersGetAll');
    expect(buildScopedApiMethodName('ClaimGet', 'claim')).toBe('claimGet');
    expect(buildScopedApiMethodName('CLAIMGet', 'claim')).toBe('claimGet');
  });

  it('should not remove prefix when suffix does not start with it', () => {
    expect(buildScopedApiMethodName('getById', 'users')).toBe('usersGetById');
    expect(buildScopedApiMethodName('create', 'claim')).toBe('claimCreate');
  });

  it('should not remove prefix when suffix equals prefix exactly', () => {
    // When suffix is exactly the prefix (after classification), keep both
    expect(buildScopedApiMethodName('users', 'users')).toBe('usersUsers');
    expect(buildScopedApiMethodName('claim', 'claim')).toBe('claimClaim');
  });

  it('should handle partial prefix matches correctly', () => {
    // "UserGet" does NOT start with "users" (missing 's'), should not remove
    expect(buildScopedApiMethodName('UserGet', 'users')).toBe('usersUserGet');
    // "Use" does NOT start with "users", should not remove
    expect(buildScopedApiMethodName('UseData', 'users')).toBe('usersUseData');
  });
});

describe('getApiMethodName - operationId priority', () => {
  const operationWithId = (operationId?: string) => ({
    ...createGetOperation({
      tags: ['Ticket'],
      summary: 'Download a ticket attachment',
      parameters: [createPathParam('ticketId')]
    }).get!,
    ...(operationId ? { operationId } : {})
  });

  it('should prefer operationId over path-based generation', () => {
    const operation = operationWithId('DownloadTicketAttachment');
    expect(getApiMethodName(operation, 'get', '/api/Ticket/{ticketId}/attachments/{attachmentId}/download'))
      .toBe('downloadTicketAttachment');
  });

  it('should camelize operationId variants', () => {
    expect(getApiMethodName(operationWithId('Get_Ticket-Details'), 'get', '/api/Ticket/{ticketId}'))
      .toBe('getTicketDetails');
  });

  it('should fall back to path-based generation without operationId', () => {
    const operation = operationWithId(undefined);
    expect(getApiMethodName(operation, 'get', '/api/Ticket/{ticketId}'))
      .toBe('getByTicketId');
  });

  it('should be used by transformSwaggerSchema for endpoint names', () => {
    const swagger = createSwaggerSchema({
      paths: {
        '/api/Ticket/{ticketId}/download': {
          get: operationWithId('DownloadTicket')
        }
      },
      schemas: {}
    });

    const parsed = transformSwaggerSchema(swagger);
    expect(parsed['Ticket'].apiList[0].apiMethodName).toBe('downloadTicket');
  });
});
