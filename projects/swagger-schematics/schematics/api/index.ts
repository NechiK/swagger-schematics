import {
    apply,
    applyTemplates, chain,
    mergeWith,
    move, Rule, SchematicsException,
    url
} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';
import {parseName} from '@schematics/angular/utility/parse-name';
import {ISwaggerSchema} from "../interfaces/swagger.interface";
import axios, {AxiosResponse} from "axios";
import {
    getApiMethodName,
    getApiResponseSymbol,
    ISwaggerSymbolEnumInterface,
    parseRefToSymbol,
    transformPrimitives,
    transformRefsToImport
} from "../swagger/utils/interface";
import {camelize} from "@angular-devkit/core/src/utils/strings";

export default function(options: SwaggerApiSchema) {
  return async () => {
      if (!options.swaggerSchemaUrl) {
          throw new SchematicsException(`Swagger schema URL wasn't provided`);
      }

      const parsedPath = parseName(options.path || '', '');
      options.path = parsedPath.path;

      const swagger: AxiosResponse<ISwaggerSchema> = await axios.get(options.swaggerSchemaUrl as string);
      const apiPaths = swagger.data.paths;
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
              const apiMethodName = getApiMethodName(apiMethodKey, apiPathKey);
              const queryParams: string[] = [];
              const pathParams: string[] = [];
              if (apiMethod.parameters) {
                  apiMethod.parameters.forEach(apiParam => {
                      if (apiParam.in === 'query') {
                          queryParams.push(apiParam.name);
                      } else {
                          pathParams.push(`${apiParam.name}: ${transformPrimitives(apiParam.schema).propertySymbol}`)
                      }
                  });
              }

              const bodyParam = apiMethod.requestBody && apiMethod.requestBody.content['application/json'] && apiMethod.requestBody.content['application/json'].schema.$ref ? parseRefToSymbol(apiMethod.requestBody.content['application/json'].schema, swagger.data) : null;
              const responseType = getApiResponseSymbol(apiMethod, swagger.data) as ISwaggerSymbolEnumInterface;
              const functionParams = pathParams;
              const apiCallParams = [`this.getUrl(\`${apiUrl}\`)`];
              if (bodyParam) {
                  const parsed = parseName(`${options.path}/core/${bodyParam.type}s`, bodyParam.refPropertyKey);
                  const camelizeProperty = camelize(bodyParam.refPropertyKey);
                  functionParams.push(`${camelizeProperty}: ${bodyParam.propertySymbol}`);
                  apiCallParams.push(camelizeProperty);
                  const importItem = transformRefsToImport([bodyParam], `${options.path}` as string, `${parsed.path}`);
                  if (!apiParsedSchema[apiPrefix].importsContent.find((importContentItem: string) => importContentItem === importItem)) {
                      apiParsedSchema[apiPrefix].importsContent.push(importItem);
                  }
              }

              if (queryParams.length > 0) {
                  apiCallParams.push(`{params:{${queryParams.join(', ')}}`)
              }

              if (responseType && responseType.importSymbol) {
                  const parsed = parseName(`${options.path}/core/${responseType.type}s`, responseType.importSymbol);
                  const importItem = transformRefsToImport([responseType], `${options.path}` as string, `${parsed.path}`);
                  if (!apiParsedSchema[apiPrefix].importsContent.find((importContentItem: string) => importContentItem === importItem)) {
                      apiParsedSchema[apiPrefix].importsContent.push(importItem);
                  }
              }

              const responseSymbol = responseType ? responseType.propertySymbol : 'void';

              if (queryParams.length > 0) {
                  functionParams.push(...queryParams.map(queryParam => `${queryParam}?: string`));
              }

              return {
                  apiUrl,
                  apiMethodName: camelize(apiMethodName),
                  method: apiMethodKey,
                  functionParams: functionParams.join(', '),
                  bodyParam,
                  responseSymbol,
                  apiCallParams: apiCallParams.join(', '),
                  response: apiMethod.responses['200']
              }
          }));

          return apiParsedSchema;
      }, {} as any);

      const apiServiceTemplates = url(options.apiServiceTemplatePath || './templates/api-service');
      const apiCrudServiceTemplates = url('./templates/crud-api-service');

      let finalRule: Rule | undefined;
      Object.keys(parsedApiSchemas).forEach(apiSchemaKey => {
          let itemSource;
          const parsed = parseName(`${options.path}/core/api`, apiSchemaKey);
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

      const parsed = parseName(`${options.path}/core/api`, 'CrudApiBase');
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
