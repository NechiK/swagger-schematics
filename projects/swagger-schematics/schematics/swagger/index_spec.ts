import {SchematicTestRunner} from '@angular-devkit/schematics/testing';
import * as path from 'path';
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import {SWAGGER_MOCK_DATA} from "./swagger-mock";
import {Tree} from "@angular-devkit/schematics";

const schematicRunner = new SchematicTestRunner('schematics', path.join(__dirname, './../collection.json'));

// ng g swagger-schematics:types https://apidev.montagefs.com/swagger/v1/swagger.json

const defaultOptions: SwaggerSchema = {
  swaggerSchemaUrl: 'https://apidev.example.com/swagger/v1/swagger.json',
  path: 'th-common/core'
};

// This sets the mock adapter on the default instance
const mock = new MockAdapter(axios);

mock.onGet(defaultOptions.swaggerSchemaUrl).reply(200, SWAGGER_MOCK_DATA);

describe('Schematics: App Types', () => {

  afterAll(() => {
    mock.reset();
  });

  it('should create enum', async () => {
    const options = { ...defaultOptions };
    // console.log(options);
    const tree = await schematicRunner.runSchematicAsync('types', options, Tree.empty()).toPromise();
    // const files = tree.files;
    // console.log(files);
    console.log(tree.readContent(`/th-common/core/enums/claim-statuses.enum.ts`));
    // console.log(tree.readContent(`/projects/th-schematics/src/app/interfaces/create-region-dto.interface.ts`));
  });
});
