// Structural subsets of SvelteKit's RequestEvent. A site passes its real event, which has
// these and more, so the engine never imports a site's generated App.* ambient types.
import type { Editor } from '../auth/types.js';
import type { AccessMap } from '../auth/access.js';
import type { Backend } from '../github/backend.js';
import type { AdminActionAuditSink } from './admin-action.js';
import type { CairnEnv } from '../env.js';

/** The options `CookieJar.set` takes: standard cookie attributes, `path` required. */
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
 * The one structural event shape every engine load, action, and guard helper reads, parameterized
 * by the Worker env the surface needs (C2 breaking-window pass, R4 ruling): a real SvelteKit
 * `RequestEvent` or `ServerLoadEvent` carries every member here and more, and the engine never
 * imports a site's generated `App.*` ambient types, so any kit server event satisfies it with zero
 * casts. It replaces the five separately-declared event shapes cairn carried before the C2
 * breaking-window pass, one per surface (the shared core, the auth/editor routes, the content
 * routes, the admin facade, and `adminAction`): three names for one shape was the original defect,
 * and a fourth only compounded it.
 *
 * `params` and `route` end the documented anti-idiom of reading route identity out of a form
 * body: a real kit event always carries both, so requiring them costs a compliant site nothing
 * and gives a seam like `SectionActionOptions.target` an honest derivation. `route.id` is
 * nullable because kit's own is: `Handle` genuinely runs for an unmatched request (a 404, a
 * static asset), where kit reports `null`; a matched `load` or form action always sees a real
 * route id. `cookies` and `setHeaders` are required for the same reason (every kit server event
 * has both), where the shapes this type replaces required them only inconsistently.
 *
 * Deliberately defaulted to `CairnEnv`, not left unconstrained with no default (env-genericity
 * sweep, pre-beta C1 Task 2, re-confirmed by the R5 env-story ruling): a compile-only fixture
 * (`src/tests/unit/env-genericity.test.ts`) proves every engine factory built on this default
 * assigns clean into a site's own generated route event, under a realistic compliant
 * `App.Platform['env']` (`CairnPlatformBindings & CairnMediaBindings` plus a site binding, the
 * pattern `platform-bindings.ts` documents), with zero casts. `CairnPlatformBindings` shares
 * `AUTH_DB`/`EMAIL`/`PUBLIC_ORIGIN`/`GITHUB_APP_PRIVATE_KEY_B64` property names with `CairnEnv`,
 * which is exactly what keeps TypeScript's weak-type detection (TS2559) from rejecting the
 * assignment; a genuinely disjoint env (sharing no property names) still fails it, so the default
 * costs a compliant site nothing. A factory that genuinely needs its own env bindings (
 * `createSectionAction`) instantiates `CairnEvent<Env>` with an unconstrained, defaulted `Env` of
 * its own (R5) rather than widening this type itself.
 */
export interface CairnEvent<Env = CairnEnv> {
  url: URL;
  request: Request;
  params: Record<string, string>;
  route: { id: string | null };
  cookies: CookieJar;
  // Required so a site cannot silently drop the confirm page's Referrer-Policy header
  // (spec 7.1). A real SvelteKit RequestEvent always supplies it.
  setHeaders(headers: Record<string, string>): void;
  // The four members share the flat `cairn` prefix (C2 breaking-window pass, R2 ruling), so a
  // grep for one name finds every engine read in any repo with no namespace to peel back first.
  // `cairnBackend` is the per-request content store the dev-backend handle injects; the engine
  // resolves it ahead of the real provider, so typing it here makes the seam a checked contract
  // rather than a cast. A production request leaves it absent and the real `githubApp` provider
  // connects. `cairnAccess` is the site's declared access map, attached by the guard alongside
  // `cairnEditor`; it is internal (never serialized to a page payload) and exists only so
  // `requireAccess` needs no extra argument at the call site. `cairnAuditSink` is a site's
  // optional sink for `adminAction`'s audit records, wired the same way.
  locals: {
    cairnEditor?: Editor | null;
    cairnBackend?: Backend;
    cairnAuditSink?: AdminActionAuditSink;
    cairnAccess?: AccessMap;
  };
  platform?: PlatformContext<Env>;
}

/**
 * The `Handle` input `createAuthGuard` returns, chained to {@link CairnEvent}'s own `CairnEnv`
 * default, so it inherits that default's reasoning unchanged: a compile-only fixture proves the
 * returned `Handle` assigns into `sequence()` under a realistic compliant `App.Platform['env']`
 * with zero casts.
 */
export interface HandleInput {
  event: CairnEvent;
  resolve(event: CairnEvent): Promise<Response> | Response;
}
