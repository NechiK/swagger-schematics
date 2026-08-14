import { parseCliArgs, helpText } from '@lib/bin/cli-args';

describe('parseCliArgs', () => {
  it('should parse command, positional source, and options', () => {
    const args = parseCliArgs(['types', './schema.json', '--path=/src/app/core']);

    expect(args.command).toBe('types');
    expect(args.positionals).toEqual(['./schema.json']);
    expect(args.options).toEqual({ path: '/src/app/core' });
  });

  it('should recognize all commands', () => {
    expect(parseCliArgs(['types']).command).toBe('types');
    expect(parseCliArgs(['api']).command).toBe('api');
    expect(parseCliArgs(['all']).command).toBe('all');
  });

  it('should report unknown commands', () => {
    const args = parseCliArgs(['generate']);
    expect(args.command).toBeUndefined();
    expect(args.unknownCommand).toBe('generate');
  });

  it('should camelize kebab-case option names', () => {
    const args = parseCliArgs(['api', '--swagger-schema-url=./s.json', '--scope-endpoints-with-tags']);

    expect(args.options).toEqual({
      swaggerSchemaUrl: './s.json',
      scopeEndpointsWithTags: true
    });
  });

  it('should support --option value form', () => {
    const args = parseCliArgs(['types', '--path', '/src/app', '--framework', 'angular']);
    expect(args.options).toEqual({ path: '/src/app', framework: 'angular' });
  });

  it('should coerce true/false values to booleans', () => {
    const args = parseCliArgs(['api', '--eslint-fix=true', '--scope-endpoints-with-tags=false']);
    expect(args.options).toEqual({ eslintFix: true, scopeEndpointsWithTags: false });
  });

  it('should treat bare flags as true', () => {
    expect(parseCliArgs(['api', '--eslint-fix']).options).toEqual({ eslintFix: true });
  });

  it('should not let a bare boolean flag swallow the following positional', () => {
    const args = parseCliArgs(['types', '--eslint-fix', './schema.json']);

    expect(args.options).toEqual({ eslintFix: true });
    expect(args.positionals).toEqual(['./schema.json']);
  });

  it('should still accept an explicit true/false after a boolean flag', () => {
    expect(parseCliArgs(['api', '--eslint-fix', 'false']).options).toEqual({ eslintFix: false });
    expect(parseCliArgs(['api', '--legacy-optional-properties', 'true']).options).toEqual({ legacyOptionalProperties: true });
  });

  it('should keep consuming values for non-boolean options', () => {
    const args = parseCliArgs(['types', '--path', '/src/app', './schema.json']);

    expect(args.options).toEqual({ path: '/src/app' });
    expect(args.positionals).toEqual(['./schema.json']);
  });

  it('should extract dry-run, help, and version as CLI flags, not schematic options', () => {
    const args = parseCliArgs(['types', '--dry-run', '--help', '--version']);

    expect(args.dryRun).toBe(true);
    expect(args.help).toBe(true);
    expect(args.version).toBe(true);
    expect(args.options).toEqual({});
  });

  it('should handle no arguments', () => {
    const args = parseCliArgs([]);
    expect(args.command).toBeUndefined();
    expect(args.unknownCommand).toBeUndefined();
    expect(args.help).toBe(false);
  });

  it('should provide help text mentioning all commands', () => {
    const help = helpText();
    expect(help).toContain('types');
    expect(help).toContain('api');
    expect(help).toContain('all');
    expect(help).toContain('--dry-run');
  });
});
