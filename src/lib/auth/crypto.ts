// Token and session-id generation plus SHA-256 token hashing, on Web Crypto so the
// code runs unchanged in workerd. The store keeps only the hash of a token, never the
// token itself (spec 7.1).

/** The session cookie name. */
export const COOKIE_NAME = 'cairn_session';

/** Magic-link tokens live 10 minutes. */
export const TOKEN_TTL_MS = 10 * 60 * 1000;

/** Sessions live 30 days. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

/** The lowercase hex SHA-256 of a token, for storage and lookup. */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
