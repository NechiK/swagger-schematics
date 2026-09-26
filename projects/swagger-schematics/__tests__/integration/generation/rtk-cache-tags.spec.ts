import '@helpers/matchers';
import {
  resetFetchMocks,
  runFullSchematics,
  runApiSchematic,
  setupSwaggerMock,
  schematicRunner,
  ANGULAR_SCHEMATIC_OPTIONS,
  RTK_SCHEMATIC_OPTIONS
} from '@helpers/setup';
import { ISwaggerSchema } from '../../../interfaces/version_3_1/swagger.interface';

const OUT = RTK_SCHEMATIC_OPTIONS.path;
const TAG_ENUM = `${OUT}/api-tag.enum.ts`;
const OPTIONS = { ...RTK_SCHEMATIC_OPTIONS, scopeEndpointsWithTags: false, rtkCacheTags: true };

const noContent = { '204': { description: 'ok' } };
const SCHEMA = {
  openapi: '3.0.1',
  info: { title: 'Tags', version: 'v1' },
  paths: {
    '/api/Orders': {
      get: { tags: ['Orders'], responses: noContent },
      post: { tags: ['Orders'], responses: noContent }
    },
    '/api/Orders/{id}': {
      head: { tags: ['Orders'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: noContent },
      put: { tags: ['Orders'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: noContent },
      patch: { tags: ['Orders'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: noContent },
      delete: { tags: ['Orders'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: noContent }
    },
    '/api/replacement-queue': { get: { tags: ['Queue'], responses: noContent } }
  },
  components: { schemas: {} }
} as unknown as ISwaggerSchema;

describe('RTK cache tags', () => {
  afterEach(() => {
    resetFetchMocks();
  });

  it('generates a TApiTag enum with one member per slice', async () => {
    const tree = await runFullSchematics(SCHEMA, OPTIONS);

    expect(tree.readContent(TAG_ENUM)).toBe([
      "/** RTK Query cache tags, one per API slice. Queries provide their slice's tag; mutations invalidate it. */",
      'export enum TApiTag {',
      "  Orders = 'Orders',",
      "  ReplacementQueue = 'ReplacementQueue'",
      '}',
      ''
    ].join('\n'));
  });

  it('registers the tag on the slice, provides it from queries and invalidates it from mutations', async () => {
    const tree = await runFullSchematics(SCHEMA, OPTIONS);
    const slice = tree.readContent(`${OUT}/orders.api.ts`);

    expect(slice).toContain("import { TApiTag } from './api-tag.enum';");
    expect(slice).toContain('export const ordersApi = baseApi.enhanceEndpoints({ addTagTypes: [TApiTag.Orders] }).injectEndpoints({');
    // GET and HEAD provide; POST, PUT, PATCH and DELETE invalidate
    expect(slice.match(/providesTags: \[TApiTag\.Orders\]/g)).toHaveLength(2);
    expect(slice.match(/invalidatesTags: \[TApiTag\.Orders\]/g)).toHaveLength(4);
    expect(tree.readContent(`${OUT}/replacement-queue.api.ts`)).toContain('providesTags: [TApiTag.ReplacementQueue]');
    expect(slice).toMatchSnapshot();
  });

  it('generates no tags unless enabled', async () => {
    const tree = await runFullSchematics(SCHEMA, { ...OPTIONS, rtkCacheTags: false });

    expect(tree.files).not.toContain(TAG_ENUM);
    expect(tree.readContent(`${OUT}/orders.api.ts`)).not.toContain('TApiTag');
    expect(tree.readContent(`${OUT}/orders.api.ts`)).toContain('export const ordersApi = baseApi.injectEndpoints({');
  });

  it('deletes the enum and the tags when the option is turned off again', async () => {
    const tagged = await runFullSchematics(SCHEMA, OPTIONS);
    expect(tagged.files).toContain(TAG_ENUM);

    setupSwaggerMock(OPTIONS.swaggerSchemaUrl, SCHEMA);
    const untagged = await runApiSchematic({ ...OPTIONS, rtkCacheTags: false }, tagged);

    expect(untagged.files).not.toContain(TAG_ENUM);
    expect(untagged.readContent(`${OUT}/orders.api.ts`)).not.toContain('TApiTag');
  });

  it('generates no enum for an empty schema, so the stale-files safety net still keeps the slices', async () => {
    const tagged = await runFullSchematics(SCHEMA, OPTIONS);

    setupSwaggerMock(OPTIONS.swaggerSchemaUrl, { ...SCHEMA, paths: {} } as ISwaggerSchema);
    const emptied = await runApiSchematic(OPTIONS, tagged);

    expect(emptied.files).toContain(`${OUT}/orders.api.ts`);
    expect(emptied.files).toContain(TAG_ENUM);
  });

  it('is ignored with a warning for Angular', async () => {
    const warnings: string[] = [];
    const subscription = schematicRunner.logger.subscribe(entry => {
      if (entry.level === 'warn') {
        warnings.push(entry.message);
      }
    });

    const tree = await runFullSchematics(SCHEMA, { ...ANGULAR_SCHEMATIC_OPTIONS, rtkCacheTags: true });
    subscription.unsubscribe();

    expect(tree.files).not.toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/api-tag.enum.ts`);
    expect(warnings).toContain("rtkCacheTags applies to framework 'react-rtk' only; ignored for 'angular'.");
  });
});
