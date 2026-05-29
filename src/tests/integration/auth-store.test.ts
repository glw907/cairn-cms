import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor } from './_auth-harness.js';
import {
  findEditor,
  issueToken,
  consumeToken,
  createSession,
  resolveSession,
  deleteSession,
  listEditors,
  insertEditor,
  deleteEditor,
  setEditorRole,
  countOwners,
} from '../../lib/auth/store.js';

const db = env.AUTH_DB;

// Each test starts from an empty allowlist; the harness D1 persists across a file.
beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM session'),
    db.prepare('DELETE FROM magic_token'),
    db.prepare('DELETE FROM editor'),
  ]);
});

describe('editors', () => {
  it('finds a seeded editor and returns null for an unknown one', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    expect(await findEditor(db, 'ed@x.dev')).toEqual({ email: 'ed@x.dev', displayName: 'Ed', role: 'editor' });
    expect(await findEditor(db, 'nope@x.dev')).toBeNull();
  });

  it('lists editors sorted by email and counts owners', async () => {
    await seedEditor('b@x.dev', 'B', 'editor');
    await seedEditor('a@x.dev', 'A', 'owner');
    expect((await listEditors(db)).map((e) => e.email)).toEqual(['a@x.dev', 'b@x.dev']);
    expect(await countOwners(db)).toBe(1);
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
