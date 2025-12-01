/**
 * Expected output for GET /api/Claim/list?page=&pageSize=
 * Tests: GET with query parameters
 */
export const GET_WITH_QUERY_PARAMS_METHOD = `getClaimList({ page;pageSize }: { page: number, pageSize: number }): Observable<IClaimDetailDTO[]> {
    return this.httpClient.get<IClaimDetailDTO[]>(this.getUrl(\`list\`), { params: { page, pageSize } });
  }`;

/**
 * Expected output for DELETE /api/Claim/{id}
 * Tests: DELETE with path parameter (single item delete)
 */
export const DELETE_SINGLE_BY_ID_METHOD = `deleteClaimById(id: number): Observable<boolean> {
    return this.httpClient.delete<boolean>(this.getUrl(\`\${id}\`), {});
  }`;

/**
 * Expected output for PATCH /api/Claim/{id}
 * Tests: PATCH with path parameter and body
 */
export const PATCH_MODEL_BY_ID_METHOD = `patchClaimById(id: number, body: IClaimDetailDTO): Observable<IClaimDetailDTO> {
    return this.httpClient.patch<IClaimDetailDTO>(this.getUrl(\`\${id}\`), body);
  }`;

/**
 * Expected output for PUT /api/Claim/{id} with body
 * Tests: PUT with path parameter AND body
 */
export const PUT_MODEL_BY_ID_WITH_BODY_METHOD = `updateClaimById(id: number, body: IClaimDetailDTO): Observable<IClaimDetailDTO> {
    return this.httpClient.put<IClaimDetailDTO>(this.getUrl(\`\${id}\`), body);
  }`;

/**
 * Expected output for POST /api/Claim/all (no path params)
 * Tests: POST without path params, just body
 */
export const POST_WITHOUT_PATH_PARAMS_METHOD = `postClaimAll(body: ICompanySearchDTO): Observable<IClaimDetailDTO> {
    return this.httpClient.post<IClaimDetailDTO>(this.getUrl(\`all\`), body);
  }`;
