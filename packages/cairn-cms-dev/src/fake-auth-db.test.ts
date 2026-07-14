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
