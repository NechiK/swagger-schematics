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

    if (['post', 'put'].includes(apiItem.apiMethodType)) {
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