/**
 * Expected output for DELETE /api/Claim/deletemany
 * Tests: deleteClaimDeletemany method with array body
 */
export const DELETE_MANY_ARRAY_OF_IDS_METHOD = `deleteClaimDeletemany(body: number[]): Observable<boolean> {
    return this.httpClient.delete<boolean>(this.getUrl('deletemany'), { body });
  }`;
