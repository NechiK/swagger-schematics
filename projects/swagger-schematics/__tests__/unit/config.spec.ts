jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

import * as fs from 'fs';
import { getOpenapiSchematicsConfig } from '../../helpers/config';
import { SwaggerApiSchema } from '../../api/schema';

describe('getOpenapiSchematicsConfig', () => {
  const mockConfigFile = (content: Record<string, unknown> | null) => {
    (fs.existsSync as jest.Mock).mockReturnValue(content !== null);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(content ?? {}));
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lets a config-file boolean win when the option is not passed', () => {
    mockConfigFile({ swaggerSchemaUrl: 'https://x', legacyOptionalProperties: true });

    const config = getOpenapiSchematicsConfig({} as SwaggerApiSchema);
    expect(config.legacyOptionalProperties).toBe(true);
  });

  it('lets an explicitly passed option override the config file', () => {
    mockConfigFile({ swaggerSchemaUrl: 'https://x', legacyOptionalProperties: true });

    const config = getOpenapiSchematicsConfig({ legacyOptionalProperties: false } as SwaggerApiSchema);
    expect(config.legacyOptionalProperties).toBe(false);
  });

  it('falls back to defaults when neither source sets a boolean', () => {
    mockConfigFile({ swaggerSchemaUrl: 'https://x' });

    const config = getOpenapiSchematicsConfig({} as SwaggerApiSchema);
    expect(config.legacyOptionalProperties).toBe(false);
    expect(config.eslintFix).toBe(false);
    expect(config.scopeEndpointsWithTags).toBe(false);
  });
});

describe('schematic schemas', () => {
  // Guard: a `default` in schema.json is injected by the workflow's schema
  // validation as if the user passed the option explicitly, which then
  // overrides config-file values in the merge. Defaults belong to
  // DEFAULT_CONFIG in helpers/config.ts, which runs AFTER the config file
  // is read.
  it.each([
    ['types/schema.json', require('../../types/schema.json')],
    ['api/schema.json', require('../../api/schema.json')]
  ])('%s declares no defaults for boolean options', (_name, schema: { properties: Record<string, { type?: string; default?: unknown }> }) => {
    for (const [key, definition] of Object.entries(schema.properties)) {
      if (definition.type === 'boolean') {
        expect({ key, hasDefault: 'default' in definition }).toEqual({ key, hasDefault: false });
      }
    }
  });
});
