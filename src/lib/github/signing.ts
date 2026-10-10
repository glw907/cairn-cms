// cairn-cms: the GitHub App auth path. Mint an RS256 App JWT signed in-Worker with Web
// Crypto, exchange it for a short-lived installation access token, and self-test the
// brittle key conversion. GitHub issues PKCS#1 private keys and Web Crypto's importKey
// takes only PKCS#8, so the key is wrapped in-process. No octokit: it is heavy and pulls
// Node built-ins the Worker bundle should not carry.
import type { AppCredentials } from './types.js';

const API = 'https://api.github.com';
const encoder = new TextEncoder();

/** Encode bytes as unpadded base64url (RFC 4648 §5), the JWT wire format. */
function bytesToB64url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

// TextEncoder/atob produce Uint8Arrays whose generic buffer type no longer satisfies Web
// Crypto's BufferSource under strict lib types; hand the underlying ArrayBuffer over.
function buf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** DER length octets for a value of `n` bytes (short form `< 128`, else long form). */
function derLength(n: number): number[] {
  if (n < 0x80) return [n];
  const out: number[] = [];
  for (let v = n; v > 0; v >>= 8) out.unshift(v & 0xff);
  return [0x80 | out.length, ...out];
}

// AlgorithmIdentifier for rsaEncryption (OID 1.2.840.113549.1.1.1) with NULL parameters.
const RSA_ALG_ID = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];

/** Wrap a PKCS#1 RSAPrivateKey (DER) as PKCS#8 (the only RSA form Web Crypto importKey takes). */
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const octet = [0x04, ...derLength(pkcs1.length), ...pkcs1];
  const body = [0x02, 0x01, 0x00, ...RSA_ALG_ID, ...octet];
  return Uint8Array.from([0x30, ...derLength(body.length), ...body]);
}

/** Decode a PEM private key to PKCS#8 DER, converting from PKCS#1 (GitHub's format) if needed. */
function pemToPkcs8(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return pem.includes('RSA PRIVATE KEY') ? pkcs1ToPkcs8(der) : der;
}

/** Mint a GitHub App JWT (RS256), valid ~9 min, with `iat` backdated for clock skew. */
export async function appJwt(appId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = bytesToB64url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = bytesToB64url(encoder.encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    buf(pemToPkcs8(privateKeyPem)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, buf(encoder.encode(signingInput)));
  return `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
}

/**
 * GitHub refused the installation-token exchange. `status` is the HTTP status of the refusal, so a
 * caller can classify it without parsing the message; the message keeps its status-bearing wording
 * for the log records that carry it as a string.
 */
export class InstallationTokenError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`GitHub installation token failed: ${status}`);
    this.name = 'InstallationTokenError';
    this.status = status;
  }
}

/**
 * Exchange the App JWT for a short-lived installation access token. `signal`, when given, aborts the
 * token request; the publishing path passes none, so its mint keeps no deadline of its own.
 * @throws InstallationTokenError when GitHub answers the exchange with a non-OK status.
 */
export async function installationToken(creds: AppCredentials, signal?: AbortSignal): Promise<string> {
  const jwt = await appJwt(creds.appId, atob(creds.privateKeyB64));
  const res = await fetch(`${API}/app/installations/${creds.installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${jwt}`,
      'User-Agent': 'cairn-cms',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal,
  });
  if (!res.ok) throw new InstallationTokenError(res.status);
  return ((await res.json()) as { token: string }).token;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Build an installation-token cache. A module-global instance memoizes the minted token per
 * installation for most of its one-hour life, so a warm Worker isolate reuses it across requests
 * instead of re-signing and re-calling GitHub on every list and commit. A cold isolate re-mints,
 * which is always safe. This mirrors the default of `@octokit/auth-app`, which caches installation
 * tokens in memory and returns them until expiry. The TTL stays under GitHub's documented one-hour
 * lifetime, so a fixed margin avoids parsing the API expiry. `mint` and `now` are injected so the
 * cache is testable with no network call and no real clock.
 *
 * The cache stores only a resolved token, never the in-flight mint promise, and this is load
 * bearing. Under Cloudflare Workers, a request's outstanding subrequests are canceled once its
 * response completes; a mint fetch caught mid-flight by a fast-returning handler (for example a
 * redirecting admin view) can be canceled this way, and the promise it left behind never settles.
 * A cache keyed on that promise would then serve the dead promise to every later caller in the
 * isolate, and each would await it for the full TTL with no way out. See
 * `docs/internal/2026-07-13-admin-token-cache-poisoning.md` for the production incident this
 * traces to. Two concurrent misses on a cold isolate therefore each mint their own token rather
 * than sharing one pending promise; a duplicate mint is the cheap and safe side of that trade.
 */
export function createInstallationTokenCache(
  mint: (creds: AppCredentials) => Promise<string> = installationToken,
  now: () => number = () => Date.now(),
  ttlMs = 55 * 60 * 1000,
): (creds: AppCredentials) => Promise<string> {
  const cache = new Map<string, CachedToken>();
  return async function get(creds: AppCredentials): Promise<string> {
    const hit = cache.get(creds.installationId);
    if (hit && hit.expiresAt > now()) return hit.token;
    const token = await mint(creds);
    cache.set(creds.installationId, { token, expiresAt: now() + ttlMs });
    return token;
  };
}

/** The shared installation-token cache, one instance per Worker isolate. */
export const cachedInstallationToken = createInstallationTokenCache();

/** Read one DER TLV at `at`: its tag and the bounds of its content. Throws on a truncated value. */
function readTlv(der: Uint8Array, at: number, tag: number): { start: number; end: number } {
  if (der[at] !== tag) throw new Error('unexpected DER tag');
  let len = der[at + 1];
  let start = at + 2;
  if (len & 0x80) {
    const octets = len & 0x7f;
    len = 0;
    for (let i = 0; i < octets; i++) len = len * 256 + der[start++];
  }
  const end = start + len;
  if (len === undefined || end > der.length) throw new Error('truncated DER value');
  return { start, end };
}

/**
 * The RSA modulus and public exponent of a PKCS#8 private key, as unpadded base64url big-endian
 * integers (the JWK `n` and `e` members). Reads only these two public fields from the DER, so no
 * private component is ever copied out of the key bytes.
 */
function rsaPublicJwk(pkcs8: Uint8Array): JsonWebKey {
  const INTEGER = 0x02;
  const SEQUENCE = 0x30;
  const outer = readTlv(pkcs8, 0, SEQUENCE);
  const version = readTlv(pkcs8, outer.start, INTEGER);
  const algorithm = readTlv(pkcs8, version.end, SEQUENCE);
  const octets = readTlv(pkcs8, algorithm.end, 0x04);
  const rsa = readTlv(pkcs8, octets.start, SEQUENCE);
  const rsaVersion = readTlv(pkcs8, rsa.start, INTEGER);
  const n = readTlv(pkcs8, rsaVersion.end, INTEGER);
  const e = readTlv(pkcs8, n.end, INTEGER);
  // A DER INTEGER carries a leading zero octet when its high bit is set; a JWK integer does not.
  const unsigned = (r: { start: number; end: number }): Uint8Array => {
    let start = r.start;
    while (start < r.end - 1 && pkcs8[start] === 0) start++;
    return pkcs8.subarray(start, r.end);
  };
  return { kty: 'RSA', n: bytesToB64url(unsigned(n)), e: bytesToB64url(unsigned(e)) };
}

/**
 * The SHA-256 fingerprint of the key's public half, `SHA256:` then the padded base64 of the digest
 * of its SubjectPublicKeyInfo DER, the value GitHub shows for the key and the one its documented
 * openssl pipeline prints. Built from the modulus and exponent alone,
 * imported as a public key and exported as SPKI, so no private key is ever exported.
 */
async function publicKeyFingerprint(privateKeyPem: string): Promise<string> {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    rsaPublicJwk(pemToPkcs8(privateKeyPem)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    true,
    ['verify'],
  );
  const spki = (await crypto.subtle.exportKey('spki', publicKey)) as ArrayBuffer;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', spki));
  return `SHA256:${btoa(Array.from(digest, (b) => String.fromCharCode(b)).join(''))}`;
}

/**
 * Deploy-time self-test for the App signer: sign a dummy JWT with the configured key. It
 * exercises the brittle PKCS#1-to-PKCS#8 conversion and the Web Crypto import and sign with
 * no network call and no secret in the result, so `/healthz` catches a bad or rotated key before
 * an editor's save fails. The `detail` is a fixed classifier, never the raw crypto error, so the
 * surfaced health result cannot echo key bytes. A passing result also carries the public key's
 * `fingerprint`, which an operator compares against the one GitHub lists for the App's key; when
 * the fingerprint cannot be computed the result omits it and says nothing more. Never throws.
 */
export async function signingSelfTest(
  appId: string,
  privateKeyB64: string,
): Promise<{ ok: boolean; detail?: string; fingerprint?: string }> {
  let pem: string;
  try {
    pem = atob(privateKeyB64);
    const jwt = await appJwt(appId, pem);
    if (jwt.split('.').length !== 3) return { ok: false, detail: 'malformed JWT' };
  } catch {
    return { ok: false, detail: 'key import or sign failed' };
  }
  try {
    return { ok: true, fingerprint: await publicKeyFingerprint(pem) };
  } catch {
    return { ok: true };
  }
}
