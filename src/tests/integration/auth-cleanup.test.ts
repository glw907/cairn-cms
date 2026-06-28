import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { countRows } from './_auth-harness.js';
import { issueToken, createSession } from '../../lib/auth/store.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM session'),
    db.prepare('DELETE FROM magic_token'),
    db.prepare('DELETE FROM editor'),
  ]);
});

describe('lazy expired-row cleanup (Unit 6)', () => {
  it('sweeps an expired token for another email when a token is issued', async () => {
    const now = Date.now();
    await db
      .prepare('INSERT INTO magic_token (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind('stale-hash', 'old@x.dev', now - 1, now - 10_000)
      .run();
    await issueToken(db, 'new@x.dev', 'fresh-hash', 'admin', null, now + 600_000, now);
    expect(await countRows('magic_token')).toBe(1);
  });

  it('sweeps an expired session when a session is created', async () => {
    const now = Date.now();
    await db
      .prepare('INSERT INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind('stale-sid', 'old@x.dev', now - 1, now - 10_000)
      .run();
    await createSession(db, 'fresh-sid', 'new@x.dev', 'admin', now + 600_000, now);
    expect(await countRows('session')).toBe(1);
  });
});
