import '@helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  resetFetchMocks,
  runFullSchematics,
  runTypesSchematic,
  runApiSchematic,
  setupSwaggerMock,
  schematicRunner,
  createTestTree,
  ANGULAR_SCHEMATIC_OPTIONS,
  RTK_SCHEMATIC_OPTIONS,
  SchematicOptions
} from '@helpers/setup';
import { createSwaggerSchema, createGetOperation, createPathParam } from '@helpers/factories';
import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';
import { MANIFEST_FILE_NAME } from '../../../helpers/generated-files-manifest.helper';

const OUT = ANGULAR_SCHEMATIC_OPTIONS.path;
const MANIFEST = `${OUT}/${MANIFEST_FILE_NAME}`;

const getById = (tag: string, dto: string) => createGetOperation({
  tags: [tag],
  parameters: [createPathParam('id', 'integer')],
  responses: {
    '200': { description: 'ok', content: { 'application/json': { schema: { $ref: `#/components/schemas/${dto}` } } } }
  }
});

const DTO = { type: 'object', properties: { id: { type: 'integer' } } };

/** Users + Orders controllers, a DTO each and an enum. */
const FULL_SCHEMA = createSwaggerSchema<string>({
  paths: {
    '/api/Users/{id}': getById('Users', 'UserDto'),
    '/api/Orders/{id}': getById('Orders', 'OrderDto')
  } as never,
  schemas: {
    UserDto: DTO,
    OrderDto: DTO,
    OrderStatus: { type: 'string', enum: ['New', 'Done'] }
  } as never
});

/** The back-end removed the Orders controller, OrderDto and OrderStatus. */
const REDUCED_SCHEMA = createSwaggerSchema<string>({
  paths: { '/api/Users/{id}': getById('Users', 'UserDto') } as never,
  schemas: { UserDto: DTO } as never
});

const regenerate = async (
  tree: UnitTestTree,
  schema: ISwaggerSchema<string>,
  options: SchematicOptions = ANGULAR_SCHEMATIC_OPTIONS
): Promise<UnitTestTree> => {
  setupSwaggerMock(options.swaggerSchemaUrl, schema);
  const typesTree = await runTypesSchematic(options, tree);
  return runApiSchematic(options, typesTree);
};

const captureWarnings = (): { warnings: string[]; stop: () => void } => {
  const warnings: string[] = [];
  const subscription = schematicRunner.logger.subscribe(entry => {
    if (entry.level === 'warn') {
      warnings.push(entry.message);
    }
  });
  return { warnings, stop: () => subscription.unsubscribe() };
};

describe('Stale generated files', () => {
  afterEach(() => {
    resetFetchMocks();
  });

  describe('when the back-end removes a controller and its DTOs', () => {
    // The second run mutates the first run's tree, so capture its state up front
    let firstFiles: string[];
    let firstManifest: { types: string[]; api: string[] };
    let second: UnitTestTree;

    beforeAll(async () => {
      const first = await runFullSchematics(FULL_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
      firstFiles = [...first.files];
      firstManifest = JSON.parse(first.readContent(MANIFEST));
      second = await regenerate(first, REDUCED_SCHEMA);
    });

    it('generated everything on the first run', () => {
      expect(firstFiles).toEqual(expect.arrayContaining([
        `${OUT}/orders-api.service.ts`,
        `${OUT}/interfaces/order-dto.interface.ts`,
        `${OUT}/enums/order-status.enum.ts`
      ]));
    });

    it('records the generated files in the manifest, relative to path and sorted', () => {
      const manifest = firstManifest;
      expect(manifest.types).toEqual([
        'enums/order-status.enum.ts',
        'interfaces/order-dto.interface.ts',
        'interfaces/user-dto.interface.ts'
      ]);
      expect(manifest.api).toEqual(['orders-api.service.ts', 'users-api.service.ts']);
    });

    it('deletes the removed service, interface and enum', () => {
      expect(second.files).not.toContain(`${OUT}/orders-api.service.ts`);
      expect(second.files).not.toContain(`${OUT}/interfaces/order-dto.interface.ts`);
      expect(second.files).not.toContain(`${OUT}/enums/order-status.enum.ts`);
    });

    it('keeps what is still in the schema and the base API files', () => {
      expect(second.files).toEqual(expect.arrayContaining([
        `${OUT}/users-api.service.ts`,
        `${OUT}/interfaces/user-dto.interface.ts`,
        `${OUT}/_api-base.service.ts`,
        `${OUT}/_api-base-url.token.ts`
      ]));
    });

    it('updates the manifest to the current files', () => {
      const manifest = JSON.parse(second.readContent(MANIFEST));
      expect(manifest.types).toEqual(['interfaces/user-dto.interface.ts']);
      expect(manifest.api).toEqual(['users-api.service.ts']);
    });
  });

  it('never deletes a hand-written file that is not in the manifest', async () => {
    const tree = await runFullSchematics(FULL_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    tree.create(`${OUT}/interfaces/hand-written.interface.ts`, 'export interface IHandWritten {}\n');
    tree.create(`${OUT}/auth-api.service.ts`, 'export class AuthApiService {}\n');

    const result = await regenerate(tree, REDUCED_SCHEMA);

    expect(result.files).toContain(`${OUT}/interfaces/hand-written.interface.ts`);
    expect(result.files).toContain(`${OUT}/auth-api.service.ts`);
  });

  it('removes nothing when the schema produces no files at all', async () => {
    const tree = await runFullSchematics(FULL_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const emptySchema = createSwaggerSchema<string>({ paths: {} as never, schemas: {} as never });
    const log = captureWarnings();

    const result = await regenerate(tree, emptySchema);
    log.stop();

    expect(result.files).toContain(`${OUT}/orders-api.service.ts`);
    expect(result.files).toContain(`${OUT}/interfaces/order-dto.interface.ts`);
    expect(log.warnings.some(message => message.includes('no files were generated'))).toBe(true);
    // The manifest keeps tracking them, so the next good run can still clean up
    expect(JSON.parse(result.readContent(MANIFEST)).api).toContain('orders-api.service.ts');
  });

  it('keeps stale files and warns when removeStaleFiles is false, but still tracks them', async () => {
    const options = { ...ANGULAR_SCHEMATIC_OPTIONS, removeStaleFiles: false };
    const tree = await runFullSchematics(FULL_SCHEMA, options);
    const log = captureWarnings();

    const kept = await regenerate(tree, REDUCED_SCHEMA, options);
    log.stop();

    expect(kept.files).toContain(`${OUT}/orders-api.service.ts`);
    expect(log.warnings.some(message => message.includes(`${OUT}/orders-api.service.ts`))).toBe(true);
    expect(JSON.parse(kept.readContent(MANIFEST)).api).toContain('orders-api.service.ts');

    const cleaned = await regenerate(kept, REDUCED_SCHEMA);
    expect(cleaned.files).not.toContain(`${OUT}/orders-api.service.ts`);
  });

  it('on the first run with a manifest missing, deletes nothing and lists probable leftovers', async () => {
    const tree = createTestTree();
    tree.create(`${OUT}/interfaces/old-dto.interface.ts`, 'export interface IOldDto {}\n');
    tree.create(`${OUT}/old-api.service.ts`, 'export class OldApiService {}\n');
    const log = captureWarnings();

    const result = await regenerate(tree, REDUCED_SCHEMA);
    log.stop();

    expect(result.files).toContain(`${OUT}/interfaces/old-dto.interface.ts`);
    expect(result.files).toContain(`${OUT}/old-api.service.ts`);
    const hint = log.warnings.join('\n');
    expect(hint).toContain(`${OUT}/interfaces/old-dto.interface.ts`);
    expect(hint).toContain(`${OUT}/old-api.service.ts`);
    // Generated and base API files are not leftovers
    expect(hint).not.toContain('user-dto.interface.ts');
    expect(hint).not.toContain('_api-base.service.ts');
  });

  it('removes nothing and rewrites the manifest when it is not valid JSON', async () => {
    const tree = await runFullSchematics(FULL_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    tree.overwrite(MANIFEST, '{ not json');
    const log = captureWarnings();

    const result = await regenerate(tree, REDUCED_SCHEMA);
    log.stop();

    expect(result.files).toContain(`${OUT}/orders-api.service.ts`);
    expect(log.warnings.some(message => message.includes('is not valid JSON'))).toBe(true);
    expect(JSON.parse(result.readContent(MANIFEST)).api).toEqual(['users-api.service.ts']);
  });

  it('ignores manifest entries that point outside the output path', async () => {
    const tree = await runFullSchematics(REDUCED_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    tree.create('/src/main.ts', 'bootstrap();\n');
    const manifest = JSON.parse(tree.readContent(MANIFEST));
    manifest.api.push('../src/main.ts', '/src/main.ts');
    tree.overwrite(MANIFEST, JSON.stringify(manifest));

    const result = await regenerate(tree, REDUCED_SCHEMA);

    expect(result.files).toContain('/src/main.ts');
  });

  it('does not rewrite an unchanged manifest', async () => {
    const tree = await runFullSchematics(REDUCED_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const before = tree.readContent(MANIFEST);
    const manifestActions = (target: UnitTestTree) => target.actions.filter(action => action.path === MANIFEST).length;
    const actionsBefore = manifestActions(tree);

    const result = await regenerate(tree, REDUCED_SCHEMA);

    expect(result.readContent(MANIFEST)).toBe(before);
    expect(manifestActions(result)).toBe(actionsBefore);
  });

  it('removes a stale RTK API slice', async () => {
    const tree = await runFullSchematics(FULL_SCHEMA, RTK_SCHEMATIC_OPTIONS);
    expect(tree.files).toContain(`${OUT}/orders.api.ts`);

    const result = await regenerate(tree, REDUCED_SCHEMA, RTK_SCHEMATIC_OPTIONS);

    expect(result.files).not.toContain(`${OUT}/orders.api.ts`);
    expect(result.files).toContain(`${OUT}/users.api.ts`);
  });
});

describe('API groups without operations', () => {
  afterAll(() => {
    resetFetchMocks();
  });

  it('generates no empty service for a path that declares no operations', async () => {
    const schema = createSwaggerSchema<string>({
      paths: {
        '/api/Users/{id}': getById('Users', 'UserDto'),
        '/api/Legacy': {},
        '/api/Reports/{id}': { parameters: [createPathParam('id', 'integer')] }
      } as never,
      schemas: { UserDto: DTO } as never
    });

    const tree = await runFullSchematics(schema, ANGULAR_SCHEMATIC_OPTIONS);

    expect(tree.files).toContain(`${OUT}/users-api.service.ts`);
    expect(tree.files).not.toContain(`${OUT}/legacy-api.service.ts`);
    expect(tree.files).not.toContain(`${OUT}/reports-api.service.ts`);
  });

  it('deletes the service of a controller whose operations were all removed', async () => {
    const first = await runFullSchematics(FULL_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const schema = createSwaggerSchema<string>({
      paths: {
        '/api/Users/{id}': getById('Users', 'UserDto'),
        '/api/Orders/{id}': {}
      } as never,
      schemas: { UserDto: DTO, OrderDto: DTO } as never
    });

    const result = await regenerate(first, schema);

    expect(result.files).not.toContain(`${OUT}/orders-api.service.ts`);
  });
});
