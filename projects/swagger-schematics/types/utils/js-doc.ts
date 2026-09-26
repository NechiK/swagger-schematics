/** The OpenAPI fields a JSDoc comment is built from (an operation, schema or property). */
export interface IDocSource {
    summary?: string;
    description?: string;
    deprecated?: boolean;
}

/**
 * Splits documentation text into comment lines: a literal `*\/` can't end the
 * comment early, surrounding blank lines are dropped and runs of blank lines
 * collapse to one, so multi-paragraph remarks (e.g. from .NET XML docs) stay readable.
 */
function toCommentLines(text: string | undefined): string[] {
    if (!text || !text.trim()) {
        return [];
    }
    const lines = text
        .replace(/\*\//g, '*\\/')
        .split(/\r?\n/)
        .map(line => line.trim());
    return lines
        .filter((line, index) => line !== '' || (index > 0 && lines[index - 1] !== ''))
        .join('\n')
        .trim()
        .split('\n');
}

/**
 * Renders a JSDoc comment from an operation's or schema's `summary`,
 * `description` and `deprecated`, plus any extra tags, followed by a newline.
 * One line of content renders as `/** text *\/`, more as a block. Returns an
 * empty string when there is nothing to document, so undocumented code renders
 * exactly as before. Also available to custom templates.
 *
 * @param indent the indentation of the documented declaration
 */
export function renderJsDoc(source: IDocSource | undefined, indent = '', tags: string[] = []): string {
    const summary = toCommentLines(source?.summary);
    const description = toCommentLines(source?.description);
    // Swashbuckle often repeats the summary as the description
    const distinctDescription = description.join('\n') === summary.join('\n') ? [] : description;

    const lines = [
        ...summary,
        ...(summary.length && distinctDescription.length ? [''] : []),
        ...distinctDescription,
        ...(source?.deprecated ? ['@deprecated'] : []),
        ...tags
    ];

    if (!lines.length) {
        return '';
    }
    if (lines.length === 1) {
        return `${indent}/** ${lines[0]} */\n`;
    }
    return `${indent}/**\n${lines.map(line => `${indent} *${line ? ` ${line}` : ''}`).join('\n')}\n${indent} */\n`;
}
