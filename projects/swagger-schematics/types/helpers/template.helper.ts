import { buildRelativePath } from "@schematics/angular/utility/find-module";
import { IImportRef, ITransformTypeOptions, isNullable, transformType, getCompositionImports } from "../utils/transform-type";
import { ISchemaProperties, ISwaggerSchema, TSchemaByType } from "../../interfaces/version_3_1/swagger.interface";
import { isAllOf, isOneOf, isAnyOf } from "../utils/transform-type";

export function transformProperties(properties: ISchemaProperties, swagger: ISwaggerSchema, options?: ITransformTypeOptions): {
    propertiesContent: Array<[string, string]>;
    refs: IImportRef[];
} {
    const transformed: Array<[string, string]> = [];
    const refs: IImportRef[] = [];

    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const [typeSymbol, importRef] = transformType(property, swagger, options);
        if (importRef) {
            refs.push(importRef);
        }

        transformed.push([`${propertyKey}${isNullable(property, swagger) ? '?' : ''}`, typeSymbol]);
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
 * Transform a composition schema (allOf, oneOf, anyOf) into a type expression and import refs
 */
export function transformCompositionSchema(schema: TSchemaByType, swagger: ISwaggerSchema, options?: ITransformTypeOptions): {
    typeExpression: string;
    importRefs: IImportRef[];
} {
    const importRefs = getCompositionImports(schema, swagger, options);
    
    if (isAllOf(schema)) {
        // allOf -> intersection type (A & B & C)
        const types = schema.allOf.map(s => {
            const [typeSymbol] = transformType(s, swagger, options);
            return typeSymbol;
        });
        return {
            typeExpression: types.join(' & '),
            importRefs: removeImportDuplicates(importRefs)
        };
    }
    
    if (isOneOf(schema)) {
        // oneOf -> union type (A | B | C)
        const types = schema.oneOf.map(s => {
            const [typeSymbol] = transformType(s, swagger, options);
            return typeSymbol;
        });
        return {
            typeExpression: types.join(' | '),
            importRefs: removeImportDuplicates(importRefs)
        };
    }
    
    if (isAnyOf(schema)) {
        // anyOf -> union type (A | B | C)
        const types = schema.anyOf.map(s => {
            const [typeSymbol] = transformType(s, swagger, options);
            return typeSymbol;
        });
        return {
            typeExpression: types.join(' | '),
            importRefs: removeImportDuplicates(importRefs)
        };
    }
    
    // Fallback for 'not' or unknown composition
    return {
        typeExpression: 'unknown',
        importRefs: []
    };
}