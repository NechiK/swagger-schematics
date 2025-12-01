/**
 * Expected output for POST /api/Claim/{id}/note
 * Tests: addClaimByIdNote method generation with path param and body
 */
export const POST_MODEL_BY_ID_METHOD = `addClaimByIdNote(id: number, body: ICreateNoteDTO): Observable<IClaimNoteViewDTO> {
    return this.httpClient.post<IClaimNoteViewDTO>(this.getUrl(\`\${id}/note\`), body);
  }`;

/**
 * Expected output for POST /api/Claim (multipart/form-data)
 * Tests: createClaim method with form data - NOT YET IMPLEMENTED
 */
export const POST_MODEL_FORM_DATA_METHOD = `createClaim(model: any, formfiles: any[], queryParams: {width?: string; height?: string} = {}): Observable<void> {
    const formData = new FormData();
    formData.append('model', JSON.stringify(model));
    formfiles.forEach((file) => formData.append('formfiles', file));
    return this.httpClient.post<void>(this.getUrl(\`\`), formData);
  }`;
