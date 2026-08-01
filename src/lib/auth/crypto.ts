// cairn-cms: token and session-id generation plus SHA-256 token hashing, on Web Crypto so the
// code runs unchanged in workerd. The store keeps only the hash of a token, never the
// token itself (spec 7.1).

/** The base session cookie name, prefixed with __Host- when the cookie is Secure. */
const COOKIE_BASE = 'cairn_session';

/**
 * The session cookie name. On https the cookie is Secure and takes the __Host- prefix, which
 * binds it to the origin (the browser enforces Secure, Path=/, and no Domain). On local http
 * dev the prefix is dropped, since __Host- requires Secure and the dev cookie cannot set it.
 */
export function sessionCookieName(secure: boolean): string {
  return cookieName(COOKIE_BASE, secure);
}

/** The CSRF double-submit cookie base name, __Host- prefixed when the cookie is Secure. */
const CSRF_COOKIE_BASE = 'cairn_csrf';

/** The CSRF cookie name, mirroring sessionCookieName: __Host- on https, bare on local http. */
export function csrfCookieName(secure: boolean): string {
  return cookieName(CSRF_COOKIE_BASE, secure);
}

// RFC 6265 cookie-name is an HTTP token: no separators, no CTLs, no whitespace.
const COOKIE_TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * Build a cookie name, applying the __Host- prefix discipline. A browser accepts a __Host-
 * cookie only when the response also sets Secure, Path=/, and omits Domain; the caller owns
 * those attributes, this function owns only the name.
 *
 * `secure` must reflect the scheme the browser itself sees. Behind upstream TLS termination
 * (a reverse proxy, a platform edge), `url.protocol` is not that scheme; derive `secure` from
 * the externally visible one instead.
 *
 * `base` must not already carry a __Host- or __Secure- prefix (double-prefixing is a cookie
 * the browser silently rejects, not a runtime error, so this throws instead) or a character
 * outside the cookie-name token set. Bases starting `cairn_` are the engine's reserved
 * namespace: the engine's own cookie names delegate through this function, and a site base in
 * that namespace does not throw, but risks colliding with an engine cookie.
 */
export function cookieName(base: string, secure: boolean): string {
  if (base.startsWith('__Host-') || base.startsWith('__Secure-')) {
    throw new Error(
      `cookieName: base "${base}" already carries a __Host- or __Secure- prefix; pass the unprefixed base and let cookieName apply it`,
    );
  }
  if (!COOKIE_TOKEN_RE.test(base)) {
    throw new Error(
      `cookieName: base "${base}" contains a character outside the RFC 6265 cookie-name token set`,
    );
  }
  return secure ? `__Host-${base}` : base;
}

/** Magic-link tokens live 10 minutes. */
export const TOKEN_TTL_MS = 10 * 60 * 1000;

/** Sessions live 30 days. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** A magic link is sent at most once per email per minute, to throttle inbox flooding. */
export const SEND_COOLDOWN_MS = 60 * 1000;

function randomBase64Url(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** A fresh 256-bit magic-link token, url-safe. */
export function generateToken(): string {
  return randomBase64Url(32);
}

/** A fresh 256-bit session id, url-safe. */
export function generateSessionId(): string {
  return randomBase64Url(32);
}

/** A fresh 256-bit double-submit token, url-safe. */
export function generateCsrfToken(): string {
  return randomBase64Url(32);
}

/** The lowercase hex SHA-256 of a token, for storage and lookup. */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type SubtleWithTimingSafeEqual = SubtleCrypto & {
  timingSafeEqual?: (a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView) => boolean;
};

/**
 * A length-checked constant-time compare, so a token check leaks no timing beyond length.
 *
 * Three properties a caller must know: it leaks length (a mismatch on length is a cheap,
 * non-constant-time reject, since length is not a secret); `tokensMatch('', '')` is
 * deliberately false, so an unset expected value can never accept an unset submitted one; and
 * it is meant only for fixed-length CSPRNG tokens and hex hashes, never for a password or
 * anything an attacker can enumerate.
 */
export function tokensMatch(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length === 0 || aBytes.length !== bBytes.length) return false;

  const subtle = crypto.subtle as SubtleWithTimingSafeEqual;
  if (typeof subtle.timingSafeEqual === 'function') {
    return subtle.timingSafeEqual(aBytes, bBytes);
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}
