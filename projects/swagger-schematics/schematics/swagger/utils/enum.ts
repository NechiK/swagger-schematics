export function enumLine(enumValue: [string, number], index: number, enums: [string, number][]) {
    return `${enumValue.join(' = ')}${index !== enums.length - 1 ? ',\n' : ''}`
}
