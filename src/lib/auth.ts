// cairn-core: magic-link auth + signed sessions.
//
// Generic across sites — no ecnordic specifics here. Crypto is Web Crypto (HMAC-SHA256)
// so it runs unchanged on Cloudflare Workers under nodejs_compat. Single-use enforcement
// for magic links rides on a KV nonce; signature + expiry are self-contained in the token.

import type { KVNamespace } from '@cloudflare/workers-types';
import { bytesToB64url } from './utils';

/** Two-tier, per-site role. `owner`s manage the editor allowlist; `editor`s only edit content. */
export type Role = 'owner' | 'editor';

export interface Editor {
  email: string;
  name: string;
  role: Role;
}

export const SESSION_COOKIE = 'cairn_session';

const MAGIC_TTL_SECONDS = 600; // 10 minutes
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64urlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// TextEncoder/atob produce Uint8Arrays whose generic buffer type no longer satisfies
// Web Crypto's BufferSource under strict lib types; hand the underlying ArrayBuffer over.
function buf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    buf(encoder.encode(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Sign an arbitrary JSON payload as `<base64url(payload)>.<base64url(hmac)>`. */
async function signToken(data: unknown, secret: string): Promise<string> {
  const payload = bytesToB64url(encoder.encode(JSON.stringify(data)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, buf(encoder.encode(payload)));
  return `${payload}.${bytesToB64url(new Uint8Array(sig))}`;
}

/** Verify signature (constant-time via subtle.verify) and parse the payload, or null. */
async function verifyToken<T>(token: string, secret: string): Promise<T | null> {
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const key = await hmacKey(secret);
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', key, buf(b64urlToBytes(sig)), buf(encoder.encode(payload)));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    return JSON.parse(decoder.decode(b64urlToBytes(payload))) as T;
  } catch {
    return null;
  }
}

interface MagicPayload {
  email: string;
  exp: number;
  nonce: string;
}

/** Issue a single-use magic-link token and register its nonce in KV with a TTL. */
export async function createMagicLink(
  email: string,
  secret: string,
  kv: KVNamespace,
): Promise<string> {
  const nonce = bytesToB64url(crypto.getRandomValues(new Uint8Array(16)));
  const exp = Date.now() + MAGIC_TTL_SECONDS * 1000;
  const token = await signToken({ email, exp, nonce } satisfies MagicPayload, secret);
  await kv.put(`ml:${nonce}`, email, { expirationTtl: MAGIC_TTL_SECONDS });
  return token;
}

/** Redeem a magic-link token: verify, check expiry, then consume the KV nonce (single use). */
export async function redeemMagicToken(
  token: string,
  secret: string,
  kv: KVNamespace,
): Promise<string | null> {
  const payload = await verifyToken<MagicPayload>(token, secret);
  if (!payload || Date.now() > payload.exp) return null;
  const stored = await kv.get(`ml:${payload.nonce}`);
  if (stored !== payload.email) return null;
  await kv.delete(`ml:${payload.nonce}`); // burn it — single use
  return payload.email;
}

interface SessionPayload extends Editor {
  exp: number;
}

export async function createSession(editor: Editor, secret: string): Promise<string> {
  const exp = Date.now() + SESSION_TTL_SECONDS * 1000;
  return signToken({ ...editor, exp } satisfies SessionPayload, secret);
}

export async function verifySession(token: string, secret: string): Promise<Editor | null> {
  const payload = await verifyToken<SessionPayload>(token, secret);
  if (!payload || Date.now() > payload.exp) return null;
  // Sessions signed before roles existed carry no `role` — treat them as plain editors.
  return { email: payload.email, name: payload.name, role: payload.role ?? 'editor' };
}

const KEY_PREFIX = 'editor:';

/**
 * Decode a stored allowlist value into name + role. Current entries are JSON
 * (`{"name","role"}`); legacy entries are a bare display-name string, read as `editor`
 * so the allowlist migrates lazily — re-saving an entry upgrades it to the JSON shape.
 */
function parseEditorValue(raw: string): { name: string; role: Role } {
  try {
    const parsed = JSON.parse(raw) as { name?: unknown; role?: unknown };
    if (parsed && typeof parsed.name === 'string') {
      return { name: parsed.name, role: parsed.role === 'owner' ? 'owner' : 'editor' };
    }
  } catch {
    // Not JSON — legacy bare display-name; treat as editor.
  }
  return { name: raw, role: 'editor' };
}

function serializeEditorValue(name: string, role: Role): string {
  return JSON.stringify({ name, role });
}

/** Look up an editor in the KV allowlist (`editor:<email>` → `{name, role}`). */
export async function lookupEditor(email: string, kv: KVNamespace): Promise<Editor | null> {
  const normalized = email.trim().toLowerCase();
  const raw = await kv.get(`${KEY_PREFIX}${normalized}`);
  if (raw === null) return null;
  return { email: normalized, ...parseEditorValue(raw) };
}

/** Every allowlisted editor, sorted by email — the manage-admins list. */
export async function listEditors(kv: KVNamespace): Promise<Editor[]> {
  const { keys } = await kv.list({ prefix: KEY_PREFIX });
  const editors = await Promise.all(
    keys.map(async ({ name: key }): Promise<Editor> => {
      const raw = (await kv.get(key)) ?? '';
      return { email: key.slice(KEY_PREFIX.length), ...parseEditorValue(raw) };
    }),
  );
  return editors.sort((a, b) => a.email.localeCompare(b.email));
}

/** Add or update an allowlist entry (JSON value). Email is normalized. */
export async function setEditor(
  email: string,
  name: string,
  role: Role,
  kv: KVNamespace,
): Promise<void> {
  await kv.put(`${KEY_PREFIX}${email.trim().toLowerCase()}`, serializeEditorValue(name, role));
}

/** Remove an allowlist entry. */
export async function removeEditor(email: string, kv: KVNamespace): Promise<void> {
  await kv.delete(`${KEY_PREFIX}${email.trim().toLowerCase()}`);
}
