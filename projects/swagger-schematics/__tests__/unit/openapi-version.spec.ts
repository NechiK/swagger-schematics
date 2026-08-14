import { detectOpenApiVersion } from '../../helpers/openapi-version.helper';

describe('detectOpenApiVersion', () => {
  it('should detect OpenAPI 3.0.x as supported', () => {
    expect(detectOpenApiVersion({ openapi: '3.0.0' })).toEqual({ raw: '3.0.0', family: '3.0', supported: true });
    expect(detectOpenApiVersion({ openapi: '3.0.1' })).toEqual({ raw: '3.0.1', family: '3.0', supported: true });
    expect(detectOpenApiVersion({ openapi: '3.0.4' })).toEqual({ raw: '3.0.4', family: '3.0', supported: true });
    expect(detectOpenApiVersion({ openapi: '3.0' })).toEqual({ raw: '3.0', family: '3.0', supported: true });
  });

  it('should detect OpenAPI 3.1.x as supported', () => {
    expect(detectOpenApiVersion({ openapi: '3.1.0' })).toEqual({ raw: '3.1.0', family: '3.1', supported: true });
    expect(detectOpenApiVersion({ openapi: '3.1.1' })).toEqual({ raw: '3.1.1', family: '3.1', supported: true });
  });

  it('should treat newer 3.x versions as 3.1 with a warning', () => {
    const info = detectOpenApiVersion({ openapi: '3.2.0' });
    expect(info.family).toBe('3.1');
    expect(info.supported).toBe(false);
    expect(info.warning).toContain('3.2.0');
    expect(info.warning).toContain('treating the document as OpenAPI 3.1');
  });

  it('should warn for Swagger 2.0 documents', () => {
    const info = detectOpenApiVersion({ swagger: '2.0' });
    expect(info.family).toBe('2.0');
    expect(info.supported).toBe(false);
    expect(info.warning).toContain('Swagger 2.0 is not supported');
  });

  it('should warn for unrecognized versions', () => {
    const info = detectOpenApiVersion({ openapi: '4.0.0' });
    expect(info.family).toBe('unknown');
    expect(info.supported).toBe(false);
    expect(info.warning).toContain("'4.0.0'");
  });

  it('should warn when no version field is present', () => {
    const info = detectOpenApiVersion({});
    expect(info.family).toBe('unknown');
    expect(info.supported).toBe(false);
    expect(info.warning).toContain('Could not detect');
  });

  it('should prefer the openapi field over swagger', () => {
    expect(detectOpenApiVersion({ openapi: '3.0.1', swagger: '2.0' }).family).toBe('3.0');
  });
});
