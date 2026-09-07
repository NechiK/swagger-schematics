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
    ISchemaObject,
    ISchemaProperties
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
    /**
     * Legacy optionality: when true, an interface property is optional (`?`) iff
     * it is nullable, ignoring the object schema's `required` array. Escape hatch
     * for back-ends that do not emit `required` yet. Nullability (`| null`) is
     * unaffected either way.
     */
    legacyOptionalProperties?: boolean;
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

/**
 * Whether a schema is the bare JSON Schema null type: { "type": "null" }
 * (or a type array equal to ["null"]). OpenAPI 3.1 uses this as a member of
 * oneOf/anyOf (and, rarely, allOf) to express nullability - e.g.
 * { "oneOf": [{ "type": "null" }, { "$ref": "..." }] }.
 */
export function isNullSchema(schema: TSchema): boolean {
    if (isRef(schema)) {
        return false;
    }
    const type = (schema as { type?: unknown }).type;
    if (Array.isArray(type)) {
        return type.length === 1 && type[0] === 'null';
    }
    return type === 'null';
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
        if (hasTypeArray(schema)) {
            return transformTypeArray(schema, swagger, options);
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
 * The interfaces model the common OpenAPI single-string `type`, but 3.1
 * (JSON Schema) also allows an array of type names, e.g. ["string", "null"].
 */
type TSchemaTypeArray = ISchemaBase & { type: string[] };

function hasTypeArray(schema: object): schema is TSchemaTypeArray {
    return Array.isArray((schema as { type?: unknown }).type);
}

/**
 * Transforms an OpenAPI 3.1 type array (e.g. ["string", "null"]) into a union type.
 * The "null" member only affects nullability (reported via isNullable), matching
 * how 3.0's nullable keyword is handled - it is not appended to the type symbol here.
 */
function transformTypeArray(schema: TSchemaTypeArray, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const types = schema.type.filter(typeName => typeName !== 'null');

    if (types.length === 0) {
        return ['null'];
    }

    const symbols: string[] = [];
    let firstImportRef: IImportRef | undefined;

    for (const typeName of types) {
        const [symbol, importRef] = transformType({ ...schema, type: typeName } as unknown as TSchema, swagger, options);
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
    const typeNames: unknown[] = hasTypeArray(typed) ? typed.type : [typed.type];
    if (!typeNames.includes('string')) {
        return false;
    }
    return (typed as { format?: unknown }).format === 'binary' || isBinaryContentMediaType(typed);
}

/**
 * Whether a rendered type symbol contains a top-level union - a `|` outside
 * any brackets. `Record<string, string | null>` has none; `IA | null` does.
 */
function hasTopLevelUnion(typeSymbol: string): boolean {
    let depth = 0;
    for (const char of typeSymbol) {
        if (char === '<' || char === '(' || char === '{' || char === '[') {
            depth++;
        } else if (char === '>' || char === ')' || char === '}' || char === ']') {
            depth--;
        } else if (char === '|' && depth === 0) {
            return true;
        }
    }
    return false;
}

/**
 * Parenthesizes a type symbol when it contains a top-level union, so it can be
 * composed into `[]` array or `&` intersection positions without changing
 * precedence: `IA | null` -> `(IA | null)`, `IBase` stays `IBase`.
 */
export function wrapUnion(typeSymbol: string): string {
    return hasTopLevelUnion(typeSymbol) ? `(${typeSymbol})` : typeSymbol;
}

/**
 * Transforms allOf schema to TypeScript intersection type. A { "type": "null" }
 * member expresses nullability rather than an intersection member, so it is
 * lifted out to a trailing `| null` (the intersection is parenthesized when it
 * has more than one member): allOf: [{type:null}, A, B] -> `(A & B) | null`.
 * A schema carrying its own `properties` alongside allOf - the common
 * inheritance shape - renders them as a trailing inline object literal,
 * e.g. `IBase & { extra?: string }`.
 */
function transformAllOf(schema: ISchemaAllOf, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const nonNullMembers = schema.allOf.filter(member => !isNullSchema(member));
    const nullable = nonNullMembers.length !== schema.allOf.length;

    const results = transformCompositionSchemas(nonNullMembers, swagger, options);
    const parts = results.types.map(wrapUnion);

    const ownProperties = (schema as { properties?: ISchemaProperties }).properties;
    if (ownProperties && Object.keys(ownProperties).length > 0) {
        const { propertiesContent } = transformProperties(
            ownProperties,
            swagger,
            options,
            (schema as { required?: string[] }).required ?? []
        );
        parts.push(`{ ${propertiesContent.map(([name, type]) => `${name}: ${type}`).join('; ')} }`);
    }

    const typeSymbol = parts.join(' & ');

    if (!typeSymbol) {
        return ['null'];
    }

    // Return first import ref (if multiple, they should be handled separately in full type generation)
    if (!nullable) {
        return [typeSymbol, results.imports[0]];
    }
    const wrapped = parts.length > 1 ? `(${typeSymbol})` : typeSymbol;
    return [`${wrapped} | null`, results.imports[0]];
}

/**
 * Builds a TypeScript union from oneOf/anyOf members. A { "type": "null" }
 * member (the OpenAPI 3.1 nullability idiom) is not emitted as its own symbol;
 * instead it appends `| null` to the union - matching how 3.0's `nullable`
 * keyword is handled. e.g. oneOf: [{type:null}, {$ref X}] -> `IX | null`.
 */
function transformUnion(members: TSchema[], swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const nonNullMembers = members.filter(member => !isNullSchema(member));
    const nullable = nonNullMembers.length !== members.length;

    const results = transformCompositionSchemas(nonNullMembers, swagger, options);
    const typeSymbol = results.types.join(' | ');

    if (!typeSymbol) {
        // No non-null members (e.g. oneOf: [{ type: "null" }]) - the type is just null.
        return ['null'];
    }

    // Return first import ref (if multiple, they should be handled separately in full type generation)
    return [nullable ? `${typeSymbol} | null` : typeSymbol, results.imports[0]];
}

/**
 * Transforms oneOf schema to TypeScript union type
 */
function transformOneOf(schema: ISchemaOneOf, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    return transformUnion(schema.oneOf, swagger, options);
}

/**
 * Transforms anyOf schema to TypeScript union type (same as oneOf for TypeScript purposes)
 */
function transformAnyOf(schema: ISchemaAnyOf, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    return transformUnion(schema.anyOf, swagger, options);
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
    if (!isRef(property)) {
        const schema = property as TSchemaByType;
        if (isComposition(schema)) {
            return [typeSymbol, getCompositionImports(property, swagger, options)];
        }
        // Arrays and Record values inline their element type, so a union
        // element (e.g. items: oneOf [A, B]) contributes several imports.
        if ('items' in schema && schema.items) {
            return [typeSymbol, transformTypeWithAllImports(schema.items, swagger, options)[1]];
        }
        if ('additionalProperties' in schema && typeof schema.additionalProperties === 'object') {
            return [typeSymbol, transformTypeWithAllImports(schema.additionalProperties, swagger, options)[1]];
        }
    }
    return [typeSymbol, importRef ? [importRef] : []];
}

/**
 * Renders an object schema's properties into [name, type] pairs (name carries
 * the `?` optionality marker) and collects their import refs. Per spec a
 * property is optional unless listed in `required`; nullability is expressed
 * in the type itself. The legacyOptionalProperties escape hatch derives
 * optionality from nullability instead, for back-ends without `required`.
 */
export function transformProperties(properties: ISchemaProperties, swagger: ISwaggerSchema, options?: ITransformTypeOptions, requiredProperties: string[] = []): {
    propertiesContent: Array<[string, string]>;
    refs: IImportRef[];
    /** Properties carrying `x-aggregatable`, with the operations each admits — the server's declaration, read here so the client can know before it calls. */
    aggregatable: Array<[string, string[]]>;
} {
    const transformed: Array<[string, string]> = [];
    const refs: IImportRef[] = [];
    const aggregatable: Array<[string, string[]]> = [];

    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const [rawTypeSymbol, importRefs] = transformTypeWithAllImports(property, swagger, options);
        refs.push(...importRefs);

        const declaredOps = (property as { 'x-aggregatable'?: unknown })['x-aggregatable'];
        if (Array.isArray(declaredOps) && declaredOps.length > 0 && declaredOps.every(op => typeof op === 'string')) {
            aggregatable.push([propertyKey, declaredOps as string[]]);
        }

        const nullable = isNullable(property, swagger);
        const typeSymbol = nullable && !rawTypeSymbol.endsWith(' | null') ? `${rawTypeSymbol} | null` : rawTypeSymbol;
        const isOptional = options?.legacyOptionalProperties
            ? nullable
            : !requiredProperties.includes(propertyKey);

        transformed.push([`${propertyKey}${isOptional ? '?' : ''}`, typeSymbol]);
    }

    return {
        propertiesContent: transformed,
        refs,
        aggregatable
    };
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
        const imports = schema.allOf.flatMap(s => getCompositionImports(s, swagger, options));
        // Sibling `properties` next to allOf render inline (see transformAllOf),
        // so their refs are part of this schema's imports too.
        const ownProperties = (schema as { properties?: ISchemaProperties }).properties;
        if (ownProperties && Object.keys(ownProperties).length > 0) {
            imports.push(...transformProperties(ownProperties, swagger, options, (schema as { required?: string[] }).required ?? []).refs);
        }
        return imports;
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
export function isPrimitiveWrapper(schema: TSchemaByType): boolean {
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
        return [`${wrapUnion(typeSymbol)}[]`, importRef];
    }
}

export function getRefPropertyDefinition(ref: string, swagger: ISwaggerSchema): {
    refPropertySchema: TSchemaByType | undefined;
    refPropertyKey: string;
} {
    // Ref format: #/components/{componentType}/{componentName}
    const refPath = ref.split('/');
    refPath.shift(); // Remove '#'
    
    // The ref path is only known at runtime - safePluck returns undefined when
    // any segment is missing (e.g. a dangling or 2.0-style '#/definitions/' ref),
    // so the tuple shape is asserted, not proven
    const refPropertySchema = safePluck(swagger, refPath as unknown as [keyof ISwaggerSchema]) as unknown as TSchemaByType | undefined;
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
    return 'enum' in refProperty && Array.isArray(refProperty.enum);
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
    const type = (schema as { type?: unknown }).type;
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