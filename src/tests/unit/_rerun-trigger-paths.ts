/**
 * One real repo path for each entry of the component rerun trigger list, in list order. The
 * classifier test and the trigger canary both check the list against it, so an entry added
 * without a row here fails both.
 */
export const RERUN_TRIGGER_PATHS = [
  'src/lib/admin/EditPage.svelte',
  'src/lib/admin-toolkit/AdminTable.svelte',
  'scripts/build/build-admin-css.mjs',
  'scripts/build/admin-css.input.css',
  'migrations/0001_roles.sql',
  'wrangler.test.jsonc',
  'vitest.config.ts',
  'svelte.config.js',
  'src/tests/types/tsconfig.json',
  'package.json',
  'package-lock.json',
  'src/tests/_app-env.ts',
  'src/tests/component/_setup.ts',
  'src/tests/helpers/test-event.ts',
  'src/tests/component/fixtures/admin-table-baseline.html',
];
