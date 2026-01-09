import {
    apply,
    applyTemplates, chain,
    MergeStrategy,
    mergeWith,
    move, Rule, Tree,
    url
} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';
import {parseName} from '@schematics/angular/utility/parse-name';
import {enums, templateHelpers} from "./utils";
import {TSchemaByType, ISwaggerSchema, TSchemaWithType} from "../interfaces/version_3_1/swagger.interface";
import { isComposition } from "./utils/transform-type";
import axios, {AxiosResponse} from "axios";
import {dasherize} from "@angular-devkit/core/src/utils/strings";
import {parseBuffer as editorconfigParseBuffer} from 'editorconfig';
import { IRef } from '../interfaces/version_3_1/ref.interface';
import { TSwaggerSchematicsSchema } from '../interfaces/swagger-schematics/schema';
import { removeImportDuplicates, transformProperties } from './helpers/template.helper';
import { getOpenapiSchematicsConfig } from '../helpers/config';

export default function(options: SwaggerSchema): Rule {
  return async (host: Tree) => {
    const openApiSchematicsConfig= getOpenapiSchematicsConfig(options);

      let indentSize = '2';

      if (host.exists('.editorconfig')) {
          const editorconfigBuffer = host.read('.editorconfig');
          if (editorconfigBuffer) {
              const parsedFile = editorconfigParseBuffer(editorconfigBuffer);
              const allFilesConfig = parsedFile.find(configs => {
                  return configs[0] === '*';
              });
              const configSection = allFilesConfig ? allFilesConfig[1] : null;
              if (configSection) {
                  indentSize = configSection.indent_size || indentSize;
              }
          }
      }

      const swagger: AxiosResponse<ISwaggerSchema> = await axios.get(openApiSchematicsConfig.swaggerSchemaUrl as string);
      const schemas = swagger.data.components?.schemas ?? {};
      const typeKeys = Object.keys(schemas);
      const parsedSchemas = typeKeys.map(schemaKey => {
        const schema = schemas[schemaKey];
        
        // Skip $ref schemas
        if ('$ref' in schema) {
            return;
        }
        
        const typedSchema = schema as TSchemaByType;
        
        // Skip composition schemas for now (allOf, oneOf, anyOf, not)
        // They will be handled differently in the future
        if (isComposition(typedSchema)) {
            return;
        }
        
        // Check if it's an enum (integer or string with enum values)
        const isEnum = 'enum' in typedSchema && Array.isArray((typedSchema as any).enum);
        const schemaType = isEnum ? 'enum' : 'interface';
        
        return {
            name: schemaKey,
            type: schemaType,
            data: schemas[schemaKey]
        } as TSwaggerSchematicsSchema;
      }).filter(schema => !!schema) as TSwaggerSchematicsSchema[];

      const interfaceTemplates = url('./templates/interface');
      const enumTemplates = url('./templates/enum');

      let finalRule: Rule | undefined;
      parsedSchemas.forEach(schemaData => {
          let itemSource;
          if (schemaData.type === 'enum') {
              const parsed = parseName(`${openApiSchematicsConfig.path}/enums`, schemaData.name);
              const enumValuesList = schemaData.data.enum;
              const enumNamesList = schemaData.data['x-enum-varnames'] ? schemaData.data['x-enum-varnames'] : enumValuesList;
              itemSource = apply(enumTemplates, [
                  applyTemplates({
                      ...openApiSchematicsConfig,
                      ...strings,
                      ...enums,
                      name: parsed.name,
                      path: parsed.path,
                      enums: enumValuesList.reduce((parsedEnumValues, currentValue, currentIndex) => {
                          parsedEnumValues.push([enumNamesList[currentIndex], currentValue]);
                          return parsedEnumValues;
                      }, [] as any[][]),
                      indentSize
                  }),
                  move(parsed.path)
              ]);
          } else {
            const parsed = parseName(`${openApiSchematicsConfig.path}/interfaces`, schemaData.name);
            const schemaProperties = schemaData.data.properties
            const {propertiesContent, refs} = transformProperties(!!schemaProperties ? schemaProperties : {}, swagger.data);
            //   const importsContent = transformRefsToImport(refs.filter(refItem => refItem.importSymbol !== `I${parsed.name}`), `${openApiSchematicsConfig.path}` as string, `${parsed.path}/${dasherize(parsed.name)}`);
            const importRefs = removeImportDuplicates(refs.filter(refItem => refItem.importSymbol !== `I${parsed.name}`));
            itemSource = apply(interfaceTemplates, [
                applyTemplates({
                    ...openApiSchematicsConfig,
                    ...strings,
                    ...templateHelpers,
                    name: parsed.name,
                    path: parsed.path,
                    optionsPath: openApiSchematicsConfig.path,
                    sourcePath: `${parsed.path}/${dasherize(parsed.name)}`,
                    propertiesContent,
                    importRefs,
                    indentSize
                }),
                move(parsed.path)
            ]);
          }

          if (!!finalRule) {
              finalRule = chain([finalRule, mergeWith(itemSource, MergeStrategy.Overwrite)]);
          } else {
              finalRule = chain([mergeWith(itemSource, MergeStrategy.Overwrite)]);
          }
      });

      return finalRule;
  };
}
