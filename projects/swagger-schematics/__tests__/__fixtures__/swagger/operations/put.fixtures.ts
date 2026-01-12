import { IPathOperations } from '../../../../interfaces/version_3_1/operation.interface';
import {
  createPutOperation,
  createPutByIdOperation,
  createPathParam,
  createJsonRequestBody,
  createResponse,
  createEmptyResponse
} from '../../../helpers/factories';

// ============================================================================
// PUT by ID with Body
// ============================================================================

export const PUT_MODEL_BY_ID: IPathOperations = createPutByIdOperation(
  'Claim',
  'ClaimDetailDTO',
  'ClaimDetailDTO'
);

// ============================================================================
// PUT with Various Body Types
// ============================================================================

export const PUT_MODEL_WITH_INTEGER_BODY: IPathOperations = createPutOperation({
  tags: ['Claim'],
  summary: 'Update claim status',
  requestBody: createJsonRequestBody({
    type: 'integer',
    description: 'Id of claim'
  }),
  responses: createEmptyResponse()
});

export const PUT_MODEL_WITH_EMPTY_BODY: IPathOperations = createPutOperation({
  summary: 'Update claim by id reactivate',
  parameters: [createPathParam('id')],
  responses: createEmptyResponse()
});

// ============================================================================
// PUT with Path Param from Body (no separate path param defined)
// ============================================================================

export const PUT_WITH_PATH_PARAM_FROM_BODY: IPathOperations = createPutOperation({
  tags: ['Claim'],
  summary: 'Update note by id',
  requestBody: createJsonRequestBody({
    refName: 'CreateNoteDTO',
    description: 'Note data with id',
    required: true
  }),
  responses: createEmptyResponse()
});
