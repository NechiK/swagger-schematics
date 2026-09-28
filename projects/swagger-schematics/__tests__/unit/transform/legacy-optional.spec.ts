import { transformProperties } from '@lib/types/helpers/template.helper';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';

describe('transformProperties - optionality', () => {
  const swagger = { openapi: '3.0.4', info: { title: 'T', version: '1' }, paths: {}, components: { schemas: {} } } as ISwaggerSchema;

  const properties: any = {
    reqNonNull: { type: 'string' },
    reqNullable: { type: 'string', nullable: true },
    optNonNull: { type: 'string' },
    optNullable: { type: 'string', nullable: true }
  };
  const required = ['reqNonNull', 'reqNullable'];

  const asMap = (content: Array<[string, string]>) =>
    Object.fromEntries(content.map(([name, type]) => [name.replace('?', ''), `${name}: ${type}`]));

  it('default: optionality follows the required array; nullability adds | null', () => {
    const { propertiesContent } = transformProperties(properties, swagger, undefined, required);
    const map = asMap(propertiesContent);

    expect(map.reqNonNull).toBe('reqNonNull: string');
    expect(map.reqNullable).toBe('reqNullable: string | null'); // required + nullable -> no ?, keeps | null
    expect(map.optNonNull).toBe('optNonNull?: string');
    expect(map.optNullable).toBe('optNullable?: string | null');
  });

  it('legacyOptionalProperties: optionality follows nullability, ignoring required', () => {
    const { propertiesContent } = transformProperties(properties, swagger, { legacyOptionalProperties: true }, required);
    const map = asMap(propertiesContent);

    // non-nullable -> required (no ?), regardless of the required array
    expect(map.reqNonNull).toBe('reqNonNull: string');
    expect(map.optNonNull).toBe('optNonNull: string');
    // nullable -> optional (?), and | null is still kept
    expect(map.reqNullable).toBe('reqNullable?: string | null');
    expect(map.optNullable).toBe('optNullable?: string | null');
  });

  it('legacyOptionalProperties: treats the OpenAPI 3.1 oneOf/anyOf "null" member as nullable', () => {
    const swagger31 = {
      openapi: '3.1.0', info: { title: 'T', version: '1' }, paths: {},
      components: { schemas: { Dto: { type: 'object', properties: { a: { type: 'string' } } } } }
    } as unknown as ISwaggerSchema;
    const props: any = {
      refOrNull: { oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/Dto' }] },
      stringOrNull: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      union: { oneOf: [{ type: 'string' }, { type: 'integer' }] }
    };
    const { propertiesContent } = transformProperties(props, swagger31, { legacyOptionalProperties: true }, []);
    const map = asMap(propertiesContent);

    expect(map.refOrNull).toBe('refOrNull?: IDto | null');
    expect(map.stringOrNull).toBe('stringOrNull?: string | null');
    expect(map.union).toBe('union: string | number');
  });
});
