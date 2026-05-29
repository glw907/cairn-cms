import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';

// Read committed SQL migrations from Node context (workerd cannot read the FS).
// In 0.16 both `cloudflareTest` and `readD1Migrations` ship from the package
// entry; there is no `/config` subpath.
const migrations = await readD1Migrations(path.resolve('migrations'));

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
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.test.jsonc' },
            miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
          }),
        ],
        test: {
          name: 'integration',
          include: ['src/tests/integration/**/*.test.ts'],
          setupFiles: ['./src/tests/integration/apply-migrations.ts'],
        },
      },
      {
        plugins: [svelte()],
        test: {
          name: 'component',
          include: ['src/tests/component/**/*.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
