import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { createRequire } from 'module';
import * as path from 'path';
import { SwaggerApiSchema } from '../api/schema';

/** The subset of an ESLint lint message this rule inspects. */
interface ILintMessage {
    fatal?: boolean;
    message: string;
}

/** The subset of an ESLint lint result this rule inspects. */
interface ILintResult {
    fatalErrorCount?: number;
    messages?: ILintMessage[];
    output?: string;
}

/** The subset of the host project's ESLint instance this rule calls. */
interface IESLintInstance {
    isPathIgnored(filePath: string): Promise<boolean>;
    lintText(code: string, options: { filePath: string }): Promise<ILintResult[]>;
}

type TESLintConstructor = new (options: { fix: boolean; cwd: string }) => IESLintInstance;

/**
 * Loads the ESLint module. Injectable so tests can stub every failure mode
 * without ESLint installed.
 */
export type TESLintModuleLoader = () => { ESLint: TESLintConstructor };

const loadHostESLint: TESLintModuleLoader = () => {
    // Resolve ESLint from the consuming project, not from this package
    const hostRequire = createRequire(path.join(process.cwd(), 'package.json'));
    return hostRequire('eslint');
};

/**
 * Rule that runs the host project's ESLint with autofix over every file this
 * schematic run created or overwrote, applying the project's own config
 * (import sorting, comma rules, quotes, ...) to the generated output.
 *
 * Never blocks generation: any failure is logged and the affected file keeps
 * its generated content.
 */
export function createEslintFixRule(
    config: SwaggerApiSchema,
    loadESLintModule: TESLintModuleLoader = loadHostESLint
): Rule {
    return async (tree: Tree, context: SchematicContext) => {
        if (!config.eslintFix) {
            return;
        }

        let ESLint: TESLintConstructor;
        try {
            ({ ESLint } = loadESLintModule());
        } catch {
            context.logger.info('eslintFix: eslint is not installed in this project, skipping lint fix');
            return;
        }

        let eslint: IESLintInstance;
        try {
            eslint = new ESLint({ fix: true, cwd: process.cwd() });
        } catch (error) {
            context.logger.warn(`eslintFix: failed to initialize ESLint, skipping lint fix: ${(error as Error).message}`);
            return;
        }

        const generatedFiles = Array.from(new Set(
            tree.actions
                .filter(action => (action.kind === 'c' || action.kind === 'o') && action.path.endsWith('.ts'))
                .map(action => action.path)
        ));

        // Each file lints independently - run them concurrently; the tree
        // writes are synchronous and touch distinct paths.
        await Promise.all(generatedFiles.map(async filePath => {
            const buffer = tree.read(filePath);
            if (!buffer) {
                return;
            }
            const content = buffer.toString();
            const absolutePath = path.join(process.cwd(), filePath);

            try {
                if (await eslint.isPathIgnored(absolutePath)) {
                    return;
                }

                const [result] = await eslint.lintText(content, { filePath: absolutePath });

                if ((result?.fatalErrorCount ?? 0) > 0) {
                    const fatal = result.messages?.find(message => message.fatal);
                    context.logger.warn(`eslintFix: could not fix ${filePath}: ${fatal?.message || 'fatal lint error'}`);
                    return;
                }

                if (typeof result?.output === 'string' && result.output !== content) {
                    tree.overwrite(filePath, result.output);
                }
            } catch (error) {
                context.logger.warn(`eslintFix: failed for ${filePath}: ${(error as Error).message}`);
            }
        }));
    };
}
