import { IPathOperations } from "./operation.interface";
import { TParam } from "./params.interface";
import { IRef } from "./ref.interface";
import { IInfo } from "./info.interface";

export interface IPathBase {
    $ref?: string;
    summary?: string;
    description?: string;
    servers?: IServer[];
    parameters?: Array<TParam | IRef>;
}

export interface IPath extends IPathBase, IPathOperations {};

export const PATH_KEYS: Array<keyof IPathBase> = ['$ref', 'summary', 'description', 'servers', 'parameters'];

export interface IServer {
    url: string;
    description?: string;
    variables?: Record<string, IServerVariable>;
}

export interface IServerVariable {
    enum: string[];
    default: string;
    description?: string;
}

export interface ISchemaBase {
    format?: string;
    title?: string;
    description?: string;
    default?: any;
    enum?: any[];
    example?: any;
    required?: string[];
    properties?: ISchemaProperties;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    exclusiveMinimum?: boolean;
    exclusiveMaximum?: boolean;
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    nullable?: boolean;
    'x-enum-varnames'?: string[];
}

export interface ISchemaArray extends ISchemaBase {
    type: 'array';
    items: TSchema;
}

export interface ISchemaOther extends ISchemaBase {
    type: 'string' | 'number' | 'integer' | 'boolean' | 'object';
}

export type TSchemaByType = ISchemaArray | ISchemaOther;

export interface ISchemaProperties {
    [propertyName: string]: TSchema;
}

export type TSchema = TSchemaByType | IRef;

export interface ISwaggerSchema {
    openapi: string;
    info: IInfo;
    components: {
        schemas: Record<string, TSchema>;
    };
    paths: Record<string, IPath>;
    servers: IServer[];
}
