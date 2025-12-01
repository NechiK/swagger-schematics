import { IParsedApiSchema, transformSwaggerSchema } from "../api/helpers/api.helper";
import { apiToTemplate } from "../api/helpers/template.helper";
import {
    DELETE_MANY_ARRAY_OF_IDS_METHOD,
    GET_MODEL_BY_ID_METHOD,
    POST_MODEL_BY_ID_METHOD,
    PUT_MODEL_WITH_EMPTY_BODY_METHOD,
    PUT_MODEL_WITH_INTEGER_BODY_METHOD,
    DELETE_SINGLE_BY_ID_METHOD,
    PATCH_MODEL_BY_ID_METHOD,
    PUT_MODEL_BY_ID_WITH_BODY_METHOD,
    POST_WITHOUT_PATH_PARAMS_METHOD,
    GET_WITH_QUERY_PARAMS_METHOD,
} from "../mocks/api-mocks";
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
    expect(isArrayUnique(importRefs)).withContext('ImportRefs should be unique').toBe(true);
  });

  it('should generate template imports without duplicates', () => {
    const templateImports = transformRefsToImport(parsedSchema.Claim.importRefs, '/optionsPath', 'sourcePath').split('\n');
    expect(isArrayUnique(templateImports)).withContext('Template imports should be unique').toBe(true);
  });

  it('should have uniq apiList', () => {
    const apiList = parsedSchema.Claim.apiList.map(api => api.apiMethodName);
    // console.log(parsedSchema.Claim.apiList);
    expect(isArrayUnique(apiList)).withContext('Api method names should be unique').toBe(true);
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

    // NEW TEST CASES - Extended coverage

    it('should generate delete single by id', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'deleteClaimById');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(DELETE_SINGLE_BY_ID_METHOD);
      }
    });

    it('should generate patch model by id', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'patchClaimById');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(PATCH_MODEL_BY_ID_METHOD);
      }
    });

    it('should generate put model with path param and body', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'updateClaimById');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(PUT_MODEL_BY_ID_WITH_BODY_METHOD);
      }
    });

    it('should generate post without path params', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'postClaimAll');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(POST_WITHOUT_PATH_PARAMS_METHOD);
      }
    });

    it('should generate get with query params', () => {
      const apiMethod = parsedSchema.Claim.apiList.find(api => api.apiMethodName === 'getClaimList');
      expect(apiMethod).toBeDefined();
      if (apiMethod) {
        const apiTemplate = apiToTemplate(apiMethod);
        expect(apiTemplate).toEqual(GET_WITH_QUERY_PARAMS_METHOD);
      }
    });
  });
});