import '../helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  resetFetchMocks,
  runFullSchematics,
  ANGULAR_SCHEMATIC_OPTIONS
} from '../helpers/setup';
import { EDGE_CASES_SWAGGER_SCHEMA } from '../__fixtures__/swagger/edge-cases-schema.fixture';

/**
 * Snapshot coverage for the 1.2.0 response-resolution fixes, as generated
 * Angular service output: a bodyless 200 next to a binary 2XX must produce a
 * Blob method WITH responseType: 'blob', an xml-only response must be typed,
 * and a response-level $ref must resolve.
 */
describe('API generation edge cases (Angular)', () => {
  let tree: UnitTestTree;

  beforeAll(async () => {
    tree = await runFullSchematics(EDGE_CASES_SWAGGER_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
  });

  afterAll(() => {
    resetFetchMocks();
  });

  it('generates the edge-case service', () => {
    expect(tree.files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/edge-case-api.service.ts`);
  });

  it('response edge cases render consistently in the service', () => {
    expect(tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/edge-case-api.service.ts`)).toMatchSnapshot();
  });
});
