// The /admin guard, plus the per-load owner/session gates. A site's hooks.server.ts sets
// `export const handle = createAuthGuard()`. Events are typed structurally, so the engine
// stays free of a site's App.* ambient types.
import { redirect, error } from '@sveltejs/kit';
import { resolvePrincipal } from '../auth/resolve.js';
import { sessionCookieName } from '../auth/crypto.js';
import { hasAdminScope, hasScope, ADMIN_OWNER } from '../auth/scopes.js';
import { isUnsafeFormRequest, originMatches, validateCsrfToken, validateCsrfHeader } from './csrf.js';
import { applySecurityHeaders } from './admin-response.js';
import { renderConditionResponse, REASON_CONDITION } from './condition-response.js';
import { log } from '../log/index.js';
import type { Authorize } from '../auth/authorize.js';
import type { Principal } from '../auth/types.js';
import type { HandleInput, RequestContext } from './types.js';

/** The login page and the auth endpoints are public; everything else under /admin is gated. */
function isPublicAdminPath(pathname: string): boolean {
  return pathname === '/admin/login' || pathname.startsWith('/admin/auth/');
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/**
 * Local development (`wrangler dev`) legitimately speaks http; a deployed host does not. The hostname
 * comes from the client `Host` header, so this is UX only: it decides whether to show the help page,
 * never whether to grant access. The session gate below runs regardless. Do not make it an auth check.
 */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
}

/**
 * The SvelteKit `Handle` that guards `/admin/**` and hardens admin responses. `config.authorize`
 * carries the adapter's `auth.authorize` callback, accepted here as the wiring channel; the guard
 * deliberately does NOT invoke it (admin scopes come from the editor allowlist alone, which keeps
 * third-party code off the admin hot path; the lazy test pins this). Off-`/admin` routes resolve
 * custom scopes by calling `loadPrincipal`/`requireScope` with their own `authorize`. Having the guard
 * populate custom scopes off `/admin` is a phase-2 concern (see the `/admin` memoization note in
 * `scope-guards.ts`).
 */
export function createAuthGuard(config: { authorize?: Authorize } = {}) {
  return async function handle({ event, resolve }: HandleInput): Promise<Response> {
    const { pathname } = event.url;

    // Fail closed if the dev-backend flag is set in a deployed runtime. Read both env sources: a
    // Cloudflare Worker var lands on platform.env, an adapter-node OS var on process.env. A correct
    // production build already eliminated the dev backend (the consumer gates it on the build-foldable
    // `dev`), so a set flag signals a polluted environment; refuse loudly.
    const platformFlag = event.platform?.env?.CAIRN_DEV_BACKEND;
    const processFlag =
      typeof process !== 'undefined' ? process.env?.CAIRN_DEV_BACKEND : undefined;
    if (platformFlag === '1' || platformFlag === true || processFlag === '1') {
      log.error('guard.rejected', { reason: 'dev_backend_in_prod', path: pathname });
      return new Response(
        'cairn: the dev backend flag is set in a deployed environment. Unset CAIRN_DEV_BACKEND.',
        { status: 503 },
      );
    }

    const cookieName = sessionCookieName(event.url.protocol === 'https:');
    const hasSessionCookie = event.cookies.get(cookieName) != null;

    // Rule 2 - non-admin: CSRF still applies to an unsafe form POST that carries a session cookie, so
    // member form-actions are protected even though they live outside /admin. With no session cookie,
    // restore the framework's strict Origin check the consumer disabled via checkOrigin: false.
    if (!isAdminPath(pathname)) {
      if (isUnsafeFormRequest(event.request)) {
        if (hasSessionCookie) {
          if (!validateCsrfHeader(event) && !(await validateCsrfToken(event))) {
            log.warn('guard.rejected', { reason: 'csrf', path: pathname });
            return renderConditionResponse('auth.csrf-token-invalid');
          }
        } else if (!originMatches(event)) {
          log.warn('guard.rejected', { reason: 'origin', path: pathname });
          return renderConditionResponse('auth.csrf-origin-mismatch');
        }
      }
      return resolve(event);
    }

    // A deployed admin request over http never works: the magic-link form POST would fail the
    // framework's CSRF guard with an opaque 403. Serve the help page instead, before resolve()
    // runs that check. This covers the public login/auth paths too, since that is where the form
    // posts. Local http (wrangler dev) is exempt.
    if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
      log.warn('guard.rejected', { reason: 'https', path: pathname });
      return renderConditionResponse('edge.https-not-forced', { url: event.url });
    }

    // No auth store binding means no admin path can work: the gated views cannot resolve a
    // session, and a login or confirm POST would die in its action with a raw 500. That is an
    // operator fault, not a sign-in problem, so name the condition on every admin path, the
    // public ones included, instead of rendering a login form that can never succeed.
    const env = event.platform?.env ?? {};
    if (!env.AUTH_DB) {
      log.error('guard.rejected', {
        reason: 'bindings',
        conditionId: REASON_CONDITION.bindings,
        path: pathname,
      });
      return renderConditionResponse(REASON_CONDITION.bindings);
    }

    // Rule 1 - admin: every unsafe form POST carries a valid double-submit token, else the branded
    // 403 before resolve() runs. This covers the public login/auth posts too. The header witness is
    // tried first: a valid X-Cairn-CSRF header clears the request without cloning the body, which is
    // how the raw-body media upload (a text/plain POST) passes CSRF. A custom header cannot be set
    // cross-origin without a CORS preflight, so it is as strong a token witness as the form field.
    // Only with no valid header does the form-field path run and clone the body to read the token,
    // the unchanged path for every ordinary admin form post.
    if (
      isUnsafeFormRequest(event.request) &&
      !validateCsrfHeader(event) &&
      !(await validateCsrfToken(event))
    ) {
      log.warn('guard.rejected', { reason: 'csrf', path: pathname });
      return renderConditionResponse('auth.csrf-token-invalid');
    }

    if (!isPublicAdminPath(pathname)) {
      const id = event.cookies.get(cookieName);
      // Lazy on /admin: pass authorize: undefined here. /admin needs only admin:* scopes, which come
      // from the allowlist row, so the developer callback (and its D1) is not run to admit an admin
      // request. A custom-scope admin route resolves it explicitly via loadPrincipal (phase 2).
      const principal = id
        ? await resolvePrincipal({ db: env.AUTH_DB, authorize: undefined, platform: event.platform }, id, Date.now())
        : null;
      // /admin requires an admin-tier session carrying an admin scope. A member-tier session, or a
      // scopeless principal, is bounced to login: the allowlist and tier are the structural gate.
      if (!principal || principal.tier !== 'admin' || !hasAdminScope(principal)) {
        throw redirect(303, '/admin/login');
      }
      event.locals.principal = principal;
    }
    const response = await resolve(event);
    applySecurityHeaders(response.headers);
    return response;
  };
}

/**
 * For a protected load/action: the principal the guard already resolved, or a login redirect.
 *  The parameter is the minimal structural need (just `locals`), so every engine event shape
 *  (RequestContext, the content routes' ContentEvent) and a real RequestEvent all satisfy it.
 */
export function requireSession(event: { locals: { principal?: Principal | null } }): Principal {
  const principal = event.locals.principal;
  if (!principal) throw redirect(303, '/admin/login');
  return principal;
}

/** For the management surface: a signed-in owner, or 403 for an editor. */
export function requireOwner(event: RequestContext): Principal {
  const principal = requireSession(event);
  if (!hasScope(principal, ADMIN_OWNER)) throw error(403, 'Owner access required');
  return principal;
}
