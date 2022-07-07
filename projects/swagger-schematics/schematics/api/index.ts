import {
    apply,
    applyTemplates, chain,
    mergeWith,
    move, Rule, SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';
import {createDefaultPath} from '@schematics/angular/utility/workspace';
import {parseName} from '@schematics/angular/utility/parse-name';
import {ISwaggerSchema} from "../interfaces/swagger.interface";
import axios, {AxiosResponse} from "axios";
import {parseRefToSymbol, transformPrimitives, transformRefsToImport} from "../swagger/utils/interface";
import {camelize, dasherize} from "@angular-devkit/core/src/utils/strings";

export default function(options: SwaggerApiSchema) {
  return async (host: Tree) => {
      if (!options.swaggerSchemaUrl) {
          throw new SchematicsException(`Swagger schema URL wasn't provided`);
      }

      if (options.path === undefined) {
          options.path = await createDefaultPath(host, options.project as string);
      }

      const parsedPath = parseName(options.path, '');
      options.path = parsedPath.path;

      // const workspace = await getWorkspace(host);
      // const project = workspace.projects.get(options.project as string);
      // if (!options.workingDirectory && project) {
      //     options.workingDirectory = buildDefaultPath(project);
      // }

      const swagger: AxiosResponse<ISwaggerSchema> = await axios.get(options.swaggerSchemaUrl as string);
      const apiPaths = swagger.data.paths;
      const apiPathKeys = Object.keys(apiPaths);
      const importsContent: string[] = [];

      const parsedApiSchemas = apiPathKeys.reduce((apiParsedSchema, apiPathKey) => {
          const [nameSegment, ...segments] = apiPathKey.slice(5).split('/');
          const apiData = apiPaths[apiPathKey];
          const apiPrefix = nameSegment.toLowerCase();
          if (!apiParsedSchema.hasOwnProperty(apiPrefix)) {
              apiParsedSchema[apiPrefix] = {
                  name: apiPrefix,
                  apiList: []
              };
          }

          apiParsedSchema[apiPrefix].apiList = apiParsedSchema[apiPrefix].apiList.concat(Object.keys(apiData).map(apiMethodKey => {
              const apiMethod = apiData[apiMethodKey];
              let apiUrl = segments.map(urlSegment => urlSegment.match(/\{.*}/) ? `$${urlSegment}` : urlSegment).join('/');
              const queryParams: string[] = [];
              const pathParams: string[] = [];
              apiMethod.parameters.forEach(apiParam => {
                  if (apiParam.in === 'query') {
                      queryParams.push(apiParam.name);
                  } else {
                      pathParams.push(`${apiParam.name}: ${transformPrimitives(apiParam.schema).propertySymbol}`)
                  }
              });

              const bodyParam = apiMethod.requestBody && apiMethod.requestBody.content['application/json'] ? parseRefToSymbol(apiMethod.requestBody.content['application/json'].schema, swagger.data) : null;
              const functionParams = pathParams;
              const apiCallParams = [`this.getUrl(\`${apiUrl}\`)`];
              if (bodyParam) {
                  const parsed = parseName(`${options.path}/${bodyParam.type}s`, bodyParam.refPropertyKey);
                  const camelizeProperty = camelize(bodyParam.refPropertyKey);
                  functionParams.push(`${camelizeProperty}: ${bodyParam.propertySymbol}`);
                  apiCallParams.push(camelizeProperty);
                  importsContent.push(transformRefsToImport([bodyParam], options.path as string, `${parsed.path}/${dasherize(parsed.name)}`));
              }

              if (queryParams.length > 0) {
                  functionParams.push(...queryParams.map(queryParam => `${queryParam}?: string`));
              }

              return {
                  apiUrl,
                  method: apiMethodKey,
                  functionParams: functionParams.join(', '),
                  bodyParam,
                  apiCallParams: apiCallParams.join(', '),
                  response: apiMethod.responses['200']
              }
          }));

          return apiParsedSchema;
      }, {} as any);

      const apiServiceTemplates = url('./templates/api-service');

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
                  importsContent: importsContent.join('\n'),
              }),
              move(parsed.path)
          ]);

          if (!!finalRule) {
              finalRule = chain([finalRule, mergeWith(itemSource)]);
          } else {
              finalRule = chain([mergeWith(itemSource)]);
          }
      });

      return finalRule;
  };
}
