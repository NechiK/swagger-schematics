import {SchematicTestRunner, UnitTestTree} from '@angular-devkit/schematics/testing';
import * as path from 'path';
import {Schema as WorkspaceSchema} from "@schematics/angular/workspace/schema";
import {Schema as ApplicationSchema} from "@schematics/angular/application/schema";

const schematicRunner = new SchematicTestRunner('schematics', path.join(__dirname, './../collection.json'));

const appOptions: ApplicationSchema = {
  name: 'th-schematics',
};

const defaultOptions: SwaggerSchema = {
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

let appTree: UnitTestTree;
describe('Schematics: App Types', () => {
  beforeEach(async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
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

  it('should create enum', async () => {
    const options = { ...defaultOptions };
    const tree = await schematicRunner.runSchematicAsync('types', options, appTree).toPromise();
    const files = tree.files;
    console.log(files);
    console.log(tree.readContent(`/projects/th-schematics/src/app/interfaces/vehicle-dto.interface.ts`));
  });
});
