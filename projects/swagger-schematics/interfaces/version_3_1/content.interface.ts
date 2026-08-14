import { IHeader, TSchema } from "./swagger.interface";
import { IRef } from "./ref.interface";

export interface IEncoding {
    contentType?: string;
    headers?: Record<string, IHeader | IRef>;
    style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
    explode?: boolean;
    allowReserved?: boolean;
}

export interface IMediaType {
    schema?: TSchema;
    example?: unknown;
    examples?: Record<string, IMediaTypeExample>;
    encoding?: Record<string, IEncoding>;
}

export interface IMediaTypeExample {
    summary?: string;
    description?: string;
    value?: unknown;
    externalValue?: string;
}

// IContentBase is kept for backward compatibility
export type IContentBase = IMediaType;

// Known content types
export type TKnownContentType = 
    | 'text/plain'
    | 'text/html'
    | 'text/xml'
    | 'application/json'
    | 'application/json-patch+json'
    | 'application/xml'
    | 'application/x-www-form-urlencoded'
    | 'multipart/form-data'
    | 'application/octet-stream'
    | 'application/pdf'
    | '*/*';

// IContent uses Record to allow any media type string
export type IContent = {
    [K in TKnownContentType]?: IMediaType;
} & Record<string, IMediaType | undefined>;