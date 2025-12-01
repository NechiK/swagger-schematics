/**
 * Expected output for GET /api/Claim/{id}
 * Tests: getById method generation
 */
export const GET_MODEL_BY_ID_METHOD = `getById(id: number): Observable<IClaimDetailDTO> {
    return this.httpClient.get<IClaimDetailDTO>(this.getUrl(\`\${id}\`));
  }`;
