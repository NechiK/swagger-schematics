import { transformType, parseRefToSymbol, isNullable, ITransformTypeOptions } from '../../types/utils/transform-type';
import { ISwaggerSchema } from '../../interfaces/version_3_1/swagger.interface';
import { IRef } from '../../interfaces/version_3_1/ref.interface';

describe('Transform Type', () => {
  // Minimal swagger schema for testing
  const createSwaggerSchema = (schemas: Record<string, any> = {}): ISwaggerSchema => ({
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {},
    components: { schemas }
  } as ISwaggerSchema);

  describe('transformType', () => {
    it('should transform primitive types without options', () => {
      const swagger = createSwaggerSchema();

      expect(transformType({ type: 'string' }, swagger)).toEqual(['string']);
      expect(transformType({ type: 'integer' }, swagger)).toEqual(['number']);
      expect(transformType({ type: 'number' }, swagger)).toEqual(['number']);
      expect(transformType({ type: 'boolean' }, swagger)).toEqual(['boolean']);
    });

    it('should transform binary strings to Blob', () => {
      const swagger = createSwaggerSchema();

      expect(transformType({ type: 'string', format: 'binary' }, swagger)).toEqual(['Blob']);
      // Other string formats stay strings
      expect(transformType({ type: 'string', format: 'date-time' }, swagger)).toEqual(['string']);
      expect(transformType({ type: 'string', format: 'uuid' }, swagger)).toEqual(['string']);
      expect(transformType({ type: 'string', format: 'byte' }, swagger)).toEqual(['string']);
    });

    it('should transform 3.1 contentMediaType binary strings to Blob', () => {
      const swagger = createSwaggerSchema();

      expect(transformType({ type: 'string', contentMediaType: 'application/octet-stream' } as any, swagger)).toEqual(['Blob']);
      expect(transformType({ type: 'string', contentMediaType: 'image/png' } as any, swagger)).toEqual(['Blob']);
      // base64-encoded content stays a string
      expect(transformType({ type: 'string', contentMediaType: 'application/octet-stream', contentEncoding: 'base64' } as any, swagger)).toEqual(['string']);
      // textual content stays a string
      expect(transformType({ type: 'string', contentMediaType: 'text/html' } as any, swagger)).toEqual(['string']);
    });

    it('should transform 3.1 type arrays', () => {
      const swagger = createSwaggerSchema();

      // null member affects nullability only, not the symbol (matches 3.0 nullable handling)
      expect(transformType({ type: ['string', 'null'] } as any, swagger)).toEqual(['string', undefined]);
      expect(transformType({ type: ['integer', 'null'] } as any, swagger)).toEqual(['number', undefined]);
      // multiple non-null types become a union
      expect(transformType({ type: ['string', 'integer'] } as any, swagger)).toEqual(['string | number', undefined]);
      // duplicate mapped types are deduplicated
      expect(transformType({ type: ['integer', 'number', 'null'] } as any, swagger)).toEqual(['number', undefined]);
      // only null
      expect(transformType({ type: ['null'] } as any, swagger)).toEqual(['null']);
    });

    it('should treat 3.1 type arrays containing null as nullable', () => {
      const swagger = createSwaggerSchema({
        NullableName: { type: ['string', 'null'] }
      });

      expect(isNullable({ type: ['string', 'null'] } as any, swagger)).toBe(true);
      expect(isNullable({ type: ['string'] } as any, swagger)).toBe(false);
      expect(isNullable({ $ref: '#/components/schemas/NullableName' }, swagger)).toBe(true);
    });

    it('should collect all imports from composition schemas', () => {
      const { transformTypeWithAllImports } = require('../../types/utils/transform-type');
      const swagger = createSwaggerSchema({
        PartA: { type: 'object', properties: { a: { type: 'string' } } },
        PartB: { type: 'object', properties: { b: { type: 'string' } } }
      });

      const [symbol, importRefs] = transformTypeWithAllImports({
        allOf: [
          { $ref: '#/components/schemas/PartA' },
          { $ref: '#/components/schemas/PartB' }
        ]
      } as any, swagger);

      expect(symbol).toBe('IPartA & IPartB');
      expect(importRefs.map((ref: any) => ref.importSymbol)).toEqual(['IPartA', 'IPartB']);
    });

    it('should append | null for refs to 3.1 nullable enum schemas', () => {
      const swagger = createSwaggerSchema({
        Status: { type: ['string', 'null'], enum: ['Active', 'Inactive'] }
      });

      const [symbol, importRef] = transformType({ $ref: '#/components/schemas/Status' }, swagger);
      expect(symbol).toBe('TStatus | null');
      expect(importRef?.type).toBe('enum');
    });

    it('should transform $ref to interface symbol', () => {
      const swagger = createSwaggerSchema({
        UserDTO: { type: 'object', properties: { id: { type: 'integer' } } }
      });

      const result = transformType({ $ref: '#/components/schemas/UserDTO' }, swagger);
      
      expect(result[0]).toBe('IUserDTO');
      expect(result[1]).toEqual({
        type: 'interface',
        importSymbol: 'IUserDTO',
        fileName: 'user-dto'
      });
    });

    it('should transform $ref to enum symbol', () => {
      const swagger = createSwaggerSchema({
        Status: { type: 'string', enum: ['active', 'inactive'] }
      });

      const result = transformType({ $ref: '#/components/schemas/Status' }, swagger);
      
      expect(result[0]).toBe('TStatus');
      expect(result[1]).toEqual({
        type: 'enum',
        importSymbol: 'TStatus',
        fileName: 'status'
      });
    });

    it('should transform array of $ref', () => {
      const swagger = createSwaggerSchema({
        UserDTO: { type: 'object', properties: { id: { type: 'integer' } } }
      });

      const result = transformType({
        type: 'array',
        items: { $ref: '#/components/schemas/UserDTO' }
      }, swagger);

      expect(result[0]).toBe('IUserDTO[]');
    });
  });

  describe('3.1 nullable oneOf/anyOf (null member)', () => {
    const swagger = createSwaggerSchema({
      UserDTO: { type: 'object', properties: { id: { type: 'integer' } } },
      RoleDTO: { type: 'object', properties: { name: { type: 'string' } } },
      Status: { type: 'string', enum: ['active', 'inactive'] },
      GuidIdentifier: { type: 'string', format: 'uuid' }
    });

    it('should reduce oneOf: [{type:null}, {$ref}] to `X | null` (not `any | X`)', () => {
      const [symbol, importRef] = transformType({
        oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/UserDTO' }]
      } as any, swagger);

      expect(symbol).toBe('IUserDTO | null');
      expect(symbol).not.toContain('any');
      expect(importRef).toEqual({ type: 'interface', importSymbol: 'IUserDTO', fileName: 'user-dto' });
    });

    it('should reduce oneOf null + enum ref to `TStatus | null`', () => {
      const [symbol, importRef] = transformType({
        oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/Status' }]
      } as any, swagger);

      expect(symbol).toBe('TStatus | null');
      expect(importRef?.type).toBe('enum');
    });

    it('should inline a primitive-wrapper ref inside a nullable oneOf to `string | null`', () => {
      const [symbol, importRef] = transformType({
        oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/GuidIdentifier' }]
      } as any, swagger);

      expect(symbol).toBe('string | null');
      expect(importRef).toBeUndefined();
    });

    it('should handle anyOf null members the same way', () => {
      const [symbol] = transformType({
        anyOf: [{ type: 'null' }, { $ref: '#/components/schemas/UserDTO' }]
      } as any, swagger);

      expect(symbol).toBe('IUserDTO | null');
    });

    it('should keep multiple non-null members as a union and append | null once', () => {
      const [symbol] = transformType({
        oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/UserDTO' }, { $ref: '#/components/schemas/RoleDTO' }]
      } as any, swagger);

      expect(symbol).toBe('IUserDTO | IRoleDTO | null');
    });

    it('should not append | null when there is no null member', () => {
      const [symbol] = transformType({
        oneOf: [{ $ref: '#/components/schemas/UserDTO' }, { $ref: '#/components/schemas/RoleDTO' }]
      } as any, swagger);

      expect(symbol).toBe('IUserDTO | IRoleDTO');
    });

    it('should resolve an only-null oneOf to `null`', () => {
      const [symbol] = transformType({ oneOf: [{ type: 'null' }] } as any, swagger);
      expect(symbol).toBe('null');
    });
  });

  describe('allOf / anyOf / not', () => {
    const swagger = createSwaggerSchema({
      PartA: { type: 'object', properties: { a: { type: 'string' } } },
      PartB: { type: 'object', properties: { b: { type: 'string' } } }
    });

    it('should transform allOf to a TypeScript intersection', () => {
      const [symbol] = transformType({
        allOf: [{ $ref: '#/components/schemas/PartA' }, { $ref: '#/components/schemas/PartB' }]
      } as any, swagger);
      expect(symbol).toBe('IPartA & IPartB');
    });

    it('should lift a null member out of allOf as `(A & B) | null`', () => {
      const [symbol] = transformType({
        allOf: [{ type: 'null' }, { $ref: '#/components/schemas/PartA' }, { $ref: '#/components/schemas/PartB' }]
      } as any, swagger);
      expect(symbol).toBe('(IPartA & IPartB) | null');
    });

    it('should render a single-member nullable allOf as `A | null` (no parens)', () => {
      const [symbol] = transformType({
        allOf: [{ type: 'null' }, { $ref: '#/components/schemas/PartA' }]
      } as any, swagger);
      expect(symbol).toBe('IPartA | null');
    });

    it('should transform anyOf with multiple non-null members to a union', () => {
      const [symbol] = transformType({
        anyOf: [{ $ref: '#/components/schemas/PartA' }, { $ref: '#/components/schemas/PartB' }]
      } as any, swagger);
      expect(symbol).toBe('IPartA | IPartB');
    });

    it('should map `not` schemas to `unknown`', () => {
      const [symbol] = transformType({ not: { type: 'string' } } as any, swagger);
      expect(symbol).toBe('unknown');
    });
  });

  describe('typeMapping option', () => {
    it('should map custom type to primitive', () => {
      const swagger = createSwaggerSchema({
        SuperDuperInt32: { type: 'object' }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'SuperDuperInt32': 'number' }
      };

      const result = transformType(
        { $ref: '#/components/schemas/SuperDuperInt32' }, 
        swagger, 
        options
      );
      
      expect(result[0]).toBe('number');
      expect(result[1]).toBeUndefined(); // No import needed for primitives
    });

    it('should map custom GUID type to string', () => {
      const swagger = createSwaggerSchema({
        CustomGuid: { type: 'object' }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'CustomGuid': 'string' }
      };

      const result = transformType(
        { $ref: '#/components/schemas/CustomGuid' }, 
        swagger, 
        options
      );
      
      expect(result[0]).toBe('string');
      expect(result[1]).toBeUndefined();
    });

    it('should handle multiple type mappings', () => {
      const swagger = createSwaggerSchema({
        SuperDuperInt32: { type: 'object' },
        CustomGuid: { type: 'object' },
        NormalDTO: { type: 'object', properties: {} }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 
          'SuperDuperInt32': 'number',
          'CustomGuid': 'string'
        }
      };

      expect(transformType({ $ref: '#/components/schemas/SuperDuperInt32' }, swagger, options)[0]).toBe('number');
      expect(transformType({ $ref: '#/components/schemas/CustomGuid' }, swagger, options)[0]).toBe('string');
      // Non-mapped type should still resolve normally
      expect(transformType({ $ref: '#/components/schemas/NormalDTO' }, swagger, options)[0]).toBe('INormalDTO');
    });

    it('should map types in arrays', () => {
      const swagger = createSwaggerSchema({
        SuperDuperInt32: { type: 'object' }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'SuperDuperInt32': 'number' }
      };

      const result = transformType({ 
        type: 'array', 
        items: { $ref: '#/components/schemas/SuperDuperInt32' } 
      }, swagger, options);
      
      expect(result[0]).toBe('number[]');
      expect(result[1]).toBeUndefined();
    });

    it('should not affect types not in mapping', () => {
      const swagger = createSwaggerSchema({
        UserDTO: { type: 'object', properties: { id: { type: 'integer' } } }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'SuperDuperInt32': 'number' }
      };

      const result = transformType(
        { $ref: '#/components/schemas/UserDTO' }, 
        swagger, 
        options
      );
      
      expect(result[0]).toBe('IUserDTO');
      expect(result[1]).toBeDefined();
    });

    it('should work without options (backward compatible)', () => {
      const swagger = createSwaggerSchema({
        UserDTO: { type: 'object', properties: {} }
      });

      // Call without options - should work exactly as before
      const result = transformType({ $ref: '#/components/schemas/UserDTO' }, swagger);

      expect(result[0]).toBe('IUserDTO');
    });

    it('should map nullable wrapper enum to base enum with | null', () => {
      const swagger = createSwaggerSchema({
        DistributionType: { type: 'string', enum: ['TypeA', 'TypeB'] },
        NullableOfDistributionType: { type: 'string', nullable: true, enum: ['TypeA', 'TypeB'] }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'NullableOfDistributionType': 'DistributionType' }
      };

      const result = transformType(
        { $ref: '#/components/schemas/NullableOfDistributionType' },
        swagger,
        options
      );

      expect(result[0]).toBe('TDistributionType | null');
      expect(result[1]).toEqual({
        type: 'enum',
        importSymbol: 'TDistributionType',
        fileName: 'distribution-type'
      });
    });

    it('should map nullable wrapper to base interface with | null', () => {
      const swagger = createSwaggerSchema({
        UserDTO: { type: 'object', properties: { id: { type: 'integer' } } },
        NullableOfUserDTO: { type: 'object', nullable: true, properties: { id: { type: 'integer' } } }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'NullableOfUserDTO': 'UserDTO' }
      };

      const result = transformType(
        { $ref: '#/components/schemas/NullableOfUserDTO' },
        swagger,
        options
      );

      expect(result[0]).toBe('IUserDTO | null');
      expect(result[1]).toEqual({
        type: 'interface',
        importSymbol: 'IUserDTO',
        fileName: 'user-dto'
      });
    });

    it('should map non-nullable wrapper to base schema without | null', () => {
      const swagger = createSwaggerSchema({
        DistributionType: { type: 'string', enum: ['TypeA', 'TypeB'] },
        AliasOfDistributionType: { type: 'string', enum: ['TypeA', 'TypeB'] } // no nullable
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'AliasOfDistributionType': 'DistributionType' }
      };

      const result = transformType(
        { $ref: '#/components/schemas/AliasOfDistributionType' },
        swagger,
        options
      );

      expect(result[0]).toBe('TDistributionType');
      expect(result[1]?.importSymbol).toBe('TDistributionType');
    });

    it('should preserve nullable when mapping to primitive', () => {
      const swagger = createSwaggerSchema({
        NullableInt32: { type: 'integer', nullable: true }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'NullableInt32': 'number' }
      };

      const result = transformType(
        { $ref: '#/components/schemas/NullableInt32' },
        swagger,
        options
      );

      expect(result[0]).toBe('number | null');
      expect(result[1]).toBeUndefined();
    });

    it('should not resolve primitive type names as schema references even if schema exists', () => {
      // Edge case: schema named "String" exists, but mapping to 'string' should treat it as primitive
      const swagger = createSwaggerSchema({
        MyType: { type: 'object' },
        String: { type: 'object', properties: { value: { type: 'string' } } }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'MyType': 'string' }
      };

      const result = transformType(
        { $ref: '#/components/schemas/MyType' },
        swagger,
        options
      );

      // Should be primitive 'string', not 'IString' interface
      expect(result[0]).toBe('string');
      expect(result[1]).toBeUndefined();
    });

    it('should not resolve lowercase custom type aliases as schema references', () => {
      const swagger = createSwaggerSchema({
        MyGuid: { type: 'object' },
        guid: { type: 'object', properties: {} } // lowercase schema that shouldn't match
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'MyGuid': 'guid' } // lowercase mapping
      };

      const result = transformType(
        { $ref: '#/components/schemas/MyGuid' },
        swagger,
        options
      );

      // Should treat 'guid' as a custom primitive alias, not resolve to 'Iguid'
      expect(result[0]).toBe('guid');
      expect(result[1]).toBeUndefined();
    });

    it('should resolve PascalCase mapped values as schema references when schema exists', () => {
      const swagger = createSwaggerSchema({
        NullableUserDTO: { type: 'object', nullable: true, properties: { id: { type: 'integer' } } },
        UserDTO: { type: 'object', properties: { id: { type: 'integer' } } }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'NullableUserDTO': 'UserDTO' }
      };

      const result = transformType(
        { $ref: '#/components/schemas/NullableUserDTO' },
        swagger,
        options
      );

      // Should resolve to the mapped schema with nullable preserved from original
      expect(result[0]).toBe('IUserDTO | null');
      expect(result[1]).toEqual({
        type: 'interface',
        importSymbol: 'IUserDTO',
        fileName: 'user-dto'
      });
    });

    it('should handle all TypeScript primitive type names correctly', () => {
      const swagger = createSwaggerSchema({
        Type1: { type: 'object' },
        Type2: { type: 'object' },
        Type3: { type: 'object' },
        Type4: { type: 'object' },
        Type5: { type: 'object' },
        // Schemas with primitive names (edge case)
        Number: { type: 'object', properties: {} },
        Boolean: { type: 'object', properties: {} },
        Any: { type: 'object', properties: {} }
      });
      const options: ITransformTypeOptions = {
        typeMapping: {
          'Type1': 'number',
          'Type2': 'boolean',
          'Type3': 'any',
          'Type4': 'unknown',
          'Type5': 'void'
        }
      };

      // All should be treated as primitives, not resolved to schemas
      expect(transformType({ $ref: '#/components/schemas/Type1' }, swagger, options)[0]).toBe('number');
      expect(transformType({ $ref: '#/components/schemas/Type2' }, swagger, options)[0]).toBe('boolean');
      expect(transformType({ $ref: '#/components/schemas/Type3' }, swagger, options)[0]).toBe('any');
      expect(transformType({ $ref: '#/components/schemas/Type4' }, swagger, options)[0]).toBe('unknown');
      expect(transformType({ $ref: '#/components/schemas/Type5' }, swagger, options)[0]).toBe('void');
    });
  });

  describe('parseRefToSymbol', () => {
    it('should apply type mapping', () => {
      const swagger = createSwaggerSchema({
        Int64: { type: 'integer', format: 'int64' }
      });
      const options: ITransformTypeOptions = {
        typeMapping: { 'Int64': 'number' }
      };
      const ref: IRef = { $ref: '#/components/schemas/Int64' };

      const result = parseRefToSymbol(ref, swagger, options);
      
      expect(result[0]).toBe('number');
      expect(result[1]).toBeUndefined();
    });

    it('should handle unknown schema with mapping', () => {
      const swagger = createSwaggerSchema({}); // No schemas defined
      const options: ITransformTypeOptions = {
        typeMapping: { 'UnknownType': 'any' }
      };
      const ref: IRef = { $ref: '#/components/schemas/UnknownType' };

      const result = parseRefToSymbol(ref, swagger, options);
      
      expect(result[0]).toBe('any');
      expect(result[1]).toBeUndefined();
    });

    it('should inline nullable primitive wrapper types', () => {
      const swagger = createSwaggerSchema({
        NullableOfDistributionType: { type: 'integer', nullable: true }
      });
      const ref: IRef = { $ref: '#/components/schemas/NullableOfDistributionType' };

      const result = parseRefToSymbol(ref, swagger);
      
      expect(result[0]).toBe('number | null');
      expect(result[1]).toBeUndefined(); // No import needed for inlined primitives
    });

    it('should inline non-nullable primitive wrapper types', () => {
      const swagger = createSwaggerSchema({
        CustomInteger: { type: 'integer' },
        CustomString: { type: 'string' },
        CustomBoolean: { type: 'boolean' },
        CustomNumber: { type: 'number' }
      });

      expect(parseRefToSymbol({ $ref: '#/components/schemas/CustomInteger' }, swagger)[0]).toBe('number');
      expect(parseRefToSymbol({ $ref: '#/components/schemas/CustomString' }, swagger)[0]).toBe('string');
      expect(parseRefToSymbol({ $ref: '#/components/schemas/CustomBoolean' }, swagger)[0]).toBe('boolean');
      expect(parseRefToSymbol({ $ref: '#/components/schemas/CustomNumber' }, swagger)[0]).toBe('number');
    });

    it('should not inline enums even if they have primitive type', () => {
      const swagger = createSwaggerSchema({
        Status: { type: 'string', enum: ['active', 'inactive'] }
      });
      const ref: IRef = { $ref: '#/components/schemas/Status' };

      const result = parseRefToSymbol(ref, swagger);
      
      expect(result[0]).toBe('TStatus');
      expect(result[1]).toEqual({
        type: 'enum',
        importSymbol: 'TStatus',
        fileName: 'status'
      });
    });

    it('should not inline objects with properties', () => {
      const swagger = createSwaggerSchema({
        UserDTO: { type: 'object', properties: { id: { type: 'integer' } } }
      });
      const ref: IRef = { $ref: '#/components/schemas/UserDTO' };

      const result = parseRefToSymbol(ref, swagger);

      expect(result[0]).toBe('IUserDTO');
      expect(result[1]?.type).toBe('interface');
    });

    it('should not inline schemas with composition even if they have a primitive type', () => {
      // A schema that has both 'type' and 'allOf' should not be treated as primitive wrapper
      const swagger = createSwaggerSchema({
        ComposedString: { 
          type: 'string', 
          allOf: [{ $ref: '#/components/schemas/BaseType' }] 
        },
        ComposedWithOneOf: {
          type: 'integer',
          oneOf: [{ type: 'integer' }, { type: 'string' }]
        },
        BaseType: { type: 'object', properties: {} }
      });

      // Should NOT be inlined as primitive, should be treated as interface
      const result1 = parseRefToSymbol({ $ref: '#/components/schemas/ComposedString' }, swagger);
      expect(result1[0]).toBe('IComposedString');
      expect(result1[1]?.type).toBe('interface');

      const result2 = parseRefToSymbol({ $ref: '#/components/schemas/ComposedWithOneOf' }, swagger);
      expect(result2[0]).toBe('IComposedWithOneOf');
      expect(result2[1]?.type).toBe('interface');
    });

    it('should add | null for nullable object schemas', () => {
      const swagger = createSwaggerSchema({
        NullableUser: { type: 'object', nullable: true, properties: { id: { type: 'integer' } } }
      });
      const ref: IRef = { $ref: '#/components/schemas/NullableUser' };

      const result = parseRefToSymbol(ref, swagger);

      expect(result[0]).toBe('INullableUser | null');
      expect(result[1]).toEqual({
        type: 'interface',
        importSymbol: 'INullableUser',
        fileName: 'nullable-user'
      });
    });

    it('should add | null for nullable enum schemas', () => {
      const swagger = createSwaggerSchema({
        NullableStatus: { type: 'string', nullable: true, enum: ['active', 'inactive'] }
      });
      const ref: IRef = { $ref: '#/components/schemas/NullableStatus' };

      const result = parseRefToSymbol(ref, swagger);

      expect(result[0]).toBe('TNullableStatus | null');
      expect(result[1]).toEqual({
        type: 'enum',
        importSymbol: 'TNullableStatus',
        fileName: 'nullable-status'
      });
    });
  });

  describe('isNullable', () => {
    it('should return true for inline schema with nullable: true', () => {
      const swagger = createSwaggerSchema();

      expect(isNullable({ type: 'string', nullable: true }, swagger)).toBe(true);
      expect(isNullable({ type: 'object', nullable: true, properties: {} }, swagger)).toBe(true);
    });

    it('should return false for inline schema without nullable', () => {
      const swagger = createSwaggerSchema();

      expect(isNullable({ type: 'string' }, swagger)).toBe(false);
      expect(isNullable({ type: 'object', properties: {} }, swagger)).toBe(false);
    });

    it('should return true for $ref pointing to nullable schema', () => {
      const swagger = createSwaggerSchema({
        NullableUser: { type: 'object', nullable: true, properties: {} }
      });

      expect(isNullable({ $ref: '#/components/schemas/NullableUser' }, swagger)).toBe(true);
    });

    it('should return false for $ref pointing to non-nullable schema', () => {
      const swagger = createSwaggerSchema({
        User: { type: 'object', properties: {} }
      });

      expect(isNullable({ $ref: '#/components/schemas/User' }, swagger)).toBe(false);
    });

    it('should return false for $ref pointing to unknown schema', () => {
      const swagger = createSwaggerSchema({});

      expect(isNullable({ $ref: '#/components/schemas/Unknown' }, swagger)).toBe(false);
    });

    it('should return true for inline schema with default: null', () => {
      const swagger = createSwaggerSchema();

      expect(isNullable({ type: 'string', default: null } as any, swagger)).toBe(true);
      expect(isNullable({ type: 'integer', format: 'int32', default: null } as any, swagger)).toBe(true);
    });

    it('should return true for $ref pointing to schema with default: null', () => {
      const swagger = createSwaggerSchema({
        DefaultNullUser: { type: 'object', default: null, properties: {} }
      });

      expect(isNullable({ $ref: '#/components/schemas/DefaultNullUser' }, swagger)).toBe(true);
    });

    it('should return false for schema with non-null default', () => {
      const swagger = createSwaggerSchema();

      expect(isNullable({ type: 'string', default: '' } as any, swagger)).toBe(false);
      expect(isNullable({ type: 'integer', format: 'int32', default: 0 } as any, swagger)).toBe(false);
    });
  });
});
