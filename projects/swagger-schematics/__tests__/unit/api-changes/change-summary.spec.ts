import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { logging } from '@angular-devkit/core';
import { runChangeSummaryAfterGeneration } from '@lib/helpers/api-changes/change-summary';
import { SwaggerApiSchema } from '@lib/api/schema';

const SCHEMA = { openapi: '3.0.1', info: { title: 'T', version: '1' }, paths: {}, components: { schemas: {} } };
const FILES = { created: 0, updated: 0, deleted: 0 };

/** After generation the code is written: the summary only fails the run when a requested report is missing. */
describe('runChangeSummaryAfterGeneration', () => {
  let dir: string;
  let messages: Array<[string, string]>;
  let logger: logging.Logger;
  const relative = (file: string) => path.relative(process.cwd(), path.join(dir, file));
  const config = (extra: Partial<SwaggerApiSchema> = {}) =>
    ({ swaggerSchemaUrl: path.join(dir, 'swagger.json'), framework: 'angular', ...extra }) as SwaggerApiSchema;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'change-summary-'));
    fs.writeFileSync(path.join(dir, 'swagger.json'), JSON.stringify(SCHEMA));
    // A file where a directory is expected: nothing can be written under it
    fs.writeFileSync(path.join(dir, 'blocked'), '');
    messages = [];
    logger = new logging.Logger('test');
    logger.subscribe(entry => messages.push([entry.level, entry.message]));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fails the run when a requested change report cannot be written', async () => {
    const ok = await runChangeSummaryAfterGeneration({
      config: config(), reportPath: relative('blocked/report.md'), dryRun: false, files: FILES, logger
    });

    expect(ok).toBe(false);
    expect(messages).toContainEqual(['error', expect.stringContaining('Could not write the API change report')]);
  });

  it('only warns when the schema snapshot cannot be saved, and still writes the report', async () => {
    const ok = await runChangeSummaryAfterGeneration({
      config: config({ schemaSnapshotPath: relative('blocked/snapshot.json') }),
      reportPath: relative('report.md'),
      dryRun: false,
      files: FILES,
      logger
    });

    expect(ok).toBe(true);
    expect(fs.existsSync(path.join(dir, 'report.md'))).toBe(true);
    expect(messages).toContainEqual(['warn', expect.stringContaining('Could not save the schema snapshot')]);
  });

  it('only warns when the summary fails without a report requested', async () => {
    const ok = await runChangeSummaryAfterGeneration({
      config: config({ swaggerSchemaUrl: path.join(dir, 'missing.json'), schemaSnapshotPath: relative('snapshot.json') }),
      dryRun: false,
      files: FILES,
      logger
    });

    expect(ok).toBe(true);
    expect(messages).toContainEqual(['warn', expect.stringContaining('Could not build the API change summary')]);
  });
});
