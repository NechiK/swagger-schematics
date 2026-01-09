import { TSchemaByType } from '../../../../interfaces/version_3_1/swagger.interface';
import { createEnumSchema } from '../../../helpers/factories';

// ============================================================================
// Enum Schemas
// ============================================================================

export const CLAIM_STATUSES_ENUM_SCHEMA: TSchemaByType = createEnumSchema([1, 2, 3, 99]);

export const CLAIM_TYPE_ENUM_SCHEMA: TSchemaByType = createEnumSchema([1, 2], {
  varnames: ['MS', 'PP']
});

// ============================================================================
// All Enums (Combined Export)
// ============================================================================

export const ENUM_SCHEMAS: Record<string, TSchemaByType> = {
  ClaimStatuses: CLAIM_STATUSES_ENUM_SCHEMA,
  ClaimType: CLAIM_TYPE_ENUM_SCHEMA
};
