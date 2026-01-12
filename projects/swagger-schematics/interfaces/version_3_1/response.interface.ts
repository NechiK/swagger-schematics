import { THttpStatusCode } from '../http-status-code.enum';
import { IContent } from './content.interface';
import { TSchema } from './swagger.interface';
import { IRef } from './ref.interface';

export interface IHeader {
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    style?: 'simple';
    explode?: boolean;
    schema?: TSchema;
    example?: any;
    examples?: Record<string, any>;
    content?: IContent;
}

export interface ILink {
    operationRef?: string;
    operationId?: string;
    parameters?: Record<string, any>;
    requestBody?: any;
    description?: string;
    server?: { url: string; description?: string };
}

export interface IResponse {
    description: string;
    headers?: Record<string, IHeader | IRef>;
    content?: IContent;
    links?: Record<string, ILink | IRef>;
}

// Response keys can be HTTP status codes, 'default', or wildcard patterns like '2XX', '4XX', '5XX'
export type TResponseKey = THttpStatusCode | 'default' | '1XX' | '2XX' | '3XX' | '4XX' | '5XX';

export type TResponse = {
    [key in TResponseKey]?: IResponse;
} & {
    // Allow string keys for flexibility
    [key: string]: IResponse | undefined;
};
