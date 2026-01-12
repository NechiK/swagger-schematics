import { IParsedApiItem } from "../../types/utils/params";

export function apiToTemplate(apiItem: IParsedApiItem, indentString: string = '  '): string {
    const apiCallParams = apiItemToHttpClientMethodCallParams(apiItem);
    const methodDefinition = `${apiItem.apiMethodName}(${apiItem.apiMethodParams}): Observable<${apiItem.responseTypeSymbol}> {`;
    const methodBody = `${indentString}${indentString}return this.httpClient.${apiItem.requestMethod}<${apiItem.responseTypeSymbol}>(${apiCallParams});`;
    const methodEnd = `${indentString}}`;
    return `${methodDefinition}\n${methodBody}\n${methodEnd}`;
}

export function apiItemToHttpClientMethodCallParams(apiItem: IParsedApiItem): string {
    const itemApiUrl = apiItem.apiUrl.includes('$') ? `\`${apiItem.apiUrl}\`` : `'${apiItem.apiUrl}'`;
    const apiCallParams: string[] = [
        `this.getUrl(${itemApiUrl})`
    ];

    const hasQueryParams = apiItem.queryParams.length > 0;
    const queryParamsStr = hasQueryParams
        ? `params: { ${apiItem.queryParams.map(param => param.objectSymbol).join(', ')} }`
        : '';

    if (['post', 'put'].includes(apiItem.apiMethodType)) {
        apiCallParams.push(apiItem.bodyParam ? apiItem.bodyParam.objectSymbol : '{}');
        if (hasQueryParams) {
            apiCallParams.push(`{ ${queryParamsStr} }`);
        }
    } else if (['delete'].includes(apiItem.apiMethodType)) {
        // DELETE uses options object for both body and params
        const bodyStr = apiItem.bodyParam ? apiItem.bodyParam.objectSymbol : '';
        if (bodyStr || hasQueryParams) {
            const options = [bodyStr, queryParamsStr].filter(Boolean).join(', ');
            apiCallParams.push(`{ ${options} }`);
        }
    } else if (hasQueryParams) {
        // GET and other methods
        apiCallParams.push(`{ ${queryParamsStr} }`);
    }

    return apiCallParams.join(', ');
}