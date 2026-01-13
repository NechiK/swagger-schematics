import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { ISwaggerSchema } from '../../interfaces/version_3_1/swagger.interface';
import { loadFixture, loadJsonFixture } from '../__fixtures__';

// ============================================================================
// Axios Mock Setup
// ============================================================================

export const mockAxios = new MockAdapter(axios);

export const setupSwaggerMock = <T extends string>(
  url: string,
  schema: ISwaggerSchema<T>
): void => {
  mockAxios.onGet(url).reply(200, schema);
};

export const resetAxiosMocks = (): void => {
  mockAxios.reset();
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
