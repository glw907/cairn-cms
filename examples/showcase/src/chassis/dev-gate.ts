// cairn-cms: the runtime half of the showcase's dev-backend gate, read by hooks.server.ts,
// cairn.server.ts, and the three /test fixture routes. The gate has two halves and they live
// apart on purpose.
//
// The build-time half is `__CAIRN_DEV_BUILD__`, a Vite `define` (see vite.config.ts). Vite
// substitutes it as a literal into the text of every module that names it, so `if
// (__CAIRN_DEV_BUILD__ && devBackendOptIn())` folds at the call site itself and Rollup drops the
// dead branch with its dynamic `@glw907/cairn-cms-dev` import. Keep every call site naming the
// define directly. Exporting one shared `const devBackendEnabled` from here does NOT work, and was
// the earlier shape: SvelteKit's SSR build folds the constant inside this chunk but does not
// propagate the value into the consuming chunk, which keeps its `if` and its import, so the whole
// dev backend rode into the deployable Worker. Verified against `wrangler deploy --dry-run` output
// on 2026-08-04; the e2e and scaffold workflows now grep that artifact both ways.
//
// The runtime half is below. It reads an environment variable that no build can know, so it has
// nothing to fold and one shared home costs nothing.

/**
 * True when the operator opted this process into the dev backend with `CAIRN_DEV_BACKEND=1`.
 *
 * @remarks
 * Always call this behind `__CAIRN_DEV_BUILD__`, never alone: the define is what keeps the dev
 * package out of a default production build.
 */
export function devBackendOptIn(): boolean {
  return process.env.CAIRN_DEV_BACKEND === '1';
}
