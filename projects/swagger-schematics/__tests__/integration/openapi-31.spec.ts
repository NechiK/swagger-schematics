import '../helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  resetFetchMocks,
  runFullSchematics,
  schematicRunner,
  ANGULAR_SCHEMATIC_OPTIONS
} from '../helpers/setup';
import { OPENAPI_31_SWAGGER_SCHEMA } from '../__fixtures__/swagger/openapi-31-schema.fixture';

describe('OpenAPI 3.1 support', () => {
  let tree: UnitTestTree;
  let warnings: string[];
  let subscription: { unsubscribe(): void };

  beforeAll(async () => {
    warnings = [];
    subscription = schematicRunner.logger.subscribe(entry => {
      if (entry.level === 'warn') {
        warnings.push(entry.message);
      }
    });
    resetFetchMocks();
    tree = await runFullSchematics(OPENAPI_31_SWAGGER_SCHEMA, ANGULAR_SCHEMATIC_OPTIONS);
  });

  afterAll(() => {
    subscription.unsubscribe();
    resetFetchMocks();
  });

  it('should generate without version warnings (3.1 is supported)', () => {
    expect(warnings.filter(message => message.includes('OpenAPI'))).toEqual([]);
  });

  describe('Interface generation with 3.1 schemas', () => {
    let interfaceContent: string;

    beforeAll(() => {
      interfaceContent = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/report-dto.interface.ts`);
    });

    it('should generate the interface snapshot', () => {
      expect(interfaceContent).toMatchSnapshot();
    });

    it('should honor the required array for optionality', () => {
      expect(interfaceContent).toContain('id: number;');
      expect(interfaceContent).toContain('reference: string | number;');
    });

    it('should type 3.1 nullable properties as optional with | null', () => {
      expect(interfaceContent).toContain('name?: string | null;');
    });

    it('should append | null for refs to nullable 3.1 enums', () => {
      expect(interfaceContent).toContain('status?: TReportStatus | null;');
    });

    it('should map contentMediaType binary to Blob but base64 content to string', () => {
      expect(interfaceContent).toContain('attachment?: Blob;');
      expect(interfaceContent).toContain('signature?: string;');
    });
  });

  describe('API generation with 3.1 binary responses', () => {
    let serviceContent: string;

    beforeAll(() => {
      serviceContent = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/report-api.service.ts`);
    });

    it('should generate the service snapshot', () => {
      expect(serviceContent).toMatchSnapshot();
    });

    it('should type schema-less octet-stream responses as Blob downloads', () => {
      expect(serviceContent).toContain('Observable<Blob>');
      expect(serviceContent).toContain("responseType: 'blob'");
    });

    it('should mark 3.1 nullable query params optional and nullable', () => {
      expect(serviceContent).toContain('{ filter }: { filter?: string | null }');
    });
  });
});
