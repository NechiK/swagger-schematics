import { IPath, ISwaggerSchema } from '../interfaces/version_3_1/swagger.interface';
import {
    DELETE_MANY_ARRAY_OF_IDS_SWAGGER,
    GET_MODEL_BY_ID_SWAGGER, GET_SERVICE_ACTIONS_BY_ID_SWAGGER, GET_SERVICE_ACTIONS_SWAGGER,
    POST_MODEL_CHILD_BY_MODEL_ID_SWAGGER,
    POST_MODEL_FORM_DATA_SWAGGER, POST_SEARCH_ALL_SWAGGER, POST_SEARCH_IDS_SWAGGER,
    PUT_MODEL_BY_ID_SWAGGER, PUT_MODEL_WITH_EMPTY_BODY_SWAGGER, PUT_MODEL_WITH_INTEGER_BODY_SWAGGER,
    GET_WITH_QUERY_PARAMS_SWAGGER, DELETE_SINGLE_BY_ID_SWAGGER, PATCH_MODEL_BY_ID_SWAGGER,
} from './api-mocks';
import {API_GET_CHILD_OF_MODEL_BY_ID, ENUM_WITH_VAR_NAMES_SWAGGER, MODEL_WITH_REF_SWAGGER} from './interface-mocks';

export const MOCK_GROUP = 'Claim';
export type TMockApiPath = `/api/${typeof MOCK_GROUP}` | `/api/${typeof MOCK_GROUP}/${string}`;

export const SWAGGER_DATA: ISwaggerSchema<TMockApiPath> = {
    openapi: "3.0.1",
    info: {
        title: "Montage Platform API",
        description: "Documents the Montage Platform REST API",
        version: "v1"
    },
    paths: {
        "/api/Claim/{id}": {
            ...GET_MODEL_BY_ID_SWAGGER,
            ...PUT_MODEL_BY_ID_SWAGGER,
            ...DELETE_SINGLE_BY_ID_SWAGGER,
            ...PATCH_MODEL_BY_ID_SWAGGER,
        },
        ...API_GET_CHILD_OF_MODEL_BY_ID,
        "/api/Claim": {
            ...POST_MODEL_FORM_DATA_SWAGGER
        },
        "/api/Claim/{id}/note": {
            ...POST_MODEL_CHILD_BY_MODEL_ID_SWAGGER
        },
        "/api/Claim/status": {
            ...PUT_MODEL_WITH_INTEGER_BODY_SWAGGER
        },
        "/api/Claim/all": {
            ...POST_SEARCH_ALL_SWAGGER
        },
        "/api/Claim/ids": {
            ...POST_SEARCH_IDS_SWAGGER
        },
        "/api/Claim/{id}/reactivate": {
            ...PUT_MODEL_WITH_EMPTY_BODY_SWAGGER
        },
        "/api/Claim/deletemany": {
            ...DELETE_MANY_ARRAY_OF_IDS_SWAGGER
        },
        "/api/Claim/serviceactions": {
            ...GET_SERVICE_ACTIONS_SWAGGER
        },
        "/api/Claim/serviceactions/{serviceActionId}": {
            ...GET_SERVICE_ACTIONS_BY_ID_SWAGGER
        },
        "/api/Claim/list": {
            ...GET_WITH_QUERY_PARAMS_SWAGGER
        },
    },
    components: {
        schemas: {
            ...MODEL_WITH_REF_SWAGGER,
            ...ENUM_WITH_VAR_NAMES_SWAGGER
        }
    },
    servers: [{"url": "https://apidev.montagefs.com"}],
}
