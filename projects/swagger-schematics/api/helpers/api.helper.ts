import { OPERATION_KEYS, TOperation, TPathOperationKey } from "../../interfaces/version_3_1/operation.interface";
import { IPath, ISwaggerSchema } from "../../interfaces/version_3_1/swagger.interface";
import { TParam } from "../../interfaces/version_3_1/params.interface";
import { IRef } from "../../interfaces/version_3_1/ref.interface";
import { getApiMethodName, getApiResponseSymbol, resolveSuccessResponse, isBinaryResponse } from "../../types/utils/api";
import { removeImportDuplicates } from "../../types/helpers/template.helper";
import { transformRequestBody } from "../../types/utils/request-body";
import { IParsedApiItem, toParamSymbol, transformOperationParams, transformParamsToApiMethodParams, extractApiMethodParamNames, buildApiMethodRequestType, isApiMethodRequestOptional, formatApiUrl, formatQueryParams, formatHeaderParams, formatBody } from "../../types/utils/params";
import { IImportRef, ITransformTypeOptions } from "../../types/utils/transform-type";
import { camelize, classify } from "@angular-devkit/core/src/utils/strings";
import { toEnumMemberName } from "../../types/utils/enum";

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

/**
 * A `$ref` fragment is a URI-encoded JSON Pointer: `%xx` escapes, then `~1` for
 * `/` and `~0` for `~` (in that order), so `Foo~1Bar` names the key `Foo/Bar`.
 */
function decodePointerToken(token: string): string {
    let decoded = token;
    try {
        decoded = decodeURIComponent(token);
    } catch {
        // Not valid percent-encoding: use the token as written
    }
    return decoded.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * Resolves a local `$ref` (`#/components/parameters/Name`, or any other JSON Pointer into the
 * document such as `#/paths/~1api~1Orders/parameters/0`), following a reference to a reference.
 * Returns undefined for a reference that can't be resolved: external, dangling or circular.
 */
function resolveParamRef(ref: string, swagger: ISwaggerSchema, seen: Set<string> = new Set()): TParam | undefined {
    if (!ref.startsWith('#/') || seen.has(ref)) {
        return undefined;
    }
    seen.add(ref);
    const target = ref.slice(2).split('/').reduce<unknown>((node, token) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[decodePointerToken(token)] : undefined, swagger);
    if (!target || typeof target !== 'object') {
        return undefined;
    }
    if ('$ref' in target && typeof (target as IRef).$ref === 'string') {
        return resolveParamRef((target as IRef).$ref, swagger, seen);
    }
    return target as TParam;
}

/**
 * Resolves `$ref` parameters against the document; an inline parameter passes through. A
 * reference that can't be resolved (or no document to resolve it in) is dropped, as unusable,
 * and reported through `onUnresolved`.
 */
function resolveParams(params: Array<TParam | IRef>, swagger?: ISwaggerSchema, onUnresolved?: (ref: string) => void): TParam[] {
    return params.flatMap(param => {
        if (!('$ref' in param)) {
            return [param];
        }
        const resolved = swagger ? resolveParamRef(param.$ref, swagger) : undefined;
        if (!resolved) {
            onUnresolved?.(param.$ref);
        }
        return resolved ? [resolved] : [];
    });
}

/**
 * Whether two parameters are the same one for override purposes: same location and name.
 * HTTP header names are case-insensitive, so `X-Tenant` and `x-tenant` are the same header.
 */
function isSameParam(a: TParam, b: TParam): boolean {
    if (a.in !== b.in) {
        return false;
    }
    return a.in === 'header' ? (a.name ?? '').toLowerCase() === (b.name ?? '').toLowerCase() : a.name === b.name;
}

/**
 * @param onUnresolvedParam - called with each parameter `$ref` that can't be resolved, and the
 * operation it belongs to (undefined for a path-level parameter)
 */
export const getPathOperations = (
    path: IPath,
    swagger?: ISwaggerSchema,
    onUnresolvedParam?: (ref: string, operationKey?: TPathOperationKey) => void
): [TPathOperationKey, TOperation][] => {
    // Parameters on the path item apply to every operation under it; an operation's own
    // parameter with the same name and location overrides it (OpenAPI spec). Both levels
    // may use $ref.
    const pathLevelParams = resolveParams(path.parameters ?? [], swagger, ref => onUnresolvedParam?.(ref));

    return Object.keys(path).map((pathKey: string) => {
        // Only HTTP methods are operations; other keys are path-item fields (summary,
        // parameters, ...) or specification extensions (x-controller)
        if (OPERATION_KEYS.includes(pathKey as TPathOperationKey)) {
            const operationKey = pathKey as TPathOperationKey;
            const operation = path[operationKey];
            if (operation) {
                const ownParams = resolveParams((operation.parameters || []) as Array<TParam | IRef>, swagger,
                    ref => onUnresolvedParam?.(ref, operationKey));
                const inheritedParams = pathLevelParams.filter(pathParam => !ownParams.some(own => isSameParam(own, pathParam)));
                return [
                    operationKey,
                    {
                        ...operation,
                        // Names stay as declared: they are sent on the wire (query string, headers);
                        // transformOperationParams derives the variable names
                        parameters: [...inheritedParams, ...ownParams].map(param => ({ ...param, name: param.name || '' }))
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
    /** Generate only these APIs (controller names, `*` wildcard, case-insensitive). Empty or unset: all. */
    includeApis?: string[];
    /** Skip these APIs (same matching as includeApis). */
    excludeApis?: string[];
    /** Skip operations marked `deprecated`. */
    excludeDeprecated?: boolean;
};

/**
 * Whether an API (the controller segment of the path, e.g. 'Orders' or
 * 'replacement-queue') matches a filter pattern: case-insensitive, `*` matches
 * anything, and the classified name counts too ('ReplacementQueue').
 */
export function matchesApiName(apiKey: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i');
    return regex.test(apiKey) || regex.test(classify(apiKey));
}

/**
 * Whether the document declares any operation under the API path prefix,
 * before filtering. Tells "the filters left nothing to generate" (intended:
 * stale services should go) from "the document is empty or wrong" (keep them).
 */
export function documentDeclaresOperations(swaggerSchema: ISwaggerSchema, apiPathKey?: string): boolean {
    const apiPathPrefix = normalizeApiPathPrefix(apiPathKey || '/api/');
    return Object.entries(swaggerSchema.paths ?? {})
        .some(([pathKey, pathItem]) => pathKey.startsWith(apiPathPrefix) && getPathOperations(pathItem as IPath, swaggerSchema).length > 0);
}

/**
 * The `includeApis` entries that match no API in the document (before filtering), e.g. a
 * misspelled controller name. When the include filter then leaves nothing to generate,
 * that is more likely a typo than a choice, so the stale-files safety net keeps the services.
 */
export function findUnmatchedIncludePatterns(swaggerSchema: ISwaggerSchema, includeApis?: string[], apiPathKey?: string): string[] {
    const apiPathPrefix = normalizeApiPathPrefix(apiPathKey || '/api/');
    const apiKeys = Object.keys(swaggerSchema.paths ?? {})
        .filter(pathKey => pathKey.startsWith(apiPathPrefix))
        .map(pathKey => pathKey.slice(apiPathPrefix.length).split('/')[0]);
    return (includeApis ?? []).filter(pattern => !apiKeys.some(apiKey => matchesApiName(apiKey, pattern)));
}

function isApiIncluded(apiKey: string, options?: TTransformSwaggerSchemaOptions): boolean {
    const included = !options?.includeApis?.length || options.includeApis.some(pattern => matchesApiName(apiKey, pattern));
    return included && !(options?.excludeApis ?? []).some(pattern => matchesApiName(apiKey, pattern));
}

/**
 * The RTK cache tag (a `TApiTag` member name) of each API slice, in order. Names are the
 * classified API name (`replacement-queue` -> `ReplacementQueue`); names that would collide
 * (`v1.0` and `v10` are both `V10`) or have no usable characters get a numeric suffix
 * (`V10_2`), so every slice keeps a tag of its own and the enum compiles.
 */
export function buildCacheTags(apiKeys: string[]): Map<string, string> {
    const tags = new Map<string, string>();
    const used = new Set<string>();
    apiKeys.forEach((apiKey, index) => {
        const base = toEnumMemberName(classify(apiKey), index);
        let tag = base;
        for (let suffix = 2; used.has(tag); suffix++) {
            tag = `${base}_${suffix}`;
        }
        used.add(tag);
        tags.set(apiKey, tag);
    });
    return tags;
}

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
    // Every API in the document before filtering, to report filter patterns that match nothing
    const allApiKeys = new Set<string>();
    // APIs whose paths declare operations at all, to tell "empty in the document" from "all filtered out"
    const declaresOperations = new Set<string>();

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
        allApiKeys.add(apiPrefix);
        if (!isApiIncluded(apiPrefix, options)) {
            return apiParsedSchema;
        }
        if (!apiParsedSchema.hasOwnProperty(apiPrefix)) {
            apiParsedSchema[apiPrefix] = {
                name: apiPrefix,
                apiList: [],
                importRefs: []
            };
        }

        const declaredOperations = getPathOperations(swaggerPath, swaggerSchema, (ref, operationKey) => {
            if (!options?.silent) {
                const owner = operationKey ? `${operationKey.toUpperCase()} ${apiPathKey}` : `path ${apiPathKey}`;
                console.warn(`Parameter reference '${ref}' of ${owner} can't be resolved and is skipped. ` +
                    'The generated method will not take it.');
            }
        });
        if (declaredOperations.length) {
            declaresOperations.add(apiPrefix);
        }
        const apiOperations = options?.excludeDeprecated
            ? declaredOperations.filter(([, operation]) => !operation.deprecated)
            : declaredOperations;

        apiParsedSchema[apiPrefix].apiList.push(...apiOperations.map((
            [operationKey, operation]
        ): IParsedApiItem => {
            const apiMethodName = getApiMethodName(operation, operationKey, apiPathKey, apiPathPrefix, { silent: options?.silent });
            const {
                queryParams,
                pathParams,
                headerParams,
                cookieParams,
                skippedHeaderParams,
                importRefs: paramImportRefs
            } = transformOperationParams(operation, swaggerSchema, options);

            if (!options?.silent) {
                skippedHeaderParams.forEach(({ name, reason }) => {
                    console.warn(`Header parameter '${name}' of ${operationKey.toUpperCase()} ${apiPathKey} is skipped: ` +
                        `${reason}. The generated method will not send it.`);
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
                    const pathParam = pathParams.find(p => p.originalParam.name === pathParamMatch[1]);
                    // For PUT/POST with body and no separate path param, use body.paramName
                    if (!pathParam && bodyParam && ['put', 'post'].includes(operationKey)) {
                        return `\${${bodyParam.objectSymbol}.${camelize(pathParamMatch[1])}}`;
                    }
                    return `\${${pathParam?.objectSymbol ?? toParamSymbol(pathParamMatch[1])}}`;
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
            const hasOmittableQueryParams = queryParams.some(p => p.isOptional || p.isNullable);

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
                isApiMethodRequestOptional: isApiMethodRequestOptional({
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
            // Emptied by excludeDeprecated is intended, not worth a warning
            if (!options?.silent && !declaresOperations.has(apiKey)) {
                console.warn(`API group '${apiKey}' has no operations. Skipping...`);
            }
            delete transformedSwaggerSchema[apiKey];
            return;
        }
        // Remove import duplicates
        schema.importRefs = removeImportDuplicates(schema.importRefs);
    });

    if (!options?.silent) {
        (['includeApis', 'excludeApis'] as const).forEach(optionName => {
            (options?.[optionName] ?? [])
                .filter(pattern => !Array.from(allApiKeys).some(apiKey => matchesApiName(apiKey, pattern)))
                .forEach(pattern => console.warn(`${optionName} entry '${pattern}' matches no API in the document.`));
        });
    }

    return transformedSwaggerSchema;
};