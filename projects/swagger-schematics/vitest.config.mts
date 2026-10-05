import { defineConfig } from 'vitest/config';

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@fixtures\/(.*)$/, replacement: `${root}/__tests__/__fixtures__/$1` },
      { find: /^@helpers\/(.*)$/, replacement: `${root}/__tests__/helpers/$1` },
      { find: /^@lib\/(.*)$/, replacement: `${root}/$1` },
    ],
    // TypeScript sources before the compiled .js `npm run build` leaves next to them
    extensions: ['.ts', '.mts', '.mjs', '.js', '.json'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.spec.ts'],
    globalSetup: ['./vitest.global-setup.js'],
    setupFiles: ['./__tests__/helpers/silence-schematic-logs.ts'],
    coverage: {
      provider: 'v8',
      include: ['api/**/*.ts', 'bin/**/*.ts', 'helpers/**/*.ts', 'interfaces/**/*.ts', 'types/**/*.ts'],
      exclude: ['**/*.d.ts'],
      thresholds: {
        statements: 86,
        branches: 73,
        functions: 82,
        lines: 87,
      },
    },
  },
});
