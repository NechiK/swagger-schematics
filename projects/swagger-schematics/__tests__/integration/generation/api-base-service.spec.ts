import * as ts from 'typescript';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  setupSwaggerMock,
  resetFetchMocks,
  runApiSchematic,
  createTestTree,
  ANGULAR_SCHEMATIC_OPTIONS
} from '@helpers/setup';
import { SWAGGER_SCHEMA } from '@fixtures/swagger/full-schema.fixture';

const API_BASE_URL_TOKEN = Symbol('API_BASE_URL');

/**
 * Compiles the generated _api-base.service.ts to CommonJS and evaluates it with
 * stubbed Angular modules so the real getUrl implementation can be executed.
 */
function loadApiBaseServiceClass(source: string, apiBaseUrl: string): any {
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const moduleStubs: Record<string, any> = {
    '@angular/common/http': { HttpClient: class HttpClient {} },
    '@angular/core': {
      inject: (token: any) => (token === API_BASE_URL_TOKEN ? apiBaseUrl : {})
    },
    './_api-base-url.token': { API_BASE_URL: API_BASE_URL_TOKEN }
  };

  const exports: any = {};
  new Function('require', 'exports', js)((id: string) => moduleStubs[id] ?? {}, exports);
  return exports.ApiBaseService;
}

describe('ApiBaseService getUrl', () => {
  let generatedSource: string;

  const createService = (apiBaseUrl: string, endpoint: string = 'Claim') => {
    const ApiBaseService = loadApiBaseServiceClass(generatedSource, apiBaseUrl);
    class TestApiService extends ApiBaseService {
      readonly endpoint = endpoint;
    }
    return new TestApiService() as unknown as { getUrl(url?: string): string };
  };

  beforeAll(async () => {
    setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);
    const tree: UnitTestTree = await runApiSchematic(ANGULAR_SCHEMATIC_OPTIONS, createTestTree());
    generatedSource = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/_api-base.service.ts`);
  });

  afterAll(() => {
    resetFetchMocks();
  });

  it('should generate compilable TypeScript without diagnostics', () => {
    const output = ts.transpileModule(generatedSource, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      reportDiagnostics: true
    });
    expect(output.diagnostics).toEqual([]);
  });

  describe('without apiBaseUrl (relative URLs)', () => {
    it('should build a relative URL with no url argument', () => {
      expect(createService('').getUrl()).toBe('/api/Claim');
    });

    it('should build a relative URL with a single segment', () => {
      expect(createService('').getUrl('detail')).toBe('/api/Claim/detail');
    });

    it('should build a relative URL with nested segments', () => {
      expect(createService('').getUrl('5/notes')).toBe('/api/Claim/5/notes');
    });

    it('should normalize repeated slashes in the url argument', () => {
      expect(createService('').getUrl('//5//notes')).toBe('/api/Claim/5/notes');
    });
  });

  describe('with apiBaseUrl', () => {
    it('should prepend a plain host base URL', () => {
      expect(createService('https://example.com').getUrl('5')).toBe('https://example.com/api/Claim/5');
    });

    it('should handle a base URL with a trailing slash', () => {
      expect(createService('https://example.com/').getUrl('5')).toBe('https://example.com/api/Claim/5');
    });

    it('should not duplicate the api segment when the base URL ends with /api', () => {
      expect(createService('https://example.com/api').getUrl('5')).toBe('https://example.com/api/Claim/5');
    });

    it('should not duplicate the api segment when the base URL ends with /api/', () => {
      expect(createService('https://example.com/api/').getUrl('5')).toBe('https://example.com/api/Claim/5');
    });

    it('should strip a trailing /api segment case-insensitively', () => {
      expect(createService('https://example.com/API').getUrl('5')).toBe('https://example.com/api/Claim/5');
    });

    it('should preserve path segments in the base URL', () => {
      expect(createService('https://example.com/v1/internal').getUrl('5')).toBe(
        'https://example.com/v1/internal/api/Claim/5'
      );
    });

    it('should preserve path segments when the base URL also ends with /api', () => {
      expect(createService('https://example.com/v1/api').getUrl('5')).toBe('https://example.com/v1/api/Claim/5');
    });

    it('should build the base URL variant with no url argument', () => {
      expect(createService('https://example.com').getUrl()).toBe('https://example.com/api/Claim');
    });
  });

  describe('endpoint variants', () => {
    it('should use the subclass endpoint in the URL', () => {
      expect(createService('', 'ServiceAction').getUrl('7')).toBe('/api/ServiceAction/7');
    });

    it('should skip an empty endpoint without producing double slashes', () => {
      expect(createService('', '').getUrl('7')).toBe('/api/7');
    });
  });
});
