// Structural subsets of SvelteKit's RequestEvent. A site passes its real event, which has
// these and more, so the engine never imports a site's generated App.* ambient types.
import type { Editor } from '../auth/types.js';
import type { AccessMap } from '../auth/access.js';
import type { Backend } from '../github/backend.js';
import type { CairnEnv } from '../env.js';

export interface CookieSetOptions {
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
}

export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, opts: CookieSetOptions): void;
  delete(name: string, opts: { path: string }): void;
}

/**
 * The Cloudflare platform wrapper an event carries. The engine reads only `env`; a site's own
 * `App.Platform` type is free to carry `ctx` (or any other member) alongside it, since a real
 * SvelteKit `RequestEvent` has more than this structural subset and still satisfies it.
 */
export interface PlatformContext<Env> {
  env?: Env;
}

/**
 * The structural core every engine event type extends, parameterized by the Worker env the
 *  surface reads. Each shared field is defined once here; the extensions add only what their
 *  surface needs (cookies, params, setHeaders).
 */
export interface EventBase<Env> {
  url: URL;
  request: Request;
  // `backend` is the per-request content store the dev-backend handle injects; the engine resolves
  // it ahead of the real provider, so typing it here makes the seam a checked contract rather than a
  // cast. A production request leaves it absent and the real `githubApp` provider connects.
  // `cairnAccess` is the site's declared access map, attached by the guard alongside `editor`; it is
  // internal (never serialized to a page payload) and exists only so `requireAccess` needs no extra
  // argument at the call site.
  locals: { editor?: Editor | null; backend?: Backend; cairnAccess?: AccessMap };
  platform?: PlatformContext<Env>;
}

/**
 * Deliberately pinned to `CairnEnv`, not generic over a site's own `Env` (env-genericity sweep,
 * pre-beta C1 Task 2): a compile-only fixture proving `createAuthRoutes` and `createEditorRoutes`
 * against a site's own generated route event, under a realistic compliant `App.Platform['env']`
 * (`CairnPlatformBindings & CairnMediaBindings` plus a site binding, the pattern
 * `platform-bindings.ts` documents), assigns clean with zero casts. `CairnPlatformBindings`
 * shares `AUTH_DB`/`EMAIL`/`PUBLIC_ORIGIN` property names with `CairnEnv`, which is exactly what
 * keeps TypeScript's weak-type detection (TS2559) from rejecting the assignment; a genuinely
 * disjoint env (sharing no property names) still fails it, so the pin costs a compliant site
 * nothing. Adding a type parameter here would be public surface with no fixture forcing it.
 */
export interface RequestContext extends EventBase<CairnEnv> {
  cookies: CookieJar;
  // Required so a site cannot silently drop the confirm page's Referrer-Policy header
  // (spec 7.1). A real SvelteKit RequestEvent always supplies it.
  setHeaders(headers: Record<string, string>): void;
}

/**
 * Chained to {@link RequestContext}'s own `CairnEnv` pin, so it inherits that pin's reasoning
 * unchanged: a compile-only fixture proves `createAuthGuard`'s returned `Handle` assigns into
 * `sequence()` under a realistic compliant `App.Platform['env']` with zero casts. See
 * `RequestContext`'s doc comment for why the pin is safe.
 */
export interface HandleInput {
  event: RequestContext;
  resolve(event: RequestContext): Promise<Response> | Response;
}
