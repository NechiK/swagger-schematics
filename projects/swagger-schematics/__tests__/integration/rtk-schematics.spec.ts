import '../helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  setupSwaggerMock,
  resetAxiosMocks,
  createTestTree,
  runTypesSchematic,
  runApiSchematic,
  SchematicOptions
} from '../helpers/setup';
import { SWAGGER_SCHEMA } from '../__fixtures__/swagger/full-schema.fixture';

describe('RTK Query Schematics Integration', () => {
  let tree: UnitTestTree;
  let files: string[];

  const RTK_SCHEMATIC_OPTIONS: SchematicOptions & {
    framework: string;
    rtkBaseApiPath: string;
    scopeEndpointsWithTags?: boolean;
  } = {
    swaggerSchemaUrl: 'https://api.example.com/swagger/v1/swagger.json',
    path: '/test-output',
    framework: 'react-rtk',
    rtkBaseApiPath: '@/store/api/baseApi'
  };

  beforeAll(async () => {
    setupSwaggerMock(RTK_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);

    let testTree = createTestTree();
    testTree = await runTypesSchematic(RTK_SCHEMATIC_OPTIONS, testTree);
    tree = await runApiSchematic(RTK_SCHEMATIC_OPTIONS, testTree);
    files = tree.files;
  });

  afterAll(() => {
    resetAxiosMocks();
  });

  describe('File Generation', () => {
    it('should generate expected RTK files', () => {
      expect(files).toMatchSnapshot();
    });

    it('should create RTK API slice file', () => {
      expect(files).toContain(`${RTK_SCHEMATIC_OPTIONS.path}/claim.api.ts`);
    });

    it('should create enum files', () => {
      expect(files).toContain(`${RTK_SCHEMATIC_OPTIONS.path}/enums/claim-statuses.enum.ts`);
      expect(files).toContain(`${RTK_SCHEMATIC_OPTIONS.path}/enums/claim-type.enum.ts`);
    });

    it('should create interface files', () => {
      expect(files).toContain(`${RTK_SCHEMATIC_OPTIONS.path}/interfaces/claim-detail-dto.interface.ts`);
      expect(files).toContain(`${RTK_SCHEMATIC_OPTIONS.path}/interfaces/id-name-dto.interface.ts`);
    });
  });

  describe('RTK API Slice Generation', () => {
    let apiSliceContent: string;

    beforeAll(() => {
      apiSliceContent = tree.readContent(`${RTK_SCHEMATIC_OPTIONS.path}/claim.api.ts`);
    });

    it('should generate full RTK API slice', () => {
      expect(apiSliceContent).toMatchSnapshot();
    });

    it('should import from base API path', () => {
      expect(apiSliceContent).toContain(`import { api as baseApi } from '${RTK_SCHEMATIC_OPTIONS.rtkBaseApiPath}'`);
    });

    it('should export named API const', () => {
      expect(apiSliceContent).toContain('export const claimApi = baseApi.injectEndpoints');
    });

    it('should have overrideExisting set to false', () => {
      expect(apiSliceContent).toContain('overrideExisting: false');
    });

    describe('Type Imports', () => {
      it('should import interface types', () => {
        expect(apiSliceContent).toContainImport(
          `import { IClaimDetailDTO } from './interfaces/claim-detail-dto.interface';`
        );
      });

      it('should import enum types used in parameters', () => {
        expect(apiSliceContent).toContainImport(
          `import { TClaimStatuses } from './enums/claim-statuses.enum';`
        );
      });

      it('should have no duplicate imports', () => {
        expect(apiSliceContent).toHaveNoDuplicateImports();
      });
    });

    describe('Query Endpoints', () => {
      it('should generate GET endpoint as query', () => {
        expect(apiSliceContent).toMatch(/getById:\s*builder\.query/);
      });

      it('should generate query with path parameter', () => {
        expect(apiSliceContent).toContain("url: `/${id}`");
        expect(apiSliceContent).toContain("method: 'GET'");
      });
    });

    describe('Mutation Endpoints', () => {
      it('should generate POST endpoint as mutation', () => {
        expect(apiSliceContent).toMatch(/createClaimByIdNote:\s*builder\.mutation/);
      });

      it('should generate PUT endpoint as mutation', () => {
        expect(apiSliceContent).toMatch(/updateClaimById:\s*builder\.mutation/);
      });

      it('should generate DELETE endpoint as mutation', () => {
        expect(apiSliceContent).toMatch(/deleteClaimDeletemany:\s*builder\.mutation/);
      });

      it('should include body in mutation', () => {
        expect(apiSliceContent).toMatch(/body:\s*body/);
      });
    });

    describe('Query Parameters', () => {
      it('should include query params in endpoint', () => {
        expect(apiSliceContent).toMatch(/params:\s*\{/);
      });
    });
  });

  describe('Scoped Endpoints', () => {
    let scopedTree: UnitTestTree;
    let scopedApiContent: string;

    const SCOPED_OPTIONS = {
      ...RTK_SCHEMATIC_OPTIONS,
      scopeEndpointsWithTags: true
    };

    beforeAll(async () => {
      resetAxiosMocks();
      setupSwaggerMock(SCOPED_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);

      let testTree = createTestTree();
      testTree = await runTypesSchematic(SCOPED_OPTIONS, testTree);
      scopedTree = await runApiSchematic(SCOPED_OPTIONS, testTree);
      scopedApiContent = scopedTree.readContent(`${SCOPED_OPTIONS.path}/claim.api.ts`);
    });

    it('should prefix endpoint names with tag name', () => {
      // With scoping, "getById" becomes "claimGetById"
      expect(scopedApiContent).toMatch(/claimGetById:\s*builder\.query/);
    });
  });
});
