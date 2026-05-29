// src/lib/github/signing.ts
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

/** DER length octets for a value of `n` bytes (short form < 128, else long form). */
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

/** Exchange the App JWT for a short-lived installation access token. */
export async function installationToken(creds: AppCredentials): Promise<string> {
  const jwt = await appJwt(creds.appId, atob(creds.privateKeyB64));
  const res = await fetch(`${API}/app/installations/${creds.installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${jwt}`,
      'User-Agent': 'cairn-cms',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub installation token failed: ${res.status}`);
  return ((await res.json()) as { token: string }).token;
}

/**
 * Deploy-time self-test for the App signer: sign a dummy JWT with the configured key. It
 * exercises the brittle PKCS#1-to-PKCS#8 conversion and the Web Crypto import and sign with
 * no network call and no secret in the result, so `/admin/healthz` (Plan 05) catches a bad
 * or rotated key before an editor's save fails. The `detail` is a fixed classifier, never the
 * raw crypto error, so the surfaced health result cannot echo key bytes. Never throws.
 */
export async function signingSelfTest(appId: string, privateKeyB64: string): Promise<{ ok: boolean; detail?: string }> {
  try {
    const jwt = await appJwt(appId, atob(privateKeyB64));
    if (jwt.split('.').length !== 3) return { ok: false, detail: 'malformed JWT' };
    return { ok: true };
  } catch {
    return { ok: false, detail: 'key import or sign failed' };
  }
}
