import '../helpers/matchers';
import { IParsedApiSchema, transformSwaggerSchema } from '../../api/helpers/api.helper';
import { SWAGGER_SCHEMA, MOCK_GROUP } from '../__fixtures__/swagger/full-schema.fixture';

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
