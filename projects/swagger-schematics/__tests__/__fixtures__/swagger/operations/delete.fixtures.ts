import { IPathOperations } from '../../../../interfaces/version_3_1/operation.interface';
import {
  createDeleteOperation,
  createDeleteManyOperation,
  createDeleteByIdOperation,
  createQueryParam,
  createResponse
} from '../../../helpers/factories';

// ============================================================================
// DELETE Many (Batch Delete)
// ============================================================================

export const DELETE_MANY_ARRAY_OF_IDS: IPathOperations = createDeleteManyOperation('Claim');

// ============================================================================
// DELETE by ID (Single Delete)
// ============================================================================

export const DELETE_BY_ID: IPathOperations = createDeleteByIdOperation('Claim');

// ============================================================================
// DELETE with Query Params (no body)
// ============================================================================

export const DELETE_WITH_QUERY_PARAMS: IPathOperations = createDeleteOperation({
  tags: ['Claim'],
  summary: 'Delete claims by filter',
  parameters: [
    createQueryParam('status', 'string', { required: true }),
    createQueryParam('force', 'boolean')
  ],
  responses: createResponse({ type: 'boolean' })
});
