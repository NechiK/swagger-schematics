import { TOperation, TPathOperationKey } from "../../interfaces/version_3_1/operation.interface";
import { ICookieParam, IHeaderParam, IPathParam, IQueryParam, TParam } from "../../interfaces/version_3_1/params.interface";
import { IImportRef, transformTypeWithAllImports, ITransformTypeOptions, isNullable, withNullability, isRef, getRefPropertyDefinition, isNullSchema, getMappedType, rendersNull, withNonNullableElements, getRefTargetDefinition } from "./transform-type";
import { ISwaggerSchema, TSchema } from "../../interfaces/version_3_1/swagger.interface";
import { IRequestBody } from "../../interfaces/version_3_1/request.interface";
import { IRef } from "../../interfaces/version_3_1/ref.interface";
import { IResponse } from "../../interfaces/version_3_1/response.interface";
import { camelize } from "@angular-devkit/core/src/utils/strings";
import { toStringLiteral } from "./enum";

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
     * The parameter as an object literal entry keyed by its name on the wire, for query params:
     * `page` when the variable has the same name, `'page_size': pageSize` when it doesn't.
     * Unset: `objectSymbol`.
     */
    objectEntry?: string;

    /**
     * Whether a caller may leave the argument out (`?`). Per spec, when it isn't `required`;
     * with `legacyOptionalProperties`, also when it is required but nullable.
     */
    isOptional: boolean;

    /** Whether the value can be null (the schema is nullable), so null must be left out of the request. */
    isNullable: boolean;

    /**
     * Header params only: how the value is written when `String(value)` would be wrong.
     * 'object' / 'object-exploded': OpenAPI `simple` style for an object (`role,admin,id,1` /
     * `role=admin,id=1`), including a `oneOf`/`anyOf` of objects; 'object-or-value' /
     * 'object-or-value-exploded': a `oneOf`/`anyOf` mixing objects and primitives, checked at
     * runtime; 'json': a `content: application/json` param, or an array of objects (which
     * `simple` style doesn't define); 'mixed' / 'mixed-exploded': a `oneOf`/`anyOf` where one
     * member is an array of objects, checked at runtime (an array holding an object as JSON, an
     * object as in 'object', anything else, a primitive array included, with `String()`).
     * Unset: `String(value)`, which already gives `simple` style for primitives and arrays of
     * primitives (`1,2`).
     */
    headerSerialization?: THeaderSerialization;
}

export type THeaderSerialization = 'object' | 'object-exploded' | 'object-or-value' | 'object-or-value-exploded' | 'mixed' | 'mixed-exploded' | 'json';

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
     * Whether every field of `apiMethodRequestType` is optional (no path params, no body, only
     * optional query/header params), so an RTK endpoint can be called without an argument.
     * The default RTK template then types the argument `{ ... } | void` and destructures it with `= {}`.
     */
    isApiMethodRequestOptional: boolean;

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
     * Optional ones are left out when null/undefined; values are sent as strings
     * (objects in OpenAPI `simple` style, JSON `content` params as JSON).
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

/**
 * The generated variable for a path or query parameter: its name in camelCase ('page_size' ->
 * pageSize). Unlike a header, it can't be skipped (a path param is part of the URL), so a name
 * that isn't a usable variable is adjusted instead: characters beyond letters, digits, `_` and `$`
 * are dropped (`filter[name]` -> filterName), a leading digit gets `_`, and a reserved word gets
 * `Param` (`default` -> defaultParam). The request still uses the name as declared.
 */
export function toParamSymbol(name: string): string {
    let symbol = camelize(name).replace(/[^A-Za-z0-9_$]+(.)?/g, (_match: string, next?: string) => next ? next.toUpperCase() : '');
    // Dropping a leading character can bring a capital to the front (`[Object]`, `ñame`), and a
    // variable like `Object` or `String` would shadow the global the generated method calls
    symbol = symbol.charAt(0).toLowerCase() + symbol.slice(1);
    if (!symbol) {
        symbol = 'param';
    }
    if (/^[0-9]/.test(symbol)) {
        symbol = `_${symbol}`;
    }
    return RESERVED_WORDS.has(symbol) ? `${symbol}Param` : symbol;
}

/** An object literal entry for a param: shorthand when the key is the variable, else a quoted key. */
function toObjectEntry(key: string, symbol: string): string {
    return key === symbol ? symbol : `${toObjectKey(key)}: ${symbol}`;
}

/**
 * A param name as an object literal key. `__proto__` is computed: a plain `'__proto__': value`
 * sets the object's prototype instead of adding the entry, so the param would never be sent.
 */
function toObjectKey(key: string): string {
    return key === '__proto__' ? `[${toStringLiteral(key)}]` : toStringLiteral(key);
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
    // Variable names already taken: a request body's, then the path and query parameters' (a
    // header's variable must not repeat one, or the generated method / RTK argument gets a
    // duplicate binding). Cookies generate no variable, so they reserve nothing.
    const usedSymbols = new Set<string>('requestBody' in operation && operation.requestBody ? ['body'] : []);
    // Path params first: their variables are interpolated into the URL. A name another param
    // already uses gets its location as a suffix (query `id` next to path `id` -> idQuery).
    const paramSymbols = new Map<TParam, string>();
    (['path', 'query'] as const).forEach(location => {
        (operation.parameters ?? []).filter(param => param.in === location).forEach(param => {
            const base = toParamSymbol(param.name);
            let symbol = usedSymbols.has(base) ? `${base}${location.charAt(0).toUpperCase()}${location.slice(1)}` : base;
            for (let suffix = 2; usedSymbols.has(symbol); suffix++) {
                symbol = `${base}${suffix}`;
            }
            usedSymbols.add(symbol);
            paramSymbols.set(param, symbol);
        });
    });

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

            // Params keep their wire name in originalParam (e.g. 'If-Match', 'page_size'); the
            // generated variable is its camelized form (ifMatch, pageSize)
            const symbol = headerSymbol ?? paramSymbols.get(apiParam) ?? toParamSymbol(apiParam.name);
            const isOptional = isParamOptionalBySpec(apiParam, isParamNullable, options);
            const parsedParam: IParsedParam<TParam> = {
                originalParam: apiParam,
                functionSymbol: `${symbol}${isOptional ? '?' : ''}: ${typeSymbol}`,
                interpolationSymbol: `\${${symbol}}`,
                typeSymbol,
                objectSymbol: symbol,
                objectEntry: toObjectEntry(apiParam.name, symbol),
                isOptional,
                isNullable: isParamNullable,
                ...(apiParam.in === 'header' ? { headerSerialization: getHeaderSerialization(apiParam, swagger, options) } : {}),
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
    // Query params default to {} too when all are optional and nothing required follows them
    // (a body, or a required header), so `getItems()` compiles
    const queryObject = transformParamsToObject(params.queryParams);
    const queryDefaults = !params.bodyParam && params.queryParams.every(isParamOptional) && headerParams.every(isParamOptional);
    const methodParams: string[] = [
        params.pathParams.map(param => param.functionSymbol).join(', '),
        queryObject && queryDefaults ? `${queryObject} = {}` : queryObject,
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

/** Whether a request object has fields and all of them are optional (see IParsedApiItem.isApiMethodRequestOptional). */
export function isApiMethodRequestOptional(params: {
    pathParams: IParsedParam<IPathParam>[];
    queryParams: IParsedParam<IQueryParam>[];
    headerParams?: IParsedParam<IHeaderParam>[];
    bodyParam: TParsedBodyParam | null;
}): boolean {
    const optionalFields = [...params.queryParams, ...(params.headerParams ?? [])];
    return params.pathParams.length === 0 && !params.bodyParam && optionalFields.length > 0 && optionalFields.every(isParamOptional);
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
 * Formats query params for the Angular HttpClient options object and the RTK query definition.
 * Example: "params: { status, force }" or ""
 *
 * HttpParams stringifies every value, so an optional or nullable param left
 * unset would reach the URL as `?page=undefined` / `?page=null`. When
 * hasOmittable is true, each such param is added only when it has a value:
 * "params: { status, ...(page != null ? { page } : {}) }". This drops exactly
 * what lodash `omitBy(isNil)` did (0, false, '' and arrays are kept) but keeps
 * the object's type, so it compiles under `strict` against HttpClient's
 * `params` type, which omitBy's `Dictionary<T | undefined>` result does not. RTK slices use
 * it too, so they need no lodash import, and a param named `omitBy` or `isNil` can't shadow one.
 */
export function formatQueryParams(queryParams: IParsedParam<IQueryParam>[], hasOmittable?: boolean): string {
    if (queryParams.length === 0) return '';
    const entries = queryParams.map(param => hasOmittable && canBeNullish(param)
        ? `...(${param.objectSymbol} != null ? { ${param.objectEntry ?? param.objectSymbol} } : {})`
        : param.objectEntry ?? param.objectSymbol);
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
        const value = formatHeaderValue(param.objectSymbol, param.headerSerialization);
        return canBeNullish(param)
            ? `...(${param.objectSymbol} != null ? { ${name}: ${value} } : {})`
            : `${name}: ${value}`;
    });
    return `headers: { ${entries.join(', ')} }`;
}

/** A header value as a string, per the param's serialization (see IParsedParam.headerSerialization). */
function formatHeaderValue(symbol: string, serialization?: THeaderSerialization): string {
    // Unset (null/undefined) properties are left out rather than sent as empty values
    const formatObject = (separator: string) =>
        `Object.entries(${symbol}).filter(entry => entry[1] != null).map(entry => entry.join('${separator}')).join(',')`;
    switch (serialization) {
        case 'object':
            return formatObject(',');
        case 'object-exploded':
            return formatObject('=');
        case 'object-or-value':
        case 'object-or-value-exploded':
            return `(typeof ${symbol} === 'object' && !Array.isArray(${symbol}) ? ` +
                `${formatObject(serialization === 'object-or-value' ? ',' : '=')} : String(${symbol}))`;
        case 'mixed':
        case 'mixed-exploded':
            return `(Array.isArray(${symbol}) ? (${symbol}.some((item: unknown) => typeof item === 'object' && item !== null) ? JSON.stringify(${symbol}) : String(${symbol})) : typeof ${symbol} === 'object' ? ` +
                `${formatObject(serialization === 'mixed' ? ',' : '=')} : String(${symbol}))`;
        case 'json':
            return `JSON.stringify(${symbol})`;
        default:
            return `String(${symbol})`;
    }
}

/**
 * How a header param's value must be serialized (OpenAPI: headers use `style: simple`).
 * Primitives and arrays need nothing special; objects and JSON `content` do.
 */
function getHeaderSerialization(param: IHeaderParam, swagger: ISwaggerSchema, options?: ITransformTypeOptions): THeaderSerialization | undefined {
    if (param.content) {
        const mediaType = Object.keys(param.content)[0] ?? '';
        return /[/+]json\b/i.test(mediaType) ? 'json' : undefined;
    }
    const shape = getHeaderValueShape(param.schema, swagger, options);
    switch (shape) {
        case 'object':
            return param.explode ? 'object-exploded' : 'object';
        case 'object-or-value':
            return param.explode ? 'object-or-value-exploded' : 'object-or-value';
        case 'mixed':
            return param.explode ? 'mixed-exploded' : 'mixed';
        case 'array-of-objects':
            return 'json';
        default:
            return undefined;
    }
}

type THeaderValueShape = 'object' | 'object-or-value' | 'array-of-objects' | 'mixed' | 'value';

/**
 * What a header schema's value is at runtime: an object, an array of objects, a primitive or an
 * array of primitives ('value'), or a `oneOf`/`anyOf` whose members differ: objects and values
 * ('object-or-value'), or with an array of objects among them ('mixed').
 */
function getHeaderValueShape(
    schemaOrRef: TSchema | boolean | undefined,
    swagger: ISwaggerSchema,
    options?: ITransformTypeOptions,
    seen: Set<string> = new Set()
): THeaderValueShape {
    const schema = schemaOrRef;
    if (schema && typeof schema === 'object' && isRef(schema)) {
        const { refPropertySchema, refPropertyKey } = getRefPropertyDefinition(schema.$ref, swagger);
        // typeMapping replaces the component's type (e.g. with `string`), so its schema says nothing
        // about the value; a recursive component can't be decided either
        if (getMappedType(refPropertyKey, options?.typeMapping) !== undefined || seen.has(schema.$ref)) {
            return 'value';
        }
        seen.add(schema.$ref);
        // Through a component that is only a $ref to another, too
        return getHeaderValueShape(refPropertySchema, swagger, options, seen);
    }
    if (!schema || typeof schema !== 'object') {
        return 'value';
    }
    // The schema's own keywords win: `type: object` with `oneOf` members that only list
    // `required` is still an object
    const type = (schema as { type?: unknown }).type;
    if (type === 'object'
        || (Array.isArray(type) && type.includes('object'))
        || 'properties' in schema
        || 'additionalProperties' in schema) {
        return 'object';
    }
    // `allOf` is an intersection: an object if any member is one (an `allOf` wrapping a
    // string enum `$ref`, as NSwag and Swashbuckle write it, is a string), else the shape of a
    // member that isn't a plain value (an `allOf` wrapping an array of objects, or a union)
    const allOfShapes = ((schema as { allOf?: TSchema[] }).allOf ?? [])
        .map(member => getHeaderValueShape(member, swagger, options, new Set(seen)));
    if (allOfShapes.includes('object')) {
        return 'object';
    }
    const allOfShape = allOfShapes.find(shape => shape !== 'value');
    if (allOfShape) {
        return allOfShape;
    }
    const members = [
        ...((schema as { oneOf?: TSchema[] }).oneOf ?? []),
        ...((schema as { anyOf?: TSchema[] }).anyOf ?? [])
    ].filter(member => !isNullSchema(member));
    if (members.length > 0) {
        const shapes = new Set(members.map(member => getHeaderValueShape(member, swagger, options, new Set(seen))));
        if (shapes.size === 1) {
            return [...shapes][0];
        }
        if (shapes.has('array-of-objects') || shapes.has('mixed')) {
            return 'mixed';
        }
        return shapes.has('object') || shapes.has('object-or-value') ? 'object-or-value' : 'value';
    }
    // A 2020-12 tuple (`prefixItems`) counts as an array of objects if any position holds one
    const itemSchemas = [
        ...((schema as { prefixItems?: TSchema[] }).prefixItems ?? []),
        (schema as { items?: TSchema | boolean }).items
    ];
    const hasObjectItems = itemSchemas.some(item => {
        const itemShape = getHeaderValueShape(item, swagger, options, new Set(seen));
        return itemShape !== 'value';
    });
    return hasObjectItems ? 'array-of-objects' : 'value';
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

    const [rawTypeSymbol, importRefs] = param.in === 'query'
        ? transformQueryParamType(schema, swagger, options)
        : transformTypeWithAllImports(schema, swagger, options);
    const typeSymbol = withNullability(rawTypeSymbol, schema, swagger);
    const isParamNullable = isNullable(schema, swagger) || rendersNull(typeSymbol);
    return { typeSymbol, isParamNullable, importRefs };
}

/**
 * A query param's type with its array elements' nullability left out (see withNonNullableElements).
 * A $ref to an array component with nullable items (`NullableIds: { type: array, items: { type:
 * integer, nullable: true } }`) is written out (`number[]`) instead of its alias, which is
 * `(number | null)[]` and so wouldn't compile either.
 */
function transformQueryParamType(schema: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions): [string, IImportRef[]] {
    if (isRef(schema) && !isMappedRef(schema.$ref, swagger, options)) {
        const { refPropertySchema } = getRefTargetDefinition(schema.$ref, swagger);
        if (refPropertySchema && typeof refPropertySchema === 'object') {
            const [inlineTypeSymbol, inlineImportRefs] = transformTypeWithAllImports(refPropertySchema, swagger, options);
            const nonNullableTypeSymbol = withNonNullableElements(inlineTypeSymbol);
            if (nonNullableTypeSymbol !== inlineTypeSymbol) {
                return [nonNullableTypeSymbol, inlineImportRefs];
            }
        }
    }
    const [typeSymbol, importRefs] = transformTypeWithAllImports(schema, swagger, options);
    return [withNonNullableElements(typeSymbol), importRefs];
}

/** Whether a $ref, or a component it passes through, is replaced by `typeMapping`. */
function isMappedRef(ref: string, swagger: ISwaggerSchema, options?: ITransformTypeOptions, seen: Set<string> = new Set()): boolean {
    const { refPropertySchema, refPropertyKey } = getRefPropertyDefinition(ref, swagger);
    if (getMappedType(refPropertyKey, options?.typeMapping) !== undefined) {
        return true;
    }
    seen.add(ref);
    return !!refPropertySchema && isRef(refPropertySchema) && !seen.has(refPropertySchema.$ref)
        && isMappedRef(refPropertySchema.$ref, swagger, options, seen);
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
    return param.isOptional || param.isNullable;
}

export function transformParamsToObject(params: IParsedParam<TParam>[]): string {
    if (params.length === 0) {
        return '';
    }
    return `{ ${params.map(param => `${param.objectSymbol}`).join(', ')} }: { ${params.map(param => {
        return `${param.objectSymbol}${isParamOptional(param) ? '?' : ''}: ${param.typeSymbol}`;
    }).join('; ')} }`;
}