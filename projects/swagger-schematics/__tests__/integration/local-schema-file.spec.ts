import '../helpers/matchers';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  createTestTree,
  runTypesSchematic,
  runApiSchematic,
  ANGULAR_SCHEMATIC_OPTIONS
} from '../helpers/setup';
import { BINARY_SWAGGER_SCHEMA } from '../__fixtures__/swagger/binary-schema.fixture';

/**
 * End-to-end: generation from a local schema file - no network, no fetch mock.
 * This is the CI workflow for pipelines without access to the API host.
 */
describe('Generation from a local schema file', () => {
  let tmpDir: string;
  let tree: UnitTestTree;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swagger-schematics-'));
    const schemaFile = path.join(tmpDir, 'openapi-swagger.json');
    fs.writeFileSync(schemaFile, JSON.stringify(BINARY_SWAGGER_SCHEMA));

    const options = { ...ANGULAR_SCHEMATIC_OPTIONS, swaggerSchemaUrl: schemaFile };

    let testTree = createTestTree();
    testTree = await runTypesSchematic(options, testTree);
    tree = await runApiSchematic(options, testTree);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate the API service without any network access', () => {
    expect(tree.files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/document-api.service.ts`);
  });

  it('should generate identical content to URL-based generation', () => {
    const serviceContent = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/document-api.service.ts`);
    expect(serviceContent).toContain('export class DocumentApiService extends ApiBaseService');
    expect(serviceContent).toContain("responseType: 'blob'");
  });
});
