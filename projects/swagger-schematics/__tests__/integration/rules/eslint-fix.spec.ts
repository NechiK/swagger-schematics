import '@helpers/matchers';
import { execSync } from 'child_process';
import * as path from 'path';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import {
  resetFetchMocks,
  runFullSchematics,
  ANGULAR_SCHEMATIC_OPTIONS
} from '@helpers/setup';
import { BINARY_SWAGGER_SCHEMA } from '@fixtures/swagger/binary-schema.fixture';

describe('eslintFix', () => {
  /**
   * True end-to-end: the real-ESLint path runs in a child process, as a CLI run
   * would, where the rule picks up this package's eslint.config.mjs (single
   * quotes, trailing commas) via the installed ESLint. (It moved there because
   * Jest's VM sandbox blocked ESLint's dynamic import(); Vitest has no such limit,
   * but the child process keeps the run identical to a real one.)
   */
  describe('end-to-end with real ESLint (child process)', () => {
    let result: { content: string; logs: string[]; error?: string };

    beforeAll(() => {
      const runnerPath = path.join(__dirname, '../../helpers/eslint-fix-e2e.runner.ts');
      const stdout = execSync(`npx ts-node --transpile-only --prefer-ts-exts "${runnerPath}"`, {
        cwd: path.join(__dirname, '../../..'),
        encoding: 'utf8',
        timeout: 60000
      });
      result = JSON.parse(stdout);
    }, 90000);

    it('should run without errors or warnings', () => {
      expect(result.error).toBeUndefined();
      expect(result.logs).toEqual([]);
    });

    it('should rewrite double quotes to the configured single quotes', () => {
      expect(result.content).toContain("import { Injectable } from '@angular/core';");
      expect(result.content).not.toContain('"@angular/core"');
    });

    it('should add the configured trailing commas', () => {
      expect(result.content).toContain('b: 2,');
    });
  });

  /**
   * In-process run: ESLint loads this package's config, which has no rules for
   * the generated path, so the schematic must complete and keep the generated
   * content as is. ESLint failures (no ESLint, a config that fails to load, a
   * crashing rule, a parse error) are covered in __tests__/unit/rules/eslint-fix.spec.ts.
   */
  describe('keeps the generated content when the ESLint config has no rules for it', () => {
    let tree: UnitTestTree;
    let serviceContent: string;

    beforeAll(async () => {
      resetFetchMocks();
      tree = await runFullSchematics(BINARY_SWAGGER_SCHEMA, {
        ...ANGULAR_SCHEMATIC_OPTIONS,
        eslintFix: true
      });
      serviceContent = tree.readContent(`${ANGULAR_SCHEMATIC_OPTIONS.path}/document-api.service.ts`);
    });

    afterAll(() => {
      resetFetchMocks();
    });

    it('should still generate the full service', () => {
      expect(serviceContent).toContain('export class DocumentApiService extends ApiBaseService');
      expect(serviceContent).toContain("responseType: 'blob'");
    });

    it('should keep the generated content unchanged', () => {
      expect(serviceContent).toContain('import { Injectable } from "@angular/core";');
    });
  });
});
