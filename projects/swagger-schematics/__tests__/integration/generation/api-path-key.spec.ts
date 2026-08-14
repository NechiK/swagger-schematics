import '@helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  resetFetchMocks,
  runFullSchematics,
  ANGULAR_SCHEMATIC_OPTIONS
} from '@helpers/setup';
import { V1_PREFIX_SWAGGER_SCHEMA } from '@fixtures/swagger/v1-prefix-schema.fixture';

/**
 * End-to-end proof that apiPathKey works: a /v1/-rooted document (which the
 * hardcoded /api/ prefix used to skip entirely) generates a full service.
 */
describe('apiPathKey generation (Angular)', () => {
  let tree: UnitTestTree;

  beforeAll(async () => {
    tree = await runFullSchematics(V1_PREFIX_SWAGGER_SCHEMA, {
      ...ANGULAR_SCHEMATIC_OPTIONS,
      apiPathKey: '/v1/'
    });
  });

  afterAll(() => {
    resetFetchMocks();
  });

  it('generates a service from the /v1/ prefix', () => {
    expect(tree.files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/widget-api.service.ts`);
  });

  it('the generated service renders consistently', () => {
    expect(tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/widget-api.service.ts`)).toMatchSnapshot();
  });
});
