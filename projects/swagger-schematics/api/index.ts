import {
    apply,
    applyTemplates, chain,
    mergeWith,
    move, Rule, SchematicsException,
    url
} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';
import {parseName} from '@schematics/angular/utility/parse-name';
import {ISwaggerApiPath, ISwaggerSchema} from "../interfaces/swagger.interface";
import axios, {AxiosResponse} from "axios";
import {
    IParsedApiSchema,
    ISwaggerSymbolEnumInterface,
    transformPrimitives,
    transformRefsToImport
} from "../types/utils/interface";
import {camelize} from "@angular-devkit/core/src/utils/strings";
import {getApiMethodName, getApiResponseSymbol, parseRequestBody} from '../types/utils/api';

export default function(options: SwaggerApiSchema) {
  return async () => {
      if (!options.swaggerSchemaUrl) {
          throw new SchematicsException(`Swagger schema URL wasn't provided`);
      }

      options.path = options.path || '';
      // const parsedPath = parseName(options.path || '', '');
      // options.path = parsedPath.path;

      const swagger: AxiosResponse<ISwaggerSchema> = await axios.get(options.swaggerSchemaUrl as string);
      const apiPaths = swagger.data.paths as ISwaggerApiPath;
      const apiPathKeys = Object.keys(apiPaths);

      const parsedApiSchemas = apiPathKeys.reduce((apiParsedSchema, apiPathKey) => {
          if (!apiPathKey.match(/^\/api\//)) {
              console.warn(`Path ${apiPathKey} doesn't match /api/ pattern. Skipping...`);
              return apiParsedSchema;
          }
          const [nameSegment, ...segments] = apiPathKey.slice(5).split('/');
          const apiData = apiPaths[apiPathKey];
          const apiPrefix = nameSegment;
          if (!apiParsedSchema.hasOwnProperty(apiPrefix)) {
              apiParsedSchema[apiPrefix] = {
                  name: apiPrefix,
                  apiList: [],
                  importsContent: []
              };
          }

          apiParsedSchema[apiPrefix].apiList = apiParsedSchema[apiPrefix].apiList.concat(Object.keys(apiData).map(apiMethodKey => {
              const apiMethod = apiData[apiMethodKey];
              let apiUrl = segments.map(urlSegment => urlSegment.match(/\{.*}/) ? `$${urlSegment}` : urlSegment).join('/');
              const apiMethodName = getApiMethodName(apiMethod, apiMethodKey, apiPathKey);
              const queryParams: string[] = [];
              const methodParams: string[] = [];
              if (apiMethod.parameters) {
                  apiMethod.parameters.forEach(apiParam => {
                      if (apiParam.in === 'query') {
                          queryParams.push(apiParam.name);
                      } else {
                          methodParams.push(`${apiParam.name}: ${transformPrimitives(apiParam.schema).propertySymbol}`)
                      }
                  });
              }

              const bodyParam: ISwaggerSymbolEnumInterface | null = parseRequestBody(apiMethod, swagger.data);
              const responseType: ISwaggerSymbolEnumInterface = getApiResponseSymbol(apiMethod, swagger.data) as ISwaggerSymbolEnumInterface;

              const apiCallParams = [`this.getUrl(\`${apiUrl}\`)`];

              if (bodyParam) {
                  const parsed = parseName(`${options.path}/${bodyParam.type}s`, bodyParam.refPropertyKey);
                  const camelizeProperty = camelize(bodyParam.refPropertyKey);
                  methodParams.push(`${camelizeProperty}: ${bodyParam.propertySymbol}`);
                  apiCallParams.push(camelizeProperty);

                  const importItem = transformRefsToImport([bodyParam], `${options.path}` as string, `${parsed.path}`);

                  if (!apiParsedSchema[apiPrefix].importsContent.find((importContentItem: string) => importContentItem === importItem)) {
                      apiParsedSchema[apiPrefix].importsContent.push(importItem);
                  }
              }

              // Add response type import
              if (responseType && responseType.importSymbol) {
                  const parsed = parseName(`${options.path}/${responseType.type}s`, responseType.importSymbol);
                  const importItem = transformRefsToImport([responseType], `${options.path}` as string, `${parsed.path}`);

                  if (!apiParsedSchema[apiPrefix].importsContent.find((importContentItem: string) => importContentItem === importItem)) {
                      apiParsedSchema[apiPrefix].importsContent.push(importItem);
                  }
              }

              // Add query params to API call body and method params (as object)
              if (queryParams.length > 0) {
                  apiCallParams.push(`{params: queryParams}`);
                  methodParams.push(`queryParams: {${queryParams.map(queryParam => `${queryParam}?: string`).join(';')}} = {}`);
              }

              const returnTypeSymbol = responseType ? responseType.propertySymbol : 'void';

              return {
                  apiUrl,
                  apiMethodName,
                  requestMethod: apiMethodKey,
                  methodParams: methodParams.join(', '),
                  bodyParam,
                  returnTypeSymbol,
                  apiCallParams: apiCallParams.join(', '),
                  response: apiMethod.responses['200']
              }
          }));

          return apiParsedSchema;
      }, {} as IParsedApiSchema);

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
                  name: apiSchemaKey,
                  apiList: parsedApiSchemas[apiSchemaKey].apiList,
                  importsContent: parsedApiSchemas[apiSchemaKey].importsContent.join('\n'),
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
