// cairn owns CSRF for the admin once a site disables SvelteKit's global checkOrigin. These helpers
// back the guard's two rules and the loads that issue the double-submit token. See
// docs/superpowers/specs/2026-06-08-cairn-login-csrf-ownership-design.md.
import { csrfCookieName, generateCsrfToken, tokensMatch, SESSION_TTL_MS } from '../auth/crypto.js';
import type { CairnEvent, CookieJar } from './types.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_CONTENT_TYPES = new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);

// Mirrors guard.ts's own isLocalHost (duplicated, not imported: guard.ts already imports this
// module, so importing back would be circular, and auth-channel/factory.ts's own copy already
// documents the same tradeoff). The audit's coherence-thirteen tracks collapsing every copy onto
// one export in a later pass; keep this list in sync with guard.ts by hand until then.
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
 * Decide the CSRF cookie pair's Secure bit for one request, the single source every writer and
 * reader uses: {@link issueCsrfToken}, {@link validateCsrfHeader}, {@link validateCsrfToken}, and
 * `admin-action.ts`'s inline defense-in-depth check. Feed the result to `csrfCookieName` for the
 * matching cookie name.
 *
 * A local-host request (guard.ts's own `isLocalHost` list) always derives from the request's own
 * protocol: a production `PUBLIC_ORIGIN` must never mint a `__Host-` cookie over
 * `http://localhost`, which local dev cannot honor. Otherwise `PUBLIC_ORIGIN` decides, when it is
 * configured and parses as a URL; the request's own protocol is the fallback for every other case
 * (no `PUBLIC_ORIGIN` configured, such as a bare unit-test event, or one that fails to parse),
 * matching the cookie a real deploy will actually set.
 */
export function csrfSecure(event: {
  url: URL;
  platform?: { env?: { PUBLIC_ORIGIN?: string } };
}): boolean {
  if (isLocalHost(event.url.hostname)) return event.url.protocol === 'https:';
  const origin = event.platform?.env?.PUBLIC_ORIGIN;
  if (origin) {
    try {
      return new URL(origin).protocol === 'https:';
    } catch {
      // Malformed PUBLIC_ORIGIN falls through to the request's own protocol below.
    }
  }
  return event.url.protocol === 'https:';
}

/** True for a request SvelteKit's CSRF guard screens: an unsafe method with a form content type. */
export function isUnsafeFormRequest(request: Request): boolean {
  if (!UNSAFE_METHODS.has(request.method)) return false;
  const type = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  return FORM_CONTENT_TYPES.has(type);
}

/** The faithful framework check: the Origin header equals the request's own origin. */
export function originMatches(event: Pick<CairnEvent, 'url' | 'request'>): boolean {
  return event.request.headers.get('origin') === event.url.origin;
}

/**
 * Return the session's CSRF token, minting it when absent and re-anchoring its `Max-Age` on every
 * call while present. Lazy and stable: a second open admin tab reuses the same value, so its form
 * field still matches the cookie, since re-anchoring only re-sends the existing value with a fresh
 * expiry and never rotates it. HttpOnly, `SameSite=Lax` (explicit, never attribute-omission: an
 * omitted `SameSite` gets Chrome's Lax-allowing-unsafe treatment for two minutes, and this token
 * mints moments before the form's own POST), `Max-Age` matching the session's own lifetime so the
 * pair lives and dies together, and `__Host-` when {@link csrfSecure} resolves this request as
 * Secure.
 *
 * Re-anchoring, not rotation, matters here: a one-shot `Max-Age` would expire the cookie mid
 * session and force a re-mint (a NEW value), which would silently invalidate every other open
 * tab's already-rendered form field. Re-setting the identical value with a fresh `Max-Age` keeps
 * every tab in sync while still letting the cookie outlive a single page load.
 */
export function issueCsrfToken(event: {
  url: URL;
  cookies: CookieJar;
  platform?: { env?: { PUBLIC_ORIGIN?: string } };
}): string {
  const secure = csrfSecure(event);
  const name = csrfCookieName(secure);
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const existing = event.cookies.get(name);
  const token = existing ?? generateCsrfToken();
  event.cookies.set(name, token, { path: '/', httpOnly: true, secure, sameSite: 'lax', maxAge });
  return token;
}

/**
 * Validate the double-submit token on a raw-body upload POST, reading the submitted token from the
 * `X-Cairn-CSRF` request header rather than a form field. The upload's file bytes are the request
 * body and are read once, so the form-field path (which clones the body to read `formData`) does not
 * apply; the action carries the CSRF authority for uploads instead. Compares the header against the
 * csrf cookie the loads issue, constant-time.
 *
 * Security rests on a custom request header being unsettable cross-origin without a CORS preflight:
 * never add a permissive `Access-Control-Allow-Headers: x-cairn-csrf` (or an allow-origin) for
 * `/admin` or `/media`, or this header witness collapses.
 */
export function validateCsrfHeader(event: {
  url: URL;
  request: Request;
  cookies: CookieJar;
  platform?: { env?: { PUBLIC_ORIGIN?: string } };
}): boolean {
  const cookie = event.cookies.get(csrfCookieName(csrfSecure(event)));
  if (!cookie) return false;
  const submitted = event.request.headers.get('x-cairn-csrf') ?? '';
  return tokensMatch(submitted, cookie);
}

/** Validate the double-submit token on an admin form POST, reading the field from a body clone. */
export async function validateCsrfToken(event: CairnEvent): Promise<boolean> {
  const cookie = event.cookies.get(csrfCookieName(csrfSecure(event)));
  if (!cookie) return false;
  let submitted = '';
  try {
    const form = await event.request.clone().formData();
    submitted = String(form.get('csrf') ?? '');
  } catch {
    return false;
  }
  return tokensMatch(submitted, cookie);
}
