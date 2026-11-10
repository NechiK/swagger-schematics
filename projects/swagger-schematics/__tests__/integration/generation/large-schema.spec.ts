import {
  runApiSchematic,
  runTypesSchematic,
  setupSwaggerMock,
  resetFetchMocks,
  ANGULAR_SCHEMATIC_OPTIONS
} from '@helpers/setup';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';

// One rule is built per generated file. Chained with the devkit's `chain()`, they
// nest one observable per rule, and subscribing to the result overflowed the stack
// (`RangeError: Maximum call stack size exceeded`) on a real API with 1,059 schemas.
// These counts are well beyond what overflowed, so a return to nesting fails here
// (as a timeout: the overflow is thrown inside a promise callback and the run never settles).
const SCHEMA_COUNT = 3000;
const API_COUNT = 3000;

const createLargeSchema = (): ISwaggerSchema => {
  const schemas: Record<string, unknown> = {};
  for (let index = 0; index < SCHEMA_COUNT; index++) {
    schemas[`Item${index}Dto`] = {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer' }, name: { type: 'string' } }
    };
  }

  const paths: Record<string, unknown> = {};
  for (let index = 0; index < API_COUNT; index++) {
    paths[`/api/Group${index}/all`] = {
      get: {
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: `#/components/schemas/Item${index}Dto` } } }
          }
        }
      }
    };
  }

  return {
    openapi: '3.0.1',
    info: { title: 'Large API', version: '1.0.0' },
    paths,
    components: { schemas }
  } as unknown as ISwaggerSchema;
};

describe('large schemas', () => {
  beforeEach(() => {
    resetFetchMocks();
    setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, createLargeSchema());
  });

  it('should generate a file for each of several thousand schemas', async () => {
    const tree = await runTypesSchematic(ANGULAR_SCHEMATIC_OPTIONS);

    const interfaces = tree.files.filter(file => file.endsWith('.interface.ts'));
    expect(interfaces).toHaveLength(SCHEMA_COUNT);
  }, 60_000);

  it('should generate a service for each of several thousand APIs', async () => {
    const tree = await runApiSchematic(ANGULAR_SCHEMATIC_OPTIONS);

    const services = tree.files.filter(file => file.endsWith('-api.service.ts'));
    expect(services).toHaveLength(API_COUNT);
  }, 60_000);
});
