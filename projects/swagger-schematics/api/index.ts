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
import { apiToTemplate } from './helpers/template.helper';
import { transformRefsToImport } from '../types/helpers/template.helper';
import { getOpenapiSchematicsConfig } from '../helpers/config';

export default function(options: SwaggerApiSchema) {
  return async () => {
    const openApiSchematicsConfig= getOpenapiSchematicsConfig(options);

    if (!openApiSchematicsConfig.path) {
        throw new SchematicsException(`Path for API services is not defined in the configuration.`);
    }

      const indentSize = '2';

      const swagger: AxiosResponse<ISwaggerSchema> = await axios.get(openApiSchematicsConfig.swaggerSchemaUrl as string);

      const parsedApiSchemas = transformSwaggerSchema(swagger.data);

      const apiServiceTemplates = url(openApiSchematicsConfig.apiServiceTemplatePath || './templates/api-service');
      const apiCrudServiceTemplates = url(openApiSchematicsConfig.apiCrudServiceTemplatePath || './templates/crud-api-service');

      let finalRule: Rule | undefined;

      Object.keys(parsedApiSchemas).forEach(apiSchemaKey => {
          let itemSource;
          const parsed = parseName(openApiSchematicsConfig.path!, apiSchemaKey);
          itemSource = apply(apiServiceTemplates, [
              applyTemplates({
                  ...openApiSchematicsConfig,
                  ...strings,
                  transformRefsToImport,
                  name: apiSchemaKey,
                  apiList: parsedApiSchemas[apiSchemaKey].apiList,
                  importRefs: parsedApiSchemas[apiSchemaKey].importRefs,
                  indentString: ' '.repeat(parseInt(indentSize, 10)),
                  apiToTemplate,
              }),
              move(parsed.path)
          ]);

          if (!!finalRule) {
              finalRule = chain([finalRule, mergeWith(itemSource, MergeStrategy.Overwrite)]);
          } else {
              finalRule = chain([mergeWith(itemSource, MergeStrategy.Overwrite)]);
          }
      });

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

      return finalRule;
  };
}
