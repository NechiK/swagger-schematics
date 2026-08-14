import parser from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';

const SOURCE_FILES = [
  'api/**/*.ts',
  'bin/**/*.ts',
  'helpers/**/*.ts',
  'interfaces/**/*.ts',
  'types/**/*.ts',
];

export default tseslint.config(
  {
    ignores: ['**/*.js', '**/*.d.ts', 'coverage/**', 'mocks/**', '__tests__/**'],
  },

  // Fixture rules for the eslintFix end-to-end tests: the eslint-fix rule
  // resolves generated virtual-tree paths against this package root, so the
  // e2e sample file lands under src/** (which never exists on disk).
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser },
    rules: {
      quotes: ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },

  // Real linting for this package's own source.
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: SOURCE_FILES,
  })),
  {
    files: SOURCE_FILES,
    rules: {
      // Existing typing debt (schema transform engine); the lint script's
      // --max-warnings caps the count so it can only go down.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
