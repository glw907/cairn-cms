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
    await setEditorRole(db, 'new@x.dev', 'owner');
    expect((await findEditor(db, 'new@x.dev'))?.role).toBe('owner');
    await deleteEditor(db, 'new@x.dev');
    expect(await findEditor(db, 'new@x.dev')).toBeNull();
  });
});

describe('last-owner guards (atomic)', () => {
  it('refuses to remove or demote the last owner and writes nothing', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    expect(await removeOwnerIfNotLast(db, 'own@x.dev', ['owner'])).toBe(false);
    expect(await findEditor(db, 'own@x.dev')).not.toBeNull();
    expect(await demoteOwnerIfNotLast(db, 'own@x.dev', ['owner'], 'editor')).toBe(false);
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('owner');
  });

  it('removes or demotes an owner when another owner remains', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    expect(await demoteOwnerIfNotLast(db, 'a@x.dev', ['owner'], 'editor')).toBe(true);
    expect((await findEditor(db, 'a@x.dev'))?.role).toBe('editor');

    await seedEditor('c@x.dev', 'C', 'owner'); // b and c are owners now
    expect(await removeOwnerIfNotLast(db, 'b@x.dev', ['owner'])).toBe(true);
    expect(await findEditor(db, 'b@x.dev')).toBeNull();
  });

  it('counts across a two-owner-level-name vocabulary, not the literal owner string', async () => {
    // A club-shaped vocabulary where both 'owner' and 'president' carry owner capability. A row
    // under either name counts toward the "another owner remains" test.
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('pres@x.dev', 'Pres', 'president');
    const ownerRoles = ['owner', 'president'];
    expect(await demoteOwnerIfNotLast(db, 'own@x.dev', ownerRoles, 'club-admin')).toBe(true);
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('club-admin');
    // Only 'pres@x.dev' carries an owner-level role now; refuse to strand the roster.
    expect(await removeOwnerIfNotLast(db, 'pres@x.dev', ownerRoles)).toBe(false);
    expect(await findEditor(db, 'pres@x.dev')).not.toBeNull();
  });

  it('refuses when a second owner-level name is declared but has no rows', async () => {
    // The vocabulary declares both 'owner' and 'president' as owner-capability, but only one row
    // exists. The declared name set must not be mistaken for actual headcount.
    await seedEditor('own@x.dev', 'Own', 'owner');
    expect(await demoteOwnerIfNotLast(db, 'own@x.dev', ['owner', 'president'], 'editor')).toBe(false);
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('owner');
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
    await setEditorRole(db, 'own@x.dev', 'editor');
    expect((await resolveSession(db, 'sid-1', Date.now()))?.role).toBe('editor');
  });

  it('returns null for an expired session and after the editor is removed', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await createSession(db, 'sid-exp', 'ed@x.dev', Date.now() - 1, Date.now());
    expect(await resolveSession(db, 'sid-exp', Date.now())).toBeNull();

    await createSession(db, 'sid-live', 'ed@x.dev', Date.now() + 10_000, Date.now());
    await deleteEditor(db, 'ed@x.dev');
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
    await deleteEditor(db, 'ed@x.dev');
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
    expect(await removeOwnerIfNotLast(db, 'a@x.dev', ['owner'])).toBe(true);
    expect(await findPreviewToken(db, 'hash-2')).toBeNull();
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

    expect(await removeOwnerIfNotLast(db, 'own@x.dev', ['owner'])).toBe(true);
    const remaining = await listEditors(db);
    expect(remaining.map((e) => e.email)).toEqual(['backup@site.com']);
    // Reachable means the login path's normalized lookup finds it.
    expect(await findEditor(db, 'backup@site.com')).not.toBeNull();
  });

  it('matches a differently-cased row from every write path', async () => {
    await insertEditor(db, 'Mixed@X.dev', 'Mixed', 'editor', Date.now());
    await setEditorRole(db, 'MIXED@x.DEV', 'owner');
    expect((await findEditor(db, 'mixed@x.dev'))?.role).toBe('owner');

    await seedEditor('own@x.dev', 'Own', 'owner');
    expect(await demoteOwnerIfNotLast(db, ' mixed@X.DEV ', ['owner'], 'editor')).toBe(true);
    expect((await findEditor(db, 'mixed@x.dev'))?.role).toBe('editor');

    await setEditorRole(db, 'mixed@x.dev', 'owner');
    expect(await removeOwnerIfNotLast(db, 'Mixed@X.Dev', ['owner'])).toBe(true);
    expect(await findEditor(db, 'mixed@x.dev')).toBeNull();

    await insertEditor(db, 'other@x.dev', 'Other', 'editor', Date.now());
    await deleteEditor(db, 'OTHER@X.DEV');
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
