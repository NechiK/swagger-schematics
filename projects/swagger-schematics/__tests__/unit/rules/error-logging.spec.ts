import { describeErrorChain, formatSchematicError, logCliError, logSchematicError, wrapRuleWithErrorLogging } from '@lib/helpers/error-logging.helper';
import { fetchSwaggerSchema } from '@lib/helpers/swagger-schema.helper';

describe('error logging', () => {
  const chainedError = () => {
    const root = new Error('getaddrinfo ENOTFOUND swagger.internal.host');
    const fetchError = new TypeError('fetch failed');
    (fetchError as TypeError & { cause?: unknown }).cause = root;
    return fetchError;
  };

  describe('describeErrorChain', () => {
    it('should join messages of the whole cause chain', () => {
      expect(describeErrorChain(chainedError()))
        .toBe('fetch failed -> getaddrinfo ENOTFOUND swagger.internal.host');
    });

    it('should handle plain errors and non-error values', () => {
      expect(describeErrorChain(new Error('boom'))).toBe('boom');
      expect(describeErrorChain('just a string')).toBe('just a string');
    });

    it('should stop on circular cause chains', () => {
      const error = new Error('loop');
      (error as Error & { cause?: unknown }).cause = error;
      expect(describeErrorChain(error)).toBe(['loop', 'loop', 'loop', 'loop', 'loop'].join(' -> '));
    });
  });

  describe('formatSchematicError', () => {
    it('should include message and stack for every cause', () => {
      const report = formatSchematicError(chainedError());
      expect(report.startsWith('TypeError: fetch failed\n    at ')).toBe(true);
      expect(report).toContain('Caused by: Error: getaddrinfo ENOTFOUND swagger.internal.host');
    });

    it('should name the error type once', () => {
      expect(formatSchematicError(new Error('boom'))).not.toContain('Error: Error:');
      expect(formatSchematicError(new Error('boom')).startsWith('Error: boom\n')).toBe(true);
      expect(formatSchematicError('just a string')).toBe('Error: just a string');
    });
  });

  describe('logSchematicError', () => {
    it('should print the full report to console.error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logSchematicError('types', chainedError());

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("'types' schematic failed"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ENOTFOUND'));
      consoleSpy.mockRestore();
    });
  });

  describe('logCliError', () => {
    it('should print a CLI failure', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logCliError(new Error("Framework 'react' is not supported."));

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[swagger-schematics\] failed:\nError: Framework 'react' is not supported\./));
      consoleSpy.mockRestore();
    });

    it('should not print a schematic failure a second time', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = chainedError();

      logSchematicError('api', error);
      logCliError(error);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });

  describe('wrapRuleWithErrorLogging', () => {
    it('should log and rethrow rule failures', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failingRule = async () => {
        throw chainedError();
      };

      const wrapped = wrapRuleWithErrorLogging('api', failingRule as any);

      await expect((wrapped as any)({}, {})).rejects.toThrow('fetch failed');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("'api' schematic failed"));
      consoleSpy.mockRestore();
    });

    it('should pass through successful rules untouched', async () => {
      const wrapped = wrapRuleWithErrorLogging('api', (async () => 'result') as any);
      await expect((wrapped as any)({}, {})).resolves.toBe('result');
    });
  });

  describe('fetchSwaggerSchema error reporting', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should surface the network cause chain in the error message', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(chainedError()) as any;

      await expect(fetchSwaggerSchema('https://swagger.internal.host/swagger.json'))
        .rejects.toThrow("Failed to fetch swagger schema from 'https://swagger.internal.host/swagger.json': fetch failed -> getaddrinfo ENOTFOUND swagger.internal.host");
    });

    it('should report non-2xx responses with the URL and status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502, statusText: 'Bad Gateway' }) as any;

      await expect(fetchSwaggerSchema('https://host/swagger.json'))
        .rejects.toThrow("Failed to load swagger schema from 'https://host/swagger.json': 502 Bad Gateway");
    });

    it('should report JSON parse failures with the URL', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON'))
      }) as any;

      await expect(fetchSwaggerSchema('https://host/swagger.json'))
        .rejects.toThrow("Failed to parse swagger schema from 'https://host/swagger.json' as JSON: Unexpected token < in JSON");
    });
  });
});
