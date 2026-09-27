import { TSchema, TSchemaByType } from '../../interfaces/version_3_1/swagger.interface';
import { isComposition, isPrimitiveWrapper } from './transform-type';

/** What the types schematic generates for a `components.schemas` entry. */
export type TGeneratedSchemaKind = 'enum' | 'interface' | 'type-alias';

/**
 * Decides what (if anything) a component schema generates. Shared by the types
 * schematic and the API change summary, so both always agree on which symbols exist.
 * Returns null for schemas that generate no file. Pass the component's name and the
 * `typeMapping` option so a mapped component generates nothing (see isReplacedByTypeMapping).
 */
export function getGeneratedSchemaKind(
    schema: TSchema,
    component?: { name: string; typeMapping?: Record<string, string> }
): TGeneratedSchemaKind | null {
    // A schema that is only a $ref generates nothing of its own
    if ('$ref' in schema) {
        return null;
    }

    if (component && isReplacedByTypeMapping(component.name, component.typeMapping)) {
        return null;
    }

    const typedSchema = schema as TSchemaByType;

    // Primitive wrappers (e.g. a strongly-typed GUID/int/Stream: { type: 'string',
    // format: 'uuid' }) are inlined at every reference to their primitive
    // (string/number/Blob), so a standalone file would be an unused, empty interface.
    if (isPrimitiveWrapper(typedSchema)) {
        return null;
    }

    // Composition schemas (allOf, oneOf, anyOf, not) become type aliases. 'not' has
    // no TypeScript equivalent and is emitted as `unknown` with an explanatory
    // comment (see transformCompositionSchema) rather than skipped, so a $ref
    // pointing at it does not dangle.
    if (isComposition(typedSchema)) {
        return 'type-alias';
    }

    return 'enum' in typedSchema && Array.isArray(typedSchema.enum) ? 'enum' : 'interface';
}

/**
 * Whether `typeMapping` replaces a component everywhere it is referenced, so a file of its own
 * would be dead code: `{ "Money": "string" }` renders every `$ref` to Money as `string`.
 * A component that a mapping points at (`{ "NullableOfStatus": "Status" }` keeps Status) still
 * generates, since references then import its file - even when it is mapped itself.
 */
export function isReplacedByTypeMapping(name: string, typeMapping?: Record<string, string>): boolean {
    if (!typeMapping?.[name]) {
        return false;
    }
    return !Object.values(typeMapping).includes(name);
}
