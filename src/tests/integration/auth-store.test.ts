import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor } from './_auth-harness.js';
import {
  findEditor,
  issueToken,
  consumeToken,
  createSession,
  resolvePrincipalRow,
  deleteSession,
  deleteSessionsForEmail,
  forgetPrincipal,
  checkAndIncrementRate,
  listEditors,
  insertEditor,
  deleteEditor,
  setEditorRole,
  removeOwnerIfNotLast,
  demoteOwnerIfNotLast,
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
    expect(await removeOwnerIfNotLast(db, 'own@x.dev')).toBe(false);
    expect(await findEditor(db, 'own@x.dev')).not.toBeNull();
    expect(await demoteOwnerIfNotLast(db, 'own@x.dev')).toBe(false);
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('owner');
  });

  it('removes or demotes an owner when another owner remains', async () => {
    await seedEditor('a@x.dev', 'A', 'owner');
    await seedEditor('b@x.dev', 'B', 'owner');
    expect(await demoteOwnerIfNotLast(db, 'a@x.dev')).toBe(true);
    expect((await findEditor(db, 'a@x.dev'))?.role).toBe('editor');

    await seedEditor('c@x.dev', 'C', 'owner'); // b and c are owners now
    expect(await removeOwnerIfNotLast(db, 'b@x.dev')).toBe(true);
    expect(await findEditor(db, 'b@x.dev')).toBeNull();
  });
});

describe('magic tokens (single-use by construction)', () => {
  it('issues a token and consumes it exactly once, returning its tier and redirect', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'hash-1', 'admin', '/admin/posts', future, Date.now());
    expect(await consumeToken(db, 'hash-1', Date.now())).toEqual({
      email: 'ed@x.dev',
      tier: 'admin',
      redirectTo: '/admin/posts',
    });
    expect(await consumeToken(db, 'hash-1', Date.now())).toBeNull();
  });

  it('returns a null redirect when none was stored', async () => {
    const future = Date.now() + 10_000;
    await issueToken(db, 'fan@x.dev', 'hash-m', 'member', null, future, Date.now());
    expect(await consumeToken(db, 'hash-m', Date.now())).toEqual({
      email: 'fan@x.dev',
      tier: 'member',
      redirectTo: null,
    });
  });

  it('refuses an expired token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const past = Date.now() - 10_000;
    await issueToken(db, 'ed@x.dev', 'hash-2', 'admin', null, past, Date.now());
    expect(await consumeToken(db, 'hash-2', Date.now())).toBeNull();
  });

  it('replaces a prior token for the same email', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'old', 'admin', null, future, Date.now());
    await issueToken(db, 'ed@x.dev', 'new', 'admin', null, future, Date.now());
    expect(await consumeToken(db, 'old', Date.now())).toBeNull();
    expect((await consumeToken(db, 'new', Date.now()))?.email).toBe('ed@x.dev');
  });
});

describe('sessions (server-side, role read live)', () => {
  it('resolves a valid session to the editor with the current role', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const future = Date.now() + 10_000;
    await createSession(db, 'sid-1', 'own@x.dev', 'admin', future, Date.now());
    expect(await resolvePrincipalRow(db, 'sid-1', Date.now())).toEqual({
      email: 'own@x.dev',
      tier: 'admin',
      role: 'owner',
      displayName: 'Own',
    });
    // A role change is reflected on the next resolve with no session change.
    await setEditorRole(db, 'own@x.dev', 'editor');
    expect((await resolvePrincipalRow(db, 'sid-1', Date.now()))?.role).toBe('editor');
  });

  it('returns null for an expired session, and after the editor (with its sessions) is removed', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await createSession(db, 'sid-exp', 'ed@x.dev', 'admin', Date.now() - 1, Date.now());
    expect(await resolvePrincipalRow(db, 'sid-exp', Date.now())).toBeNull();

    await createSession(db, 'sid-live', 'ed@x.dev', 'admin', Date.now() + 10_000, Date.now());
    // deleteEditor cascades to the editor's sessions, so the row is gone, not merely role-stripped.
    await deleteEditor(db, 'ed@x.dev');
    expect(await resolvePrincipalRow(db, 'sid-live', Date.now())).toBeNull();
  });

  it('deletes a session', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await createSession(db, 'sid-del', 'ed@x.dev', 'admin', Date.now() + 10_000, Date.now());
    await deleteSession(db, 'sid-del');
    expect(await resolvePrincipalRow(db, 'sid-del', Date.now())).toBeNull();
  });
});

describe('principal-row resolution, fixation, forget, and rate-limit', () => {
  it('resolvePrincipalRow resolves a member session with role null and no display name (no inner join)', async () => {
    await createSession(env.AUTH_DB, 'sm', 'member@x.io', 'member', Date.now() + 1000, Date.now());
    const row = await resolvePrincipalRow(env.AUTH_DB, 'sm', Date.now());
    expect(row).toEqual({ email: 'member@x.io', tier: 'member', role: null, displayName: null });
  });

  it('resolvePrincipalRow left-joins the role and display name for an editor session', async () => {
    await seedEditor('boss@x.io', 'Boss', 'owner');
    await createSession(env.AUTH_DB, 'sa', 'boss@x.io', 'admin', Date.now() + 1000, Date.now());
    const row = await resolvePrincipalRow(env.AUTH_DB, 'sa', Date.now());
    expect(row).toEqual({ email: 'boss@x.io', tier: 'admin', role: 'owner', displayName: 'Boss' });
  });

  it('resolvePrincipalRow returns null for an expired session', async () => {
    await createSession(env.AUTH_DB, 'se', 'x@x.io', 'member', Date.now() - 1, Date.now());
    expect(await resolvePrincipalRow(env.AUTH_DB, 'se', Date.now())).toBeNull();
  });

  it('deleteSessionsForEmail clears prior sessions (fixation defense)', async () => {
    await createSession(env.AUTH_DB, 's1', 'd@x.io', 'member', Date.now() + 1000, Date.now());
    await deleteSessionsForEmail(env.AUTH_DB, 'd@x.io');
    expect(await resolvePrincipalRow(env.AUTH_DB, 's1', Date.now())).toBeNull();
  });

  it('forgetPrincipal deletes sessions and tokens for an email', async () => {
    await createSession(env.AUTH_DB, 'sf', 'gone@x.io', 'member', Date.now() + 1000, Date.now());
    await env.AUTH_DB.prepare('INSERT INTO magic_token (token_hash, email, expires_at, created_at) VALUES (?,?,?,?)')
      .bind('h', 'gone@x.io', Date.now() + 1000, Date.now()).run();
    await forgetPrincipal(env.AUTH_DB, 'gone@x.io');
    expect(await resolvePrincipalRow(env.AUTH_DB, 'sf', Date.now())).toBeNull();
  });

  it('checkAndIncrementRate allows up to the limit then refuses in-window', async () => {
    const now = 1_000_000;
    expect(await checkAndIncrementRate(env.AUTH_DB, 'ip:9.9.9.9', now, 60_000, 2)).toBe(true);
    expect(await checkAndIncrementRate(env.AUTH_DB, 'ip:9.9.9.9', now + 1, 60_000, 2)).toBe(true);
    expect(await checkAndIncrementRate(env.AUTH_DB, 'ip:9.9.9.9', now + 2, 60_000, 2)).toBe(false);
    // A later window resets.
    expect(await checkAndIncrementRate(env.AUTH_DB, 'ip:9.9.9.9', now + 60_001, 60_000, 2)).toBe(true);
  });
});
