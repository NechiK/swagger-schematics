import { ISwaggerSchema } from '../interfaces/version_3_1/swagger.interface';

export async function fetchSwaggerSchema(url: string): Promise<ISwaggerSchema> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load swagger schema from '${url}': ${response.status} ${response.statusText}`);
    }

    return await response.json() as ISwaggerSchema;
}
