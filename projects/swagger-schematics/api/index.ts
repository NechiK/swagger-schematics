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
import { parseName } from '@schematics/angular/utility/parse-name';
import { ISwaggerSchema } from '../interfaces/version_3_1/swagger.interface';
import { fetchSwaggerSchema } from '../helpers/swagger-schema.helper';
import { SwaggerApiSchema } from './schema';
import { transformSwaggerSchema } from './helpers/api.helper';
import { transformRefsToImport } from '../types/helpers/template.helper';
import { getOpenapiSchematicsConfig } from '../helpers/config';
import { FRAMEWORK_CONFIGS, TFrameworkType } from '../interfaces/swagger-schematics/framework';
import { buildAngularHttpCallArgs } from './helpers/angular-template.helper';
import { getBaseApiImportPath } from './helpers/import-path.helper';
import { generateBaseApiRule, DEFAULT_RTK_BASE_API_PATH } from './helpers/base-api-rules';
import { createEslintFixRule } from '../helpers/eslint-fix.helper';
import { detectOpenApiVersion } from '../helpers/openapi-version.helper';
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
        delete require.cache[require.resolve(absolutePath)];
        const helpers = require(absolutePath);
        return helpers.default || helpers;
    } catch (error) {
        throw new Error(`Failed to load template helpers from '${helpersPath}': ${(error as Error).message}`);
    }
}

export default function(options: SwaggerApiSchema) {
    return async (tree: Tree, context: SchematicContext) => {
        const config = getOpenapiSchematicsConfig(options);

        if (!config.path) {
            throw new SchematicsException(`Path for API services is not defined in the configuration.`);
        }

        if (!config.framework) {
            throw new SchematicsException(`Framework is not defined in the configuration. Please set 'framework' to 'angular' or 'react-rtk'.`);
        }

        const framework = config.framework;
        const frameworkConfig = FRAMEWORK_CONFIGS[framework as TFrameworkType];

        const swagger: ISwaggerSchema = await fetchSwaggerSchema(config.swaggerSchemaUrl as string);

        const versionInfo = detectOpenApiVersion(swagger);
        if (versionInfo.warning) {
            context.logger.warn(versionInfo.warning);
        }

        const parsedApiSchemas = transformSwaggerSchema(swagger, {
            typeMapping: config.typeMapping
        });

        // Select templates based on framework
        const apiServiceTemplates = url(config.apiServiceTemplatePath || frameworkConfig.templates.apiService);
        const baseApiTemplates = url(config.baseApiTemplatePath || frameworkConfig.templates.baseApi);

        let finalRule: Rule | undefined;

        Object.keys(parsedApiSchemas).forEach(apiSchemaKey => {
            const parsed = parseName(config.path!, apiSchemaKey);
            
            // Determine API file path and base API path
            const baseApiPath = config.baseApiPath || (framework === 'react-rtk' ? DEFAULT_RTK_BASE_API_PATH : `${config.path}/_api-base.service.ts`);
            const apiFileExt = framework === 'react-rtk' ? '.api.ts' : '-api.service.ts';
            const apiFilePath = `${config.path}/${strings.dasherize(apiSchemaKey)}${apiFileExt}`;

            // Load custom template helpers if provided
            const customHelpers = config.templateHelpersPath 
                ? loadTemplateHelpers(config.templateHelpersPath)
                : {};

            // Common template context
            const templateContext: Record<string, unknown> = {
                ...config,
                ...strings,
                transformRefsToImport,
                name: apiSchemaKey,
                apiList: parsedApiSchemas[apiSchemaKey].apiList,
                importRefs: parsedApiSchemas[apiSchemaKey].importRefs,
                scopeEndpointsWithTags: config.scopeEndpointsWithTags || false,
                baseApiImportPath: getBaseApiImportPath(tree, apiFilePath, baseApiPath),
                ...customHelpers,
            };

            // Add framework-specific helpers
            if (framework === 'angular') {
                Object.assign(templateContext, {
                    buildHttpCallArgs: buildAngularHttpCallArgs,
                });
            }

            const itemSource = apply(apiServiceTemplates, [
                applyTemplates(templateContext),
                move(parsed.path)
            ]);

            finalRule = finalRule
                ? chain([finalRule, mergeWith(itemSource, MergeStrategy.Overwrite)])
                : chain([mergeWith(itemSource, MergeStrategy.Overwrite)]);
        });

        // Generate base API files (skip if they already exist)
        const baseApiRule = generateBaseApiRule(tree, framework, config, baseApiTemplates);
        if (baseApiRule) {
            finalRule = finalRule
                ? chain([finalRule, baseApiRule])
                : chain([baseApiRule]);
        }

        const eslintFixRule = createEslintFixRule(config);
        return finalRule ? chain([finalRule, eslintFixRule]) : eslintFixRule;
    };
}
