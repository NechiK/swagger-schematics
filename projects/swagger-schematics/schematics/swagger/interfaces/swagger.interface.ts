import {JSONSchema7} from "json-schema";

export interface ISwaggerSchema {
    openapi: string;
    components: {
        schemas: {[schema: string]: JSONSchema7}
    }
}
