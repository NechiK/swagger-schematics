import { classify, dasherize } from "@angular-devkit/core/src/utils/strings";
import { IDocSource } from "./js-doc";
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
    ISchemaArray,
    ISchemaProperties
} from "../../interfaces/version_3_1/swagger.interface";
import { TParam } from "../../interfaces/version_3_1/params.interface";
import { safePluck } from "./pluck";
import { toStringLiteral } from "./enum";

export interface IImportRef {
    /** What the referenced schema generates: an enum, an interface, or a type alias (`.type.ts`, for compositions) */
    type: 'enum' | 'interface' | 'type';
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
     * it is nullable, ignoring the object schema's `required` array, and an
     * endpoint parameter is optional when it is nullable even if `required`.
     * Escape hatch for back-ends that do not emit `required` yet. Nullability
     * (`| null`) is unaffected either way.
     */
    legacyOptionalProperties?: boolean;
    /**
     * Query parameters only: array elements whose null a component's alias hides render as
     * `NonNullable<TNullableId>`, since HttpClient's `params` takes no null elements (see
     * withNonNullableElements for the elements that show their null).
     */
    nonNullableElements?: boolean;
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
 * Whether a component schema is an array, a tuple or a record (`additionalProperties` and no
 * `properties`, with or without `type: object`): its type is a TypeScript expression (`string[]`, `[number, number]`,
 * `Record<string, number>`), so it generates a type alias rather than an empty interface.
 */
export function isCollectionSchema(schema: TSchemaByType): boolean {
    if (isComposition(schema) || 'enum' in schema) {
        return false;
    }
    const type = (schema as { type?: unknown }).type;
    const types: unknown[] = Array.isArray(type) ? type : [type];
    if (types.includes('array')) {
        return true;
    }
    const properties = (schema as { properties?: object }).properties;
    const additionalProperties = (schema as { additionalProperties?: unknown }).additionalProperties;
    // A record may leave out `type: object`: `additionalProperties` only applies to objects
    return (type === undefined || types.includes('object'))
        && (!properties || Object.keys(properties).length === 0)
        && (additionalProperties === true || (typeof additionalProperties === 'object' && additionalProperties !== null));
}

/**
 * Whether a schema is the bare JSON Schema null type: { "type": "null" }
 * (or a type array equal to ["null"]). OpenAPI 3.1 uses this as a member of
 * oneOf/anyOf (and, rarely, allOf) to express nullability - e.g.
 * { "oneOf": [{ "type": "null" }, { "$ref": "..." }] }.
 */
export function isNullSchema(schema: TSchema): boolean {
    if (isRef(schema) || typeof schema !== 'object' || schema === null) {
        return false;
    }
    const type = (schema as { type?: unknown }).type;
    if (Array.isArray(type)) {
        return type.length === 1 && type[0] === 'null';
    }
    // OpenAPI 3.1: `{ const: null }` allows only null, like `{ type: 'null' }`
    return type === 'null' || (type === undefined && 'const' in schema && (schema as { const?: unknown }).const === null);
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
    // JSON Schema (OpenAPI 3.1) boolean schemas: `true` allows any value, `false` none
    if (typeof property === 'boolean') {
        return [property ? 'unknown' : 'never'];
    }
    if (isRef(property)) {
        return parseRefToSymbol(property, swagger, options);
    }
    
    const schema = property as TSchemaByType;

    // OpenAPI 3.1 (JSON Schema): `const` allows exactly one value
    const literal = constLiteral(schema);
    if (literal !== undefined) {
        return [literal];
    }
    
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
                return hasPrefixItems(typedSchema)
                    ? transformTuple(typedSchema, swagger, options)
                    : transformArraySymbol(typedSchema.items, swagger, options);
            case 'object':
                return transformObjectSchema(typedSchema as ISchemaObject, swagger, options);
            default:
                return transformPrimitives(typedSchema);
        }
    }

    // No `type` but `additionalProperties` (a schema or `true`): JSON Schema only applies it to
    // objects, so it's a record. `additionalProperties: false` only closes the object, and says
    // nothing about the type
    if (hasAdditionalProperties(schema) && (schema as ISchemaObject).additionalProperties !== false) {
        return transformObjectSchema(schema, swagger, options);
    }

    // Fallback for schemas without type (shouldn't happen in valid OpenAPI)
    return ['any'];
}

/**
 * The literal type for an OpenAPI 3.1 `const` (e.g. `const: "dog"` -> `'dog'`), or undefined
 * when there is no `const` or its value is an object or array (those render from their `type`).
 */
function constLiteral(schema: TSchemaByType): string | undefined {
    if (!('const' in schema)) {
        return undefined;
    }
    const value = (schema as { const?: unknown }).const;
    if (typeof value === 'string') {
        return toStringLiteral(value);
    }
    if ((typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean' || value === null) {
        return String(value);
    }
    return undefined;
}

/** OpenAPI 3.1 (JSON Schema 2020-12) tuple: `prefixItems` lists the type of each position. */
type TSchemaTuple = ISchemaArray & { prefixItems: TSchema[] };

function hasPrefixItems(schema: TSchemaWithType): schema is TSchemaTuple {
    return Array.isArray((schema as { prefixItems?: unknown }).prefixItems) && (schema as TSchemaTuple).prefixItems.length > 0;
}

/**
 * `prefixItems` -> a TypeScript tuple, following JSON Schema 2020-12:
 * - positions from `minItems` on may be absent, so they are optional: `[A, B?]`
 * - elements after the prefix are allowed unless `items: false` (or a `maxItems` within the
 *   prefix) closes the tuple; `items` gives their type, otherwise they are `unknown`
 * e.g. `{ prefixItems: [number, number], minItems: 2, items: false }` -> `[number, number]`,
 * `{ prefixItems: [IDto], minItems: 1, items: string }` -> `[IDto, ...string[]]`.
 */
function transformTuple(schema: TSchemaTuple, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const minItems = schema.minItems ?? 0;
    const { types, imports } = transformElementTypes(getTuplePositions(schema), swagger, options);
    const elements = types.map((typeSymbol, index) => index < minItems ? typeSymbol : `${wrapForPostfix(typeSymbol)}?`);

    const rest = getTupleRest(schema);
    if (rest === null) {
        elements.push('...unknown[]');
    } else if (rest !== 'closed') {
        const [restSymbol, restImport] = transformElementType(rest, swagger, options);
        elements.push(`...${wrapForPostfix(restSymbol)}[]`);
        if (restImport) {
            imports.push(restImport);
        }
    }
    return [`[${elements.join(', ')}]`, imports[0]];
}

/** The prefix positions a tuple can have: `maxItems` below the prefix length cuts it short. */
function getTuplePositions(schema: TSchemaTuple): TSchema[] {
    return schema.maxItems !== undefined ? schema.prefixItems.slice(0, Math.max(schema.maxItems, 0)) : schema.prefixItems;
}

/** What may follow a tuple's prefix: nothing ('closed'), elements of a schema, or anything (null). */
function getTupleRest(schema: TSchemaTuple): TSchema | 'closed' | null {
    const items = (schema as { items?: unknown }).items;
    if (items === false || (schema.maxItems !== undefined && schema.maxItems <= schema.prefixItems.length)) {
        return 'closed';
    }
    return items && typeof items === 'object' ? items as TSchema : null;
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
 * Whether a rendered type symbol contains one of `operators` at the top level - outside
 * any brackets and string literals. `Record<string, string | null>` has no top-level `|`;
 * `IA | null` does, and so does `'>' | '<'` (the brackets are literal text).
 */
function hasTopLevelOperator(typeSymbol: string, operators: string): boolean {
    return topLevelOperatorIndexes(typeSymbol, operators).length > 0;
}

/** The positions of the top-level `operators` in a rendered type symbol (see hasTopLevelOperator). */
function topLevelOperatorIndexes(typeSymbol: string, operators: string): number[] {
    const indexes: number[] = [];
    let depth = 0;
    let quote: string | undefined;
    for (let i = 0; i < typeSymbol.length; i++) {
        const char = typeSymbol[i];
        if (quote) {
            if (char === '\\') {
                i++;
            } else if (char === quote) {
                quote = undefined;
            }
        } else if (char === "'" || char === '"') {
            quote = char;
        } else if (char === '<' || char === '(' || char === '{' || char === '[') {
            depth++;
        } else if (char === '>' || char === ')' || char === '}' || char === ']') {
            depth--;
        } else if (depth === 0 && operators.includes(char)) {
            indexes.push(i);
        }
    }
    return indexes;
}

/**
 * Parenthesizes a type symbol when it contains a top-level union, so it can be
 * composed into an `&` intersection without changing precedence:
 * `IA | null` -> `(IA | null)`, `IBase` stays `IBase`.
 */
export function wrapUnion(typeSymbol: string): string {
    return hasTopLevelOperator(typeSymbol, '|') ? `(${typeSymbol})` : typeSymbol;
}

/** The members of a rendered type's top-level union: `A | (B | C)[] | null` -> `A`, `(B | C)[]`, `null`. */
export function splitTopLevelUnion(typeSymbol: string): string[] {
    const bounds = [-1, ...topLevelOperatorIndexes(typeSymbol, '|'), typeSymbol.length];
    return bounds.slice(1).map((end, index) => typeSymbol.slice(bounds[index] + 1, end).trim());
}

/**
 * Parenthesizes a type symbol when it contains a top-level union or intersection, so a
 * postfix `[]` or tuple `?` applies to the whole type: `IA & IB` -> `(IA & IB)[]`, where
 * `IA & IB[]` would mean `IA & Array<IB>`.
 */
function wrapForPostfix(typeSymbol: string): string {
    return hasTopLevelOperator(typeSymbol, '|&') ? `(${typeSymbol})` : typeSymbol;
}

/**
 * A query array's type with its elements' nullability left out: HttpClient's `params` only takes
 * arrays of string | number | boolean, so `(number | null)[]` (Swashbuckle's `List<int?>`, or items
 * that `$ref` a nullable component) wouldn't compile, and a null element has no query-string form
 * anyway. Applies to each member of a top-level union, so a param that is itself nullable
 * (`(number | null)[] | null`, pydantic's `Optional[List[Optional[int]]]`) gets `number[] | null`.
 * Any other type is returned as is.
 */
export function withNonNullableElements(typeSymbol: string): string {
    // The parentheses must enclose the whole element: not `(A) & (B | null)[]`
    if (hasTopLevelOperator(typeSymbol, '&')) {
        return typeSymbol;
    }
    const bounds = [-1, ...topLevelOperatorIndexes(typeSymbol, '|'), typeSymbol.length];
    return bounds.slice(1).map((end, index) => {
        const start = bounds[index];
        const member = typeSymbol.slice(start + 1, end);
        const match = /^(\s*)\(([\s\S]*) \| null\)\[\](\s*)$/.exec(member);
        const converted = match ? `${match[1]}${wrapForPostfix(match[2])}[]${match[3]}` : member;
        return start < 0 ? converted : typeSymbol[start] + converted;
    }).join('');
}

/**
 * A type alias's records as index signatures: `Record<string, TJson>` -> `{ [key: string]: TJson }`,
 * also as a member of a top-level union or intersection (`string | TJson[] | Record<string, TJson>`).
 * TypeScript resolves a generic alias like `Record` eagerly, so a record that refers back to
 * itself (`TJson = Record<string, TJson>`, the JsonObject/JsonValue pair, or a JSON value union)
 * is a circular alias error; an object type is resolved lazily and compiles. Anything else is
 * returned as is.
 */
export function toIndexSignature(typeExpression: string): string {
    const bounds = [-1, ...topLevelOperatorIndexes(typeExpression, '|&'), typeExpression.length];
    return bounds.slice(1).map((end, index) => {
        const start = bounds[index];
        const member = typeExpression.slice(start + 1, end);
        const match = /^(\s*)Record<string, ([\s\S]*)>(\s*)$/.exec(member);
        const converted = match ? `${match[1]}{ [key: string]: ${match[2]} }${match[3]}` : member;
        return start < 0 ? converted : typeExpression[start] + converted;
    }).join('');
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
    let nullable = nonNullMembers.length !== members.length;

    // A nullable member makes the union nullable: `| null` goes once, at the end
    const results = transformElementTypes(nonNullMembers, swagger, options);
    const memberTypes = results.types.map(memberType => {
        if (memberType.endsWith(' | null')) {
            nullable = true;
            return memberType.slice(0, -' | null'.length);
        }
        return memberType;
    });
    const typeSymbol = Array.from(new Set(memberTypes)).join(' | ');

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
 * An element's type - an array item, tuple position, record value or union member - with its
 * own nullability, which a property or parameter would get from withNullability():
 * `items: { type: ['string', 'null'] }` -> `string | null`, so the array is `(string | null)[]`.
 */
function transformElementType(schema: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    const [typeSymbol, importRef] = transformType(schema, swagger, options);
    return [withNullability(typeSymbol, schema, swagger), importRef];
}

function transformElementTypes(schemas: TSchema[], swagger: ISwaggerSchema, options?: ITransformTypeOptions): { types: string[], imports: IImportRef[] } {
    const types: string[] = [];
    const imports: IImportRef[] = [];
    for (const schema of schemas) {
        const [typeSymbol, importRef] = transformElementType(schema, swagger, options);
        types.push(typeSymbol);
        if (importRef) {
            imports.push(importRef);
        }
    }
    return { types, imports };
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
    if (typeof property === 'object' && property !== null && !isRef(property)) {
        const schema = property as TSchemaByType;
        if (isComposition(schema)) {
            return [typeSymbol, getCompositionImports(property, swagger, options)];
        }
        // A tuple references a schema per position, plus its rest element
        if (hasPrefixItems(schema as TSchemaWithType)) {
            const tuple = schema as TSchemaTuple;
            const rest = getTupleRest(tuple);
            const members = [...getTuplePositions(tuple), ...(rest && rest !== 'closed' ? [rest] : [])];
            return [typeSymbol, members.flatMap(member => transformTypeWithAllImports(member, swagger, options)[1])];
        }
        // Arrays and Record values inline their element type, so a union
        // element (e.g. items: oneOf [A, B]) contributes several imports.
        if ('items' in schema && schema.items) {
            return [typeSymbol, transformTypeWithAllImports(schema.items, swagger, options)[1]];
        }
        // An object with properties and more (see transformObjectSchema) imports both
        if (hasPropertiesAndIndexSignature(schema)) {
            const { properties, required } = schema as ISchemaObject & { properties: ISchemaProperties; required?: string[] };
            const { propertiesContent, refs } = transformProperties(properties, swagger, options, required ?? []);
            return [typeSymbol, [...refs, ...transformIndexSignature(schema, propertiesContent, swagger, options)![1]]];
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
    /** Properties with a `description` or `deprecated` flag, rendered as JSDoc on the property. */
    docs: Array<[string, IDocSource]>;
} {
    const transformed: Array<[string, string]> = [];
    const refs: IImportRef[] = [];
    const aggregatable: Array<[string, string[]]> = [];
    const docs: Array<[string, IDocSource]> = [];

    for (const propertyKey in properties) {
        const property = properties[propertyKey];
        const [rawTypeSymbol, importRefs] = transformTypeWithAllImports(property, swagger, options);
        refs.push(...importRefs);

        const declaredOps = (property as { 'x-aggregatable'?: unknown })['x-aggregatable'];
        if (Array.isArray(declaredOps) && declaredOps.length > 0 && declaredOps.every(op => typeof op === 'string')) {
            aggregatable.push([propertyKey, declaredOps as string[]]);
        }

        const { description, deprecated } = property as IDocSource;
        if (description || deprecated) {
            docs.push([propertyKey, { description, deprecated }]);
        }

        const typeSymbol = withNullability(rawTypeSymbol, property, swagger);
        const nullable = isNullable(property, swagger, options) || rendersNull(typeSymbol);
        const isOptional = options?.legacyOptionalProperties
            ? nullable
            : !requiredProperties.includes(propertyKey);

        transformed.push([`${toPropertyKey(propertyKey)}${isOptional ? '?' : ''}`, typeSymbol]);
    }

    return {
        propertiesContent: transformed,
        refs,
        aggregatable,
        docs
    };
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * A property name as written in an interface or object type: as is when it is an identifier,
 * quoted otherwise (`'first-name'`, `'@odata.type'`), since an unquoted one is a syntax error.
 */
export function toPropertyKey(name: string): string {
    return IDENTIFIER.test(name) ? name : toStringLiteral(name);
}

/** The property name a key from toPropertyKey stands for (a trailing `?` is not part of it). */
export function fromPropertyKey(key: string): string {
    const name = key.replace(/\?$/, '');
    if (!name.startsWith("'")) {
        return name;
    }
    return name.slice(1, -1).replace(/\\(.)/g, (_match: string, char: string) => ({ n: '\n', r: '\r' } as Record<string, string>)[char] ?? char);
}

/**
 * Get all import refs from a composition schema (useful for interface generation)
 */
export function getCompositionImports(property: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions): IImportRef[] {
    // A boolean schema (`true`/`false`) references nothing
    if (typeof property !== 'object' || property === null) {
        return [];
    }
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
    // `not` renders as `unknown`, so it imports nothing
    if (isComposition(schema)) {
        return [];
    }
    // A member that is an array, tuple or record inlines its element type, which can
    // reference schemas: anyOf [{ type: array, items: { $ref: Item } }, { type: null }]
    return transformTypeWithAllImports(schema, swagger, options)[1];
}

/**
 * Transforms object schema, handling additionalProperties
 */
function transformObjectSchema(schema: ISchemaObject, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    // Properties next to additionalProperties: an object type with both, since a record of the
    // additional values alone would reject the properties (see transformIndexSignature)
    if (hasPropertiesAndIndexSignature(schema)) {
        const { properties, required } = schema as ISchemaObject & { properties: ISchemaProperties; required?: string[] };
        const { propertiesContent, refs } = transformProperties(properties, swagger, options, required ?? []);
        const [valueType, valueRefs] = transformIndexSignature(schema, propertiesContent, swagger, options)!;
        const members = [...propertiesContent, ['[key: string]', valueType]].map(([key, type]) => `${key}: ${type}`);
        return [`{ ${members.join('; ')} }`, [...refs, ...valueRefs][0]];
    }

    // Check for additionalProperties
    if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
        if (schema.additionalProperties === true) {
            // Record<string, any>
            return ['Record<string, any>'];
        } else {
            // additionalProperties is a schema
            const [valueType, importRef] = transformElementType(schema.additionalProperties, swagger, options);
            return [`Record<string, ${valueType}>`, importRef];
        }
    }
    
    // Regular object without additionalProperties
    return ['object'];
}

/** Whether an object has `properties` and allows more (`additionalProperties` a schema or `true`). */
function hasPropertiesAndIndexSignature(schema: TSchemaByType): boolean {
    const { properties, additionalProperties } = schema as ISchemaObject;
    return !!properties && Object.keys(properties).length > 0
        && additionalProperties !== undefined && additionalProperties !== false;
}

/**
 * The value type of the index signature an object with `properties` gets from
 * `additionalProperties` (a schema, or `true` for `any`), with its import refs; undefined when it
 * allows no more properties. TypeScript checks every property against the index signature
 * (TS2411), so the type also admits each property's type, and `undefined` when one is optional:
 * `{ id?: string; [key: string]: number | string | undefined }` (.NET `[JsonExtensionData]`).
 */
export function transformIndexSignature(
    schema: TSchemaByType,
    propertiesContent: Array<[string, string]>,
    swagger: ISwaggerSchema,
    options?: ITransformTypeOptions
): [string, IImportRef[]] | undefined {
    const additionalProperties = (schema as ISchemaObject).additionalProperties;
    if (additionalProperties === undefined || additionalProperties === false) {
        return undefined;
    }
    if (additionalProperties === true) {
        return ['any', []];
    }
    const [rawValueType, importRefs] = transformTypeWithAllImports(additionalProperties, swagger, options);
    const valueType = withNullability(rawValueType, additionalProperties, swagger);
    if (valueType === 'any' || valueType === 'unknown') {
        return [valueType, importRefs];
    }
    const members = new Set([valueType, ...propertiesContent.map(([, type]) => type)]);
    if (propertiesContent.some(([key]) => key.endsWith('?'))) {
        members.add('undefined');
    }
    return [[...members].join(' | '), importRefs];
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

/**
 * The `typeMapping` target for a component, or undefined when it isn't mapped. Only the mapping's
 * own keys count, so a component named `constructor` or `toString` isn't mapped by Object.prototype.
 */
export function getMappedType(name: string, typeMapping?: Record<string, string>): string | undefined {
    return typeMapping && Object.prototype.hasOwnProperty.call(typeMapping, name) && typeMapping[name]
        ? typeMapping[name]
        : undefined;
}

/**
 * The component a `typeMapping` target names (`{ "Old": "Ctx" }` -> Ctx), or undefined when the
 * target is a TypeScript type instead (`string`, or a name no component has). Only a name that
 * looks like a schema is looked up, so a primitive never matches a schema's name.
 */
export function getMappedComponent(mappedValue: string, swagger: ISwaggerSchema): { ref: string; key: string; schema: TSchemaByType } | undefined {
    if (!isLikelySchemaReference(mappedValue)) {
        return undefined;
    }
    const ref = `#/components/schemas/${mappedValue}`;
    const { refPropertySchema, refPropertyKey } = getRefPropertyDefinition(ref, swagger);
    return refPropertySchema !== undefined && refPropertySchema !== null
        ? { ref, key: refPropertyKey, schema: refPropertySchema }
        : undefined;
}

/** The primitive a primitive wrapper component is inlined as at a reference (`string`, `'dog'`, `string | null`). */
function inlinePrimitiveWrapper(schema: TSchemaByType, swagger: ISwaggerSchema, options?: ITransformTypeOptions, forceNullable = false): string {
    const primitiveType = constLiteral(schema)
        ?? (hasTypeArray(schema)
            ? transformTypeArray(schema, swagger, options)[0]
            : !('type' in schema) && isBooleanEnum(schema)
                ? 'boolean'
                : transformPrimitives(schema as TSchemaWithType)[0]);
    // `["null"]` already renders as null
    const isNullable = (forceNullable || isSchemaValueNullable(schema)) && primitiveType !== 'null';
    return isNullable ? `${primitiveType} | null` : primitiveType;
}

export function parseRefToSymbol(property: IRef, swagger: ISwaggerSchema, options?: ITransformTypeOptions, seen: Set<string> = new Set()): TTypeWithImport {
    const { refPropertySchema, refPropertyKey } = getRefPropertyDefinition(property.$ref, swagger);

    // Check if this type is mapped
    const mappedValue = getMappedType(refPropertyKey, options?.typeMapping);
    if (mappedValue !== undefined) {

        const mapped = getMappedComponent(mappedValue, swagger);
        if (mapped) {
            const { ref: mappedRef, key: mappedKey, schema: mappedSchema } = mapped;
            // Use the mapped schema's type, but preserve nullable from the original schema
            const originalIsNullable = isMappedSchemaNullable(refPropertySchema, swagger, options);

            // A target that is only a $ref generates no file: resolve it as any reference to it
            if (isRef(mappedSchema)) {
                seen.add(property.$ref);
                if (seen.has(mappedRef)) {
                    return ['unknown'];
                }
                const [symbol, importRef] = parseRefToSymbol({ $ref: mappedRef }, swagger, options, seen);
                return [originalIsNullable && !rendersNull(symbol) ? `${symbol} | null` : symbol, importRef];
            }

            // A primitive wrapper target generates no file, so it is inlined like any reference to it
            if (typeof mappedSchema === 'boolean' || isPrimitiveWrapper(mappedSchema)) {
                return [typeof mappedSchema === 'boolean'
                    ? (mappedSchema ? 'unknown' : 'never')
                    : inlinePrimitiveWrapper(mappedSchema, swagger, options, originalIsNullable)];
            }

            const symbol = transformRefProperty(mappedSchema, mappedKey);
            const typeSymbol = originalIsNullable ? `${symbol} | null` : symbol;

            return [typeSymbol, {
                type: getRefImportType(mappedSchema),
                importSymbol: symbol,
                fileName: dasherize(mappedKey)
            }];
        }

        // Mapped to a primitive or the schema wasn't found - preserve nullable from original if available
        const originalIsNullable = isMappedSchemaNullable(refPropertySchema, swagger, options);
        return [originalIsNullable ? `${mappedValue} | null` : mappedValue];
    }

    // A component that is only a $ref generates no file (see getGeneratedSchemaKind): it is the
    // component it points to. A circular chain of them describes no type
    if (refPropertySchema && isRef(refPropertySchema)) {
        seen.add(property.$ref);
        return seen.has(refPropertySchema.$ref)
            ? ['unknown']
            : parseRefToSymbol(refPropertySchema, swagger, options, seen);
    }

    // A boolean component schema generates no file (see getGeneratedSchemaKind)
    if (typeof refPropertySchema === 'boolean') {
        return [refPropertySchema ? 'unknown' : 'never'];
    }

    // If schema not found, return a generic type based on the ref key
    if (!refPropertySchema) {
        const symbol = `I${classify(refPropertyKey)}`;
        return [symbol, {
            type: 'interface',
            importSymbol: symbol,
            fileName: dasherize(refPropertyKey)
        }];
    }
    
    // Check if the referenced schema is a primitive wrapper (not an object with properties)
    // These should be inlined rather than imported
    if (isPrimitiveWrapper(refPropertySchema)) {
        return [inlinePrimitiveWrapper(refPropertySchema, swagger, options)];
    }
    
    const symbol = transformRefProperty(refPropertySchema, refPropertyKey);
    const isNullable = isSchemaValueNullable(refPropertySchema);
    const typeSymbol = isNullable ? `${symbol} | null` : symbol;

    return [typeSymbol, {
        type: getRefImportType(refPropertySchema),
        importSymbol: symbol,
        fileName: dasherize(refPropertyKey)
    }];
}

/** Whether an `enum` lists booleans only (and `null`): `[true, false]`, or `[true]` for a constant. */
function isBooleanEnum(schema: TSchemaByType): boolean {
    const values = (schema as { enum?: unknown }).enum;
    return Array.isArray(values)
        && values.some(value => typeof value === 'boolean')
        && values.every(value => typeof value === 'boolean' || value === null);
}

/**
 * Check if a schema is a primitive wrapper (type without properties or enum)
 * These are schemas that define a primitive type, possibly with nullable, format, etc.
 * but don't define an object structure with properties
 */
export function isPrimitiveWrapper(schema: TSchemaByType): boolean {
    // Not a primitive wrapper if it uses composition (allOf, oneOf, anyOf, not)
    // A schema can have both 'type' and composition, and composition takes precedence
    if (isComposition(schema)) {
        return false;
    }

    // OpenAPI 3.1: a scalar `const` (with or without a type) or `type: "null"` is a single
    // literal type, inlined like a primitive (`'dog'`, `null`) rather than an empty interface
    if (constLiteral(schema) !== undefined || (schema as { type?: unknown }).type === 'null') {
        return true;
    }

    // OpenAPI 3.1 type arrays: `["null"]`, and nullable primitives like `["string", "null"]`
    // (the 3.1 spelling of 3.0's `nullable: true`), inline like their single-type forms
    if (hasTypeArray(schema)) {
        return (!('enum' in schema) || isBooleanEnum(schema))
            && schema.type.every(typeName => ['integer', 'number', 'string', 'boolean', 'null'].includes(typeName));
    }

    // Must have a primitive type, or be a boolean enum, which says it without one (`enum: [true, false]`)
    if (!('type' in schema)) {
        return isBooleanEnum(schema);
    }
    
    const typedSchema = schema as TSchemaWithType;
    
    // Not a primitive wrapper if it's an object with properties
    if (typedSchema.type === 'object' && 'properties' in schema) {
        return false;
    }
    
    // Not a primitive wrapper if it's an enum (enums should still be generated as types), unless
    // its values are booleans, which a TypeScript enum can't hold (`true = true` doesn't compile)
    if ('enum' in schema && !isBooleanEnum(schema)) {
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
            // OpenAPI 3.1: `type: "null"` on its own allows only null
            if ((property as { type: string }).type === 'null') {
                return ['null'];
            }
            // Fallback for any unhandled type
            return ['any'];
    }
}

function transformArraySymbol(arrayProperty: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions): TTypeWithImport {
    // No `items`: any elements (`items: false` allows none, and renders never[] below)
    if (arrayProperty === undefined || arrayProperty === null) {
        return ['any[]'];
    } else {
        const [typeSymbol, importRef] = transformElementType(arrayProperty, swagger, options);
        const elementType = options?.nonNullableElements && hidesNull(arrayProperty, swagger, options)
            ? `NonNullable<${typeSymbol}>`
            : typeSymbol;
        return [`${wrapForPostfix(elementType)}[]`, importRef];
    }
}

/**
 * Whether a schema's rendered type includes null without showing it: a $ref, or a composition
 * member that is one, to a component nullable only through its members, whose alias
 * (`TNullableId = string | null`) carries the null, also when `typeMapping` maps a component to
 * it. A mapping to a TypeScript type shows its `| null`.
 */
function hidesNull(schema: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions, seen: Set<string> = new Set()): boolean {
    if (isRef(schema)) {
        if (seen.has(schema.$ref)) {
            return false;
        }
        seen.add(schema.$ref);
        const { refPropertySchema, refPropertyKey } = getRefPropertyDefinition(schema.$ref, swagger);
        const mappedValue = getMappedType(refPropertyKey, options?.typeMapping);
        if (mappedValue !== undefined) {
            // A TypeScript type shows its `| null`; a component it maps to may hide it in its alias
            const mapped = getMappedComponent(mappedValue, swagger);
            return !!mapped && hidesNull({ $ref: mapped.ref }, swagger, options, seen);
        }
        // Through a component that is only a $ref, to one that may be mapped
        if (refPropertySchema && isRef(refPropertySchema)) {
            return hidesNull(refPropertySchema, swagger, options, seen);
        }
        return typeof refPropertySchema === 'object' && refPropertySchema !== null
            && !isSchemaValueNullable(refPropertySchema)
            && hasNullMember(refPropertySchema, swagger, options);
    }
    if (typeof schema !== 'object' || schema === null) {
        return false;
    }
    return [
        ...((schema as Partial<ISchemaOneOf>).oneOf ?? []),
        ...((schema as Partial<ISchemaAnyOf>).anyOf ?? []),
        ...((schema as Partial<ISchemaAllOf>).allOf ?? [])
    ].some(member => hidesNull(member, swagger, options, seen));
}

/**
 * Like getRefPropertyDefinition, but through components that are only a $ref to another
 * (`ObjAlias: { $ref: Obj }`), to the schema that describes the value. A circular chain of
 * them resolves to no schema.
 */
export function getRefTargetDefinition(ref: string, swagger: ISwaggerSchema): ReturnType<typeof getRefPropertyDefinition> {
    const seen = new Set([ref]);
    let definition = getRefPropertyDefinition(ref, swagger);
    while (definition.refPropertySchema && isRef(definition.refPropertySchema)) {
        const next = definition.refPropertySchema.$ref;
        if (seen.has(next)) {
            return { refPropertySchema: undefined, refPropertyKey: definition.refPropertyKey };
        }
        seen.add(next);
        definition = getRefPropertyDefinition(next, swagger);
    }
    return definition;
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

/**
 * The symbol a component is declared as: its name classified like the templates do (`classify(name)`),
 * so `thing_kind`, `my-thing` or a .NET full name `Shop.OrderDto` are referenced as `TThingKind`,
 * `IMyThing` and `IShopOrderDto`, not by the raw key, which isn't the declared name or an identifier.
 */
export function transformRefProperty(refProperty: TSchemaByType, refPropertyKey: string) {
    return `${getRefImportType(refProperty) === 'interface' ? 'I' : 'T'}${classify(refPropertyKey)}`;
}

/**
 * What a referenced component generates, in the same order the types schematic decides it
 * (see getGeneratedSchemaKind): a composition is a type alias even when it also has `enum`,
 * and so is an array, tuple or record.
 */
function getRefImportType(refProperty: TSchemaByType): IImportRef['type'] {
    if (isComposition(refProperty) || isCollectionSchema(refProperty)) {
        return 'type';
    }
    return isRefPropertyEnum(refProperty) ? 'enum' : 'interface';
}

export function isRefPropertyEnum(refProperty: TSchemaByType): boolean {
    if (!refProperty) return false;
    // Check if it's an enum (either integer or string enum)
    return 'enum' in refProperty && Array.isArray(refProperty.enum);
}

export function isRef(property: TSchema | TParam): property is IRef {
    // Boolean schemas (`items: true`) are valid JSON Schema, and not objects
    return typeof property === 'object' && property !== null && '$ref' in property;
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
    if (Array.isArray(type) && type.includes('null')) {
        return true;
    }
    // A `null` enum value allows null when no `type` rules it out (OpenAPI 3.1: `enum: ['red', null]`)
    const enumValues = (schema as { enum?: unknown }).enum;
    return type === undefined && Array.isArray(enumValues) && enumValues.includes(null);
}

/**
 * Whether a rendered type admits null at its top level (`IDto | null`, `null`). A union shows a
 * nullable member's `| null` once, at the end (`string | number | null` from a
 * `oneOf: [{ type: ['string', 'null'] }, { type: integer }]`), which the schema checks miss.
 */
export function rendersNull(typeSymbol: string): boolean {
    return typeSymbol === 'null' || typeSymbol.endsWith(' | null');
}

/**
 * Whether a component replaced by `typeMapping` was nullable, so the mapped type keeps `| null`.
 * Unlike an unmapped reference, the mapped type doesn't render the component's own alias, so a
 * `oneOf`/`anyOf` null member has to add the `| null` too.
 */
function isMappedSchemaNullable(schema: TSchemaByType | undefined, swagger: ISwaggerSchema, options?: ITransformTypeOptions): boolean {
    return !!schema && (isSchemaValueNullable(schema) || hasNullMember(schema, swagger, options));
}

/**
 * Whether a composition allows null through its members, at any depth, as it renders: a
 * oneOf/anyOf with a member that allows null, or an allOf with a { "type": "null" } member or
 * whose members all allow null and that has no properties of its own (`allOf: [{ $ref: NColor }]`,
 * the way NSwag and Swashbuckle wrap a reference). A member allows null when it is
 * { "type": "null" } or { "const": null } (the OpenAPI 3.1 way of writing a nullable reference:
 * { "oneOf": [{ "type": "null" }, { "$ref": "..." }] }), or is nullable itself as isNullable
 * decides (`{ "type": ["string", "null"] }`, `default: null`, a $ref to a nullable component,
 * also through `typeMapping`).
 */
function hasNullMember(schema: TSchemaByType, swagger: ISwaggerSchema, options?: ITransformTypeOptions, seen: Set<string> = new Set()): boolean {
    // Each member gets its own copy of the refs seen on the way here: a recursive composition
    // (a JSON value that contains itself) stops, but a ref two members share is looked at twice
    const memberAllowsNull = (member: TSchema): boolean =>
        isNullSchema(member) || isNullable(member, swagger, options, new Set(seen));
    const unionMembers = [
        ...((schema as Partial<ISchemaOneOf>).oneOf ?? []),
        ...((schema as Partial<ISchemaAnyOf>).anyOf ?? [])
    ];
    if (unionMembers.some(memberAllowsNull)) {
        return true;
    }
    const allOf = (schema as Partial<ISchemaAllOf>).allOf ?? [];
    const ownProperties = (schema as { properties?: ISchemaProperties }).properties;
    return allOf.some(isNullSchema)
        || (allOf.length > 0 && !(ownProperties && Object.keys(ownProperties).length > 0) && allOf.every(memberAllowsNull));
}

/**
 * Check if a schema is nullable, resolving $ref if necessary.
 * A schema is considered nullable if it has `nullable: true` (3.0),
 * a type array containing "null" (3.1), a composition whose members allow null (see
 * hasNullMember), or `default: null`. With `typeMapping`, a mapped $ref is nullable as it
 * renders (see parseRefToSymbol): when the component was, or when the component it maps to is.
 */
export function isNullable(property: TSchema, swagger: ISwaggerSchema, options?: ITransformTypeOptions, seen: Set<string> = new Set()): boolean {
    if (isRef(property)) {
        // A circular chain of refs describes no value
        if (seen.has(property.$ref)) {
            return false;
        }
        seen.add(property.$ref);
        const { refPropertySchema, refPropertyKey } = getRefPropertyDefinition(property.$ref, swagger);
        const mappedValue = getMappedType(refPropertyKey, options?.typeMapping);
        if (mappedValue !== undefined) {
            const mapped = getMappedComponent(mappedValue, swagger);
            return isMappedSchemaNullable(refPropertySchema, swagger, options)
                || (!!mapped && isNullable({ $ref: mapped.ref }, swagger, options, seen));
        }
        // Also through a component that is only a $ref, to one that may be mapped
        return refPropertySchema !== undefined && isNullable(refPropertySchema, swagger, options, seen);
    }
    // A boolean schema (`true`) says nothing about null
    if (typeof property !== 'object' || property === null) {
        return false;
    }
    return isSchemaValueNullable(property as TSchemaByType)
        || hasNullMember(property as TSchemaByType, swagger, options, seen)
        || (property as ISchemaBase).default === null;
}

/**
 * Adds `| null` to a rendered type when its schema is nullable and the type doesn't show it yet.
 * A $ref to a component written as `oneOf: [{ type: "null" }, ...]` renders as that component's
 * type alias, which already includes null, so it gets no suffix.
 */
export function withNullability(typeSymbol: string, property: TSchema, swagger: ISwaggerSchema): string {
    if (typeSymbol.endsWith(' | null') || typeSymbol === 'null' || !isNullable(property, swagger)) {
        return typeSymbol;
    }
    // Nullable only through its members: the composition renders the null itself, or is a
    // $ref to a component whose alias includes it
    const schema = isRef(property) ? getRefTargetDefinition(property.$ref, swagger).refPropertySchema : property;
    const nullableOnlyByMember = typeof schema === 'object' && schema !== null
        && !isSchemaValueNullable(schema as TSchemaByType)
        && (schema as ISchemaBase).default !== null;
    return nullableOnlyByMember ? typeSymbol : `${typeSymbol} | null`;
}
