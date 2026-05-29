import { defineConfig } from 'vitest/config';

// The `integration` project (workers and D1) is added in Task 6.
// The `component` (browser) project is added in Plan 05.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
