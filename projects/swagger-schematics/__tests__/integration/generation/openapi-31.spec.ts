import '@helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  resetFetchMocks,
  runFullSchematics,
  schematicRunner,
  ANGULAR_SCHEMATIC_OPTIONS,
  RTK_SCHEMATIC_OPTIONS
} from '@helpers/setup';
import { OPENAPI_31_SWAGGER_SCHEMA } from '@fixtures/swagger/openapi-31-schema.fixture';

describe('OpenAPI 3.1 support', () => {
  let tree: UnitTestTree;
  let warnings: string[];
  let subscription: { unsubscribe(): void };

  beforeAll(async () => {
    warnings = [];
    subscription = schematicRunner.logger.subscribe(entry => {
      if (entry.level === 'warn') {
        warnings.push(entry.message);
      }
    });
    resetFetchMocks();
    tree = await runFullSchematics(OPENAPI_31_SWAGGER_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
  });

  afterAll(() => {
    subscription.unsubscribe();
    resetFetchMocks();
  });

  it('should generate without version warnings (3.1 is supported)', () => {
    expect(warnings.filter(message => message.includes('OpenAPI'))).toEqual([]);
  });

  describe('Interface generation with 3.1 schemas', () => {
    let interfaceContent: string;

    beforeAll(() => {
      interfaceContent = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/report-dto.interface.ts`);
    });

    it('should generate the interface snapshot', () => {
      expect(interfaceContent).toMatchSnapshot();
    });

    it('should honor the required array for optionality', () => {
      expect(interfaceContent).toContain('id: number;');
      expect(interfaceContent).toContain('reference: string | number;');
    });

    it('should type 3.1 nullable properties as optional with | null', () => {
      expect(interfaceContent).toContain('name?: string | null;');
    });

    it('should append | null for refs to nullable 3.1 enums', () => {
      expect(interfaceContent).toContain('status?: TReportStatus | null;');
    });

    it('should map contentMediaType binary to Blob but base64 content to string', () => {
      expect(interfaceContent).toContain('attachment?: Blob;');
      expect(interfaceContent).toContain('signature?: string;');
    });

    it('should reduce a nullable oneOf ref to `X | null` (not `any | X`)', () => {
      // oneOf: [{type:null}, {$ref OwnerDto}] -> IOwnerDto | null
      expect(interfaceContent).toContain('owner?: IOwnerDto | null;');
      // oneOf: [{type:null}, {$ref GuidIdentifier}] -> primitive wrapper inlined
      expect(interfaceContent).toContain('ownerId?: string | null;');
      expect(interfaceContent).not.toContain('any |');
    });
  });

  describe('API generation with 3.1 binary responses', () => {
    let serviceContent: string;

    beforeAll(() => {
      serviceContent = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/report-api.service.ts`);
    });

    it('should generate the service snapshot', () => {
      expect(serviceContent).toMatchSnapshot();
    });

    it('should type schema-less octet-stream responses as Blob downloads', () => {
      expect(serviceContent).toContain('Observable<Blob>');
      expect(serviceContent).toContain("responseType: 'blob'");
    });

    it('should mark 3.1 nullable query params optional and nullable', () => {
      expect(serviceContent).toContain('{ filter }: { filter?: string | null }');
    });
  });

  describe('Primitive-wrapper schemas', () => {
    it('should not generate a file for an inlined primitive-wrapper schema', () => {
      // GuidIdentifier = { type: 'string', format: 'uuid' } is inlined everywhere,
      // so it must not produce an empty IGuidIdentifier interface file.
      expect(tree.exists(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/guid-identifier.interface.ts`)).toBe(false);
    });

    it('should not reference the wrapper symbol anywhere in the output', () => {
      const referencingFiles = tree.files.filter(file => tree.readContent(file).includes('IGuidIdentifier'));
      expect(referencingFiles).toEqual([]);
    });

    it('should still generate real (non-wrapper) object interfaces', () => {
      expect(tree.exists(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/owner-dto.interface.ts`)).toBe(true);
    });
  });

  describe('Composition: allOf inheritance and not', () => {
    it('should render allOf + own properties as `Base & { ...own }`', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/audited-report-dto.type.ts`);
      expect(content).toContain('export type TAuditedReportDto = IBaseAuditDto & { note?: string | null };');
      expect(content).toContain("import { IBaseAuditDto } from './base-audit-dto.interface';");
      expect(content).toMatchSnapshot();
    });

    it('should emit `not` schemas as `unknown` with an explanatory comment', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/not-string.type.ts`);
      expect(content).toContain('export type TNotString = unknown;');
      expect(content).toContain('Any value except `string`');
      expect(content).toContain('has no TypeScript equivalent');
      expect(content).toMatchSnapshot();
    });
  });
});

describe('OpenAPI 3.1 keywords and references to composition schemas', () => {
  const SCHEMA: any = {
    openapi: '3.1.0',
    info: { title: 'T', version: '1' },
    components: {
      schemas: {
        Dto: { type: 'object', properties: { a: { type: 'string' } } },
        AnyId: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
        NullableDto: { oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/Dto' }] },
        NullableId: { oneOf: [{ type: 'null' }, { type: 'string' }] },
        Kind: { const: 'dog' },
        Base: { type: 'object', properties: { id: { type: 'integer' } } },
        Derived: { allOf: [{ $ref: '#/components/schemas/Base' }], properties: { extra: { type: 'string' } } },
        Pet: {
          type: 'object',
          required: ['kind', 'id', 'owner'],
          properties: {
            kind: { $ref: '#/components/schemas/Kind' },
            id: { $ref: '#/components/schemas/AnyId' },
            owner: { $ref: '#/components/schemas/NullableDto' },
            parent: { $ref: '#/components/schemas/Derived' },
            position: { type: 'array', prefixItems: [{ type: 'number' }, { type: 'number' }], minItems: 2, items: false },
            tags: { type: 'array', prefixItems: [{ $ref: '#/components/schemas/Dto' }], minItems: 1, items: { type: 'string' } },
            extra: { type: 'array', prefixItems: [{ type: 'string' }] },
            nothing: { type: 'null' }
          }
        }
      }
    },
    paths: {
      '/api/Pets/{id}': {
        get: {
          tags: ['Pets'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/AnyId' } },
            { name: 'owner', in: 'query', required: true, schema: { $ref: '#/components/schemas/NullableId' } }
          ],
          responses: { '200': { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } } }
        },
        put: {
          tags: ['Pets'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/AnyId' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Derived' } } } },
          responses: { '204': { description: 'ok' } }
        }
      }
    }
  };

  /** Every relative import in the generated files names a generated file that exports the symbol. */
  const expectImportsResolve = (tree: UnitTestTree) => {
    const files = tree.files.filter(file => file.endsWith('.ts'));
    const checked: string[] = [];
    files.forEach(file => {
      const content = tree.readContent(file);
      for (const match of content.matchAll(/import \{ ([^}]+) \} from '(\.[^']+)';/g)) {
        const target = `${require('path').posix.resolve(require('path').posix.dirname(file), match[2])}.ts`;
        expect(files).toContain(target);
        match[1].split(',').map(symbol => symbol.trim()).forEach(symbol => {
          expect(tree.readContent(target)).toMatch(new RegExp(`export (interface|type|enum|const|class) ${symbol}\\b`));
          checked.push(symbol);
        });
      }
    });
    return checked;
  };

  afterEach(() => {
    resetFetchMocks();
  });

  it('renders const, tuples, type null and composition refs in interfaces', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const pet = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/pet.interface.ts`);

    expect(pet).toContain("kind: 'dog';");
    expect(pet).toContain('id: TAnyId;');
    expect(pet).toContain('owner: TNullableDto;');
    expect(pet).toContain('parent?: TDerived;');
    expect(pet).toContain('position?: [number, number];');
    expect(pet).toContain('tags?: [IDto, ...string[]];');
    expect(pet).toContain('extra?: [string?, ...unknown[]];');
    // A const component is inlined as its literal, with no empty IKind interface
    expect(tree.files).not.toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/kind.interface.ts`);
    expect(pet).toContain('nothing?: null;');
    expect(pet).toContain("import { TAnyId } from './any-id.type';");
    expect(pet).toContain("import { TNullableDto } from './nullable-dto.type';");
    expect(pet).toContain("import { IDto } from './dto.interface';");
  });

  it.each([
    ['Angular', ANGULAR_SCHEMATIC_OPTIONS],
    ['RTK', RTK_SCHEMATIC_OPTIONS]
  ])('%s: every import in the generated code resolves', async (_name, options) => {
    const tree = await runFullSchematics(SCHEMA, options);
    const checked = expectImportsResolve(tree);

    expect(checked).toEqual(expect.arrayContaining(['TAnyId', 'TNullableDto', 'TNullableId', 'TDerived', 'IDto', 'IPet']));
  });

  it('Angular: a required nullable-composition query param is required and left out when null', async () => {
    const tree = await runFullSchematics(SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
    const service = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/pets-api.service.ts`);

    expect(service).toContain('{ owner }: { owner: TNullableId }');
    expect(service).toContain('putPetsById(id: TAnyId, body: TDerived)');
    expect(service).toContain('params: { ...(owner != null ? { owner } : {}) }');
  });
});
