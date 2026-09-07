import { buildRelativePath } from "@schematics/angular/utility/find-module";
import { IImportRef, ITransformTypeOptions, transformType, getCompositionImports } from "../utils/transform-type";
import { ISwaggerSchema, TSchemaByType } from "../../interfaces/version_3_1/swagger.interface";
import { isAllOf, isOneOf, isAnyOf, isNot } from "../utils/transform-type";

// Property rendering lives with the rest of the type transformation; re-exported
// here because interface generation historically imported it from this module.
export { transformProperties } from "../utils/transform-type";

export function removeImportDuplicates(importRefs: IImportRef[]): IImportRef[] {
    const seen = new Set<string>();
    return importRefs.filter(item => {
        const key = `${item.importSymbol}|${item.fileName}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

export function transformRefsToImport(refs: IImportRef[], optionsPath: string, sourcePath: string) {
    return refs.map(ref => {
        let folderPath;
        if (ref.type === 'enum') {
            folderPath = `${optionsPath}/enums`;
        } else {
            folderPath = `${optionsPath}/interfaces`;
        }

        return buildImport(sourcePath, `${folderPath}/${ref.fileName}.${ref.type}`, ref.importSymbol);
    }).join('\n');
}

/**
 * Render an interface's property lines. A property the server declared aggregatable
 * (`x-aggregatable`) gets a JSDoc line naming the operations it admits, so the
 * declaration is visible at the property in the editor.
 */
export function interfacePropertyLine(interfaceProperties: Array<[string, string]>, indentSize: string, aggregatable: Array<[string, string[]]> = []) {
    const indentString = ' '.repeat(parseInt(indentSize, 10));
    const opsByProperty = new Map(aggregatable);
    return `${interfaceProperties.map(([property, type], index) => {
        const isNotLast = index !== interfaceProperties.length - 1;
        const ops = opsByProperty.get(property.replace(/\?$/, ''));
        const doc = ops ? `${indentString}/** @aggregatable ${ops.join(', ')} */\n` : '';
        return `${doc}${indentString}${property}: ${type};${isNotLast ? '\n' : ''}`
    }).join('')}`;
}

/**
 * The names a search may aggregate on this result type, as a string-literal union — so a client
 * building an `aggregates` request gets a compile-time check on the column name. Empty when the
 * type declares nothing, so interfaces without aggregates render exactly as before.
 */
export function aggregatableColumnsType(interfaceName: string, aggregatable: Array<[string, string[]]> = []) {
    if (aggregatable.length === 0) {
        return '';
    }
    const union = aggregatable.map(([property]) => `'${property}'`).join(' | ');
    return `\n\n/** Columns of ${interfaceName} a paged search can aggregate (see each property's @aggregatable). */\nexport type ${interfaceName}AggregatableColumn = ${union};`;
}

export function buildImport(fromPath: string, toPath: string, symbolName: string) {
    const relativePath = buildRelativePath(fromPath, toPath);
    return `import { ${symbolName} } from '${relativePath}';`;
}

/**
 * Transform a composition schema (allOf, oneOf, anyOf, not) into a type
 * expression, import refs and an optional leading JSDoc comment.
 */
export function transformCompositionSchema(schema: TSchemaByType, swagger: ISwaggerSchema, options?: ITransformTypeOptions): {
    typeExpression: string;
    importRefs: IImportRef[];
    leadingComment?: string;
} {
    const importRefs = getCompositionImports(schema, swagger, options);
    
    if (isAllOf(schema)) {
        // allOf -> intersection type (A & B & C). Delegate to transformType,
        // whose allOf handling also renders sibling own-properties and lifts a
        // { type: "null" } member to a trailing `| null`; getCompositionImports
        // (importRefs above) already includes the own-property refs.
        const [typeExpression] = transformType(schema, swagger, options);
        return {
            typeExpression,
            importRefs: removeImportDuplicates(importRefs)
        };
    }

    if (isOneOf(schema) || isAnyOf(schema)) {
        // oneOf/anyOf -> union type (A | B | C). Delegate to transformType so a
        // { type: "null" } member collapses to `| null` instead of `any`.
        const [typeExpression] = transformType(schema, swagger, options);
        return {
            typeExpression,
            importRefs: removeImportDuplicates(importRefs)
        };
    }
    
    if (isNot(schema)) {
        // `not` has no TypeScript equivalent - emit `unknown`, but keep the
        // excluded type in a JSDoc comment so the intent is not lost.
        const [excluded] = transformType((schema as { not: TSchemaByType }).not, swagger, options);
        return {
            typeExpression: 'unknown',
            importRefs: [],
            leadingComment: `/** Any value except \`${excluded}\`. Generated from an OpenAPI \`not\` schema, which has no TypeScript equivalent. */`
        };
    }

    // Fallback for unknown composition
    return {
        typeExpression: 'unknown',
        importRefs: []
    };
}