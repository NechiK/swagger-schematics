import { strings } from '@angular-devkit/core';

const VALID_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Turns an enum value or x-enum-varnames entry into a valid TypeScript enum
 * member name. Names that are already valid identifiers pass through untouched;
 * anything else (spaces, dashes, leading digits, bare numbers) is classified
 * into PascalCase and prefixed when it would still start with a digit.
 */
export function toEnumMemberName(raw: string | number, index: number): string {
    const value = String(raw);
    // `__proto__` is a valid identifier, but the enum's `E["__proto__"] = ...` would set its
    // prototype instead of adding the member
    if (VALID_IDENTIFIER.test(value) && value !== '__proto__') {
        return value;
    }
    const classified = strings.classify(value.replace(/[^A-Za-z0-9]+/g, ' ').trim()).replace(/\s+/g, '');
    if (!classified) {
        return `Value${index}`;
    }
    return /^[0-9]/.test(classified) ? `_${classified}` : classified;
}

/**
 * The members of an enum schema: [name, value, description] per value, in order. Names come
 * from `x-enum-varnames` (else the value) via toEnumMemberName, descriptions from
 * `x-enum-descriptions`, both positional against `enum`.
 * - A `null` value is left out: it can't be an enum member (`null = null` doesn't compile), and
 *   a nullable enum is already `TColor | null` where it is referenced
 * - Names that collide (`'a-b'` and `'a b'` are both `AB`) get a numeric suffix (`AB_2`)
 */
export function buildEnumMembers(schema: {
    enum: Array<string | number | null>;
    'x-enum-varnames'?: string[];
    'x-enum-descriptions'?: string[];
}): Array<[string, string | number, string | undefined]> {
    const used = new Set<string>();
    const members: Array<[string, string | number, string | undefined]> = [];
    schema.enum.forEach((value, index) => {
        if (value === null) {
            return;
        }
        // Fall back to the value per index - x-enum-varnames may be shorter than enum in malformed specs
        const base = toEnumMemberName(schema['x-enum-varnames']?.[index] ?? value, index);
        let name = base;
        for (let suffix = 2; used.has(name); suffix++) {
            name = `${base}_${suffix}`;
        }
        used.add(name);
        // Undocumented members legitimately carry an empty string in the positional array,
        // so treat empty as absent rather than emitting `/**  */`
        members.push([name, value, schema['x-enum-descriptions']?.[index] || undefined]);
    });
    return members;
}

/** A string as a single-quoted TypeScript literal. */
export function toStringLiteral(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`;
}

/**
 * Renders one enum member, preceded by a JSDoc block when the spec documented it.
 *
 * The description comes from `x-enum-descriptions`, the sibling of the
 * `x-enum-varnames` extension this generator already reads. Emitting it means the
 * member documentation written on the server reaches the consumer's editor as hover
 * text instead of stopping at the OpenAPI document.
 */
export function enumLine(enumValue: [string, number | string, string?], index: number, enums: [string, number | string, string?][], indentSize: string) {
    const indentString = ' '.repeat(parseInt(indentSize, 10));
    const [name, value, description] = enumValue;
    const doc = description
        ? `${indentString}/** ${description.replace(/\*\//g, '*\\/').replace(/\s+/g, ' ').trim()} */\n`
        : '';
    const formattedValue = typeof value === 'string' ? toStringLiteral(value) : value;
    return `${doc}${indentString}${name} = ${formattedValue}${index !== enums.length - 1 ? ',\n' : ''}`
}
