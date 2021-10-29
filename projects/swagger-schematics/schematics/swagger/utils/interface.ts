import {JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName} from "json-schema";
import {ISwaggerSchema} from "../interfaces/swagger.interface";
import {buildRelativePath} from "@schematics/angular/utility/find-module";
import {dasherize} from "@angular-devkit/core/src/utils/strings";

export function transformProperties(properties: {[key: string]: JSONSchema7Definition}, swagger: ISwaggerSchema) {
    const transformed = [];
    const refs = [];
    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const transformedProperty = transformType(property as JSONSchema7, propertyKey, swagger);
        transformed.push(`${propertyKey}: ${transformedProperty.symbol};`);
        if (['enum', 'interface'].includes(transformedProperty.type)) {
            refs.push(transformedProperty);
        }
    }

    return {
        propertiesContent: transformed.join('\n'),
        refs
    };
}

export function transformRefsToImport(refs: {type: JSONSchema7TypeName | 'enum' | 'interface'; symbol: string}[], optionsPath: string, sourcePath: string) {
    return refs.map(ref => {
        let folderPath;
        if (ref.type === 'enum') {
            folderPath = `${optionsPath}/enums`;
        } else {
            folderPath = `${optionsPath}/enums`;
        }

        return buildImport(sourcePath, `${folderPath}/${dasherize(ref.symbol)}.${ref.type}.ts`, ref.symbol);
    }).join('\n');
}

export function buildImport(fromPath: string, toPath: string, symbolName: string) {
    const relativePath = buildRelativePath(fromPath, toPath);
    return `import {${symbolName}} from "${relativePath}"`;
}

function transformType(property: JSONSchema7, propertyKey: string, swagger: ISwaggerSchema): {type: JSONSchema7TypeName | 'enum' | 'interface'; symbol: string} {
    if (!!property.$ref) {
        const {refProperty, refPropertyKey} = getRefProperty(property.$ref, swagger);

        return {
            type: isRefPropertyEnum(refProperty) ? 'enum' : 'interface',
            symbol: transformRefProperty(refProperty, refPropertyKey)
        };
    } else {
        switch (property.type) {
            case 'array':
                return {
                    type: property.type,
                    symbol: `${propertyKey}[]`
                };
            case 'integer':
                return {
                    type: property.type,
                    symbol: `number`
                };
            case 'object':
                return {
                    type: property.type,
                    symbol: `object`
                };
            default:
                return {
                    type: property.type as JSONSchema7TypeName,
                    symbol: property.type as JSONSchema7TypeName
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
