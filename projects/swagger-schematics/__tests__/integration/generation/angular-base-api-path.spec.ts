import '@helpers/matchers';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import {
  resetFetchMocks,
  runFullSchematics,
  ANGULAR_SCHEMATIC_OPTIONS
} from '@helpers/setup';
import { BINARY_SWAGGER_SCHEMA } from '@fixtures/swagger/binary-schema.fixture';

/**
 * A custom Angular baseApiPath used to be broken in both accepted forms: the
 * writer treated it as a directory while the import computation treated it as
 * a file path, so they never pointed at the same location. Both forms must
 * produce a base service file that the generated services' import resolves to.
 */
describe('Angular custom baseApiPath', () => {
  afterEach(() => {
    resetFetchMocks();
  });

  const expectConsistentBaseApi = (tree: UnitTestTree, expectedServiceFile: string) => {
    expect(tree.files).toContain(expectedServiceFile);

    const serviceFiles = tree.files.filter(file => file.endsWith('-api.service.ts'));
    expect(serviceFiles.length).toBeGreaterThan(0);

    for (const serviceFile of serviceFiles) {
      const content = tree.readContent(serviceFile);
      const importMatch = /import \{ ApiBaseService \} from ["'](.+?)["'];/.exec(content);
      expect(importMatch).not.toBeNull();

      // Resolve the relative import against the service file's directory and
      // assert it lands exactly on the generated base service file.
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(serviceFile), `${importMatch![1]}.ts`));
      expect(resolved).toBe(expectedServiceFile);
    }
  };

  it('accepts a directory value', async () => {
    const tree = await runFullSchematics(BINARY_SWAGGER_SCHEMA, {
      ...ANGULAR_SCHEMATIC_OPTIONS,
      baseApiPath: '/core/base'
    });

    expectConsistentBaseApi(tree, '/core/base/_api-base.service.ts');
  });

  it('accepts a file-path value', async () => {
    const tree = await runFullSchematics(BINARY_SWAGGER_SCHEMA, {
      ...ANGULAR_SCHEMATIC_OPTIONS,
      baseApiPath: '/core/base/_api-base.service.ts'
    });

    expectConsistentBaseApi(tree, '/core/base/_api-base.service.ts');

    // Snapshot one service so the custom-base-path import is visible as
    // generated output.
    const [serviceFile] = tree.files.filter(file => file.endsWith('-api.service.ts')).sort();
    expect(tree.readContent(serviceFile)).toMatchSnapshot();
  });
});
