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
    if (VALID_IDENTIFIER.test(value)) {
        return value;
    }
    const classified = strings.classify(value.replace(/[^A-Za-z0-9]+/g, ' ').trim()).replace(/\s+/g, '');
    if (!classified) {
        return `Value${index}`;
    }
    return /^[0-9]/.test(classified) ? `_${classified}` : classified;
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
    const formattedValue = typeof value === 'string'
        ? `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`
        : value;
    return `${doc}${indentString}${name} = ${formattedValue}${index !== enums.length - 1 ? ',\n' : ''}`
}
