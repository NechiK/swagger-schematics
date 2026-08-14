import { Tree } from '@angular-devkit/schematics';
import { createEslintFixRule, TESLintModuleLoader } from '@lib/helpers/eslint-fix.helper';
import { SwaggerApiSchema } from '@lib/api/schema';

describe('createEslintFixRule', () => {
  const CONFIG_ENABLED: SwaggerApiSchema = { eslintFix: true };
  const FILE_PATH = '/src/app/api/claim-api.service.ts';
  const GENERATED_CONTENT = 'import { Injectable } from "@angular/core";\n';

  let logger: { info: jest.Mock; warn: jest.Mock };
  let context: any;

  const createTreeWithFile = (): Tree => {
    const tree = Tree.empty();
    tree.create(FILE_PATH, GENERATED_CONTENT);
    return tree;
  };

  const createESLintStub = (overrides: Partial<{
    isPathIgnored: jest.Mock;
    lintText: jest.Mock;
    constructorError: Error;
  }> = {}): TESLintModuleLoader => {
    const instance = {
      isPathIgnored: overrides.isPathIgnored ?? jest.fn().mockResolvedValue(false),
      lintText: overrides.lintText ?? jest.fn().mockResolvedValue([{ output: undefined, fatalErrorCount: 0, messages: [] }])
    };
    class ESLintMock {
      isPathIgnored = instance.isPathIgnored;
      lintText = instance.lintText;
      constructor() {
        if (overrides.constructorError) {
          throw overrides.constructorError;
        }
        return instance;
      }
    }
    (ESLintMock as any).instance = instance;
    return Object.assign(() => ({ ESLint: ESLintMock }), { instance });
  };

  const runRule = async (config: SwaggerApiSchema, loader: TESLintModuleLoader, tree: Tree = createTreeWithFile()) => {
    const rule = createEslintFixRule(config, loader);
    await (rule as any)(tree, context);
    return tree;
  };

  beforeEach(() => {
    logger = { info: jest.fn(), warn: jest.fn() };
    context = { logger };
  });

  it('should do nothing when eslintFix is disabled', async () => {
    const loader = jest.fn();
    await runRule({ eslintFix: false }, loader as any);
    expect(loader).not.toHaveBeenCalled();
  });

  it('should apply the fixed output to the tree', async () => {
    const fixed = "import { Injectable } from '@angular/core';\n";
    const loader = createESLintStub({
      lintText: jest.fn().mockResolvedValue([{ output: fixed, fatalErrorCount: 0, messages: [] }])
    });

    const tree = await runRule(CONFIG_ENABLED, loader);

    expect(tree.read(FILE_PATH)!.toString()).toBe(fixed);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should keep content and log info when eslint is not installed', async () => {
    const loader = () => {
      throw new Error('Cannot find module eslint');
    };

    const tree = await runRule(CONFIG_ENABLED, loader as any);

    expect(tree.read(FILE_PATH)!.toString()).toBe(GENERATED_CONTENT);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('eslint is not installed'));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should keep content and warn when ESLint fails to initialize', async () => {
    const loader = createESLintStub({ constructorError: new Error('config not found') });

    const tree = await runRule(CONFIG_ENABLED, loader);

    expect(tree.read(FILE_PATH)!.toString()).toBe(GENERATED_CONTENT);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('config not found'));
  });

  it('should keep content and warn when linting a file throws', async () => {
    const loader = createESLintStub({
      lintText: jest.fn().mockRejectedValue(new Error('rule crashed'))
    });

    const tree = await runRule(CONFIG_ENABLED, loader);

    expect(tree.read(FILE_PATH)!.toString()).toBe(GENERATED_CONTENT);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rule crashed'));
  });

  it('should keep content and warn on fatal lint errors (parse errors)', async () => {
    const loader = createESLintStub({
      lintText: jest.fn().mockResolvedValue([{
        output: undefined,
        fatalErrorCount: 1,
        messages: [{ fatal: true, message: 'Parsing error: unexpected token' }]
      }])
    });

    const tree = await runRule(CONFIG_ENABLED, loader);

    expect(tree.read(FILE_PATH)!.toString()).toBe(GENERATED_CONTENT);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Parsing error'));
  });

  it('should skip files ignored by the project eslint config', async () => {
    const lintText = jest.fn();
    const loader = createESLintStub({
      isPathIgnored: jest.fn().mockResolvedValue(true),
      lintText
    });

    const tree = await runRule(CONFIG_ENABLED, loader);

    expect(lintText).not.toHaveBeenCalled();
    expect(tree.read(FILE_PATH)!.toString()).toBe(GENERATED_CONTENT);
  });

  it('should only lint ts files', async () => {
    const lintText = jest.fn().mockResolvedValue([{ output: undefined, fatalErrorCount: 0, messages: [] }]);
    const loader = createESLintStub({ lintText });

    const tree = createTreeWithFile();
    tree.create('/src/app/api/readme.md', '# generated');
    await runRule(CONFIG_ENABLED, loader, tree);

    expect(lintText).toHaveBeenCalledTimes(1);
  });
});
