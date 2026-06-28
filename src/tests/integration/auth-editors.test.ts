import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor, makeEvent, countRows, expectHttpError } from './_auth-harness.js';
import { createEditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import { findEditor, createSession, resolvePrincipalRow } from '../../lib/auth/store.js';

const db = env.AUTH_DB;
const routes = createEditorRoutes();

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

/** Build an event whose locals.editor is the acting owner (as the guard would set it). */
function asOwner(form?: Record<string, string>) {
  const ev = makeEvent({ url: 'https://test.dev/admin/editors', form, principal: { email: 'own@x.dev', displayName: 'Own', scopes: ['admin:owner', 'admin:editor'], tier: 'admin' } });
  return ev;
}

describe('management gate (scenario 7)', () => {
  it('rejects an editor from the management surface with 403', async () => {
    const ev = makeEvent({ url: 'https://test.dev/admin/editors', principal: { email: 'ed@x.dev', displayName: 'Ed', scopes: ['admin:editor'], tier: 'admin' } });
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
    await createSession(db, 'sid-two', 'two@x.dev', 'admin', Date.now() + 10_000, Date.now());
    expect((await resolvePrincipalRow(db, 'sid-two', Date.now()))?.role).toBe('owner');
    await routes.setRoleAction(asOwner({ email: 'two@x.dev', role: 'editor' }));
    expect((await resolvePrincipalRow(db, 'sid-two', Date.now()))?.role).toBe('editor');
  });
});
