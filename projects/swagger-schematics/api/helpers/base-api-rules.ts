import {
    apply,
    applyTemplates,
    filter,
    mergeWith,
    move,
    noop,
    Rule,
    SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics';
import { SwaggerApiSchema } from '../schema';
import { strings } from '@angular-devkit/core';
import { parseName } from '@schematics/angular/utility/parse-name';

// Default base API paths
export const DEFAULT_RTK_BASE_API_PATH = 'th-common/store/api-base.ts';

/**
 * Generate base API files only if they don't already exist
 */
export function generateBaseApiRule(
    tree: Tree,
    framework: string,
    config: SwaggerApiSchema,
    baseApiTemplates: ReturnType<typeof url>
): Rule | null {
    if (framework === 'angular') {
        return generateAngularBaseApiRule(tree, config, baseApiTemplates);
    } else if (framework === 'react-rtk') {
        return generateRtkBaseApiRule(tree, config, baseApiTemplates);
    }
    return null;
}

/**
 * Generate Angular base API services (api-base.service.ts and api-base-url.token.ts)
 * Only generates files that don't already exist.
 */
function generateAngularBaseApiRule(
    tree: Tree,
    config: SwaggerApiSchema,
    baseApiTemplates: ReturnType<typeof url>
): Rule {
    const basePath = config.baseApiPath || config.path;
    if (!basePath) {
        throw new SchematicsException(`Base API path is not defined in the configuration.`);
    }

    const parsed = parseName(basePath, 'ApiBase');
    
    // Check which base API files already exist
    const apiBaseServicePath = `${parsed.path}/_api-base.service.ts`;
    const apiBaseUrlTokenPath = `${parsed.path}/_api-base-url.token.ts`;
    
    const apiBaseServiceExists = tree.exists(apiBaseServicePath);
    const apiBaseUrlTokenExists = tree.exists(apiBaseUrlTokenPath);
    
    // If both files exist, skip generation entirely
    if (apiBaseServiceExists && apiBaseUrlTokenExists) {
        return noop();
    }

    // Build a set of existing file names to filter out (with .template suffix for template matching)
    const existingTemplateFiles = new Set<string>();
    if (apiBaseServiceExists) {
        existingTemplateFiles.add('_api-base.service.ts.template');
    }
    if (apiBaseUrlTokenExists) {
        existingTemplateFiles.add('_api-base-url.token.ts.template');
    }

    // Generate only the missing base API files
    const baseApiSource = apply(baseApiTemplates, [
        // Filter out templates for files that already exist
        // Note: filter runs BEFORE applyTemplates, so paths still have .template suffix
        filter(path => {
            const fileName = path.split('/').pop() || '';
            return !existingTemplateFiles.has(fileName);
        }),
        applyTemplates({
            ...config,
            ...strings,
        }),
        move(parsed.path)
    ]);

    return mergeWith(baseApiSource);
}

/**
 * Generate RTK base API (api-base.ts)
 * Only generates the file if it doesn't already exist.
 */
function generateRtkBaseApiRule(
    tree: Tree,
    config: SwaggerApiSchema,
    baseApiTemplates: ReturnType<typeof url>
): Rule {
    const baseApiPath = config.baseApiPath || DEFAULT_RTK_BASE_API_PATH;
    
    // Check if base API file already exists
    if (tree.exists(baseApiPath)) {
        return noop();
    }

    // Parse path to get directory and filename
    const pathParts = baseApiPath.split('/');
    const fileName = pathParts.pop() || 'api-base.ts';
    const dirPath = pathParts.join('/');
    
    const parsed = parseName(dirPath, fileName.replace('.ts', ''));

    // Generate base API file (file is guaranteed not to exist at this point)
    const baseApiSource = apply(baseApiTemplates, [
        applyTemplates({
            ...config,
            ...strings,
        }),
        move(parsed.path)
    ]);

    return mergeWith(baseApiSource);
}
