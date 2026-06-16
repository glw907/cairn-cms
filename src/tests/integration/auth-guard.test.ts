import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeCookies, expectRedirect } from './_auth-harness.js';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import { createSession } from '../../lib/auth/store.js';
import { sessionCookieName, csrfCookieName } from '../../lib/auth/crypto.js';
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

function httpEvent(pathname: string, host = 'test.dev', cookies = makeCookies()): RequestContext {
  const url = `http://${host}${pathname}`;
  return {
    url: new URL(url),
    request: new Request(url),
    cookies,
    locals: {},
    platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: `https://${host}` } },
    setHeaders: () => {},
  };
}

function formEvent(
  pathname: string,
  opts: { csrfCookie?: string; csrfField?: string; csrfHeader?: string; origin?: string } = {},
): RequestContext {
  const url = `https://test.dev${pathname}`;
  const body = new URLSearchParams();
  if (opts.csrfField !== undefined) body.set('csrf', opts.csrfField);
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  if (opts.origin !== undefined) headers.origin = opts.origin;
  if (opts.csrfHeader !== undefined) headers['x-cairn-csrf'] = opts.csrfHeader;
  const cookieMap: Record<string, string> = {};
  if (opts.csrfCookie) cookieMap[csrfCookieName(true)] = opts.csrfCookie;
  return {
    url: new URL(url),
    request: new Request(url, { method: 'POST', headers, body }),
    cookies: makeCookies(cookieMap),
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

describe('https requirement on a deployed host', () => {
  it('serves the help page for an http admin request and never resolves', async () => {
    let resolved = false;
    const res = await handle({
      event: httpEvent('/admin'),
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(false);
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toContain('Always Use HTTPS');
    expect(body).toContain('https://test.dev/admin');
  });

  it('covers the public login and auth paths too (where the form posts)', async () => {
    const login = await handle({ event: httpEvent('/admin/login'), resolve: async () => OK });
    const auth = await handle({ event: httpEvent('/admin/auth/request'), resolve: async () => OK });
    expect(login.status).toBe(400);
    expect(auth.status).toBe(400);
  });

  it('still hardens the help page with the baseline security headers', async () => {
    const res = await handle({ event: httpEvent('/admin/login'), resolve: async () => OK });
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('exempts local http development (wrangler dev)', async () => {
    const res = await handle({ event: httpEvent('/admin/login', 'localhost'), resolve: async () => OK });
    expect(res).toBe(OK);
  });

  it('leaves non-admin http paths alone', async () => {
    const res = await handle({ event: httpEvent('/about'), resolve: async () => OK });
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

describe('CSRF (cairn owns it)', () => {
  it('rejects a non-admin form POST with a mismatched Origin', async () => {
    const res = await handle({ event: formEvent('/contact', { origin: 'https://evil.dev' }), resolve: async () => OK });
    expect(res.status).toBe(403);
  });

  it('passes a non-admin form POST with a matching Origin', async () => {
    const res = await handle({ event: formEvent('/contact', { origin: 'https://test.dev' }), resolve: async () => OK });
    expect(res).toBe(OK);
  });

  it('serves the branded page for an admin form POST with no token, never resolving', async () => {
    let resolved = false;
    const res = await handle({
      event: formEvent('/admin/login'),
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(false);
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(await res.text()).toContain('Back to sign-in');
  });

  it('passes an admin form POST whose token matches, with no Origin header', async () => {
    const res = await handle({
      event: formEvent('/admin/login', { csrfCookie: 'TOK', csrfField: 'TOK' }),
      resolve: async () => OK,
    });
    expect(res).toBe(OK);
  });

  it('passes an authenticated admin form POST with a valid token and no Origin', async () => {
    const cookies = await seedSession('own@x.dev');
    cookies.jar.set(csrfCookieName(true), 'TOK');
    const url = 'https://test.dev/admin/posts/p1';
    const ev: RequestContext = {
      url: new URL(url),
      request: new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrf: 'TOK', title: 'x' }),
      }),
      cookies,
      locals: {},
      platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: 'https://test.dev' } },
      setHeaders: () => {},
    };
    const res = await handle({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.editor?.email).toBe('own@x.dev');
  });

  it('passes an admin POST whose X-Cairn-CSRF header matches, with no form field (the upload path)', async () => {
    const cookies = await seedSession('own@x.dev');
    cookies.jar.set(csrfCookieName(true), 'TOK');
    const url = 'https://test.dev/admin/posts/p1';
    const ev: RequestContext = {
      url: new URL(url),
      // A text/plain raw-body upload with the token in the header and no csrf form field.
      request: new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'text/plain', 'x-cairn-csrf': 'TOK' },
        body: new Uint8Array([0xff, 0xd8, 0xff]),
      }),
      cookies,
      locals: {},
      platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: 'https://test.dev' } },
      setHeaders: () => {},
    };
    // The header-CSRF path must NOT consume or clone the body, so a downstream action can still read
    // the raw upload bytes. resolve reads them and asserts they survived the guard intact.
    let seen: Uint8Array | null = null;
    const res = await handle({
      event: ev,
      resolve: async () => {
        seen = new Uint8Array(await ev.request.arrayBuffer());
        return OK;
      },
    });
    expect(res).toBe(OK);
    expect(ev.locals.editor?.email).toBe('own@x.dev');
    expect(seen).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
  });

  it('rejects an admin POST whose X-Cairn-CSRF header does not match the cookie', async () => {
    const res = await handle({
      event: formEvent('/admin/posts/p1', { csrfCookie: 'TOK', csrfHeader: 'WRONG' }),
      resolve: async () => OK,
    });
    expect(res).not.toBe(OK);
    expect(res.status).toBe(403);
  });
});

describe('missing AUTH_DB binding (operator fault)', () => {
  function unboundEvent(pathname: string): RequestContext {
    const url = `https://test.dev${pathname}`;
    return {
      url: new URL(url),
      request: new Request(url),
      cookies: makeCookies(),
      locals: {},
      platform: { env: { PUBLIC_ORIGIN: 'https://test.dev' } },
      setHeaders: () => {},
    };
  }

  it('serves the bindings condition page for a gated request and never resolves', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let resolved = false;
    const res = await handle({
      event: unboundEvent('/admin'),
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(false);
    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toContain('Wrangler bindings are missing');
    expect(body).toContain('AUTH_DB');
    vi.restoreAllMocks();
  });

  it('logs guard.rejected at error level with reason=bindings and the condition id', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await handle({ event: unboundEvent('/admin'), resolve: async () => OK });
    const records = errorSpy.mock.calls.map(
      (c) => c[0] as { event?: string; reason?: string; conditionId?: string; path?: string },
    );
    expect(
      records.some(
        (r) =>
          r.event === 'guard.rejected' &&
          r.reason === 'bindings' &&
          r.conditionId === 'config.bindings-missing' &&
          r.path === '/admin',
      ),
    ).toBe(true);
    vi.restoreAllMocks();
  });

  it('serves the bindings condition page on the public login path too', async () => {
    // A login form on a misbound deploy can never work: the request action has no store to
    // mint a token into. The branded condition page is the honest answer for every admin path.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let resolved = false;
    const res = await handle({
      event: unboundEvent('/admin/login'),
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(false);
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toContain('Wrangler bindings are missing');
    expect(body).toContain('AUTH_DB');
    vi.restoreAllMocks();
  });
});

describe('guard rejection logging', () => {
  it('logs guard.rejected reason=origin for a non-admin cross-origin form POST', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({ event: formEvent('/contact', { origin: 'https://evil.dev' }), resolve: async () => OK });
    const events = warnSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    const reasons = warnSpy.mock.calls.map((c) => (c[0] as { reason?: string }).reason);
    expect(events).toContain('guard.rejected');
    expect(reasons).toContain('origin');
    vi.restoreAllMocks();
  });

  it('logs guard.rejected reason=https for a deployed admin request over http', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({ event: httpEvent('/admin'), resolve: async () => OK });
    const reasons = warnSpy.mock.calls.map((c) => (c[0] as { reason?: string }).reason);
    expect(reasons).toContain('https');
    vi.restoreAllMocks();
  });

  it('logs guard.rejected reason=csrf for an admin form POST with no valid token', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({ event: formEvent('/admin/login'), resolve: async () => OK });
    const reasons = warnSpy.mock.calls.map((c) => (c[0] as { reason?: string }).reason);
    expect(reasons).toContain('csrf');
    vi.restoreAllMocks();
  });
});
