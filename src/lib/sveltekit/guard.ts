// The /admin guard, plus the per-load owner/session gates. A site's hooks.server.ts sets
// `export const handle = createAuthGuard()`. Events are typed structurally, so the engine
// stays free of a site's App.* ambient types.
import { redirect, error } from '@sveltejs/kit';
import { resolveSession } from '../auth/store.js';
import { sessionCookieName } from '../auth/crypto.js';
import { httpsRequiredPage } from './https-required-page.js';
import { isUnsafeFormRequest, originMatches, validateCsrfToken } from './csrf.js';
import { csrfRequiredPage } from './csrf-required-page.js';
import { log } from '../log/index.js';
import type { Editor } from '../auth/types.js';
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
 * Attach the baseline security headers to an admin response. No full CSP; see the auth-hardening
 * design. frame-ancestors is the modern clickjacking control and the one CSP directive included.
 */
function applySecurityHeaders(headers: Headers): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', "frame-ancestors 'none'");
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

/** A branded full-document admin page, hardened with the baseline headers and never cached. */
function brandedAdminPage(status: number, body: string): Response {
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  applySecurityHeaders(headers);
  return new Response(body, { status, headers });
}

/** The hardened 400 help page for a deployed admin request that arrived over http. */
function httpsRequiredResponse(url: URL): Response {
  const httpsUrl = new URL(url);
  httpsUrl.protocol = 'https:';
  return brandedAdminPage(400, httpsRequiredPage(httpsUrl.toString()));
}

/** A plain 403 for a non-admin cross-origin form POST, matching the framework's wording. */
function csrfForbidden(): Response {
  return new Response('Cross-site POST form submissions are forbidden', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/** The branded 403 for a failed admin double-submit token check. */
function csrfRequiredResponse(): Response {
  return brandedAdminPage(403, csrfRequiredPage());
}

/** The SvelteKit `Handle` that guards `/admin/**` and hardens admin responses. */
export function createAuthGuard() {
  return async function handle({ event, resolve }: HandleInput): Promise<Response> {
    const { pathname } = event.url;

    // Rule 2 - non-admin: restore the framework's strict Origin check the consumer disabled when
    // they set checkOrigin: false to hand cairn the admin CSRF authority.
    if (!isAdminPath(pathname)) {
      if (isUnsafeFormRequest(event.request) && !originMatches(event)) {
        log.warn('guard.rejected', { reason: 'origin', path: pathname });
        return csrfForbidden();
      }
      return resolve(event);
    }

    // A deployed admin request over http never works: the magic-link form POST would fail the
    // framework's CSRF guard with an opaque 403. Serve the help page instead, before resolve()
    // runs that check. This covers the public login/auth paths too, since that is where the form
    // posts. Local http (wrangler dev) is exempt.
    if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
      log.warn('guard.rejected', { reason: 'https', path: pathname });
      return httpsRequiredResponse(event.url);
    }

    // Rule 1 - admin: every unsafe form POST carries a valid double-submit token, else the branded
    // 403 before resolve() runs. This covers the public login/auth posts too.
    if (isUnsafeFormRequest(event.request) && !(await validateCsrfToken(event))) {
      log.warn('guard.rejected', { reason: 'csrf', path: pathname });
      return csrfRequiredResponse();
    }

    if (!isPublicAdminPath(pathname)) {
      const env = event.platform?.env ?? {};
      const id = event.cookies.get(sessionCookieName(event.url.protocol === 'https:'));
      const editor = id && env.AUTH_DB ? await resolveSession(env.AUTH_DB, id, Date.now()) : null;
      if (!editor) throw redirect(303, '/admin/login');
      event.locals.editor = editor;
    }
    const response = await resolve(event);
    applySecurityHeaders(response.headers);
    return response;
  };
}

/** For a protected load/action: the session the guard already resolved, or a login redirect. */
export function requireSession(event: RequestContext): Editor {
  const editor = event.locals.editor;
  if (!editor) throw redirect(303, '/admin/login');
  return editor;
}

/** For the management surface: a signed-in owner, or 403 for an editor. */
export function requireOwner(event: RequestContext): Editor {
  const editor = requireSession(event);
  if (editor.role !== 'owner') throw error(403, 'Owner access required');
  return editor;
}
