import '../helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  setupSwaggerMock,
  resetFetchMocks,
  createTestTree,
  runTypesSchematic,
  ANGULAR_SCHEMATIC_OPTIONS
} from '../helpers/setup';
import { EDGE_CASES_SWAGGER_SCHEMA } from '../__fixtures__/swagger/edge-cases-schema.fixture';

/**
 * Snapshot coverage for the 1.2.0 edge-case fixes: every file generated from
 * the edge-cases fixture is snapshotted so future changes to enum
 * sanitization, union parenthesization, allOf inheritance, or nullability
 * show up as readable generated-output diffs.
 */
describe('Type generation edge cases', () => {
  let tree: UnitTestTree;

  beforeAll(async () => {
    setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, EDGE_CASES_SWAGGER_SCHEMA);
    tree = await runTypesSchematic(ANGULAR_SCHEMATIC_OPTIONS, createTestTree());
  });

  afterAll(() => {
    resetFetchMocks();
  });

  it('generates the expected files', () => {
    expect(tree.files.sort()).toMatchSnapshot();
  });

  it.each([
    ['enum without varnames sanitizes string values', 'enums/status-without-names.enum.ts'],
    ['numeric enum without varnames prefixes members', 'enums/numeric-codes.enum.ts'],
    ['short x-enum-varnames falls back per index', 'enums/partial-names.enum.ts'],
    ['quotes and backslashes are escaped', 'enums/tricky-values.enum.ts'],
    ['arrays of unions and nullable refs are parenthesized', 'interfaces/mixed-list-dto.interface.ts'],
    ['nullable Record keeps its outer | null', 'interfaces/nullable-map-dto.interface.ts'],
    ['allOf with own properties renders the inline literal', 'interfaces/derived-dto.type.ts'],
    ['allOf with a nullable ref member is parenthesized', 'interfaces/intersect-nullable-dto.type.ts']
  ])('%s', (_description, file) => {
    expect(tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/${file}`)).toMatchSnapshot();
  });
});
