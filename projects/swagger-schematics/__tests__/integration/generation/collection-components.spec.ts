import '@helpers/matchers';
import { resetFetchMocks, runFullSchematics, ANGULAR_SCHEMATIC_OPTIONS } from '@helpers/setup';
import { buildApiModel } from '@lib/helpers/api-changes/api-model';
import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';

const OUT = ANGULAR_SCHEMATIC_OPTIONS.path;
const SCHEMA = {
  openapi: '3.1.0',
  info: { title: 'Collections', version: 'v1' },
  paths: {
    '/api/Places': {
      get: {
        tags: ['Places'],
        operationId: 'GetTags',
        responses: { '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tags' } } } } }
      }
    }
  },
  components: {
    schemas: {
      Item: { type: 'object', properties: { id: { type: 'integer' } } },
      Position: { type: 'array', prefixItems: [{ type: 'number' }, { type: 'number' }], minItems: 2, items: false },
      Tags: { type: 'array', items: { type: 'string' } },
      Items: { type: ['array', 'null'], items: { $ref: '#/components/schemas/Item' } },
      Counts: { type: 'object', additionalProperties: { type: 'integer' } },
      ItemsById: { type: ['object', 'null'], additionalProperties: { $ref: '#/components/schemas/Item' } },
      Anything: { type: 'object', additionalProperties: true },
      Untyped: { additionalProperties: { $ref: '#/components/schemas/Item' } },
      Place: {
        type: 'object',
        required: ['position'],
        properties: {
          position: { $ref: '#/components/schemas/Position' },
          tags: { $ref: '#/components/schemas/Tags' },
          items: { $ref: '#/components/schemas/Items' },
          counts: { $ref: '#/components/schemas/Counts' },
          free: { $ref: '#/components/schemas/Free' }
        }
      },
      Empty: { type: 'object' },
      // A boolean schema (valid in 3.1) generates no file; references render unknown
      Free: true,
      JsonValue: {
        oneOf: [
          { type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' },
          { $ref: '#/components/schemas/JsonObject' }, { type: 'array', items: { $ref: '#/components/schemas/JsonValue' } }
        ]
      },
      JsonObject: { type: 'object', additionalProperties: { $ref: '#/components/schemas/JsonValue' } }
    }
  }
} as unknown as ISwaggerSchema;

/** Component schemas that are arrays, tuples or records are TypeScript expressions, not interfaces. */
describe('array, tuple and record components', () => {
  afterEach(() => {
    resetFetchMocks();
  });

  it('generate type aliases instead of empty interfaces', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const alias = (file: string) => tree.readContent(`${OUT}/interfaces/${file}.type.ts`);

    expect(alias('position')).toContain('export type TPosition = [number, number];');
    expect(alias('tags')).toContain('export type TTags = string[];');
    // A record alias is an index signature, which TypeScript lets refer back to itself
    expect(alias('counts')).toContain('export type TCounts = { [key: string]: number };');
    expect(alias('anything')).toContain('export type TAnything = { [key: string]: any };');
    expect(alias('items-by-id')).toContain('export type TItemsById = { [key: string]: IItem };');
    expect(alias('items-by-id')).toContain("import { IItem } from './item.interface';");
    // `type: object` may be left out: additionalProperties applies to objects only
    expect(alias('untyped')).toContain('export type TUntyped = { [key: string]: IItem };');
    // Nullability is added where the alias is referenced, as for an interface
    expect(alias('items')).toContain('export type TItems = IItem[];');
    expect(tree.files).not.toContain(`${OUT}/interfaces/tags.interface.ts`);
    expect(tree.files.filter(file => file.includes('/free.'))).toEqual([]);
    // A free-form object without additionalProperties stays an interface
    expect(tree.files).toContain(`${OUT}/interfaces/empty.interface.ts`);
  });

  it('let a record refer back to itself through a union', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);

    // `TJsonObject = Record<string, TJsonValue>` would be a circular alias error (TS2456)
    expect(tree.readContent(`${OUT}/interfaces/json-object.type.ts`)).toContain('export type TJsonObject = { [key: string]: TJsonValue };');
    expect(tree.readContent(`${OUT}/interfaces/json-value.type.ts`))
      .toContain('export type TJsonValue = string | number | boolean | TJsonObject | TJsonValue[] | null;');
  });

  it('are referenced by their alias and imported from its file', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const place = tree.readContent(`${OUT}/interfaces/place.interface.ts`);

    expect(place).toContain('position: TPosition;');
    expect(place).toContain('tags?: TTags;');
    expect(place).toContain('items?: TItems | null;');
    expect(place).toContain('counts?: TCounts;');
    expect(place).toContain('free?: unknown;');
    expect(place).toContain("import { TPosition } from './position.type';");
    expect(tree.readContent(`${OUT}/places-api.service.ts`)).toContain("import { TTags } from './interfaces/tags.type';");
  });

  it('are type aliases in the change summary model too', () => {
    const { types } = buildApiModel(SCHEMA, { framework: 'angular' });

    expect(types.TTags).toEqual({ kind: 'type-alias', expression: 'string[]' });
    expect(types.TPosition).toEqual({ kind: 'type-alias', expression: '[number, number]' });
    expect(types.ITags).toBeUndefined();
  });
});
