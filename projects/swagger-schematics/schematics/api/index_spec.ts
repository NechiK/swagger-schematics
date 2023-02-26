import {SchematicTestRunner} from '@angular-devkit/schematics/testing';
import * as path from 'path';
import {Schema as ApplicationSchema} from "@schematics/angular/application/schema";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import {SWAGGER_MOCK_API_DATA} from "./swagger-api-mock";
import {Tree} from "@angular-devkit/schematics";

const schematicRunner = new SchematicTestRunner('schematics', path.join(__dirname, './../collection.json'));

const appOptions: ApplicationSchema = {
  name: 'th-schematics',
};

const defaultOptions: SwaggerSchema = {
  swaggerSchemaUrl: 'https://apidev.example.com/swagger/v1/swagger.json',
  // swaggerSchemaUrl: 'https://apidev.example-api.com/swagger/v1/swagger.json',
  project: appOptions.name,
};

// This sets the mock adapter on the default instance
const mock = new MockAdapter(axios);

mock.onGet(defaultOptions.swaggerSchemaUrl).reply(200, SWAGGER_MOCK_API_DATA);

describe('Schematics: App Api', () => {
  afterAll(() => {
    mock.reset();
  });

  it('should create api service', async () => {
    const options = { ...defaultOptions };
    const tree = await schematicRunner.runSchematic('api', options, Tree.empty());
    const files = tree.files;
    console.log(files);
      console.log(tree.readContent(`/core/api/claim-api.service.ts`));
      //core/api/claim-api.service.ts
  });
});
