// Used by the eslintFix end-to-end tests: the eslint-fix rule resolves ESLint
// from the host project cwd, which during jest runs is this package root.
import parser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: { parser },
    rules: {
      quotes: ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],
    },
  },
];
