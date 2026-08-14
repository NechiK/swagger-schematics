import '@helpers/matchers';
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
      return execSync(`"${tsNodeBin}" --transpile-only "${binSource}" ${cliArgs}`, {
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

  it('should fail with exit code 1 for an unknown command', () => {
    const output = runCli('generate', true);

    expect(output).toContain('EXIT:1');
    expect(output).toContain("Unknown command 'generate'");
  }, 120000);
});
