import { TOperation, TPathOperationKey } from "../../interfaces/version_3_1/operation.interface";
import { IPath, IPathBase, ISwaggerSchema, PATH_KEYS } from "../../interfaces/version_3_1/swagger.interface";
import { getApiMethodName, getApiResponseSymbol, resolveSuccessResponse, isBinaryResponse } from "../../types/utils/api";
import { removeImportDuplicates } from "../../types/helpers/template.helper";
import { transformRequestBody } from "../../types/utils/request-body";
import { IParsedApiItem, transformOperationParams, transformParamsToApiMethodParams, extractApiMethodParamNames, buildApiMethodRequestType, formatApiUrl, formatQueryParams, formatHeaderParams, formatBody } from "../../types/utils/params";
import { IImportRef, ITransformTypeOptions, isNullable } from "../../types/utils/transform-type";
import { camelize, classify } from "@angular-devkit/core/src/utils/strings";

export interface IParsedApiSchema {
    [key: string]: IParsedSchemaItem;
}

/**
 * Represents the structure of a parsed schema item.
 */
export interface IParsedSchemaItem {
    /** 
     * The name of the schema item. 
     */
    name: string;
    
    /** 
     * An array containing parsed API items associated with this schema item.
     * @type {IParsedApiItem[]}
     */
    apiList: IParsedApiItem[];
    
    /**
     * An array containing import references associated with this schema item.
     * @type {IImportRef[]}
     */
    importRefs: IImportRef[];
}

/**
 * Builds a scoped endpoint name by prefixing with the tag name.
 * Avoids redundant prefixes (e.g., "usersGetUsers" -> "usersGetUsers" stays, but doesn't double-prefix).
 * @param apiMethodName - The base method name (e.g., "getById")
 * @param tagName - The tag/controller name (e.g., "Claim")
 * @returns The scoped name (e.g., "claimGetById")
 */
export const buildScopedApiMethodName = (apiMethodName: string, tagName: string): string => {
    const prefix = camelize(tagName.replace(/-/g, ' '));
    const suffix = classify(apiMethodName);
    
    // Avoid redundant prefix (e.g., "usersGetUsers" -> "usersGet")
    // Extract the portion of suffix that could match the prefix (same length as prefix)
    const suffixPrefix = suffix.slice(0, prefix.length);
    
    // Compare case-insensitively, then slice at the consistent position
    if (suffixPrefix.toLowerCase() === prefix.toLowerCase() && suffix.length > prefix.length) {
        return prefix + suffix.slice(prefix.length);
    }
    return prefix + suffix;
};

export const getPathOperations = (path: IPath): [TPathOperationKey, TOperation][] => {
    return Object.keys(path).map((pathKey: string) => {
        if (!PATH_KEYS.includes(pathKey as keyof IPathBase)) {
            const operationKey = pathKey as TPathOperationKey;
            const operation = path[operationKey];
            if (operation) {
                return [
                    operationKey,
                    {
                        ...operation,
                        parameters: (operation.parameters || []).map(param => ({
                            ...param,
                            // A header's name is sent on the wire, so it keeps its exact
                            // spelling; transformOperationParams camelizes its variable name
                            name: param.in === 'header' ? (param.name || '') : camelize(param.name || '')
                        }))
                    }
                ] as [TPathOperationKey, TOperation];
            }
        }
    }).filter(operation => !!operation) as [TPathOperationKey, TOperation][];
}

export type TTransformSwaggerSchemaOptions = ITransformTypeOptions & {
    /** Path prefix that selects (and is stripped from) API paths. Default: '/api/'. */
    apiPathKey?: string;
    /** Don't log skipped paths and groups (the change summary re-parses documents the schematic already reported on). */
    silent?: boolean;
};

/** Ensures the configured prefix has both a leading and a trailing slash. */
function normalizeApiPathPrefix(prefix: string): string {
    let normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
    if (!normalized.endsWith('/')) {
        normalized += '/';
    }
    return normalized;
}

export const transformSwaggerSchema = (swaggerSchema: ISwaggerSchema, options?: TTransformSwaggerSchemaOptions): IParsedApiSchema => {
    const apiPathPrefix = normalizeApiPathPrefix(options?.apiPathKey || '/api/');

    const apiPaths = swaggerSchema.paths ?? {};
    const apiPathKeys = Object.keys(apiPaths);

    const transformedSwaggerSchema = apiPathKeys.reduce((apiParsedSchema, apiPathKey: string) => {
        if (!apiPathKey.startsWith(apiPathPrefix)) {
            if (!options?.silent) {
                console.warn(`Path ${apiPathKey} doesn't match ${apiPathPrefix} pattern. Skipping...`);
            }
            return apiParsedSchema;
        }
        const [nameSegment, ...segments]: string[] = apiPathKey.slice(apiPathPrefix.length).split('/');
        const swaggerPath: IPath = apiPaths[apiPathKey];
        const apiPrefix: string = nameSegment;
        if (!apiParsedSchema.hasOwnProperty(apiPrefix)) {
            apiParsedSchema[apiPrefix] = {
                name: apiPrefix,
                apiList: [],
                importRefs: []
            };
        }

        const apiOperations = getPathOperations(swaggerPath);

        apiParsedSchema[apiPrefix].apiList.push(...apiOperations.map((
            [operationKey, operation]
        ): IParsedApiItem => {
            const apiMethodName = getApiMethodName(operation, operationKey, apiPathKey, apiPathPrefix);
            const {
                queryParams,
                pathParams,
                headerParams,
                cookieParams,
                skippedHeaderParams,
                importRefs: paramImportRefs
            } = transformOperationParams(operation, swaggerSchema, options);

            if (!options?.silent) {
                skippedHeaderParams.forEach(headerName => {
                    console.warn(`Header parameter '${headerName}' of ${operationKey.toUpperCase()} ${apiPathKey} is skipped: ` +
                        `only letters, digits, '-' and '_' are supported in header names (and not a reserved word). ` +
                        `The generated method will not send it.`);
                });
            }

            if (paramImportRefs.length > 0) {
                apiParsedSchema[apiPrefix].importRefs.push(...paramImportRefs);
            }

            const [responseTypeSymbol, responseTypeImportRefs] = getApiResponseSymbol(operation, swaggerSchema, options);
            if (responseTypeImportRefs.length > 0) {
                apiParsedSchema[apiPrefix].importRefs.push(...responseTypeImportRefs);
            }

            const [bodyParam, bodyImportRefs] = transformRequestBody(operation, swaggerSchema, options);
            if (bodyImportRefs.length > 0) {
                apiParsedSchema[apiPrefix].importRefs.push(...bodyImportRefs);
            }

            // Build API URL, handling path params that may come from body for PUT/POST
            const apiUrl = segments.map(urlSegment => {
                const pathParamMatch = urlSegment.match(/\{(.*)}/);
                if (pathParamMatch) {
                    const paramName = camelize(pathParamMatch[1]);
                    const hasPathParam = pathParams.some(p => p.objectSymbol === paramName);
                    // For PUT/POST with body and no separate path param, use body.paramName
                    if (!hasPathParam && bodyParam && ['put', 'post'].includes(operationKey)) {
                        return `\${${bodyParam.objectSymbol}.${paramName}}`;
                    }
                    return `\${${paramName}}`;
                }
                return urlSegment;
            }).join('/');

            const isQuery = ['get', 'head'].includes(operationKey);

            // A query parameter needs stripping if its value can legitimately be absent at the
            // call site, which is broader than nullability. An OPTIONAL parameter
            // (`required: false`) is the common case: it is typically NOT nullable — schema
            // `{"type":"boolean"}` — so a nullability-only test returns false, `omitBy` is never
            // emitted, and `undefined` reaches the HTTP layer where it is stringified into the URL
            // as `?flag=undefined`. Servers reject that on model binding, so the caller sees a
            // server error for what is really a serialisation bug in generated code.
            const hasOmittableQueryParams = queryParams.some(p => {
                const param = p.originalParam;
                if (!param.required) return true;
                return param.schema ? isNullable(param.schema, swaggerSchema) : false;
            });

            return {
                apiUrl,
                apiPath: apiPathKey,
                queryParams,
                pathParams,
                headerParams,
                cookieParams,
                apiMethodName,
                scopedApiMethodName: buildScopedApiMethodName(apiMethodName, apiPrefix),
                apiMethodType: operationKey,
                apiMethodParams: transformParamsToApiMethodParams({
                    pathParams,
                    queryParams,
                    headerParams,
                    bodyParam,
                }),
                apiMethodParamNames: extractApiMethodParamNames({
                    pathParams,
                    queryParams,
                    headerParams,
                    bodyParam,
                }),
                apiMethodRequestType: buildApiMethodRequestType({
                    pathParams,
                    queryParams,
                    headerParams,
                    bodyParam,
                }),
                isQuery,
                httpMethod: operationKey.toUpperCase(),
                apiUrlFormatted: formatApiUrl(apiUrl),
                queryParamsFormatted: formatQueryParams(queryParams, hasOmittableQueryParams),
                headerParamsFormatted: formatHeaderParams(headerParams),
                bodyFormatted: formatBody(bodyParam, operationKey),
                requestMethod: operationKey,
                bodyParam,
                responseTypeSymbol,
                response: resolveSuccessResponse(operation.responses, swaggerSchema)?.response,
                // Operation metadata
                deprecated: operation.deprecated,
                summary: operation.summary,
                description: operation.description,
                operationId: operation.operationId,
                hasOmittableQueryParams,
                isBinaryResponse: isBinaryResponse(operation, swaggerSchema),
            };
        }));

        return apiParsedSchema;
    }, {} as IParsedApiSchema);

    Object.keys(transformedSwaggerSchema).forEach(apiKey => {
        const schema = transformedSwaggerSchema[apiKey];
        // A group whose paths declare no operations (e.g. only path-level
        // `parameters`, or an empty path item) would render a service with no
        // methods - drop it, so a controller whose endpoints were all removed
        // leaves no empty file behind.
        if (!schema.apiList.length) {
            if (!options?.silent) {
                console.warn(`API group '${apiKey}' has no operations. Skipping...`);
            }
            delete transformedSwaggerSchema[apiKey];
            return;
        }
        // Remove import duplicates
        schema.importRefs = removeImportDuplicates(schema.importRefs);
    });

    return transformedSwaggerSchema;
};