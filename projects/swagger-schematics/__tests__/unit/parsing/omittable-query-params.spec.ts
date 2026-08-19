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
    expect(item.queryParamsFormatted).toContain('omitBy');
    expect(item.queryParamsFormatted).toContain('isNil');
  });

  it('does not strip when every param is required and non-nullable', () => {
    const item = firstItem(
      schemaWith(createQueryParam('mandatory', 'string', { required: true })),
    );

    expect(item.hasOmittableQueryParams).toBe(false);
    expect(item.queryParamsFormatted).not.toContain('omitBy');
    expect(item.queryParamsFormatted).toContain('params:');
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
    expect(item.queryParamsFormatted).toContain('omitBy');
  });

  it('strips when only one of several params is omittable', () => {
    const item = firstItem(
      schemaWith(
        createQueryParam('mandatory', 'string', { required: true }),
        createQueryParam('excludeInactive', 'boolean'),
      ),
    );

    expect(item.hasOmittableQueryParams).toBe(true);
    expect(item.queryParamsFormatted).toContain('omitBy');
  });
});
