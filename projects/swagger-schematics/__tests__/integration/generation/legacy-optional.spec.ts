import '@helpers/matchers';
import {
  resetFetchMocks,
  runFullSchematics,
  ANGULAR_SCHEMATIC_OPTIONS
} from '@helpers/setup';

const SCHEMA: any = {
  openapi: '3.0.4',
  info: { title: 'T', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      Demo: {
        type: 'object',
        // NOTE: no `required` array - the case this option targets
        properties: {
          name: { type: 'string' },
          nickname: { type: 'string', nullable: true }
        }
      }
    }
  }
};

const readDemo = async (legacyOptionalProperties?: boolean): Promise<string> => {
  resetFetchMocks();
  const tree = await runFullSchematics(SCHEMA, { ...ANGULAR_SCHEMATIC_OPTIONS, legacyOptionalProperties });
  return tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/demo.interface.ts`);
};

describe('legacyOptionalProperties option', () => {
  it('default (spec): a document without `required` yields all-optional properties', async () => {
    const content = await readDemo(false);
    expect(content).toContain('name?: string;');
    expect(content).toContain('nickname?: string | null;');
  });

  it('legacy: optionality follows nullability - non-nullable become required', async () => {
    const content = await readDemo(true);
    expect(content).toContain('name: string;');           // non-nullable -> required
    expect(content).toContain('nickname?: string | null;'); // nullable -> optional, keeps | null
    expect(content).not.toContain('name?: string;');
  });
});
