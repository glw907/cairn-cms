import { describe, it, expect } from 'vitest';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  createMagicLink,
  redeemMagicToken,
  createSession,
  verifySession,
  lookupEditor,
} from '../lib/auth';

// Minimal in-memory KV double (TTL is irrelevant to these assertions).
function fakeKV(seed: Record<string, string> = {}): KVNamespace {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    get: async (key: string) => (store.has(key) ? store.get(key)! : null),
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as KVNamespace;
}

const SECRET = 'test-magic-secret';
const SESSION_SECRET = 'test-session-secret';

describe('magic link', () => {
  it('round-trips a valid token to the email', async () => {
    const kv = fakeKV();
    const token = await createMagicLink('editor@example.com', SECRET, kv);
    expect(await redeemMagicToken(token, SECRET, kv)).toBe('editor@example.com');
  });

  it('is single-use — a second redemption fails', async () => {
    const kv = fakeKV();
    const token = await createMagicLink('editor@example.com', SECRET, kv);
    await redeemMagicToken(token, SECRET, kv);
    expect(await redeemMagicToken(token, SECRET, kv)).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const kv = fakeKV();
    const token = await createMagicLink('editor@example.com', SECRET, kv);
    const tampered = token.slice(0, -2) + (token.endsWith('A') ? 'BB' : 'AA');
    expect(await redeemMagicToken(tampered, SECRET, kv)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const kv = fakeKV();
    const token = await createMagicLink('editor@example.com', SECRET, kv);
    expect(await redeemMagicToken(token, 'wrong-secret', kv)).toBeNull();
  });

  it('rejects when the KV nonce is missing (expired/never-issued)', async () => {
    const issuingKv = fakeKV();
    const token = await createMagicLink('editor@example.com', SECRET, issuingKv);
    // Different KV with no nonce simulates TTL expiry of the nonce.
    expect(await redeemMagicToken(token, SECRET, fakeKV())).toBeNull();
  });
});

describe('session', () => {
  it('round-trips an editor', async () => {
    const editor = { email: 'editor@example.com', name: 'Ed Itor' };
    const token = await createSession(editor, SESSION_SECRET);
    expect(await verifySession(token, SESSION_SECRET)).toEqual(editor);
  });

  it('rejects a session signed with a different secret', async () => {
    const token = await createSession({ email: 'a@b.c', name: 'A' }, SESSION_SECRET);
    expect(await verifySession(token, 'other')).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await verifySession('not-a-token', SESSION_SECRET)).toBeNull();
    expect(await verifySession('', SESSION_SECRET)).toBeNull();
  });
});

describe('lookupEditor', () => {
  it('returns the editor when allowlisted (case-insensitive)', async () => {
    const kv = fakeKV({ 'editor:ed@example.com': 'Ed Itor' });
    expect(await lookupEditor('Ed@Example.com', kv)).toEqual({
      email: 'ed@example.com',
      name: 'Ed Itor',
    });
  });

  it('returns null when not allowlisted', async () => {
    expect(await lookupEditor('nobody@example.com', fakeKV())).toBeNull();
  });
});
