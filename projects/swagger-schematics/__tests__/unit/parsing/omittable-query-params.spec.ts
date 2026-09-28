import { transformSwaggerSchema } from '@lib/api/helpers/api.helper';
import {
  createGetOperation,
  createQueryParam,
  createSwaggerSchema,
} from '@helpers/factories';

/**
 * An unset query parameter must never reach the HTTP layer.
 *
 * Angular's HttpParams stringifies `undefined`, so a parameter the caller left out arrives in the
 * URL as `?flag=undefined`. Servers reject that during model binding, which surfaces as a server
 * error for what is really a serialisation bug in generated code.
 *
 * The guard used to key on nullability alone. Optional parameters are the common case and are
 * usually NOT nullable — `required: false` with schema `{"type":"boolean"}` — so they slipped past.
 *
 * Angular output adds each omittable param only when it has a value (a conditional spread), which
 * drops exactly what lodash `omitBy(isNil)` did while keeping a type HttpClient accepts under `strict`.
 */
const schemaWith = (...params: ReturnType<typeof createQueryParam>[]) =>
  createSwaggerSchema({
    paths: {
      '/api/thing/{id}': createGetOperation({
        tags: ['Thing'],
        summary: 'Gets a thing',
        parameters: params,
      }),
    },
    schemas: {},
  });

const firstItem = (schema: ReturnType<typeof schemaWith>) =>
  transformSwaggerSchema(schema)['thing'].apiList[0];

describe('omittable query params', () => {
  it('treats an OPTIONAL non-nullable param as omittable', () => {
    // The regression: required=false, schema {"type":"boolean"} — optional but not nullable.
    const item = firstItem(schemaWith(createQueryParam('excludeInactive', 'boolean')));

    expect(item.hasOmittableQueryParams).toBe(true);
    expect(item.queryParamsFormatted).toBe('params: { ...(excludeInactive != null ? { excludeInactive } : {}) }');
  });

  it('does not strip when every param is required and non-nullable', () => {
    const item = firstItem(
      schemaWith(createQueryParam('mandatory', 'string', { required: true })),
    );

    expect(item.hasOmittableQueryParams).toBe(false);
    expect(item.queryParamsFormatted).toBe('params: { mandatory }');
  });

  it('still strips when a required param is nullable', () => {
    // Pre-existing behaviour must survive: nullability alone is still sufficient.
    const item = firstItem(
      schemaWith(
        createQueryParam('search', 'string', {
          required: true,
          schema: { type: ['string', 'null'] } as never,
        }),
      ),
    );

    expect(item.hasOmittableQueryParams).toBe(true);
    expect(item.queryParamsFormatted).toBe('params: { ...(search != null ? { search } : {}) }');
  });

  it('strips when only one of several params is omittable', () => {
    const item = firstItem(
      schemaWith(
        createQueryParam('mandatory', 'string', { required: true }),
        createQueryParam('excludeInactive', 'boolean'),
      ),
    );

    expect(item.hasOmittableQueryParams).toBe(true);
    // Only the omittable param is conditional; the required one is always sent
    expect(item.queryParamsFormatted).toBe('params: { mandatory, ...(excludeInactive != null ? { excludeInactive } : {}) }');
  });

  describe('at runtime, the generated params drop exactly what omitBy(isNil) dropped', () => {
    // Evaluates the generated `params: { ... }` object literal with real values, so the check is
    // on what gets sent, not on how the code is spelled. HttpParams stringifies whatever is left,
    // so a key that survives with undefined/null would reach the URL as `?key=undefined` / `?key=null`.
    const evaluateParams = (formatted: string, values: Record<string, unknown>): Record<string, unknown> => {
      const names = Object.keys(values);
      const objectLiteral = formatted.replace(/^params: /, '');
      return new Function(...names, `return (${objectLiteral});`)(...names.map(name => values[name]));
    };

    const item = firstItem(
      schemaWith(
        createQueryParam('status', 'string', { required: true }),
        createQueryParam('page', 'integer'),
        createQueryParam('flag', 'boolean'),
        createQueryParam('search', 'string', { required: true, schema: { type: ['string', 'null'] } as never }),
      ),
    );

    it.each([
      ['undefined', undefined],
      ['null', null],
    ])('leaves out optional and nullable params that are %s', (_label, value) => {
      const params = evaluateParams(item.queryParamsFormatted, { status: 'open', page: value, flag: value, search: value });

      expect(params).toEqual({ status: 'open' });
      expect(Object.values(params)).not.toContain(undefined);
      expect(Object.values(params)).not.toContain(null);
    });

    it("keeps falsy values that are real values: 0, false and ''", () => {
      const params = evaluateParams(item.queryParamsFormatted, { status: 'open', page: 0, flag: false, search: '' });

      expect(params).toEqual({ status: 'open', page: 0, flag: false, search: '' });
    });

    it('keeps arrays, including empty ones', () => {
      const arrayItem = firstItem(
        schemaWith(createQueryParam('ids', 'string', { schema: { type: 'array', items: { type: 'integer' } } as never })),
      );

      expect(evaluateParams(arrayItem.queryParamsFormatted, { ids: [1, 2] })).toEqual({ ids: [1, 2] });
      expect(evaluateParams(arrayItem.queryParamsFormatted, { ids: [] })).toEqual({ ids: [] });
    });

    it('matches omitBy(isNil) for every combination of set and unset values', () => {
      const isNil = (value: unknown) => value === null || value === undefined;
      const omitByIsNil = (object: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(object).filter(([, value]) => !isNil(value)));
      const samples = [undefined, null, 0, 1, false, true, '', 'x'];

      samples.forEach(page => samples.forEach(flag => {
        const values = { status: 'open', page, flag, search: 'q' };
        expect(evaluateParams(item.queryParamsFormatted, values)).toEqual(omitByIsNil(values));
      }));
    });
  });
});
