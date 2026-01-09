import { TOperation, TPathOperationKey } from "../../interfaces/version_3_1/operation.interface";
import { ICookieParam, IHeaderParam, IPathParam, IQueryParam, TParam } from "../../interfaces/version_3_1/params.interface";
import { IImportRef, transformType } from "./transform-type";
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
    
    /** Generated name of the API method based on apiUrl */
    apiMethodName: string;
    
    /** 
     * The type of HTTP method used by this API. 
     * This could be 'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
     */
    apiMethodType: TPathOperationKey;
    
    /** 
     * A string representation of the parameters passed to the API method.
     * This could be a serialized form of parameters.
     */
    apiMethodParams: string;
    
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
}

export const transformOperationParams = (operation: TOperation, swagger: ISwaggerSchema): {
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
            const [typeSymbol, importRef] = transformType(apiParam.schema, swagger);

            if (importRef) {
                importRefs.push(importRef);
            }

            const parsedParam: IParsedParam<TParam> = {
                originalParam: apiParam,
                functionSymbol: transformParamToFunctionSymbol(apiParam, swagger),
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

export function getApiCallParams(params: {
    queryParams: IParsedParam<IQueryParam>[];
    bodyParam: IParsedParam<any> | null;
}): string {
    return [
        ...params.queryParams.map(param => `\${${param.objectSymbol}}`),
        params.bodyParam ? `\${${params.bodyParam.objectSymbol}}` : ''
    ].join(', ');
}

export function transformParamToFunctionSymbol(param: TParam, swagger: ISwaggerSchema): string {
    const [typeSymbol] = transformType(param.schema, swagger);
    return `${param.name}${param.required ? '' : '?'}: ${typeSymbol}`;
}

export function transformParamsToObject(params: IParsedParam<TParam>[]): string {
    if (params.length === 0) {
        return '';
    }
    return `{ ${params.map(param => `${param.objectSymbol}`).join(', ')} }: { ${params.map(param => `${param.objectSymbol}: ${param.typeSymbol}`).join('; ')} }`;
}