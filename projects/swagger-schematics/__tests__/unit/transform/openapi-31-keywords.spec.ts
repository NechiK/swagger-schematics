import { transformProperties, transformType, transformTypeWithAllImports } from '@lib/types/utils/transform-type';
import { transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import { getGeneratedSchemaKind, isReplacedByTypeMapping } from '@lib/types/utils/schema-kind';
import { ISwaggerSchema, TSchema } from '@lib/interfaces/version_3_1/swagger.interface';

/** JSON Schema 2020-12 keywords that OpenAPI 3.1 documents use and 3.0 has no equivalent for. */
describe('OpenAPI 3.1 schema keywords', () => {
  const swagger = {
    openapi: '3.1.0',
    info: { title: 'T', version: '1' },
    paths: {},
    components: {
      schemas: {
        Dto: { type: 'object', properties: { a: { type: 'string' } } },
        Point: { type: 'object', properties: { x: { type: 'number' } } },
        Kind: { type: 'string', const: 'dog' },
        UntypedKind: { const: 'cat' },
        Nothing: { type: 'null' },
        NothingArray: { type: ['null'] },
        NullableGuid: { type: ['string', 'null'], format: 'uuid' },
        IdOrName: { type: ['integer', 'string'] },
        NullableStatus: { type: ['string', 'null'], enum: ['A', 'B'] },
        NullableDto: { oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/Dto' }] },
        NullableId: { oneOf: [{ type: 'null' }, { type: 'string' }] }
      }
    }
  } as unknown as ISwaggerSchema;

  const typeOf = (schema: unknown) => transformType(schema as TSchema, swagger)[0];
  const propertiesOf = (properties: Record<string, unknown>, legacyOptionalProperties = false) =>
    Object.fromEntries(transformProperties(properties as never, swagger, { legacyOptionalProperties }, []).propertiesContent
      .map(([name, type]) => [name.replace('?', ''), `${name}: ${type}`]));

  describe('const', () => {
    it.each([
      [{ const: 'dog' }, "'dog'"],
      [{ type: 'string', const: "it's" }, "'it\\'s'"],
      [{ type: 'integer', const: 42 }, '42'],
      [{ type: 'boolean', const: false }, 'false'],
      [{ const: null }, 'null']
    ])('renders %p as the literal type %p', (schema, expected) => {
      expect(typeOf(schema)).toBe(expected);
    });

    it('renders an object or array const from its type', () => {
      expect(typeOf({ type: 'object', const: { a: 1 } })).toBe('object');
      expect(typeOf({ type: 'array', items: { type: 'integer' }, const: [1] })).toBe('number[]');
    });

    it('turns a oneOf of consts into a union of literals', () => {
      expect(typeOf({ oneOf: [{ const: 'cat' }, { const: 'dog' }] })).toBe("'cat' | 'dog'");
    });

    it('inlines a const component as its literal where it is referenced, with or without a type', () => {
      expect(typeOf({ $ref: '#/components/schemas/Kind' })).toBe("'dog'");
      expect(typeOf({ $ref: '#/components/schemas/UntypedKind' })).toBe("'cat'");
    });

    it('generates no file of its own for a const component', () => {
      expect(getGeneratedSchemaKind({ const: 'cat' } as never)).toBeNull();
      expect(getGeneratedSchemaKind({ type: 'string', const: 'dog' } as never)).toBeNull();
      // An object const is not a literal type: still an interface
      expect(getGeneratedSchemaKind({ type: 'object', const: { a: 1 } } as never)).toBe('interface');
    });

    it('keeps nullability', () => {
      expect(propertiesOf({ kind: { type: ['string', 'null'], const: 'dog' } }).kind).toBe("kind?: 'dog' | null");
    });
  });

  describe("type: 'null'", () => {
    it('renders null instead of any', () => {
      expect(typeOf({ type: 'null' })).toBe('null');
      expect(propertiesOf({ nothing: { type: 'null' } }).nothing).toBe('nothing?: null');
    });

    it('inlines a type null component as null, with no file of its own', () => {
      expect(typeOf({ $ref: '#/components/schemas/Nothing' })).toBe('null');
      expect(getGeneratedSchemaKind({ type: 'null' } as never)).toBeNull();
    });

    it("inlines type arrays of primitives (['null'], ['string', 'null']) like their single-type forms", () => {
      expect(typeOf({ $ref: '#/components/schemas/NothingArray' })).toBe('null');
      expect(typeOf({ $ref: '#/components/schemas/NullableGuid' })).toBe('string | null');
      expect(typeOf({ $ref: '#/components/schemas/IdOrName' })).toBe('number | string');
      expect(propertiesOf({ id: { $ref: '#/components/schemas/NullableGuid' } }).id).toBe('id?: string | null');
      expect(getGeneratedSchemaKind({ type: ['null'] } as never)).toBeNull();
      expect(getGeneratedSchemaKind({ type: ['string', 'null'], format: 'uuid' } as never)).toBeNull();
    });

    it('still generates an enum or interface for a type array with enum or object', () => {
      expect(getGeneratedSchemaKind({ type: ['string', 'null'], enum: ['A', 'B'] } as never)).toBe('enum');
      expect(getGeneratedSchemaKind({ type: ['object', 'null'], properties: { a: { type: 'string' } } } as never)).toBe('interface');
      expect(typeOf({ $ref: '#/components/schemas/NullableStatus' })).toBe('TNullableStatus | null');
    });
  });

  describe('prefixItems (tuples)', () => {
    // JSON Schema 2020-12: positions from minItems on may be absent, and more elements are
    // allowed unless items: false (or maxItems) closes the tuple
    it('makes positions from minItems on optional', () => {
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }], minItems: 2, items: false })).toBe('[string, number]');
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }], minItems: 1, items: false })).toBe('[string, number?]');
      expect(typeOf({ type: 'array', prefixItems: [{ oneOf: [{ type: 'string' }, { type: 'integer' }] }], items: false })).toBe('[(string | number)?]');
    });

    it('allows any further elements unless the tuple is closed', () => {
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }] })).toBe('[string?, number?, ...unknown[]]');
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }], minItems: 1, items: true })).toBe('[string, ...unknown[]]');
    });

    it('closes the tuple with maxItems, cutting positions beyond it', () => {
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }], minItems: 2, maxItems: 2 })).toBe('[string, number]');
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }, { type: 'boolean' }], maxItems: 2 })).toBe('[string?, number?]');
    });

    it('renders items as the rest element', () => {
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }], minItems: 1, items: { oneOf: [{ type: 'string' }, { type: 'integer' }] } }))
        .toBe('[string, ...(string | number)[]]');
    });

    it('parenthesizes an intersection before ? and [] so they apply to the whole type', () => {
      const both = { allOf: [{ $ref: '#/components/schemas/Dto' }, { $ref: '#/components/schemas/Point' }] };
      expect(typeOf({ type: 'array', prefixItems: [both], items: false })).toBe('[(IDto & IPoint)?]');
      expect(typeOf({ type: 'array', prefixItems: [both], minItems: 1, items: false })).toBe('[IDto & IPoint]');
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }], minItems: 1, items: both })).toBe('[string, ...(IDto & IPoint)[]]');
      expect(typeOf({ type: 'array', items: both })).toBe('(IDto & IPoint)[]');
    });

    it('imports every schema the tuple references', () => {
      const [typeSymbol, imports] = transformTypeWithAllImports({
        type: 'array',
        prefixItems: [{ $ref: '#/components/schemas/Point' }, { type: 'string' }],
        minItems: 2,
        items: { $ref: '#/components/schemas/Dto' }
      } as unknown as TSchema, swagger);

      expect(typeSymbol).toBe('[IPoint, string, ...IDto[]]');
      expect(imports.map(ref => ref.importSymbol)).toEqual(['IPoint', 'IDto']);
    });

    it('does not import a position that maxItems cuts off', () => {
      const [typeSymbol, imports] = transformTypeWithAllImports({
        type: 'array',
        prefixItems: [{ type: 'string' }, { $ref: '#/components/schemas/Point' }],
        maxItems: 1
      } as unknown as TSchema, swagger);

      expect(typeSymbol).toBe('[string?]');
      expect(imports).toEqual([]);
    });

    it('keeps nullability', () => {
      expect(propertiesOf({ pair: { type: ['array', 'null'], prefixItems: [{ type: 'string' }, { type: 'string' }], minItems: 2, items: false } }).pair)
        .toBe('pair?: [string, string] | null');
    });
  });

  describe('$ref to a oneOf-with-null component', () => {
    it("uses the component's type alias, which already includes null", () => {
      expect(propertiesOf({ owner: { $ref: '#/components/schemas/NullableDto' } }).owner).toBe('owner?: TNullableDto');
    });

    it('counts as nullable: optional with legacyOptionalProperties', () => {
      expect(propertiesOf({ owner: { $ref: '#/components/schemas/NullableDto' } }, true).owner).toBe('owner?: TNullableDto');
      expect(propertiesOf({ plain: { $ref: '#/components/schemas/Dto' } }, true).plain).toBe('plain: IDto');
    });

    it('as a required query parameter, is required and left out of the request when null', () => {
      const item = transformSwaggerSchema({
        ...swagger,
        paths: {
          '/api/Things': {
            get: {
              tags: ['Things'],
              parameters: [{ name: 'owner', in: 'query', required: true, schema: { $ref: '#/components/schemas/NullableId' } }],
              responses: { '204': { description: 'ok' } }
            }
          }
        }
      } as unknown as ISwaggerSchema, { silent: true }).Things.apiList[0];

      expect(item.apiMethodParams).toBe('{ owner }: { owner: TNullableId }');
      expect(item.queryParamsFormatted).toBe('params: { ...(owner != null ? { owner } : {}) }');
    });
  });
});

describe('oneOf/anyOf members that are arrays or records', () => {
  const swagger = {
    openapi: '3.1.0',
    info: { title: 'T', version: '1' },
    paths: {},
    components: {
      schemas: {
        Item: { type: 'object', properties: { id: { type: 'integer' } } },
        Other: { type: 'object', properties: { name: { type: 'string' } } }
      }
    }
  } as unknown as ISwaggerSchema;
  const item = { $ref: '#/components/schemas/Item' };
  const other = { $ref: '#/components/schemas/Other' };
  const importsOf = (schema: unknown) => transformTypeWithAllImports(schema as TSchema, swagger);

  it('imports the element type of a nullable array written as anyOf with a null member (3.1)', () => {
    const [typeSymbol, imports] = importsOf({ anyOf: [{ type: 'array', items: item }, { type: 'null' }] });

    expect(typeSymbol).toBe('IItem[] | null');
    expect(imports.map(ref => ref.importSymbol)).toEqual(['IItem']);
  });

  it('imports every schema of a oneOf mixing a reference and an array (3.0)', () => {
    const [typeSymbol, imports] = importsOf({ oneOf: [item, { type: 'array', items: other }] });

    expect(typeSymbol).toBe('IItem | IOther[]');
    expect(imports.map(ref => ref.importSymbol)).toEqual(['IItem', 'IOther']);
  });

  it('imports record values and tuple positions', () => {
    const record = { type: 'object', additionalProperties: item };
    const tuple = { type: 'array', prefixItems: [other], minItems: 1, items: false };

    expect(importsOf({ anyOf: [record, tuple] })[1].map(ref => ref.importSymbol)).toEqual(['IItem', 'IOther']);
  });
});

describe('nullability in nested positions', () => {
  const swagger = {
    openapi: '3.1.0',
    info: { title: 'T', version: '1' },
    paths: {},
    components: {
      schemas: {
        Dto: { type: 'object', properties: { a: { type: 'string' } } },
        NullableDto: { type: ['object', 'null'], properties: { a: { type: 'string' } } }
      }
    }
  } as unknown as ISwaggerSchema;
  const typeOf = (schema: unknown) => transformType(schema as TSchema, swagger)[0];
  const nullableString = { type: ['string', 'null'] };

  it.each([
    ['array items (3.1)', { type: 'array', items: nullableString }, '(string | null)[]'],
    ['array items (3.0)', { type: 'array', items: { type: 'string', nullable: true } }, '(string | null)[]'],
    ['tuple positions and rest', { type: 'array', prefixItems: [nullableString], minItems: 1, items: { type: 'integer', nullable: true } },
      '[string | null, ...(number | null)[]]'],
    ['optional tuple positions', { type: 'array', prefixItems: [nullableString], items: false }, '[(string | null)?]'],
    ['record values', { type: 'object', additionalProperties: { type: 'integer', nullable: true } }, 'Record<string, number | null>'],
    ['union members, with null once at the end', { oneOf: [nullableString, { type: 'integer' }] }, 'string | number | null'],
    ['union members next to a null member', { anyOf: [nullableString, { type: 'null' }] }, 'string | null']
  ])('keeps null in %s', (_, schema, expected) => {
    expect(typeOf(schema)).toBe(expected);
  });

  it('keeps references to nullable components as before', () => {
    expect(typeOf({ type: 'array', items: { $ref: '#/components/schemas/NullableDto' } })).toBe('(INullableDto | null)[]');
    expect(typeOf({ oneOf: [{ $ref: '#/components/schemas/NullableDto' }, { $ref: '#/components/schemas/Dto' }] }))
      .toBe('INullableDto | IDto | null');
  });

  it('leaves non-nullable elements alone', () => {
    expect(typeOf({ type: 'array', items: { type: 'string' } })).toBe('string[]');
    expect(typeOf({ type: 'object', additionalProperties: { $ref: '#/components/schemas/Dto' } })).toBe('Record<string, IDto>');
  });
});

describe('string literals containing brackets', () => {
  const swagger = { openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {}, components: { schemas: {} } } as unknown as ISwaggerSchema;

  it('parenthesize a union of literals before []', () => {
    expect(transformType({ type: 'array', items: { oneOf: [{ const: '>' }, { const: '<' }] } } as unknown as TSchema, swagger)[0])
      .toBe("('>' | '<')[]");
    expect(transformType({ type: 'array', items: { oneOf: [{ const: "it's (" }, { const: '[' }] } } as unknown as TSchema, swagger)[0])
      .toBe("('it\\'s (' | '[')[]");
  });
});

describe('components replaced by typeMapping', () => {
  const dto = { type: 'object', properties: { amount: { type: 'number' } } } as never;

  it('generate no file of their own', () => {
    expect(getGeneratedSchemaKind(dto, { name: 'Money', typeMapping: { Money: 'string' } })).toBeNull();
    expect(getGeneratedSchemaKind(dto, { name: 'Money', typeMapping: { Other: 'string' } })).toBe('interface');
    expect(getGeneratedSchemaKind(dto, { name: 'Money' })).toBe('interface');
  });

  it('keep a component another mapping points at, since references then import its file', () => {
    // NullableOfStatus -> Status: Status stays; Money -> Amount -> string: Amount stays too
    expect(isReplacedByTypeMapping('NullableOfStatus', { NullableOfStatus: 'Status' })).toBe(true);
    expect(isReplacedByTypeMapping('Status', { NullableOfStatus: 'Status' })).toBe(false);
    expect(isReplacedByTypeMapping('Amount', { Money: 'Amount', Amount: 'string' })).toBe(false);
    expect(isReplacedByTypeMapping('Status', { Status: 'Status' })).toBe(false);
  });

  it('keep null when the component is nullable through a oneOf/anyOf null member', () => {
    const swagger = {
      openapi: '3.1.0',
      info: { title: 'T', version: '1' },
      paths: {},
      components: {
        schemas: {
          NullableId: { oneOf: [{ type: 'null' }, { type: 'string' }] },
          NullableAnyId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          Id: { type: 'string' },
          Status: { type: 'string', enum: ['A', 'B'] },
          NullableStatus: { oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/Status' }] }
        }
      }
    } as unknown as ISwaggerSchema;
    const typeMapping = { NullableId: 'string', NullableAnyId: 'string', Id: 'string', NullableStatus: 'Status' };
    const properties = transformProperties({
      a: { $ref: '#/components/schemas/NullableId' },
      b: { $ref: '#/components/schemas/NullableAnyId' },
      c: { $ref: '#/components/schemas/Id' },
      d: { $ref: '#/components/schemas/NullableStatus' }
    } as never, swagger, { typeMapping }, ['a', 'b', 'c', 'd']).propertiesContent;

    expect(properties).toEqual([['a', 'string | null'], ['b', 'string | null'], ['c', 'string'], ['d', 'TStatus | null']]);
  });
});
