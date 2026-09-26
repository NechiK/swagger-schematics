import * as fs from 'fs';
import * as path from 'path';
import { ISwaggerSchema } from '../../interfaces/version_3_1/swagger.interface';

/**
 * Resolves a path given relative to the project root. A leading '/' means the
 * project root too, matching how the `path` option is written.
 */
export function resolveProjectPath(projectPath: string): string {
    return path.resolve(process.cwd(), projectPath.replace(/^\/+/, ''));
}

/** Result of reading the previous snapshot: the schema, or why there is none. */
export type TSnapshotRead =
    | { schema: ISwaggerSchema }
    | { schema: null; reason: 'missing' | 'invalid'; error?: string };

export function readSchemaSnapshot(filePath: string): TSnapshotRead {
    if (!fs.existsSync(filePath)) {
        return { schema: null, reason: 'missing' };
    }
    try {
        return { schema: JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ISwaggerSchema };
    } catch (error) {
        return { schema: null, reason: 'invalid', error: (error as Error).message };
    }
}

/** Recursively sorts object keys (array order is kept), so the file only changes when the schema does. */
function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (value && typeof value === 'object') {
        // Null prototype: a key named `__proto__` (legal in JSON) stays an own property instead of
        // replacing the object's prototype and vanishing from the snapshot
        return Object.keys(value as Record<string, unknown>).sort().reduce((sorted, key) => {
            sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
            return sorted;
        }, Object.create(null) as Record<string, unknown>);
    }
    return value;
}

export function serializeSchemaSnapshot(schema: ISwaggerSchema): string {
    return JSON.stringify(sortKeys(schema), null, 2) + '\n';
}

export function writeTextFile(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}
