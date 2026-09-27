import { IParsedApiItem } from '../../types/utils/params';

/**
 * Build Angular HttpClient call arguments (everything after the URL)
 * Handles the different argument patterns for GET, POST, PUT, PATCH, DELETE
 * Returns an array of argument strings for flexible template formatting
 */
export function buildAngularHttpCallArgs(item: IParsedApiItem): string[] {
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
