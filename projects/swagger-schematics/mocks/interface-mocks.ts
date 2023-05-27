export const MODEL_WITH_REF_SWAGGER = {
    "CompanySearchDTO": {
        "type": "object",
        "properties": {
            "page": {
                "maximum": 2147483647,
                "minimum": 0,
                "type": "integer",
                "description": "Page number, 1 based",
                "format": "int32"
            },
            "pageSize": {
                "maximum": 2147483647,
                "minimum": 0,
                "type": "integer",
                "description": "The page size (number of rows per page). Specify a size of 0 to get all the\r\nrows (no paging)",
                "format": "int32"
            },
            "searches": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Strings to search for",
                "nullable": true
            },
            "noCount": {
                "type": "boolean",
                "description": "Set to true to not count the records in the table"
            },
            "noRows": {
                "type": "boolean",
                "description": "Set to true to not return any rows (just count)"
            },
            "excludeActive": {
                "type": "boolean",
                "description": "Return deleted records",
                "nullable": true
            },
            "companyTypeId": {
                "type": "integer",
                "description": "Specific company type",
                "format": "int32",
                "nullable": true
            }
        },
        "additionalProperties": false,
        "description": "Company search"
    },
    "ClaimDetailDTO": {
        "type": "object",
        "properties": {
            "id": {
                "type": "integer",
                "format": "int32"
            },
            "problemType": {
                "$ref": "#/components/schemas/IdNameDTO"
            },
            "causeType": {
                "$ref": "#/components/schemas/IdNameDTO"
            },
            "claimStatus": {
                "$ref": "#/components/schemas/ClaimStatuses"
            },
            "crmRefId": {
                "type": "string",
                "nullable": true
            },
        },
        "additionalProperties": false,
        "description": "A detailed journal entry"
    },
    "IdNameDTO": {
        "type": "object",
        "properties": {
            "id": {
                "type": "integer",
                "description": "Id",
                "format": "int32"
            },
            "name": {
                "type": "string",
                "description": "Name",
                "nullable": true
            },
            "displayName": {
                "type": "string",
                "description": "Display name",
                "nullable": true
            }
        },
        "additionalProperties": false,
        "description": "IdName lookup"
    },
    "ClaimStatuses": {
        "enum": [
            1,
            2,
            3,
            99
        ],
        "type": "integer",
        "format": "int32"
    },
    "CreateNoteDTO": {
        "required": [
            "note"
        ],
        "type": "object",
        "properties": {
            "note": {
                "maxLength": 4000,
                "type": "string",
                "description": "The note content"
            }
        },
        "additionalProperties": false,
        "description": "Add a note to a claim"
    },
    "ClaimNoteViewDTO": {
        "required": [
            "note"
        ],
        "type": "object",
        "properties": {
            "note": {
                "maxLength": 4000,
                "type": "string",
                "description": "The note content"
            }
        },
        "additionalProperties": false,
        "description": "Add a note to a claim"
    },
}

export const ENUM_WITH_VAR_NAMES_SWAGGER = {
    "ClaimType": {
        "enum": [
            1,
            2
        ],
        "x-enum-varnames": ["MS", "PP"],
        "type": "integer",
        "format": "int32"
    },
};

export const API_GET_CHILD_OF_MODEL_BY_ID = {
    "/api/Claim/{claimId}/serviceActions": {
        "get": {
            "tags": [
                "Claim"
            ],
            "parameters": [
                {
                    "name": "claimId",
                    "in": "path",
                    "description": "",
                    "required": true,
                    "schema": {
                        "type": "integer",
                        "format": "int32"
                    }
                }
            ],
            "responses": {
                "200": {
                    "description": "Success",
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/ClaimDetailDTO"
                            }
                        },
                    }
                }
            }
        }
    },
};

export const MODEL_WITH_REF_DTO_CONTENT: string = `import { IIdNameDTO } from './id-name-dto.interface';
import { TClaimStatuses } from '../enums/claim-statuses.enum';

export interface IClaimDetailDTO {
  id: number;
  problemType: IIdNameDTO;
  causeType: IIdNameDTO;
  claimStatus: TClaimStatuses;
  crmRefId?: string;
}
`;

// export const JOURNAL_DETAIL_DTO_DUPLICATE_SYMBOL_CONTENT: string = `import { IIdNameDTO } from './id-name-dto.interface'
//
// export interface IJournalDetailDTO {
//   id: number;
//   project: IIdNameDTO;
//   customer: IIdNameDTO;
//   workType: IIdNameDTO;
//   staff: IIdNameDTO;
//   refNo?: string;
//   extId?: number;
//   notes?: string;
//   date: string;
//   hours: number;
//   estimateLineNo?: string;
//   isBilled: boolean;
//   invoiceLineId?: number;
// }
// `;
//
// export const RECURSIVE_SYMBOL_CONTENT: string = `import { TEstimateItemTypes } from '../enums/estimate-item-types.enum'
// import { IIdNameDTO } from './id-name-dto.interface'
//
// export interface IEstimateItemDTO {
//   id: number;
//   parentId?: number;
//   itemType: TEstimateItemTypes;
//   lineNumber: number;
//   title?: string;
//   description?: string;
//   min: number;
//   max: number;
//   workTypeId?: number;
//   phase: IIdNameDTO;
//   items?: IEstimateItemDTO[];
// }
// `;

