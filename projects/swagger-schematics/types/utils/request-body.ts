import { IRequestBody } from "../../interfaces/version_3_1/request.interface";
import { TOperationWithRequestBody } from "../../interfaces/version_3_1/operation.interface";
import { ISwaggerSchema } from "../../interfaces/version_3_1/swagger.interface";
import { IImportRef, transformType, ITransformTypeOptions } from "./transform-type";
import { IParsedParam } from "./params";
import { IContent, IMediaType, TKnownContentType } from "../../interfaces/version_3_1/content.interface";

// Priority order for content types when determining request body type
const CONTENT_TYPE_PRIORITY: TKnownContentType[] = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
    'application/xml',
    'text/xml',
    '*/*'
];

export function transformRequestBody(operation: TOperationWithRequestBody, swaggerData: ISwaggerSchema<string>, options?: ITransformTypeOptions): [IParsedParam<any> | null, IImportRef | undefined] {
    const apiRequestBody = operation.requestBody;
    let typeSymbol: string | undefined;
    let importRef: IImportRef | undefined;
    let parsedRequestBodyParams: IParsedParam<any> | null = null;

    if (apiRequestBody) {
        if ('$ref' in apiRequestBody) {
            [typeSymbol, importRef] = transformType(apiRequestBody, swaggerData, options);
        } else {
            const typedApiRequestBody = apiRequestBody as IRequestBody;
            const content = typedApiRequestBody.content;
            
            // Try content types in priority order
            const mediaType = findMediaType(content);
            
            if (mediaType?.schema) {
                [typeSymbol, importRef] = transformType(mediaType.schema, swaggerData, options);
            } else {
                typeSymbol = 'any';
            }
        }

        parsedRequestBodyParams = {
            originalParam: apiRequestBody,
            typeSymbol: typeSymbol || 'any',
            functionSymbol: `body: ${typeSymbol || 'any'}`,
            interpolationSymbol: `\${body}`,
            objectSymbol: 'body',
        };
    }

    return [parsedRequestBodyParams, importRef];
}

/**
 * Find the first available media type from the content object
 */
function findMediaType(content: IContent): IMediaType | undefined {
    // Try priority order first
    for (const contentType of CONTENT_TYPE_PRIORITY) {
        if (content[contentType]) {
            return content[contentType];
        }
    }
    
    // Fallback to first available content type
    const contentTypes = Object.keys(content);
    if (contentTypes.length > 0) {
        return content[contentTypes[0]];
    }
    
    return undefined;
}

/**
 * Get the content type from a request body
 */
export function getRequestBodyContentType(requestBody: IRequestBody): string {
    const content = requestBody.content;
    
    for (const contentType of CONTENT_TYPE_PRIORITY) {
        if (content[contentType]) {
            return contentType as string;
        }
    }
    
    const contentTypes = Object.keys(content);
    return contentTypes.length > 0 ? contentTypes[0] : 'application/json';
}