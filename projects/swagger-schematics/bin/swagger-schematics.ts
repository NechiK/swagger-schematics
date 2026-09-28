#!/usr/bin/env node
import * as path from 'path';
import { createConsoleLogger } from '@angular-devkit/core/node';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import { parseCliArgs, helpText, TCliCommand } from './cli-args';
import { logSchematicError } from '../helpers/error-logging.helper';
import { enableSwaggerSchemaCache } from '../helpers/swagger-schema.helper';
import { getOpenapiSchematicsConfig } from '../helpers/config';
import { resolveFramework } from '../interfaces/swagger-schematics/framework';
import { resolveTemplateDir } from '../api/helpers/template-path.helper';
import { SwaggerApiSchema } from '../api/schema';
import { runChangeSummaryAfterGeneration } from '../helpers/api-changes/change-summary';
import { IFileCounts } from '../helpers/api-changes/format';
import { version } from '../package.json';

const COLLECTION_PATH = path.join(__dirname, '..', 'collection.json');

async function runSchematic(schematic: 'types' | 'api', options: Record<string, string | boolean | string[]>, positionals: string[], dryRun: boolean, files: IFileCounts): Promise<void> {
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
                files[event.kind === 'create' ? 'created' : 'updated']++;
                logger.info(`${event.kind.toUpperCase()} ${eventPath} (${event.content.byteLength} bytes)`);
                break;
            case 'delete':
                files.deleted++;
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

    let config: SwaggerApiSchema | null = null;
    if (args.command === 'all') {
        // `all` runs types before api: validate what api needs up front, so a
        // missing or unsupported framework, or a wrong template path, fails
        // before any types are written.
        config = getOpenapiSchematicsConfig({
            ...args.options,
            swaggerSchemaUrl: args.options.swaggerSchemaUrl ?? args.positionals[0]
        } as SwaggerApiSchema);
        resolveFramework(config.framework);
        if (config.apiServiceTemplatePath) {
            resolveTemplateDir('apiServiceTemplatePath', config.apiServiceTemplatePath);
        }
        if (config.baseApiTemplatePath) {
            resolveTemplateDir('baseApiTemplatePath', config.baseApiTemplatePath);
        }
    } else if (args.changeReport || args.options.schemaSnapshotPath) {
        console.warn('[swagger-schematics] The API change summary runs with the all command only; ' +
            'no snapshot or change report is written for a single schematic.');
    }

    // `all` runs types and api in this process: load the schema once for both
    enableSwaggerSchemaCache();

    const files: IFileCounts = { created: 0, updated: 0, deleted: 0 };
    for (const schematic of schematics) {
        await runSchematic(schematic, args.options, args.positionals, args.dryRun, files);
    }

    if (config) {
        const succeeded = await runChangeSummaryAfterGeneration({
            config, reportPath: args.changeReport, dryRun: args.dryRun, files, logger: createConsoleLogger()
        });
        if (!succeeded) {
            process.exitCode = 1;
        }
    }
}

main().catch(error => {
    // Schematic-level failures are already reported in detail by the
    // error-logging wrapper; this catches CLI/workflow-level errors too.
    logSchematicError('cli', error);
    process.exit(1);
});
