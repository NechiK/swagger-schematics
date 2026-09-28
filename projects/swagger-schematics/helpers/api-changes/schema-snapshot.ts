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

/**
 * The schema as fetched, in the document's own key order: the generated code depends on it
 * (e.g. the first `content` media type, the order of properties in an intersection), so the
 * snapshot must read back into the same model the current schema builds. A key named
 * `__proto__` (legal in JSON) is an own property after JSON.parse and is kept.
 */
export function serializeSchemaSnapshot(schema: ISwaggerSchema): string {
    return JSON.stringify(schema, null, 2) + '\n';
}

export function writeTextFile(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}
