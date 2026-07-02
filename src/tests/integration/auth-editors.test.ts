import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, countRows, expectHttpError } from './_auth-harness.js';
import { createEditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import { findEditor, createSession, resolveSession } from '../../lib/auth/store.js';

/** One editor-mutation log record, as read off the `console.log` spy. */
interface EditorLogRecord {
  event?: string;
  owner?: string;
  target?: string;
  role?: string;
}

const db = env.AUTH_DB;
const routes = createEditorRoutes();

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

/** Build an event whose locals.editor is the acting owner (as the guard would set it). */
function asOwner(form?: Record<string, string>) {
  const ev = makeEvent({ url: 'https://test.dev/admin/editors', form, editor: { email: 'own@x.dev', displayName: 'Own', role: 'owner' } });
  return ev;
}

describe('management gate (scenario 7)', () => {
  it('rejects an editor from the management surface with 403', async () => {
    const ev = makeEvent({ url: 'https://test.dev/admin/editors', editor: { email: 'ed@x.dev', displayName: 'Ed', role: 'editor' } });
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
    expect(record).toMatchObject({ owner: 'own@x.dev', target: 'new@x.dev', role: 'editor' });
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
    expect(record).toMatchObject({ owner: 'own@x.dev', target: 'two@x.dev', role: 'editor' });
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
