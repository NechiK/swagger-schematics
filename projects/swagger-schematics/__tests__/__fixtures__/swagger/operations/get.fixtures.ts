import { IPathOperations } from '../../../../interfaces/version_3_1/operation.interface';
import {
  createGetOperation,
  createGetByIdOperation,
  createPathParam,
  createQueryParam,
  createRefParam,
  createResponse
} from '../../../helpers/factories';

// ============================================================================
// GET by ID Operations
// ============================================================================

export const GET_MODEL_BY_ID: IPathOperations = createGetByIdOperation(
  'Claim',
  'ClaimDetailDTO'
);

export const GET_CHILD_BY_PARENT_ID: IPathOperations = createGetOperation({
  parameters: [createPathParam('claimId')],
  responses: createResponse({ refName: 'ClaimDetailDTO' })
});

// ============================================================================
// GET with Array Response
// ============================================================================

export const GET_SERVICE_ACTIONS: IPathOperations = createGetOperation({
  summary: 'Get service actions',
  parameters: [createPathParam('serviceActionId')],
  responses: createResponse({ type: 'array', itemsType: 'integer' })
});

export const GET_SERVICE_ACTIONS_BY_ID: IPathOperations = createGetOperation({
  summary: 'Get service actions',
  parameters: [createPathParam('serviceActionId')],
  responses: createResponse({ type: 'array', itemsType: 'integer' })
});

// ============================================================================
// GET with Query Parameters
// ============================================================================

export const GET_BY_STATUS_WITH_ENUM_PARAM: IPathOperations = createGetOperation({
  tags: ['Claim'],
  summary: 'Get claims by status',
  parameters: [
    createQueryParam('id', 'string', { required: true }),
    createRefParam('status', 'ClaimStatuses', 'query', true)
  ],
  responses: createResponse({ type: 'array', itemsRef: 'ClaimDetailDTO' })
});

// ============================================================================
// GET with Nullable Query Parameters (default: null)
// ============================================================================

export const GET_WITH_NULLABLE_QUERY_PARAMS: IPathOperations = createGetOperation({
  tags: ['Claim'],
  summary: 'Search claims with optional filters',
  parameters: [
    createQueryParam('name', 'string', { required: true }),
    createQueryParam('status', 'string', { schema: { type: 'string', default: null } as any }),
    createQueryParam('priority', 'integer', { schema: { type: 'integer', format: 'int32', default: null } as any })
  ],
  responses: createResponse({ type: 'array', itemsRef: 'ClaimDetailDTO' })
});
