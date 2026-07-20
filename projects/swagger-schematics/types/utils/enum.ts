export function enumLine(enumValue: [string, number | string], index: number, enums: [string, number | string][], indentSize: string) {
    const indentString = ' '.repeat(parseInt(indentSize, 10));
    const [name, value] = enumValue;
    const formattedValue = typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : value;
    return `${indentString}${name} = ${formattedValue}${index !== enums.length - 1 ? ',\n' : ''}`
}
