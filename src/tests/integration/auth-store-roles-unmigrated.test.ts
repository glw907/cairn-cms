import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  insertEditor,
  setEditorRole,
  demoteOwnerIfNotLast,
  insertOwnerIfEmpty,
  findEditor,
} from '../../lib/auth/store.js';
import { CairnError } from '../../lib/diagnostics/error.js';
import type { D1Database } from '@cloudflare/workers-types';

// A scaffolded site that predates the roles migration carries migrations 0000, 0003, and 0004:
// its `editor.role` column still has the owner/editor CHECK. The shared harness applies every
// migration, so this file rebuilds `editor` from the real 0000 statement to reach that schema,
// then replays the real 0001 file to reach the migrated one.
const db = env.AUTH_DB;

function migration(prefix: string): string[] {
  const found = env.TEST_MIGRATIONS.find((m) => m.name.startsWith(prefix));
  if (!found) throw new Error(`no ${prefix} migration in the harness`);
  return found.queries;
}

async function runAll(queries: string[]): Promise<void> {
  for (const query of queries) await db.prepare(query).run();
}

/** Rebuild `editor` exactly as migration 0000 creates it, CHECK included. */
async function resetEditorTable(): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM session'),
    db.prepare('DELETE FROM magic_token'),
    db.prepare('DROP TABLE IF EXISTS editor_new'),
    db.prepare('DROP TABLE editor'),
  ]);
  const query = migration('0000').find((q) => q.includes('CREATE TABLE editor ('));
  if (!query) throw new Error('migration 0000 no longer creates the editor table');
  await db.prepare(query.slice(query.indexOf('CREATE TABLE editor ('))).run();
}

/** Seed rows through the raw table, so the fixture never depends on the store under test. */
async function seed(email: string, role: string): Promise<void> {
  await db
    .prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
    .bind(email, email, role, 1)
    .run();
}

async function roleOf(email: string): Promise<string | undefined> {
  return (await findEditor(db, email))?.role;
}

async function expectRolesUnmigrated(write: Promise<unknown>): Promise<CairnError> {
  const err = await write.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(CairnError);
  const cairn = err as CairnError;
  expect(cairn.conditionId).toBe('auth.store-roles-unmigrated');
  expect(cairn.message).toContain('0001_roles.sql');
  expect(cairn.message).toMatch(/four columns/);
  expect(String(cairn.cause)).toMatch(/CHECK constraint failed/);
  return cairn;
}

describe('against an AUTH_DB still carrying the owner/editor role CHECK', () => {
  beforeEach(async () => {
    await resetEditorTable();
  });

  afterEach(async () => {
    // Leave the file's D1 in the migrated shape the rest of the suite expects.
    await runAll(migration('0001'));
  });

  it('names migration 0001 when an add carries a custom role', async () => {
    await expectRolesUnmigrated(insertEditor(db, 'new@x.dev', 'New', 'reviewer', 1));
    expect(await findEditor(db, 'new@x.dev')).toBeNull();
  });

  it('names migration 0001 when setEditorRole moves a row to a custom role with ownerRoles empty', async () => {
    await seed('ed@x.dev', 'editor');
    await expectRolesUnmigrated(setEditorRole(db, 'ed@x.dev', 'reviewer', []));
    expect(await roleOf('ed@x.dev')).toBe('editor');
  });

  it('names migration 0001 when setEditorRole moves a row to a custom role with ownerRoles set', async () => {
    await seed('boss@x.dev', 'owner');
    await seed('ed@x.dev', 'editor');
    await expectRolesUnmigrated(setEditorRole(db, 'ed@x.dev', 'reviewer', ['owner']));
    expect(await roleOf('ed@x.dev')).toBe('editor');
  });

  it('names migration 0001 when demoteOwnerIfNotLast demotes to a custom role', async () => {
    await seed('a@x.dev', 'owner');
    await seed('b@x.dev', 'owner');
    await expectRolesUnmigrated(demoteOwnerIfNotLast(db, 'a@x.dev', ['owner'], 'reviewer'));
    expect(await roleOf('a@x.dev')).toBe('owner');
  });

  it('rethrows a duplicate-email add untouched, since the primary-key failure is not a role fault', async () => {
    await seed('dup@x.dev', 'editor');
    const err = await insertEditor(db, 'dup@x.dev', 'Dup', 'editor', 1).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(err).toBeDefined();
    expect(err).not.toBeInstanceOf(CairnError);
    expect(String(err)).toMatch(/UNIQUE constraint failed: editor\.email/);
  });

  it('leaves writes the owner/editor CHECK admits unrouted and working', async () => {
    expect(await insertOwnerIfEmpty(db, 'boss@x.dev', 'Boss', 1)).toBe(true);
    await insertEditor(db, 'ed@x.dev', 'Ed', 'editor', 1);
    expect(await setEditorRole(db, 'ed@x.dev', 'owner', ['owner'])).toEqual({ outcome: 'ok' });
    expect(await demoteOwnerIfNotLast(db, 'ed@x.dev', ['owner'], 'editor')).toEqual({ outcome: 'ok' });
  });
});

describe('after migration 0001', () => {
  beforeEach(async () => {
    await resetEditorTable();
    await runAll(migration('0001'));
  });

  it('accepts the same four custom-role writes', async () => {
    await seed('a@x.dev', 'owner');
    await seed('b@x.dev', 'owner');
    await seed('ed@x.dev', 'editor');
    await insertEditor(db, 'new@x.dev', 'New', 'reviewer', 1);
    expect(await roleOf('new@x.dev')).toBe('reviewer');
    expect(await setEditorRole(db, 'ed@x.dev', 'reviewer', [])).toEqual({ outcome: 'ok' });
    expect(await setEditorRole(db, 'new@x.dev', 'writer', ['owner'])).toEqual({ outcome: 'ok' });
    expect(await demoteOwnerIfNotLast(db, 'a@x.dev', ['owner'], 'reviewer')).toEqual({ outcome: 'ok' });
    expect(await roleOf('a@x.dev')).toBe('reviewer');
  });
});

/** A database whose every statement fails with `err`, so a test controls the exact fault text. */
function failingDb(err: unknown): D1Database {
  const statement = { bind: () => statement, run: () => Promise.reject(err) };
  return { prepare: () => statement } as unknown as D1Database;
}

describe('which role-write failures name the roles migration', () => {
  it('names auth.store-roles-unmigrated when the engine CHECK text rides only on the cause', async () => {
    const wrapped = new Error('D1_ERROR: statement failed', {
      cause: new Error("CHECK constraint failed: role IN ('owner', 'editor')"),
    });
    const err = await insertEditor(failingDb(wrapped), 'new@x.dev', 'New', 'reviewer', 1).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(CairnError);
    expect((err as CairnError).conditionId).toBe('auth.store-roles-unmigrated');
  });

  it("rethrows a site's own CHECK on another expression starting with role untouched", async () => {
    const siteCheck = new Error('D1_ERROR: CHECK constraint failed: role_note IS NULL OR length(role_note) < 80');
    const err = await insertEditor(failingDb(siteCheck), 'new@x.dev', 'New', 'reviewer', 1).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(err).toBe(siteCheck);
  });

  it("rethrows a site's own CHECK on the role column that is not the engine's owner/editor list", async () => {
    const siteCheck = new Error('D1_ERROR: CHECK constraint failed: role <> \'\'');
    const err = await insertEditor(failingDb(siteCheck), 'new@x.dev', 'New', 'reviewer', 1).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(err).toBe(siteCheck);
  });
});
