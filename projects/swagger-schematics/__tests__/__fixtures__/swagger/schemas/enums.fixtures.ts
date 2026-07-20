import { TSchemaByType } from '../../../../interfaces/version_3_1/swagger.interface';
import { createEnumSchema } from '../../../helpers/factories';

// ============================================================================
// Enum Schemas
// ============================================================================

export const CLAIM_STATUSES_ENUM_SCHEMA: TSchemaByType = createEnumSchema([1, 2, 3, 99]);

export const CLAIM_TYPE_ENUM_SCHEMA: TSchemaByType = createEnumSchema([1, 2], {
  varnames: ['MS', 'PP']
});

export const DISTRIBUTION_TYPE_ENUM_SCHEMA: TSchemaByType = createEnumSchema(['TypeA', 'TypeB'], {
  type: 'string'
});

export const NULLABLE_OF_DISTRIBUTION_TYPE_ENUM_SCHEMA: TSchemaByType = createEnumSchema(['TypeA', 'TypeB'], {
  type: 'string',
  nullable: true
});

export const DELIVERY_CHANNEL_ENUM_SCHEMA: TSchemaByType = createEnumSchema(['email', 'phone-call'], {
  type: 'string',
  varnames: ['Email', 'PhoneCall']
});

// ============================================================================
// All Enums (Combined Export)
// ============================================================================

export const ENUM_SCHEMAS: Record<string, TSchemaByType> = {
  ClaimStatuses: CLAIM_STATUSES_ENUM_SCHEMA,
  ClaimType: CLAIM_TYPE_ENUM_SCHEMA,
  DistributionType: DISTRIBUTION_TYPE_ENUM_SCHEMA,
  NullableOfDistributionType: NULLABLE_OF_DISTRIBUTION_TYPE_ENUM_SCHEMA,
  DeliveryChannel: DELIVERY_CHANNEL_ENUM_SCHEMA
};
