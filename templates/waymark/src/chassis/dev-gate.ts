// The runtime half of this site's dev-backend gate, read by hooks.server.ts,
// cairn.server.ts, and the three /test fixture routes. The gate has two halves and they live
// apart on purpose.
//
// The build-time half is `__CAIRN_DEV_BUILD__`, a Vite `define` (see vite.config.ts). Vite
// substitutes it as a literal into the text of every module that names it, so `if
// (__CAIRN_DEV_BUILD__ && devBackendOptIn())` folds at the call site itself and Rollup drops the
// dead branch with its dynamic `@glw907/cairn-cms-dev` import. Keep every call site naming the
// define directly. Exporting one shared `const devBackendEnabled` from here does NOT work:
// SvelteKit's SSR build folds the constant inside this chunk but does not propagate the value into
// the consuming chunk, which keeps its `if` and its import, so the whole dev backend rides into the
// deployable Worker. The e2e and scaffold workflows grep `wrangler deploy --dry-run` output both
// ways to catch a regression.
//
// The runtime half is below. It reads an environment variable that no build can know, so it has
// nothing to fold and one shared home costs nothing.
import { env } from 'cloudflare:workers';

/**
 * True when the operator opted this process into the dev backend with `CAIRN_DEV_BACKEND=1`.
 * @remarks
 * Always call this behind `__CAIRN_DEV_BUILD__`, never alone: the define is what keeps the dev
 * package out of a default production build.
 *
 * The flag has two homes, and the gate reads both. Under `wrangler dev`, the e2e run's server,
 * it is a Worker var (`--var CAIRN_DEV_BACKEND:1`), read from the Worker env the way the engine
 * reads it. Under `vite dev` the server code runs in Node, where the adapter's platform proxy
 * builds the Worker env from the Wrangler config and its local vars file (`.dev.vars`, or `.env`
 * when that is absent), never from the shell unless `CLOUDFLARE_INCLUDE_PROCESS_ENV` is set, so the
 * variable `npm run dev` sets reaches only `process.env`.
 */
export function devBackendOptIn(): boolean {
  return (
    workerFlag() === '1' ||
    (typeof process !== 'undefined' && process.env?.CAIRN_DEV_BACKEND === '1')
  );
}

/**
 * The flag as the Worker env carries it, or undefined while a build prerenders, when the adapter's
 * stand-in for `cloudflare:workers` throws on every read.
 */
function workerFlag(): string | undefined {
  try {
    return env.CAIRN_DEV_BACKEND;
  } catch {
    return undefined;
  }
}
