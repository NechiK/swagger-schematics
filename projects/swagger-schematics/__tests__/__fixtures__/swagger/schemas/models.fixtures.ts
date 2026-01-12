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

// ============================================================================
// All Models (Combined Export)
// ============================================================================

export const MODEL_SCHEMAS: Record<string, TSchemaByType> = {
  CompanySearchDTO: COMPANY_SEARCH_DTO_SCHEMA,
  ClaimDetailDTO: CLAIM_DETAIL_DTO_SCHEMA,
  IdNameDTO: ID_NAME_DTO_SCHEMA,
  CreateNoteDTO: CREATE_NOTE_DTO_SCHEMA,
  ClaimNoteViewDTO: CLAIM_NOTE_VIEW_DTO_SCHEMA
};
