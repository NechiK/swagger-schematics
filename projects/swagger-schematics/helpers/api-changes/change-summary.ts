import * as fs from 'fs';
import * as path from 'path';
import { logging } from '@angular-devkit/core';
import { SwaggerApiSchema } from '../../api/schema';
import { resolveFramework } from '../../interfaces/swagger-schematics/framework';
import { fetchSwaggerSchema } from '../swagger-schema.helper';
import { buildApiModel } from './api-model';
import { diffApiModels, IApiChange } from './api-diff';
import { formatConsoleSummary, formatMarkdownReport, IFileCounts } from './format';
import { readSchemaSnapshot, resolveProjectPath, serializeSchemaSnapshot, writeTextFile } from './schema-snapshot';

export interface IChangeSummaryRun {
    /** The merged configuration (CLI options over openapi-schematics.json) */
    config: SwaggerApiSchema;
    /** `--change-report` file, relative to the working directory */
    reportPath?: string;
    dryRun: boolean;
    /** What the generation just wrote, from the workflow reporter */
    files: IFileCounts;
    logger: logging.LoggerApi;
}

/**
 * After `swagger-schematics all` generated the code: compares the schema with
 * the snapshot saved by the previous run, prints what changed in terms of the
 * generated symbols, optionally writes a markdown report, and saves the
 * current schema as the next run's snapshot. Does nothing unless
 * `schemaSnapshotPath` or `--change-report` is set.
 */
export async function runChangeSummary(run: IChangeSummaryRun): Promise<void> {
    const { config, logger } = run;
    const snapshotSetting = config.schemaSnapshotPath;
    if (!snapshotSetting && !run.reportPath) {
        return;
    }

    // Already loaded by the schematics in this run (the CLI caches it), so this is no extra request
    const current = await fetchSwaggerSchema(config.swaggerSchemaUrl as string);
    const snapshotPath = snapshotSetting ? resolveProjectPath(snapshotSetting) : null;
    let changes: IApiChange[] | null = null;

    if (snapshotPath) {
        const previous = readSchemaSnapshot(snapshotPath);
        if (previous.schema) {
            const modelOptions = {
                framework: resolveFramework(config.framework),
                typeMapping: config.typeMapping,
                legacyOptionalProperties: config.legacyOptionalProperties,
                apiPathKey: config.apiPathKey,
                scopeEndpointsWithTags: config.scopeEndpointsWithTags,
                // The same filters as the generation, so skipped APIs don't show as changes
                includeApis: config.includeApis,
                excludeApis: config.excludeApis,
                excludeDeprecated: config.excludeDeprecated
            };
            changes = diffApiModels(buildApiModel(previous.schema, modelOptions), buildApiModel(current, modelOptions));
        } else if (previous.reason === 'invalid') {
            logger.warn(`Schema snapshot ${snapshotSetting} is not valid JSON (${previous.error}); ` +
                `it is replaced with the current schema, and changes are listed from the next run.`);
        } else {
            logger.info(`No schema snapshot at ${snapshotSetting} yet, so API changes can't be listed on this run.`);
        }
    } else {
        logger.info('Set schemaSnapshotPath to list API changes; the change report only counts files for now.');
    }

    const summary = formatConsoleSummary(changes);
    if (summary.length) {
        logger.info('');
        summary.forEach(line => logger.info(line));
    }

    if (run.dryRun) {
        logger.info('Dry run: the schema snapshot and change report were not written.');
        return;
    }

    if (run.reportPath) {
        writeTextFile(path.resolve(process.cwd(), run.reportPath), formatMarkdownReport(changes, run.files));
        logger.info(`Wrote the API change report to ${run.reportPath}`);
    }

    if (snapshotPath) {
        const content = serializeSchemaSnapshot(current);
        const existing = fs.existsSync(snapshotPath) ? fs.readFileSync(snapshotPath, 'utf-8') : null;
        if (existing !== content) {
            writeTextFile(snapshotPath, content);
            logger.info(`Saved the schema snapshot to ${snapshotSetting}` +
                (changes === null ? '; the next run lists API changes against it.' : ''));
        }
    }
}
