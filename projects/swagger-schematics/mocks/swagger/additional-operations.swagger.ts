import { IPathOperations } from "../../interfaces/version_3_1/operation.interface";

/**
 * GET /api/Model?page=1&pageSize=10
 * Tests: GET with query parameters
 */
export const GET_WITH_QUERY_PARAMS_SWAGGER: IPathOperations = {
    "get": {
        "tags": ["Claim"],
        "summary": "Gets paginated list",
        "parameters": [
            {
                "name": "page",
                "in": "query",
                "description": "Page number",
                "required": false,
                "schema": {
                    "type": "integer",
                    "format": "int32",
                    "default": 1
                }
            },
            {
                "name": "pageSize",
                "in": "query",
                "description": "Page size",
                "required": false,
                "schema": {
                    "type": "integer",
                    "format": "int32",
                    "default": 10
                }
            }
        ],
        "responses": {
            "200": {
                "description": "Success",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "array",
                            "items": {
                                "$ref": "#/components/schemas/ClaimDetailDTO"
                            }
                        }
                    },
                }
            }
        }
    },
};

/**
 * DELETE /api/Model/{id}
 * Tests: DELETE with path parameter (single item delete)
 */
export const DELETE_SINGLE_BY_ID_SWAGGER: IPathOperations = {
    "delete": {
        "tags": ["Claim"],
        "summary": "Delete a claim by id",
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "description": "Id of claim to delete",
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
                            "type": "boolean"
                        }
                    },
                }
            }
        }
    }
};

/**
 * PATCH /api/Model/{id}
 * Tests: PATCH with path parameter and body
 */
export const PATCH_MODEL_BY_ID_SWAGGER: IPathOperations = {
    "patch": {
        "tags": ["Claim"],
        "summary": "Partially update a claim",
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
            "description": "Partial claim data",
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/ClaimDetailDTO"
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
