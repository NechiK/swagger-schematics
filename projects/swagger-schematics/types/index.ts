import {
    apply,
    applyTemplates, chain,
    MergeStrategy,
    mergeWith,
    move, Rule, SchematicContext, Tree,
    url
} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';
import {parseName} from '@schematics/angular/utility/parse-name';
import {enums, templateHelpers} from "./utils";
import {TSchemaByType, ISwaggerSchema} from "../interfaces/version_3_1/swagger.interface";
import { getGeneratedSchemaKind } from "./utils/schema-kind";
import { IDocSource, renderJsDoc } from "./utils/js-doc";
import {fetchSwaggerSchema} from "../helpers/swagger-schema.helper";
import {SwaggerSchema} from "./schema";
import {dasherize} from "@angular-devkit/core/src/utils/strings";
import {parseBuffer as editorconfigParseBuffer} from 'editorconfig';
import { TSwaggerSchematicsSchema } from '../interfaces/swagger-schematics/schema';
import { removeImportDuplicates, transformProperties, transformCompositionSchema } from './helpers/template.helper';
import { getOpenapiSchematicsConfig } from '../helpers/config';
import { createEslintFixRule } from '../helpers/eslint-fix.helper';
import { detectOpenApiVersion } from '../helpers/openapi-version.helper';
import { wrapRuleWithErrorLogging } from '../helpers/error-logging.helper';
import { createStaleFilesRule, recordGeneratedFiles } from '../helpers/generated-files-manifest.helper';

/**
 * A type alias's JSDoc: the schema's own docs plus the note a `not` schema
 * carries, in ONE comment - editors show only the last of two stacked comments,
 * so a separate note would hide the schema's description.
 */
function typeAliasComment(schemaDoc: IDocSource, note: string | undefined): string {
    // The note is generated as a single-line `/** text */`
    const noteText = note?.replace(/^\/\*\*\s*|\s*\*\/$/g, '');
    return renderJsDoc({
        ...schemaDoc,
        description: [schemaDoc.description, noteText].filter(Boolean).join('\n\n')
    }).trimEnd();
}

export default function(options: SwaggerSchema): Rule {
  const typesRule: Rule = async (host: Tree, context: SchematicContext) => {
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

      const swagger: ISwaggerSchema = await fetchSwaggerSchema(openApiSchematicsConfig.swaggerSchemaUrl as string);

      const versionInfo = detectOpenApiVersion(swagger);
      if (versionInfo.warning) {
          context.logger.warn(versionInfo.warning);
      }

      const schemas = swagger.components?.schemas ?? {};
      const typeKeys = Object.keys(schemas);
      const parsedSchemas = typeKeys.map(schemaKey => {
        const schemaType = getGeneratedSchemaKind(schemas[schemaKey], { name: schemaKey, typeMapping: openApiSchematicsConfig.typeMapping });
        if (!schemaType) {
            return;
        }

        return {
            name: schemaKey,
            type: schemaType,
            data: schemas[schemaKey]
        } as TSwaggerSchematicsSchema;
      }).filter(schema => !!schema) as TSwaggerSchematicsSchema[];

      const interfaceTemplates = url('./templates/interface');
      const enumTemplates = url('./templates/enum');
      const typeAliasTemplates = url('./templates/type-alias');

      const rules: Rule[] = [];
      const generatedFiles = new Set<string>();
      parsedSchemas.forEach(schemaData => {
          let itemSource;
          // The schema's own description / deprecated flag, as JSDoc above the declaration
          const typeDoc = renderJsDoc(schemaData.data as IDocSource);
          if (schemaData.type === 'enum') {
              const parsed = parseName(`${openApiSchematicsConfig.path}/enums`, schemaData.name);
              const enumValuesList = schemaData.data.enum;
              const enumNamesList = schemaData.data['x-enum-varnames'];
              // Sibling of x-enum-varnames: per-member documentation, positional against `enum`.
              const enumDescriptionsList = schemaData.data['x-enum-descriptions'];
              itemSource = apply(enumTemplates, [
                  applyTemplates({
                      ...openApiSchematicsConfig,
                      ...strings,
                      ...enums,
                      name: parsed.name,
                      path: parsed.path,
                      typeDoc,
                      enums: enumValuesList.reduce((parsedEnumValues, currentValue, currentIndex) => {
                          // Fall back to the value per index - x-enum-varnames may be
                          // shorter than enum in malformed specs
                          const rawName = enumNamesList?.[currentIndex] ?? currentValue;
                          // Undocumented members legitimately carry an empty string in the
                          // positional array, so treat empty as absent rather than emitting `/**  */`.
                          const description = enumDescriptionsList?.[currentIndex] || undefined;
                          parsedEnumValues.push([enums.toEnumMemberName(rawName, currentIndex), currentValue, description]);
                          return parsedEnumValues;
                      }, [] as Array<[string | number, string | number, string | undefined]>),
                      indentSize
                  }),
                  move(parsed.path),
                  recordGeneratedFiles(generatedFiles)
              ]);
          } else if (schemaData.type === 'type-alias') {
              // Handle composition schemas (allOf, oneOf, anyOf)
              const parsed = parseName(`${openApiSchematicsConfig.path}/interfaces`, schemaData.name);
              const { typeExpression, importRefs: compositionRefs, leadingComment } = transformCompositionSchema(
                  schemaData.data as TSchemaByType,
                  swagger,
                  {
                      typeMapping: openApiSchematicsConfig.typeMapping,
                      legacyOptionalProperties: openApiSchematicsConfig.legacyOptionalProperties
                  }
              );
              // Filter out self-references: a recursive composition refers to its own alias, T<Name>
              const importRefs = compositionRefs.filter(refItem => refItem.importSymbol !== `T${parsed.name}`);
              itemSource = apply(typeAliasTemplates, [
                  applyTemplates({
                      ...openApiSchematicsConfig,
                      ...strings,
                      ...templateHelpers,
                      name: parsed.name,
                      path: parsed.path,
                      optionsPath: openApiSchematicsConfig.path,
                      sourcePath: `${parsed.path}/${dasherize(parsed.name)}`,
                      typeExpression,
                      leadingComment: typeAliasComment(schemaData.data as IDocSource, leadingComment),
                      importRefs,
                      indentSize
                  }),
                  move(parsed.path),
                  recordGeneratedFiles(generatedFiles)
              ]);
          } else {
            const parsed = parseName(`${openApiSchematicsConfig.path}/interfaces`, schemaData.name);
            const schemaProperties = schemaData.data.properties
            const {propertiesContent, refs, aggregatable, docs: propertyDocs} = transformProperties(!!schemaProperties ? schemaProperties : {}, swagger, {
                typeMapping: openApiSchematicsConfig.typeMapping,
                legacyOptionalProperties: openApiSchematicsConfig.legacyOptionalProperties
            }, (schemaData.data as { required?: string[] }).required ?? []);
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
                    aggregatable,
                    propertyDocs,
                    typeDoc,
                    importRefs,
                    indentSize
                }),
                move(parsed.path),
                recordGeneratedFiles(generatedFiles)
            ]);
          }

          rules.push(mergeWith(itemSource, MergeStrategy.Overwrite));
      });

      const eslintFixRule = createEslintFixRule(openApiSchematicsConfig);
      const staleFilesRule = createStaleFilesRule({
          section: 'types',
          outputPath: openApiSchematicsConfig.path as string,
          generatedFiles,
          remove: openApiSchematicsConfig.removeStaleFiles !== false,
          ownedFilePatterns: [
              { dir: `${openApiSchematicsConfig.path}/interfaces`, suffixes: ['.interface.ts', '.type.ts'] },
              { dir: `${openApiSchematicsConfig.path}/enums`, suffixes: ['.enum.ts'] }
          ]
      });
      return chain([...rules, eslintFixRule, staleFilesRule]);
  };

  return wrapRuleWithErrorLogging('types', typesRule);
}
