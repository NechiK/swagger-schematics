// GET expected outputs
export { GET_MODEL_BY_ID_METHOD } from './get-methods.expected';

// POST expected outputs
export {
    POST_MODEL_BY_ID_METHOD,
    POST_MODEL_FORM_DATA_METHOD,
} from './post-methods.expected';

// PUT expected outputs
export {
    PUT_MODEL_WITH_INTEGER_BODY_METHOD,
    PUT_MODEL_WITH_EMPTY_BODY_METHOD,
} from './put-methods.expected';

// DELETE expected outputs
export { DELETE_MANY_ARRAY_OF_IDS_METHOD } from './delete-methods.expected';

// Additional expected outputs for extended test coverage
export {
    GET_WITH_QUERY_PARAMS_METHOD,
    DELETE_SINGLE_BY_ID_METHOD,
    PATCH_MODEL_BY_ID_METHOD,
    PUT_MODEL_BY_ID_WITH_BODY_METHOD,
    POST_WITHOUT_PATH_PARAMS_METHOD,
} from './additional-methods.expected';
