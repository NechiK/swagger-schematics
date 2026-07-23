import { Rule } from '@angular-devkit/schematics';

const LOG_PREFIX = '[swagger-schematics]';
const MAX_CAUSE_DEPTH = 5;

/**
 * One-line summary of an error and its cause chain.
 * Node's fetch (undici) buries the real network reason (DNS, proxy, TLS)
 * in error.cause, which default error printing never shows.
 */
export function describeErrorChain(error: unknown): string {
    const messages: string[] = [];
    let current: unknown = error;
    let depth = 0;

    while (current !== undefined && current !== null && depth < MAX_CAUSE_DEPTH) {
        const err = current as { message?: unknown; cause?: unknown };
        messages.push(typeof err.message === 'string' && err.message ? err.message : String(current));
        current = err.cause;
        depth++;
    }

    return messages.join(' -> ');
}

/**
 * Full multi-line report of an error: message and stack for every
 * link of the cause chain.
 */
export function formatSchematicError(error: unknown): string {
    const lines: string[] = [];
    let current: unknown = error;
    let depth = 0;

    while (current !== undefined && current !== null && depth < MAX_CAUSE_DEPTH) {
        const err = current as { message?: unknown; stack?: unknown; cause?: unknown };
        const label = depth === 0 ? 'Error' : 'Caused by';

        if (typeof err.stack === 'string' && err.stack) {
            // The stack already starts with "<name>: <message>"
            lines.push(`${label}: ${err.stack}`);
        } else {
            lines.push(`${label}: ${typeof err.message === 'string' && err.message ? err.message : String(current)}`);
        }

        current = err.cause;
        depth++;
    }

    return lines.join('\n');
}

/**
 * Prints a full error report to the console (visible in CI logs) - schematic
 * runners often surface only the top-level message, or nothing at all.
 */
export function logSchematicError(schematicName: string, error: unknown): void {
    console.error(`${LOG_PREFIX} '${schematicName}' schematic failed:\n${formatSchematicError(error)}`);
}

/**
 * Wraps a rule so any failure is reported in full to the console before
 * being rethrown - generation still fails, but never silently.
 */
export function wrapRuleWithErrorLogging(schematicName: string, rule: Rule): Rule {
    return async (tree, context) => {
        try {
            return await (rule as (tree: unknown, context: unknown) => Promise<Rule | void>)(tree, context);
        } catch (error) {
            logSchematicError(schematicName, error);
            throw error;
        }
    };
}
