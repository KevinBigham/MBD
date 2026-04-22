import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: process.env.MBD_PLAYTEST_DUMP === '1'
      ? ['tests/**/*.test.ts', 'tests/**/*.generate.ts']
      : ['tests/**/*.test.ts'],
  },
});
