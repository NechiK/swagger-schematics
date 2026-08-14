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
   * True end-to-end: jest's VM sandbox blocks the dynamic import() ESLint v9+
   * uses for flat configs, so the real-ESLint path runs in a child process,
   * where the rule picks up this package's eslint.config.mjs (single quotes,
   * trailing commas) via the installed ESLint.
   */
  describe('end-to-end with real ESLint (child process)', () => {
    let result: { content: string; logs: string[]; error?: string };

    beforeAll(() => {
      const runnerPath = path.join(__dirname, '../../helpers/eslint-fix-e2e.runner.ts');
      const stdout = execSync(`npx ts-node --transpile-only "${runnerPath}"`, {
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
   * In-jest run: ESLint cannot load its config inside jest's sandbox, which
   * makes this a real-world exercise of the non-blocking guarantee - the
   * schematic must complete and keep the generated content untouched.
   */
  describe('never blocks generation when ESLint fails', () => {
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
