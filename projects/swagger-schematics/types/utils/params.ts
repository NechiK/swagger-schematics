import { TOperation, TPathOperationKey } from "../../interfaces/version_3_1/operation.interface";
import { ICookieParam, IHeaderParam, IPathParam, IQueryParam, TParam } from "../../interfaces/version_3_1/params.interface";
import { IImportRef, transformTypeWithAllImports, ITransformTypeOptions, isNullable } from "./transform-type";
import { ISwaggerSchema } from "../../interfaces/version_3_1/swagger.interface";
import { IRequestBody } from "../../interfaces/version_3_1/request.interface";
import { IRef } from "../../interfaces/version_3_1/ref.interface";
import { IResponse } from "../../interfaces/version_3_1/response.interface";

/**
 * Represents the structure of a parsed parameter.
 * @template T - The type of the original parameter. E.g., IQueryParam, IPathParam, IHeaderParam, ICookieParam
 */
export interface IParsedParam<T> {
    /** The original parameter. */
    originalParam: T;

    /** 
     * A string representation of the parameter's type.
     * Example: 'string' or 'number'
     */
    typeSymbol: string;
    
    /** 
     * A string representation of the parameter as a function symbol.
     * Examples: 'param1: string' or 'param1: number'
     */
    functionSymbol: string;
    
    /** 
     * A string representation of the parameter as an interpolation symbol.
     * Example: '${param1}'
     */
    interpolationSymbol: string;
    
    /** 
     * A string representation of the parameter as an object symbol.
     * Example: 'param1'
     */
    objectSymbol: string;

    /**
     * Whether a caller may leave the argument out (`?`). Per spec, when it isn't `required`;
     * with `legacyOptionalProperties`, also when it is required but nullable.
     */
    isOptional: boolean;
}

/**
 * A parsed request body parameter - the original is the operation's
 * requestBody, either inline or a $ref.
 */
export type TParsedBodyParam = IParsedParam<IRequestBody | IRef>;

/**
 * Represents the structure of a parsed API item.
 */
export interface IParsedApiItem {
    /** The URL of the API. */
    apiUrl: string;

    /** The operation's path exactly as written in the OpenAPI document, e.g. '/api/Users/{id}'. */
    apiPath: string;
    
    /** 
     * An array containing parsed query parameters.
     * @type {IParsedParam<IQueryParam>[]}
     */
    queryParams: IParsedParam<IQueryParam>[];
    
    /**
     * An array containing parsed path parameters.
     * @type {IParsedParam<IPathParam>[]}
     */
    pathParams: IParsedParam<IPathParam>[];
    
    /**
     * An array containing parsed header parameters.
     * @type {IParsedParam<IHeaderParam>[]}
     */
    headerParams: IParsedParam<IHeaderParam>[];
    
    /**
     * An array containing parsed cookie parameters.
     * @type {IParsedParam<ICookieParam>[]}
     */
    cookieParams: IParsedParam<ICookieParam>[];
    
    /** Generated name of the API method based on apiUrl or operationId */
    apiMethodName: string;

    /**
     * Scoped API method name prefixed with the tag name.
     * Useful for RTK Query to avoid naming collisions across APIs.
     * Example: "claimGetById" for tag "Claim" and method "getById"
     */
    scopedApiMethodName: string;
    
    /** 
     * The type of HTTP method used by this API. 
     * This could be 'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
     */
    apiMethodType: TPathOperationKey;
    
    /** 
     * A string representation of the parameters passed to the API method.
     * This could be a serialized form of parameters.
     * Example: "id: number, body: IRequest"
     */
    apiMethodParams: string;

    /**
     * Array of parameter names without type annotations.
     * Useful for destructuring in templates.
     * Example: ["id", "body"]
     */
    apiMethodParamNames: string[];
    
    /** The HTTP request method (e.g., GET, POST, PUT, DELETE). */
    requestMethod: string;
    
    /**
     * The parsed body parameter associated with this API item, if any.
     * @type {TParsedBodyParam | null}
     */
    bodyParam: TParsedBodyParam | null;
    
    /** 
     * A symbol representing the response type of this API item.
     * This could be a type symbol or identifier.
     */
    responseTypeSymbol: string;
    
    /** The response object associated with this API item. */
    response: IResponse | undefined;
    
    /** 
     * Whether the operation is deprecated.
     * Used to add @deprecated JSDoc tag in generated code.
     */
    deprecated?: boolean;
    
    /**
     * The operation's summary from the OpenAPI spec.
     * Used for JSDoc comments.
     */
    summary?: string;
    
    /**
     * The operation's description from the OpenAPI spec.
     * Used for JSDoc comments.
     */
    description?: string;
    
    /**
     * The original operationId from the OpenAPI spec.
     */
    operationId?: string;

    /**
     * Combined request type for all parameters.
     * Example: "{ id: string; body: IRequest }" or "void"
     */
    apiMethodRequestType: string;

    /**
     * Whether this is a query operation (GET/HEAD) vs mutation (POST/PUT/DELETE/etc).
     */
    isQuery: boolean;

    /**
     * HTTP method in uppercase (GET, POST, PUT, DELETE, etc).
     */
    httpMethod: string;

    /**
     * URL formatted with proper quoting.
     * Uses backticks if contains interpolation, single quotes otherwise.
     * Example: "'/users'" or "\'/${id}'"
     */
    apiUrlFormatted: string;

    /**
     * Pre-formatted query params string for HTTP options.
     * Example: "params: { status, force }" or empty string if no query params.
     */
    queryParamsFormatted: string;

    /**
     * Pre-formatted header params for HTTP options, sent under their exact names.
     * Optional ones are left out when null/undefined; values are sent as strings.
     * Example: "headers: { 'If-Match': String(ifMatch) }" or empty string if none.
     */
    headerParamsFormatted: string;

    /**
     * Body parameter name or empty object for POST/PUT without body.
     * Example: "body" or "{}" or empty string for non-body methods.
     */
    bodyFormatted: string;

    /**
     * Whether any query parameter's value can legitimately be absent — because it is OPTIONAL
     * (`required: false`) or nullable. When true, params must be wrapped in
     * omitBy(params, isNil) to strip null/undefined before they reach the HTTP layer.
     *
     * Optionality matters as much as nullability, and is the more common case: an optional
     * non-nullable parameter left unset arrives as `undefined` and is stringified into the URL
     * as `?flag=undefined` rather than omitted.
     */
    hasOmittableQueryParams: boolean;

    /**
     * Whether the success response is binary content (type: string, format: binary).
     * When true, the response type is Blob: Angular calls add responseType: 'blob',
     * RTK endpoints add a responseHandler that reads the response as a blob.
     */
    isBinaryResponse: boolean;
}

/** Header parameters the OpenAPI spec says to ignore (compared lowercase). */
const IGNORED_HEADER_PARAMS = ['accept', 'content-type', 'authorization'];

const RESERVED_WORDS = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else',
    'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
    'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void',
    'while', 'with', 'yield', 'let', 'static', 'implements', 'interface', 'package', 'private', 'protected',
    'public', 'await',
    // Not keywords, but illegal as binding names in strict code (modules and classes are strict)
    'eval', 'arguments'
]);

/**
 * The generated variable for a header: its name in camelCase ('X-Tenant-Id' ->
 * xTenantId). Returns null for a name that doesn't map to a usable variable:
 * anything beyond letters, digits, '-' and '_' (valid in HTTP, but not seen in
 * real APIs), or one that turns into a reserved word. Such headers are skipped
 * with a warning rather than renamed into something nobody would expect.
 */
export function toHeaderParamSymbol(headerName: string): string | null {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(headerName)) {
        return null;
    }
    const symbol = headerName
        .split(/[-_]+/)
        .filter(Boolean)
        .map((word, index) => index === 0
            ? word.charAt(0).toLowerCase() + word.slice(1)
            : word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    return RESERVED_WORDS.has(symbol) ? null : symbol;
}

export const transformOperationParams = (operation: TOperation, swagger: ISwaggerSchema, options?: ITransformTypeOptions): {
    queryParams: IParsedParam<IQueryParam>[];
    pathParams: IParsedParam<IPathParam>[];
    headerParams: IParsedParam<IHeaderParam>[];
    cookieParams: IParsedParam<ICookieParam>[];
    /** Header parameters left out, with why: no usable variable name (see toHeaderParamSymbol) or a clash with another parameter */
    skippedHeaderParams: Array<{ name: string; reason: string }>;
    importRefs: IImportRef[];
} => {
    const queryParams: IParsedParam<IQueryParam>[] = [];
    const pathParams: IParsedParam<IPathParam>[] = [];
    const headerParams: IParsedParam<IHeaderParam>[] = [];
    const cookieParams: IParsedParam<ICookieParam>[] = [];
    const skippedHeaderParams: Array<{ name: string; reason: string }> = [];
    const importRefs: IImportRef[] = [];
    // Names the path and query parameters (and a request body) already use: a header's variable
    // must not repeat one, or the generated method / RTK argument gets a duplicate binding.
    // Cookies generate no variable, so they reserve nothing.
    const usedSymbols = new Set<string>([
        ...('requestBody' in operation && operation.requestBody ? ['body'] : []),
        ...(operation.parameters ?? []).filter(param => param.in === 'path' || param.in === 'query').map(param => param.name)
    ]);

    if (operation.parameters) {
        operation.parameters.forEach(apiParam => {
            // Per the OpenAPI spec, header parameters named Accept, Content-Type or
            // Authorization SHALL be ignored: the HTTP client and interceptors own those
            if (apiParam.in === 'header' && IGNORED_HEADER_PARAMS.includes(apiParam.name.toLowerCase())) {
                return;
            }
            const headerSymbol = apiParam.in === 'header' ? toHeaderParamSymbol(apiParam.name) : null;
            if (apiParam.in === 'header' && !headerSymbol) {
                skippedHeaderParams.push({
                    name: apiParam.name,
                    reason: `only letters, digits, '-' and '_' are supported in header names (and not a reserved word)`
                });
                return;
            }
            if (headerSymbol && usedSymbols.has(headerSymbol)) {
                skippedHeaderParams.push({
                    name: apiParam.name,
                    reason: `its variable name '${headerSymbol}' is already used by another parameter of the operation`
                });
                return;
            }
            if (headerSymbol) {
                usedSymbols.add(headerSymbol);
            }

            // Resolve the parameter's type once - typeSymbol and functionSymbol
            // derive from the same resolution, so they cannot drift
            const { typeSymbol, isParamNullable, importRefs: paramImportRefs } = resolveParamType(apiParam, swagger, options);

            importRefs.push(...paramImportRefs);

            // Headers keep their wire name in originalParam (e.g. 'If-Match'); the
            // generated variable is its camelized form (ifMatch)
            const symbol = headerSymbol ?? apiParam.name;
            const isOptional = isParamOptionalBySpec(apiParam, isParamNullable, options);
            const parsedParam: IParsedParam<TParam> = {
                originalParam: apiParam,
                functionSymbol: `${symbol}${isOptional ? '?' : ''}: ${typeSymbol}`,
                interpolationSymbol: `\${${symbol}}`,
                typeSymbol,
                objectSymbol: symbol,
                isOptional,
            };

            switch (apiParam.in) {
                case 'query':
                    queryParams.push(parsedParam as IParsedParam<IQueryParam>);
                    break;
                case 'path':
                    pathParams.push(parsedParam as IParsedParam<IPathParam>);
                    break;
                case 'header':
                    headerParams.push(parsedParam as IParsedParam<IHeaderParam>);
                    break;
                case 'cookie':
                    cookieParams.push(parsedParam as IParsedParam<ICookieParam>);
                    break;
            }
        });
    }
    return {
        queryParams,
        pathParams,
        headerParams,
        cookieParams,
        skippedHeaderParams,
        importRefs
    };
}

export function transformParamsToApiMethodParams(params: {
    pathParams: IParsedParam<IPathParam>[];
    queryParams: IParsedParam<IQueryParam>[];
    headerParams?: IParsedParam<IHeaderParam>[];
    bodyParam: TParsedBodyParam | null;
}): string {
    const headerParams = params.headerParams ?? [];
    // Headers come last, and default to {} when all are optional, so a call
    // written before the operation declared them keeps compiling
    const headersObject = transformParamsToObject(headerParams);
    const methodParams: string[] = [
        params.pathParams.map(param => param.functionSymbol).join(', '),
        transformParamsToObject(params.queryParams),
        params.bodyParam ? params.bodyParam.functionSymbol : '',
        headersObject && headerParams.every(isParamOptional) ? `${headersObject} = {}` : headersObject
    ].filter(item => !!item);
    return methodParams.join(', ');
}

/**
 * Extracts just the parameter names (without types) for use in destructuring.
 * @returns Array of parameter names in order: pathParams, queryParams, headerParams, bodyParam
 */
export function extractApiMethodParamNames(params: {
    pathParams: IParsedParam<IPathParam>[];
    queryParams: IParsedParam<IQueryParam>[];
    headerParams?: IParsedParam<IHeaderParam>[];
    bodyParam: TParsedBodyParam | null;
}): string[] {
    const names: string[] = [
        ...params.pathParams.map(param => param.objectSymbol),
        ...params.queryParams.map(param => param.objectSymbol),
        ...(params.headerParams ?? []).map(param => param.objectSymbol),
    ];
    if (params.bodyParam) {
        names.push(params.bodyParam.objectSymbol);
    }
    return names;
}

/**
 * Builds combined request type from all parameters.
 * Example: "{ id: string; body: IRequest }" or "void"
 */
export function buildApiMethodRequestType(params: {
    pathParams: IParsedParam<IPathParam>[];
    queryParams: IParsedParam<IQueryParam>[];
    headerParams?: IParsedParam<IHeaderParam>[];
    bodyParam: TParsedBodyParam | null;
}): string {
    const typeParts: string[] = [];
    
    params.pathParams.forEach(p => {
        typeParts.push(`${p.objectSymbol}: ${p.typeSymbol}`);
    });
    
    [...params.queryParams, ...(params.headerParams ?? [])].forEach(p => {
        typeParts.push(`${p.objectSymbol}${isParamOptional(p) ? '?' : ''}: ${p.typeSymbol}`);
    });
    
    if (params.bodyParam) {
        typeParts.push(`${params.bodyParam.objectSymbol}: ${params.bodyParam.typeSymbol}`);
    }
    
    if (typeParts.length === 0) {
        return 'void';
    }
    
    return `{ ${typeParts.join('; ')} }`;
}

/**
 * Formats URL with proper quoting (backticks for interpolation, single quotes otherwise).
 */
export function formatApiUrl(apiUrl: string): string {
    const hasInterpolation = apiUrl.includes('${');
    const url = apiUrl.startsWith('/') ? apiUrl : '/' + apiUrl;
    return hasInterpolation ? `\`${url}\`` : `'${url}'`;
}

/**
 * Formats query params for the Angular HttpClient options object.
 * Example: "params: { status, force }" or ""
 *
 * HttpParams stringifies every value, so an optional or nullable param left
 * unset would reach the URL as `?page=undefined` / `?page=null`. When
 * hasOmittable is true, each such param is added only when it has a value:
 * "params: { status, ...(page != null ? { page } : {}) }". This drops exactly
 * what lodash `omitBy(isNil)` did (0, false, '' and arrays are kept) but keeps
 * the object's type, so it compiles under `strict` against HttpClient's
 * `params` type, which omitBy's `Dictionary<T | undefined>` result does not.
 */
export function formatQueryParams(queryParams: IParsedParam<IQueryParam>[], hasOmittable?: boolean): string {
    if (queryParams.length === 0) return '';
    const entries = queryParams.map(param => hasOmittable && canBeNullish(param)
        ? `...(${param.objectSymbol} != null ? { ${param.objectSymbol} } : {})`
        : param.objectSymbol);
    return `params: { ${entries.join(', ')} }`;
}

/**
 * Formats header params for HTTP options, under their exact wire names.
 * Values are sent as strings (both HttpClient and fetch take string headers).
 * An optional or nullable header is added only when it has a value: HttpClient
 * throws on an undefined header value, and a null one would be sent as "null".
 * Example: "headers: { 'If-Match': String(ifMatch), ...(tenant != null ? { 'X-Tenant': String(tenant) } : {}) }"
 */
export function formatHeaderParams(headerParams: IParsedParam<IHeaderParam>[]): string {
    if (headerParams.length === 0) return '';
    const entries = headerParams.map(param => {
        // Names are letters, digits, '-' and '_' only (see toHeaderParamSymbol), so plain quotes are safe
        const name = `'${param.originalParam.name}'`;
        const value = `String(${param.objectSymbol})`;
        return canBeNullish(param)
            ? `...(${param.objectSymbol} != null ? { ${name}: ${value} } : {})`
            : `${name}: ${value}`;
    });
    return `headers: { ${entries.join(', ')} }`;
}

/**
 * Formats body parameter for HTTP calls.
 * @param bodyParam - The parsed body parameter, or null if no body
 * @param methodType - HTTP method (get, post, put, delete, etc.)
 * @returns Body symbol for methods with body, "{}" for POST/PUT/PATCH without body, 
 *          or empty string for GET/DELETE/etc. without body.
 *          Template authors: use truthy check (e.g., `if (bodyFormatted)`) to determine presence.
 */
export function formatBody(bodyParam: TParsedBodyParam | null, methodType: string): string {
    if (bodyParam) return bodyParam.objectSymbol;
    // HttpClient's post/put/patch take the body as a required argument
    if (['post', 'put', 'patch'].includes(methodType)) return '{}';
    return '';
}

export function getApiCallParams(params: {
    queryParams: IParsedParam<IQueryParam>[];
    bodyParam: TParsedBodyParam | null;
}): string {
    return [
        ...params.queryParams.map(param => `\${${param.objectSymbol}}`),
        params.bodyParam ? `\${${params.bodyParam.objectSymbol}}` : ''
    ].join(', ');
}

/**
 * Resolves a parameter's rendered type once: schema (or first content entry's
 * schema), nullability append, and import refs. The single source both
 * typeSymbol and functionSymbol derive from.
 */
function resolveParamType(param: TParam, swagger: ISwaggerSchema, options?: ITransformTypeOptions): {
    typeSymbol: string;
    isParamNullable: boolean;
    importRefs: IImportRef[];
} {
    const schema = param.schema
        ?? (param.content ? param.content[Object.keys(param.content)[0] as keyof typeof param.content]?.schema : undefined);
    if (!schema) {
        return { typeSymbol: 'any', isParamNullable: false, importRefs: [] };
    }

    const [rawTypeSymbol, importRefs] = transformTypeWithAllImports(schema, swagger, options);
    const isParamNullable = isNullable(schema, swagger);
    const typeSymbol = isParamNullable && !rawTypeSymbol.endsWith(' | null')
        ? `${rawTypeSymbol} | null`
        : rawTypeSymbol;
    return { typeSymbol, isParamNullable, importRefs };
}

export function transformParamToFunctionSymbol(param: TParam, swagger: ISwaggerSchema, options?: ITransformTypeOptions): string {
    const { typeSymbol, isParamNullable } = resolveParamType(param, swagger, options);
    const isOptional = isParamOptionalBySpec(param, isParamNullable, options);
    return `${param.name}${isOptional ? '?' : ''}: ${typeSymbol}`;
}

/**
 * Per spec, a parameter can be left out when it isn't `required`; a required nullable one must
 * still be passed (null then leaves it out of the request). `legacyOptionalProperties` restores
 * the earlier rule, which also made required nullable parameters optional.
 */
function isParamOptionalBySpec(param: TParam, isParamNullable: boolean, options?: ITransformTypeOptions): boolean {
    return !param.required || (!!options?.legacyOptionalProperties && isParamNullable);
}

function isParamOptional(param: IParsedParam<TParam>): boolean {
    return param.isOptional;
}

/** Whether the value can be null or undefined, so it must be left out of the request when it is. */
function canBeNullish(param: IParsedParam<TParam>): boolean {
    return param.isOptional || param.typeSymbol.endsWith(' | null');
}

export function transformParamsToObject(params: IParsedParam<TParam>[]): string {
    if (params.length === 0) {
        return '';
    }
    return `{ ${params.map(param => `${param.objectSymbol}`).join(', ')} }: { ${params.map(param => {
        return `${param.objectSymbol}${isParamOptional(param) ? '?' : ''}: ${param.typeSymbol}`;
    }).join('; ')} }`;
}