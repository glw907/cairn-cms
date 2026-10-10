import { configDefaults, defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import { statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { COMPONENT_RERUN_TRIGGERS } from './scripts/test/component-rerun-triggers.mjs';

// Read committed SQL migrations from Node context (workerd cannot read the FS).
// In 0.16 both `cloudflareTest` and `readD1Migrations` ship from the package
// entry; there is no `/config` subpath.
const migrations = await readD1Migrations(path.resolve('migrations'));

const CLOUDFLARE_WORKERS_FAKE = path.resolve('./src/tests/helpers/cloudflare-workers-fake.ts');
const CLOUDFLARE_WORKERS_FAKE_SETUP = path.resolve('./src/tests/helpers/cloudflare-workers-fake-setup.ts');
const SOURCE_ADMIN_SHEET = path.resolve('src/lib/admin/cairn-admin.css');
const COMPILED_ADMIN_SHEET = path.resolve('dist/admin/cairn-admin.css');

// A `vitest related` or `--changed` run selects tests by their static import graph. The shared
// trigger list names the paths that reach the component tests outside that graph, so a related
// run that touches one runs every selected project in full instead of a partial selection. The
// run opts in with CAIRN_RELATED_RUN=1 because an argv check cannot see a run started in process
// (the classifier's `createVitest`). A watch run keeps Vitest's defaults, so editing an admin
// component reruns only its own tests there.
// Each glob is anchored at the absolute repo root, not prefixed with a bare double star: a pass
// worktree lives under `.claude/worktrees/`, and Vitest's matcher never lets a double star cross a
// dot directory, so a bare double-star pattern silently matches nothing there.
const RELATED_RUN = process.env.CAIRN_RELATED_RUN === '1';
const FORCE_RERUN_TRIGGERS = RELATED_RUN
  ? [...configDefaults.forceRerunTriggers, ...COMPONENT_RERUN_TRIGGERS.map((glob) => `${path.resolve('.')}/${glob}`)]
  : [...configDefaults.forceRerunTriggers];

/**
 * Redirects every import that resolves to the source admin partial onto the compiled sheet, for
 * the component project only. The partial is compile-input, not browser-ready: its daisyUI theme
 * variables live in `@plugin "daisyui/theme"` blocks a browser drops, and it declares
 * `utilities.cairn-idiom` ahead of `utilities.daisyui`, which would reverse the sublayer pin if it
 * loaded beside the compiled sheet. The redirect keys on the resolved file, so CairnAdminShell,
 * LoginPage, ConfirmPage, ReproContext, and any test that imports the partial by any relative path
 * all get the sheet that ships. A `?raw` import still reads the source text, which is what the
 * source-reading tests want. The package build never sees this plugin, so the shipped `dist`
 * import resolves exactly as before. The project's globalSetup rebuilds the compiled sheet first.
 */
function compiledAdminSheet(): Plugin {
  return {
    name: 'cairn-compiled-admin-sheet',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!/cairn-admin\.css(\?|$)/.test(source)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      const [file, query] = resolved.id.split('?');
      if (file !== SOURCE_ADMIN_SHEET || query === 'raw') return null;
      return query ? `${COMPILED_ADMIN_SHEET}?${query}` : COMPILED_ADMIN_SHEET;
    },
  };
}

export default defineConfig({
  test: {
    // The three projects (node unit, workerd integration, chromium component) run against one shared
    // worker pool. On an 8-core machine the default of one fork per core per project oversubscribes the
    // CPU threefold, so a cold-start-sensitive test (a vite barrel compile, a CSS compile, an export
    // enumeration) starves and trips its timeout under the full run while passing in seconds alone.
    // Capping the pool at half the cores keeps the run parallel without the thrash.
    maxWorkers: 4,
    forceRerunTriggers: FORCE_RERUN_TRIGGERS,
    // vi.restoreAllMocks (widely used in this suite's afterEach hooks) does not restore a
    // vi.stubGlobal call; only vi.unstubAllGlobals or this flag do. Every project below repeats
    // it explicitly, since a `projects` entry is its own Vite config and does not inherit this
    // root `test` block (internals-C, Task 5): without it, a global a test stubs (commonly
    // `fetch`) can leak into the next test file sharing a worker.
    unstubGlobals: true,
    projects: [
      {
        resolve: {
          // loadPreview (src/lib/sveltekit/preview.ts) imports $app/env for its build-time
          // guard, the first $app import outside src/lib/admin. The real module exists only
          // inside a kit app; this alias resolves it to a stub so the unit project can import
          // preview.ts at all.
          alias: {
            '$app/env': path.resolve('./src/tests/_app-env.ts'),
            // The real module exists only inside workerd. The unit project resolves it to a fake
            // a setup file resets before each test; the integration project runs on the native one.
            'cloudflare:workers': CLOUDFLARE_WORKERS_FAKE,
          },
        },
        test: {
          name: 'unit',
          unstubGlobals: true,
          setupFiles: [CLOUDFLARE_WORKERS_FAKE_SETUP],
          include: [
            'src/tests/unit/**/*.test.ts',
            'src/tests/lab/**/*.test.ts',
            'packages/cairn-cms-dev/src/**/*.test.ts'
          ],
          // These specs spawn a child process (npm pack, a plain Node resolver probe) against the
          // built dist. Under the full run's concurrent IO that spawn starves and flakes, so they
          // run in their own single-fork project below; exclude them here so they do not run twice.
          exclude: [
            'src/tests/unit/delivery-data-dist-spawn.test.ts',
            'src/tests/unit/media-seed-dist-spawn.test.ts',
            'src/tests/unit/packaging-boundary.test.ts',
            'src/tests/unit/reproductions-manifest-dist-spawn.test.ts',
          ],
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
        test: {
          // These specs each spawn a child process (a cold-import of the built barrel, an npm pack,
          // a Node resolver probe) against the built dist, and that spawn flakes under the full
          // run's concurrent IO. They get their own non-concurrent project: a single fork, no file
          // parallelism, so each spawn runs alone. Every spec here is excluded from the `unit`
          // project above so they run exactly once.
          name: 'unit-dist-spawn',
          unstubGlobals: true,
          include: [
            'src/tests/unit/delivery-data-dist-spawn.test.ts',
            'src/tests/unit/media-seed-dist-spawn.test.ts',
            'src/tests/unit/packaging-boundary.test.ts',
            'src/tests/unit/reproductions-manifest-dist-spawn.test.ts',
          ],
          environment: 'node',
          // Vitest 4 retired `poolOptions.forks.singleFork`; a single fork is now `maxWorkers: 1` on a
          // forks pool, and `fileParallelism: false` keeps the spec off the shared concurrent pool.
          pool: 'forks',
          maxWorkers: 1,
          minWorkers: 1,
          fileParallelism: false,
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
        resolve: {
          // Matches the unit project's own alias: loadPreview's $app/env import needs a
          // resolvable stub outside a real kit app.
          alias: {
            '$app/env': path.resolve('./src/tests/_app-env.ts'),
          },
        },
        test: {
          name: 'integration',
          unstubGlobals: true,
          include: ['src/tests/integration/**/*.test.ts'],
          setupFiles: ['./src/tests/integration/_apply-migrations.ts'],
        },
      },
      {
        plugins: [svelte(), compiledAdminSheet()],
        resolve: {
          // EditPage imports $app/navigation (the leave guard) and $app/state (the page URL),
          // which only a SvelteKit app provides. The component project resolves them to stubs:
          // a recording one for the guard, a settable one for the URL.
          alias: {
            '$app/navigation': path.resolve('./src/tests/component/_app-navigation.ts'),
            '$app/state': path.resolve('./src/tests/component/_app-state.ts'),
            // MediaInsertPopover imports deserialize from $app/forms to read the upload action
            // envelope; the real module exists only inside a kit app, so the component project
            // resolves it to a stub that runs the same JSON-then-devalue parse.
            '$app/forms': path.resolve('./src/tests/component/_app-forms.ts'),
            // content-routes-preview.ts value-imports mintPreview from preview.ts, so any
            // component test that wires createCairnAdmin/createContentRoutes (most of them) pulls
            // preview.ts's own $app/env import into this project's browser graph too, not
            // just the unit and integration projects.
            '$app/env': path.resolve('./src/tests/_app-env.ts'),
            // The same fake the unit project aliases; a component graph that reaches a
            // cloudflare:workers import resolves it here too.
            'cloudflare:workers': CLOUDFLARE_WORKERS_FAKE,
          },
        },
        // Pre-declare the spellchecker's wasm loader so Vite optimizes it during warm-up. On a
        // cold cache (CI), discovering it mid-run triggers "optimized dependencies changed.
        // reloading", which orphans every in-flight browser test; a warm local cache never hits
        // this, so the failure looked CI-only.
        optimizeDeps: {
          include: ['spellchecker-wasm/lib/browser/SpellcheckerWasm.js'],
        },
        test: {
          name: 'component',
          unstubGlobals: true,
          include: ['src/tests/component/**/*.test.ts'],
          setupFiles: ['./src/tests/component/_setup.ts', CLOUDFLARE_WORKERS_FAKE_SETUP],
          // Rebuilds dist/admin/cairn-admin.css before this project's test files start, so every
          // idiom-probe render, mutation, and TDD loop reads a fresh compiled sheet rather than a stale
          // one left over from a previous package build. A project's own globalSetup runs once, in
          // Node, ahead of its test files; an npm pre-step would not reach a direct `npx vitest run
          // --project component <file>` invocation, but this does.
          globalSetup: ['./src/tests/component/_global-setup.ts'],
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
            // The one Node-side escape hatch a browser-mode test needs: reading a file's mtime to
            // prove the sheet above is actually fresh (`_idiom-probe.test.ts`'s guard). A real
            // Chromium page has no fs access, so this runs server-side and the test calls it over
            // Vitest's own browser-command RPC.
            commands: {
              async mtimeMs(_context, relativePath: string) {
                return statSync(path.resolve(relativePath)).mtimeMs;
              },
            },
          },
        },
      },
    ],
  },
});
