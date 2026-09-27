import { IParsedApiItem } from '../../types/utils/params';

/**
 * The arguments after the URL for HttpClient's shorthand methods, whose signatures differ:
 * post/put/patch take (url, body, options), get/head/options/delete take (url, options).
 */
function buildShorthandCallArgs(item: IParsedApiItem): string[] {
    const { apiMethodType, bodyFormatted, queryParamsFormatted, headerParamsFormatted, isBinaryResponse } = item;
    const parts: string[] = [];
    // Binary responses need responseType: 'blob' in the options object
    const responseTypeFormatted = isBinaryResponse ? `responseType: 'blob'` : '';

    if (apiMethodType === 'post' || apiMethodType === 'put' || apiMethodType === 'patch') {
        // POST/PUT/PATCH: body is second argument, options object is third
        parts.push(bodyFormatted || 'null');
        const options = [queryParamsFormatted, headerParamsFormatted, responseTypeFormatted].filter(Boolean);
        if (options.length > 0) {
            parts.push(`{ ${options.join(', ')} }`);
        }
    } else if (apiMethodType === 'delete') {
        // DELETE: options object with body and params
        const options: string[] = [];
        if (bodyFormatted) {
            options.push(`body: ${bodyFormatted}`);
        }
        if (queryParamsFormatted) {
            options.push(queryParamsFormatted);
        }
        if (headerParamsFormatted) {
            options.push(headerParamsFormatted);
        }
        if (responseTypeFormatted) {
            options.push(responseTypeFormatted);
        }
        if (options.length > 0) {
            parts.push(`{ ${options.join(', ')} }`);
        }
    } else {
        // GET, HEAD, etc: options object with params
        const options = [queryParamsFormatted, headerParamsFormatted, responseTypeFormatted].filter(Boolean);
        if (options.length > 0) {
            parts.push(`{ ${options.join(', ')} }`);
        }
    }

    return parts;
}

/** HttpClient methods whose shorthand takes the request body (the argument after the URL). */
const BODY_METHODS = ['post', 'put', 'patch'];

/**
 * The whole Angular HttpClient call: the method to call and every argument, URL included.
 *
 * HttpClient has no `trace()`, and its `get()`, `head()` and `options()` take no body, so a
 * TRACE operation, or a GET, HEAD or OPTIONS operation that declares a request body, goes
 * through `request(method, url, { body, params, headers })` instead of dropping the body.
 * Everything else uses the shorthand method (`get`, `post`, ...).
 */
export function buildAngularHttpCall(item: IParsedApiItem): { method: string; args: string[] } {
    const url = `this.getUrl(${item.apiUrlFormatted})`;
    const needsRequest = item.apiMethodType === 'trace'
        || (!!item.bodyParam && !BODY_METHODS.includes(item.apiMethodType) && item.apiMethodType !== 'delete');
    if (!needsRequest) {
        return { method: item.requestMethod, args: [url, ...buildShorthandCallArgs(item)] };
    }
    const options = [
        item.bodyParam ? `body: ${item.bodyFormatted}` : '',
        item.queryParamsFormatted,
        item.headerParamsFormatted,
        item.isBinaryResponse ? `responseType: 'blob'` : ''
    ].filter(Boolean);
    return {
        method: 'request',
        args: [`'${item.httpMethod}'`, url, ...(options.length ? [`{ ${options.join(', ')} }`] : [])]
    };
}

