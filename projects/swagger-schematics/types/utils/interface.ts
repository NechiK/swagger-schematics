import {JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName} from "json-schema";
import {ISwaggerApi, ISwaggerSchema} from "../../interfaces/swagger.interface";
import {buildRelativePath} from "@schematics/angular/utility/find-module";
import {capitalize, dasherize} from "@angular-devkit/core/src/utils/strings";

export interface ISwaggerSymbolEnumInterface {
    type: 'enum' | 'interface';
    fileName: string;
    importSymbol: string;
    propertySymbol: string;
    refPropertyKey: string;
}

export interface ISwaggerSymbolOther {
    type: JSONSchema7TypeName;
    propertySymbol: string;
}

export type TSwaggerSymbol = ISwaggerSymbolEnumInterface | ISwaggerSymbolOther;

export function transformProperties(properties: {[key: string]: JSONSchema7Definition & {nullable: boolean}}, swagger: ISwaggerSchema): {
    propertiesContent: Array<[string, string]>;
    refs: ISwaggerSymbolEnumInterface[];
} {
    const transformed: Array<[string, string]> = [];
    const refs: ISwaggerSymbolEnumInterface[] = [];
    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const transformedProperty = transformType(property as JSONSchema7, swagger);
        transformed.push([`${propertyKey}${property.nullable ? '?' : ''}`, transformedProperty.propertySymbol]);
        if (transformedProperty.type === 'enum' || transformedProperty.type === 'interface') {
            refs.push(transformedProperty);
        }
    }

    return {
        propertiesContent: transformed,
        refs
    };
}

export function transformRefsToImport(refs: ISwaggerSymbolEnumInterface[], optionsPath: string, sourcePath: string) {
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
    return `import { ${symbolName} } from '${relativePath}'`;
}

export function interfacePropertyLine(interfaceProperties: Array<[string, string]>, indentSize: string) {
    const indentString = ' '.repeat(parseInt(indentSize, 10));
    return `${interfaceProperties.map(([property, type], index) => {
        const isNotLast = index !== interfaceProperties.length - 1;
        return `${indentString}${property}: ${type};${isNotLast ? '\n' : ''}`
    }).join('')}`;
}

function transformArraySymbol(arrayProperty: JSONSchema7, swagger: ISwaggerSchema): TSwaggerSymbol {
    const transformedType = !!arrayProperty.$ref ? parseRefToSymbol(arrayProperty, swagger) : transformType(arrayProperty, swagger);
    return {
        ...transformedType,
        propertySymbol: `${transformedType.propertySymbol}[]`
    }
}

export function parseRefToSymbol(property: JSONSchema7, swagger: ISwaggerSchema): ISwaggerSymbolEnumInterface {
    const {refProperty, refPropertyKey} = getRefProperty(property.$ref!, swagger);
    const symbol = transformRefProperty(refProperty, refPropertyKey);

    return {
        type: isRefPropertyEnum(refProperty) ? 'enum' : 'interface',
        importSymbol: symbol,
        propertySymbol: symbol,
        refPropertyKey,
        fileName: dasherize(refPropertyKey)
    };
}

export const transformPrimitives = (property: JSONSchema7) => {
    switch (property.type) {
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

export const transformType = (property: JSONSchema7, swagger: ISwaggerSchema): TSwaggerSymbol => {
    if (!!property.$ref) {
        return parseRefToSymbol(property, swagger);
    } else {
        switch (property.type) {
            case 'array':
                return transformArraySymbol(property.items as JSONSchema7, swagger);
            default:
                return transformPrimitives(property);
        }
    }
}

export function getApiMethodName(apiMethodKey: string, apiPathKey: string) {
    switch (apiMethodKey) {
        case 'get':
            return parseGetRequestName(apiMethodKey, apiPathKey);
        default:
            return parseUnrecognizedApiPathPatterns(apiMethodKey, apiPathKey);
    }
}

export function getApiResponseSymbol(apiMethod: ISwaggerApi, swaggerData: ISwaggerSchema): TSwaggerSymbol | null {
    const api200Content = apiMethod.responses['200'].content;
    const api200ContentJson = api200Content && api200Content['application/json'];
    if (api200ContentJson) {
        if (api200ContentJson.schema) {
            return transformType(api200ContentJson.schema, swaggerData);
        } else {
             return null;
        }
    } else {
        return null;
    }
}

function parseGetRequestName(apiMethodKey: string, apiPathKey: string) {
    const getModelByParamNameMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}$/.exec(apiPathKey);
    const getGetModelDataParamNameMatch = /(^\/api\/)([a-zA-Z]+)\/{(\w+)}\/([a-zA-Z]+)$/.exec(apiPathKey);
    if (getModelByParamNameMatch) {
        const paramName = capitalize(getModelByParamNameMatch[3]);
        return `${apiMethodKey}By${paramName}`;
    } else if (getGetModelDataParamNameMatch) {
        const modelName = capitalize(getGetModelDataParamNameMatch[2]);
        const paramName = capitalize(getGetModelDataParamNameMatch[3]);
        const dataName = capitalize(getGetModelDataParamNameMatch[4]);
        return `${apiMethodKey}${dataName}By${paramName.toLowerCase().includes(modelName.toLowerCase()) ? '' : modelName}${paramName}`;
    } else {
        return parseUnrecognizedApiPathPatterns(apiMethodKey, apiPathKey);
    }
}

function parseUnrecognizedApiPathPatterns(apiMethodKey: string, apiPathKey: string) {
    console.warn('Unexpected API path pattern: ', apiPathKey);
    const segments = apiPathKey.match(/^\/api\/(.*)/)![0].split('/');
    return [apiMethodKey, ...segments.filter(urlSegment => !urlSegment.match(/\{.*}/) && !urlSegment.match(/^api/))].join(' ');
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
