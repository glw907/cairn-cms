import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createSession } from '../../lib/auth/store.js';
import { loadPrincipal, requireScope, requireAnyScope } from '../../lib/sveltekit/scope-guards.js';
import { makeCookies, expectRedirect, expectHttpError } from './_auth-harness.js';
import { sessionCookieName } from '../../lib/auth/crypto.js';

function memberEvent(id?: string) {
  const cookies = makeCookies(id ? { [sessionCookieName(true)]: id } : {});
  return { url: new URL('https://test.dev/account'), request: new Request('https://test.dev/account'),
    cookies, locals: {} as Record<string, unknown>, platform: { env: { AUTH_DB: env.AUTH_DB } }, setHeaders() {} };
}

describe('scope guards', () => {
  it('loadPrincipal resolves and memoizes on locals', async () => {
    await createSession(env.AUTH_DB, 'g1', 'm@x.io', 'member', Date.now() + 1000, Date.now());
    const authorize = () => ['member'];
    const ev = memberEvent('g1');
    const p = await loadPrincipal(ev as never, { authorize });
    expect(p?.scopes).toEqual(['member']);
    expect((ev.locals as { principal?: unknown }).principal).toBe(p);
  });
  it('loadPrincipal returns null with no session cookie and never queries', async () => {
    const ev = memberEvent();
    expect(await loadPrincipal(ev as never, {})).toBeNull();
  });
  it('requireScope returns the principal when the scope is held', async () => {
    await createSession(env.AUTH_DB, 'g2', 'm2@x.io', 'member', Date.now() + 1000, Date.now());
    const ev = memberEvent('g2');
    const p = await requireScope(ev as never, 'member', { authorize: () => ['member'] });
    expect(p.email).toBe('m2@x.io');
  });
  it('requireScope redirects an unauthenticated visitor to the login path', async () => {
    const ev = memberEvent();
    const r = await expectRedirect(() => requireScope(ev as never, 'member', { loginPath: '/login' }));
    expect(r).toEqual({ status: 303, location: '/login' });
  });
  it('requireScope 403s an authenticated principal missing the scope', async () => {
    await createSession(env.AUTH_DB, 'g3', 'm3@x.io', 'member', Date.now() + 1000, Date.now());
    const ev = memberEvent('g3');
    const r = await expectHttpError(() => requireScope(ev as never, 'member', { authorize: () => [] }));
    expect(r.status).toBe(403);
  });
  it('requireAnyScope passes when any one scope is held', async () => {
    await createSession(env.AUTH_DB, 'g4', 'm4@x.io', 'member', Date.now() + 1000, Date.now());
    const ev = memberEvent('g4');
    const p = await requireAnyScope(ev as never, ['member', 'member:gold'], { authorize: () => ['member:gold'] });
    expect(p.email).toBe('m4@x.io');
  });
});
