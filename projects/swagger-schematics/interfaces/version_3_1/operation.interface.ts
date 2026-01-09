import { TParam } from "./params.interface";
import { IRef } from "./ref.interface";
import { IRequestBody } from "./request.interface";
import { TResponse } from "./response.interface";
import { IServer, IExternalDocs, TCallback } from "./swagger.interface";

// Security requirement object
export interface ISecurityRequirement {
    [securitySchemeName: string]: string[];
}

export interface IOperationBase {
    // Identification
    operationId?: string;
    tags?: string[];
    
    // Documentation
    summary?: string;
    description?: string;
    externalDocs?: IExternalDocs;
    
    // Parameters and responses
    parameters?: Array<TParam>;
    responses: TResponse;
    
    // Callbacks (webhooks)
    callbacks?: Record<string, TCallback | IRef>;
    
    // Status
    deprecated?: boolean;
    
    // Security (overrides top-level security)
    security?: ISecurityRequirement[];
    
    // Servers (overrides path-level and top-level servers)
    servers?: IServer[];
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