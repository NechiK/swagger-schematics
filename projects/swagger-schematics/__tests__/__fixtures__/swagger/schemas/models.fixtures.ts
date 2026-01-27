import { TSchemaByType } from '../../../../interfaces/version_3_1/swagger.interface';
import { createObjectSchema } from '../../../helpers/factories';

// ============================================================================
// DTO Schemas
// ============================================================================

export const COMPANY_SEARCH_DTO_SCHEMA: TSchemaByType = createObjectSchema(
  {
    page: {
      type: 'integer',
      format: 'int32',
      description: 'Page number, 1 based'
    },
    pageSize: {
      type: 'integer',
      format: 'int32',
      description: 'The page size (number of rows per page). Specify a size of 0 to get all the rows (no paging)'
    },
    searches: {
      type: 'array',
      nullable: true,
      description: 'Strings to search for',
      items: { type: 'string' }
    },
    noCount: {
      type: 'boolean',
      description: 'Set to true to not count the records in the table'
    },
    noRows: {
      type: 'boolean',
      description: 'Set to true to not return any rows (just count)'
    },
    excludeActive: {
      type: 'boolean',
      nullable: true,
      description: 'Return deleted records'
    },
    companyTypeId: {
      type: 'integer',
      format: 'int32',
      nullable: true,
      description: 'Specific company type'
    }
  },
  { description: 'Company search' }
);

export const CLAIM_DETAIL_DTO_SCHEMA: TSchemaByType = createObjectSchema(
  {
    id: { type: 'integer', format: 'int32' },
    problemType: { $ref: '#/components/schemas/IdNameDTO' },
    causeType: { $ref: '#/components/schemas/IdNameDTO' },
    claimStatus: { $ref: '#/components/schemas/ClaimStatuses' },
    crmRefId: { type: 'string', nullable: true }
  },
  { description: 'A detailed journal entry' }
);

export const ID_NAME_DTO_SCHEMA: TSchemaByType = createObjectSchema(
  {
    id: { type: 'integer', format: 'int32', description: 'Id' },
    name: { type: 'string', nullable: true, description: 'Name' },
    displayName: { type: 'string', nullable: true, description: 'Display name' }
  },
  { description: 'IdName lookup' }
);

export const CREATE_NOTE_DTO_SCHEMA: TSchemaByType = createObjectSchema(
  {
    note: { type: 'string', maxLength: 4000, description: 'The note content' }
  },
  { description: 'Add a note to a claim', required: ['note'] }
);

export const CLAIM_NOTE_VIEW_DTO_SCHEMA: TSchemaByType = createObjectSchema(
  {
    note: { type: 'string', maxLength: 4000, description: 'The note content' }
  },
  { description: 'Add a note to a claim', required: ['note'] }
);

export const TYPE_MAPPING_TEST_DTO_SCHEMA: TSchemaByType = createObjectSchema(
  {
    id: { type: 'integer', format: 'int32' },
    distributionType: { $ref: '#/components/schemas/NullableOfDistributionType' }
  },
  { description: 'DTO for testing typeMapping' }
);

// ============================================================================
// Composition Schemas (allOf, oneOf, anyOf)
// ============================================================================

export const BASE_ENTITY_SCHEMA: TSchemaByType = createObjectSchema(
  {
    id: { type: 'integer', format: 'int32' },
    createdAt: { type: 'string', format: 'date-time' }
  },
  { description: 'Base entity with common fields' }
);

export const AUDITABLE_ENTITY_SCHEMA: TSchemaByType = createObjectSchema(
  {
    updatedAt: { type: 'string', format: 'date-time', nullable: true },
    updatedBy: { type: 'string', nullable: true }
  },
  { description: 'Auditable fields' }
);

// allOf - intersection type (combines BaseEntity & AuditableEntity & specific fields)
export const FULL_CLAIM_DTO_SCHEMA: TSchemaByType = {
  allOf: [
    { $ref: '#/components/schemas/BaseEntity' },
    { $ref: '#/components/schemas/AuditableEntity' },
    {
      type: 'object',
      properties: {
        claimNumber: { type: 'string' },
        status: { type: 'string' }
      }
    }
  ]
} as TSchemaByType;

// oneOf - discriminated union type
export const NOTIFICATION_SCHEMA: TSchemaByType = {
  oneOf: [
    { $ref: '#/components/schemas/IdNameDTO' },
    { $ref: '#/components/schemas/ClaimDetailDTO' }
  ]
} as TSchemaByType;

// anyOf - union type
export const SEARCH_RESULT_SCHEMA: TSchemaByType = {
  anyOf: [
    { $ref: '#/components/schemas/IdNameDTO' },
    { $ref: '#/components/schemas/CreateNoteDTO' }
  ]
} as TSchemaByType;

// ============================================================================
// All Models (Combined Export)
// ============================================================================

export const MODEL_SCHEMAS: Record<string, TSchemaByType> = {
  CompanySearchDTO: COMPANY_SEARCH_DTO_SCHEMA,
  ClaimDetailDTO: CLAIM_DETAIL_DTO_SCHEMA,
  IdNameDTO: ID_NAME_DTO_SCHEMA,
  CreateNoteDTO: CREATE_NOTE_DTO_SCHEMA,
  ClaimNoteViewDTO: CLAIM_NOTE_VIEW_DTO_SCHEMA,
  TypeMappingTestDTO: TYPE_MAPPING_TEST_DTO_SCHEMA,
  // Composition schemas
  BaseEntity: BASE_ENTITY_SCHEMA,
  AuditableEntity: AUDITABLE_ENTITY_SCHEMA,
  FullClaimDTO: FULL_CLAIM_DTO_SCHEMA,
  Notification: NOTIFICATION_SCHEMA,
  SearchResult: SEARCH_RESULT_SCHEMA
};
