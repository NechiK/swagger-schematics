import '../helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  setupSwaggerMock,
  resetAxiosMocks,
  runFullSchematics,
  DEFAULT_SCHEMATIC_OPTIONS
} from '../helpers/setup';
import { SWAGGER_SCHEMA, MOCK_GROUP } from '../__fixtures__/swagger/full-schema.fixture';

describe('Schematics Integration', () => {
  let tree: UnitTestTree;
  let files: string[];

  beforeAll(async () => {
    tree = await runFullSchematics(SWAGGER_SCHEMA, DEFAULT_SCHEMATIC_OPTIONS);
    files = tree.files;
  });

  afterAll(() => {
    resetAxiosMocks();
  });

  describe('File Generation', () => {
    it('should generate expected files', () => {
      expect(files).toMatchSnapshot();
    });

    it('should create API service file', () => {
      expect(files).toContain(`${DEFAULT_SCHEMATIC_OPTIONS.path}/claim-api.service.ts`);
    });

    it('should create enum files', () => {
      expect(files).toContain(`${DEFAULT_SCHEMATIC_OPTIONS.path}/enums/claim-statuses.enum.ts`);
      expect(files).toContain(`${DEFAULT_SCHEMATIC_OPTIONS.path}/enums/claim-type.enum.ts`);
    });

    it('should create interface files', () => {
      expect(files).toContain(`${DEFAULT_SCHEMATIC_OPTIONS.path}/interfaces/claim-detail-dto.interface.ts`);
      expect(files).toContain(`${DEFAULT_SCHEMATIC_OPTIONS.path}/interfaces/id-name-dto.interface.ts`);
    });
  });

  describe('Enum Generation', () => {
    it('should generate ClaimStatuses enum without names', () => {
      const content = tree.readContent(`${DEFAULT_SCHEMATIC_OPTIONS.path}/enums/claim-statuses.enum.ts`);
      expect(content).toMatchSnapshot();
    });

    it('should generate ClaimType enum with names', () => {
      const content = tree.readContent(`${DEFAULT_SCHEMATIC_OPTIONS.path}/enums/claim-type.enum.ts`);
      expect(content).toMatchSnapshot();
    });
  });

  describe('Interface Generation', () => {
    it('should generate ClaimDetailDTO interface with ref and optional properties', () => {
      const content = tree.readContent(`${DEFAULT_SCHEMATIC_OPTIONS.path}/interfaces/claim-detail-dto.interface.ts`);
      expect(content).toMatchSnapshot();
    });

    it('should generate IdNameDTO interface', () => {
      const content = tree.readContent(`${DEFAULT_SCHEMATIC_OPTIONS.path}/interfaces/id-name-dto.interface.ts`);
      expect(content).toMatchSnapshot();
    });
  });

  describe('API Service Generation', () => {
    let apiServiceContent: string;

    beforeAll(() => {
      apiServiceContent = tree.readContent(`${DEFAULT_SCHEMATIC_OPTIONS.path}/claim-api.service.ts`);
    });

    it('should generate full API service', () => {
      expect(apiServiceContent).toMatchSnapshot();
    });

    it('should have no duplicate imports', () => {
      expect(apiServiceContent).toHaveNoDuplicateImports();
    });

    it('should include expected interface imports', () => {
      expect(apiServiceContent).toContainImport(
        `import { IClaimDetailDTO } from './interfaces/claim-detail-dto.interface';`
      );
      expect(apiServiceContent).toContainImport(
        `import { ICreateNoteDTO } from './interfaces/create-note-dto.interface';`
      );
      expect(apiServiceContent).toContainImport(
        `import { IClaimNoteViewDTO } from './interfaces/claim-note-view-dto.interface';`
      );
    });

    it('should import enum type used in parameter', () => {
      expect(apiServiceContent).toContainImport(
        `import { TClaimStatuses } from './enums/claim-statuses.enum';`
      );
    });

    describe('API Methods', () => {
      it('should contain GET by ID method', () => {
        expect(apiServiceContent).toContain('getById(id: number): Observable<IClaimDetailDTO>');
      });

      it('should contain POST model by ID method', () => {
        expect(apiServiceContent).toContain('createClaimByIdNote(id: number, body: ICreateNoteDTO): Observable<IClaimNoteViewDTO>');
      });

      it('should contain PUT with integer body method', () => {
        expect(apiServiceContent).toContain('updateClaimStatus(body: number): Observable<void>');
      });

      it('should contain PUT with empty body method', () => {
        expect(apiServiceContent).toContain('updateClaimByIdReactivate(id: number): Observable<void>');
      });

      it('should contain DELETE many method', () => {
        expect(apiServiceContent).toContain('deleteClaimDeletemany(body: number[]): Observable<boolean>');
      });
    });
  });
});
