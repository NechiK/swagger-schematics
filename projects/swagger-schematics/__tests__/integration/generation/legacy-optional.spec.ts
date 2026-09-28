import '@helpers/matchers';
import {
  resetFetchMocks,
  runFullSchematics,
  ANGULAR_SCHEMATIC_OPTIONS,
  RTK_SCHEMATIC_OPTIONS
} from '@helpers/setup';

const SCHEMA: any = {
  openapi: '3.0.4',
  info: { title: 'T', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Demo: {
        type: 'object',
        // NOTE: no `required` array - the case this option targets
        properties: {
          name: { type: 'string' },
          nickname: { type: 'string', nullable: true }
        }
      }
    }
  }
};

const readDemo = async (legacyOptionalProperties?: boolean): Promise<string> => {
  resetFetchMocks();
  const tree = await runFullSchematics(SCHEMA, { ...ANGULAR_SCHEMATIC_OPTIONS, legacyOptionalProperties });
  return tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/demo.interface.ts`);
};

describe('legacyOptionalProperties option', () => {
  it('default (spec): a document without `required` yields all-optional properties', async () => {
    const content = await readDemo(false);
    expect(content).toContain('name?: string;');
    expect(content).toContain('nickname?: string | null;');
  });

  it('legacy: optionality follows nullability - non-nullable become required', async () => {
    const content = await readDemo(true);
    expect(content).toContain('name: string;');           // non-nullable -> required
    expect(content).toContain('nickname?: string | null;'); // nullable -> optional, keeps | null
    expect(content).not.toContain('name?: string;');
  });
});

describe('legacyOptionalProperties option for endpoint parameters', () => {
  // OpenAPI 3.0 (`nullable: true`); the unit tests cover 3.1's `type: [..., 'null']`.
  // Required but nullable: a caller must pass them (spec), or may leave them out (legacy)
  const PARAMS_SCHEMA: any = {
    openapi: '3.0.4',
    info: { title: 'T', version: '1.0.0' },
    components: { schemas: {} },
    paths: {
      '/api/Things': {
        get: {
          tags: ['Things'],
          parameters: [
            { name: 'page', in: 'query', required: true, schema: { type: 'integer', nullable: true } },
            { name: 'X-Tenant-Id', in: 'header', required: true, schema: { type: 'string', nullable: true } }
          ],
          responses: { '204': { description: 'ok' } }
        }
      }
    }
  };

  const generate = async (options: typeof ANGULAR_SCHEMATIC_OPTIONS, file: string, legacyOptionalProperties: boolean): Promise<string> => {
    resetFetchMocks();
    const tree = await runFullSchematics(PARAMS_SCHEMA, { ...options, legacyOptionalProperties });
    return tree.readContent(`${options.path}/${file}`);
  };

  it('default (spec): Angular requires them', async () => {
    const service = await generate(ANGULAR_SCHEMATIC_OPTIONS, 'things-api.service.ts', false);
    expect(service).toContain('{ page }: { page: number | null }, { xTenantId }: { xTenantId: string | null }');
  });

  it('legacy: Angular makes them optional', async () => {
    const service = await generate(ANGULAR_SCHEMATIC_OPTIONS, 'things-api.service.ts', true);
    expect(service).toContain('{ page }: { page?: number | null } = {}, { xTenantId }: { xTenantId?: string | null } = {}');
  });

  it('default (spec) and legacy: RTK request type follows the option', async () => {
    expect(await generate(RTK_SCHEMATIC_OPTIONS, 'things.api.ts', false)).toContain('{ page: number | null; xTenantId: string | null }');
    expect(await generate(RTK_SCHEMATIC_OPTIONS, 'things.api.ts', true)).toContain('{ page?: number | null; xTenantId?: string | null }');
  });
});
