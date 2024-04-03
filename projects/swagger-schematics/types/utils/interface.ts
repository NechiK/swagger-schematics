import {TSchema, ISwaggerSchema, ISchemaProperties, TSchemaByType} from "../../interfaces/version_3_1/swagger.interface";
import {buildRelativePath} from "@schematics/angular/utility/find-module";
import {dasherize} from "@angular-devkit/core/src/utils/strings";
import { IRef } from "../../interfaces/version_3_1/ref.interface";
import { TParam } from "../../interfaces/version_3_1/params.interface";
import { safePluck } from "./pluck";

export interface IParsedApiSchema {
    [key: string]: IParsedSchemaItem;
}

export interface IParsedSchemaItem {
    name: string;
    apiList: IParsedApiItem[];
    importRefs: ITypeSymbolRef[];
}

export interface IParsedApiItem {
    apiUrl: string;
    apiMethodName: string;
    requestMethod: string;
    methodParams: string;
    bodyParam: TTypeSymbol | null;
    returnTypeSymbol: string;
    apiCallParams: string;
    response: any;
}

export interface ITypeSymbolRef {
    type: 'enum' | 'interface';
    fileName: string;
    importSymbol: string;
    propertyRefSymbol: string;
    refPropertyKey: string;
}

export interface ITypeSymbolInline {
    type: string;
    propertySymbol: TPropertySymbol;
}
export type TPropertySymbol = 'number' | 'object' | 'string' | 'boolean' | 'object[]' | 'string[]' | 'number[]' | 'boolean[]';

export type TTypeSymbol = ITypeSymbolRef | ITypeSymbolInline;

export function isRef(property: TSchema | TParam): property is IRef {
    return '$ref' in property;
}

export function isRefSymbol(property: TTypeSymbol): property is ITypeSymbolRef {
    return 'propertyRefSymbol' in property;
}

export function transformProperties(properties: ISchemaProperties, swagger: ISwaggerSchema): {
    propertiesContent: Array<[string, string]>;
    refs: ITypeSymbolRef[];
} {
    const transformed: Array<[string, string]> = [];
    const refs: ITypeSymbolRef[] = [];

    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const transformedProperty = transformType(property, swagger);
        if (isRefSymbol(transformedProperty)) {
            transformed.push([`${propertyKey}`, transformedProperty.propertyRefSymbol]);
            refs.push(transformedProperty);
        } else {
            const propertyAsSchema = property as TSchemaByType;
            transformed.push([`${propertyKey}${propertyAsSchema.nullable ? '?' : ''}`, transformedProperty.propertySymbol]);
        }
    }

    return {
        propertiesContent: transformed,
        refs
    };
}

export function transformRefsToImport(refs: ITypeSymbolRef[], optionsPath: string, sourcePath: string) {
    const uniqRefs: string[] = [];
    return refs.filter(refItem => {
        if (uniqRefs.includes(refItem.importSymbol)) {
            return false;
        } else {
            uniqRefs.push(refItem.importSymbol);
            return true;
        }
    }).map(ref => {
        let folderPath;
        if (ref.type === 'enum') {
            folderPath = `${optionsPath}/enums`;
        } else {
            folderPath = `${optionsPath}/interfaces`;
        }

        return buildImport(sourcePath, `${folderPath}/${ref.fileName}.${ref.type}`, ref.importSymbol);
    }).join('\n');
}

export function buildImport(fromPath: string, toPath: string, symbolName: string) {
    const relativePath = buildRelativePath(fromPath, toPath);
    return `import { ${symbolName} } from '${relativePath}';`;
}

export function interfacePropertyLine(interfaceProperties: Array<[string, string]>, indentSize: string) {
    const indentString = ' '.repeat(parseInt(indentSize, 10));
    return `${interfaceProperties.map(([property, type], index) => {
        const isNotLast = index !== interfaceProperties.length - 1;
        return `${indentString}${property}: ${type};${isNotLast ? '\n' : ''}`
    }).join('')}`;
}

function transformArraySymbol(arrayProperty: TSchema, swagger: ISwaggerSchema): TTypeSymbol {
    const transformedType = transformType(arrayProperty, swagger);
    if ('propertyRefSymbol' in transformedType) {
        return {
            ...transformedType,
            propertyRefSymbol: `${transformedType.propertyRefSymbol}[]`
        } as ITypeSymbolRef;
    } else {
        return {
            ...transformedType,
            propertySymbol: `${transformedType.propertySymbol}[]`
        } as ITypeSymbolInline;
    }
}

export function parseRefToSymbol(property: IRef, swagger: ISwaggerSchema): ITypeSymbolRef {
    const {refPropertySchema, refPropertyKey} = getRefPropertyDefinition(property.$ref, swagger);
    const symbol = transformRefProperty(refPropertySchema, refPropertyKey);

    return {
        type: isRefPropertyEnum(refPropertySchema) ? 'enum' : 'interface',
        importSymbol: symbol,
        propertyRefSymbol: symbol,
        refPropertyKey,
        fileName: dasherize(refPropertyKey)
    } as ITypeSymbolRef;
}

export const transformPrimitives = (property: TSchemaByType): ITypeSymbolInline => {
    switch (property.type) {
        case 'integer':
            return {
                type: property.type,
                propertySymbol: 'number'
            };
        case 'object':
            return {
                type: property.type,
                propertySymbol: 'object'
            };
        default:
            return {
                type: property.type,
                propertySymbol: property.type as TPropertySymbol,
            };
    }
}

export const transformType = (property: TSchema, swagger: ISwaggerSchema): TTypeSymbol => {
    if (isRef(property)) {
        return parseRefToSymbol(property, swagger);
    } else {
        switch (property.type) {
            case 'array':
                return transformArraySymbol(property.items, swagger);
            default:
                return transformPrimitives(property);
        }
    }
}

function getRefPropertyDefinition(ref: string, swagger: ISwaggerSchema): {
    refPropertySchema: TSchemaByType;
    refPropertyKey: string;
} {
    const refPath = ref.split('/') as ['components', 'schemas', string];
    refPath.shift();
    const refPropertySchema = safePluck(swagger, refPath) as TSchemaByType;
    const refPropertyKey = refPath[refPath.length - 1];
    return {refPropertySchema, refPropertyKey};
}

function transformRefProperty(refProperty: TSchemaByType, refPropertyKey: string) {
    if (refProperty.hasOwnProperty('enum')) {
        return `T${refPropertyKey}`;
    } else {
        return `I${refPropertyKey}`;
    }
}

function isRefPropertyEnum(refProperty: TSchemaByType) {
    return refProperty.hasOwnProperty('enum');
}
