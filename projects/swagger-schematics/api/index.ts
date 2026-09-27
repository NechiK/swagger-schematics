import {
    apply,
    applyTemplates,
    chain,
    MergeStrategy,
    mergeWith,
    move,
    Rule,
    SchematicContext,
    SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { createRequire } from 'module';
import { parseName } from '@schematics/angular/utility/parse-name';
import { ISwaggerSchema } from '../interfaces/version_3_1/swagger.interface';
import { fetchSwaggerSchema } from '../helpers/swagger-schema.helper';
import { SwaggerApiSchema } from './schema';
import { buildCacheTags, documentDeclaresOperations, findUnmatchedIncludePatterns, transformSwaggerSchema } from './helpers/api.helper';
import { transformRefsToImport } from '../types/helpers/template.helper';
import { renderJsDoc } from '../types/utils/js-doc';
import { getOpenapiSchematicsConfig } from '../helpers/config';
import { FRAMEWORK_CONFIGS, resolveFramework } from '../interfaces/swagger-schematics/framework';
import { buildAngularHttpCallArgs, buildAngularHttpCall } from './helpers/angular-template.helper';
import { getBaseApiImportPath, resolveAngularBaseApiDir } from './helpers/import-path.helper';
import { generateBaseApiRule, DEFAULT_RTK_BASE_API_PATH } from './helpers/base-api-rules';
import { createEslintFixRule } from '../helpers/eslint-fix.helper';
import { detectOpenApiVersion } from '../helpers/openapi-version.helper';
import { wrapRuleWithErrorLogging } from '../helpers/error-logging.helper';
import { createStaleFilesRule, recordGeneratedFiles } from '../helpers/generated-files-manifest.helper';
import * as path from 'path';

import { existsSync } from 'fs';

/**
 * Load custom template helpers from a JavaScript file
 */
function loadTemplateHelpers(helpersPath: string): Record<string, unknown> {
    const absolutePath = path.resolve(process.cwd(), helpersPath);
    
    // Check if file exists first
    if (!existsSync(absolutePath)) {
        throw new Error(`Template helpers file not found: '${absolutePath}'`);
    }
    
    try {
        // Clear require cache to ensure fresh load
        const helperRequire = createRequire(__filename);
        delete helperRequire.cache[helperRequire.resolve(absolutePath)];
        const helpers = helperRequire(absolutePath);
        return helpers.default || helpers;
    } catch (error) {
        throw new Error(`Failed to load template helpers from '${helpersPath}': ${(error as Error).message}`);
    }
}

/**
 * Generates `_provide-api.ts` (a standalone `provideApi({ baseUrl })`) next to
 * the Angular base files. It builds on the API_BASE_URL token, so it is only
 * generated when `_api-base-url.token.ts` exists; a custom base template
 * without the token gets no provider rather than one that doesn't compile.
 * Runs after the base API rule, so a token created in this run counts.
 *
 * Like the base files it is not recorded in the stale-files manifest: it does
 * not come from the schema, and counting it would defeat the "a schema that
 * produced nothing deletes nothing" safety net.
 */
function createProvideApiRule(baseApiDir: string): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const tokenPath = `${baseApiDir}/_api-base-url.token.ts`;
        const providerPath = `${baseApiDir}/_provide-api.ts`;
        if (!tree.exists(tokenPath)) {
            // A provider from an earlier run would now import a missing token and break the build.
            // Only ours is removed: it is the file that imports that token.
            const previousProvider = tree.read(providerPath)?.toString();
            if (previousProvider?.includes(`from './_api-base-url.token'`)) {
                tree.delete(providerPath);
                context.logger.info(`provideApi: ${tokenPath} not found, so the previously generated ${providerPath} is removed.`);
            } else {
                context.logger.info(`provideApi: ${tokenPath} not found, so _provide-api.ts is not generated.`);
            }
            return;
        }
        return mergeWith(apply(url('./templates/angular/provider'), [
            applyTemplates({}),
            move(baseApiDir)
        ]), MergeStrategy.Overwrite);
    };
}

export default function(options: SwaggerApiSchema) {
    const apiRule: Rule = async (tree: Tree, context: SchematicContext) => {
        const config = getOpenapiSchematicsConfig(options);

        if (!config.path) {
            throw new SchematicsException(`Path for API services is not defined in the configuration.`);
        }

        const framework = resolveFramework(config.framework);
        const frameworkConfig = FRAMEWORK_CONFIGS[framework];

        const swagger: ISwaggerSchema = await fetchSwaggerSchema(config.swaggerSchemaUrl as string);

        const versionInfo = detectOpenApiVersion(swagger);
        if (versionInfo.warning) {
            context.logger.warn(versionInfo.warning);
        }

        const parsedApiSchemas = transformSwaggerSchema(swagger, {
            typeMapping: config.typeMapping,
            legacyOptionalProperties: config.legacyOptionalProperties,
            apiPathKey: config.apiPathKey,
            includeApis: config.includeApis,
            excludeApis: config.excludeApis,
            excludeDeprecated: config.excludeDeprecated
        });

        // Select templates based on framework
        const apiServiceTemplates = url(config.apiServiceTemplatePath || frameworkConfig.templates.apiService);
        const baseApiTemplates = url(config.baseApiTemplatePath || frameworkConfig.templates.baseApi);

        // Loop-invariant: the base API location, file extension, and custom
        // helpers depend only on the config, so resolve (and require) them once
        // instead of per controller.
        // For Angular the canonical base service file always lives in the
        // resolved directory, so the writer and this import computation agree.
        const baseApiPath = framework === 'react-rtk'
            ? (config.baseApiPath || DEFAULT_RTK_BASE_API_PATH)
            : `${config.baseApiPath ? resolveAngularBaseApiDir(config.baseApiPath) : config.path}/_api-base.service.ts`;
        const apiFileExt = framework === 'react-rtk' ? '.api.ts' : '-api.service.ts';
        const customHelpers = config.templateHelpersPath
            ? loadTemplateHelpers(config.templateHelpersPath)
            : {};

        const rules: Rule[] = [];
        const generatedFiles = new Set<string>();

        // RTK cache tags: one TApiTag member per slice, generated into `path`
        if (config.rtkCacheTags && framework !== 'react-rtk') {
            context.logger.warn(`rtkCacheTags applies to framework 'react-rtk' only; ignored for '${framework}'.`);
        }
        const useCacheTags = !!config.rtkCacheTags && framework === 'react-rtk';
        const cacheTags = buildCacheTags(Object.keys(parsedApiSchemas));
        // No slices, no enum: an empty schema must generate nothing (see the stale-files safety net)
        if (useCacheTags && cacheTags.size) {
            const cacheTagsSource = apply(url('./templates/react-rtk/cache-tags'), [
                applyTemplates({ cacheTags: [...cacheTags.values()] }),
                move(config.path),
                recordGeneratedFiles(generatedFiles)
            ]);
            rules.push(mergeWith(cacheTagsSource, MergeStrategy.Overwrite));
        }

        Object.keys(parsedApiSchemas).forEach(apiSchemaKey => {
            const parsed = parseName(config.path!, apiSchemaKey);
            const apiFilePath = `${config.path}/${strings.dasherize(apiSchemaKey)}${apiFileExt}`;

            // Common template context
            const templateContext: Record<string, unknown> = {
                ...config,
                ...strings,
                transformRefsToImport,
                renderJsDoc,
                name: apiSchemaKey,
                apiList: parsedApiSchemas[apiSchemaKey].apiList,
                importRefs: parsedApiSchemas[apiSchemaKey].importRefs,
                scopeEndpointsWithTags: config.scopeEndpointsWithTags || false,
                // The slice's TApiTag member (e.g. 'Orders'), or null when rtkCacheTags is off
                cacheTag: useCacheTags ? cacheTags.get(apiSchemaKey) : null,
                baseApiImportPath: getBaseApiImportPath(tree, apiFilePath, baseApiPath),
                ...customHelpers,
            };

            // Add framework-specific helpers
            if (framework === 'angular') {
                Object.assign(templateContext, {
                    buildHttpCallArgs: buildAngularHttpCallArgs,
                    buildHttpCall: buildAngularHttpCall,
                });
            }

            const itemSource = apply(apiServiceTemplates, [
                applyTemplates(templateContext),
                move(parsed.path),
                recordGeneratedFiles(generatedFiles)
            ]);

            rules.push(mergeWith(itemSource, MergeStrategy.Overwrite));
        });

        // Generate base API files (skip if they already exist)
        const baseApiRule = generateBaseApiRule(tree, framework, config, baseApiTemplates);
        if (baseApiRule) {
            rules.push(baseApiRule);
        }

        // Angular: provideApi() next to the base files, regenerated every run
        if (framework === 'angular') {
            rules.push(createProvideApiRule(baseApiPath.replace(/\/[^/]*$/, '')));
        }

        const eslintFixRule = createEslintFixRule(config);
        // An includeApis entry matching nothing is likely a typo; if the filters then leave nothing
        // to generate, keep the services rather than deleting all of them
        const unmatchedIncludes = findUnmatchedIncludePatterns(swagger, config.includeApis, config.apiPathKey);
        const staleFilesRule = createStaleFilesRule({
            section: 'api',
            outputPath: config.path,
            generatedFiles,
            remove: config.removeStaleFiles !== false,
            // Filters that exclude every API are a choice, not a broken schema: their services go
            emptyIsIntended: documentDeclaresOperations(swagger, config.apiPathKey) && !unmatchedIncludes.length,
            emptyHint: unmatchedIncludes.length
                ? `includeApis entries ${unmatchedIncludes.map(pattern => `'${pattern}'`).join(', ')} match no API: check them for typos.`
                : undefined,
            ownedFilePatterns: [{ dir: config.path, suffixes: [apiFileExt], exclude: [baseApiPath] }]
        });
        return chain([...rules, eslintFixRule, staleFilesRule]);
    };

    return wrapRuleWithErrorLogging('api', apiRule);
}
