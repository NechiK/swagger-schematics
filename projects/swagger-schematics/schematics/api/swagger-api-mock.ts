export const SWAGGER_MOCK_API_DATA = {
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
        "schemas": {
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
            "ClaimDetailDTO": {
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
        }
    },
    servers: [{"url": "https://apidev.montagefs.com"}],
}
