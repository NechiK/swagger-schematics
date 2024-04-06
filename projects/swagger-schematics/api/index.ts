import {
    apply,
    applyTemplates, chain,
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

export default function(options: SwaggerApiSchema) {
  return async () => {
      if (!options.swaggerSchemaUrl) {
          throw new SchematicsException(`Swagger schema URL wasn't provided`);
      }

      const indentSize = '2';

      options.path = options.path || '';
      // const parsedPath = parseName(options.path || '', '');
      // options.path = parsedPath.path;

      const swagger: AxiosResponse<ISwaggerSchema> = await axios.get(options.swaggerSchemaUrl as string);

      const parsedApiSchemas = transformSwaggerSchema(swagger.data);

      const apiServiceTemplates = url(options.apiServiceTemplatePath || './templates/api-service');
      const apiCrudServiceTemplates = url('./templates/crud-api-service');

      let finalRule: Rule | undefined;
      Object.keys(parsedApiSchemas).forEach(apiSchemaKey => {
          let itemSource;
          const parsed = parseName(`${options.path}/api`, apiSchemaKey);
          itemSource = apply(apiServiceTemplates, [
              applyTemplates({
                  ...options,
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
              finalRule = chain([finalRule, mergeWith(itemSource)]);
          } else {
              finalRule = chain([mergeWith(itemSource)]);
          }
      });

      const parsed = parseName(`${options.path}/api`, 'CrudApiBase');
      const baseApiSource = apply(apiCrudServiceTemplates, [
          applyTemplates({
              ...options,
              ...strings,
          }),
          move(parsed.path)
      ]);
      if (!!finalRule) {
          finalRule = chain([finalRule, mergeWith(baseApiSource)])
      }

      return finalRule;
  };
}
