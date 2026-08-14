export type TCliCommand = 'types' | 'api' | 'all';

export interface IParsedCliArgs {
    command?: TCliCommand;
    /** Options passed through to the schematic (camelCase keys) */
    options: Record<string, string | boolean>;
    /** Positional arguments after the command (first one is the schema source) */
    positionals: string[];
    dryRun: boolean;
    help: boolean;
    version: boolean;
    /** Set when the first non-flag argument is not a known command */
    unknownCommand?: string;
}

const COMMANDS: TCliCommand[] = ['types', 'api', 'all'];

import typesSchema from '../types/schema.json';
import apiSchema from '../api/schema.json';

/**
 * Option names the schematic schemas declare as boolean. A bare boolean flag
 * must not consume the next token as its value - `--eslint-fix ./schema.json`
 * means eslintFix=true plus a positional, not eslintFix='./schema.json'.
 */
const BOOLEAN_OPTIONS: ReadonlySet<string> = new Set(
    [typesSchema, apiSchema].flatMap(schema =>
        Object.entries((schema as { properties?: Record<string, { type?: string }> }).properties ?? {})
            .filter(([, definition]) => definition.type === 'boolean')
            .map(([name]) => name)
    )
);

function camelize(key: string): string {
    return key.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function coerceValue(value: string): string | boolean {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
}

/**
 * Parses CLI arguments: `swagger-schematics <types|api|all> [source] [--option=value]`.
 * Supports `--option=value`, `--option value`, bare `--flag` (true),
 * and kebab-case option names (`--swagger-schema-url`).
 */
export function parseCliArgs(argv: string[]): IParsedCliArgs {
    const parsed: IParsedCliArgs = {
        options: {},
        positionals: [],
        dryRun: false,
        help: false,
        version: false
    };

    for (let index = 0; index < argv.length; index++) {
        const token = argv[index];

        if (token === '--help' || token === '-h') {
            parsed.help = true;
            continue;
        }
        if (token === '--version' || token === '-v') {
            parsed.version = true;
            continue;
        }
        if (token === '--dry-run' || token === '--dryRun') {
            parsed.dryRun = true;
            continue;
        }

        if (token.startsWith('--')) {
            const body = token.slice(2);
            const equalsIndex = body.indexOf('=');

            if (equalsIndex !== -1) {
                parsed.options[camelize(body.slice(0, equalsIndex))] = coerceValue(body.slice(equalsIndex + 1));
                continue;
            }

            const name = camelize(body);
            const next = argv[index + 1];
            if (BOOLEAN_OPTIONS.has(name)) {
                // Boolean flags never swallow a following positional; an
                // explicit `--flag true` / `--flag false` is still accepted
                if (next === 'true' || next === 'false') {
                    parsed.options[name] = coerceValue(next);
                    index++;
                } else {
                    parsed.options[name] = true;
                }
            } else if (next !== undefined && !next.startsWith('-')) {
                parsed.options[name] = coerceValue(next);
                index++;
            } else {
                parsed.options[name] = true;
            }
            continue;
        }

        if (!parsed.command && !parsed.unknownCommand) {
            if (COMMANDS.includes(token as TCliCommand)) {
                parsed.command = token as TCliCommand;
            } else {
                parsed.unknownCommand = token;
            }
            continue;
        }

        parsed.positionals.push(token);
    }

    return parsed;
}

export function helpText(): string {
    return `Usage: swagger-schematics <command> [source] [options]

Commands:
  types    Generate TypeScript interfaces, enums, and type aliases
  api      Generate API services (Angular) or API slices (React RTK)
  all      Run types, then api

Arguments:
  source   Swagger schema source: an http(s) URL or a path to a local JSON
           file. Optional when swaggerSchemaUrl is set in openapi-schematics.json

Options:
  --<option>=<value>  Any schematic option (see README), e.g. --path=/src/app/core,
                      --framework=angular, --eslint-fix. Kebab-case is accepted
  --dry-run           Report generated files without writing them
  -h, --help          Show this help
  -v, --version       Show the package version

Examples:
  swagger-schematics all ./openapi-swagger.json --path=/src/app/core
  swagger-schematics types https://api.example.com/swagger/v1/swagger.json
  swagger-schematics api --framework=react-rtk --dry-run`;
}
