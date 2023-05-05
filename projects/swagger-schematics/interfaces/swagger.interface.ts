import {JSONSchema7} from "json-schema";

export interface ISwaggerApiParams {
    name: string,
    in: 'path' | 'query';
    description: string;
    required: boolean;
    schema: JSONSchema7
}

export interface ISwaggerApiRequestBody {
    content: {
        "application/json": {
            schema: JSONSchema7
        }
    }
}

export interface ISwaggerApiResponse {
    description: string,
    content: {
        "text/plain"?: {
            schema: JSONSchema7
        },
        "application/json"?: {
            schema: JSONSchema7
        },
        "text/json"?: {
            schema: JSONSchema7
        }
    }
}

export interface ISwaggerApi {
    parameters: ISwaggerApiParams[],
    requestBody: ISwaggerApiRequestBody,
    responses: {
        [statusKey: string]: ISwaggerApiResponse
    }
};

export interface ISwaggerSchema {
    openapi: string;
    components: {
        schemas: {[schema: string]: JSONSchema7 & {'x-enum-varnames': string[]}}
    },
    paths: {
        [apiKey: string]: {
            [methodKey: string]: {
                parameters: ISwaggerApiParams[],
                requestBody: ISwaggerApiRequestBody,
                responses: {
                    [statusKey: string]: ISwaggerApiResponse
                }
            }
        }
    }
}
