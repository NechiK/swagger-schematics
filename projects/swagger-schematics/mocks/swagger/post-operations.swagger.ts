import { IPathOperations } from "../../interfaces/version_3_1/operation.interface";

export const POST_MODEL_FORM_DATA_SWAGGER: IPathOperations = {
    "post": {
        "tags": ["Claim"],
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
};

export const POST_MODEL_CHILD_BY_MODEL_ID_SWAGGER: IPathOperations = {
    "post": {
        "tags": ["Claim"],
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
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/CreateNoteDTO"
                    }
                },
            },
            "required": true
        },
        "responses": {
            "200": {
                "description": "Success",
                "content": {
                    "application/json": {
                        "schema": {
                            "$ref": "#/components/schemas/ClaimNoteViewDTO"
                        }
                    },
                }
            }
        }
    }
};

export const POST_SEARCH_ALL_SWAGGER: IPathOperations = {
    "post": {
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/CompanySearchDTO"
                    }
                },
            }
        },
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
};

export const POST_SEARCH_IDS_SWAGGER: IPathOperations = {
    "post": {
        "requestBody": {
            "description": "Paging, sorting and filtering settings",
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/CompanySearchDTO"
                    }
                },
            }
        },
        "responses": {
            "200": {
                "description": "Success",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {
                                "type": "integer",
                                "format": "int32"
                            }
                        }
                    },
                }
            }
        }
    }
};
