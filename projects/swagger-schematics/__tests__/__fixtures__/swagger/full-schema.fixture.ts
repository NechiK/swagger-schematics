import { ISwaggerSchema, IPath } from '../../../interfaces/version_3_1/swagger.interface';
import { createSwaggerSchema } from '../../helpers/factories';
import {
  GET_MODEL_BY_ID,
  GET_CHILD_BY_PARENT_ID,
  GET_SERVICE_ACTIONS,
  GET_SERVICE_ACTIONS_BY_ID,
  GET_BY_STATUS_WITH_ENUM_PARAM
} from './operations/get.fixtures';
import {
  POST_MODEL_FORM_DATA,
  POST_MODEL_CHILD_BY_MODEL_ID,
  POST_SEARCH_ALL,
  POST_SEARCH_IDS
} from './operations/post.fixtures';
import {
  PUT_MODEL_BY_ID,
  PUT_MODEL_WITH_INTEGER_BODY,
  PUT_MODEL_WITH_EMPTY_BODY,
  PUT_WITH_PATH_PARAM_FROM_BODY
} from './operations/put.fixtures';
import { DELETE_MANY_ARRAY_OF_IDS } from './operations/delete.fixtures';
import { MODEL_SCHEMAS } from './schemas/models.fixtures';
import { ENUM_SCHEMAS } from './schemas/enums.fixtures';

// ============================================================================
// Mock API Group Configuration
// ============================================================================

export const MOCK_GROUP = 'Claim';
export type TMockApiPath = `/api/${typeof MOCK_GROUP}` | `/api/${typeof MOCK_GROUP}/${string}`;

// ============================================================================
// Path Configuration
// ============================================================================

const API_PATHS: Record<TMockApiPath, IPath> = {
  '/api/Claim/{id}': {
    ...GET_MODEL_BY_ID,
    ...PUT_MODEL_BY_ID
  },
  '/api/Claim/{claimId}/serviceActions': {
    ...GET_CHILD_BY_PARENT_ID
  },
  '/api/Claim': {
    ...POST_MODEL_FORM_DATA
  },
  '/api/Claim/{id}/note': {
    ...POST_MODEL_CHILD_BY_MODEL_ID
  },
  '/api/Claim/status': {
    ...PUT_MODEL_WITH_INTEGER_BODY
  },
  '/api/Claim/all': {
    ...POST_SEARCH_ALL
  },
  '/api/Claim/ids': {
    ...POST_SEARCH_IDS
  },
  '/api/Claim/{id}/reactivate': {
    ...PUT_MODEL_WITH_EMPTY_BODY
  },
  '/api/Claim/deletemany': {
    ...DELETE_MANY_ARRAY_OF_IDS
  },
  '/api/Claim/serviceactions': {
    ...GET_SERVICE_ACTIONS
  },
  '/api/Claim/serviceactions/{serviceActionId}': {
    ...GET_SERVICE_ACTIONS_BY_ID
  },
  '/api/Claim/bystatus': {
    ...GET_BY_STATUS_WITH_ENUM_PARAM
  },
  '/api/Claim/note/{id}': {
    ...PUT_WITH_PATH_PARAM_FROM_BODY
  }
};

// ============================================================================
// Full Swagger Schema
// ============================================================================

export const SWAGGER_SCHEMA = createSwaggerSchema<TMockApiPath>({
  title: 'Montage Platform API',
  description: 'Documents the Montage Platform REST API',
  version: 'v1',
  paths: API_PATHS,
  schemas: {
    ...MODEL_SCHEMAS,
    ...ENUM_SCHEMAS
  },
  serverUrl: 'https://apidev.montagefs.com'
});

// ============================================================================
// Re-export for convenience
// ============================================================================

export { MODEL_SCHEMAS, ENUM_SCHEMAS };
