import { transformSwaggerSchema } from "../api/helpers/api-helpers";
import { SWAGGER_DATA } from "../mocks/swagger-mock";
import { IParsedApiSchema } from "../types/utils/interface";

describe('Schematics API', () => {
    let parsedSchema: IParsedApiSchema;
    beforeAll(() => {
      parsedSchema = transformSwaggerSchema(SWAGGER_DATA)
    });

    it('should return parsed schema', () => {
        expect(parsedSchema).toBeDefined();
        console.log(parsedSchema);
    });
});