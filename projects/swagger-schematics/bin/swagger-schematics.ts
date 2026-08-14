#!/usr/bin/env node
import * as path from 'path';
import { createConsoleLogger } from '@angular-devkit/core/node';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import { parseCliArgs, helpText, TCliCommand } from './cli-args';
import { logSchematicError } from '../helpers/error-logging.helper';
import { version } from '../package.json';

const COLLECTION_PATH = path.join(__dirname, '..', 'collection.json');

async function runSchematic(schematic: 'types' | 'api', options: Record<string, string | boolean>, positionals: string[], dryRun: boolean): Promise<void> {
    const logger = createConsoleLogger();

    const workflow = new NodeWorkflow(process.cwd(), {
        force: false,
        dryRun,
        resolvePaths: [process.cwd(), __dirname],
        schemaValidation: true
    });

    // Replicates the devkit CLI's positional-argument handling for
    // schema $default { $source: "argv", index: N }
    workflow.registry.addSmartDefaultProvider('argv', (deflt: { index?: number }) => {
        return deflt.index !== undefined ? positionals[deflt.index] : positionals;
    });

    workflow.reporter.subscribe(event => {
        const eventPath = event.path.startsWith('/') ? event.path.slice(1) : event.path;
        switch (event.kind) {
            case 'create':
            case 'update':
                logger.info(`${event.kind.toUpperCase()} ${eventPath} (${event.content.byteLength} bytes)`);
                break;
            case 'delete':
                logger.info(`DELETE ${eventPath}`);
                break;
            case 'rename':
                logger.info(`RENAME ${eventPath} => ${event.to}`);
                break;
            case 'error':
                logger.error(`ERROR ${eventPath} (${event.description})`);
                break;
        }
    });

    await new Promise<void>((resolve, reject) => {
        workflow.execute({
            collection: COLLECTION_PATH,
            schematic,
            options,
            logger
        }).subscribe({ complete: resolve, error: reject });
    });

    if (dryRun) {
        logger.info('Dry run: no files were written.');
    }
}

async function main(): Promise<void> {
    const args = parseCliArgs(process.argv.slice(2));

    if (args.version) {
        console.log(version);
        return;
    }

    if (args.help || (!args.command && !args.unknownCommand)) {
        console.log(helpText());
        if (!args.help) {
            process.exitCode = 1;
        }
        return;
    }

    if (args.unknownCommand) {
        console.error(`Unknown command '${args.unknownCommand}'. Expected one of: types, api, all.\n`);
        console.log(helpText());
        process.exitCode = 1;
        return;
    }

    const schematics: Array<'types' | 'api'> = args.command === 'all'
        ? ['types', 'api']
        : [args.command as Exclude<TCliCommand, 'all'>];

    for (const schematic of schematics) {
        await runSchematic(schematic, args.options, args.positionals, args.dryRun);
    }
}

main().catch(error => {
    // Schematic-level failures are already reported in detail by the
    // error-logging wrapper; this catches CLI/workflow-level errors too.
    logSchematicError('cli', error);
    process.exit(1);
});
