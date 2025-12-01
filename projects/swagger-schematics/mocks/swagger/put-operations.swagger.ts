import { IPathOperations } from "../../interfaces/version_3_1/operation.interface";

export const PUT_MODEL_BY_ID_SWAGGER: IPathOperations = {
    "put": {
        "tags": ["Claim"],
        "summary": "Updates ClaimDetail",
        "parameters": [{
            "name": "id",
            "in": "path",
            "description": "",
            "required": true,
            "schema": {
                "type": "integer",
                "format": "int32"
            }
        }],
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/ClaimDetailDTO"
                    }
                }
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

export const PUT_MODEL_WITH_INTEGER_BODY_SWAGGER: IPathOperations = {
    "put": {
        "tags": ["Claim"],
        "summary": "Called when a web claim changes status",
        "requestBody": {
            "description": "Id of claim",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "integer",
                        "format": "int32"
                    }
                },
            }
        },
        "responses": {
            "200": {
                "description": "Success"
            }
        }
    }
};

export const PUT_MODEL_WITH_EMPTY_BODY_SWAGGER: IPathOperations = {
    "put": {
        "parameters": [
            {
                "name": "id",
                "in": "path",
                "description": "Id of user",
                "required": true,
                "schema": {
                    "type": "integer",
                    "format": "int32"
                }
            }
        ],
        "responses": {
            "200": {
                "description": "Success"
            }
        }
    }
};
