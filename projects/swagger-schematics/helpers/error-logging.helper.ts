import { Rule } from '@angular-devkit/schematics';

const LOG_PREFIX = '[swagger-schematics]';
const MAX_CAUSE_DEPTH = 5;

/** Errors already printed in full, so the CLI doesn't print a schematic's failure a second time. */
const reportedErrors = new WeakSet<object>();

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
        // The stack already starts with "<name>: <message>", e.g. "TypeError: fetch failed"
        const text = typeof err.stack === 'string' && err.stack
            ? err.stack
            : `Error: ${typeof err.message === 'string' && err.message ? err.message : String(current)}`;
        lines.push(depth === 0 ? text : `Caused by: ${text}`);

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
    if (typeof error === 'object' && error !== null) {
        reportedErrors.add(error);
    }
}

/**
 * Prints a failure of the CLI itself (arguments, configuration checks, the workflow),
 * unless it is a schematic failure `logSchematicError` has already printed.
 */
export function logCliError(error: unknown): void {
    if (typeof error === 'object' && error !== null && reportedErrors.has(error)) {
        return;
    }
    console.error(`${LOG_PREFIX} failed:\n${formatSchematicError(error)}`);
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
