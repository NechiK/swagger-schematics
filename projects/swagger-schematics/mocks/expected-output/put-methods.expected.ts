/**
 * Expected output for PUT /api/Claim/status
 * Tests: updateClaimStatus method with integer body, no path params
 */
export const PUT_MODEL_WITH_INTEGER_BODY_METHOD = `updateClaimStatus(body: number): Observable<void> {
    return this.httpClient.put<void>(this.getUrl(\`status\`), body);
  }`;

/**
 * Expected output for PUT /api/Claim/{id}/reactivate
 * Tests: updateClaimByIdReactivate method with path param and empty body
 */
export const PUT_MODEL_WITH_EMPTY_BODY_METHOD = `updateClaimByIdReactivate(id: number): Observable<void> {
    return this.httpClient.put<void>(this.getUrl(\`\${id}/reactivate\`), {});
  }`;
