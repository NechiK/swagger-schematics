import { Tree } from '@angular-devkit/schematics';
import { loadTsConfig } from '@lib/helpers/tsconfig';

describe('loadTsConfig', () => {
  const treeWith = (files: Record<string, unknown>): Tree => {
    const tree = Tree.empty();
    for (const [filePath, content] of Object.entries(files)) {
      tree.create(filePath, JSON.stringify(content));
    }
    return tree;
  };

  it('resolves paths from a single string extends', () => {
    const tree = treeWith({
      '/base.json': { compilerOptions: { paths: { '@base/*': ['src/base/*'] } } },
      '/tsconfig.json': { extends: './base.json', compilerOptions: { baseUrl: '.' } }
    });

    const result = loadTsConfig('/tsconfig.json', tree);
    expect(result.paths).toEqual({ '@base/*': ['src/base/*'] });
  });

  it('supports a TS 5 array extends, later entries overriding earlier ones', () => {
    const tree = treeWith({
      '/base1.json': { compilerOptions: { paths: { '@a/*': ['src/a/*'] }, baseUrl: 'one' } },
      '/base2.json': { compilerOptions: { paths: { '@b/*': ['src/b/*'] } } },
      '/tsconfig.json': { extends: ['./base1.json', './base2.json'] }
    });

    // Per TS semantics the last extends entry wins wholesale per field
    const result = loadTsConfig('/tsconfig.json', tree);
    expect(result.paths).toEqual({ '@b/*': ['src/b/*'] });
  });

  it('lets the config own values override every extends entry', () => {
    const tree = treeWith({
      '/base1.json': { compilerOptions: { paths: { '@a/*': ['src/a/*'] } } },
      '/tsconfig.json': {
        extends: ['./base1.json'],
        compilerOptions: { paths: { '@own/*': ['src/own/*'] } }
      }
    });

    const result = loadTsConfig('/tsconfig.json', tree);
    expect(result.paths).toEqual({ '@own/*': ['src/own/*'] });
  });
});
