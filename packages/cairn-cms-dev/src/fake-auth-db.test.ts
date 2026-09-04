import { expect, test } from 'vitest';
import { createFakeAuthDb, type FakeAuthDb } from './fake-auth-db.js';

// The store's findEditor read path: prepare the exact SQL, bind the email, read the first row. The
// double seeds editor@showcase.test as owner, so the seeded editor resolves through the same call
// the engine's auth store makes (src/lib/auth/store.ts).
const FIND_EDITOR = 'SELECT email, display_name, role FROM editor WHERE email = ?';

// Mirrors the exact SQL src/lib/auth/store.ts's removeOwnerIfNotLast/demoteOwnerIfNotLast build:
// a set-based `role IN (...)` membership test plus a COUNT(*) subquery over that same set. The
// double's whitespace normalization makes the single-line form here equivalent to the store's
// multi-line literal.
function guardedDeleteSql(ownerRoles: string[]): string {
  const placeholders = ownerRoles.map(() => '?').join(', ');
  return `DELETE FROM editor WHERE email = ? AND role IN (${placeholders}) AND (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1`;
}

function guardedUpdateSql(ownerRoles: string[]): string {
  const placeholders = ownerRoles.map(() => '?').join(', ');
  return `UPDATE editor SET role = ? WHERE email = ? AND role IN (${placeholders}) AND (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1`;
}

// Mirrors the exact SQL src/lib/auth/store.ts's deleteEditor/setEditorRole build when
// ownerRoles.length > 0: the generalized dispatch that removes/changes a non-owner row
// unconditionally and refuses only a last-owner-capability row, folded into one atomic
// statement per the outcome idiom's atomicity mandate.
function generalizedDeleteSql(ownerRoles: string[]): string {
  const placeholders = ownerRoles.map(() => '?').join(', ');
  return `DELETE FROM editor WHERE email = ? AND ( role NOT IN (${placeholders}) OR (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1 )`;
}

function generalizedUpdateSql(ownerRoles: string[]): string {
  const placeholders = ownerRoles.map(() => '?').join(', ');
  return `UPDATE editor SET role = ? WHERE email = ? AND ( role NOT IN (${placeholders}) OR ? = 1 OR (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1 )`;
}

const CLASSIFY_STILL_THERE = 'SELECT 1 FROM editor WHERE email = ?';
function classifyStillEligibleSql(ownerRoles: string[]): string {
  const placeholders = ownerRoles.map(() => '?').join(', ');
  return `SELECT 1 FROM editor WHERE email = ? AND role IN (${placeholders})`;
}

async function insertEditor(db: FakeAuthDb, email: string, displayName: string, role: string): Promise<void> {
  await db.prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)').bind(
    email,
    displayName,
    role,
    Date.now(),
  ).run();
}

test('a seeded editor resolves through the store read path', async () => {
  const db = createFakeAuthDb();

  const row = await db
    .prepare(FIND_EDITOR)
    .bind('editor@showcase.test')
    .first<{ email: string; display_name: string; role: string }>();

  expect(row).toEqual({
    email: 'editor@showcase.test',
    display_name: 'Demo Editor',
    role: 'owner',
  });
});

test('an unseeded email resolves to null', async () => {
  const db = createFakeAuthDb();

  const row = await db.prepare(FIND_EDITOR).bind('nobody@showcase.test').first();

  expect(row).toBeNull();
});

test("removeOwnerIfNotLast's guarded delete refuses the sole owner-level row", async () => {
  const db = createFakeAuthDb();
  const ownerRoles = ['owner'];

  // Only editor@showcase.test carries an owner-level role; the guard must refuse.
  const res = await db
    .prepare(guardedDeleteSql(ownerRoles))
    .bind('editor@showcase.test', ...ownerRoles, ...ownerRoles)
    .run();

  expect(res.meta.changes).toBe(0);
  const row = await db.prepare(FIND_EDITOR).bind('editor@showcase.test').first();
  expect(row).not.toBeNull();
});

test("removeOwnerIfNotLast's guarded delete succeeds when another owner-level row remains", async () => {
  const db = createFakeAuthDb();
  await insertEditor(db, 'second-owner@showcase.test', 'Second Owner', 'owner');
  const ownerRoles = ['owner'];

  const res = await db
    .prepare(guardedDeleteSql(ownerRoles))
    .bind('second-owner@showcase.test', ...ownerRoles, ...ownerRoles)
    .run();

  expect(res.meta.changes).toBe(1);
  const row = await db.prepare(FIND_EDITOR).bind('second-owner@showcase.test').first();
  expect(row).toBeNull();
});

test("demoteOwnerIfNotLast's guarded update behaves per the store contract with a two-name owner set", async () => {
  const db = createFakeAuthDb();
  await insertEditor(db, 'pres@showcase.test', 'President', 'commodore');
  const ownerRoles = ['owner', 'commodore'];

  // Two owner-level rows exist (editor@showcase.test as owner, pres@showcase.test as commodore),
  // so demoting one of them is allowed.
  const first = await db
    .prepare(guardedUpdateSql(ownerRoles))
    .bind('editor', 'editor@showcase.test', ...ownerRoles, ...ownerRoles)
    .run();
  expect(first.meta.changes).toBe(1);
  const demoted = await db
    .prepare(FIND_EDITOR)
    .bind('editor@showcase.test')
    .first<{ role: string }>();
  expect(demoted?.role).toBe('editor');

  // Only pres@showcase.test now carries an owner-level role; demoting it must be refused.
  const second = await db
    .prepare(guardedUpdateSql(ownerRoles))
    .bind('editor', 'pres@showcase.test', ...ownerRoles, ...ownerRoles)
    .run();
  expect(second.meta.changes).toBe(0);
  const stillCommodore = await db
    .prepare(FIND_EDITOR)
    .bind('pres@showcase.test')
    .first<{ role: string }>();
  expect(stillCommodore?.role).toBe('commodore');
});

test("deleteEditor's generalized delete removes a non-owner row unconditionally", async () => {
  const db = createFakeAuthDb();
  const ownerRoles = ['owner'];

  const res = await db
    .prepare(generalizedDeleteSql(ownerRoles))
    .bind('writer@showcase.test', ...ownerRoles, ...ownerRoles)
    .run();

  expect(res.meta.changes).toBe(1);
  const row = await db.prepare(FIND_EDITOR).bind('writer@showcase.test').first();
  expect(row).toBeNull();
});

test("deleteEditor's generalized delete refuses the sole owner-level row, then classifies it last-owner", async () => {
  const db = createFakeAuthDb();
  const ownerRoles = ['owner'];

  const res = await db
    .prepare(generalizedDeleteSql(ownerRoles))
    .bind('editor@showcase.test', ...ownerRoles, ...ownerRoles)
    .run();

  expect(res.meta.changes).toBe(0);
  const stillThere = await db.prepare(CLASSIFY_STILL_THERE).bind('editor@showcase.test').first();
  expect(stillThere).not.toBeNull();
});

test("deleteEditor's generalized delete on an absent email classifies not-found", async () => {
  const db = createFakeAuthDb();
  const ownerRoles = ['owner'];

  const res = await db
    .prepare(generalizedDeleteSql(ownerRoles))
    .bind('nobody@showcase.test', ...ownerRoles, ...ownerRoles)
    .run();

  expect(res.meta.changes).toBe(0);
  const stillThere = await db.prepare(CLASSIFY_STILL_THERE).bind('nobody@showcase.test').first();
  expect(stillThere).toBeNull();
});

test("setEditorRole's generalized update changes a non-owner row unconditionally", async () => {
  const db = createFakeAuthDb();
  const ownerRoles = ['owner'];

  const res = await db
    .prepare(generalizedUpdateSql(ownerRoles))
    .bind('owner', 'writer@showcase.test', ...ownerRoles, 1, ...ownerRoles)
    .run();

  expect(res.meta.changes).toBe(1);
  const row = await db.prepare(FIND_EDITOR).bind('writer@showcase.test').first<{ role: string }>();
  expect(row?.role).toBe('owner');
});

test("setEditorRole's generalized update refuses a last-owner demotion, then classifies it still owner-eligible", async () => {
  const db = createFakeAuthDb();
  const ownerRoles = ['owner'];

  const res = await db
    .prepare(generalizedUpdateSql(ownerRoles))
    .bind('editor', 'editor@showcase.test', ...ownerRoles, 0, ...ownerRoles)
    .run();

  expect(res.meta.changes).toBe(0);
  const stillEligible = await db
    .prepare(classifyStillEligibleSql(ownerRoles))
    .bind('editor@showcase.test', ...ownerRoles)
    .first();
  expect(stillEligible).not.toBeNull();
});

test("setEditorRole's generalized update allows a same-capability role change even as sole owner (the flag escape)", async () => {
  const db = createFakeAuthDb();
  const ownerRoles = ['owner', 'commodore'];

  // editor@showcase.test is the sole owner-level row; 'commodore' is itself owner-capability, so
  // the flag (bound 1) must let the write through despite the count being 1.
  const res = await db
    .prepare(generalizedUpdateSql(ownerRoles))
    .bind('commodore', 'editor@showcase.test', ...ownerRoles, 1, ...ownerRoles)
    .run();

  expect(res.meta.changes).toBe(1);
  const row = await db.prepare(FIND_EDITOR).bind('editor@showcase.test').first<{ role: string }>();
  expect(row?.role).toBe('commodore');
});

test('the plain setEditorRole and deleteEditor matchers still work alongside the guarded shapes', async () => {
  const db = createFakeAuthDb();

  const updated = await db
    .prepare('UPDATE editor SET role = ? WHERE email = ?')
    .bind('owner', 'writer@showcase.test')
    .run();
  expect(updated.meta.changes).toBe(1);
  const row = await db.prepare(FIND_EDITOR).bind('writer@showcase.test').first<{ role: string }>();
  expect(row?.role).toBe('owner');

  const deleted = await db.prepare('DELETE FROM editor WHERE email = ?').bind('writer@showcase.test').run();
  expect(deleted.meta.changes).toBe(1);
  const gone = await db.prepare(FIND_EDITOR).bind('writer@showcase.test').first();
  expect(gone).toBeNull();
});

// The preview_tokens dispatch (src/lib/auth/preview-store.ts's exact SQL), the preview pass's
// addition to this fixture: previewMint's insert (and its expiry sweep), previewLoad's two
// lookups, and the revoke/lifecycle-cleanup deletes by entry or by editor.

const INSERT_PREVIEW_TOKEN =
  'INSERT INTO preview_tokens (token_hash, concept, entry_id, editor, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)';
const SWEEP_EXPIRED = 'DELETE FROM preview_tokens WHERE expires_at <= ?';
const FIND_PREVIEW_TOKEN = 'SELECT concept, entry_id, editor, expires_at FROM preview_tokens WHERE token_hash = ? AND expires_at > ?';
const FIND_PREVIEW_TOKEN_ANY_EXPIRY = 'SELECT concept, entry_id, editor, expires_at FROM preview_tokens WHERE token_hash = ?';
const DELETE_BY_ENTRY = 'DELETE FROM preview_tokens WHERE concept = ? AND entry_id = ?';
const DELETE_BY_EDITOR = 'DELETE FROM preview_tokens WHERE editor = ?';

async function mintToken(
  db: FakeAuthDb,
  hash: string,
  record: { concept: string; entryId: string; editor: string; expiresAt: number },
): Promise<void> {
  const now = Date.now();
  await db.batch([
    db.prepare(SWEEP_EXPIRED).bind(now),
    db.prepare(INSERT_PREVIEW_TOKEN).bind(hash, record.concept, record.entryId, record.editor, record.expiresAt, now),
  ]);
}

test('insertPreviewToken then findPreviewToken round-trips a minted row', async () => {
  const db = createFakeAuthDb();
  await mintToken(db, 'hash-1', { concept: 'posts', entryId: '2026-01-01-hi', editor: 'ed@t', expiresAt: Date.now() + 60_000 });

  const row = await db
    .prepare(FIND_PREVIEW_TOKEN)
    .bind('hash-1', Date.now())
    .first<{ concept: string; entry_id: string; editor: string; expires_at: number }>();

  expect(row).toMatchObject({ concept: 'posts', entry_id: '2026-01-01-hi', editor: 'ed@t' });
});

test('an unknown hash misses both findPreviewToken and findPreviewTokenAnyExpiry', async () => {
  const db = createFakeAuthDb();

  expect(await db.prepare(FIND_PREVIEW_TOKEN).bind('nope', Date.now()).first()).toBeNull();
  expect(await db.prepare(FIND_PREVIEW_TOKEN_ANY_EXPIRY).bind('nope').first()).toBeNull();
});

test('findPreviewToken excludes an expired row that findPreviewTokenAnyExpiry still returns', async () => {
  const db = createFakeAuthDb();
  // Insert directly (bypassing the insert-time sweep) so an already-expired row can exist for the
  // lookup-time expiry check to exclude, mirroring previewLoad's expired-vs-unknown distinguisher.
  await db
    .prepare(INSERT_PREVIEW_TOKEN)
    .bind('hash-expired', 'posts', '2026-01-01-hi', 'ed@t', Date.now() - 1000, Date.now() - 2000)
    .run();

  expect(await db.prepare(FIND_PREVIEW_TOKEN).bind('hash-expired', Date.now()).first()).toBeNull();
  const anyExpiry = await db
    .prepare(FIND_PREVIEW_TOKEN_ANY_EXPIRY)
    .bind('hash-expired')
    .first<{ expires_at: number }>();
  expect(anyExpiry).not.toBeNull();
});

test('insertPreviewToken sweeps expired rows in the same batch', async () => {
  const db = createFakeAuthDb();
  await db
    .prepare(INSERT_PREVIEW_TOKEN)
    .bind('hash-old', 'posts', '2026-01-01-hi', 'ed@t', Date.now() - 1000, Date.now() - 2000)
    .run();

  await mintToken(db, 'hash-new', { concept: 'posts', entryId: '2026-01-02-hi', editor: 'ed@t', expiresAt: Date.now() + 60_000 });

  expect(await db.prepare(FIND_PREVIEW_TOKEN_ANY_EXPIRY).bind('hash-old').first()).toBeNull();
  expect(await db.prepare(FIND_PREVIEW_TOKEN_ANY_EXPIRY).bind('hash-new').first()).not.toBeNull();
});

test('deletePreviewTokens removes every row for one entry, and only that entry', async () => {
  const db = createFakeAuthDb();
  await mintToken(db, 'hash-a', { concept: 'posts', entryId: 'target', editor: 'ed@t', expiresAt: Date.now() + 60_000 });
  await mintToken(db, 'hash-b', { concept: 'posts', entryId: 'target', editor: 'other@t', expiresAt: Date.now() + 60_000 });
  await mintToken(db, 'hash-c', { concept: 'posts', entryId: 'other-entry', editor: 'ed@t', expiresAt: Date.now() + 60_000 });

  const res = await db.prepare(DELETE_BY_ENTRY).bind('posts', 'target').run();

  expect(res.meta.changes).toBe(2);
  expect(await db.prepare(FIND_PREVIEW_TOKEN_ANY_EXPIRY).bind('hash-a').first()).toBeNull();
  expect(await db.prepare(FIND_PREVIEW_TOKEN_ANY_EXPIRY).bind('hash-b').first()).toBeNull();
  expect(await db.prepare(FIND_PREVIEW_TOKEN_ANY_EXPIRY).bind('hash-c').first()).not.toBeNull();
});

test("the editor-removal cascade's own delete clears every row that editor minted, across entries", async () => {
  const db = createFakeAuthDb();
  await mintToken(db, 'hash-a', { concept: 'posts', entryId: 'one', editor: 'gone@t', expiresAt: Date.now() + 60_000 });
  await mintToken(db, 'hash-b', { concept: 'posts', entryId: 'two', editor: 'gone@t', expiresAt: Date.now() + 60_000 });
  await mintToken(db, 'hash-c', { concept: 'posts', entryId: 'three', editor: 'staying@t', expiresAt: Date.now() + 60_000 });

  const res = await db.prepare(DELETE_BY_EDITOR).bind('gone@t').run();

  expect(res.meta.changes).toBe(2);
  expect(await db.prepare(FIND_PREVIEW_TOKEN_ANY_EXPIRY).bind('hash-c').first()).not.toBeNull();
});

// Mirrors the exact SQL src/lib/auth/store.ts's deleteSession builds. The dispatch table throws on
// an unhandled statement, so logout would break the dev site outright without this handler.
const DELETE_SESSION = 'DELETE FROM session WHERE id = ? RETURNING email, expires_at';

test("logout's session delete answers no row, the signal that skips the destroyed record", async () => {
  const db = createFakeAuthDb();

  // The fixture hook injects locals.cairnEditor directly, so no session row ever exists in dev.
  const row = await db.prepare(DELETE_SESSION).bind('any-session-id').first<{ email: string }>();

  expect(row).toBeNull();
});
