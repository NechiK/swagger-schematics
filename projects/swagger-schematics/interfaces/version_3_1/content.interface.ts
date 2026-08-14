import { TSchema } from "./swagger.interface";

export interface IEncoding {
    contentType?: string;
    headers?: Record<string, any>;
    style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
    explode?: boolean;
    allowReserved?: boolean;
}

export interface IMediaType {
    schema?: TSchema;
    example?: any;
    examples?: Record<string, IMediaTypeExample>;
    encoding?: Record<string, IEncoding>;
}

export interface IMediaTypeExample {
    summary?: string;
    description?: string;
    value?: any;
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