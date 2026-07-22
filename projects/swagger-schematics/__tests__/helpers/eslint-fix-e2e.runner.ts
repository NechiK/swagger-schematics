/**
 * Executed as a child process by the eslintFix end-to-end test (not by jest).
 *
 * Jest's VM sandbox blocks the native dynamic import() that ESLint v9+ uses to
 * load flat configs, so the real-ESLint path can only be exercised outside
 * jest. This runner applies the actual eslint-fix rule to a real Tree using
 * the ESLint + eslint.config.mjs installed in this package, then prints the
 * result as JSON for the test to assert on.
 */
import { Tree } from '@angular-devkit/schematics';
import { createEslintFixRule } from '../../helpers/eslint-fix.helper';

const FILE_PATH = '/src/app/api/sample-api.service.ts';
const GENERATED = 'import { Injectable } from "@angular/core";\n' +
  'const config = {\n  a: 1,\n  b: 2\n};\n';

(async () => {
  const tree = Tree.empty();
  tree.create(FILE_PATH, GENERATED);

  const logs: string[] = [];
  const context = {
    logger: {
      info: (message: string) => logs.push(`info: ${message}`),
      warn: (message: string) => logs.push(`warn: ${message}`)
    }
  };

  const rule = createEslintFixRule({ eslintFix: true });
  await (rule as any)(tree, context);

  process.stdout.write(JSON.stringify({
    content: tree.read(FILE_PATH)!.toString(),
    logs
  }));
})().catch(error => {
  process.stdout.write(JSON.stringify({ error: (error as Error).message }));
  process.exit(1);
});
