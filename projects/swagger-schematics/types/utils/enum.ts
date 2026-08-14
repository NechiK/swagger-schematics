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

export function enumLine(enumValue: [string, number | string], index: number, enums: [string, number | string][], indentSize: string) {
    const indentString = ' '.repeat(parseInt(indentSize, 10));
    const [name, value] = enumValue;
    const formattedValue = typeof value === 'string'
        ? `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`
        : value;
    return `${indentString}${name} = ${formattedValue}${index !== enums.length - 1 ? ',\n' : ''}`
}
