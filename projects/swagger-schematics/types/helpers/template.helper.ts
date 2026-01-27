import { buildRelativePath } from "@schematics/angular/utility/find-module";
import { IImportRef, isNullable, transformType } from "../utils/transform-type";
import { ISchemaProperties, ISwaggerSchema } from "../../interfaces/version_3_1/swagger.interface";

export function transformProperties(properties: ISchemaProperties, swagger: ISwaggerSchema): {
    propertiesContent: Array<[string, string]>;
    refs: IImportRef[];
} {
    const transformed: Array<[string, string]> = [];
    const refs: IImportRef[] = [];

    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const [typeSymbol, importRef] = transformType(property, swagger);
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