import { IPathOperations } from "../../interfaces/version_3_1/operation.interface";

export const DELETE_MANY_ARRAY_OF_IDS_SWAGGER: IPathOperations = {
    "delete": {
        "summary": "Delete multiple entities",
        "requestBody": {
            "description": "Ids of entities to delete",
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
        },
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
