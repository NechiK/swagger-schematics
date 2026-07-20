import '../helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  setupSwaggerMock,
  resetFetchMocks,
  createTestTree,
  runTypesSchematic,
  ANGULAR_SCHEMATIC_OPTIONS
} from '../helpers/setup';
import { SWAGGER_SCHEMA } from '../__fixtures__/swagger/full-schema.fixture';

describe('Types Schematics Integration', () => {
  let tree: UnitTestTree;
  let files: string[];

  beforeAll(async () => {
    setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);
    tree = await runTypesSchematic(ANGULAR_SCHEMATIC_OPTIONS, createTestTree());
    files = tree.files;
  });

  afterAll(() => {
    resetFetchMocks();
  });

  describe('File Generation', () => {
    it('should generate expected type files', () => {
      expect(files).toMatchSnapshot();
    });

    it('should create enum files', () => {
      expect(files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-statuses.enum.ts`);
      expect(files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-type.enum.ts`);
    });

    it('should create interface files', () => {
      expect(files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/claim-detail-dto.interface.ts`);
      expect(files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/id-name-dto.interface.ts`);
    });
  });

  describe('Enum Generation', () => {
    it('should generate ClaimStatuses enum without names', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-statuses.enum.ts`);
      expect(content).toMatchSnapshot();
    });

    it('should generate ClaimType enum with x-enum-varnames', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-type.enum.ts`);
      expect(content).toMatchSnapshot();
    });

    it('should keep integer enum values unquoted', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-type.enum.ts`);

      expect(content).toContain('MS = 1');
      expect(content).toContain('PP = 2');
      expect(content).not.toContain("'1'");
      expect(content).not.toContain("'2'");
    });

    it('should generate string enum with quoted string values', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/distribution-type.enum.ts`);

      expect(content).toContain('export enum TDistributionType');
      expect(content).toContain("TypeA = 'TypeA'");
      expect(content).toContain("TypeB = 'TypeB'");
      expect(content).toMatchSnapshot();
    });

    it('should generate string enum with x-enum-varnames and quoted string values', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/delivery-channel.enum.ts`);

      expect(content).toContain('export enum TDeliveryChannel');
      expect(content).toContain("Email = 'email'");
      expect(content).toContain("PhoneCall = 'phone-call'");
      expect(content).toMatchSnapshot();
    });
  });

  describe('Interface Generation', () => {
    it('should generate ClaimDetailDTO interface', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/claim-detail-dto.interface.ts`);
      expect(content).toMatchSnapshot();
    });

    it('should generate IdNameDTO interface', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/id-name-dto.interface.ts`);
      expect(content).toMatchSnapshot();
    });

    it('should generate CreateNoteDTO interface', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/create-note-dto.interface.ts`);
      expect(content).toMatchSnapshot();
    });

    it('should generate ClaimNoteViewDTO interface', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/claim-note-view-dto.interface.ts`);
      expect(content).toMatchSnapshot();
    });
  });

  describe('File Update Behavior', () => {
    it('should update existing enum files when schema changes', async () => {
      resetFetchMocks();
      setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);

      // Create a tree with an existing enum file with old content
      let testTree = createTestTree();
      testTree.create(
        `${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-statuses.enum.ts`,
        '// Old enum content that should be replaced'
      );

      const resultTree = await runTypesSchematic(ANGULAR_SCHEMATIC_OPTIONS, testTree);

      // The enum file should be updated with new content
      const enumContent = resultTree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-statuses.enum.ts`);
      expect(enumContent).not.toContain('// Old enum content');
      expect(enumContent).toContain('export enum TClaimStatuses');
    });

    it('should update existing interface files when schema changes', async () => {
      resetFetchMocks();
      setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);

      // Create a tree with an existing interface file with old content
      let testTree = createTestTree();
      testTree.create(
        `${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/claim-detail-dto.interface.ts`,
        '// Old interface content that should be replaced\nexport interface IClaimDetailDTO { oldProp: string; }'
      );

      const resultTree = await runTypesSchematic(ANGULAR_SCHEMATIC_OPTIONS, testTree);

      // The interface file should be updated with new content
      const interfaceContent = resultTree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/claim-detail-dto.interface.ts`);
      expect(interfaceContent).not.toContain('// Old interface content');
      expect(interfaceContent).not.toContain('oldProp');
      expect(interfaceContent).toContain('export interface IClaimDetailDTO');
    });

    it('should update multiple existing files in a single run', async () => {
      resetFetchMocks();
      setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);

      // Create a tree with multiple existing files
      let testTree = createTestTree();
      testTree.create(
        `${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-statuses.enum.ts`,
        '// Old ClaimStatuses enum'
      );
      testTree.create(
        `${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-type.enum.ts`,
        '// Old ClaimType enum'
      );
      testTree.create(
        `${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/id-name-dto.interface.ts`,
        '// Old IdNameDTO interface'
      );

      const resultTree = await runTypesSchematic(ANGULAR_SCHEMATIC_OPTIONS, testTree);

      // All files should be updated
      const claimStatusesContent = resultTree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-statuses.enum.ts`);
      const claimTypeContent = resultTree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/enums/claim-type.enum.ts`);
      const idNameDtoContent = resultTree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/id-name-dto.interface.ts`);

      expect(claimStatusesContent).toContain('export enum TClaimStatuses');
      expect(claimTypeContent).toContain('export enum TClaimType');
      expect(idNameDtoContent).toContain('export interface IIdNameDTO');
    });
  });

  describe('Composition Schema Generation', () => {
    it('should generate type alias for allOf schemas', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/full-claim-dto.type.ts`);

      // Should be a type alias with T prefix, not interface with I prefix
      expect(content).toContain('export type TFullClaimDTO =');
      // Should be intersection type with &
      expect(content).toContain('&');
      // Should import referenced types
      expect(content).toContain('IBaseEntity');
      expect(content).toContain('IAuditableEntity');
    });

    it('should generate type alias for oneOf schemas', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/notification.type.ts`);

      // Should be a type alias with T prefix
      expect(content).toContain('export type TNotification =');
      expect(content).toContain('|');
      // Should import referenced types
      expect(content).toContain('IIdNameDTO');
      expect(content).toContain('IClaimDetailDTO');
    });

    it('should generate type alias for anyOf schemas', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/search-result.type.ts`);

      // Should be a type alias with T prefix
      expect(content).toContain('export type TSearchResult =');
      expect(content).toContain('|');
    });

    it('should create type files for composition schemas', () => {
      expect(files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/full-claim-dto.type.ts`);
      expect(files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/notification.type.ts`);
      expect(files).toContain(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/search-result.type.ts`);
    });
  });

  describe('typeMapping option', () => {
    let typeMappingTree: UnitTestTree;

    beforeAll(async () => {
      resetFetchMocks();
      setupSwaggerMock(ANGULAR_SCHEMATIC_OPTIONS.swaggerSchemaUrl, SWAGGER_SCHEMA);

      const optionsWithTypeMapping = {
        ...ANGULAR_SCHEMATIC_OPTIONS,
        typeMapping: {
          'NullableOfDistributionType': 'DistributionType'
        }
      };

      typeMappingTree = await runTypesSchematic(optionsWithTypeMapping, createTestTree());
    });

    it('should map NullableOfDistributionType to DistributionType with | null in interface', () => {
      const content = typeMappingTree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/type-mapping-test-dto.interface.ts`);

      // Should use DistributionType import, not NullableOfDistributionType
      expect(content).toContain("import { TDistributionType }");
      expect(content).toContain("from '../enums/distribution-type.enum'");

      // Should NOT import from nullable-of-distribution-type
      expect(content).not.toContain('nullable-of-distribution-type');

      // Should have | null for the nullable type
      expect(content).toContain('TDistributionType | null');
    });

    it('should use original NullableOfDistributionType import when typeMapping is not set', () => {
      const content = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/interfaces/type-mapping-test-dto.interface.ts`);

      // Without typeMapping, should use the original NullableOfDistributionType
      expect(content).toContain("import { TNullableOfDistributionType }");
      expect(content).toContain("from '../enums/nullable-of-distribution-type.enum'");
    });
  });
});
