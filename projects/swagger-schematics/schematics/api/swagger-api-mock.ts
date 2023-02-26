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
        }
    },
    servers: [{"url": "https://apidev.montagefs.com"}],
}
