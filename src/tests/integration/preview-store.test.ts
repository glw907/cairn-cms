import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { generateToken, hashToken } from '../../lib/auth/crypto.js';
import { insertPreviewToken, findPreviewToken, deletePreviewTokens } from '../../lib/auth/preview-store.js';

const db = env.AUTH_DB;

// Each test starts from an empty table; the harness D1 persists across a file.
beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM preview_tokens')]);
});

/** Insert a row directly through raw SQL, bypassing insertPreviewToken's sweep and defaults. */
async function rawInsert(row: {
  tokenHash: string;
  concept: string;
  entryId: string;
  editor: string;
  expiresAt: number;
  createdAt?: number;
}): Promise<void> {
  await db
    .prepare(
      `INSERT INTO preview_tokens (token_hash, concept, entry_id, editor, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(row.tokenHash, row.concept, row.entryId, row.editor, row.expiresAt, row.createdAt ?? Date.now())
    .run();
}

async function countPreviewTokens(tokenHash: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM preview_tokens WHERE token_hash = ?')
    .bind(tokenHash)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

describe('preview token round trip', () => {
  it('finds a row after insertPreviewToken and misses on an unknown hash', async () => {
    const future = Date.now() + 60_000;
    await insertPreviewToken(db, {
      tokenHash: 'hash-1',
      concept: 'posts',
      entryId: '2026-08-06-draft',
      editor: 'ed@x.dev',
      expiresAt: future,
    });
    expect(await findPreviewToken(db, 'hash-1')).toEqual({
      concept: 'posts',
      entryId: '2026-08-06-draft',
      editor: 'ed@x.dev',
      expiresAt: future,
    });
    expect(await findPreviewToken(db, 'nope')).toBeNull();
  });

  it('stores only the hash: a find by the plaintext token misses', async () => {
    const token = generateToken();
    const tokenHash = await hashToken(token);
    await insertPreviewToken(db, {
      tokenHash,
      concept: 'pages',
      entryId: 'about',
      editor: 'ed@x.dev',
      expiresAt: Date.now() + 60_000,
    });
    expect(await findPreviewToken(db, token)).toBeNull();
    expect(await findPreviewToken(db, tokenHash)).not.toBeNull();
  });
});

describe('expiry boundary (raw write, so a column-type mismatch is observable)', () => {
  it('excludes expires_at <= now and includes expires_at > now', async () => {
    const now = Date.now();
    // A raw bind of a numeric expires_at: if the column were TEXT, this comparison would never
    // resolve the way a numeric bind expects, and both assertions below would fail together.
    await rawInsert({ tokenHash: 'hash-at-now', concept: 'posts', entryId: 'e1', editor: 'ed@x.dev', expiresAt: now });
    await rawInsert({
      tokenHash: 'hash-future',
      concept: 'posts',
      entryId: 'e1',
      editor: 'ed@x.dev',
      expiresAt: now + 60_000,
    });

    expect(await findPreviewToken(db, 'hash-at-now')).toBeNull();
    expect(await findPreviewToken(db, 'hash-future')).not.toBeNull();
  });
});

describe('insert-time sweep', () => {
  it('clears an expired row when a fresh token is inserted', async () => {
    await rawInsert({
      tokenHash: 'hash-expired',
      concept: 'posts',
      entryId: 'e1',
      editor: 'ed@x.dev',
      expiresAt: Date.now() - 10_000,
    });
    expect(await countPreviewTokens('hash-expired')).toBe(1);

    await insertPreviewToken(db, {
      tokenHash: 'hash-fresh',
      concept: 'posts',
      entryId: 'e2',
      editor: 'ed@x.dev',
      expiresAt: Date.now() + 60_000,
    });

    // The expired row is physically gone, not merely filtered at lookup.
    expect(await countPreviewTokens('hash-expired')).toBe(0);
    expect(await findPreviewToken(db, 'hash-fresh')).not.toBeNull();
  });
});

describe('deletePreviewTokens (revoke and lifecycle cleanup)', () => {
  it('returns the deleted count and only deletes the named entry\'s rows', async () => {
    const future = Date.now() + 60_000;
    await insertPreviewToken(db, {
      tokenHash: 'hash-a1',
      concept: 'posts',
      entryId: 'entry-a',
      editor: 'ed@x.dev',
      expiresAt: future,
    });
    await insertPreviewToken(db, {
      tokenHash: 'hash-a2',
      concept: 'posts',
      entryId: 'entry-a',
      editor: 'other@x.dev',
      expiresAt: future,
    });
    await insertPreviewToken(db, {
      tokenHash: 'hash-b1',
      concept: 'posts',
      entryId: 'entry-b',
      editor: 'ed@x.dev',
      expiresAt: future,
    });

    const deleted = await deletePreviewTokens(db, 'posts', 'entry-a');
    expect(deleted).toBe(2);
    expect(await findPreviewToken(db, 'hash-a1')).toBeNull();
    expect(await findPreviewToken(db, 'hash-a2')).toBeNull();
    expect(await findPreviewToken(db, 'hash-b1')).not.toBeNull();
  });
});
