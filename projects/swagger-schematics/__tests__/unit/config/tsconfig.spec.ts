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

  describe('reading the file', () => {
    const treeWithText = (text: string): Tree => {
      const tree = Tree.empty();
      tree.create('tsconfig.json', text);
      return tree;
    };

    it('accepts comments, trailing commas and a BOM, as TypeScript does', () => {
      const tree = treeWithText('\uFEFF// app\n{ /* aliases */ "compilerOptions": { "paths": { "@/*": ["src/*"], }, }, }');
      expect(loadTsConfig('tsconfig.json', tree).paths).toEqual({ '@/*': ['src/*'] });
    });

    it('reads an empty or comments-only file as an empty config', () => {
      expect(loadTsConfig('tsconfig.json', treeWithText('  \n')).paths).toEqual({});
      expect(loadTsConfig('tsconfig.json', treeWithText('// no options yet\n/* block */')).paths).toEqual({});
    });

    it('rejects invalid JSON and a root value that is not an object', () => {
      expect(() => loadTsConfig('tsconfig.json', treeWithText('{ "compilerOptions": {'))).toThrow("Invalid tsconfig at 'tsconfig.json': CloseBraceExpected");
      expect(() => loadTsConfig('tsconfig.json', treeWithText('[1]'))).toThrow('must be an object');
      expect(() => loadTsConfig('tsconfig.json', treeWithText(','))).toThrow('ValueExpected at offset 0');
    });

    it('rejects an unterminated comment, as TypeScript does', () => {
      expect(() => loadTsConfig('tsconfig.json', treeWithText('/* broken'))).toThrow('UnexpectedEndOfComment');
      expect(() => loadTsConfig('tsconfig.json', treeWithText('// fine\n/* broken'))).toThrow('UnexpectedEndOfComment');
    });
  });
});
