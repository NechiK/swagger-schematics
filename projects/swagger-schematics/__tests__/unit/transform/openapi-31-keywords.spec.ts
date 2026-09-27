import { transformProperties, transformType, transformTypeWithAllImports } from '@lib/types/utils/transform-type';
import { transformSwaggerSchema } from '@lib/api/helpers/api.helper';
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

    it('inlines a const primitive component as its literal where it is referenced', () => {
      expect(typeOf({ $ref: '#/components/schemas/Kind' })).toBe("'dog'");
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
  });

  describe('prefixItems (tuples)', () => {
    it('renders a closed tuple when there is no items, or items is false', () => {
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }] })).toBe('[string, number]');
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }], items: false })).toBe('[string]');
    });

    it('renders items as the rest element', () => {
      expect(typeOf({ type: 'array', prefixItems: [{ type: 'string' }], items: { oneOf: [{ type: 'string' }, { type: 'integer' }] } }))
        .toBe('[string, ...(string | number)[]]');
    });

    it('imports every schema the tuple references', () => {
      const [typeSymbol, imports] = transformTypeWithAllImports({
        type: 'array',
        prefixItems: [{ $ref: '#/components/schemas/Point' }, { type: 'string' }],
        items: { $ref: '#/components/schemas/Dto' }
      } as unknown as TSchema, swagger);

      expect(typeSymbol).toBe('[IPoint, string, ...IDto[]]');
      expect(imports.map(ref => ref.importSymbol)).toEqual(['IPoint', 'IDto']);
    });

    it('keeps nullability', () => {
      expect(propertiesOf({ pair: { type: ['array', 'null'], prefixItems: [{ type: 'string' }, { type: 'string' }] } }).pair)
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
