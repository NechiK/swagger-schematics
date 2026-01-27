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
  });
});
