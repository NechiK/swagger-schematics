import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { ISwaggerSchema } from '../../interfaces/version_3_1/swagger.interface';
import { loadFixture, loadJsonFixture } from '../__fixtures__';

// ============================================================================
// Fetch Mock Setup
// ============================================================================

const swaggerMocks = new Map<string, unknown>();

globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const schema = swaggerMocks.get(requestUrl);

  if (schema === undefined) {
    return { ok: false, status: 404, statusText: 'Not Found' } as Response;
  }

  return { ok: true, status: 200, statusText: 'OK', json: async () => schema } as Response;
}) as typeof fetch;

export const setupSwaggerMock = <T extends string>(
  url: string,
  schema: ISwaggerSchema<T>
): void => {
  swaggerMocks.set(url, schema);
};

export const resetFetchMocks = (): void => {
  swaggerMocks.clear();
};

// ============================================================================
// Schematic Test Runner Setup
// ============================================================================

const collectionPath = path.join(__dirname, '../../collection.json');

export const schematicRunner = new SchematicTestRunner('swagger-schematics', collectionPath);

export interface SchematicOptions {
  swaggerSchemaUrl: string;
  path: string;
  framework: string;
  baseApiPath?: string;
  scopeEndpointsWithTags?: boolean;
  eslintFix?: boolean;
  legacyOptionalProperties?: boolean;
}

export const ANGULAR_SCHEMATIC_OPTIONS: SchematicOptions = loadJsonFixture('angular-options.fixture.json');
export const RTK_SCHEMATIC_OPTIONS: SchematicOptions = loadJsonFixture('rtk-options.fixture.json');

export const createTestTree = (): UnitTestTree => {
  const tree = new UnitTestTree(Tree.empty());
  tree.create('.editorconfig', loadFixture('.editorconfig.fixture'));
  tree.create('tsconfig.json', JSON.stringify(loadJsonFixture('tsconfig.fixture.json'), null, 2));
  return tree;
};

export const runTypesSchematic = async (
  options: SchematicOptions,
  tree?: UnitTestTree
): Promise<UnitTestTree> => {
  const inputTree = tree ?? createTestTree();
  return schematicRunner.runSchematic('types', options, inputTree);
};

export const runApiSchematic = async (
  options: SchematicOptions,
  tree?: UnitTestTree
): Promise<UnitTestTree> => {
  const inputTree = tree ?? createTestTree();
  return schematicRunner.runSchematic('api', options, inputTree);
};

export const runFullSchematics = async <T extends string>(
  swaggerSchema: ISwaggerSchema<T>,
  options: SchematicOptions
): Promise<UnitTestTree> => {
  setupSwaggerMock(options.swaggerSchemaUrl, swaggerSchema);

  let tree = createTestTree();
  tree = await runTypesSchematic(options, tree);
  tree = await runApiSchematic(options, tree);

  return tree;
};

// ============================================================================
// Test Utilities
// ============================================================================

export const isArrayUnique = <T>(arr: T[]): boolean => {
  return arr.length === new Set(arr).size;
};

export const getImportLines = (content: string): string[] => {
  return content
    .split('\n')
    .filter(line => line.startsWith('import '))
    .map(line => line.trim());
};

export const countOccurrences = (content: string, search: string): number => {
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = content.match(new RegExp(escaped, 'g'));
  return matches?.length ?? 0;
};
