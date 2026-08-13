import { buildRelativePath } from "@schematics/angular/utility/find-module";
import { IImportRef, ITransformTypeOptions, isNullable, transformType, getCompositionImports } from "../utils/transform-type";
import { ISchemaProperties, ISwaggerSchema, TSchemaByType } from "../../interfaces/version_3_1/swagger.interface";
import { isAllOf, isOneOf, isAnyOf, isNot, isNullSchema } from "../utils/transform-type";

export function transformProperties(properties: ISchemaProperties, swagger: ISwaggerSchema, options?: ITransformTypeOptions, requiredProperties: string[] = []): {
    propertiesContent: Array<[string, string]>;
    refs: IImportRef[];
} {
    const transformed: Array<[string, string]> = [];
    const refs: IImportRef[] = [];

    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const [rawTypeSymbol, importRef] = transformType(property, swagger, options);
        if (importRef) {
            refs.push(importRef);
        }

        // Per spec: a property is optional unless listed in the object's required array;
        // nullability is expressed in the type itself
        const nullable = isNullable(property, swagger);
        const typeSymbol = nullable && !rawTypeSymbol.includes('| null') ? `${rawTypeSymbol} | null` : rawTypeSymbol;
        const isOptional = !requiredProperties.includes(propertyKey);

        transformed.push([`${propertyKey}${isOptional ? '?' : ''}`, typeSymbol]);
    }

    return {
        propertiesContent: transformed,
        refs
    };
}

export function removeImportDuplicates(importRefs: IImportRef[]): IImportRef[] {
    return importRefs.filter((item, index, self) =>
        index === self.findIndex(t => (
            t.importSymbol === item.importSymbol && t.fileName === item.fileName
        ))
    );
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

export function interfacePropertyLine(interfaceProperties: Array<[string, string]>, indentSize: string) {
    const indentString = ' '.repeat(parseInt(indentSize, 10));
    return `${interfaceProperties.map(([property, type], index) => {
        const isNotLast = index !== interfaceProperties.length - 1;
        return `${indentString}${property}: ${type};${isNotLast ? '\n' : ''}`
    }).join('')}`;
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
        // allOf -> intersection type (A & B & C).
        const nonNullMembers = schema.allOf.filter(member => !isNullSchema(member));
        const nullable = nonNullMembers.length !== schema.allOf.length;
        const parts = nonNullMembers.map(s => transformType(s, swagger, options)[0]);

        // A schema can carry its own `properties` alongside allOf - the common
        // inheritance shape `Derived = Base & { ...own props... }`. Render the
        // own properties as an inline object literal and merge their imports.
        const ownRefs: IImportRef[] = [];
        const ownProperties = (schema as { properties?: ISchemaProperties }).properties;
        if (ownProperties && Object.keys(ownProperties).length > 0) {
            const { propertiesContent, refs } = transformProperties(
                ownProperties,
                swagger,
                options,
                (schema as { required?: string[] }).required ?? []
            );
            parts.push(`{ ${propertiesContent.map(([name, type]) => `${name}: ${type}`).join('; ')} }`);
            ownRefs.push(...refs);
        }

        let typeExpression = parts.join(' & ');
        if (nullable && typeExpression) {
            typeExpression = parts.length > 1 ? `(${typeExpression}) | null` : `${typeExpression} | null`;
        }
        return {
            typeExpression: typeExpression || 'null',
            importRefs: removeImportDuplicates([...importRefs, ...ownRefs])
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