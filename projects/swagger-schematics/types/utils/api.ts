import {ISwaggerSchema} from '../../interfaces/version_3_1/swagger.interface';
import {camelize, capitalize} from '@angular-devkit/core/src/utils/strings';
import { TOperation, TPathOperationKey } from '../../interfaces/version_3_1/operation.interface';
import { THttpStatusCode } from '../../interfaces/http-status-code.enum';
import { TTypeWithImports, transformTypeWithAllImports, ITransformTypeOptions, isBinarySchema } from './transform-type';
import { IResponse, TResponse } from '../../interfaces/version_3_1/response.interface';

/**
 * Gets the method name for an API operation
 * Priority: operationId -> path-based generation
 */
export function getApiMethodName(apiMethod: TOperation, apiMethodKey: TPathOperationKey, apiPathKey: string): string {
    // Prefer operationId if available (per OpenAPI spec recommendation)
    if (apiMethod.operationId) {
        return camelize(apiMethod.operationId);
    }
    
    // Fall back to path-based name generation
    let parsedMethodName = '';
    switch (apiMethodKey) {
        case 'get':
            parsedMethodName = parseGetRequestName(apiMethod, apiMethodKey, apiPathKey);
            break;
        case 'post':
            parsedMethodName = parsePostRequestName(apiMethod, apiMethodKey, apiPathKey);
            break;
        case 'put':
            parsedMethodName = parsePutRequestName(apiMethod, apiMethodKey, apiPathKey);
            break;
        case 'delete':
            parsedMethodName = parseDeleteRequestName(apiMethod, apiMethodKey, apiPathKey);
            break;
        default:
            parsedMethodName = parseUnrecognizedApiPathPatterns(apiMethodKey, apiPathKey);
    }

    return camelize(parsedMethodName);
}

/**
 * Checks if an operation is marked as deprecated
 */
export function isOperationDeprecated(apiMethod: TOperation): boolean {
    return apiMethod.deprecated === true;
}

/**
 * Gets the security requirements for an operation
 */
export function getOperationSecurity(apiMethod: TOperation): Record<string, string[]>[] | undefined {
    return apiMethod.security;
}

/**
 * Gets the response type from the operation, checking multiple status codes
 * Priority: 200 -> 201 -> 202 -> 204 -> 2XX -> default
 */
export function getApiResponseSymbol(apiMethod: TOperation, swaggerData: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImports {
    const responses = apiMethod.responses;

    // Priority order for success responses
    const successCodes = [
        THttpStatusCode.OK,       // 200
        THttpStatusCode.Created,  // 201
        THttpStatusCode.Accepted, // 202
        THttpStatusCode.NoContent // 204
    ];

    // Try specific success codes first
    for (const code of successCodes) {
        const response = responses[code];
        if (response) {
            // 204 No Content should return void
            if (code === THttpStatusCode.NoContent) {
                return ['void', []];
            }
            const result = extractResponseType(response, swaggerData, options);
            if (result) return result;
        }
    }

    // Try wildcard 2XX
    const response2XX = responses['2XX'];
    if (response2XX) {
        const result = extractResponseType(response2XX, swaggerData, options);
        if (result) return result;
    }

    // Try default response
    const defaultResponse = responses['default'];
    if (defaultResponse) {
        const result = extractResponseType(defaultResponse, swaggerData, options);
        if (result) return result;
    }

    return ['void', []];
}

/**
 * Extracts the type from a response object
 */
function extractResponseType(response: IResponse, swaggerData: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImports | null {
    if (!response.content) {
        return null;
    }

    // Try application/json first, then other content types
    const contentTypes = ['application/json', 'text/plain', '*/*'];

    for (const contentType of contentTypes) {
        const content = response.content[contentType];
        if (content?.schema) {
            return transformTypeWithAllImports(content.schema, swaggerData, options);
        }
    }

    // OpenAPI 3.1 binary responses: application/octet-stream, with or without
    // a schema (3.1 allows omitting the schema entirely for raw binary)
    if (response.content['application/octet-stream']) {
        return ['Blob', []];
    }

    return null;
}

/**
 * Gets the success response object from responses
 * Priority: 200 -> 201 -> 202 -> 204 -> 2XX -> default
 */
export function getSuccessResponse(responses: TResponse): IResponse | undefined {
    // Priority order for success responses
    const successCodes = [
        THttpStatusCode.OK,       // 200
        THttpStatusCode.Created,  // 201
        THttpStatusCode.Accepted, // 202
        THttpStatusCode.NoContent // 204
    ];
    
    // Try specific success codes first
    for (const code of successCodes) {
        if (responses[code]) {
            return responses[code];
        }
    }
    
    // Try wildcard 2XX
    if (responses['2XX']) {
        return responses['2XX'];
    }

    // Try default response
    if (responses['default']) {
        return responses['default'];
    }
    
    return undefined;
}

/**
 * Checks whether the operation's success response is binary content:
 * a string schema with format: binary (3.0) or contentMediaType (3.1),
 * or an application/octet-stream response (3.1, schema optional).
 */
export function isBinaryResponse(apiMethod: TOperation): boolean {
    const response = getSuccessResponse(apiMethod.responses);
    const content = response?.content;
    if (!content) {
        return false;
    }
    if (content['application/octet-stream']) {
        return true;
    }
    return Object.values(content).some(media => isBinarySchema(media?.schema));
}

type TOperationPredictionProperties = 'summary' | 'description';

function predictByString(apiMethod: TOperation, predictString: string) {
    const predictionProperties: TOperationPredictionProperties[] = ['summary', 'description'];
    return predictionProperties.some(property => {
        return apiMethod[property]?.toLowerCase().includes(predictString.toLowerCase());
    });
}

function parseMethodName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string, predictionStrings: string[]) {
    const prediction = predictionStrings.find(predictString => predictByString(apiMethod, predictString));
    if (prediction) {
        return parseDefaultMethodName(prediction, apiPathKey);
    } else {
        return parseDefaultMethodName(apiMethodKey, apiPathKey);
    }
}

function parseGetRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    const getModelByParamNameMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey); // /api/modelName/{id}
    const getGetModelDataParamNameMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}\/([a-zA-Z]+)$/.exec(apiPathKey); // /api/modelName/{id}/dataName
    const getSubresourceMatch = /(^\/api\/)([a-zA-Z]+)\/([a-zA-Z]+)$/.exec(apiPathKey); // /api/modelName/subresource
    const getSubresourceByParamMatch = /(^\/api\/)([a-zA-Z]+)\/([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey); // /api/modelName/subresource/{param}
    
    if (getModelByParamNameMatch) {
        const paramName = capitalize(getModelByParamNameMatch[3]);
        return `${apiMethodKey}By${paramName}`;
    } else if (getGetModelDataParamNameMatch) {
        const modelName = capitalize(getGetModelDataParamNameMatch[2]);
        const paramName = capitalize(getGetModelDataParamNameMatch[3]);
        const dataName = capitalize(getGetModelDataParamNameMatch[4]);
        return `${apiMethodKey}${dataName}By${paramName.toLowerCase().includes(modelName.toLowerCase()) ? '' : modelName}${paramName}`;
    } else if (getSubresourceByParamMatch) {
        const modelName = capitalize(getSubresourceByParamMatch[2]);
        const subresource = capitalize(getSubresourceByParamMatch[3]);
        const paramName = capitalize(getSubresourceByParamMatch[4]);
        return `${apiMethodKey}${modelName}${subresource}By${paramName}`;
    } else if (getSubresourceMatch) {
        const modelName = capitalize(getSubresourceMatch[2]);
        const subresource = capitalize(getSubresourceMatch[3]);
        return `${apiMethodKey}${modelName}${subresource}`;
    } else {
        return parseDefaultMethodName(apiMethodKey, apiPathKey);
    }
}

function parsePostRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    return parseMethodName(apiMethod, apiMethodKey, apiPathKey, ['create', 'add', 'search']);
}

function parsePutRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    return parseMethodName(apiMethod, apiMethodKey, apiPathKey, ['update', 'edit']);
}

function parseDeleteRequestName(apiMethod: TOperation, apiMethodKey: string, apiPathKey: string) {
    return parseMethodName(apiMethod, apiMethodKey, apiPathKey, ['delete', 'remove']);
}

function parseUnrecognizedApiPathPatterns(apiMethodKey: string, apiPathKey: string) {
    console.warn('Unexpected API path pattern: ', apiPathKey);
    return parseDefaultMethodName(apiMethodKey, apiPathKey);
}

function parseDefaultMethodName(methodPrefix: string, apiPathKey: string) {
    const segments = apiPathKey.split('/');
    // model/submodel/{property}
    const segmentsWithParams = apiPathKey.match(/(([a-zA-Z]+\/)+{(\w+)})+/g);
    if (segmentsWithParams) {
        return [methodPrefix, ...segments.map(urlSegment => {
            const isParam = urlSegment.match(/\{(.*)}/);
            const isApi = urlSegment.match(/^api/i);
            if (isApi) {
                return '';
            } else if (isParam) {
                return camelize(`By ${isParam[1]}`);
            } else {
                return capitalize(urlSegment);
            }
        })].join(' ');
    } else {
        return [methodPrefix, ...segments
            .filter(urlSegment => !urlSegment.match(/\{.*}/) && !urlSegment.match(/^api/i))
            .map(urlSegment => capitalize(urlSegment))
        ].join(' ');
    }
}
