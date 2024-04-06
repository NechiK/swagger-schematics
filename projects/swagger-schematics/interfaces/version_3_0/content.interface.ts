import { TSchema } from "./swagger.interface";

export interface IContentBase {
    schema: TSchema;
    encoding?: Record<string, any>;
}

export interface IContent {
    'text/plain'?: IContentBase;
    'application/json'?: IContentBase;
    'multipart/form-data'?: IContentBase;
}