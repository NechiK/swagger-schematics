import {
    apply,
    applyTemplates,
    chain,
    MergeStrategy,
    mergeWith,
    move,
    Rule,
    SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { parseName } from '@schematics/angular/utility/parse-name';
import { ISwaggerSchema } from '../interfaces/version_3_1/swagger.interface';
import axios, { AxiosResponse } from 'axios';
import { transformSwaggerSchema } from './helpers/api.helper';
import { transformRefsToImport } from '../types/helpers/template.helper';
import { getOpenapiSchematicsConfig } from '../helpers/config';
import { FRAMEWORK_CONFIGS, TFrameworkType } from '../interfaces/swagger-schematics/framework';
import { buildAngularHttpCallArgs } from './helpers/angular-template.helper';
import { getRtkBaseApiImportPath } from './helpers/import-path.helper';
import { generateBaseApiRule, DEFAULT_RTK_BASE_API_PATH } from './helpers/base-api-rules';

export default function(options: SwaggerApiSchema) {
    return async (tree: Tree) => {
        const config = getOpenapiSchematicsConfig(options);

        if (!config.path) {
            throw new SchematicsException(`Path for API services is not defined in the configuration.`);
        }

        if (!config.framework) {
            throw new SchematicsException(`Framework is not defined in the configuration. Please set 'framework' to 'angular' or 'react-rtk'.`);
        }

        const framework = config.framework;
        const frameworkConfig = FRAMEWORK_CONFIGS[framework as TFrameworkType];

        const swagger: AxiosResponse<ISwaggerSchema> = await axios.get(config.swaggerSchemaUrl as string);

        const parsedApiSchemas = transformSwaggerSchema(swagger.data, {
            typeMapping: config.typeMapping
        });

        // Select templates based on framework
        const apiServiceTemplates = url(config.apiServiceTemplatePath || frameworkConfig.templates.apiService);
        const baseApiTemplates = url(config.baseApiTemplatePath || frameworkConfig.templates.baseApi);

        let finalRule: Rule | undefined;

        Object.keys(parsedApiSchemas).forEach(apiSchemaKey => {
            const parsed = parseName(config.path!, apiSchemaKey);
            
            // Common template context
            const templateContext: Record<string, unknown> = {
                ...config,
                ...strings,
                transformRefsToImport,
                name: apiSchemaKey,
                apiList: parsedApiSchemas[apiSchemaKey].apiList,
                importRefs: parsedApiSchemas[apiSchemaKey].importRefs,
            };

            // Add framework-specific helpers
            if (framework === 'react-rtk') {
                const baseApiPath = config.baseApiPath || DEFAULT_RTK_BASE_API_PATH;
                const apiFilePath = `${config.path}/${strings.dasherize(apiSchemaKey)}.api.ts`;
                
                Object.assign(templateContext, {
                    scopeEndpointsWithTags: config.scopeEndpointsWithTags || false,
                    rtkBaseApiImportPath: getRtkBaseApiImportPath(tree, apiFilePath, baseApiPath),
                });
            } else {
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

        return finalRule;
    };
}
