import '../helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  setupSwaggerMock,
  resetAxiosMocks,
  createTestTree,
  runTypesSchematic,
  runApiSchematic,
  RTK_SCHEMATIC_OPTIONS
} from '../helpers/setup';
import { SWAGGER_SCHEMA } from '../__fixtures__/swagger/full-schema.fixture';

describe('RTK Query Schematics Integration', () => {
  let tree: UnitTestTree;
  let files: string[];

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

    it('should import from base API using tsconfig path alias', () => {
      // Default base API path is 'th-common/store/api-base.ts'
      // tsconfig has @th-common/* alias, so it uses the alias import
      expect(apiSliceContent).toContain("import { api as baseApi } from '@th-common/store/api-base'");
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
        expect(apiSliceContent).toMatch(/claimGetById:\s*builder\.query/);
      });

      it('should generate query with path parameter', () => {
        expect(apiSliceContent).toContain("url: `/claim/${id}`");
        expect(apiSliceContent).toContain("method: 'GET'");
      });
    });

    describe('Mutation Endpoints', () => {
      it('should generate POST endpoint as mutation', () => {
        expect(apiSliceContent).toMatch(/claimCreateClaimByIdNote:\s*builder\.mutation/);
      });

      it('should generate PUT endpoint as mutation', () => {
        expect(apiSliceContent).toMatch(/claimUpdateClaimById:\s*builder\.mutation/);
      });

      it('should generate DELETE endpoint as mutation', () => {
        expect(apiSliceContent).toMatch(/claimDeleteClaimDeletemany:\s*builder\.mutation/);
      });

      it('should include body in mutation', () => {
        // Uses shorthand property syntax: `body,` instead of `body: body,`
        expect(apiSliceContent).toMatch(/body,\n/);
      });
    });

    describe('Query Parameters', () => {
      it('should include query params in endpoint', () => {
        expect(apiSliceContent).toMatch(/params:\s*\{/);
      });
    });

    describe('Nullable Query Parameters', () => {
      it('should import omitBy and isNil from lodash-es', () => {
        expect(apiSliceContent).toContain("import { omitBy, isNil } from 'lodash-es'");
      });

      it('should wrap nullable params in omitBy', () => {
        expect(apiSliceContent).toContain('params: omitBy({');
        expect(apiSliceContent).toContain('}, isNil)');
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

  describe('Base API Generation', () => {
    const DEFAULT_BASE_API_PATH = '/th-common/store/api-base.ts';

    it('should generate base API file at default path', () => {
      expect(files).toContain(DEFAULT_BASE_API_PATH);
    });

    it('should contain RTK createApi setup', () => {
      const baseApiContent = tree.readContent(DEFAULT_BASE_API_PATH);
      expect(baseApiContent).toContain("import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'");
      expect(baseApiContent).toContain('export const api = createApi');
      expect(baseApiContent).toContain('reducerPath:');
      expect(baseApiContent).toContain('baseQuery: fetchBaseQuery');
    });

    it('should skip base API generation if file already exists', async () => {
      resetAxiosMocks();
      setupSwaggerMock(RTK_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);

      // Create a tree with existing base API file
      let testTree = createTestTree();
      testTree.create(DEFAULT_BASE_API_PATH, '// Existing base API');

      testTree = await runTypesSchematic(RTK_SCHEMATIC_OPTIONS, testTree);
      const resultTree = await runApiSchematic(RTK_SCHEMATIC_OPTIONS, testTree);

      // The existing file should NOT be overwritten
      const baseApiContent = resultTree.readContent(DEFAULT_BASE_API_PATH);
      expect(baseApiContent).toBe('// Existing base API');
    });

    it('should generate base API at custom path', async () => {
      resetAxiosMocks();
      setupSwaggerMock(RTK_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);

      const customPath = '/custom/path/to/api-base.ts';
      const customOptions = {
        ...RTK_SCHEMATIC_OPTIONS,
        baseApiPath: customPath
      };

      let testTree = createTestTree();
      testTree = await runTypesSchematic(customOptions, testTree);
      const resultTree = await runApiSchematic(customOptions, testTree);

      expect(resultTree.files).toContain(customPath);
    });

    it('should use tsconfig path alias when base API matches', async () => {
      resetAxiosMocks();
      setupSwaggerMock(RTK_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);

      // Use a path that matches the @/* alias (src/*)
      const aliasPath = 'src/store/api-base.ts';
      const customOptions = {
        ...RTK_SCHEMATIC_OPTIONS,
        baseApiPath: aliasPath
      };

      let testTree = createTestTree();
      testTree = await runTypesSchematic(customOptions, testTree);
      const resultTree = await runApiSchematic(customOptions, testTree);

      const apiContent = resultTree.readContent(`${RTK_SCHEMATIC_OPTIONS.path}/claim.api.ts`);
      // Should use @/store/api-base instead of relative path
      expect(apiContent).toContain("import { api as baseApi } from '@/store/api-base'");
    });
  });
});
