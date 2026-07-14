import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, countRows, expectHttpError } from './_auth-harness.js';
import { createEditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import { findEditor, createSession, resolveSession } from '../../lib/auth/store.js';
import { defineRoles } from '../../lib/auth/roles.js';

/** One editor-mutation log record, as read off the `console.log` spy. */
interface EditorLogRecord {
  event?: string;
  owner?: string;
  target?: string;
  role?: string;
  capability?: string;
}

const db = env.AUTH_DB;
const routes = createEditorRoutes();

// An ASC-shaped vocabulary: 'owner' plus 'president' (a second owner-level name), 'club-admin'
// (editor capability under a site-chosen name), and 'instructor' (none capability). Every
// custom-vocabulary test below runs against this same declaration.
const ascRoles = defineRoles({
  owner: 'owner',
  president: 'owner',
  'club-admin': 'editor',
  instructor: 'none',
});
const ascRoutes = createEditorRoutes({ roles: ascRoles });

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

/** Build an event whose locals.editor is the acting owner (as the guard would set it). */
function asOwner(form?: Record<string, string>) {
  const ev = makeEvent({ url: 'https://test.dev/admin/editors', form, editor: { email: 'own@x.dev', displayName: 'Own', role: 'owner', capability: 'owner' } });
  return ev;
}

describe('management gate (scenario 7)', () => {
  it('rejects an editor from the management surface with 403', async () => {
    const ev = makeEvent({ url: 'https://test.dev/admin/editors', editor: { email: 'ed@x.dev', displayName: 'Ed', role: 'editor', capability: 'editor' } });
    const r = await expectHttpError(() => routes.editorsLoad(ev));
    expect(r.status).toBe(403);
  });

  it('lists editors for an owner', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const data = await routes.editorsLoad(asOwner());
    expect(data.editors.map((e) => e.email)).toEqual(['ed@x.dev', 'own@x.dev']);
    expect(data.self).toBe('own@x.dev');
  });
});

describe('add, remove, set role', () => {
  it('adds an editor', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const result = await routes.addEditorAction(asOwner({ email: 'New@x.dev', name: 'New', role: 'editor' }));
    expect(result).toEqual({ ok: true });
    expect((await findEditor(db, 'new@x.dev'))?.role).toBe('editor');
  });

  it('removes a non-last-owner editor', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const result = await routes.removeEditorAction(asOwner({ email: 'ed@x.dev' }));
    expect(result).toEqual({ ok: true });
    expect(await findEditor(db, 'ed@x.dev')).toBeNull();
  });
});

describe('editor-mutation log events', () => {
  it('logs editor.added with the acting owner and the new editor, never a token or session id', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await routes.addEditorAction(asOwner({ email: 'New@x.dev', name: 'New', role: 'editor' }));
    const record = logSpy.mock.calls.map((c) => c[0] as EditorLogRecord).find((r) => r.event === 'editor.added');
    expect(record).toMatchObject({ owner: 'own@x.dev', target: 'new@x.dev', role: 'editor', capability: 'editor' });
    expect(JSON.stringify(record)).not.toMatch(/token|sid-/i);
    vi.restoreAllMocks();
  });

  it('logs editor.removed with the acting owner and the removed editor', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await routes.removeEditorAction(asOwner({ email: 'ed@x.dev' }));
    const record = logSpy.mock.calls.map((c) => c[0] as EditorLogRecord).find((r) => r.event === 'editor.removed');
    expect(record).toMatchObject({ owner: 'own@x.dev', target: 'ed@x.dev' });
    vi.restoreAllMocks();
  });

  it('does not log editor.removed when the anti-lockout rule refuses the removal', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await routes.removeEditorAction(asOwner({ email: 'own@x.dev' }));
    const records = logSpy.mock.calls.map((c) => c[0] as EditorLogRecord).filter((r) => r.event === 'editor.removed');
    expect(records).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it('logs editor.role_changed with the acting owner, the target, and the new role', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('two@x.dev', 'Two', 'owner');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await routes.setRoleAction(asOwner({ email: 'two@x.dev', role: 'editor' }));
    const record = logSpy.mock.calls.map((c) => c[0] as EditorLogRecord).find((r) => r.event === 'editor.role_changed');
    expect(record).toMatchObject({ owner: 'own@x.dev', target: 'two@x.dev', role: 'editor', capability: 'editor' });
    vi.restoreAllMocks();
  });
});

describe('last-owner anti-lockout (scenario 8)', () => {
  it('refuses to remove the last owner and writes nothing', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const result = await routes.removeEditorAction(asOwner({ email: 'own@x.dev' }));
    expect(result).toHaveProperty('status', 400);
    expect(await countRows('editor')).toBe(1);
  });

  it('refuses to demote the last owner', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const result = await routes.setRoleAction(asOwner({ email: 'own@x.dev', role: 'editor' }));
    expect(result).toHaveProperty('status', 400);
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('owner');
  });

  it('allows demoting an owner when another owner remains', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('two@x.dev', 'Two', 'owner');
    const result = await routes.setRoleAction(asOwner({ email: 'two@x.dev', role: 'editor' }));
    expect(result).toEqual({ ok: true });
    expect((await findEditor(db, 'two@x.dev'))?.role).toBe('editor');
  });
});

describe('demotion takes effect live (scenario 9)', () => {
  it('a demoted editor resolves with the new role on the next request, no re-login', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('two@x.dev', 'Two', 'owner');
    await createSession(db, 'sid-two', 'two@x.dev', Date.now() + 10_000, Date.now());
    expect((await resolveSession(db, 'sid-two', Date.now()))?.role).toBe('owner');
    await routes.setRoleAction(asOwner({ email: 'two@x.dev', role: 'editor' }));
    expect((await resolveSession(db, 'sid-two', Date.now()))?.role).toBe('editor');
  });
});

describe('editorsLoad carries the declared vocabulary', () => {
  it('lists each role with its resolved capability, default pair', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const data = await routes.editorsLoad(asOwner());
    expect(data.vocabulary).toEqual(
      expect.arrayContaining([
        { role: 'owner', capability: 'owner' },
        { role: 'editor', capability: 'editor' },
      ]),
    );
  });

  it('lists a custom vocabulary and fills capability on every listed editor', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('admin@x.dev', 'Admin', 'club-admin');
    const data = await ascRoutes.editorsLoad(asOwner());
    expect(data.vocabulary).toEqual(
      expect.arrayContaining([
        { role: 'owner', capability: 'owner' },
        { role: 'president', capability: 'owner' },
        { role: 'club-admin', capability: 'editor' },
        { role: 'instructor', capability: 'none' },
      ]),
    );
    const admin = data.editors.find((e) => e.email === 'admin@x.dev');
    expect(admin).toMatchObject({ role: 'club-admin', capability: 'editor' });
  });
});

describe('role validation against the vocabulary', () => {
  it('rejects adding an editor with a role outside the vocabulary', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const result = await routes.addEditorAction(asOwner({ email: 'ghost@x.dev', name: 'Ghost', role: 'club-admin' }));
    expect(result).toHaveProperty('status', 400);
    expect(await findEditor(db, 'ghost@x.dev')).toBeNull();
  });

  it('rejects setRole to a role outside the vocabulary, writing nothing', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const result = await routes.setRoleAction(asOwner({ email: 'ed@x.dev', role: 'club-admin' }));
    expect(result).toHaveProperty('status', 400);
    expect((await findEditor(db, 'ed@x.dev'))?.role).toBe('editor');
  });

  it('accepts adding and setting club-admin under the ASC-shaped vocabulary', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const added = await ascRoutes.addEditorAction(asOwner({ email: 'admin@x.dev', name: 'Admin', role: 'club-admin' }));
    expect(added).toEqual({ ok: true });
    expect((await findEditor(db, 'admin@x.dev'))?.role).toBe('club-admin');

    const changed = await ascRoutes.setRoleAction(asOwner({ email: 'admin@x.dev', role: 'instructor' }));
    expect(changed).toEqual({ ok: true });
    expect((await findEditor(db, 'admin@x.dev'))?.role).toBe('instructor');
  });
});

describe('last-owner guard over a custom vocabulary (routes level)', () => {
  it('refuses to demote the last owner-capability row when a second owner-level name is declared but has no rows', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const result = await ascRoutes.setRoleAction(asOwner({ email: 'own@x.dev', role: 'club-admin' }));
    expect(result).toHaveProperty('status', 400);
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('owner');
  });

  it('allows demoting when the second owner-level name carries a real row', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('pres@x.dev', 'Pres', 'president');
    const result = await ascRoutes.setRoleAction(asOwner({ email: 'own@x.dev', role: 'club-admin' }));
    expect(result).toEqual({ ok: true });
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('club-admin');
  });
});
