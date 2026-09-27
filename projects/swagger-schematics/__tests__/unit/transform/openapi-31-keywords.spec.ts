import { transformProperties, transformType, transformTypeWithAllImports } from '@lib/types/utils/transform-type';
import { transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import { getGeneratedSchemaKind, isReplacedByTypeMapping } from '@lib/types/utils/schema-kind';
import { aggregatableColumnsType, interfacePropertyLine } from '@lib/types/helpers/template.helper';
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

describe('boolean schemas', () => {
  const swagger = { openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {}, components: { schemas: {} } } as unknown as ISwaggerSchema;
  const typeOf = (schema: unknown) => transformTypeWithAllImports(schema as TSchema, swagger)[0];

  it.each([
    [{ type: 'array', items: true }, 'unknown[]'],
    [{ type: 'array', items: false }, 'never[]'],
    [{ type: 'array', prefixItems: [true, false], minItems: 1 }, '[unknown, never?, ...unknown[]]'],
    [{ type: 'object', additionalProperties: false, properties: {} }, 'object'],
    [{ anyOf: [false, { type: 'string' }] }, 'never | string']
  ])('renders %p as %p instead of crashing', (schema, expected) => {
    expect(typeOf(schema)).toBe(expected);
  });

  it('renders boolean property schemas', () => {
    const { propertiesContent } = transformProperties({ anything: true, nothing: false } as never, swagger, {}, ['anything']);
    expect(propertiesContent).toEqual([['anything', 'unknown'], ['nothing?', 'never']]);
  });
});

describe('property names that are not identifiers', () => {
  const swagger = { openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {}, components: { schemas: {} } } as unknown as ISwaggerSchema;

  it('are quoted, in interfaces and in inline object types', () => {
    const properties = { 'first-name': { type: 'string' }, '@odata.type': { type: 'string' }, "it's": { type: 'string' }, $id: { type: 'string' }, default: { type: 'string' } };
    expect(transformProperties(properties as never, swagger, {}, ['first-name']).propertiesContent).toEqual([
      ["'first-name'", 'string'],
      ["'@odata.type'?", 'string'],
      ["'it\\'s'?", 'string'],
      ['$id?', 'string'],
      ['default?', 'string']
    ]);
    expect(transformType({ allOf: [{ type: 'object', properties: {} }], properties: { 'x-y': { type: 'integer' } } } as unknown as TSchema, swagger)[0])
      .toContain("{ 'x-y'?: number }");
  });

  it('keep their JSDoc and @aggregatable, and the aggregatable column union stays valid', () => {
    const { propertiesContent, aggregatable, docs } = transformProperties({
      'unit-price': { type: 'number', description: 'Per unit', 'x-aggregatable': ['sum'] }
    } as never, swagger, {}, []);

    expect(interfacePropertyLine(propertiesContent, '2', aggregatable, docs)).toBe(
      "  /**\n   * Per unit\n   * @aggregatable sum\n   */\n  'unit-price'?: number;"
    );
    expect(aggregatableColumnsType('IOrder', aggregatable)).toContain("export type IOrderAggregatableColumn = 'unit-price';");
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

describe('nullability the schema checks and the rendered type agree on', () => {
  const parse = (parameters: unknown[], schemas: Record<string, unknown> = {}) => transformSwaggerSchema({
    openapi: '3.1.0',
    info: { title: 'T', version: '1' },
    paths: { '/api/Things': { get: { tags: ['Things'], parameters, responses: { '204': { description: 'ok' } } } } },
    components: { schemas }
  } as unknown as ISwaggerSchema, { silent: true }).Things.apiList[0];

  it('leaves out a required param whose union has a nullable member when it is null', () => {
    const item = parse([
      { name: 'u', in: 'query', required: true, schema: { oneOf: [{ type: ['string', 'null'] }, { type: 'integer' }] } },
      { name: 'X-H', in: 'header', required: true, schema: { anyOf: [{ type: 'string', nullable: true }, { type: 'integer' }] } }
    ]);

    expect(item.queryParamsFormatted).toBe('params: { ...(u != null ? { u } : {}) }');
    expect(item.headerParamsFormatted).toBe("headers: { ...(xH != null ? { 'X-H': String(xH) } : {}) }");
  });

  it('types a query array of nullable items (List<int?>) without null elements, which HttpClient params reject', () => {
    const item = parse([
      { name: 'ids', in: 'query', required: true, schema: { type: 'array', items: { type: 'integer', nullable: true } } },
      { name: 'names', in: 'query', schema: { type: ['array', 'null'], items: { type: ['string', 'null'] } } }
    ]);

    expect(item.apiMethodParams).toBe('{ ids, names }: { ids: number[]; names?: string[] | null }');
  });

  it('leaves null out of the elements of a query array that is itself nullable through a union member', () => {
    // pydantic's Optional[List[Optional[int]]]; the `type: ['array', 'null']` form is covered above
    const item = parse([
      { name: 'b', in: 'query', schema: { oneOf: [{ type: 'array', items: { type: ['integer', 'null'] } }, { type: 'null' }] } },
      { name: 'c', in: 'query', schema: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string', nullable: true } }] } }
    ]);

    expect(item.apiMethodParams).toBe('{ b, c }: { b?: number[] | null; c?: string | string[] } = {}');
  });

  it('leaves null out of query array elements that get it from a $ref, allOf or a union member', () => {
    const item = parse([
      { name: 'a', in: 'query', schema: { type: 'array', items: { $ref: '#/components/schemas/NullableText' } } },
      { name: 'b', in: 'query', schema: { type: 'array', items: { $ref: '#/components/schemas/Color' } } },
      { name: 'c', in: 'query', schema: { type: 'array', items: { allOf: [{ $ref: '#/components/schemas/Color' }] } } },
      { name: 'd', in: 'query', schema: { type: 'array', items: { anyOf: [{ type: ['integer', 'null'] }, { type: 'string' }] } } }
    ], {
      NullableText: { type: ['string', 'null'] },
      Color: { type: ['string', 'null'], enum: ['red', null] }
    });

    expect(item.apiMethodParams).toBe('{ a, b, c, d }: { a?: string[]; b?: TColor[]; c?: TColor[]; d?: (number | string)[] } = {}');
  });

  it('writes out a query param that refers to an array component with nullable items, whose alias HttpClient params reject', () => {
    const item = parse([
      { name: 'a', in: 'query', schema: { $ref: '#/components/schemas/NullableIds' } },
      { name: 'b', in: 'query', required: true, schema: { $ref: '#/components/schemas/MaybeColors' } },
      { name: 'c', in: 'query', schema: { $ref: '#/components/schemas/IdsAlias' } },
      { name: 'd', in: 'query', schema: { $ref: '#/components/schemas/Tags' } }
    ], {
      NullableIds: { type: 'array', items: { type: ['integer', 'null'] } },
      MaybeColors: { type: ['array', 'null'], items: { $ref: '#/components/schemas/Color' } },
      Color: { type: ['string', 'null'], enum: ['red', null] },
      IdsAlias: { $ref: '#/components/schemas/NullableIds' },
      Tags: { type: 'array', items: { type: 'string' } }
    });

    // An alias without nullable items stays the alias
    expect(item.apiMethodParams).toBe('{ a, b, c, d }: { a?: number[]; b: TColor[] | null; c?: number[]; d?: TTags }');
  });

  it('makes a reference to an untyped enum with a null value nullable', () => {
    const swagger = { openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {}, components: { schemas: { Color: { enum: ['red', null] } } } } as unknown as ISwaggerSchema;

    expect(transformProperties({ c: { $ref: '#/components/schemas/Color' } } as never, swagger, {}, ['c']).propertiesContent)
      .toEqual([['c', 'TColor | null']]);
  });
});

describe('boolean enums', () => {
  const swagger = {
    openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {},
    components: { schemas: {
      Flag: { type: 'boolean', enum: [true, false] },
      AlwaysTrue: { type: 'boolean', enum: [true] },
      NullableFlag: { type: ['boolean', 'null'], enum: [true, false, null] }
    } }
  } as unknown as ISwaggerSchema;

  it("generate no enum: a TypeScript enum can't hold booleans (`true = true`)", () => {
    Object.entries(swagger.components!.schemas!).forEach(([name, schema]) =>
      expect(getGeneratedSchemaKind(schema as TSchema, { name })).toBeNull());
  });

  it('are inlined as boolean at every reference, keeping their nullability', () => {
    const properties = {
      a: { $ref: '#/components/schemas/Flag' },
      b: { $ref: '#/components/schemas/AlwaysTrue' },
      c: { $ref: '#/components/schemas/NullableFlag' }
    };

    expect(transformProperties(properties as never, swagger, {}, ['a', 'b', 'c']).propertiesContent)
      .toEqual([['a', 'boolean'], ['b', 'boolean'], ['c', 'boolean | null']]);
  });
});

describe('boolean component schemas', () => {
  const swagger = {
    openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {},
    components: { schemas: { Anything: true, Nothing: false } }
  } as unknown as ISwaggerSchema;

  it('generate no file and are inlined as unknown / never', () => {
    expect(getGeneratedSchemaKind(true as never)).toBeNull();
    expect(transformType({ $ref: '#/components/schemas/Anything' } as TSchema, swagger)).toEqual(['unknown']);
    expect(transformType({ $ref: '#/components/schemas/Nothing' } as TSchema, swagger)).toEqual(['never']);
  });
});

describe('typeMapping lookups', () => {
  const swagger = {
    openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {},
    components: {
      schemas: {
        Price: { type: 'object', properties: { amount: { type: 'number' } } },
        Decimal: { type: 'string', format: 'decimal' },
        constructor: { type: 'object', properties: { a: { type: 'string' } } }
      }
    }
  } as unknown as ISwaggerSchema;

  it('inline a primitive wrapper the mapping points at, which generates no file to import', () => {
    expect(transformType({ $ref: '#/components/schemas/Price' } as TSchema, swagger, { typeMapping: { Price: 'Decimal' } })).toEqual(['string']);
  });

  it('follow a target that is only a $ref to the component it points to, which is the file that exists', () => {
    const withAlias = {
      ...swagger,
      components: { schemas: { ...swagger.components!.schemas, PriceAlias: { $ref: '#/components/schemas/Price' }, Old: { type: 'object' } } }
    } as unknown as ISwaggerSchema;
    const typeMapping = { Old: 'PriceAlias' };

    expect(transformType({ $ref: '#/components/schemas/Old' } as TSchema, withAlias, { typeMapping }))
      .toEqual(['IPrice', { type: 'interface', importSymbol: 'IPrice', fileName: 'price' }]);
    // A mapping that leads back into its own chain describes no type
    const circular = { ...withAlias, components: { schemas: { Old: { type: 'object' }, Loop: { $ref: '#/components/schemas/Old' } } } } as unknown as ISwaggerSchema;
    expect(transformType({ $ref: '#/components/schemas/Old' } as TSchema, circular, { typeMapping: { Old: 'Loop' } })[0]).toBe('unknown');
  });

  it('ignore keys inherited from Object.prototype', () => {
    const typeMapping = { Guid: 'string' };

    expect(getGeneratedSchemaKind(swagger.components!.schemas!.constructor as never, { name: 'constructor', typeMapping })).toBe('interface');
    expect(transformType({ $ref: '#/components/schemas/constructor' } as TSchema, swagger, { typeMapping })[0]).toBe('IConstructor');
  });
});

describe('untyped objects closed with additionalProperties: false', () => {
  it('are not records', () => {
    const swagger = { openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {}, components: { schemas: {} } } as unknown as ISwaggerSchema;

    expect(transformType({ properties: { a: { type: 'string' } }, additionalProperties: false } as never, swagger)[0]).toBe('any');
  });
});

describe('objects with properties and additionalProperties', () => {
  const swagger = {
    openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {},
    components: { schemas: { Tag: { type: 'object', properties: { name: { type: 'string' } } } } }
  } as unknown as ISwaggerSchema;

  it('render both, instead of a record that rejects the properties', () => {
    const extra = { type: 'object', properties: { x: { type: 'string' } }, additionalProperties: { type: 'integer' } };

    // Every property must fit the index signature (TS2411), so its type admits them too
    expect(transformType(extra as never, swagger)[0]).toBe('{ x?: string; [key: string]: number | string | undefined }');
    expect(transformType({ ...extra, required: ['x'], additionalProperties: true } as never, swagger)[0]).toBe('{ x: string; [key: string]: any }');
  });

  it('import the properties\' and the additional values\' types', () => {
    const schema = { type: 'object', properties: { tag: { $ref: '#/components/schemas/Tag' } }, additionalProperties: { $ref: '#/components/schemas/Tag' } };

    expect(transformTypeWithAllImports(schema as never, swagger)[1].map(ref => ref.importSymbol)).toEqual(['ITag', 'ITag']);
  });
});
