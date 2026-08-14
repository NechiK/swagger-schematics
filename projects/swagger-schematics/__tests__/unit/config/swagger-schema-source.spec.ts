import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { fetchSwaggerSchema } from '@lib/helpers/swagger-schema.helper';

describe('fetchSwaggerSchema source handling', () => {
  const SCHEMA = { openapi: '3.0.1', info: { title: 'T', version: 'v1' }, paths: {}, components: { schemas: {} } };
  let tmpDir: string;
  let schemaFile: string;
  let consoleInfoSpy: jest.SpyInstance;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swagger-schematics-'));
    schemaFile = path.join(tmpDir, 'schema.json');
    fs.writeFileSync(schemaFile, JSON.stringify(SCHEMA));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
  });

  it('should read a schema from an absolute file path', async () => {
    await expect(fetchSwaggerSchema(schemaFile)).resolves.toEqual(SCHEMA);
  });

  it('should read a schema from a path relative to the working directory', async () => {
    const relativePath = path.relative(process.cwd(), schemaFile);
    await expect(fetchSwaggerSchema(relativePath)).resolves.toEqual(SCHEMA);
  });

  it('should read a schema from a file:// URL', async () => {
    await expect(fetchSwaggerSchema(pathToFileURL(schemaFile).href)).resolves.toEqual(SCHEMA);
  });

  it('should fail with the resolved path and guidance when the file is missing', async () => {
    const missing = './does-not-exist/openapi-swagger.json';
    await expect(fetchSwaggerSchema(missing)).rejects.toThrow(
      `Swagger schema file not found: '${path.resolve(process.cwd(), missing)}'`
    );
    await expect(fetchSwaggerSchema(missing)).rejects.toThrow('Provide an http(s) URL or a path to an existing JSON file');
  });

  it('should fail with a clear message for invalid JSON files', async () => {
    const brokenFile = path.join(tmpDir, 'broken.json');
    fs.writeFileSync(brokenFile, '{ not json');

    await expect(fetchSwaggerSchema(brokenFile)).rejects.toThrow(
      `Failed to parse swagger schema file '${brokenFile}' as JSON`
    );
  });

  it('should still fetch http(s) URLs over the network', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(SCHEMA) });
    globalThis.fetch = fetchMock as any;

    try {
      await expect(fetchSwaggerSchema('https://example.com/swagger.json')).resolves.toEqual(SCHEMA);
      expect(fetchMock).toHaveBeenCalledWith('https://example.com/swagger.json');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
