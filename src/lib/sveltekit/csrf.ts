// cairn owns CSRF for the admin once a site disables SvelteKit's global checkOrigin. These helpers
// back the guard's two rules and the loads that issue the double-submit token. See
// docs/superpowers/specs/2026-06-08-cairn-login-csrf-ownership-design.md.
import { csrfCookieName, generateCsrfToken } from '../auth/crypto.js';
import type { CookieJar, RequestContext } from './types.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_CONTENT_TYPES = new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);

/** True for a request SvelteKit's CSRF guard screens: an unsafe method with a form content type. */
export function isUnsafeFormRequest(request: Request): boolean {
  if (!UNSAFE_METHODS.has(request.method)) return false;
  const type = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  return FORM_CONTENT_TYPES.has(type);
}

/** The faithful framework check: the Origin header equals the request's own origin. */
export function originMatches(event: Pick<RequestContext, 'url' | 'request'>): boolean {
  return event.request.headers.get('origin') === event.url.origin;
}

/** A length-checked constant-time compare, so the token check leaks no timing. */
export function tokensMatch(a: string, b: string): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Return the session's CSRF token, minting and setting it when absent. Lazy and stable: a second
 * open admin tab reuses the same value, so its form field still matches the cookie. Session-scoped
 * (no maxAge), HttpOnly (the server sets both halves), SameSite=Strict, and __Host- on https.
 */
export function issueCsrfToken(event: { url: URL; cookies: CookieJar }): string {
  const secure = event.url.protocol === 'https:';
  const name = csrfCookieName(secure);
  const existing = event.cookies.get(name);
  if (existing) return existing;
  const token = generateCsrfToken();
  event.cookies.set(name, token, { path: '/', httpOnly: true, secure, sameSite: 'strict' });
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
export function validateCsrfHeader(event: { url: URL; request: Request; cookies: CookieJar }): boolean {
  const cookie = event.cookies.get(csrfCookieName(event.url.protocol === 'https:'));
  if (!cookie) return false;
  const submitted = event.request.headers.get('x-cairn-csrf') ?? '';
  return tokensMatch(submitted, cookie);
}

/** Validate the double-submit token on an admin form POST, reading the field from a body clone. */
export async function validateCsrfToken(event: RequestContext): Promise<boolean> {
  const cookie = event.cookies.get(csrfCookieName(event.url.protocol === 'https:'));
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
