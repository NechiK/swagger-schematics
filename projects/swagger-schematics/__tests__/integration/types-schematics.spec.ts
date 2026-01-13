import '../helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  setupSwaggerMock,
  resetAxiosMocks,
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
    resetAxiosMocks();
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
});
