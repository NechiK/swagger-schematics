export const SWAGGER_MOCK_DATA = {
    openapi: "3.0.1",
    info: {
        title: "Montage Platform API",
        description: "Documents the Montage Platform REST API",
        version: "v1"
    },
    paths: {
        "/api/Claim/{id}": {
            "get": {
                "tags": [
                    "Claim"
                ],
                "summary": "Gets ClaimDetail",
                "parameters": [
                    {
                        "name": "id",
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
                            "text/plain": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            },
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            },
                            "text/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/Claim/{id}/files": {
            "get": {
                "tags": [
                    "Claim"
                ],
                "parameters": [
                    {
                        "name": "id",
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
                            "text/plain": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            },
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            },
                            "text/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            }
                        }
                    }
                }
            }
        },
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
                            "text/plain": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            },
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            },
                            "text/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/Claim/{guidId}": {
            "get": {
                "tags": [
                    "Claim"
                ],
                "summary": "Gets ClaimDetail",
                "parameters": [
                    {
                        "name": "guidId",
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
                            "text/plain": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            },
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            },
                            "text/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimDetailDTO"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/Claim": {
            "post": {
                "tags": [
                    "Claim"
                ],
                "summary": "Create claim",
                "parameters": [
                    {
                        "name": "width",
                        "in": "query",
                        "description": "Desired width of image for viewer",
                        "schema": {
                            "type": "integer",
                            "format": "int32",
                            "default": 1280
                        }
                    },
                    {
                        "name": "height",
                        "in": "query",
                        "description": "Desired height of image for viewer",
                        "schema": {
                            "type": "integer",
                            "format": "int32",
                            "default": 800
                        }
                    }
                ],
                "requestBody": {
                    "content": {
                        "multipart/form-data": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "model": {
                                        "type": "string"
                                    },
                                    "formfiles": {
                                        "type": "array",
                                        "items": {
                                            "type": "string",
                                            "format": "binary"
                                        }
                                    }
                                }
                            },
                            "encoding": {
                                "model": {
                                    "style": "form"
                                },
                                "formfiles": {
                                    "style": "form"
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Success"
                    }
                }
            }
        },
        "/api/Claim/{id}/note": {
            "post": {
                "tags": [
                    "Claim"
                ],
                "summary": "Add a note to a claim",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "description": "Id of claim",
                        "required": true,
                        "schema": {
                            "type": "integer",
                            "format": "int32"
                        }
                    }
                ],
                "requestBody": {
                    "description": "Describes the note",
                    "content": {
                        "application/json-patch+json": {
                            "schema": {
                                "$ref": "#/components/schemas/CreateNoteDTO"
                            }
                        },
                        "application/json": {
                            "schema": {
                                "$ref": "#/components/schemas/CreateNoteDTO"
                            }
                        },
                        "text/json": {
                            "schema": {
                                "$ref": "#/components/schemas/CreateNoteDTO"
                            }
                        },
                        "application/*+json": {
                            "schema": {
                                "$ref": "#/components/schemas/CreateNoteDTO"
                            }
                        }
                    },
                    "required": true
                },
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "text/plain": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimNoteViewDTO"
                                }
                            },
                            "application/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimNoteViewDTO"
                                }
                            },
                            "text/json": {
                                "schema": {
                                    "$ref": "#/components/schemas/ClaimNoteViewDTO"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/api/Claim/quicksearch": {
            "get": {
                "tags": [
                    "Claim"
                ],
                "summary": "Search for a claim, consumer or warranty, return back matches in tree",
                "parameters": [
                    {
                        "name": "searchString",
                        "in": "query",
                        "description": "String to search for\r\n            Search for a match on\r\n            CLAIM:\r\n                claim #\r\n            CONSUMER\r\n                first name + lastname\r\n                any phone #\r\n                email\r\n            WARRANTY\r\n                retailer transaction id/receipt #",
                        "required": true,
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "text/plain": {
                                "schema": {
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/components/schemas/ConsumerSearchResultDTO"
                                    }
                                }
                            },
                            "application/json": {
                                "schema": {
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/components/schemas/ConsumerSearchResultDTO"
                                    }
                                }
                            },
                            "text/json": {
                                "schema": {
                                    "type": "array",
                                    "items": {
                                        "$ref": "#/components/schemas/ConsumerSearchResultDTO"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
    },
    components: {
        schemas: {
            "JournalDetailDTO": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "format": "int32"
                    },
                    "project": {
                        "$ref": "#/components/schemas/IdNameDTO"
                    },
                    "customer": {
                        "$ref": "#/components/schemas/IdNameDTO"
                    },
                    "workType": {
                        "$ref": "#/components/schemas/IdNameDTO"
                    },
                    "staff": {
                        "$ref": "#/components/schemas/IdNameDTO"
                    },
                    "refNo": {
                        "type": "string",
                        "nullable": true
                    },
                    "extId": {
                        "type": "integer",
                        "format": "int64",
                        "nullable": true
                    },
                    "notes": {
                        "type": "string",
                        "nullable": true
                    },
                    "date": {
                        "type": "string",
                        "format": "date"
                    },
                    "hours": {
                        "type": "number",
                        "format": "decimal"
                    },
                    "estimateLineNo": {
                        "type": "string",
                        "nullable": true
                    },
                    "isBilled": {
                        "type": "boolean"
                    },
                    "invoiceLineId": {
                        "type": "integer",
                        "format": "int32",
                        "nullable": true
                    }
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
            ClaimDetailDTO: {
                type: "object",
                properties: {
                    claimInfo: {
                        $ref: "#/components/schemas/ClaimViewDTO"
                    },
                    retailer: {
                        $ref: "#/components/schemas/RetailerViewDTO"
                    },
                    consumerPlanDetailed: {
                        $ref: "#/components/schemas/ConsumerPlanDetailedViewDTO"
                    },
                    productInformation: {
                        type: "array",
                        items: {
                            $ref: "#/components/schemas/ProductInformationDTO"
                        },
                        description: "Product information",
                        nullable: true
                    },
                },
                additionalProperties: false,
                description: "Claim details"
            },
            "ClaimViewDTO": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "Id of claim in database",
                        "format": "int32"
                    },
                    "claimNumber": {
                        "type": "string",
                        "description": "Claim Number",
                        "nullable": true
                    },
                    "claimStatus": {
                        "$ref": "#/components/schemas/ClaimStatuses"
                    },
                    "claimStage": {
                        "$ref": "#/components/schemas/ClaimStages"
                    },
                    "claimType": {
                        "$ref": "#/components/schemas/ClaimType"
                    },
                    "dateOpen": {
                        "type": "string",
                        "description": "Claim open date",
                        "format": "date-time",
                        "nullable": true
                    },
                    "submitterFirstName": {
                        "type": "string",
                        "description": "Submitter First Name",
                        "nullable": true
                    },
                    "submitterLastName": {
                        "type": "string",
                        "description": "Submitter Last Name",
                        "nullable": true
                    },
                    "submitterEmail": {
                        "type": "string",
                        "description": "Submitter Email",
                        "nullable": true
                    },
                    "submitterPhone": {
                        "type": "string",
                        "description": "Submitter Phone",
                        "nullable": true
                    },
                    "isFlaggedForRetailerReview": {
                        "type": "boolean",
                        "description": "True if the claim is flagged for retailer review"
                    },
                    "escalation": {
                        "type": "integer",
                        "description": "Escalation information",
                        "format": "int32",
                        "nullable": true
                    },
                    "furnitureStreetAddress1": {
                        "type": "string",
                        "description": "Furniture address",
                        "nullable": true
                    },
                    "furnitureStreetAddress2": {
                        "type": "string",
                        "description": "Alternative furniture address",
                        "nullable": true
                    },
                    "furnitureCity": {
                        "type": "string",
                        "description": "Furniture city",
                        "nullable": true
                    },
                    "furniturePostalCode": {
                        "type": "string",
                        "description": "Furniture postal code",
                        "nullable": true
                    },
                    "furnitureCountry": {
                        "type": "string",
                        "description": "Furniture country",
                        "nullable": true
                    },
                    "furnitureProvince": {
                        "type": "string",
                        "description": "Furniture province",
                        "nullable": true
                    },
                    "dateClosed": {
                        "type": "string",
                        "description": "Date claim was closed",
                        "format": "date-time",
                        "nullable": true
                    }
                },
                "additionalProperties": false,
                "description": "Claim details"
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
            "ClaimStages": {
                "enum": [
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                    8,
                    99,
                    100
                ],
                "type": "integer",
                "format": "int32"
            },
            "ClaimType": {
                "enum": [
                    1,
                    2
                ],
                "x-enum-varnames": ["MS", "PP"],
                "type": "integer",
                "format": "int32"
            },
            "RetailerViewDTO": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "Id",
                        "format": "int32"
                    },
                    "parentId": {
                        "type": "integer",
                        "description": "Optional Parent retailer",
                        "format": "int32",
                        "nullable": true
                    },
                    "name": {
                        "type": "string",
                        "description": "Name",
                        "nullable": true
                    },
                    "retailerLocationId": {
                        "type": "string",
                        "description": "The identifier that the retailer uses for this store",
                        "nullable": true
                    },
                    "accountNumber": {
                        "type": "string",
                        "description": "Account number",
                        "nullable": true
                    },
                    "streetAddress1": {
                        "type": "string",
                        "description": "Street Address",
                        "nullable": true
                    },
                    "addressCity": {
                        "type": "string",
                        "description": "Address City",
                        "nullable": true
                    },
                    "addressPostalCode": {
                        "type": "string",
                        "description": "Address Postal Code",
                        "nullable": true
                    },
                    "state": {
                        "type": "string",
                        "description": "State",
                        "nullable": true
                    },
                    "relationshipStatusCode": {
                        "$ref": "#/components/schemas/AccountRelationshipStatus"
                    },
                    "region": {
                        "$ref": "#/components/schemas/IdNameDTO"
                    },
                    "hasManagedParts": {
                        "type": "boolean",
                        "description": "Are parts managed by Montage"
                    },
                    "hasEasyReplacement": {
                        "type": "boolean",
                        "description": "EZ Replacement"
                    },
                    "isAccountingOnHold": {
                        "type": "boolean",
                        "description": "Accounting on hold, retailer plans can't be created if true"
                    },
                    "floridaStateLicense": {
                        "type": "string",
                        "description": "Florida state license",
                        "nullable": true
                    }
                },
                "additionalProperties": false,
                "description": "Retailer information"
            },
            "AccountRelationshipStatus": {
                "enum": [
                    223940000,
                    223940001,
                    223940002,
                    223940003,
                    223940004,
                    223940005,
                    223940006,
                    223940007
                ],
                "type": "integer",
                "format": "int32"
            },
            "ConsumerPlanDetailedViewDTO": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "Id of consumer plan",
                        "format": "int32"
                    },
                    "name": {
                        "type": "string",
                        "description": "Name",
                        "nullable": true
                    },
                    "receiptNumber": {
                        "type": "string",
                        "description": "Receipt number",
                        "nullable": true
                    },
                    "purchaseDate": {
                        "type": "string",
                        "description": "Purchase Date",
                        "format": "date-time",
                        "nullable": true
                    },
                    "deliveryDate": {
                        "type": "string",
                        "description": "Delivery Date",
                        "format": "date-time",
                        "nullable": true
                    },
                    "consumerId": {
                        "type": "integer",
                        "description": "Consumer id",
                        "format": "int32"
                    },
                    "purchaseRetailerId": {
                        "type": "integer",
                        "description": "Purchase retailer id",
                        "format": "int32",
                        "nullable": true
                    },
                    "purchaseRetailerName": {
                        "type": "string",
                        "description": "Retailer name",
                        "nullable": true
                    },
                    "servicingRetailerId": {
                        "type": "integer",
                        "description": "Servicing retailer id",
                        "format": "int32",
                        "nullable": true
                    },
                    "servicingRetailerName": {
                        "type": "string",
                        "description": "Servicing retailer name",
                        "nullable": true
                    },
                    "coveredByProtectionPlan": {
                        "type": "boolean",
                        "description": "Covered by a protection plan",
                        "nullable": true
                    },
                    "protectionPlanExpirationDate": {
                        "type": "string",
                        "description": "Expiration date of the plan, Date Portion only (time portion 00)",
                        "format": "date-time",
                        "nullable": true
                    },
                    "consumer": {
                        "$ref": "#/components/schemas/ConsumerViewDTO"
                    },
                    "purchasePrice": {
                        "type": "number",
                        "description": "Purchase price",
                        "format": "decimal",
                        "nullable": true
                    }
                },
                "additionalProperties": false,
                "description": "Consumer plan information with Consumer"
            },
            "ConsumerViewDTO": {
                "required": [
                    "city",
                    "firstName",
                    "lastName",
                    "postalCode",
                    "stateProvince",
                    "streetAddress1"
                ],
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "Id of Consumer",
                        "format": "int32"
                    },
                    "crmRefId": {
                        "type": "string",
                        "description": "Crm consumer id",
                        "format": "uuid"
                    },
                    "contactId": {
                        "type": "string",
                        "description": "Contact Id foreign key",
                        "nullable": true
                    },
                    "firstName": {
                        "type": "string",
                        "description": "First name"
                    },
                    "lastName": {
                        "type": "string",
                        "description": "Lst name"
                    },
                    "mobilePhone": {
                        "type": "string",
                        "description": "Mobile Phone #",
                        "nullable": true
                    },
                    "workPhone": {
                        "type": "string",
                        "description": "Work Phone #",
                        "nullable": true
                    },
                    "homePhone": {
                        "type": "string",
                        "description": "Home Phone #",
                        "nullable": true
                    },
                    "emailAddress": {
                        "type": "string",
                        "description": "Email address",
                        "nullable": true
                    },
                    "otherEmailAddress": {
                        "type": "string",
                        "description": "Another email",
                        "nullable": true
                    },
                    "streetAddress1": {
                        "type": "string",
                        "description": "Address of the consumer"
                    },
                    "streetAddress2": {
                        "type": "string",
                        "description": "Another address of the consumer",
                        "nullable": true
                    },
                    "city": {
                        "type": "string",
                        "description": "City"
                    },
                    "postalCode": {
                        "type": "string",
                        "description": "Postal code"
                    },
                    "stateProvince": {
                        "type": "string",
                        "description": "State"
                    },
                    "country": {
                        "type": "string",
                        "description": "Country",
                        "nullable": true
                    },
                    "preferredContactLanguage": {
                        "type": "integer",
                        "description": "Preferred Language",
                        "format": "int32",
                        "nullable": true
                    },
                    "preferredContactMethod": {
                        "type": "integer",
                        "description": "Preferred Delivery Method",
                        "format": "int32",
                        "nullable": true
                    },
                    "preferredContactTime": {
                        "type": "integer",
                        "description": "Preferred Contact Time",
                        "format": "int32",
                        "nullable": true
                    }
                },
                "additionalProperties": false,
                "description": "Consumer DTO"
            },
            "ProductInformationDTO": {
                "type": "object",
                "properties": {
                    "claimId": {
                        "type": "integer",
                        "description": "ClaimId internal use only",
                        "format": "int32"
                    },
                    "name": {
                        "type": "string",
                        "description": "Name",
                        "nullable": true
                    },
                    "sku": {
                        "type": "string",
                        "description": "SKU",
                        "nullable": true
                    },
                    "vendor": {
                        "type": "string",
                        "description": "Vendor name",
                        "nullable": true
                    },
                    "reportedProblemDescription": {
                        "type": "string",
                        "description": "Problem description on product",
                        "nullable": true
                    },
                    "reportedProblemCause": {
                        "type": "string",
                        "description": "Cause of the problem",
                        "nullable": true
                    },
                    "reportedProblemType": {
                        "type": "string",
                        "description": "Reported problem",
                        "nullable": true
                    },
                    "status": {
                        "$ref": "#/components/schemas/ProductIncidentStatus"
                    },
                    "verifiedProblemType": {
                        "type": "string",
                        "description": "Verified problem type",
                        "nullable": true
                    },
                    "verifiedProblemDescription": {
                        "type": "string",
                        "description": "Verified problem description",
                        "nullable": true
                    },
                    "verifiedProblemCause": {
                        "type": "string",
                        "description": "Verified problem cause",
                        "nullable": true
                    },
                    "retailerClassificationName": {
                        "type": "string",
                        "description": "Retailer classification",
                        "nullable": true
                    }
                },
                "additionalProperties": false,
                "description": "Product Information, i.e.a combination of a Covered Product on a Claim, along with\r\nthe corresponding problem description."
            },
            "ProductIncidentStatus": {
                "enum": [
                    1,
                    2,
                    3,
                    4
                ],
                "type": "integer",
                "format": "int32"
            },
            "CreateRegionDTO": {
                "required": [
                    "name"
                ],
                "type": "object",
                "properties": {
                    "name": {
                        "maxLength": 100,
                        "type": "string",
                        "description": "Name of region"
                    },
                    "parentId": {
                        "type": "integer",
                        "description": "Parent id of region",
                        "format": "int32",
                        "nullable": true
                    },
                    "retailerIds": {
                        "type": "array",
                        "items": {
                            "type": "integer",
                            "format": "int32"
                        },
                        "description": "Retailers assigned to region",
                        "nullable": true
                    }
                },
                "additionalProperties": false,
                "description": "Region"
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
            "ConsumerSearchResultDTO": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "Consumer Id",
                        "format": "int32"
                    },
                    "firstName": {
                        "type": "string",
                        "description": "First Name",
                        "nullable": true
                    },
                    "contactId": {
                        "type": "string",
                        "description": "Contact Id",
                        "nullable": true
                    },
                    "lastName": {
                        "type": "string",
                        "description": "Last name",
                        "nullable": true
                    },
                    "workPhone": {
                        "type": "string",
                        "description": "Work phone #",
                        "nullable": true
                    },
                    "mobilePhone": {
                        "type": "string",
                        "description": "Mobile phone #",
                        "nullable": true
                    },
                    "homePhone": {
                        "type": "string",
                        "description": "Home phone #",
                        "nullable": true
                    },
                    "emailAddress": {
                        "type": "string",
                        "description": "Email address",
                        "nullable": true
                    },
                    "streetAddress1": {
                        "type": "string",
                        "description": "Street address",
                        "nullable": true
                    },
                    "streetAddress2": {
                        "type": "string",
                        "description": "Alternative street address",
                        "nullable": true
                    },
                    "city": {
                        "type": "string",
                        "description": "City",
                        "nullable": true
                    },
                    "stateProvince": {
                        "type": "string",
                        "description": "State",
                        "nullable": true
                    },
                    "postalCode": {
                        "type": "string",
                        "description": "ZIP code",
                        "nullable": true
                    },
                    "myServiceAgreements": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/MyServiceAgreementsSearchResult"
                        },
                        "description": "My Service agreements found for consumer",
                        "nullable": true
                    },
                    "protectionPlans": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/ProtectionPlanSearchResultDTO"
                        },
                        "description": "Protection plans found for consumer",
                        "nullable": true
                    }
                },
                "additionalProperties": false,
                "description": "A consumer record found in a quick search"
            },
            "MyServiceAgreementsSearchResult": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "Consumer Plan Id",
                        "format": "int32"
                    },
                    "purchaseDate": {
                        "type": "string",
                        "description": "Purchase date",
                        "format": "date-time",
                        "nullable": true
                    },
                    "servicingRetailerName": {
                        "type": "string",
                        "description": "Servicing retailer name",
                        "nullable": true
                    },
                    "servicingRetailerId": {
                        "type": "integer",
                        "description": "Servicing retailer id",
                        "format": "int32",
                        "nullable": true
                    },
                    "purchaseRetailerName": {
                        "type": "string",
                        "description": "Purchase retailer name",
                        "nullable": true
                    },
                    "purchaseRetailerId": {
                        "type": "integer",
                        "description": "Purchase retailer id",
                        "format": "int32",
                        "nullable": true
                    },
                    "name": {
                        "type": "string",
                        "description": "Warranty name",
                        "nullable": true
                    },
                    "receiptNumber": {
                        "type": "string",
                        "description": "Receipt number or retailer transaction id",
                        "nullable": true
                    },
                    "coveredProducts": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/CoveredProductSearchResultsDTO"
                        },
                        "description": "One or more covered products on plan",
                        "nullable": true
                    },
                    "otherClaims": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/ClaimSearchResultsDTO"
                        },
                        "description": "Gets or sets the other claims.",
                        "nullable": true
                    },
                    "accessiblePlan": {
                        "type": "boolean",
                        "description": "Can plan be viewed by current tenant"
                    }
                },
                "additionalProperties": false,
                "description": "A purchase found in a quick search"
            },
            "ProtectionPlanSearchResultDTO": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Random generated id, for FE navigation",
                        "format": "uuid"
                    },
                    "purchaseDate": {
                        "type": "string",
                        "description": "Purchase date",
                        "format": "date-time",
                        "nullable": true
                    },
                    "receiptNumber": {
                        "type": "string",
                        "description": "Receipt number or retailer transaction id",
                        "nullable": true
                    },
                    "plans": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/ProtectionPlanQuickSearchDTO"
                        },
                        "description": "Protection Plans",
                        "nullable": true
                    }
                },
                "additionalProperties": false,
                "description": "Protection plan search result"
            },
            "CoveredProductSearchResultsDTO": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Identifier of Covered Product",
                        "format": "uuid"
                    },
                    "consumerPlanId": {
                        "type": "integer",
                        "description": "Consumer plan id",
                        "format": "int32"
                    },
                    "name": {
                        "type": "string",
                        "description": "Product name",
                        "nullable": true
                    },
                    "claims": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/ClaimSearchResultsDTO"
                        },
                        "description": "Claims on covered product",
                        "nullable": true
                    }
                },
                "additionalProperties": false,
                "description": "Covered product found in a quick search"
            },
            "ClaimSearchResultsDTO": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "Claim Id",
                        "format": "int32"
                    },
                    "claimNumber": {
                        "type": "string",
                        "description": "Claim Number",
                        "nullable": true
                    },
                    "dateOpen": {
                        "type": "string",
                        "description": "Date claim was opened",
                        "format": "date-time",
                        "nullable": true
                    },
                    "tenantId": {
                        "type": "integer",
                        "description": "TenantId",
                        "format": "int32"
                    }
                },
                "additionalProperties": false,
                "description": "A claim found in a quick search"
            },
            "ProtectionPlanQuickSearchDTO": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "Plan id",
                        "format": "int32"
                    },
                    "servicingRetailerName": {
                        "type": "string",
                        "description": "Servicing retailer name",
                        "nullable": true
                    },
                    "servicingRetailerId": {
                        "type": "integer",
                        "description": "Servicing retailer id",
                        "format": "int32",
                        "nullable": true
                    },
                    "purchaseRetailerName": {
                        "type": "string",
                        "description": "Purchase retailer name",
                        "nullable": true
                    },
                    "purchaseRetailerId": {
                        "type": "integer",
                        "description": "Purchase retailer id",
                        "format": "int32",
                        "nullable": true
                    },
                    "name": {
                        "type": "string",
                        "description": "Warranty name",
                        "nullable": true
                    },
                    "parentPlanName": {
                        "type": "string",
                        "description": "Parent plan name",
                        "nullable": true
                    },
                    "coveredProducts": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/CoveredProductSearchResultsDTO"
                        },
                        "description": "One or more covered products on plan",
                        "nullable": true
                    },
                    "otherClaims": {
                        "type": "array",
                        "items": {
                            "$ref": "#/components/schemas/ClaimSearchResultsDTO"
                        },
                        "description": "Gets or sets the other claims.",
                        "nullable": true
                    },
                    "accessiblePlan": {
                        "type": "boolean",
                        "description": "Can plan be viewed by current tenant"
                    }
                },
                "additionalProperties": false,
                "description": "Used for quick search for FPP"
            },
        }
    },
    servers: [{"url": "https://apidev.montagefs.com"}],
}
