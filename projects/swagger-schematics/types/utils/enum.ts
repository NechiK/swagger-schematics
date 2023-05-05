export function enumLine(enumValue: [string, number], index: number, enums: [string, number][], indentSize: string) {
    const indentString = ' '.repeat(parseInt(indentSize, 10));
    return `${indentString}${enumValue.join(' = ')}${index !== enums.length - 1 ? ',\n' : ''}`
}
