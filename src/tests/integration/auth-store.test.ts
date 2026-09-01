import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor, countRows } from './_auth-harness.js';
import {
  findEditor,
  issueToken,
  recentlyIssued,
  consumeToken,
  createSession,
  resolveSession,
  deleteSession,
  listEditors,
  insertEditor,
  deleteEditor,
  setEditorRole,
  removeOwnerIfNotLast,
  demoteOwnerIfNotLast,
  insertOwnerIfEmpty,
} from '../../lib/auth/store.js';
import { insertPreviewToken, findPreviewToken } from '../../lib/auth/preview-store.js';
import { CairnError } from '../../lib/diagnostics/error.js';
import type { D1Database } from '@cloudflare/workers-types';

const db = env.AUTH_DB;

// Each test starts from an empty allowlist; the harness D1 persists across a file.
beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM session'),
    db.prepare('DELETE FROM magic_token'),
    db.prepare('DELETE FROM preview_tokens'),
    db.prepare('DELETE FROM editor'),
  ]);
});

describe('editors', () => {
  it('finds a seeded editor and returns null for an unknown one', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    expect(await findEditor(db, 'ed@x.dev')).toEqual({ email: 'ed@x.dev', displayName: 'Ed', role: 'editor' });
    expect(await findEditor(db, 'nope@x.dev')).toBeNull();
  });

  it('lists editors sorted by email', async () => {
    await seedEditor('b@x.dev', 'B', 'editor');
    await seedEditor('a@x.dev', 'A', 'owner');
    expect((await listEditors(db)).map((e) => e.email)).toEqual(['a@x.dev', 'b@x.dev']);
  });

  it('inserts, sets role, and removes', async () => {
    await insertEditor(db, 'new@x.dev', 'New', 'editor', Date.now());
    expect((await findEditor(db, 'new@x.dev'))?.role).toBe('editor');
    expect(await setEditorRole(db, 'new@x.dev', 'owner', ['owner'])).toEqual({ outcome: 'ok' });
    expect((await findEditor(db, 'new@x.dev'))?.role).toBe('owner');
    expect(await deleteEditor(db, 'new@x.dev', [])).toEqual({ outcome: 'removed' });
    expect(await findEditor(db, 'new@x.dev')).toBeNull();
  });
});

describe('deleteEditor and setEditorRole: the generalized one-call operations', () => {
  it('deleteEditor removes a non-owner row unconditionally, even with an owner vocabulary declared', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    expect(await deleteEditor(db, 'ed@x.dev', ['owner'])).toEqual({ outcome: 'removed' });
    expect(await findEditor(db, 'ed@x.dev')).toBeNull();
  });

  it('deleteEditor reports not-found for an absent row', async () => {
    expect(await deleteEditor(db, 'nope@x.dev', ['owner'])).toEqual({ outcome: 'not-found' });
  });

  it('deleteEditor refuses the last owner and writes nothing', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    expect(await deleteEditor(db, 'own@x.dev', ['owner'])).toEqual({ outcome: 'last-owner' });
    expect(await findEditor(db, 'own@x.dev')).not.toBeNull();
  });

  it('deleteEditor removes an owner row when another owner remains', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    expect(await deleteEditor(db, 'a@x.dev', ['owner'])).toEqual({ outcome: 'removed' });
    expect(await findEditor(db, 'a@x.dev')).toBeNull();
  });

  it('setEditorRole changes a non-owner role unconditionally, even with an owner vocabulary declared', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    expect(await setEditorRole(db, 'ed@x.dev', 'contributor', ['owner'])).toEqual({ outcome: 'ok' });
    expect((await findEditor(db, 'ed@x.dev'))?.role).toBe('contributor');
  });

  it('setEditorRole reports not-found for an absent row', async () => {
    expect(await setEditorRole(db, 'nope@x.dev', 'editor', ['owner'])).toEqual({ outcome: 'not-found' });
  });

  it('setEditorRole refuses demoting the last owner and writes nothing', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    expect(await setEditorRole(db, 'own@x.dev', 'editor', ['owner'])).toEqual({ outcome: 'last-owner' });
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('owner');
  });

  it('setEditorRole allows promoting to owner, and allows an owner-to-owner change', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    expect(await setEditorRole(db, 'own@x.dev', 'admin', ['owner', 'admin'])).toEqual({ outcome: 'ok' });
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('admin');
  });

  it('setEditorRole demotes an owner when another owner remains', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    expect(await setEditorRole(db, 'a@x.dev', 'editor', ['owner'])).toEqual({ outcome: 'ok' });
    expect((await findEditor(db, 'a@x.dev'))?.role).toBe('editor');
  });
});

describe('last-owner guards (atomic)', () => {
  it('refuses to remove or demote the last owner and writes nothing', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    expect(await removeOwnerIfNotLast(db, 'own@x.dev', ['owner'])).toEqual({ outcome: 'last-owner' });
    expect(await findEditor(db, 'own@x.dev')).not.toBeNull();
    expect(await demoteOwnerIfNotLast(db, 'own@x.dev', ['owner'], 'editor')).toEqual({ outcome: 'last-owner' });
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('owner');
  });

  it('removes or demotes an owner when another owner remains', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    expect(await demoteOwnerIfNotLast(db, 'a@x.dev', ['owner'], 'editor')).toEqual({ outcome: 'ok' });
    expect((await findEditor(db, 'a@x.dev'))?.role).toBe('editor');

    await seedEditor('c@x.dev', 'C', 'owner'); // b and c are owners now
    expect(await removeOwnerIfNotLast(db, 'b@x.dev', ['owner'])).toEqual({ outcome: 'ok' });
    expect(await findEditor(db, 'b@x.dev')).toBeNull();
  });

  it('counts across a two-owner-level-name vocabulary, not the literal owner string', async () => {
    // A club-shaped vocabulary where both 'owner' and 'president' carry owner capability. A row
    // under either name counts toward the "another owner remains" test.
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('pres@x.dev', 'Pres', 'president');
    const ownerRoles = ['owner', 'president'];
    expect(await demoteOwnerIfNotLast(db, 'own@x.dev', ownerRoles, 'club-admin')).toEqual({ outcome: 'ok' });
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('club-admin');
    // Only 'pres@x.dev' carries an owner-level role now; refuse to strand the roster.
    expect(await removeOwnerIfNotLast(db, 'pres@x.dev', ownerRoles)).toEqual({ outcome: 'last-owner' });
    expect(await findEditor(db, 'pres@x.dev')).not.toBeNull();
  });

  it('refuses when a second owner-level name is declared but has no rows', async () => {
    // The vocabulary declares both 'owner' and 'president' as owner-capability, but only one row
    // exists. The declared name set must not be mistaken for actual headcount.
    await seedEditor('own@x.dev', 'Own', 'owner');
    expect(await demoteOwnerIfNotLast(db, 'own@x.dev', ['owner', 'president'], 'editor')).toEqual({
      outcome: 'last-owner',
    });
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('owner');
  });

  it('removeOwnerIfNotLast reports not-eligible for a non-owner row, never removing it', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    expect(await removeOwnerIfNotLast(db, 'ed@x.dev', ['owner'])).toEqual({ outcome: 'not-eligible' });
    expect(await findEditor(db, 'ed@x.dev')).not.toBeNull();
  });

  it('removeOwnerIfNotLast reports not-eligible for an absent row', async () => {
    expect(await removeOwnerIfNotLast(db, 'nope@x.dev', ['owner'])).toEqual({ outcome: 'not-eligible' });
  });

  it('demoteOwnerIfNotLast reports not-eligible for a non-owner row, never changing it', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    expect(await demoteOwnerIfNotLast(db, 'ed@x.dev', ['owner'], 'contributor')).toEqual({
      outcome: 'not-eligible',
    });
    expect((await findEditor(db, 'ed@x.dev'))?.role).toBe('editor');
  });
});

describe('concurrency: two simultaneous demotes of a two-owner roster', () => {
  it('setEditorRole: exactly one of two simultaneous last-owner-shaped demotes succeeds', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    // Both racing calls try to demote the OTHER owner, so if both succeeded the roster would
    // strand at zero owners; the atomic in-statement count must let exactly one through.
    const [first, second] = await Promise.all([
      setEditorRole(db, 'a@x.dev', 'editor', ['owner']),
      setEditorRole(db, 'b@x.dev', 'editor', ['owner']),
    ]);
    const outcomes = [first.outcome, second.outcome].sort();
    expect(outcomes).toEqual(['last-owner', 'ok']);
    const roles = (await listEditors(db)).map((e) => e.role).sort();
    expect(roles).toEqual(['editor', 'owner']);
  });

  it('demoteOwnerIfNotLast: exactly one of two simultaneous demotes succeeds', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    const [first, second] = await Promise.all([
      demoteOwnerIfNotLast(db, 'a@x.dev', ['owner'], 'editor'),
      demoteOwnerIfNotLast(db, 'b@x.dev', ['owner'], 'editor'),
    ]);
    const outcomes = [first.outcome, second.outcome].sort();
    expect(outcomes).toEqual(['last-owner', 'ok']);
    const roles = (await listEditors(db)).map((e) => e.role).sort();
    expect(roles).toEqual(['editor', 'owner']);
  });

  it('removeOwnerIfNotLast: exactly one of two simultaneous removals succeeds', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    const [first, second] = await Promise.all([
      removeOwnerIfNotLast(db, 'a@x.dev', ['owner']),
      removeOwnerIfNotLast(db, 'b@x.dev', ['owner']),
    ]);
    const outcomes = [first.outcome, second.outcome].sort();
    expect(outcomes).toEqual(['last-owner', 'ok']);
    expect(await countRows('editor')).toBe(1);
  });

  it('deleteEditor: exactly one of two simultaneous removals of a two-owner roster succeeds', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    const [first, second] = await Promise.all([
      deleteEditor(db, 'a@x.dev', ['owner']),
      deleteEditor(db, 'b@x.dev', ['owner']),
    ]);
    const outcomes = [first.outcome, second.outcome].sort();
    expect(outcomes).toEqual(['last-owner', 'removed']);
    expect(await countRows('editor')).toBe(1);
  });
});

describe('insertOwnerIfEmpty (bootstrap owner)', () => {
  it('inserts the owner row on an empty table and returns true', async () => {
    const inserted = await insertOwnerIfEmpty(db, 'boss@x.dev', 'Boss', Date.now());
    expect(inserted).toBe(true);
    expect(await findEditor(db, 'boss@x.dev')).toEqual({ email: 'boss@x.dev', displayName: 'Boss', role: 'owner' });
  });

  it('writes nothing and returns false when a row already exists', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const inserted = await insertOwnerIfEmpty(db, 'boss@x.dev', 'Boss', Date.now());
    expect(inserted).toBe(false);
    expect(await findEditor(db, 'boss@x.dev')).toBeNull();
    expect(await countRows('editor')).toBe(1);
  });

  it('races two concurrent calls to exactly one inserted row', async () => {
    const now = Date.now();
    const [first, second] = await Promise.all([
      insertOwnerIfEmpty(db, 'boss@x.dev', 'Boss', now),
      insertOwnerIfEmpty(db, 'boss@x.dev', 'Boss', now),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(await countRows('editor')).toBe(1);
  });
});

describe('magic tokens (single-use by construction)', () => {
  it('issues a token and consumes it exactly once', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'hash-1', future, Date.now());
    expect(await consumeToken(db, 'hash-1', Date.now())).toBe('ed@x.dev');
    expect(await consumeToken(db, 'hash-1', Date.now())).toBeNull();
  });

  it('refuses an expired token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const past = Date.now() - 10_000;
    await issueToken(db, 'ed@x.dev', 'hash-2', past, Date.now());
    expect(await consumeToken(db, 'hash-2', Date.now())).toBeNull();
  });

  it('replaces a prior token for the same email', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'old', future, Date.now());
    await issueToken(db, 'ed@x.dev', 'new', future, Date.now());
    expect(await consumeToken(db, 'old', Date.now())).toBeNull();
    expect(await consumeToken(db, 'new', Date.now())).toBe('ed@x.dev');
  });
});

describe('magic tokens bound to the requesting browser (migration 0004)', () => {
  it('consumes a bound token only when the submitted nonce hash matches', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'bound-hash', future, Date.now(), 'nonce-a');
    expect(await consumeToken(db, 'bound-hash', Date.now(), 'nonce-a')).toBe('ed@x.dev');
  });

  it('refuses a bound token for a different browser and leaves it unburned', async () => {
    // The refusal must not consume the row: the editor who requested the link still has to be
    // able to click it from their own browser afterwards.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'bound-hash', future, Date.now(), 'nonce-a');
    expect(await consumeToken(db, 'bound-hash', Date.now(), 'nonce-b')).toBeNull();
    expect(await countRows('magic_token')).toBe(1);
    expect(await consumeToken(db, 'bound-hash', Date.now(), 'nonce-a')).toBe('ed@x.dev');
  });

  it('refuses a bound token when no nonce is submitted at all', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'bound-hash', future, Date.now(), 'nonce-a');
    expect(await consumeToken(db, 'bound-hash', Date.now())).toBeNull();
    expect(await countRows('magic_token')).toBe(1);
  });

  it('still consumes an unbound row, so a token minted before the migration stays confirmable', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'legacy-hash', future, Date.now());
    expect(await consumeToken(db, 'legacy-hash', Date.now(), 'nonce-a')).toBe('ed@x.dev');
  });
});

describe('sessions (server-side, role read live)', () => {
  it('resolves a valid session to the editor with the current role', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const future = Date.now() + 10_000;
    await createSession(db, 'sid-1', 'own@x.dev', future, Date.now());
    expect(await resolveSession(db, 'sid-1', Date.now())).toEqual({
      email: 'own@x.dev',
      displayName: 'Own',
      role: 'owner',
    });
    // A role change is reflected on the next resolve with no session change.
    await setEditorRole(db, 'own@x.dev', 'editor', []);
    expect((await resolveSession(db, 'sid-1', Date.now()))?.role).toBe('editor');
  });

  it('returns null for an expired session and after the editor is removed', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await createSession(db, 'sid-exp', 'ed@x.dev', Date.now() - 1, Date.now());
    expect(await resolveSession(db, 'sid-exp', Date.now())).toBeNull();

    await createSession(db, 'sid-live', 'ed@x.dev', Date.now() + 10_000, Date.now());
    await deleteEditor(db, 'ed@x.dev', []);
    expect(await resolveSession(db, 'sid-live', Date.now())).toBeNull();
  });

  it('deletes a session', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await createSession(db, 'sid-del', 'ed@x.dev', Date.now() + 10_000, Date.now());
    await deleteSession(db, 'sid-del');
    expect(await resolveSession(db, 'sid-del', Date.now())).toBeNull();
  });
});

describe('preview-token cascade (the third credential class)', () => {
  it('deleteEditor clears every preview link the removed editor minted', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await insertPreviewToken(db, {
      tokenHash: 'hash-1',
      concept: 'posts',
      entryId: 'e1',
      editor: 'ed@x.dev',
      expiresAt: Date.now() + 60_000,
    });
    await deleteEditor(db, 'ed@x.dev', []);
    expect(await findPreviewToken(db, 'hash-1')).toBeNull();
  });

  it('removeOwnerIfNotLast clears the removed owner’s preview links when another owner remains', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    await insertPreviewToken(db, {
      tokenHash: 'hash-2',
      concept: 'posts',
      entryId: 'e1',
      editor: 'a@x.dev',
      expiresAt: Date.now() + 60_000,
    });
    expect(await removeOwnerIfNotLast(db, 'a@x.dev', ['owner'])).toEqual({ outcome: 'ok' });
    expect(await findPreviewToken(db, 'hash-2')).toBeNull();
  });
});

describe('editor removal survives a site that has not applied migrations/0003_preview.sql', () => {
  const RECREATE_PREVIEW_TOKENS =
    'CREATE TABLE preview_tokens (token_hash TEXT PRIMARY KEY, concept TEXT NOT NULL, entry_id TEXT NOT NULL, editor TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)';

  it('deleteEditor still removes the editor and their session with preview_tokens missing', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await createSession(db, 'sid-nomig', 'ed@x.dev', Date.now() + 10_000, Date.now());
    await db.exec('DROP TABLE preview_tokens');
    try {
      await deleteEditor(db, 'ed@x.dev', []);
      expect(await findEditor(db, 'ed@x.dev')).toBeNull();
      expect(await resolveSession(db, 'sid-nomig', Date.now())).toBeNull();
    } finally {
      await db.exec(RECREATE_PREVIEW_TOKENS);
    }
  });

  it('removeOwnerIfNotLast still removes the owner with preview_tokens missing', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    await db.exec('DROP TABLE preview_tokens');
    try {
      expect(await removeOwnerIfNotLast(db, 'a@x.dev', ['owner'])).toEqual({ outcome: 'ok' });
      expect(await findEditor(db, 'a@x.dev')).toBeNull();
    } finally {
      await db.exec(RECREATE_PREVIEW_TOKENS);
    }
  });
});

describe('email normalization (the store owns it)', () => {
  it('stores a mixed-case insert under its normalized email', async () => {
    await insertEditor(db, '  Backup@Site.COM ', 'Backup', 'editor', Date.now());
    expect(await findEditor(db, 'backup@site.com')).toEqual({
      email: 'backup@site.com',
      displayName: 'Backup',
      role: 'editor',
    });
    expect((await listEditors(db)).map((e) => e.email)).toEqual(['backup@site.com']);
  });

  it('resolves a lookup written under a different case', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    expect((await findEditor(db, 'ED@X.Dev'))?.email).toBe('ed@x.dev');
  });

  it('rejects a case-variant insert of an email already present', async () => {
    await insertEditor(db, 'ed@x.dev', 'Ed', 'editor', Date.now());
    await expect(insertEditor(db, 'ED@X.dev', 'Ed Again', 'owner', Date.now())).rejects.toThrow();
    expect(await countRows('editor')).toBe(1);
  });

  it('leaves a reachable owner after a mixed-case owner is provisioned and one is removed', async () => {
    // The lockout the promoted `/auth-store` surface could otherwise cause: a roster screen adds an
    // owner as a user typed it, then an owner removes themselves through ManageEditors. Both rows
    // must be reachable by the lowercased email the login path looks up.
    await seedEditor('own@x.dev', 'Own', 'owner');
    await insertEditor(db, 'Backup@Site.com', 'Backup', 'owner', Date.now());
    expect(await findEditor(db, 'backup@site.com')).not.toBeNull();

    expect(await removeOwnerIfNotLast(db, 'own@x.dev', ['owner'])).toEqual({ outcome: 'ok' });
    const remaining = await listEditors(db);
    expect(remaining.map((e) => e.email)).toEqual(['backup@site.com']);
    // Reachable means the login path's normalized lookup finds it.
    expect(await findEditor(db, 'backup@site.com')).not.toBeNull();
  });

  it('matches a differently-cased row from every write path', async () => {
    await insertEditor(db, 'Mixed@X.dev', 'Mixed', 'editor', Date.now());
    await setEditorRole(db, 'MIXED@x.DEV', 'owner', ['owner']);
    expect((await findEditor(db, 'mixed@x.dev'))?.role).toBe('owner');

    await seedEditor('own@x.dev', 'Own', 'owner');
    expect(await demoteOwnerIfNotLast(db, ' mixed@X.DEV ', ['owner'], 'editor')).toEqual({ outcome: 'ok' });
    expect((await findEditor(db, 'mixed@x.dev'))?.role).toBe('editor');

    await setEditorRole(db, 'mixed@x.dev', 'owner', ['owner']);
    expect(await removeOwnerIfNotLast(db, 'Mixed@X.Dev', ['owner'])).toEqual({ outcome: 'ok' });
    expect(await findEditor(db, 'mixed@x.dev')).toBeNull();

    await insertEditor(db, 'other@x.dev', 'Other', 'editor', Date.now());
    await deleteEditor(db, 'OTHER@X.DEV', []);
    expect(await findEditor(db, 'other@x.dev')).toBeNull();
  });

  it('normalizes the bootstrap owner insert', async () => {
    expect(await insertOwnerIfEmpty(db, 'Boss@X.dev', 'Boss', Date.now())).toBe(true);
    expect((await findEditor(db, 'boss@x.dev'))?.role).toBe('owner');
  });

  it('normalizes the token and session paths', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const now = Date.now();
    await issueToken(db, 'Ed@X.dev', 'hash-mixed', now + 10_000, now);
    expect(await recentlyIssued(db, 'ED@x.DEV', now - 1)).toBe(true);
    expect(await consumeToken(db, 'hash-mixed', now)).toBe('ed@x.dev');

    await createSession(db, 'sid-mixed', 'Ed@X.dev', now + 10_000, now);
    expect((await resolveSession(db, 'sid-mixed', now))?.email).toBe('ed@x.dev');
  });
});

describe('an un-migrated AUTH_DB fails as a named condition', () => {
  // A site that deployed the nonce-binding engine without migrations/0004_login_nonce.sql: D1
  // answers both statements that name the column with "no such column: nonce_hash", which reached
  // the editor as a bare 500 on the login POST and named nothing an operator could act on.
  const noSuchColumn = new Error('D1_ERROR: no such column: nonce_hash at offset 42');

  /** A D1 double whose every statement rejects the way an un-migrated database does. */
  function unmigratedDb(): D1Database {
    const statement = { bind: () => statement, run: () => Promise.reject(noSuchColumn), first: () => Promise.reject(noSuchColumn) };
    return {
      prepare: () => statement,
      batch: () => Promise.reject(noSuchColumn),
    } as unknown as D1Database;
  }

  it('names migration 0004 when issueToken hits the missing column', async () => {
    const err = await issueToken(unmigratedDb(), 'ed@x.dev', 'hash', Date.now() + 10_000, Date.now(), 'nonce').catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(CairnError);
    expect((err as CairnError).conditionId).toBe('auth.store-unmigrated');
    expect((err as CairnError).message).toContain('migrations/0004_login_nonce.sql');
    expect((err as CairnError).cause).toBe(noSuchColumn);
  });

  it('names migration 0004 when consumeToken hits the missing column', async () => {
    const err = await consumeToken(unmigratedDb(), 'hash', Date.now()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CairnError);
    expect((err as CairnError).conditionId).toBe('auth.store-unmigrated');
    expect((err as CairnError).message).toContain('migrations/0004_login_nonce.sql');
  });

  it('rethrows any other D1 fault untouched, so the mapping stays narrow', async () => {
    const other = new Error('D1_ERROR: network unreachable');
    const statement = { bind: () => statement, first: () => Promise.reject(other) };
    const db = { prepare: () => statement } as unknown as D1Database;
    await expect(consumeToken(db, 'hash', Date.now())).rejects.toBe(other);
  });
});
