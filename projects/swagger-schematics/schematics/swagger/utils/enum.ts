export function enumLine(enumValue: [string, number], index: number, enums: [string, number][]) {
    return `${enumValue.join(' = ')}${index !== enums.length - 1 ? ',\n' : ''}`
}

export function interfacePropertyLine(interfaceProperties: string[]) {
    return `${interfaceProperties.map((property, index) => `${property}${index !== interfaceProperties.length ? '\n' : ''}`)}`
}
