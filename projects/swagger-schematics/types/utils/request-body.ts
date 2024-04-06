import { IRequestBody } from "../../interfaces/version_3_1/request.interface";
import { TOperationWithRequestBody } from "../../interfaces/version_3_1/operation.interface";
import { ISwaggerSchema } from "../../interfaces/version_3_1/swagger.interface";
import { IImportRef, transformType } from "./transform-type";
import { IParsedParam } from "./params";

export function transformRequestyBody(operation: TOperationWithRequestBody, swaggerData: ISwaggerSchema<string>): [IParsedParam<any> | null, IImportRef | undefined] {
    const apiRequestBody = operation.requestBody;
    let typeSymbol, importRef: IImportRef | undefined;
    let parsedRequestBodyParams: IParsedParam<any> | null = null;

    if (apiRequestBody) {
        if ('$ref' in apiRequestBody) {
            [typeSymbol, importRef] = transformType(apiRequestBody, swaggerData);
        } else {
            const typedApiRequestBody = apiRequestBody as IRequestBody;
            const applicationJSON = typedApiRequestBody.content['application/json'];
            const multipartFormData = typedApiRequestBody.content['multipart/form-data'];

            if (applicationJSON) {
                [typeSymbol, importRef] = transformType(applicationJSON.schema, swaggerData);
            } else if (multipartFormData) {
                [typeSymbol, importRef] = transformType(multipartFormData.schema, swaggerData);
            } else {
                typeSymbol = 'any';
            }
        }

        parsedRequestBodyParams = {
            originalParam: apiRequestBody,
            typeSymbol,
            functionSymbol: `body: ${typeSymbol}`,
            interpolationSymbol: `\${body}`,
            objectSymbol: 'body',
        };
    }

    return [parsedRequestBodyParams, importRef];
}