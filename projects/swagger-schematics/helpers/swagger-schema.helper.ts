import { ISwaggerSchema } from '../interfaces/version_3_1/swagger.interface';
import { describeErrorChain } from './error-logging.helper';

export async function fetchSwaggerSchema(url: string): Promise<ISwaggerSchema> {
    console.info(`[swagger-schematics] Fetching swagger schema from '${url}'`);

    let response: Response;
    try {
        response = await fetch(url);
    } catch (error) {
        // fetch failures ("fetch failed") hide the real network reason in error.cause
        const wrapped = new Error(`Failed to fetch swagger schema from '${url}': ${describeErrorChain(error)}`);
        (wrapped as Error & { cause?: unknown }).cause = error;
        throw wrapped;
    }

    if (!response.ok) {
        throw new Error(`Failed to load swagger schema from '${url}': ${response.status} ${response.statusText}`);
    }

    try {
        return await response.json() as ISwaggerSchema;
    } catch (error) {
        const wrapped = new Error(`Failed to parse swagger schema from '${url}' as JSON: ${describeErrorChain(error)}`);
        (wrapped as Error & { cause?: unknown }).cause = error;
        throw wrapped;
    }
}
