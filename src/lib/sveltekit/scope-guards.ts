// The public route-gating primitives a developer composes on their own routes. loadPrincipal resolves
// the session on ANY route and memoizes it on locals; requireScope/requireAnyScope gate. Off /admin a
// developer opts in by calling these; the guard calls them under /admin. See the extensibility spec,
// "Composable gating on any route".
import { redirect, error } from '@sveltejs/kit';
import { resolvePrincipal } from '../auth/resolve.js';
import { sessionCookieName } from '../auth/crypto.js';
import { hasScope } from '../auth/scopes.js';
import { log } from '../log/index.js';
import type { Authorize } from '../auth/authorize.js';
import type { Principal } from '../auth/types.js';

/** What a gating call needs from the request event. RequestEvent and the engine event shapes satisfy it. */
interface GateEvent {
  url: URL;
  cookies: { get(name: string): string | undefined };
  locals: { principal?: Principal | null };
  platform?: { env?: { AUTH_DB?: import('@cloudflare/workers-types').D1Database } };
}

/** Dependencies a developer passes a gating call: their authorize callback, when any. */
export interface GateDeps {
  authorize?: Authorize;
}

interface GateOpts extends GateDeps {
  loginPath?: string;
}

/**
 * Resolve the logged-in principal on any route, or null. Reads nothing and queries no D1 when the
 * session cookie is absent. Memoizes on `locals.principal` so repeated calls in one request resolve once.
 *
 * WATCH (phase 2): under `/admin` the guard memoizes a principal resolved WITHOUT the developer
 * `authorize` callback (admin scopes only). A later `loadPrincipal`/`requireScope` on that same
 * `/admin` request returns that memoized principal, so a custom-scope check on an `/admin` route would
 * see only admin scopes and 403 a legitimate holder. Phase 1 has no custom-scope `/admin` routes, so
 * this is latent; the phase-2 admin-extension seam must resolve custom scopes explicitly (a fresh
 * resolve, or a memoization keyed by whether authorize ran) rather than rely on the guard's principal.
 */
export async function loadPrincipal(event: GateEvent, deps: GateDeps = {}): Promise<Principal | null> {
  if (event.locals.principal !== undefined) return event.locals.principal;
  const db = event.platform?.env?.AUTH_DB;
  const id = db ? event.cookies.get(sessionCookieName(event.url.protocol === 'https:')) : undefined;
  const principal = db && id
    ? await resolvePrincipal({ db, authorize: deps.authorize, platform: event.platform }, id, Date.now())
    : null;
  event.locals.principal = principal;
  return principal;
}

/** Gate a route on a single scope. Redirects when unauthenticated; 403s when missing the scope. */
export async function requireScope(event: GateEvent, scope: string, opts: GateOpts = {}): Promise<Principal> {
  return enforce(event, (p) => hasScope(p, scope), scope, opts);
}

/** Gate a route on holding any one of several scopes. */
export async function requireAnyScope(event: GateEvent, scopes: string[], opts: GateOpts = {}): Promise<Principal> {
  return enforce(event, (p) => scopes.some((s) => hasScope(p, s)), scopes.join('|'), opts);
}

async function enforce(
  event: GateEvent,
  ok: (p: Principal) => boolean,
  requested: string,
  opts: GateOpts,
): Promise<Principal> {
  const principal = await loadPrincipal(event, opts);
  if (!principal) {
    throw redirect(303, opts.loginPath ?? '/admin/login');
  }
  if (!ok(principal)) {
    log.warn('auth.scope.denied', { email: principal.email, scope: requested, path: event.url.pathname });
    throw error(403, 'Insufficient scope');
  }
  return principal;
}
