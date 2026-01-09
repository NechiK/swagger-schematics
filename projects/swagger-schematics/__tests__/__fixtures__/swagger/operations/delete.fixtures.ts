import { IPathOperations } from '../../../../interfaces/version_3_1/operation.interface';
import {
  createDeleteOperation,
  createDeleteManyOperation,
  createJsonRequestBody,
  createResponse
} from '../../../helpers/factories';

// ============================================================================
// DELETE Many (Batch Delete)
// ============================================================================

export const DELETE_MANY_ARRAY_OF_IDS: IPathOperations = createDeleteManyOperation('Claim');
