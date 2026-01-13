import { IParsedApiItem } from '../../types/utils/params';

/**
 * Build Angular HttpClient call arguments (everything after the URL)
 * Handles the different argument patterns for GET, POST, PUT, DELETE
 */
export function buildAngularHttpCallArgs(item: IParsedApiItem): string {
    const { apiMethodType, bodyFormatted, queryParamsFormatted } = item;
    const parts: string[] = [];

    if (apiMethodType === 'post' || apiMethodType === 'put') {
        // POST/PUT: body is second argument, options object is third
        parts.push(bodyFormatted || 'null');
        if (queryParamsFormatted) {
            parts.push(`{ ${queryParamsFormatted} }`);
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
        if (options.length > 0) {
            parts.push(`{ ${options.join(', ')} }`);
        }
    } else {
        // GET, HEAD, etc: options object with params
        if (queryParamsFormatted) {
            parts.push(`{ ${queryParamsFormatted} }`);
        }
    }

    return parts.join(',\n      ');
}
