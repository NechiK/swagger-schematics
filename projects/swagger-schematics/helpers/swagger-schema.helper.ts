import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ISwaggerSchema } from '../interfaces/version_3_1/swagger.interface';
import { describeErrorChain } from './error-logging.helper';

function isHttpUrl(source: string): boolean {
    return /^https?:\/\//i.test(source);
}

function isFileUrl(source: string): boolean {
    return /^file:\/\//i.test(source);
}

/**
 * Loads the swagger schema from an http(s) URL, a file:// URL, or a local
 * file path (absolute, or relative to the current working directory).
 */
export async function fetchSwaggerSchema(source: string): Promise<ISwaggerSchema> {
    if (isHttpUrl(source)) {
        return fetchSwaggerSchemaFromUrl(source);
    }
    return readSwaggerSchemaFromFile(source);
}

async function fetchSwaggerSchemaFromUrl(url: string): Promise<ISwaggerSchema> {
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

function readSwaggerSchemaFromFile(source: string): ISwaggerSchema {
    const filePath = isFileUrl(source)
        ? fileURLToPath(source)
        : path.resolve(process.cwd(), source);

    console.info(`[swagger-schematics] Reading swagger schema from file '${filePath}'`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Swagger schema file not found: '${filePath}' (resolved from '${source}'). ` +
            `Provide an http(s) URL or a path to an existing JSON file, relative to the project root.`);
    }

    let content: string;
    try {
        content = fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        const wrapped = new Error(`Failed to read swagger schema file '${filePath}': ${describeErrorChain(error)}`);
        (wrapped as Error & { cause?: unknown }).cause = error;
        throw wrapped;
    }

    try {
        return JSON.parse(content) as ISwaggerSchema;
    } catch (error) {
        const wrapped = new Error(`Failed to parse swagger schema file '${filePath}' as JSON: ${describeErrorChain(error)}`);
        (wrapped as Error & { cause?: unknown }).cause = error;
        throw wrapped;
    }
}
