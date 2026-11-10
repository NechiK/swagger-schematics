import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveProjectPath, resolveSnapshotSource, serializeSchemaSnapshot } from '@lib/helpers/api-changes/schema-snapshot';
import { ISwaggerSchema } from '@lib/interfaces/version_3_1/swagger.interface';

describe('schema snapshot', () => {
  it('serializes the schema in its own key order, which the generated code depends on', () => {
    // The first `content` media type decides the generated body type, so it must read back first
    const schema = {
      paths: {},
      openapi: '3.0.1',
      info: { version: '1', title: 'T' },
      tags: [{ name: 'b' }, { name: 'a' }],
      components: { requestBodies: { Patch: { content: { 'application/merge-patch+json': {}, 'application/json': {} } } } }
    };

    const serialized = serializeSchemaSnapshot(schema as unknown as ISwaggerSchema);
    const reparsed = JSON.parse(serialized);

    expect(Object.keys(reparsed)).toEqual(['paths', 'openapi', 'info', 'tags', 'components']);
    expect(Object.keys(reparsed.components.requestBodies.Patch.content)).toEqual(['application/merge-patch+json', 'application/json']);
    expect(reparsed).toEqual(schema);
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

    expect(Object.keys(reparsed.components.schemas)).toEqual(['__proto__', 'Order']);
    expect(reparsed.components.schemas.__proto__).toEqual({ type: 'string' });
  });

  describe('resolveSnapshotSource (--from-snapshot)', () => {
    let projectDir: string;
    let cwd: string;

    beforeEach(() => {
      cwd = process.cwd();
      projectDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'swagger-schematics-snapshot-')));
      process.chdir(projectDir);
    });

    afterEach(() => {
      process.chdir(cwd);
      fs.rmSync(projectDir, { recursive: true, force: true });
    });

    it('returns the absolute path of the snapshot, a leading slash meaning the project root', () => {
      fs.mkdirSync(path.join(projectDir, 'src'));
      fs.writeFileSync(path.join(projectDir, 'src/openapi.snapshot.json'), '{}');

      expect(resolveSnapshotSource({ snapshotSetting: '/src/openapi.snapshot.json' }))
        .toBe(path.join(projectDir, 'src/openapi.snapshot.json'));
      expect(resolveSnapshotSource({ snapshotSetting: 'src/openapi.snapshot.json' }))
        .toBe(path.join(projectDir, 'src/openapi.snapshot.json'));
    });

    it('fails when schemaSnapshotPath is not set', () => {
      expect(() => resolveSnapshotSource({})).toThrow('--from-snapshot needs schemaSnapshotPath');
      expect(() => resolveSnapshotSource({ snapshotSetting: true })).toThrow('--from-snapshot needs schemaSnapshotPath');
    });

    it('fails when the snapshot file does not exist, naming the setting and the resolved path', () => {
      expect(() => resolveSnapshotSource({ snapshotSetting: '/src/openapi.snapshot.json' }))
        .toThrow(`--from-snapshot: no schema snapshot at /src/openapi.snapshot.json ('${path.join(projectDir, 'src/openapi.snapshot.json')}')`);
    });

    it('fails when a schema source or a change report is asked for as well', () => {
      fs.writeFileSync(path.join(projectDir, 'openapi.snapshot.json'), '{}');

      expect(() => resolveSnapshotSource({ snapshotSetting: 'openapi.snapshot.json', explicitSource: './schema.json' }))
        .toThrow("can't be combined with the schema source './schema.json'");
      expect(() => resolveSnapshotSource({ snapshotSetting: 'openapi.snapshot.json', reportPath: 'api-changes.md' }))
        .toThrow("can't be combined with --change-report");
    });
  });
});
