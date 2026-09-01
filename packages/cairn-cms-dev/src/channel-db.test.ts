import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { D1DatabaseSession } from '@cloudflare/workers-types';
import { createChannelDb } from './channel-db.js';
import { mintCode } from '../../../src/lib/auth-channel/store.js';

// The engine's packaged channel migration, the canonical schema text since the conventions pass
// retired CHANNEL_SCHEMA_SQL as an export. Read from disk rather than imported: this spec runs in
// the node project and is type-checked by plain `tsc` under check:dev-package, which has no Vite
// `?raw` module declaration.
const CHANNEL_SCHEMA_SQL = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../migrations-channel/0000_channel.sql'),
  'utf-8',
);

const WIDGETS_SCHEMA = `
CREATE TABLE widgets (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  bucket TEXT NOT NULL,
  value INTEGER NOT NULL
);
`;

test('first() answers Object.is-null, not undefined, on a no-row query', async () => {
  const db = await createChannelDb(WIDGETS_SCHEMA);

  const row = await db.prepare('SELECT * FROM widgets WHERE id = ?').bind('missing').first();

  expect(Object.is(row, null)).toBe(true);
});

test('a RETURNING row reads back through first()', async () => {
  const db = await createChannelDb(WIDGETS_SCHEMA);

  const row = await db
    .prepare('INSERT INTO widgets (id, name, bucket, value) VALUES (?, ?, ?, ?) RETURNING id, name, value')
    .bind('w1', 'gadget', 'b1', 42)
    .first<{ id: string; name: string; value: number }>();

  expect(row).toEqual({ id: 'w1', name: 'gadget', value: 42 });
});

test('meta.changes reflects a multi-row delete', async () => {
  const db = await createChannelDb(WIDGETS_SCHEMA);
  const insert = db.prepare('INSERT INTO widgets (id, name, bucket, value) VALUES (?, ?, ?, ?)');
  await insert.bind('w1', 'a', 'shared', 1).run();
  await insert.bind('w2', 'b', 'shared', 2).run();
  await insert.bind('w3', 'c', 'shared', 3).run();
  await insert.bind('w4', 'd', 'other', 4).run();

  const result = await db.prepare('DELETE FROM widgets WHERE bucket = ?').bind('shared').run();

  expect(result.meta.changes).toBe(3);
  const remaining = await db.prepare('SELECT id FROM widgets WHERE bucket = ?').bind('other').first();
  expect(remaining).toEqual({ id: 'w4' });
});

test('withSession() throws on a constraint other than first-primary, the only one the engine ever passes', async () => {
  const db = await createChannelDb(WIDGETS_SCHEMA);

  expect(() => db.withSession()).toThrow();
  expect(() => db.withSession('first-unconstrained')).toThrow();
});

test('batch() applies its statements in order and atomically, rolling back on a failing statement', async () => {
  const db = await createChannelDb(WIDGETS_SCHEMA);
  const session = db.withSession('first-primary');
  await session.prepare('INSERT INTO widgets (id, name, bucket, value) VALUES (?, ?, ?, ?)').bind('seed', 'seed', 'b', 0).run();

  await expect(
    session.batch([
      session.prepare('INSERT INTO widgets (id, name, bucket, value) VALUES (?, ?, ?, ?)').bind('w1', 'first', 'b', 1),
      // Duplicate name violates the UNIQUE constraint on widgets.name, so this statement fails
      // and the whole batch, including the first insert above, must roll back.
      session.prepare('INSERT INTO widgets (id, name, bucket, value) VALUES (?, ?, ?, ?)').bind('w2', 'first', 'b', 2),
    ]),
  ).rejects.toThrow();

  const survivor = await db.prepare('SELECT id FROM widgets WHERE id = ?').bind('w1').first();
  expect(Object.is(survivor, null)).toBe(true);
  const seed = await db.prepare('SELECT id FROM widgets WHERE id = ?').bind('seed').first();
  expect(seed).toEqual({ id: 'seed' });
});

test('batch() applies its statements in the order given', async () => {
  const db = await createChannelDb(WIDGETS_SCHEMA);
  const session = db.withSession('first-primary');

  // The update reads the row the insert creates, so it can only succeed if the batch runs the
  // statements in array order.
  await session.batch([
    session.prepare('INSERT INTO widgets (id, name, bucket, value) VALUES (?, ?, ?, ?)').bind('w1', 'a', 'b', 1),
    session.prepare('UPDATE widgets SET value = value + 10 WHERE id = ?').bind('w1'),
  ]);

  const row = await db.prepare('SELECT value FROM widgets WHERE id = ?').bind('w1').first<{ value: number }>();
  expect(row?.value).toBe(11);
});

test('applying the packaged channel migration succeeds', async () => {
  const db = await createChannelDb(CHANNEL_SCHEMA_SQL);

  const versionRow = await db
    .prepare("SELECT value FROM cairn_channel_meta WHERE key = 'schema_version'")
    .first<{ value: string }>();

  expect(versionRow?.value).toBe('1');
});

test('the mint conditional-upsert contract behaves through the double: fresh, in-cooldown, post-cooldown', async () => {
  const db = await createChannelDb(CHANNEL_SCHEMA_SQL);
  // store.ts's functions are typed against the real D1DatabaseSession, which carries far more of
  // the D1 surface (session bookmarks, D1Result's operational metadata) than this double needs to
  // implement; the cast is the one the spec names for the showcase's own injection site, applied
  // here at the one call site that reaches into engine code under test.
  const session = db.withSession('first-primary') as unknown as D1DatabaseSession;
  const now = Date.now();
  const ttlMs = 10 * 60_000;
  const cooldownMs = 60_000;

  const fresh = await mintCode(session, 'nonce-1', 'identity-1', 'code-hash-1', null, now, ttlMs, cooldownMs, 'bucket-1');
  expect(fresh).toBe(true);

  const inCooldown = await mintCode(
    session,
    'nonce-1',
    'identity-1',
    'code-hash-2',
    null,
    now + 1_000,
    ttlMs,
    cooldownMs,
    'bucket-1',
  );
  expect(inCooldown).toBe(false);

  const postCooldown = await mintCode(
    session,
    'nonce-1',
    'identity-1',
    'code-hash-3',
    null,
    now + cooldownMs + 1_000,
    ttlMs,
    cooldownMs,
    'bucket-1',
  );
  expect(postCooldown).toBe(true);
});
