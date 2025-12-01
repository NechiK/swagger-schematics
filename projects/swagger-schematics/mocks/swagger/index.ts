// GET operations
export {
    GET_MODEL_BY_ID_SWAGGER,
    GET_SERVICE_ACTIONS_SWAGGER,
    GET_SERVICE_ACTIONS_BY_ID_SWAGGER,
} from './get-operations.swagger';

// POST operations
export {
    POST_MODEL_FORM_DATA_SWAGGER,
    POST_MODEL_CHILD_BY_MODEL_ID_SWAGGER,
    POST_SEARCH_ALL_SWAGGER,
    POST_SEARCH_IDS_SWAGGER,
} from './post-operations.swagger';

// PUT operations
export {
    PUT_MODEL_BY_ID_SWAGGER,
    PUT_MODEL_WITH_INTEGER_BODY_SWAGGER,
    PUT_MODEL_WITH_EMPTY_BODY_SWAGGER,
} from './put-operations.swagger';

// DELETE operations
export {
    DELETE_MANY_ARRAY_OF_IDS_SWAGGER,
} from './delete-operations.swagger';

// Additional operations for extended test coverage
export {
    GET_WITH_QUERY_PARAMS_SWAGGER,
    DELETE_SINGLE_BY_ID_SWAGGER,
    PATCH_MODEL_BY_ID_SWAGGER,
} from './additional-operations.swagger';
