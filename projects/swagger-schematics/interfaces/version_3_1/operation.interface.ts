import { TParam } from "./params.interface";
import { IRef } from "./ref.interface";
import { IRequestBody } from "./request.interface";
import { TResponse } from "./response.interface";
import { IServer } from "./swagger.interface";

export interface IOperationBase {
    tags?: string[];
    summary?: string;
    description?: string;
    parameters?: Array<TParam>;
    responses: TResponse;
    callbacks?: Record<string, any>;
    deprecated?: boolean;
    servers?: IServer[];
    // TODO: Add support for security
    // security?: Record<string, string[]>;
}

export interface IPostOperation extends IOperationBase {
    requestBody: IRequestBody | IRef;
}

export interface IPutOperation extends IOperationBase {
    requestBody?: IRequestBody | IRef;
}

export interface IDeleteOperation extends IOperationBase {
    requestBody?: IRequestBody | IRef;
}

export type TOperationWithRequestBody = IPostOperation | IPutOperation | IDeleteOperation;
export type TOperation = IOperationBase | TOperationWithRequestBody;

export interface IPathOperations {
    get?: IOperationBase;
    put?: IPutOperation;
    post?: IPostOperation;
    delete?: IDeleteOperation;
    options?: IPostOperation;
    head?: IOperationBase;
    patch?: IPostOperation;
    trace?: IPostOperation;
}

export type TPathOperationKey = keyof IPathOperations;

export const OPERATION_KEYS: Array<TPathOperationKey> = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];