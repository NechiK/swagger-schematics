import { IParsedApiItem } from "../../types/utils/params";

/**
 * Generates the parameters string for an HttpClient method call.
 * @param apiItem - The parsed API item containing method details
 * @returns A string of comma-separated parameters for the HttpClient call
 */
export function getHttpClientCallParams(apiItem: IParsedApiItem): string {
    // Always use backticks for URL template consistency
    const itemApiUrl = `\`${apiItem.apiUrl}\``;
    const apiCallParams: string[] = [
        `this.getUrl(${itemApiUrl})`
    ];

    if (['post', 'put', 'patch'].includes(apiItem.apiMethodType)) {
        apiCallParams.push(apiItem.bodyParam ? apiItem.bodyParam.objectSymbol : '{}');
    } else if (['delete'].includes(apiItem.apiMethodType)) {
        apiCallParams.push(apiItem.bodyParam ? `{ ${apiItem.bodyParam.objectSymbol} }` : '{}');
    }

    if (apiItem.queryParams.length > 0) {
        const queryParams = apiItem.queryParams.map(param => `${param.objectSymbol}`).join(', ');
        apiCallParams.push(`{ params: { ${queryParams} } }`);
    }

    return apiCallParams.join(', ');
}

/**
 * @deprecated Use the template directly with getHttpClientCallParams instead.
 * Converts an API item to a template string representation.
 */
export function apiToTemplate(apiItem: IParsedApiItem, indentString: string = '  '): string {
    const apiCallParams = getHttpClientCallParams(apiItem);
    const methodDefinition = `${apiItem.apiMethodName}(${apiItem.apiMethodParams}): Observable<${apiItem.responseTypeSymbol}> {`;
    const methodBody = `${indentString}${indentString}return this.httpClient.${apiItem.requestMethod}<${apiItem.responseTypeSymbol}>(${apiCallParams});`;
    const methodEnd = `${indentString}}`;
    return `${methodDefinition}\n${methodBody}\n${methodEnd}`;
}