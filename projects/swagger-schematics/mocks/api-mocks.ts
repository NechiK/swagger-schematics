export const GET_MODEL_BY_ID_SWAGGER = {
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
}

export const GET_MODEL_BY_ID_METHOD = `getById(id: number): Observable<IClaimDetailDTO> {
    return this.httpClient.get<IClaimDetailDTO>(this.getUrl(\`\${id}\`));
  }
`;

export const POST_MODEL_FORM_DATA_SWAGGER = {
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
}

export const POST_MODEL_FORM_DATA_METHOD = `createClaim(model: any, formfiles: any[], queryParams: {width?: string; height?: string} = {}): Observable<void> {
    const formData = new FormData();
    formData.append('model', JSON.stringify(model));
    formfiles.forEach((file) => formData.append('formfiles', file));
    return this.httpClient.post<void>(this.getUrl(\`\`), formData);
  }
`;

export const POST_MODEL_CHILD_BY_MODEL_ID_SWAGGER = {
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
}

export const POST_MODEL_BY_ID_METHOD = `addClaimNote(id: number, createNoteDTO: ICreateNoteDTO): Observable<IClaimNoteViewDTO> {
    return this.httpClient.post<IClaimNoteViewDTO>(this.getUrl(\`\${id}/note\`), createNoteDTO);
  }
`;

export const PUT_MODEL_BY_ID_SWAGGER = {
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
}

export const PUT_MODEL_BY_ID_METHOD = `addClaimNote(id: number, createNoteDTO: ICreateNoteDTO): Observable<IClaimNoteViewDTO> {
    return this.httpClient.post<IClaimNoteViewDTO>(this.getUrl(\`\${id}/note\`), createNoteDTO);
  }
`;
