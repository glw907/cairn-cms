// cairn-cms: the engine's one read of the Worker's bindings. Every engine surface that needs a
// binding, a var, or the background-task hook reads it here, and this is the engine's only
// `cloudflare:workers` import. That module exists only where a Worker runs (workerd, or the
// Cloudflare adapter's Vite stub under `vite dev`), so nothing reachable from a Node-context entry
// (`.`, `/admin`, `/public`, `/vite`, `/cloudflare`, `/auth-crypto`, `/log`, the bins) may import
// this file; `src/tests/unit/workers-env-reach.test.ts` walks the built package to hold that.
//
// The module takes no event and layers nothing. A dev handle that supplies binding doubles wraps
// `resolve` in the runtime's own `withEnv`, and every read here sees the wrapped set for the rest of
// that request. While a build prerenders, any `env` read throws, so a caller that can run during
// prerender checks `building` first (see `isBuilding` in `./building.ts`).
import { env as workerEnv, waitUntil as workerWaitUntil } from 'cloudflare:workers';
import type { CairnPlatformBindings } from './platform-bindings.js';

/**
 * The Worker env as the engine reads it: the bindings {@link CairnPlatformBindings} names, plus a
 * string-keyed view for the reads whose binding name is configuration (the media bucket, through
 * `requireBucket`) or a flag the site never declares (`CAIRN_DEV_BACKEND`). Every member is read
 * as possibly absent at runtime, since a site's Worker may not carry a binding its types claim.
 */
export type WorkerEnv = CairnPlatformBindings & Readonly<Record<string, unknown>>;

/**
 * The current request's Worker env. The site's own generated `Env` describes this object; the
 * engine cannot name that type, so it reads it through the bindings it requires.
 */
export const env: WorkerEnv = workerEnv as unknown as WorkerEnv;

/**
 * The Worker env as a site's own `Env` type, for the config callbacks a site declares against it
 * (`resolveDb`, `deliver`, `lookup`, a rate-limit `resolve`). The engine cannot name a site's
 * generated type, so this one widening is where the site's `Env` is taken at its word as the
 * description of its Worker.
 */
export function siteEnv<Env>(): Env {
  return workerEnv as unknown as Env;
}

/**
 * Hand a promise to the runtime so the Worker stays alive until it settles, after the response has
 * gone. The caller attaches its own `.catch()` first; a rejection here has no other observer.
 */
export function waitUntil(promise: Promise<unknown>): void {
  workerWaitUntil(promise);
}
