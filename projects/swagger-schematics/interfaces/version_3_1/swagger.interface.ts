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
    title?: string;
    description?: string;
    default?: unknown;
    example?: unknown;
    /** OpenAPI 3.1 (JSON Schema): examples replaces the schema-level example keyword */
    examples?: unknown[];
    required?: string[];
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    /** boolean in OpenAPI 3.0, number in OpenAPI 3.1 (JSON Schema) */
    exclusiveMinimum?: boolean | number;
    exclusiveMaximum?: boolean | number;
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    /** OpenAPI 3.0 only - 3.1 expresses nullability via type arrays (e.g. ["string", "null"]) */
    nullable?: boolean;
    /** OpenAPI 3.1 (JSON Schema): media type of string content, e.g. application/octet-stream for binary */
    contentMediaType?: string;
    /** OpenAPI 3.1 (JSON Schema): encoding of string content, e.g. base64 */
    contentEncoding?: string;
    // Additional properties from OpenAPI spec
    readOnly?: boolean;
    writeOnly?: boolean;
    deprecated?: boolean;
    externalDocs?: IExternalDocs;
}

export interface IExternalDocs {
    url: string;
    description?: string;
}

// String formats per OpenAPI spec
export type TStringFormat = 
    | 'date' 
    | 'date-time' 
    | 'password' 
    | 'byte' 
    | 'binary'
    | 'uuid'
    | 'email'
    | 'uri'
    | 'hostname'
    | 'ipv4'
    | 'ipv6';

export interface ISchemaString extends ISchemaBase {
    type: 'string';
    format?: TStringFormat;
    enum?: string[];
    'x-enum-varnames'?: string[];
    'x-enum-descriptions'?: string[];
}

export interface ISchemaInteger extends ISchemaBase {
    type: 'integer';
    format?: 'int32' | 'int64';
    enum?: number[];
    'x-enum-varnames'?: string[];
    'x-enum-descriptions'?: string[];
}

export interface ISchemaNumber extends ISchemaBase {
    type: 'number';
    format?: 'float' | 'double';
}

export interface ISchemaBoolean extends ISchemaBase {
    type: 'boolean';
}

export interface ISchemaObject extends ISchemaBase {
    type: 'object';
    properties?: ISchemaProperties;
    additionalProperties?: boolean | TSchema;
    minProperties?: number;
    maxProperties?: number;
}

export interface ISchemaArray extends ISchemaBase {
    type: 'array';
    items: TSchema;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
}

// Schema Composition (allOf, oneOf, anyOf, not)
export interface ISchemaAllOf extends ISchemaBase {
    allOf: TSchema[];
}

export interface ISchemaOneOf extends ISchemaBase {
    oneOf: TSchema[];
    discriminator?: IDiscriminator;
}

export interface ISchemaAnyOf extends ISchemaBase {
    anyOf: TSchema[];
    discriminator?: IDiscriminator;
}

export interface ISchemaNot extends ISchemaBase {
    not: TSchema;
}

export interface IDiscriminator {
    propertyName: string;
    mapping?: Record<string, string>;
}

export type TSchemaComposition = ISchemaAllOf | ISchemaOneOf | ISchemaAnyOf | ISchemaNot;

// Backward compatibility alias
export type ISchemaOther = ISchemaNumber | ISchemaBoolean;

export type TSchemaByType = 
    | ISchemaString 
    | ISchemaInteger 
    | ISchemaNumber
    | ISchemaBoolean
    | ISchemaObject 
    | ISchemaArray 
    | TSchemaComposition;

// Type with explicit type property (non-composition schemas)
export type TSchemaWithType = 
    | ISchemaString 
    | ISchemaInteger 
    | ISchemaNumber
    | ISchemaBoolean
    | ISchemaObject 
    | ISchemaArray;

export interface ISchemaProperties {
    [propertyName: string]: TSchema;
}

export type TSchema = TSchemaByType | IRef;

import { IHeader, ILink, IResponse } from "./response.interface";
// Re-exported for backward compatibility - these were previously (divergent)
// duplicate declarations in this file; response.interface.ts owns the single
// spec-correct versions now.
export { IHeader, ILink };
import { IRequestBody } from "./request.interface";
import { IExample } from "./params.interface";

// Security Scheme types per OpenAPI spec
export interface ISecuritySchemeApiKey {
    type: 'apiKey';
    name: string;
    in: 'query' | 'header' | 'cookie';
    description?: string;
}

export interface ISecuritySchemeHttp {
    type: 'http';
    scheme: string;
    bearerFormat?: string;
    description?: string;
}

export interface ISecuritySchemeOAuth2 {
    type: 'oauth2';
    flows: IOAuthFlows;
    description?: string;
}

export interface ISecuritySchemeOpenIdConnect {
    type: 'openIdConnect';
    openIdConnectUrl: string;
    description?: string;
}

export type TSecurityScheme = 
    | ISecuritySchemeApiKey 
    | ISecuritySchemeHttp 
    | ISecuritySchemeOAuth2 
    | ISecuritySchemeOpenIdConnect;

export interface IOAuthFlows {
    implicit?: IOAuthFlow;
    password?: IOAuthFlow;
    clientCredentials?: IOAuthFlow;
    authorizationCode?: IOAuthFlow;
}

export interface IOAuthFlow {
    authorizationUrl?: string;
    tokenUrl?: string;
    refreshUrl?: string;
    scopes: Record<string, string>;
}

// Callback object for webhooks
export type TCallback = Record<string, IPath>;

// Components object with all reusable components
export interface IComponents {
    schemas?: Record<string, TSchema>;
    responses?: Record<string, IResponse>;
    parameters?: Record<string, TParam>;
    examples?: Record<string, IExample>;
    requestBodies?: Record<string, IRequestBody>;
    headers?: Record<string, IHeader>;
    securitySchemes?: Record<string, TSecurityScheme>;
    links?: Record<string, ILink>;
    callbacks?: Record<string, TCallback>;
}

export interface ISwaggerSchema<PathKey extends string = string> {
    openapi: string;
    info: IInfo;
    components: IComponents;
    paths: Record<PathKey, IPath>;
    servers: IServer[];
    // Optional top-level security
    security?: Record<string, string[]>[];
    // Tags for grouping operations
    tags?: ITag[];
    // External documentation
    externalDocs?: IExternalDocs;
}

export interface ITag {
    name: string;
    description?: string;
    externalDocs?: IExternalDocs;
}
