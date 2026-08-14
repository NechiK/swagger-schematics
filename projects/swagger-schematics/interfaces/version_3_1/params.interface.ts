import { TSchema } from "./swagger.interface";
import { IContent } from "./content.interface";

// Parameter serialization styles per OpenAPI spec
export type TParamStyle = 
    | 'matrix'        // Path style parameters (RFC6570)
    | 'label'         // Label style parameters (RFC6570)
    | 'form'          // Form style parameters (default for query/cookie)
    | 'simple'        // Simple style (default for path/header)
    | 'spaceDelimited'// Space separated array values
    | 'pipeDelimited' // Pipe separated array values
    | 'deepObject';   // Nested objects using form parameters

export interface IParamBase {
    name: string;
    description?: string;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    // Schema OR content, but not both
    schema?: TSchema;
    content?: IContent;
    // Example values
    example?: unknown;
    examples?: Record<string, IExample>;
}

export interface IExample {
    summary?: string;
    description?: string;
    value?: unknown;
    externalValue?: string;
}

export interface IPathParam extends IParamBase {
    in: 'path';
    required: true;
    // Path params support: matrix, label, simple (default)
    style?: 'matrix' | 'label' | 'simple';
    explode?: boolean;
}

export interface IQueryParam extends IParamBase {
    in: 'query';
    required?: boolean;
    // Query params support: form (default), spaceDelimited, pipeDelimited, deepObject
    style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
    explode?: boolean;
    allowReserved?: boolean;
}

export interface IHeaderParam extends IParamBase {
    in: 'header';
    required?: boolean;
    // Header params support: simple (default)
    style?: 'simple';
    explode?: boolean;
}

export interface ICookieParam extends IParamBase {
    in: 'cookie';
    required?: boolean;
    // Cookie params support: form (default)
    style?: 'form';
    explode?: boolean;
}

export type TParam = IPathParam | IQueryParam | IHeaderParam | ICookieParam;

/**
 * Default styles per parameter location
 */
export const DEFAULT_PARAM_STYLES: Record<TParam['in'], TParamStyle> = {
    path: 'simple',
    query: 'form',
    header: 'simple',
    cookie: 'form'
};

/**
 * Default explode values per style
 */
export const DEFAULT_EXPLODE: Record<TParamStyle, boolean> = {
    matrix: false,
    label: false,
    form: true,
    simple: false,
    spaceDelimited: false,
    pipeDelimited: false,
    deepObject: true
};