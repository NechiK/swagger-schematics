import {
    apply,
    applyTemplates, chain,
    MergeStrategy,
    mergeWith,
    move, Rule, SchematicsException,
    url
} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';
import {parseName} from '@schematics/angular/utility/parse-name';
import {ISwaggerSchema} from "../interfaces/version_3_1/swagger.interface";
import axios, {AxiosResponse} from "axios";
import { transformSwaggerSchema } from './helpers/api.helper';
import { transformRefsToImport } from '../types/helpers/template.helper';
import { getOpenapiSchematicsConfig } from '../helpers/config';
import { FRAMEWORK_CONFIGS, TFrameworkType } from '../interfaces/swagger-schematics/framework';

export default function(options: SwaggerApiSchema) {
  return async () => {
    const openApiSchematicsConfig= getOpenapiSchematicsConfig(options);

    if (!openApiSchematicsConfig.path) {
        throw new SchematicsException(`Path for API services is not defined in the configuration.`);
    }

      const framework = openApiSchematicsConfig.framework || 'angular';
      const frameworkConfig = FRAMEWORK_CONFIGS[framework as TFrameworkType];

      const swagger: AxiosResponse<ISwaggerSchema> = await axios.get(openApiSchematicsConfig.swaggerSchemaUrl as string);

      const parsedApiSchemas = transformSwaggerSchema(swagger.data, {
          typeMapping: openApiSchematicsConfig.typeMapping
      });

      // Select templates based on framework
      const defaultApiServiceTemplate = frameworkConfig.templates.apiService;
      const defaultCrudServiceTemplate = frameworkConfig.templates.crudApiService;

      const apiServiceTemplates = url(openApiSchematicsConfig.apiServiceTemplatePath || defaultApiServiceTemplate);
      const apiCrudServiceTemplates = url(openApiSchematicsConfig.apiCrudServiceTemplatePath || defaultCrudServiceTemplate);

      let finalRule: Rule | undefined;

      Object.keys(parsedApiSchemas).forEach(apiSchemaKey => {
          let itemSource;
          const parsed = parseName(openApiSchematicsConfig.path!, apiSchemaKey);
          
          // Common template context
          const templateContext = {
              ...openApiSchematicsConfig,
              ...strings,
              transformRefsToImport,
              name: apiSchemaKey,
              apiList: parsedApiSchemas[apiSchemaKey].apiList,
              importRefs: parsedApiSchemas[apiSchemaKey].importRefs,
          };

          // Add framework-specific helpers
          if (framework === 'react-rtk') {
              Object.assign(templateContext, {
                  scopeEndpointsWithTags: openApiSchematicsConfig.scopeEndpointsWithTags || false,
                  rtkBaseApiPath: openApiSchematicsConfig.rtkBaseApiPath,
              });
          } else {
              // Angular - no additional helpers needed
          }

          itemSource = apply(apiServiceTemplates, [
              applyTemplates(templateContext),
              move(parsed.path)
          ]);

          if (!!finalRule) {
              finalRule = chain([finalRule, mergeWith(itemSource, MergeStrategy.Overwrite)]);
          } else {
              finalRule = chain([mergeWith(itemSource, MergeStrategy.Overwrite)]);
          }
      });

      // Only generate base API services for Angular (RTK uses existing baseApi)
      if (framework === 'angular') {
          const baseApiServicesPath = openApiSchematicsConfig.baseApiServicesPath || openApiSchematicsConfig.path;
          if (!baseApiServicesPath) {
              throw new SchematicsException(`Base API services path is not defined in the configuration.`);
          }

          const parsed = parseName(baseApiServicesPath, 'CrudApiBase');
          const baseApiSource = apply(apiCrudServiceTemplates, [
              applyTemplates({
                  ...openApiSchematicsConfig,
                  ...strings,
              }),
              move(parsed.path)
          ]);
          if (!!finalRule) {
              finalRule = chain([finalRule, mergeWith(baseApiSource, MergeStrategy.Overwrite)])
          }
      }

      return finalRule;
  };
}
