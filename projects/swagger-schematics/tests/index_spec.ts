import {SchematicTestRunner, UnitTestTree} from '@angular-devkit/schematics/testing';
import * as path from 'path';
import axios from "axios";
import {Tree} from "@angular-devkit/schematics";
import * as MockAdapter from 'axios-mock-adapter';
import {SWAGGER_DATA} from '../mocks/swagger-mock';
import {EDITORCONFIG} from '../mocks/editorconfig';
import {
    CLAIM_STATUSES_ENUM_CONTENT,
    CLAIM_TYPE_ENUM_CONTENT,
    CLAIM_TYPE_ENUM_NO_NAMES_CONTENT
} from '../mocks/enum-mocks';
import {
    MODEL_WITH_REF_DTO_CONTENT,
} from '../mocks/interface-mocks';
import {GET_MODEL_BY_ID_METHOD, POST_MODEL_BY_ID_METHOD} from '../mocks/api-mocks';

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

    mock.onGet(defaultOptions.swaggerSchemaUrl).reply(200, SWAGGER_DATA);

    beforeAll(async () => {
        const options = { ...defaultOptions };
        tree.create('.editorconfig', EDITORCONFIG);
        tree = await schematicRunner.runSchematic('types', options, tree);
        tree = await schematicRunner.runSchematic('api', options, tree);
        files = tree.files;
    });

    afterAll(() => {
        mock.reset();
    });

    it('should create TClaimStatuses enum without names', async () => {
        const TClaimStatusesEnumContent = tree.readContent(`${defaultOptions.path}/enums/claim-statuses.enum.ts`);
        expect(TClaimStatusesEnumContent).toEqual(CLAIM_STATUSES_ENUM_CONTENT);
    });

    it('should create TClaimType enum with names', async () => {
        const TClaimTypeEnumContent = tree.readContent(`${defaultOptions.path}/enums/claim-type.enum.ts`);
        expect(TClaimTypeEnumContent).not.toEqual(CLAIM_TYPE_ENUM_NO_NAMES_CONTENT);
        expect(TClaimTypeEnumContent).toEqual(CLAIM_TYPE_ENUM_CONTENT);
    });

    it('should create IClaimDetailDTO interface with ref and optional properties', async () => {
        const IClaimDetailDTOContent = tree.readContent(`${defaultOptions.path}/interfaces/claim-detail-dto.interface.ts`);
        expect(IClaimDetailDTOContent).toEqual(MODEL_WITH_REF_DTO_CONTENT);
    });

    // it('should filter interface uniq symbols', async () => {
    //     const IJournalDetailDTO = tree.readContent(`${defaultOptions.path}/interfaces/journal-detail-dto.interface.ts`);
    //     expect(IJournalDetailDTO).toEqual(JOURNAL_DETAIL_DTO_DUPLICATE_SYMBOL_CONTENT);
    // });
    //
    // it('should filter interface recursive symbol', async () => {
    //     const IEstimateItemDTO = tree.readContent(`${defaultOptions.path}/interfaces/estimate-item-dto.interface.ts`);
    //     expect(IEstimateItemDTO).toEqual(RECURSIVE_SYMBOL_CONTENT);
    // });

    it('should create ClaimApiService api service', async () => {
        expect(files).toContain(`${defaultOptions.path}/api/claim-api.service.ts`);
    });

    it('should convert APIs to methods', async () => {
        const claimApiServiceContent = tree.readContent(`${defaultOptions.path}/api/claim-api.service.ts`);
        console.log(claimApiServiceContent);
        expect(claimApiServiceContent).toContain(GET_MODEL_BY_ID_METHOD);
        expect(claimApiServiceContent).toContain(POST_MODEL_BY_ID_METHOD);
    });
});
