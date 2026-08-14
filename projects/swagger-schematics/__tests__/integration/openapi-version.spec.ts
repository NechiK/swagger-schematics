import '../helpers/matchers';
import {
  setupSwaggerMock,
  resetFetchMocks,
  runFullSchematics,
  schematicRunner,
  ANGULAR_SCHEMATIC_OPTIONS
} from '../helpers/setup';
import { BINARY_SWAGGER_SCHEMA } from '../__fixtures__/swagger/binary-schema.fixture';

describe('OpenAPI version detection', () => {
  let warnings: string[];
  let subscription: { unsubscribe(): void };

  beforeEach(() => {
    warnings = [];
    subscription = schematicRunner.logger.subscribe(entry => {
      if (entry.level === 'warn') {
        warnings.push(entry.message);
      }
    });
    resetFetchMocks();
  });

  afterEach(() => {
    subscription.unsubscribe();
    resetFetchMocks();
  });

  it('should generate silently for supported 3.0 documents', async () => {
    const tree = await runFullSchematics(BINARY_SWAGGER_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);

    expect(tree.files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/document-api.service.ts`);
    expect(warnings.filter(message => message.includes('OpenAPI'))).toEqual([]);
  });

  it('should warn but still generate for a newer 3.x version', async () => {
    const futureSchema = { ...BINARY_SWAGGER_SCHEMA, openapi: '3.2.0' };
    const tree = await runFullSchematics(futureSchema, ANGULAR_SCHEMATIC_OPTIONS);

    expect(tree.files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/document-api.service.ts`);
    expect(warnings.some(message => message.includes('3.2.0'))).toBe(true);
  });

  it('should warn but still run for a Swagger 2.0 document', async () => {
    const swagger2Doc = {
      swagger: '2.0',
      info: { title: 'Legacy', version: '1.0' },
      paths: {},
      components: { schemas: {} }
    } as any;

    setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, swagger2Doc);
    const tree = await runFullSchematics(swagger2Doc, ANGULAR_SCHEMATIC_OPTIONS);

    expect(tree).toBeDefined();
    expect(warnings.some(message => message.includes('Swagger 2.0 is not supported'))).toBe(true);
  });
});
