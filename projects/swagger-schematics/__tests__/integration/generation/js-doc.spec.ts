import '@helpers/matchers';
import {
  resetFetchMocks,
  runFullSchematics,
  ANGULAR_SCHEMATIC_OPTIONS,
  RTK_SCHEMATIC_OPTIONS
} from '@helpers/setup';
import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';

const OUT = ANGULAR_SCHEMATIC_OPTIONS.path;

const SCHEMA = {
  openapi: '3.0.1',
  info: { title: 'Docs', version: 'v1' },
  paths: {
    '/api/Orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get an order',
        description: 'Returns 404 when the order does not exist.\n\nArchived orders are included.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderDto' } } } } }
      },
      delete: {
        tags: ['Orders'],
        summary: 'Delete an order',
        deprecated: true,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '204': { description: 'ok' } }
      }
    },
    '/api/Orders': {
      get: {
        tags: ['Orders'],
        responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/OrderDto' } } } } } }
      }
    }
  },
  components: {
    schemas: {
      OrderDto: {
        type: 'object',
        description: 'An order placed by a customer',
        required: ['id'],
        properties: {
          id: { type: 'integer', description: 'Order number' },
          legacyCode: { type: 'string', deprecated: true },
          total: { type: 'number', description: 'Total in cents', 'x-aggregatable': ['Sum', 'Avg'] },
          notes: { type: 'string' }
        }
      },
      OrderStatus: { type: 'string', description: 'Where the order is in its lifecycle', deprecated: true, enum: ['New', 'Done'] },
      OrderRef: { description: 'An order id or code', oneOf: [{ type: 'integer' }, { type: 'string' }] },
      NotDraft: { description: 'Anything but a draft', not: { type: 'string', enum: ['Draft'] } }
    }
  }
} as unknown as ISwaggerSchema;

describe('JSDoc in generated code', () => {
  afterEach(() => {
    resetFetchMocks();
  });

  it('documents interfaces and their properties, merging @aggregatable into the same comment', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const dto = tree.readContent(`${OUT}/interfaces/order-dto.interface.ts`);

    expect(dto).toContain('/** An order placed by a customer */\nexport interface IOrderDto {');
    expect(dto).toContain('  /** Order number */\n  id: number;');
    expect(dto).toContain('  /** @deprecated */\n  legacyCode?: string;');
    expect(dto).toContain('  /**\n   * Total in cents\n   * @aggregatable Sum, Avg\n   */\n  total?: number;');
    expect(dto).toContain('\n  notes?: string;');
    expect(dto).not.toContain('/** */');
    expect(dto).toMatchSnapshot();
  });

  it('documents enums and type aliases, keeping the note a `not` schema carries', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);

    expect(tree.readContent(`${OUT}/enums/order-status.enum.ts`)).toContain(
      '/**\n * Where the order is in its lifecycle\n * @deprecated\n */\nexport enum TOrderStatus {'
    );
    expect(tree.readContent(`${OUT}/interfaces/order-ref.type.ts`)).toContain('/** An order id or code */\nexport type TOrderRef =');
    const notDraft = tree.readContent(`${OUT}/interfaces/not-draft.type.ts`);
    // One comment: editors show only the last of two stacked comments
    expect(notDraft).toContain('/**\n * Anything but a draft\n *\n * Any value except `string`.');
    expect(notDraft.match(/\/\*\*/g)).toHaveLength(1);
  });

  it('Angular: documents service methods with summary, description and @deprecated', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const service = tree.readContent(`${OUT}/orders-api.service.ts`);

    expect(service).toContain([
      '  /**',
      '   * Get an order',
      '   *',
      '   * Returns 404 when the order does not exist.',
      '   *',
      '   * Archived orders are included.',
      '   */',
      '  getById(id: number)'
    ].join('\n'));
    expect(service).toContain('  /**\n   * Delete an order\n   * @deprecated\n   */\n  deleteOrdersById(');
    expect(service).toMatch(/\n\n {2}getOrders\(/);
    expect(service).toMatchSnapshot();
  });

  it('RTK: documents endpoints', async () => {
    const tree = await runFullSchematics(SCHEMA, RTK_SCHEMATIC_OPTIONS);
    const slice = tree.readContent(`${OUT}/orders.api.ts`);

    expect(slice).toContain('    /**\n     * Delete an order\n     * @deprecated\n     */\n    ordersDeleteOrdersById: builder.mutation');
    expect(slice).toMatchSnapshot();
  });
});
