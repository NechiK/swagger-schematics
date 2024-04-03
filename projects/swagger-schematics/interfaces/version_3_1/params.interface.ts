import { TSchemaByType } from "./swagger.interface";

export interface IParamBase {
    name: string;
    description?: string;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    schema: TSchemaByType;
}

export interface IPathParam extends IParamBase {
    in: 'path';
    required: true;
}

export interface IQueryParam extends IParamBase {
    in: 'query';
    required?: boolean;
}

export interface IHeaderParam extends IParamBase {
    in: 'header';
    required?: boolean;
}

export interface ICookieParam extends IParamBase {
    in: 'cookie';
    required?: boolean;
}

export type TParam = IPathParam | IQueryParam | IHeaderParam | ICookieParam;