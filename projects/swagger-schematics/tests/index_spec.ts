import {SchematicTestRunner, UnitTestTree} from '@angular-devkit/schematics/testing';
import * as path from 'path';
import axios from "axios";
import {Tree} from "@angular-devkit/schematics";
import * as MockAdapter from 'axios-mock-adapter';
import {SWAGGER_MOCK_DATA} from '../mocks/swagger-mock';
import {EDITORCONFIG_MOCK} from '../mocks/editorconfig';
import {
    CLAIM_STATUSES_ENUM_CONTENT_MOCK,
    CLAIM_TYPE_ENUM_CONTENT_MOCK,
    CLAIM_TYPE_ENUM_NO_NAMES_CONTENT_MOCK
} from '../mocks/enum-mocks';
import {CLAIM_VIEW_DTO_CONTENT_MOCK, JOURNAL_DETAIL_DTO_DUPLICATE_SYMBOL_CONTENT_MOCK} from '../mocks/interface-mocks';

const schematicRunner = new SchematicTestRunner('schematics', path.join(__dirname, './../collection.json'));

const defaultOptions: SwaggerSchema = {
    swaggerSchemaUrl: 'https://apidev.example.com/swagger/v1/swagger.json',
    path: '/th-common/core'
};

describe('Schematics API and types', () => {
    // This sets the mock adapter on the default instance
    const mock = new MockAdapter(axios);
    let tree: UnitTestTree = new UnitTestTree(Tree.empty());
    let files: string[];

    mock.onGet(defaultOptions.swaggerSchemaUrl).reply(200, SWAGGER_MOCK_DATA);

    beforeAll(async () => {
        const options = { ...defaultOptions };
        tree.create('.editorconfig', EDITORCONFIG_MOCK);
        tree = await schematicRunner.runSchematic('types', options, tree);
        tree = await schematicRunner.runSchematic('api', options, tree);
        files = tree.files;
    });

    afterAll(() => {
        mock.reset();
    });

    it('should create TClaimStatuses enum without names', async () => {
        const TClaimStatusesEnumContent = tree.readContent(`${defaultOptions.path}/enums/claim-statuses.enum.ts`);
        expect(TClaimStatusesEnumContent).toEqual(CLAIM_STATUSES_ENUM_CONTENT_MOCK);
    });

    it('should create TClaimType enum with names', async () => {
        const TClaimTypeEnumContent = tree.readContent(`${defaultOptions.path}/enums/claim-type.enum.ts`);
        expect(TClaimTypeEnumContent).not.toEqual(CLAIM_TYPE_ENUM_NO_NAMES_CONTENT_MOCK);
        expect(TClaimTypeEnumContent).toEqual(CLAIM_TYPE_ENUM_CONTENT_MOCK);
    });

    it('should create IClaimViewDTO interface', async () => {
        const IClaimViewDTOContent = tree.readContent(`${defaultOptions.path}/interfaces/claim-view-dto.interface.ts`);
        expect(IClaimViewDTOContent).toEqual(CLAIM_VIEW_DTO_CONTENT_MOCK);
    });

    it('should create filter uniq symbols', async () => {
        const IJournalDetailDTO = tree.readContent(`${defaultOptions.path}/interfaces/journal-detail-dto.interface.ts`);
        expect(IJournalDetailDTO).toEqual(JOURNAL_DETAIL_DTO_DUPLICATE_SYMBOL_CONTENT_MOCK);
    });

    it('should create ClaimApiService api service', async () => {
        expect(files).toContain(`${defaultOptions.path}/api/claim-api.service.ts`);
    });
});
