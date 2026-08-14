import {ISwaggerSchema} from '../../interfaces/version_3_1/swagger.interface';
import {camelize, capitalize} from '@angular-devkit/core/src/utils/strings';
import { TOperation, TPathOperationKey } from '../../interfaces/version_3_1/operation.interface';
import { THttpStatusCode } from '../../interfaces/http-status-code.enum';
import { TTypeWithImports, transformTypeWithAllImports, ITransformTypeOptions, isBinarySchema, getRefPropertyDefinition } from './transform-type';
import { IResponse, TResponse } from '../../interfaces/version_3_1/response.interface';
import { IRef } from '../../interfaces/version_3_1/ref.interface';
import { findMediaType } from './request-body';

/**
 * Gets the method name for an API operation
 * Priority: operationId -> path-based generation
 */
export function getApiMethodName(apiMethod: TOperation, apiMethodKey: TPathOperationKey, apiPathKey: string, apiPathPrefix: string = '/api/'): string {
    // Prefer operationId if available (per OpenAPI spec recommendation)
    if (apiMethod.operationId) {
        return camelize(apiMethod.operationId);
    }

    // Strip the configured prefix once so the pattern matching below works
    // for any apiPathKey, not just the default /api/
    const relativePath = apiPathKey.startsWith(apiPathPrefix)
        ? apiPathKey.slice(apiPathPrefix.length)
        : apiPathKey.replace(/^\//, '');

    // Fall back to path-based name generation
    let parsedMethodName = '';
    switch (apiMethodKey) {
        case 'get':
            parsedMethodName = parseGetRequestName(apiMethod, apiMethodKey, relativePath);
            break;
        case 'post':
            parsedMethodName = parsePostRequestName(apiMethod, apiMethodKey, relativePath);
            break;
        case 'put':
            parsedMethodName = parsePutRequestName(apiMethod, apiMethodKey, relativePath);
            break;
        case 'delete':
            parsedMethodName = parseDeleteRequestName(apiMethod, apiMethodKey, relativePath);
            break;
        default:
            parsedMethodName = parseUnrecognizedApiPathPatterns(apiMethodKey, relativePath);
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
    const resolved = resolveSuccessResponse(apiMethod.responses, swaggerData);
    if (!resolved || resolved.key === THttpStatusCode.NoContent) {
        // No success response, or 204 No Content
        return ['void', []];
    }
    return extractResponseType(resolved.response, swaggerData, options) ?? ['void', []];
}

/**
 * Extracts the type from a response object using the shared media-type
 * priority (with first-available fallback), so any declared media type
 * produces a type instead of silently degrading to void.
 */
function extractResponseType(response: IResponse, swaggerData: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImports | null {
    const content = response.content;
    if (!content || Object.keys(content).length === 0) {
        return null;
    }

    const mediaType = findMediaType(content);
    if (mediaType?.schema) {
        return transformTypeWithAllImports(mediaType.schema, swaggerData, options);
    }

    // OpenAPI 3.1 binary responses: application/octet-stream without a schema
    // (3.1 allows omitting the schema entirely for raw binary)
    if (content['application/octet-stream']) {
        return ['Blob', []];
    }

    return null;
}

// Priority order for success responses
const SUCCESS_RESPONSE_KEYS = [
    THttpStatusCode.OK,        // 200
    THttpStatusCode.Created,   // 201
    THttpStatusCode.Accepted,  // 202
    THttpStatusCode.NoContent, // 204
    '2XX',
    'default'
] as const;

export interface IResolvedResponse {
    /** The responses-map key the response was chosen from (e.g. '200', '2XX'). */
    key: string;
    /** The chosen response, with a response-level $ref already resolved. */
    response: IResponse;
}

/**
 * Resolves a response-map value that may be a Reference Object
 * (e.g. { $ref: '#/components/responses/Ok' }) to the response it points at.
 */
function resolveResponseRef(response: IResponse | IRef, swagger: ISwaggerSchema): IResponse | undefined {
    if (!('$ref' in response)) {
        return response;
    }
    const { refPropertySchema } = getRefPropertyDefinition(response.$ref, swagger);
    return refPropertySchema as unknown as IResponse | undefined;
}

/**
 * Chooses THE success response for an operation - the single source both the
 * response type and the binary check derive from, so they can never disagree.
 *
 * Priority: 200 -> 201 -> 202 -> 204 -> 2XX -> default. Among those, the
 * first content-bearing response wins (a bodyless 200 next to a 201 with
 * content yields the 201); 204 always terminates the walk as No Content;
 * with no content-bearing candidate the first existing response is returned.
 */
export function resolveSuccessResponse(responses: TResponse, swagger: ISwaggerSchema): IResolvedResponse | undefined {
    const candidates: IResolvedResponse[] = [];
    for (const key of SUCCESS_RESPONSE_KEYS) {
        const raw = responses[key];
        if (!raw) {
            continue;
        }
        const response = resolveResponseRef(raw, swagger);
        if (response) {
            candidates.push({ key, response });
        }
    }

    for (const candidate of candidates) {
        if (candidate.key === THttpStatusCode.NoContent) {
            return candidate;
        }
        if (candidate.response.content && Object.keys(candidate.response.content).length > 0) {
            return candidate;
        }
    }
    return candidates[0];
}

/**
 * Gets the raw success response object from responses (no $ref resolution).
 * Priority: 200 -> 201 -> 202 -> 204 -> 2XX -> default.
 * Prefer resolveSuccessResponse, which resolves $refs and applies the same
 * content-bearing preference the generated response type uses.
 */
export function getSuccessResponse(responses: TResponse): IResponse | IRef | undefined {
    for (const key of SUCCESS_RESPONSE_KEYS) {
        if (responses[key]) {
            return responses[key];
        }
    }
    return undefined;
}

/**
 * Checks whether the operation's success response is binary content:
 * a string schema with format: binary (3.0) or contentMediaType (3.1),
 * or an application/octet-stream response (3.1, schema optional).
 * Uses resolveSuccessResponse, so it always inspects the same response the
 * generated response type was derived from.
 */
export function isBinaryResponse(apiMethod: TOperation, swagger: ISwaggerSchema): boolean {
    const resolved = resolveSuccessResponse(apiMethod.responses, swagger);
    const content = resolved?.response.content;
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

function parseGetRequestName(apiMethod: TOperation, apiMethodKey: string, relativePath: string) {
    const getModelByParamNameMatch = /^([a-zA-Z]+)\/{(\w+)}$/.exec(relativePath); // modelName/{id}
    const getGetModelDataParamNameMatch = /^([a-zA-Z]+)\/{(\w+)}\/([a-zA-Z]+)$/.exec(relativePath); // modelName/{id}/dataName
    const getSubresourceMatch = /^([a-zA-Z]+)\/([a-zA-Z]+)$/.exec(relativePath); // modelName/subresource
    const getSubresourceByParamMatch = /^([a-zA-Z]+)\/([a-zA-Z]+)\/{(\w+)}$/.exec(relativePath); // modelName/subresource/{param}

    if (getModelByParamNameMatch) {
        const paramName = capitalize(getModelByParamNameMatch[2]);
        return `${apiMethodKey}By${paramName}`;
    } else if (getGetModelDataParamNameMatch) {
        const modelName = capitalize(getGetModelDataParamNameMatch[1]);
        const paramName = capitalize(getGetModelDataParamNameMatch[2]);
        const dataName = capitalize(getGetModelDataParamNameMatch[3]);
        return `${apiMethodKey}${dataName}By${paramName.toLowerCase().includes(modelName.toLowerCase()) ? '' : modelName}${paramName}`;
    } else if (getSubresourceByParamMatch) {
        const modelName = capitalize(getSubresourceByParamMatch[1]);
        const subresource = capitalize(getSubresourceByParamMatch[2]);
        const paramName = capitalize(getSubresourceByParamMatch[3]);
        return `${apiMethodKey}${modelName}${subresource}By${paramName}`;
    } else if (getSubresourceMatch) {
        const modelName = capitalize(getSubresourceMatch[1]);
        const subresource = capitalize(getSubresourceMatch[2]);
        return `${apiMethodKey}${modelName}${subresource}`;
    } else {
        return parseDefaultMethodName(apiMethodKey, relativePath);
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
