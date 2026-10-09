// cairn-cms: the paths whose change reruns the whole component project instead of the tests
// `vitest related` selects for it. Two consumers read this one list: vitest.config.ts, which
// passes it to Vitest as `forceRerunTriggers` for a related or changed-file run, and
// scripts/checks/gate-tier.mjs, whose `--related` mode emits the full component command when a
// diff touches one of these paths. Keeping both on one list means the classifier and the tool
// cannot disagree about which change is too wide for a related selection.
//
// `vitest related` walks each test file's static import graph. Every entry below reaches the
// component tests some other way: through the Vitest config, a setup file, a build step, a
// fetched fixture, or a query-suffixed import (`?inline`, `?raw`) that the graph walk drops.

/**
 * Repo-relative globs, in `path.matchesGlob` syntax. Each one names a path that reaches the
 * component project outside the import graph.
 * @type {readonly string[]}
 */
export const COMPONENT_RERUN_TRIGGERS = Object.freeze([
  // The admin components feed the compiled admin sheet (the Tailwind content scan), which every
  // component test loads through a dist `?inline` import the graph walk drops.
  'src/lib/admin/**',
  // The shared admin components feed the same compiled sheet.
  'src/lib/admin-toolkit/**',
  // The sheet's builder and its input stylesheet; the component project's globalSetup runs them.
  'scripts/build/build-admin-css.mjs',
  'scripts/build/admin-css.input.css',
  // D1 schema and the worker test config, read by the Vitest config at load, never imported.
  'migrations/**',
  'wrangler.test.jsonc',
  // Project definitions, aliases, plugins, and compiler options every test file resolves through.
  '{vitest,vite}.config.*',
  'svelte.config.*',
  '**/tsconfig*.json',
  // Dependency versions, the exports map, and the scripts the test commands run.
  'package.json',
  'package-lock.json',
  // Setup, globalSetup, and module-alias stubs (`_setup.ts`, `_global-setup.ts`, `_app-*.ts`)
  // that the config wires into every test file outside its imports.
  'src/tests/**/_*.ts',
  // The fake `cloudflare:workers` module and its reset setup file, wired in by the config.
  'src/tests/helpers/**',
  // Fixture data a test reads as text or fetches, outside its import graph.
  'src/tests/**/fixtures/**',
]);
