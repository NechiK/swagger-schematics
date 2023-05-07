import {
    GET_MODEL_BY_ID_SWAGGER,
    POST_MODEL_CHILD_BY_MODEL_ID_SWAGGER,
    POST_MODEL_FORM_DATA_SWAGGER,
    PUT_MODEL_BY_ID_SWAGGER
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
    },
    components: {
        schemas: {
            ...MODEL_WITH_REF_SWAGGER,
            ...ENUM_WITH_VAR_NAMES_SWAGGER
        }
    },
    servers: [{"url": "https://apidev.montagefs.com"}],
}
