import { resetFetchMocks, runFullSchematics, ANGULAR_SCHEMATIC_OPTIONS } from '@helpers/setup';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';

const OUT = ANGULAR_SCHEMATIC_OPTIONS.path;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const SCHEMA = {
  openapi: '3.0.3',
  info: { title: 'T', version: '1' },
  paths: {
    '/api/Orders/{id}': {
      post: {
        tags: ['Orders'],
        operationId: 'update',
        parameters: [{ name: 'id', in: 'path', required: true, schema: ref('IdAlias') }],
        requestBody: { content: { 'application/json': { schema: ref('ItemAliasAlias') } } },
        responses: { '200': { description: 'ok', content: { 'application/json': { schema: ref('Shop.OrderDto') } } } }
      }
    }
  },
  components: {
    schemas: {
      // Names the templates classify: snake_case (FastAPI), kebab-case, camelCase and a .NET full name
      thing_kind: { type: 'string', enum: ['a', 'b'] },
      'my-item': { type: 'object', properties: { kind: ref('thing_kind') } },
      lowerMap: { type: 'object', additionalProperties: ref('lowerMap') },
      'Shop.OrderDto': {
        type: 'object',
        properties: {
          item: ref('ItemAlias'),
          parent: ref('Shop.OrderDto'),
          map: ref('lowerMap'),
          note: ref('NullableTextAlias'),
          loop: ref('LoopA')
        }
      },
      // Components that are only a $ref to another generate nothing of their own
      ItemAlias: ref('my-item'),
      ItemAliasAlias: ref('ItemAlias'),
      Id: { type: 'string', format: 'uuid' },
      IdAlias: ref('Id'),
      NullableText: { type: 'string', nullable: true },
      NullableTextAlias: ref('NullableText'),
      LoopA: ref('LoopB'),
      LoopB: ref('LoopA')
    }
  }
} as unknown as ISwaggerSchema;

describe('component names and references', () => {
  afterEach(() => {
    resetFetchMocks();
  });

  it('reference a component by the name its file declares', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const order = tree.readContent(`${OUT}/interfaces/shop.order-dto.interface.ts`);

    expect(tree.readContent(`${OUT}/enums/thing-kind.enum.ts`)).toContain('export enum TThingKind {');
    expect(tree.readContent(`${OUT}/interfaces/my-item.interface.ts`)).toContain("import { TThingKind } from '../enums/thing-kind.enum';");
    expect(tree.readContent(`${OUT}/interfaces/my-item.interface.ts`)).toContain('kind?: TThingKind;');
    // A recursive component refers to itself without importing its own file
    expect(tree.readContent(`${OUT}/interfaces/lower-map.type.ts`)).toContain('export type TLowerMap = { [key: string]: TLowerMap };');
    expect(tree.readContent(`${OUT}/interfaces/lower-map.type.ts`)).not.toContain('import');
    expect(order).toContain('export interface IShopOrderDto {');
    expect(order).toContain('parent?: IShopOrderDto;');
    expect(order).toContain('map?: TLowerMap;');
    expect(order).not.toContain("from './shop.order-dto.interface'");
  });

  it('resolve a component that is only a $ref to the component it points to', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const order = tree.readContent(`${OUT}/interfaces/shop.order-dto.interface.ts`);
    const service = tree.readContent(`${OUT}/orders-api.service.ts`);

    expect(order).toContain('item?: IMyItem;');
    expect(order).toContain("import { IMyItem } from './my-item.interface';");
    // Nullability comes through the alias too
    expect(order).toContain('note?: string | null;');
    // A circular chain of references describes no type
    expect(order).toContain('loop?: unknown;');
    expect(service).toContain('update(id: string, body: IMyItem): Observable<IShopOrderDto>');
    expect(service).not.toContain('alias');
    expect(tree.files.filter(file => /alias|loop/.test(file))).toEqual([]);
  });
});
