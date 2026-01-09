import { IParsedApiSchema, transformSwaggerSchema } from "../api/helpers/api.helper";
import { apiToTemplate } from "../api/helpers/template.helper";
import { DELETE_MANY_ARRAY_OF_IDS_METHOD, GET_MODEL_BY_ID_METHOD, GET_BY_STATUS_WITH_ENUM_PARAM_METHOD, POST_MODEL_BY_ID_METHOD, PUT_MODEL_WITH_EMPTY_BODY_METHOD, PUT_MODEL_WITH_INTEGER_BODY_METHOD, PUT_WITH_PATH_PARAM_FROM_BODY_METHOD } from "../mocks/api-mocks";
import { SWAGGER_DATA } from "../mocks/swagger-mock";
import { transformRefsToImport } from "../types/helpers/template.helper";

function isArrayUnique(arr: any[]): boolean {
  return arr.length === new Set(arr).size;
}

describe('Schematics API', () => {
  let parsedSchema: IParsedApiSchema;
  beforeAll(() => {
    parsedSchema = transformSwaggerSchema(SWAGGER_DATA);
    console.log(parsedSchema);
  });

  it('should return parsed schema', () => {
      expect(parsedSchema).toBeDefined();
      expect(parsedSchema.Claim).toBeDefined();
  });

  it('should have importRefs without duplicates', () => {
    const importRefs = parsedSchema.Claim.importRefs.map(ref => ref.importSymbol);
    expect(isArrayUnique(importRefs)).toBe(true);
  });

  it('should include enum import from parameter', () => {
    // This tests the bug fix: when a parameter has an enum type, the enum should be imported
    const enumImportRef = parsedSchema.Claim.importRefs.find(ref => ref.importSymbol === 'TClaimStatuses');
    expect(enumImportRef).toBeDefined();
    expect(enumImportRef?.type).toBe('enum');
    expect(enumImportRef?.fileName).toBe('claim-statuses');
  });

  it('should generate template imports without duplicates', () => {
    const templateImports = transformRefsToImport(parsedSchema.Claim.importRefs, '/optionsPath', 'sourcePath').split('\n');
    expect(isArrayUnique(templateImports)).toBe(true);
  });

  it('should have uniq apiList', () => {
    const apiList = parsedSchema.Claim.apiList.map(api => api.apiMethodName);
    expect(isArrayUnique(apiList)).toBe(true);
  });

  describe('method to template', () => {
    it('should generate api method template', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'getById')
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(GET_MODEL_BY_ID_METHOD);
      }
    });

    it('should generate post model by id', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'addClaimByIdNote');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(POST_MODEL_BY_ID_METHOD);
      }
    });

    it('should generate put model with empty body', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'updateClaimByIdReactivate');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(PUT_MODEL_WITH_EMPTY_BODY_METHOD);
      }
    });

    it('should generate put model with integer body', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'updateClaimStatus');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(PUT_MODEL_WITH_INTEGER_BODY_METHOD);
      }
    });

    it('should generate delete many array of ids', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'deleteClaimDeletemany');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(DELETE_MANY_ARRAY_OF_IDS_METHOD);
      }
    });

    it('should generate get with enum parameter', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'getClaimBystatus');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(GET_BY_STATUS_WITH_ENUM_PARAM_METHOD);
      }
    });

    it('should use body.id for path param when no separate path param defined (PUT/POST)', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'updateClaimNoteById');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(PUT_WITH_PATH_PARAM_FROM_BODY_METHOD);
      }
    });

    // Delete should have body and params (query params) in one object
  });
});