import { dasherize } from "@angular-devkit/core/src/utils/strings";
import { IRef } from "../../interfaces/version_3_1/ref.interface";
import { ISwaggerSchema, TSchema, TSchemaByType } from "../../interfaces/version_3_1/swagger.interface";
import { TParam } from "../../interfaces/version_3_1/params.interface";
import { safePluck } from "./pluck";

export interface IImportRef {
    type: 'enum' | 'interface';
    fileName: string;
    importSymbol: string;
}

export interface ITypeSymbolInline {
    type: string;
    typeSymbol: TPropertySymbol;
}
export type TPropertySymbol = 'number' | 'object' | 'string' | 'boolean' | 'object[]' | 'string[]' | 'number[]' | 'boolean[]';

export type TTypeWithImport = [string, IImportRef?];

/**
 * Transforms a schema property to a type symbol and an import reference if necessary (e.g. for interfaces or enums)
 * @param property
 * @param swagger
 * @returns [typeSymbol, importRef]
 */
export function transformType(property: TSchema, swagger: ISwaggerSchema): TTypeWithImport {
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

export function parseRefToSymbol(property: IRef, swagger: ISwaggerSchema): TTypeWithImport {
    const {refPropertySchema, refPropertyKey} = getRefPropertyDefinition(property.$ref, swagger);
    const symbol = transformRefProperty(refPropertySchema, refPropertyKey);

    return [symbol, {
        type: isRefPropertyEnum(refPropertySchema) ? 'enum' : 'interface',
        importSymbol: symbol,
        fileName: dasherize(refPropertyKey)
    }];
}

export const transformPrimitives = (property: TSchemaByType): [string] => {
    switch (property.type) {
        case 'integer':
            return ['number'];
        case 'object':
            return ['object'];
        default:
            return [property.type as TPropertySymbol];
    }
}

function transformArraySymbol(arrayProperty: TSchema, swagger: ISwaggerSchema): TTypeWithImport {
    const [typeSymbol, importRef] = transformType(arrayProperty, swagger);
    return [`${typeSymbol}[]`, importRef];
}

export function getRefPropertyDefinition(ref: string, swagger: ISwaggerSchema): {
    refPropertySchema: TSchemaByType;
    refPropertyKey: string;
} {
    const refPath = ref.split('/') as ['components', 'schemas', string];
    refPath.shift();
    const refPropertySchema = safePluck(swagger, refPath) as TSchemaByType;
    const refPropertyKey = refPath[refPath.length - 1];
    return {refPropertySchema, refPropertyKey};
}

export function transformRefProperty(refProperty: TSchemaByType, refPropertyKey: string) {
    if (refProperty.hasOwnProperty('enum')) {
        return `T${refPropertyKey}`;
    } else {
        return `I${refPropertyKey}`;
    }
}

export function isRefPropertyEnum(refProperty: TSchemaByType) {
    return refProperty.hasOwnProperty('enum');
}

export function isRef(property: TSchema | TParam): property is IRef {
    return '$ref' in property;
}