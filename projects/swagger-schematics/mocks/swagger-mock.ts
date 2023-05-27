import {
    DELETE_MANY_ARRAY_OF_IDS_SWAGGER,
    GET_MODEL_BY_ID_SWAGGER,
    POST_MODEL_CHILD_BY_MODEL_ID_SWAGGER,
    POST_MODEL_FORM_DATA_SWAGGER, POST_SEARCH_ALL_SWAGGER, POST_SEARCH_IDS_SWAGGER,
    PUT_MODEL_BY_ID_SWAGGER, PUT_MODEL_WITH_EMPTY_BODY_SWAGGER, PUT_MODEL_WITH_INTEGER_BODY_SWAGGER
} from './api-mocks';
import {API_GET_CHILD_OF_MODEL_BY_ID, ENUM_WITH_VAR_NAMES_SWAGGER, MODEL_WITH_REF_SWAGGER} from './interface-mocks';

export const SWAGGER_DATA = {
    openapi: "3.0.1",
    info: {
        title: "Montage Platform API",
        description: "Documents the Montage Platform REST API",
        version: "v1"
    },
    paths: {
        "/api/Claim/{id}": {
            ...GET_MODEL_BY_ID_SWAGGER,
            ...PUT_MODEL_BY_ID_SWAGGER
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
    },
    components: {
        schemas: {
            ...MODEL_WITH_REF_SWAGGER,
            ...ENUM_WITH_VAR_NAMES_SWAGGER
        }
    },
    servers: [{"url": "https://apidev.montagefs.com"}],
}
