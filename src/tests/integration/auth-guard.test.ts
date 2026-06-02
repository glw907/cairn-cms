import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor, makeCookies, expectRedirect } from './_auth-harness.js';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import { createSession } from '../../lib/auth/store.js';
import { sessionCookieName } from '../../lib/auth/crypto.js';
import type { RequestContext } from '../../lib/sveltekit/types.js';

const db = env.AUTH_DB;
const handle = createAuthGuard();
const OK = new Response('ok');

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

function event(pathname: string, cookies = makeCookies()): RequestContext {
  const url = `https://test.dev${pathname}`;
  return {
    url: new URL(url),
    request: new Request(url),
    cookies,
    locals: {},
    platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: 'https://test.dev' } },
    setHeaders: () => {},
  };
}

async function seedSession(email: string): Promise<ReturnType<typeof makeCookies>> {
  await seedEditor(email, 'Ed', 'owner');
  await createSession(db, 'sid-ok', email, Date.now() + 10_000, Date.now());
  return makeCookies({ [sessionCookieName(true)]: 'sid-ok' });
}

describe('guard (scenario 6)', () => {
  it('redirects an anonymous request to a protected path', async () => {
    const r = await expectRedirect(() => handle({ event: event('/admin'), resolve: async () => OK }));
    expect(r).toEqual({ status: 303, location: '/admin/login' });
  });

  it('admits a valid session and populates locals.editor', async () => {
    const cookies = await seedSession('own@x.dev');
    const ev = event('/admin', cookies);
    const res = await handle({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.editor).toEqual({ email: 'own@x.dev', displayName: 'Ed', role: 'owner' });
  });

  it('lets the login and auth endpoints through without a session', async () => {
    const res1 = await handle({ event: event('/admin/login'), resolve: async () => OK });
    const res2 = await handle({ event: event('/admin/auth/request'), resolve: async () => OK });
    expect(res1).toBe(OK);
    expect(res2).toBe(OK);
  });

  it('ignores non-admin paths', async () => {
    const res = await handle({ event: event('/about'), resolve: async () => OK });
    expect(res).toBe(OK);
  });
});

describe('admin security headers (Unit 2)', () => {
  it('attaches the baseline headers to a gated admin response', async () => {
    const cookies = await seedSession('own@x.dev');
    const res = await handle({ event: event('/admin', cookies), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
    expect(res.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('attaches the headers to a public admin page too', async () => {
    const res = await handle({ event: event('/admin/login'), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('leaves a non-admin response untouched', async () => {
    const res = await handle({ event: event('/about'), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Frame-Options')).toBeNull();
  });
});
