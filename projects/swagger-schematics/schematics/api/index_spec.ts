import {SchematicTestRunner, UnitTestTree} from '@angular-devkit/schematics/testing';
import * as path from 'path';
import {Schema as WorkspaceSchema} from "@schematics/angular/workspace/schema";
import {Schema as ApplicationSchema} from "@schematics/angular/application/schema";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import {SWAGGER_MOCK_API_DATA} from "./swagger-api-mock";

const schematicRunner = new SchematicTestRunner('schematics', path.join(__dirname, './../collection.json'));

const appOptions: ApplicationSchema = {
  name: 'th-schematics',
};

const defaultOptions: SwaggerSchema = {
  swaggerSchemaUrl: 'https://apidev.example-api.com/swagger/v1/swagger.json',
  project: appOptions.name,
};

const workspaceOptions: WorkspaceSchema = {
  name: 'workspace',
  newProjectRoot: 'projects',
  version: '11.2.9',
  strict: true
};

// const srcPath = `/${workspaceOptions.newProjectRoot}/${appOptions.name}/src`;
// const appPath = `${srcPath}/app`;

// This sets the mock adapter on the default instance
const mock = new MockAdapter(axios);

mock.onGet(defaultOptions.swaggerSchemaUrl).reply(200, SWAGGER_MOCK_API_DATA);

let appTree: UnitTestTree;
describe('Schematics: App Api', () => {
  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematicAsync(
        '@schematics/angular',
        'workspace',
        workspaceOptions
    ).toPromise();
    appTree = await schematicRunner.runExternalSchematicAsync(
        '@schematics/angular',
        'application',
        appOptions,
        appTree
    ).toPromise()
  });

  afterAll(() => {
    mock.reset();
  });

  it('should create api service', async () => {
    const options = { ...defaultOptions };
    const tree = await schematicRunner.runSchematicAsync('api', options, appTree).toPromise();
    const files = tree.files;
    // console.log(files);
      console.log(tree.readContent(`/projects/th-schematics/src/core/api/claim-api.service.ts`));
      //core/api/claim-api.service.ts
  });
});
