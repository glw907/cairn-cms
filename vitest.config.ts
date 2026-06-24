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
    // The three projects (node unit, workerd integration, chromium component) run against one shared
    // worker pool. On an 8-core machine the default of one fork per core per project oversubscribes the
    // CPU threefold, so a cold-start-sensitive test (a vite barrel compile, a CSS compile, an export
    // enumeration) starves and trips its timeout under the full run while passing in seconds alone.
    // Capping the pool at half the cores keeps the run parallel without the thrash.
    maxWorkers: 4,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/tests/unit/**/*.test.ts', 'packages/cairn-cms-dev/src/**/*.test.ts'],
          environment: 'node',
          // A few unit tests are CPU-bound (the admin CSS Tailwind+DaisyUI compile, the export
          // enumerator that parses the public surface, a runtime barrel import that vite compiles
          // cold). With the pool capped above they no longer thrash, but a generous ceiling still
          // absorbs a slow cold start without hiding a real failure: an assertion failure fails at
          // once, and a true hang still trips the timeout.
          testTimeout: 30_000,
          hookTimeout: 60_000,
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
        resolve: {
          // EditPage imports $app/navigation (the leave guard) and $app/state (the page URL),
          // which only a SvelteKit app provides. The component project resolves them to stubs:
          // a recording one for the guard, a settable one for the URL.
          alias: {
            '$app/navigation': path.resolve('./src/tests/component/app-navigation.ts'),
            '$app/state': path.resolve('./src/tests/component/app-state.ts'),
            // MediaInsertPopover imports deserialize from $app/forms to read the upload action
            // envelope; the real module exists only inside a kit app, so the component project
            // resolves it to a stub that runs the same JSON-then-devalue parse.
            '$app/forms': path.resolve('./src/tests/component/app-forms.ts'),
          },
        },
        test: {
          name: 'component',
          include: ['src/tests/component/**/*.test.ts'],
          setupFiles: ['./src/tests/component/setup.ts'],
          // The heaviest component tests mount the full EditPage with the CodeMirror editor, and on a
          // slower CI runner the editor surface and toolbar occasionally are not ready before the
          // matcher times out (the EditPage and CairnAdmin toolbar/insert assertions flake this way;
          // they pass reliably locally). A couple of retries absorbs that environment nondeterminism
          // without masking a real failure, which would fail every attempt.
          retry: 2,
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
