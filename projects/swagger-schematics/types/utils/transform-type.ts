import { dasherize } from "@angular-devkit/core/src/utils/strings";
import { IRef } from "../../interfaces/version_3_1/ref.interface";
import { 
    ISwaggerSchema, 
    TSchema, 
    TSchemaByType,
    TSchemaWithType,
    ISchemaBase,
    ISchemaAllOf,
    ISchemaOneOf,
    ISchemaAnyOf,
    ISchemaNot,
    ISchemaObject
} from "../../interfaces/version_3_1/swagger.interface";
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
export type TTypeWithImports = [string, IImportRef[]];

/**
 * Options for type transformation
 */
export interface ITransformTypeOptions {
    /** Map custom backend types to TypeScript primitives (e.g., { 'SuperDuperInt32': 'number' }) */
    typeMapping?: Record<string, string>;
}

// Type guards for schema composition
export function isAllOf(schema: TSchemaByType): schema is ISchemaAllOf {
    return 'allOf' in schema && Array.isArray((schema as ISchemaAllOf).allOf);
}

export function isOneOf(schema: TSchemaByType): schema is ISchemaOneOf {
    return 'oneOf' in schema && Array.isArray((schema as ISchemaOneOf).oneOf);
}

export function isAnyOf(schema: TSchemaByType): schema is ISchemaAnyOf {
    return 'anyOf' in schema && Array.isArray((schema as ISchemaAnyOf).anyOf);
}

export function isNot(schema: TSchemaByType): schema is ISchemaNot {
    return 'not' in schema;
}

export function isComposition(schema: TSchemaByType): boolean {
    return isAllOf(schema) || isOneOf(schema) || isAnyOf(schema) || isNot(schema);
}

export function hasAdditionalProperties(schema: TSchemaByType): schema is ISchemaObject {
    return 'additionalProperties' in schema && (schema as ISchemaObject).additionalProperties !== undefined;
}

/**
 * Transforms a schema property to a type symbol and an import reference if necessary (e.g. for interfaces or enums)
 * @param property
 * @param swagger
 * @param options - Optional configuration including typeMapping
 * @returns [typeSymbol, importRef]
 */
export function transformType(property: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    if (isRef(property)) {
        return parseRefToSymbol(property, swagger, options);
    }
    
    const schema = property as TSchemaByType;
    
    // Handle schema composition first (these don't have a 'type' property)
    if (isAllOf(schema)) {
        return transformAllOf(schema, swagger, options);
    }
    if (isOneOf(schema)) {
        return transformOneOf(schema, swagger, options);
    }
    if (isAnyOf(schema)) {
        return transformAnyOf(schema, swagger, options);
    }
    if (isNot(schema)) {
        // 'not' schemas are typically used for validation, not type generation
        // We return 'unknown' as TypeScript doesn't have a direct equivalent
        return ['unknown'];
    }

    // Handle typed schemas
    if ('type' in schema) {
        // OpenAPI 3.1 (JSON Schema): type may be an array, e.g. ["string", "null"]
        if (Array.isArray((schema as any).type)) {
            return transformTypeArray(schema as TSchemaWithType, swagger, options);
        }
        const typedSchema = schema as TSchemaWithType;
        switch (typedSchema.type) {
            case 'array':
                return transformArraySymbol(typedSchema.items, swagger, options);
            case 'object':
                return transformObjectSchema(typedSchema as ISchemaObject, swagger, options);
            default:
                return transformPrimitives(typedSchema);
        }
    }

    // Fallback for schemas without type (shouldn't happen in valid OpenAPI)
    return ['any'];
}

/**
 * Transforms an OpenAPI 3.1 type array (e.g. ["string", "null"]) into a union type.
 * The "null" member only affects nullability (reported via isNullable), matching
 * how 3.0's nullable keyword is handled - it is not appended to the type symbol here.
 */
function transformTypeArray(schema: TSchemaWithType, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const types = ((schema as any).type as string[]).filter(typeName => typeName !== 'null');

    if (types.length === 0) {
        return ['null'];
    }

    const symbols: string[] = [];
    let firstImportRef: IImportRef | undefined;

    for (const typeName of types) {
        const [symbol, importRef] = transformType({ ...(schema as any), type: typeName } as TSchema, swagger, options);
        symbols.push(symbol);
        firstImportRef = firstImportRef ?? importRef;
    }

    return [Array.from(new Set(symbols)).join(' | '), firstImportRef];
}

/**
 * OpenAPI 3.1 (JSON Schema) marks binary string content via contentMediaType
 * (e.g. application/octet-stream) instead of 3.0's format: binary.
 * base64-encoded content (contentEncoding) stays a plain string.
 */
export function isBinaryContentMediaType(schema: { contentMediaType?: string; contentEncoding?: string }): boolean {
    if (!schema.contentMediaType || schema.contentEncoding) {
        return false;
    }
    return !/^text\//i.test(schema.contentMediaType) && !/json$/i.test(schema.contentMediaType);
}

/**
 * Whether a schema describes binary content in either OpenAPI 3.0 (format: binary)
 * or OpenAPI 3.1 (contentMediaType) style.
 */
export function isBinarySchema(schema: TSchema | undefined): boolean {
    if (!schema || isRef(schema)) {
        return false;
    }
    const typed = schema as TSchemaWithType & { contentMediaType?: string; contentEncoding?: string };
    const typeNames = Array.isArray((typed as any).type) ? (typed as any).type : [typed.type];
    if (!typeNames.includes('string')) {
        return false;
    }
    return (typed as any).format === 'binary' || isBinaryContentMediaType(typed);
}

/**
 * Transforms allOf schema to TypeScript intersection type
 */
function transformAllOf(schema: ISchemaAllOf, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const results = transformCompositionSchemas(schema.allOf, swagger, options);
    const typeSymbol = results.types.join(' & ');
    // Return first import ref (if multiple, they should be handled separately in full type generation)
    return [typeSymbol, results.imports[0]];
}

/**
 * Transforms oneOf schema to TypeScript union type
 */
function transformOneOf(schema: ISchemaOneOf, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const results = transformCompositionSchemas(schema.oneOf, swagger, options);
    const typeSymbol = results.types.join(' | ');
    return [typeSymbol, results.imports[0]];
}

/**
 * Transforms anyOf schema to TypeScript union type (same as oneOf for TypeScript purposes)
 */
function transformAnyOf(schema: ISchemaAnyOf, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const results = transformCompositionSchemas(schema.anyOf, swagger, options);
    const typeSymbol = results.types.join(' | ');
    return [typeSymbol, results.imports[0]];
}

/**
 * Helper to transform array of schemas for composition
 */
function transformCompositionSchemas(schemas: TSchema[], swagger: ISwaggerSchema, options?: ITransformTypeOptions): { types: string[], imports: IImportRef[] } {
    const types: string[] = [];
    const imports: IImportRef[] = [];

    for (const schema of schemas) {
        const [typeSymbol, importRef] = transformType(schema, swagger, options);
        types.push(typeSymbol);
        if (importRef) {
            imports.push(importRef);
        }
    }

    return { types, imports };
}

/**
 * Like transformType, but returns ALL import refs. Compositions
 * (allOf/oneOf/anyOf) can reference several schemas; transformType's tuple
 * only carries the first ref, which loses imports in API generation.
 */
export function transformTypeWithAllImports(property: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImports {
    const [typeSymbol, importRef] = transformType(property, swagger, options);
    if (!isRef(property) && isComposition(property as TSchemaByType)) {
        return [typeSymbol, getCompositionImports(property, swagger, options)];
    }
    return [typeSymbol, importRef ? [importRef] : []];
}

/**
 * Get all import refs from a composition schema (useful for interface generation)
 */
export function getCompositionImports(property: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions): IImportRef[] {
    if (isRef(property)) {
        const [, importRef] = parseRefToSymbol(property, swagger, options);
        return importRef ? [importRef] : [];
    }

    const schema = property as TSchemaByType;
    
    if (isAllOf(schema)) {
        return schema.allOf.flatMap(s => getCompositionImports(s, swagger, options));
    }
    if (isOneOf(schema)) {
        return schema.oneOf.flatMap(s => getCompositionImports(s, swagger, options));
    }
    if (isAnyOf(schema)) {
        return schema.anyOf.flatMap(s => getCompositionImports(s, swagger, options));
    }
    
    return [];
}

/**
 * Transforms object schema, handling additionalProperties
 */
function transformObjectSchema(schema: ISchemaObject, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    // Check for additionalProperties
    if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
        if (schema.additionalProperties === true) {
            // Record<string, any>
            return ['Record<string, any>'];
        } else {
            // additionalProperties is a schema
            const [valueType, importRef] = transformType(schema.additionalProperties, swagger, options);
            return [`Record<string, ${valueType}>`, importRef];
        }
    }
    
    // Regular object without additionalProperties
    return ['object'];
}

/**
 * Known TypeScript primitive types that should never be resolved as schema references
 */
const PRIMITIVE_TYPE_NAMES = new Set([
    'string', 'number', 'boolean', 'object', 'any', 'unknown', 'void', 'null', 'undefined',
    'never', 'bigint', 'symbol'
]);

/**
 * Check if a mapped value looks like a schema reference (not a primitive)
 * Schema references typically:
 * - Start with a capital letter (PascalCase)
 * - Are not primitive type names
 */
function isLikelySchemaReference(value: string): boolean {
    // Primitive types are never schema references
    if (PRIMITIVE_TYPE_NAMES.has(value.toLowerCase())) {
        return false;
    }
    
    // Schema names typically start with a capital letter (PascalCase convention)
    // If it starts with lowercase and isn't a primitive, it's likely a custom primitive alias
    const startsWithCapital = /^[A-Z]/.test(value);
    
    return startsWithCapital;
}

export function parseRefToSymbol(property: IRef, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const { refPropertySchema, refPropertyKey } = getRefPropertyDefinition(property.$ref, swagger);

    // Check if this type is mapped
    if (options?.typeMapping && options.typeMapping[refPropertyKey]) {
        const mappedValue = options.typeMapping[refPropertyKey];

        // Only attempt schema resolution if the mapped value looks like a schema reference
        // This prevents primitive types from accidentally matching schema names
        if (isLikelySchemaReference(mappedValue)) {
            const { refPropertySchema: mappedSchema, refPropertyKey: mappedKey } =
                getRefPropertyDefinition(`#/components/schemas/${mappedValue}`, swagger);

            if (mappedSchema) {
                // Use the mapped schema's type, but preserve nullable from the original schema
                const originalIsNullable = isSchemaValueNullable(refPropertySchema);

                const symbol = transformRefProperty(mappedSchema, mappedKey);
                const typeSymbol = originalIsNullable ? `${symbol} | null` : symbol;

                return [typeSymbol, {
                    type: isRefPropertyEnum(mappedSchema) ? 'enum' : 'interface',
                    importSymbol: symbol,
                    fileName: dasherize(mappedKey)
                }];
            }
        }

        // Mapped to a primitive or the schema wasn't found - preserve nullable from original if available
        const originalIsNullable = isSchemaValueNullable(refPropertySchema);
        return [originalIsNullable ? `${mappedValue} | null` : mappedValue];
    }

    // If schema not found, return a generic type based on the ref key
    if (!refPropertySchema) {
        const symbol = `I${refPropertyKey}`;
        return [symbol, {
            type: 'interface',
            importSymbol: symbol,
            fileName: dasherize(refPropertyKey)
        }];
    }
    
    // Check if the referenced schema is a primitive wrapper (not an object with properties)
    // These should be inlined rather than imported
    if (isPrimitiveWrapper(refPropertySchema)) {
        const [primitiveType] = transformPrimitives(refPropertySchema as TSchemaWithType);
        const isNullable = isSchemaValueNullable(refPropertySchema);
        return [isNullable ? `${primitiveType} | null` : primitiveType];
    }
    
    const symbol = transformRefProperty(refPropertySchema, refPropertyKey);
    const isNullable = isSchemaValueNullable(refPropertySchema);
    const typeSymbol = isNullable ? `${symbol} | null` : symbol;

    return [typeSymbol, {
        type: isRefPropertyEnum(refPropertySchema) ? 'enum' : 'interface',
        importSymbol: symbol,
        fileName: dasherize(refPropertyKey)
    }];
}

/**
 * Check if a schema is a primitive wrapper (type without properties or enum)
 * These are schemas that define a primitive type, possibly with nullable, format, etc.
 * but don't define an object structure with properties
 */
function isPrimitiveWrapper(schema: TSchemaByType): boolean {
    // Must have a primitive type
    if (!('type' in schema)) {
        return false;
    }
    
    // Not a primitive wrapper if it uses composition (allOf, oneOf, anyOf, not)
    // A schema can have both 'type' and composition, and composition takes precedence
    if (isComposition(schema)) {
        return false;
    }
    
    const typedSchema = schema as TSchemaWithType;
    
    // Not a primitive wrapper if it's an object with properties
    if (typedSchema.type === 'object' && 'properties' in schema) {
        return false;
    }
    
    // Not a primitive wrapper if it's an enum (enums should still be generated as types)
    if ('enum' in schema) {
        return false;
    }
    
    // Not a primitive wrapper if it's an array (arrays need special handling)
    if (typedSchema.type === 'array') {
        return false;
    }
    
    // Primitive types: integer, number, string, boolean
    return ['integer', 'number', 'string', 'boolean'].includes(typedSchema.type);
}

export const transformPrimitives = (property: TSchemaWithType): [string] => {
    switch (property.type) {
        case 'integer':
        case 'number':
            return ['number'];
        case 'boolean':
            return ['boolean'];
        case 'string':
            // Binary content (file download/upload) maps to Blob:
            // format: binary (3.0) or contentMediaType (3.1)
            if (property.format === 'binary' || isBinaryContentMediaType(property)) {
                return ['Blob'];
            }
            return ['string'];
        case 'object':
            return ['object'];
        case 'array':
            return ['any[]'];
        default:
            // Fallback for any unhandled type
            return ['any'];
    }
}

function transformArraySymbol(arrayProperty: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    if (!arrayProperty) {
        return ['any[]'];
    } else {
        const [typeSymbol, importRef] = transformType(arrayProperty, swagger, options);
        return [`${typeSymbol}[]`, importRef];
    }
}

export function getRefPropertyDefinition(ref: string, swagger: ISwaggerSchema): {
    refPropertySchema: TSchemaByType | undefined;
    refPropertyKey: string;
} {
    // Ref format: #/components/{componentType}/{componentName}
    const refPath = ref.split('/');
    refPath.shift(); // Remove '#'
    
    // Use any to bypass strict type checking - safePluck handles undefined at runtime
    const refPropertySchema = safePluck(swagger, refPath as any) as TSchemaByType | undefined;
    const refPropertyKey = refPath[refPath.length - 1];
    
    return { refPropertySchema, refPropertyKey };
}

export function transformRefProperty(refProperty: TSchemaByType, refPropertyKey: string) {
    if (refProperty.hasOwnProperty('enum')) {
        return `T${refPropertyKey}`;
    } else {
        return `I${refPropertyKey}`;
    }
}

export function isRefPropertyEnum(refProperty: TSchemaByType): boolean {
    if (!refProperty) return false;
    // Check if it's an enum (either integer or string enum)
    return 'enum' in refProperty && Array.isArray((refProperty as any).enum);
}

export function isRef(property: TSchema | TParam): property is IRef {
    return '$ref' in property;
}

/**
 * Whether the schema value itself is nullable:
 * OpenAPI 3.0 nullable keyword, or an OpenAPI 3.1 type array containing "null".
 */
export function isSchemaValueNullable(schema: TSchemaByType | undefined): boolean {
    if (!schema) {
        return false;
    }
    if ((schema as TSchemaWithType).nullable === true) {
        return true;
    }
    const type = (schema as any).type;
    return Array.isArray(type) && type.includes('null');
}

/**
 * Check if a schema is nullable, resolving $ref if necessary.
 * A schema is considered nullable if it has `nullable: true` (3.0),
 * a type array containing "null" (3.1), or `default: null`.
 */
export function isNullable(property: TSchema, swagger: ISwaggerSchema): boolean {
    if (isRef(property)) {
        const { refPropertySchema } = getRefPropertyDefinition(property.$ref, swagger);
        if (!refPropertySchema) {
            return false;
        }
        return isSchemaValueNullable(refPropertySchema) || (refPropertySchema as ISchemaBase).default === null;
    }
    return isSchemaValueNullable(property as TSchemaByType) || (property as ISchemaBase).default === null;
}