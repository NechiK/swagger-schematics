import { Tree } from '@angular-devkit/schematics';
import { loadTsConfig, resolvePathToAlias, normalizePath } from '../../helpers/tsconfig';
import * as path from 'path';

/**
 * Calculate relative import path from source file to target file
 * Both paths should be relative paths within the workspace (can start with / or not)
 */
export function getRelativeImportPath(fromFilePath: string, toFilePath: string): string {
    // Normalize paths - ensure they start with / for consistent handling
    const normalizeWorkspacePath = (p: string) => p.startsWith('/') ? p : '/' + p;
    
    const fromDir = path.posix.dirname(normalizeWorkspacePath(fromFilePath));
    const toFileWithoutExt = normalizeWorkspacePath(toFilePath).replace(/\.ts$/, '');
    
    let relativePath = path.posix.relative(fromDir, toFileWithoutExt);
    
    // Ensure the path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
    }
    
    return relativePath;
}

/**
 * Get import path for RTK base API, using tsconfig path aliases if available
 */
export function getRtkBaseApiImportPath(
    tree: Tree,
    apiFilePath: string,
    baseApiPath: string
): string {
    // Try to load tsconfig and resolve to alias
    try {
        const { paths } = loadTsConfig('tsconfig.json', tree);
        const normalizedBaseApiPath = normalizePath(baseApiPath).replace(/\.ts$/, '');
        const aliasPath = resolvePathToAlias(normalizedBaseApiPath, paths);
        
        if (aliasPath) {
            return aliasPath;
        }
    } catch {
        // Ignore errors, fall back to relative path
    }
    
    // Fall back to relative import
    return getRelativeImportPath(apiFilePath, baseApiPath);
}
