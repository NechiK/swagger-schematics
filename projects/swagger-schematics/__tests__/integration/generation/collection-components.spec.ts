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
      Place: {
        type: 'object',
        required: ['position'],
        properties: {
          position: { $ref: '#/components/schemas/Position' },
          tags: { $ref: '#/components/schemas/Tags' },
          items: { $ref: '#/components/schemas/Items' },
          counts: { $ref: '#/components/schemas/Counts' }
        }
      },
      Empty: { type: 'object' }
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
    expect(alias('counts')).toContain('export type TCounts = Record<string, number>;');
    expect(alias('anything')).toContain('export type TAnything = Record<string, any>;');
    expect(alias('items-by-id')).toContain('export type TItemsById = Record<string, IItem>;');
    expect(alias('items-by-id')).toContain("import { IItem } from './item.interface';");
    // Nullability is added where the alias is referenced, as for an interface
    expect(alias('items')).toContain('export type TItems = IItem[];');
    expect(tree.files).not.toContain(`${OUT}/interfaces/tags.interface.ts`);
    // A free-form object without additionalProperties stays an interface
    expect(tree.files).toContain(`${OUT}/interfaces/empty.interface.ts`);
  });

  it('are referenced by their alias and imported from its file', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const place = tree.readContent(`${OUT}/interfaces/place.interface.ts`);

    expect(place).toContain('position: TPosition;');
    expect(place).toContain('tags?: TTags;');
    expect(place).toContain('items?: TItems | null;');
    expect(place).toContain('counts?: TCounts;');
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
