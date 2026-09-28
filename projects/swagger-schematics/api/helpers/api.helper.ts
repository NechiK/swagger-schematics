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
 * Whether an api run that generated no services meant to, so the stale-files rule may delete
 * the services of the previous run: the document declares operations, the API filters left
 * none of them to render, and no `includeApis` entry is a likely typo. When some APIs were
 * left to render and still no file came out, the templates are at fault, not the options.
 */
export function isEmptyApiOutputIntended(
    swaggerSchema: ISwaggerSchema,
    renderedApiCount: number,
    unmatchedIncludes: string[],
    apiPathKey?: string
): boolean {
    return renderedApiCount === 0 && !unmatchedIncludes.length && documentDeclaresOperations(swaggerSchema, apiPathKey);
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

/**
 * Literal path text as the content of a generated string: the URL is emitted in single quotes, or
 * in backticks when it interpolates params, so a backslash, `'` and `` ` `` are escaped (valid in both),
 * and so is `${`, which a template literal would otherwise interpolate (`/api/Items/it's`).
 */
function escapeUrlText(text: string): string {
    return text.replace(/[\\'`]/g, '\\$&').replace(/\$\{/g, '\\${');
}

/**
 * The declared path parameter for a `{placeholder}`: the one with its name, else the only one
 * whose name differs just in case (`{Id}` declared as `id`), which a case-sensitive lookup misses.
 */
function findPathParam<T extends { in: string; name: string }>(params: T[], placeholder: string): T | undefined {
    const pathParams = params.filter(param => param.in === 'path');
    const exact = pathParams.find(param => param.name === placeholder);
    if (exact) {
        return exact;
    }
    const byCase = pathParams.filter(param => param.name.toLowerCase() === placeholder.toLowerCase());
    return byCase.length === 1 ? byCase[0] : undefined;
}

/**
 * The operation with a required `string` path parameter for each `{placeholder}` in the path
 * that it declares none for, and those names; also the placeholders matched to a parameter
 * whose name differs only in case. OpenAPI requires every placeholder to be declared, but a
 * document that leaves one out still needs a value for it, and the generated method would
 * otherwise interpolate an undeclared variable.
 */
function withUndeclaredPathParams(operation: TOperation, segments: string[]): {
    operation: TOperation;
    undeclaredPathParams: string[];
    caseMismatches: Array<[string, string]>;
} {
    const params = (operation.parameters ?? []) as TParam[];
    const placeholders = [...new Set(segments.flatMap(segment => (segment.match(/\{[^}]+}/g) ?? []).map(match => match.slice(1, -1))))];
    const undeclaredPathParams = placeholders.filter(name => !findPathParam(params, name));
    const caseMismatches = placeholders
        .map(name => [name, findPathParam(params, name)?.name] as [string, string | undefined])
        .filter((pair): pair is [string, string] => pair[1] !== undefined && pair[1] !== pair[0]);
    if (!undeclaredPathParams.length) {
        return { operation, undeclaredPathParams, caseMismatches };
    }
    const parameters = [
        ...(operation.parameters ?? []),
        ...undeclaredPathParams.map(name => ({ name, in: 'path', required: true, schema: { type: 'string' } }))
    ] as TOperation['parameters'];
    return { operation: { ...operation, parameters }, undeclaredPathParams, caseMismatches };
}

/** Methods whose declared request body the generated code leaves out (see transformSwaggerSchema). */
const BODYLESS_METHODS = ['get', 'head', 'trace'];

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
            [operationKey, declaredOperation]
        ): IParsedApiItem => {
            const { operation: fullOperation, undeclaredPathParams, caseMismatches } = withUndeclaredPathParams(declaredOperation, segments);
            // A browser can't send a GET or HEAD body (fetch throws, XHR drops it), and a TRACE request
            // must not have one (RFC 9110); OpenAPI 3.0 says to ignore it there, 3.1 to avoid it. The
            // operation is parsed without it, so no parameter gives up the `body` variable for it either
            const bodyNotSent = BODYLESS_METHODS.includes(operationKey) && !!(fullOperation as { requestBody?: unknown }).requestBody;
            const operation = bodyNotSent ? { ...fullOperation, requestBody: undefined } : fullOperation;
            if (!options?.silent) {
                undeclaredPathParams.forEach(name => console.warn(`Path parameter '${name}' of ${operationKey.toUpperCase()} ${apiPathKey} ` +
                    "is not declared in the operation's parameters; the generated method takes it as a required string. " +
                    'Declare it in the OpenAPI document to give it its type.'));
                caseMismatches.forEach(([placeholder, name]) => console.warn(`Path parameter '{${placeholder}}' of ` +
                    `${operationKey.toUpperCase()} ${apiPathKey} is declared as '${name}'; the generated method uses '${name}' for it. ` +
                    'Parameter names are case-sensitive: use the same case in the path and the parameter.'));
            }
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

            if (bodyNotSent && !options?.silent) {
                console.warn(`Request body of ${operationKey.toUpperCase()} ${apiPathKey} is left out: ` +
                    `a browser can't send a body with ${operationKey.toUpperCase()}. The generated method will not take it.`);
            }
            const [bodyParam, bodyImportRefs] = transformRequestBody(operation, swaggerSchema, options);
            if (bodyImportRefs.length > 0) {
                apiParsedSchema[apiPrefix].importRefs.push(...bodyImportRefs);
            }

            // Build API URL, handling path params that may come from body for PUT/POST
            // Every template expression in a segment is replaced, keeping the literal text around
            // it (`{name}.{ext}`, `{id}.json`)
            // (every one has a path param: see withUndeclaredPathParams)
            const apiUrl = segments.map(urlSegment => urlSegment.split(/(\{[^}]+})/).map(part => {
                const paramName = /^\{([^}]+)}$/.exec(part)?.[1];
                if (paramName === undefined) {
                    return escapeUrlText(part);
                }
                const pathParam = findPathParam(pathParams.map(p => p.originalParam), paramName);
                const parsedPathParam = pathParams.find(p => p.originalParam === pathParam);
                return `\${${parsedPathParam?.objectSymbol ?? toParamSymbol(paramName)}}`;
            }).join('')).join('/');

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