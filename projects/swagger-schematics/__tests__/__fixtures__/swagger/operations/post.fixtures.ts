import { IPathOperations } from '../../../../interfaces/version_3_1/operation.interface';
import {
  createPostOperation,
  createPostWithBodyOperation,
  createPathParam,
  createQueryParam,
  createJsonRequestBody,
  createFormDataRequestBody,
  createResponse
} from '../../../helpers/factories';

// ============================================================================
// POST with JSON Body
// ============================================================================

export const POST_MODEL_CHILD_BY_MODEL_ID: IPathOperations = createPostWithBodyOperation(
  'Claim',
  'CreateNoteDTO',
  'ClaimNoteViewDTO',
  [createPathParam('id')]
);

export const POST_SEARCH_ALL: IPathOperations = createPostOperation({
  requestBody: createJsonRequestBody({ refName: 'CompanySearchDTO' }),
  responses: createResponse({ refName: 'ClaimDetailDTO' })
});

export const POST_SEARCH_IDS: IPathOperations = createPostOperation({
  requestBody: createJsonRequestBody({
    refName: 'CompanySearchDTO',
    description: 'Paging, sorting and filtering settings'
  }),
  responses: createResponse({ type: 'array', itemsType: 'integer' })
});

// ============================================================================
// POST with Form Data
// ============================================================================

export const POST_MODEL_FORM_DATA: IPathOperations = createPostOperation({
  tags: ['Claim'],
  summary: 'Create claim',
  parameters: [
    createQueryParam('width', 'integer', { defaultValue: 1280, description: 'Desired width of image for viewer' }),
    createQueryParam('height', 'integer', { defaultValue: 800, description: 'Desired height of image for viewer' })
  ],
  requestBody: createFormDataRequestBody(
    {
      model: { type: 'string' },
      formfiles: {
        type: 'array',
        items: { type: 'string', format: 'binary' }
      }
    },
    {
      model: { style: 'form' },
      formfiles: { style: 'form' }
    }
  ),
  responses: createResponse()
});
