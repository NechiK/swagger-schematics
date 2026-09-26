import * as path from 'path';
import { resolveProjectPath, serializeSchemaSnapshot } from '@lib/helpers/api-changes/schema-snapshot';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';

describe('schema snapshot', () => {
  it('serializes with sorted keys, keeping array order, so key order in the source does not matter', () => {
    const a = { paths: {}, openapi: '3.0.1', info: { version: '1', title: 'T' }, tags: [{ name: 'b' }, { name: 'a' }] };
    const b = { info: { title: 'T', version: '1' }, tags: [{ name: 'b' }, { name: 'a' }], openapi: '3.0.1', paths: {} };

    const serialized = serializeSchemaSnapshot(a as unknown as ISwaggerSchema);

    expect(serialized).toBe(serializeSchemaSnapshot(b as unknown as ISwaggerSchema));
    expect(Object.keys(JSON.parse(serialized))).toEqual(['info', 'openapi', 'paths', 'tags']);
    expect(JSON.parse(serialized).tags).toEqual([{ name: 'b' }, { name: 'a' }]);
    expect(serialized.endsWith('}\n')).toBe(true);
  });

  it('resolves paths from the project root, with or without a leading slash', () => {
    const expected = path.join(process.cwd(), 'src/api/openapi.snapshot.json');
    expect(resolveProjectPath('/src/api/openapi.snapshot.json')).toBe(expected);
    expect(resolveProjectPath('src/api/openapi.snapshot.json')).toBe(expected);
  });

  it('keeps a key named __proto__ (legal in JSON) instead of dropping it', () => {
    const schema = JSON.parse('{"components":{"schemas":{"__proto__":{"type":"string"},"Order":{"type":"object"}}}}');

    const reparsed = JSON.parse(serializeSchemaSnapshot(schema));

    expect(Object.keys(reparsed.components.schemas)).toEqual(['Order', '__proto__']);
    expect(reparsed.components.schemas.__proto__).toEqual({ type: 'string' });
  });
});
