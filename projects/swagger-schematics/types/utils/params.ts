import { TOperation, TPathOperationKey } from "../../interfaces/version_3_1/operation.interface";
import { ICookieParam, IHeaderParam, IPathParam, IQueryParam, TParam } from "../../interfaces/version_3_1/params.interface";
import { IImportRef, transformType, ITransformTypeOptions } from "./transform-type";
import { ISwaggerSchema } from "../../interfaces/version_3_1/swagger.interface";

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
}

/**
 * Represents the structure of a parsed API item.
 */
export interface IParsedApiItem {
    /** The URL of the API. */
    apiUrl: string;
    
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
     * @type {IParsedParam<any> | null}
     */
    bodyParam: IParsedParam<any> | null;
    
    /** 
     * A symbol representing the response type of this API item.
     * This could be a type symbol or identifier.
     */
    responseTypeSymbol: string;
    
    /** The response object associated with this API item. */
    response: any;
    
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
     * Body parameter name or empty object for POST/PUT without body.
     * Example: "body" or "{}" or empty string for non-body methods.
     */
    bodyFormatted: string;
}

export const transformOperationParams = (operation: TOperation, swagger: ISwaggerSchema, options?: ITransformTypeOptions): {
    queryParams: IParsedParam<IQueryParam>[];
    pathParams: IParsedParam<IPathParam>[];
    headerParams: IParsedParam<IHeaderParam>[];
    cookieParams: IParsedParam<ICookieParam>[];
    importRefs: IImportRef[];
} => {
    const queryParams: IParsedParam<IQueryParam>[] = [];
    const pathParams: IParsedParam<IPathParam>[] = [];
    const headerParams: IParsedParam<IHeaderParam>[] = [];
    const cookieParams: IParsedParam<ICookieParam>[] = [];
    const importRefs: IImportRef[] = [];

    if (operation.parameters) {
        operation.parameters.forEach(apiParam => {
            // Handle schema or content (schema takes precedence)
            let typeSymbol: string = 'any';
            let importRef: IImportRef | undefined;
            
            if (apiParam.schema) {
                [typeSymbol, importRef] = transformType(apiParam.schema, swagger, options);
            } else if (apiParam.content) {
                // If content is provided instead of schema, try to extract type from it
                const contentType = Object.keys(apiParam.content)[0];
                const content = apiParam.content[contentType as keyof typeof apiParam.content];
                if (content?.schema) {
                    [typeSymbol, importRef] = transformType(content.schema, swagger, options);
                }
            }

            if (importRef) {
                importRefs.push(importRef);
            }

            const parsedParam: IParsedParam<TParam> = {
                originalParam: apiParam,
                functionSymbol: transformParamToFunctionSymbol(apiParam, swagger, options),
                interpolationSymbol: `\${${apiParam.name}}`,
                typeSymbol,
                objectSymbol: apiParam.name,
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
        importRefs
    };
}

export function transformParamsToApiMethodParams(params: {
    pathParams: IParsedParam<IPathParam>[];
    queryParams: IParsedParam<IQueryParam>[];
    bodyParam: IParsedParam<any> | null;
}): string {
    const methodParams: string[] = [
        params.pathParams.map(param => param.functionSymbol).join(', '),
        transformParamsToObject(params.queryParams),
        params.bodyParam ? params.bodyParam.functionSymbol : ''
    ].filter(item => !!item);
    return methodParams.join(', ');
}

/**
 * Extracts just the parameter names (without types) for use in destructuring.
 * @returns Array of parameter names in order: pathParams, queryParams, bodyParam
 */
export function extractApiMethodParamNames(params: {
    pathParams: IParsedParam<IPathParam>[];
    queryParams: IParsedParam<IQueryParam>[];
    bodyParam: IParsedParam<any> | null;
}): string[] {
    const names: string[] = [
        ...params.pathParams.map(param => param.objectSymbol),
        ...params.queryParams.map(param => param.objectSymbol),
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
    bodyParam: IParsedParam<any> | null;
}): string {
    const typeParts: string[] = [];
    
    params.pathParams.forEach(p => {
        typeParts.push(`${p.objectSymbol}: ${p.typeSymbol}`);
    });
    
    params.queryParams.forEach(p => {
        typeParts.push(`${p.objectSymbol}: ${p.typeSymbol}`);
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
 * Formats query params for HTTP options object.
 * Example: "params: { status, force }" or ""
 */
export function formatQueryParams(queryParams: IParsedParam<IQueryParam>[]): string {
    if (queryParams.length === 0) return '';
    return `params: { ${queryParams.map(p => p.objectSymbol).join(', ')} }`;
}

/**
 * Formats body parameter for HTTP calls.
 * Returns body symbol for methods with body, "{}" for POST/PUT without body, "" otherwise.
 */
export function formatBody(bodyParam: IParsedParam<any> | null, methodType: string): string {
    if (bodyParam) return bodyParam.objectSymbol;
    if (['post', 'put'].includes(methodType)) return '{}';
    return '';
}

export function getApiCallParams(params: {
    queryParams: IParsedParam<IQueryParam>[];
    bodyParam: IParsedParam<any> | null;
}): string {
    return [
        ...params.queryParams.map(param => `\${${param.objectSymbol}}`),
        params.bodyParam ? `\${${params.bodyParam.objectSymbol}}` : ''
    ].join(', ');
}

export function transformParamToFunctionSymbol(param: TParam, swagger: ISwaggerSchema, options?: ITransformTypeOptions): string {
    let typeSymbol = 'any';
    
    if (param.schema) {
        [typeSymbol] = transformType(param.schema, swagger, options);
    } else if (param.content) {
        const contentType = Object.keys(param.content)[0];
        const content = param.content[contentType as keyof typeof param.content];
        if (content?.schema) {
            [typeSymbol] = transformType(content.schema, swagger, options);
        }
    }
    
    return `${param.name}${param.required ? '' : '?'}: ${typeSymbol}`;
}

export function transformParamsToObject(params: IParsedParam<TParam>[]): string {
    if (params.length === 0) {
        return '';
    }
    return `{ ${params.map(param => `${param.objectSymbol}`).join(', ')} }: { ${params.map(param => `${param.objectSymbol}: ${param.typeSymbol}`).join('; ')} }`;
}