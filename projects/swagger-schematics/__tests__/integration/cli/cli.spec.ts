import '@helpers/matchers';
import { countOccurrences } from '@helpers/setup';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * End-to-end tests for the swagger-schematics CLI bin. NodeWorkflow writes to
 * the real filesystem, so each test runs the bin as a child process (via
 * ts-node, so no prior build is required) inside a temp project directory.
 */
describe('swagger-schematics CLI', () => {
  const packageRoot = path.join(__dirname, '../../..');
  const tsNodeBin = path.join(packageRoot, 'node_modules/.bin/ts-node');
  const binSource = path.join(packageRoot, 'bin/swagger-schematics.ts');

  const SCHEMA = {
    openapi: '3.0.1',
    info: { title: 'T', version: 'v1' },
    paths: {
      '/api/Widget': {
        get: {
          tags: ['Widget'],
          summary: 'List widgets',
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/WidgetDto' } }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        WidgetDto: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', nullable: true }
          }
        }
      }
    }
  };

  let projectDir: string;

  const runCli = (cliArgs: string, expectFailure = false): string => {
    try {
      // 2>&1: warnings (stderr) are part of what a user sees, so assert on them too
      return execSync(`"${tsNodeBin}" --transpile-only "${binSource}" ${cliArgs} 2>&1`, {
        cwd: projectDir,
        encoding: 'utf8',
        timeout: 120000,
        env: { ...process.env, TS_NODE_PROJECT: path.join(packageRoot, 'tsconfig.json') },
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      if (expectFailure) {
        const failed = error as { status: number | null; stdout?: string; stderr?: string };
        return `EXIT:${failed.status}\n${failed.stdout ?? ''}${failed.stderr ?? ''}`;
      }
      throw error;
    }
  };

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swagger-schematics-cli-'));
    fs.writeFileSync(path.join(projectDir, 'schema.json'), JSON.stringify(SCHEMA));
    fs.writeFileSync(path.join(projectDir, 'openapi-schematics.json'), JSON.stringify({
      swaggerSchemaUrl: './schema.json',
      path: '/src/app/core',
      framework: 'angular'
    }));
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it('should generate types and api files with the all command', () => {
    const output = runCli('all');

    expect(output).toContain('CREATE src/app/core/interfaces/widget-dto.interface.ts');
    expect(output).toContain('CREATE src/app/core/widget-api.service.ts');
    expect(fs.existsSync(path.join(projectDir, 'src/app/core/widget-api.service.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'src/app/core/interfaces/widget-dto.interface.ts'))).toBe(true);

    const serviceContent = fs.readFileSync(path.join(projectDir, 'src/app/core/widget-api.service.ts'), 'utf8');
    expect(serviceContent).toContain('export class WidgetApiService extends ApiBaseService');
  }, 120000);

  it('should fail with a clear error when framework is not set', () => {
    fs.writeFileSync(path.join(projectDir, 'openapi-schematics.json'), JSON.stringify({
      swaggerSchemaUrl: './schema.json',
      path: '/src/app/core'
    }));

    const output = runCli('api', true);

    expect(output).toContain('EXIT:1');
    expect(output).toContain("Framework is not defined in the configuration. Please set 'framework' to 'angular' or 'react-rtk'.");
  }, 120000);

  it('should fail with a clear error for an unsupported framework in the config file', () => {
    fs.writeFileSync(path.join(projectDir, 'openapi-schematics.json'), JSON.stringify({
      swaggerSchemaUrl: './schema.json',
      path: '/src/app/core',
      framework: 'react'
    }));

    const output = runCli('api', true);

    expect(output).toContain('EXIT:1');
    expect(output).toContain("Framework 'react' is not supported. Please set 'framework' to 'angular' or 'react-rtk'.");
    expect(output).not.toContain('TypeError');
  }, 120000);

  it.each([
    ['missing', {}, 'Framework is not defined in the configuration.'],
    ['unsupported', { framework: 'react' }, "Framework 'react' is not supported."]
  ])('should fail the all command on a %s framework before writing any types', (_case, frameworkConfig, message) => {
    fs.writeFileSync(path.join(projectDir, 'openapi-schematics.json'), JSON.stringify({
      swaggerSchemaUrl: './schema.json',
      path: '/src/app/core',
      ...frameworkConfig
    }));

    const output = runCli('all', true);

    expect(output).toContain('EXIT:1');
    expect(output).toContain(message);
    expect(output).not.toContain('CREATE');
    expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(false);
  }, 120000);

  it('should read a relative apiServiceTemplatePath from the project root', () => {
    const templateDir = path.join(projectDir, 'templates/api-service');
    fs.mkdirSync(templateDir, { recursive: true });
    fs.writeFileSync(path.join(templateDir, '__name@dasherize__-api.service.ts.template'),
      'export class <%= classify(name) %>CustomApiService {}\n');

    const output = runCli('all --api-service-template-path=./templates/api-service');

    expect(output).toContain('CREATE src/app/core/widget-api.service.ts');
    const serviceContent = fs.readFileSync(path.join(projectDir, 'src/app/core/widget-api.service.ts'), 'utf8');
    expect(serviceContent).toBe('export class WidgetCustomApiService {}\n');
  }, 120000);

  it('should fail on a missing template directory before writing anything, keeping the existing services', () => {
    runCli('all');
    const servicePath = path.join(projectDir, 'src/app/core/widget-api.service.ts');
    const before = fs.readFileSync(servicePath, 'utf8');

    const output = runCli('all --api-service-template-path=./templates/typo', true);

    expect(output).toContain('EXIT:1');
    expect(output).toContain(`apiServiceTemplatePath: template directory '${path.join(fs.realpathSync(projectDir), 'templates/typo')}' not found`);
    expect(output).not.toContain('DELETE');
    expect(output).not.toContain('UPDATE');
    expect(fs.readFileSync(servicePath, 'utf8')).toBe(before);
  }, 120000);

  it('should accept the framework from a CLI flag for the all command', () => {
    fs.writeFileSync(path.join(projectDir, 'openapi-schematics.json'), JSON.stringify({
      swaggerSchemaUrl: './schema.json',
      path: '/src/app/core'
    }));

    const output = runCli('all --framework=angular');

    expect(output).toContain('CREATE src/app/core/widget-api.service.ts');
  }, 120000);

  it('should load the schema once for the all command', () => {
    const output = runCli('all');

    expect(countOccurrences(output, 'Reading swagger schema from file')).toBe(1);
    expect(countOccurrences(output, 'Reusing the swagger schema already loaded')).toBe(1);
    expect(output).toContain('CREATE src/app/core/widget-api.service.ts');
  }, 120000);

  it('should report but not write files with --dry-run', () => {
    const output = runCli('types --dry-run');

    expect(output).toContain('CREATE src/app/core/interfaces/widget-dto.interface.ts');
    expect(output).toContain('Dry run: no files were written.');
    expect(fs.existsSync(path.join(projectDir, 'src'))).toBe(false);
  }, 120000);

  it('should fail with exit code 1 and a clear error for a missing schema file', () => {
    const output = runCli('types --swagger-schema-url=./missing.json', true);

    expect(output).toContain('EXIT:1');
    expect(output).toContain('Swagger schema file not found');
  }, 120000);

  describe('API change summary', () => {
    const snapshotFile = () => path.join(projectDir, 'src/app/core/openapi.snapshot.json');
    const reportFile = () => path.join(projectDir, 'api-changes.md');

    beforeEach(() => {
      fs.writeFileSync(path.join(projectDir, 'openapi-schematics.json'), JSON.stringify({
        swaggerSchemaUrl: './schema.json',
        path: '/src/app/core',
        framework: 'angular',
        schemaSnapshotPath: '/src/app/core/openapi.snapshot.json'
      }));
    });

    const changeSchema = () => {
      const changed = JSON.parse(JSON.stringify(SCHEMA));
      delete changed.components.schemas.WidgetDto.properties.name;
      changed.components.schemas.WidgetDto.properties.id = { type: 'string' };
      changed.components.schemas.TagDto = { type: 'object', properties: { label: { type: 'string' } } };
      fs.writeFileSync(path.join(projectDir, 'schema.json'), JSON.stringify(changed));
    };

    it('should save a snapshot on the first run and explain there is nothing to compare yet', () => {
      const output = runCli('all --change-report=api-changes.md');

      expect(output).toContain("No schema snapshot at /src/app/core/openapi.snapshot.json yet");
      expect(JSON.parse(fs.readFileSync(snapshotFile(), 'utf8'))).toEqual(SCHEMA);
      expect(fs.readFileSync(reportFile(), 'utf8')).toContain('No previous schema snapshot');
    }, 120000);

    it('should print and report what changed since the snapshot, then update it', () => {
      runCli('all');
      changeSchema();

      const output = runCli('all --change-report=api-changes.md');

      expect(output).toContain('API changes since the last snapshot: 2 breaking, 1 added');
      expect(output).toContain('⚠ Property changed');
      expect(output).toContain('IWidgetDto.id  id: number → id: string');
      expect(output).toContain('IWidgetDto.name');
      expect(output).toContain('+ Interface added');
      expect(output).toContain('Wrote the API change report to api-changes.md');

      const report = fs.readFileSync(reportFile(), 'utf8');
      expect(report).toContain('## API changes: 2 breaking, 1 added');
      expect(report).toContain('- Property removed: `IWidgetDto.name`');
      expect(report).toContain('- Interface added: `ITagDto`');
      expect(report).toContain('_Files: 1 created, ');

      expect(JSON.parse(fs.readFileSync(snapshotFile(), 'utf8')).components.schemas.TagDto).toBeDefined();
      expect(runCli('all')).toContain('API changes since the last snapshot: none');
    }, 180000);

    it('should list no changes for an unchanged schema whose generated code depends on key order', () => {
      const schema = JSON.parse(JSON.stringify(SCHEMA));
      schema.components.schemas.BaseDto = { type: 'object', properties: { id: { type: 'integer' } } };
      // allOf plus properties (Swashbuckle inheritance) renders its properties in document order,
      // `total` before `currency`, which a key-sorted snapshot would read back the other way round
      schema.components.schemas.OrderDto = {
        allOf: [{ $ref: '#/components/schemas/BaseDto' }],
        properties: { total: { type: 'number' }, currency: { type: 'string' } }
      };
      fs.writeFileSync(path.join(projectDir, 'schema.json'), JSON.stringify(schema));
      runCli('all');

      expect(runCli('all')).toContain('API changes since the last snapshot: none');
    }, 180000);

    it('should print the summary but write no snapshot or report on --dry-run', () => {
      runCli('all');
      const snapshotBefore = fs.readFileSync(snapshotFile(), 'utf8');
      changeSchema();

      const output = runCli('all --dry-run --change-report=api-changes.md');

      expect(output).toContain('API changes since the last snapshot: 2 breaking, 1 added');
      expect(output).toContain('Dry run: the schema snapshot and change report were not written.');
      expect(fs.readFileSync(snapshotFile(), 'utf8')).toBe(snapshotBefore);
      expect(fs.existsSync(reportFile())).toBe(false);
    }, 180000);

    it('should not touch the snapshot when a single schematic runs', () => {
      const output = runCli('types --change-report=api-changes.md');

      expect(output).toContain('The API change summary runs with the all command only');
      expect(fs.existsSync(snapshotFile())).toBe(false);
      expect(fs.existsSync(reportFile())).toBe(false);
    }, 120000);
  });

  it('should fail with exit code 1 for an unknown command', () => {
    const output = runCli('generate', true);

    expect(output).toContain('EXIT:1');
    expect(output).toContain("Unknown command 'generate'");
  }, 120000);
});
