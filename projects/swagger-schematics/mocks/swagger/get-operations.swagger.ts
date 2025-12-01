import { IPathOperations } from "../../interfaces/version_3_1/operation.interface";

export const GET_MODEL_BY_ID_SWAGGER: IPathOperations = {
    "get": {
        "tags": ["Claim"],
        "summary": "Gets ClaimDetail",
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
    },
};

export const GET_SERVICE_ACTIONS_SWAGGER: IPathOperations = {
    "get": {
        "summary": "Get service actions",
        "parameters": [{
            "name": "serviceActionId",
            "in": "path",
            "description": "",
            "required": true,
            "schema": {
                "type": "integer",
                "format": "int32"
            }
        }],
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
    },
};

export const GET_SERVICE_ACTIONS_BY_ID_SWAGGER: IPathOperations = {
    "get": {
        "summary": "Get service actions",
        "parameters": [{
            "name": "serviceActionId",
            "in": "path",
            "description": "",
            "required": true,
            "schema": {
                "type": "integer",
                "format": "int32"
            }
        }],
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
    },
};
