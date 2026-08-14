import { safePluck } from '../../types/utils/pluck';
import { getRefPropertyDefinition } from '../../types/utils/transform-type';
import { ISwaggerSchema } from '../../interfaces/version_3_1/swagger.interface';

describe('safePluck', () => {
  const state = { a: { b: { c: 42 } } };

  it('resolves a deep path', () => {
    expect(safePluck(state, ['a', 'b', 'c'])).toBe(42);
  });

  it('returns undefined when an intermediate segment is missing', () => {
    expect(safePluck(state as never, ['x', 'b', 'c'] as never)).toBeUndefined();
  });

  it('returns undefined when the final segment is missing', () => {
    expect(safePluck(state as never, ['a', 'b', 'missing'] as never)).toBeUndefined();
  });
});

describe('getRefPropertyDefinition with dangling refs', () => {
  const swagger = {
    openapi: '3.0.1',
    components: {
      schemas: {
        Existing: { type: 'string' }
      }
    }
  } as unknown as ISwaggerSchema;

  it('resolves an existing component schema', () => {
    const { refPropertySchema, refPropertyKey } = getRefPropertyDefinition('#/components/schemas/Existing', swagger);
    expect(refPropertyKey).toBe('Existing');
    expect(refPropertySchema).toEqual({ type: 'string' });
  });

  it('does not crash on a Swagger 2.0-style definitions ref', () => {
    const { refPropertySchema } = getRefPropertyDefinition('#/definitions/Foo', swagger);
    expect(refPropertySchema).toBeUndefined();
  });

  it('does not crash on a ref into an absent component section', () => {
    const { refPropertySchema } = getRefPropertyDefinition('#/components/requestBodies/Missing', swagger);
    expect(refPropertySchema).toBeUndefined();
  });

  it('returns undefined for a missing schema name', () => {
    const { refPropertySchema } = getRefPropertyDefinition('#/components/schemas/Missing', swagger);
    expect(refPropertySchema).toBeUndefined();
  });
});
