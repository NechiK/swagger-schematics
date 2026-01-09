import '../helpers/matchers';
import { IParsedApiSchema, transformSwaggerSchema } from '../../api/helpers/api.helper';
import { apiToTemplate } from '../../api/helpers/template.helper';
import { transformRefsToImport } from '../../types/helpers/template.helper';
import { SWAGGER_SCHEMA, MOCK_GROUP } from '../__fixtures__/swagger/full-schema.fixture';

describe('Template Helper - apiToTemplate', () => {
  let parsedSchema: IParsedApiSchema;

  beforeAll(() => {
    parsedSchema = transformSwaggerSchema(SWAGGER_SCHEMA);
  });

  describe('GET Operations', () => {
    it('should generate GET by ID template', () => {
      const apiMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'getById'
      );
      expect(apiMethod).toBeDefined();

      const template = apiToTemplate(apiMethod!);
      expect(template).toMatchSnapshot();
    });

    it('should generate GET with enum parameter template', () => {
      const apiMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'getClaimBystatus'
      );
      expect(apiMethod).toBeDefined();

      const template = apiToTemplate(apiMethod!);
      expect(template).toMatchSnapshot();
    });

    it('should generate GET child by parent ID template', () => {
      const apiMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'getServiceActionsByClaimId'
      );
      expect(apiMethod).toBeDefined();

      const template = apiToTemplate(apiMethod!);
      expect(template).toMatchSnapshot();
    });
  });

  describe('POST Operations', () => {
    it('should generate POST model by ID template', () => {
      const apiMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'createClaimByIdNote'
      );
      expect(apiMethod).toBeDefined();

      const template = apiToTemplate(apiMethod!);
      expect(template).toMatchSnapshot();
    });

    it('should generate POST search all template', () => {
      const apiMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'postClaimAll'
      );
      expect(apiMethod).toBeDefined();

      const template = apiToTemplate(apiMethod!);
      expect(template).toMatchSnapshot();
    });
  });

  describe('PUT Operations', () => {
    it('should generate PUT with empty body template', () => {
      const apiMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'updateClaimByIdReactivate'
      );
      expect(apiMethod).toBeDefined();

      const template = apiToTemplate(apiMethod!);
      expect(template).toMatchSnapshot();
    });

    it('should generate PUT with integer body template', () => {
      const apiMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'updateClaimStatus'
      );
      expect(apiMethod).toBeDefined();

      const template = apiToTemplate(apiMethod!);
      expect(template).toMatchSnapshot();
    });

    it('should use body.id for path param when no separate path param defined', () => {
      const apiMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'updateClaimNoteById'
      );
      expect(apiMethod).toBeDefined();

      const template = apiToTemplate(apiMethod!);
      expect(template).toMatchSnapshot();
    });
  });

  describe('DELETE Operations', () => {
    it('should generate DELETE many array of IDs template', () => {
      const apiMethod = parsedSchema[MOCK_GROUP].apiList.find(
        api => api.apiMethodName === 'deleteClaimDeletemany'
      );
      expect(apiMethod).toBeDefined();

      const template = apiToTemplate(apiMethod!);
      expect(template).toMatchSnapshot();
    });
  });
});

describe('Template Helper - transformRefsToImport', () => {
  let parsedSchema: IParsedApiSchema;

  beforeAll(() => {
    parsedSchema = transformSwaggerSchema(SWAGGER_SCHEMA);
  });

  it('should generate template imports without duplicates', () => {
    const templateImports = transformRefsToImport(
      parsedSchema[MOCK_GROUP].importRefs,
      '/optionsPath',
      'sourcePath'
    );

    const importLines = templateImports.split('\n').filter(line => line.trim());
    expect(importLines).toHaveUniqueItems();
  });

  it('should generate correct import format', () => {
    const templateImports = transformRefsToImport(
      parsedSchema[MOCK_GROUP].importRefs,
      '/test-path',
      'sourcePath'
    );

    expect(templateImports).toMatchSnapshot();
  });
});
