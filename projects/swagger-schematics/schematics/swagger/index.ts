import {
    apply,
    applyTemplates, chain,
    mergeWith,
    move, Rule, SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';
import {buildDefaultPath, getWorkspace} from '@schematics/angular/utility/workspace';
import {parseName} from '@schematics/angular/utility/parse-name';
import {enums, interfaces} from "./utils";
import {transformProperties, transformRefsToImport} from "./utils/interface";
import {ISwaggerSchema} from "./interfaces/swagger.interface";
import axios, {AxiosResponse} from "axios";
import {dasherize} from "@angular-devkit/core/src/utils/strings";

export default function(options: SwaggerSchema) {
  return async (host: Tree) => {
      if (!options.swaggerSchemaUrl) {
          throw new SchematicsException(`Swagger schema URL wasn't provided`);
      }

      const workspace = await getWorkspace(host);
      const project = workspace.projects.get(options.project as string);
      if (!options.path && project) {
          options.path = buildDefaultPath(project);
      }

      const swagger: AxiosResponse<ISwaggerSchema> = await axios.get(options.swaggerSchemaUrl as string);
      const schemas = swagger.data.components.schemas;
      const typeKeys = Object.keys(schemas);
      const parsedSchemas = typeKeys.map(schemaKey => {
          const schemaType = schemas[schemaKey].type === 'integer' && schemas[schemaKey].hasOwnProperty('enum') ? 'enum' : 'interface'
          return {
              name: schemaKey,
              type: schemaType,
              data: swagger.data.components.schemas[schemaKey]
          };
      });

      const interfaceTemplates = url('./templates/interface');
      const enumTemplates = url('./templates/enum');

      let finalRule: Rule | undefined;
      parsedSchemas.forEach(schemaData => {
          let itemSource;
          if (schemaData.type === 'enum') {
              const parsed = parseName(`${options.path}/enums`, schemaData.name);
              itemSource = apply(enumTemplates, [
                  applyTemplates({
                      ...options,
                      ...strings,
                      ...enums,
                      name: parsed.name,
                      path: parsed.path,
                      enums: []
                  }),
                  move(parsed.path)
              ]);
          } else {
              const parsed = parseName(`${options.path}/interfaces`, schemaData.name);
              const {propertiesContent, refs} = transformProperties(!!schemaData.data.properties ? schemaData.data.properties : {}, swagger.data);
              const importsContent = transformRefsToImport(refs, options.path as string, `${parsed.path}/${dasherize(parsed.name)}.ts`);
              itemSource = apply(interfaceTemplates, [
                  applyTemplates({
                      ...options,
                      ...strings,
                      ...interfaces,
                      name: parsed.name,
                      path: parsed.path,
                      propertiesContent,
                      importsContent
                  }),
                  move(parsed.path)
              ]);
          }

          if (!!finalRule) {
              finalRule = chain([finalRule, mergeWith(itemSource)]);
          } else {
              finalRule = chain([mergeWith(itemSource)]);
          }
      });

      return finalRule;
  };
}
