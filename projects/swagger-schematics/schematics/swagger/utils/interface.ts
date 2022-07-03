import {JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName} from "json-schema";
import {ISwaggerSchema} from "../interfaces/swagger.interface";
import {buildRelativePath} from "@schematics/angular/utility/find-module";
import {dasherize} from "@angular-devkit/core/src/utils/strings";

export interface ISwaggerSymbolEnumInterface {
    type: 'enum' | 'interface';
    fileName: string;
    importSymbol: string;
    propertySymbol: string;
}

export interface ISwaggerSymbolOther {
    type: JSONSchema7TypeName;
    propertySymbol: string;
}

export type TSwaggerSymbol = ISwaggerSymbolEnumInterface | ISwaggerSymbolOther;

export function transformProperties(properties: {[key: string]: JSONSchema7Definition}, swagger: ISwaggerSchema) {
    const transformed = [];
    const refs: ISwaggerSymbolEnumInterface[] = [];
    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const transformedProperty = transformType(property as JSONSchema7, swagger);
        transformed.push(`${propertyKey}: ${transformedProperty.propertySymbol};`);
        if (transformedProperty.type === 'enum' || transformedProperty.type === 'interface') {
            refs.push(transformedProperty);
        }
    }

    return {
        propertiesContent: transformed.join('\n'),
        refs
    };
}

export function transformRefsToImport(refs: ISwaggerSymbolEnumInterface[], optionsPath: string, sourcePath: string) {
    return refs.map(ref => {
        let folderPath;
        if (ref.type === 'enum') {
            folderPath = `${optionsPath}/enums`;
        } else {
            folderPath = `${optionsPath}/interfaces`;
        }

        return buildImport(sourcePath, `${folderPath}/${ref.fileName}.${ref.type}.ts`, ref.importSymbol);
    }).join('\n');
}

export function buildImport(fromPath: string, toPath: string, symbolName: string) {
    const relativePath = buildRelativePath(fromPath, toPath);
    return `import {${symbolName}} from "${relativePath}"`;
}

function transformArraySymbol(arrayProperty: JSONSchema7, swagger: ISwaggerSchema): TSwaggerSymbol {
    const transformedType = !!arrayProperty.$ref ? parseRefToSymbol(arrayProperty, swagger) : transformType(arrayProperty, swagger);
    return {
        ...transformedType,
        propertySymbol: `${transformedType.propertySymbol}[]`
    }
}

function parseRefToSymbol(property: JSONSchema7, swagger: ISwaggerSchema): TSwaggerSymbol {
    const {refProperty, refPropertyKey} = getRefProperty(property.$ref!, swagger);
    const symbol = transformRefProperty(refProperty, refPropertyKey);

    return {
        type: isRefPropertyEnum(refProperty) ? 'enum' : 'interface',
        importSymbol: symbol,
        propertySymbol: symbol,
        fileName: dasherize(refPropertyKey)
    };
}

function transformType(property: JSONSchema7, swagger: ISwaggerSchema): TSwaggerSymbol {
    if (!!property.$ref) {
        return parseRefToSymbol(property, swagger);
    } else {
        switch (property.type) {
            case 'array':
                return transformArraySymbol(property.items as JSONSchema7, swagger);
            case 'integer':
                return {
                    type: property.type,
                    propertySymbol: `number`
                };
            case 'object':
                return {
                    type: property.type,
                    propertySymbol: `object`
                };
            default:
                return {
                    type: property.type as JSONSchema7TypeName,
                    propertySymbol: property.type as JSONSchema7TypeName
                };
        }
    }
}

function getRefProperty(ref: string, swagger: ISwaggerSchema) {
    const refPath = ref.split('/');
    refPath.shift();
    let refProperty: any = swagger;
    let refPropertyKey = '';
    refPath.forEach(path => {
        refProperty = refProperty[path];
        refPropertyKey = path;
    });
    return {refProperty, refPropertyKey};
}

function transformRefProperty(refProperty: JSONSchema7Definition, refPropertyKey: string) {
    if (refProperty.hasOwnProperty('enum')) {
        return `T${refPropertyKey}`;
    } else {
        return `I${refPropertyKey}`;
    }
}

function isRefPropertyEnum(refProperty: JSONSchema7Definition) {
    return refProperty.hasOwnProperty('enum');
}
