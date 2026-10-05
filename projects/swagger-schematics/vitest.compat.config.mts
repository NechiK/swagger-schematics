import { defineConfig } from 'vitest/config';

import baseConfig from './vitest.config.mts';

// `npm run compat:generate`: only the generator that writes the Angular output
// for the compat type check (see __tests__/compat/). Spread rather than
// mergeConfig, which would add to the base `include` instead of replacing it.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['__tests__/compat/*.compat.ts'],
  },
});
