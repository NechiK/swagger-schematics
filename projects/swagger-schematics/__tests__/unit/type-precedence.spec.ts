import { transformType, transformProperties } from '../../types/utils/transform-type';
import { transformCompositionSchema } from '../../types/helpers/template.helper';
import { transformParamsToObject } from '../../types/utils/params';
import { ISwaggerSchema, TSchemaByType } from '../../interfaces/version_3_1/swagger.interface';
import { IQueryParam } from '../../interfaces/version_3_1/params.interface';
import { IParsedParam } from '../../types/utils/params';

describe('Generated type precedence and nullability', () => {
  const createSwaggerSchema = (schemas: Record<string, unknown> = {}): ISwaggerSchema => ({
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {},
    components: { schemas }
  } as unknown as ISwaggerSchema);

  const swagger = createSwaggerSchema({
    ModelA: { type: 'object', properties: { a: { type: 'string' } } },
    ModelB: { type: 'object', properties: { b: { type: 'number' } } },
    NullableExtra: { type: 'object', nullable: true, properties: { x: { type: 'string' } } },
    NullableString: { type: 'string', nullable: true }
  });

  describe('union parenthesization', () => {
    it('parenthesizes a union in array item position', () => {
      const schema = {
        type: 'array',
        items: { oneOf: [{ $ref: '#/components/schemas/ModelA' }, { $ref: '#/components/schemas/ModelB' }] }
      } as unknown as TSchemaByType;

      const [symbol] = transformType(schema, swagger);
      expect(symbol).toBe('(IModelA | IModelB)[]');
    });

    it('parenthesizes a nullable ref in array item position', () => {
      const schema = {
        type: 'array',
        items: { $ref: '#/components/schemas/NullableExtra' }
      } as unknown as TSchemaByType;

      const [symbol] = transformType(schema, swagger);
      expect(symbol).toBe('(INullableExtra | null)[]');
    });

    it('parenthesizes a nullable ref member inside an allOf intersection', () => {
      const schema = {
        allOf: [
          { $ref: '#/components/schemas/ModelA' },
          { $ref: '#/components/schemas/NullableExtra' }
        ]
      } as unknown as TSchemaByType;

      const [symbol] = transformType(schema, swagger);
      expect(symbol).toBe('IModelA & (INullableExtra | null)');
    });

    it('does not add parentheses to plain symbols', () => {
      const schema = {
        type: 'array',
        items: { $ref: '#/components/schemas/ModelA' }
      } as unknown as TSchemaByType;

      expect(transformType(schema, swagger)[0]).toBe('IModelA[]');
    });
  });

  describe('inline allOf with sibling properties', () => {
    const schema = {
      allOf: [{ $ref: '#/components/schemas/ModelA' }],
      properties: { extra: { type: 'string' } },
      required: []
    } as unknown as TSchemaByType;

    it('renders own properties inline (matching the named-alias output)', () => {
      const [inlineSymbol] = transformType(schema, swagger);
      const { typeExpression: aliasExpression } = transformCompositionSchema(schema, swagger);

      expect(inlineSymbol).toBe('IModelA & { extra?: string }');
      expect(aliasExpression).toBe(inlineSymbol);
    });

    it('keeps own-property import refs in the alias output', () => {
      const withRefProp = {
        allOf: [{ $ref: '#/components/schemas/ModelA' }],
        properties: { other: { $ref: '#/components/schemas/ModelB' } }
      } as unknown as TSchemaByType;

      const { importRefs } = transformCompositionSchema(withRefProp, swagger);
      expect(importRefs.map(ref => ref.importSymbol)).toEqual(expect.arrayContaining(['IModelA', 'IModelB']));
    });
  });

  describe('outer nullability with nested "| null"', () => {
    it('appends outer null to a nullable Record of nullable values', () => {
      const properties = {
        map: {
          type: 'object',
          nullable: true,
          additionalProperties: { $ref: '#/components/schemas/NullableString' }
        }
      };

      const { propertiesContent } = transformProperties(properties as never, swagger);
      const [, typeSymbol] = propertiesContent[0];
      expect(typeSymbol).toBe('Record<string, string | null> | null');
    });

    it('does not double-append when the type already ends with | null', () => {
      const properties = {
        ref: { $ref: '#/components/schemas/NullableExtra' }
      };

      const { propertiesContent } = transformProperties(properties as never, swagger);
      const [, typeSymbol] = propertiesContent[0];
      expect(typeSymbol).toBe('INullableExtra | null');
    });
  });

  describe('isParamOptional via transformParamsToObject', () => {
    const param = (typeSymbol: string, required: boolean): IParsedParam<IQueryParam> => ({
      originalParam: { name: 'p', in: 'query', required } as IQueryParam,
      typeSymbol,
      functionSymbol: `p: ${typeSymbol}`,
      interpolationSymbol: '${p}',
      objectSymbol: 'p'
    });

    it('keeps a required param with a nested "| null" required', () => {
      const result = transformParamsToObject([param('Record<string, string | null>', true)]);
      expect(result).toContain('p: Record<string, string | null>');
      expect(result).not.toContain('p?:');
    });

    it('marks a param whose type ends with | null as optional', () => {
      const result = transformParamsToObject([param('string | null', true)]);
      expect(result).toContain('p?: string | null');
    });
  });
});
