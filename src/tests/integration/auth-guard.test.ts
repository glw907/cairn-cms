import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeCookies, expectRedirect } from './_auth-harness.js';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import { createSession } from '../../lib/auth/store.js';
import { sessionCookieName, csrfCookieName } from '../../lib/auth/crypto.js';
import { defineRoles } from '../../lib/auth/roles.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';
import { withTestEnv } from '../helpers/with-test-env.js';
import type { AccessMap } from '../../lib/auth/access.js';

const db = env.AUTH_DB;

/**
 * createAuthGuard is annotated `: Handle`, kit's own type (the interop carve-out); its real
 *  runtime parameter is the lighter CairnEvent shape every fixture in this file builds, which
 *  lacks most of kit's RequestEvent members, so every construction in this file bridges it
 *  through this one shim rather than casting per call.
 */
function asHandle(guard: ReturnType<typeof createAuthGuard>): (input: {
  event: CairnEvent;
  resolve: (event: CairnEvent) => Promise<Response>;
}) => Promise<Response> {
  return guard as unknown as (input: {
    event: CairnEvent;
    resolve: (event: CairnEvent) => Promise<Response>;
  }) => Promise<Response>;
}

const handle = asHandle(createAuthGuard({ runtime: {} }));
const OK = new Response('ok');

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

function event(pathname: string, cookies = makeCookies()): CairnEvent {
  const url = `https://test.dev${pathname}`;
  return {
    url: new URL(url),
    request: new Request(url),
    params: {},
    route: { id: '/admin/[...path]' },
    cookies,
    locals: {},
    setHeaders: () => {},
  };
}

function httpEvent(pathname: string, host = 'test.dev', cookies = makeCookies()): CairnEvent {
  const url = `http://${host}${pathname}`;
  return {
    url: new URL(url),
    request: new Request(url),
    params: {},
    route: { id: '/admin/[...path]' },
    cookies,
    locals: {},
    setHeaders: () => {},
  };
}

function formEvent(
  pathname: string,
  opts: { csrfCookie?: string; csrfField?: string; csrfHeader?: string; origin?: string } = {},
): CairnEvent {
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
    params: {},
    route: { id: '/admin/[...path]' },
    cookies: makeCookies(cookieMap),
    locals: {},
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

  it('admits a valid session and populates locals.cairnEditor', async () => {
    const cookies = await seedSession('own@x.dev');
    const ev = event('/admin', cookies);
    const res = await handle({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnEditor).toEqual({ email: 'own@x.dev', displayName: 'Ed', role: 'owner', capability: 'owner' });
  });

  it('lets the login page and the confirm endpoint through without a session', async () => {
    const res1 = await handle({ event: event('/admin/login'), resolve: async () => OK });
    const res2 = await handle({ event: event('/admin/auth/confirm'), resolve: async () => OK });
    expect(res1).toBe(OK);
    expect(res2).toBe(OK);
  });

  it('redirects an anonymous request to any other /admin/auth path', async () => {
    const r = await expectRedirect(() => handle({ event: event('/admin/auth/request'), resolve: async () => OK }));
    expect(r).toEqual({ status: 303, location: '/admin/login' });
  });

  it('ignores non-admin paths', async () => {
    const res = await handle({ event: event('/about'), resolve: async () => OK });
    expect(res).toBe(OK);
  });
});

describe('capability resolution (a site-declared vocabulary)', () => {
  const ROLES = defineRoles({
    owner: 'owner',
    'webmaster': 'editor',
    staff: { capability: 'none', home: '/admin/staff' },
  });
  const guard = asHandle(createAuthGuard({ runtime: { roles: ROLES } }));

  it('resolves a declared non-canonical role to its mapped capability', async () => {
    await db
      .prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
      .bind('web@x.dev', 'Team', 'webmaster', Date.now())
      .run();
    await createSession(db, 'sid-web', 'web@x.dev', Date.now() + 10_000, Date.now());
    const ev = event('/admin', makeCookies({ [sessionCookieName(true)]: 'sid-web' }));
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnEditor).toEqual({ email: 'web@x.dev', displayName: 'Team', role: 'webmaster', capability: 'editor' });
  });

  it('resolves a declared none-capability role, authenticating without a warn log', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await db
      .prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
      .bind('inst@x.dev', 'Inst', 'staff', Date.now())
      .run();
    await createSession(db, 'sid-inst', 'inst@x.dev', Date.now() + 10_000, Date.now());
    const ev = event('/admin', makeCookies({ [sessionCookieName(true)]: 'sid-inst' }));
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnEditor).toEqual({ email: 'inst@x.dev', displayName: 'Inst', role: 'staff', capability: 'none' });
    const events = warnSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).not.toContain('auth.role.unknown');
    vi.restoreAllMocks();
  });

  it('resolves a role absent from the vocabulary to none, still authenticates, and logs auth.role.unknown', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await db
      .prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
      .bind('orphan@x.dev', 'Orphan', 'retired-role', Date.now())
      .run();
    await createSession(db, 'sid-orphan', 'orphan@x.dev', Date.now() + 10_000, Date.now());
    const ev = event('/admin', makeCookies({ [sessionCookieName(true)]: 'sid-orphan' }));
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnEditor).toEqual({ email: 'orphan@x.dev', displayName: 'Orphan', role: 'retired-role', capability: 'none' });
    const records = warnSpy.mock.calls.map(
      (c) => c[0] as { event?: string; email?: string; role?: string },
    );
    expect(records.some((r) => r.event === 'auth.role.unknown' && r.email === 'orphan@x.dev' && r.role === 'retired-role')).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('a runtime that carries no vocabulary, against an editor whose role is custom', () => {
  // A guard built over a runtime with no `roles` falls back to DEFAULT_ROLES (owner/editor), and a
  // custom role name absent from that pair resolves to `none`, not owner: the editor authenticates
  // but the engine refuses every content and admin-mutation route. This pins those semantics so the
  // doctor check and its report rest on verified behavior.
  const unwiredGuard = asHandle(createAuthGuard({ runtime: {} })); // a runtime that carries no vocabulary, as when the adapter declared none

  it('resolves a custom role to none (never owner) and warns auth.role.unknown', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await db
      .prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
      .bind('inst@x.dev', 'Inst', 'staff', Date.now())
      .run();
    await createSession(db, 'sid-unwired', 'inst@x.dev', Date.now() + 10_000, Date.now());
    const ev = event('/admin', makeCookies({ [sessionCookieName(true)]: 'sid-unwired' }));
    const res = await unwiredGuard({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnEditor?.capability).toBe('none');
    expect(ev.locals.cairnEditor?.capability).not.toBe('owner');
    const records = warnSpy.mock.calls.map((c) => c[0] as { event?: string; role?: string });
    expect(records.some((r) => r.event === 'auth.role.unknown' && r.role === 'staff')).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('the access map (Task 2)', () => {
  it('attaches the declared map to locals.cairnAccess alongside locals.cairnEditor', async () => {
    const access: AccessMap = { '/admin/money': ['webmaster'] };
    const guard = asHandle(createAuthGuard({ runtime: { access } }));
    const cookies = await seedSession('own@x.dev');
    const ev = event('/admin', cookies);
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnAccess).toBe(access);
  });

  it('attaches the declared role vocabulary to locals.cairnRoles', async () => {
    const roles = { owner: 'owner' as const, staff: 'none' as const };
    const guard = asHandle(createAuthGuard({ runtime: { roles } }));
    const ev = event('/admin', await seedSession('own3@x.dev'));
    await guard({ event: ev, resolve: async () => OK });
    expect(ev.locals.cairnRoles).toBe(roles);
  });

  it('attaches the default owner/editor pair to locals.cairnRoles when no vocabulary is declared', async () => {
    const ev = event('/admin', await seedSession('own4@x.dev'));
    await handle({ event: ev, resolve: async () => OK });
    expect(ev.locals.cairnRoles).toEqual({ owner: 'owner', editor: 'editor' });
  });

  it('attaches an empty map, not undefined, when no map is declared (Task 3: an absent map then only ever means the guard never ran)', async () => {
    const cookies = await seedSession('own2@x.dev');
    const ev = event('/admin', cookies);
    const res = await handle({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnAccess).toEqual({});
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
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
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
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin');
    expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=63072000');
    expect(res.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('attaches the headers to a public admin page too', async () => {
    const res = await handle({ event: event('/admin/login'), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('leaves a non-admin response untouched', async () => {
    const res = await handle({ event: event('/about'), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Frame-Options')).toBeNull();
  });

  it('restores includeSubDomains when the site opts in on createAuthGuard', async () => {
    const guard = asHandle(createAuthGuard({ runtime: {}, includeSubDomains: true }));
    const cookies = await seedSession('own2@x.dev');
    const res = await guard({ event: event('/admin', cookies), resolve: async () => new Response('ok') });
    expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
  });
});

describe('CSRF (cairn owns the admin token, the framework owns the Origin check)', () => {
  // The framework's own check refuses a cross-origin form POST before any handle runs, so the guard
  // never sees one in a running site; the guard's part is to not duplicate that refusal.
  it('passes a non-admin form POST with a foreign Origin through to resolve', async () => {
    const res = await handle({ event: formEvent('/contact', { origin: 'https://evil.dev' }), resolve: async () => OK });
    expect(res).toBe(OK);
  });

  it('serves the branded token page for an admin form POST with a matching Origin and a stale token', async () => {
    let resolved = false;
    const res = await handle({
      event: formEvent('/admin/login', {
        origin: 'https://test.dev',
        csrfCookie: 'FRESH',
        csrfField: 'STALE',
      }),
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
    const ev: CairnEvent = {
      url: new URL(url),
      request: new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrf: 'TOK', title: 'x' }),
      }),
      params: { concept: 'posts', id: 'p1' },
      route: { id: '/admin/[concept]/[id]' },
      cookies,
      locals: {},
      setHeaders: () => {},
    };
    const res = await handle({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnEditor?.email).toBe('own@x.dev');
  });

  it('passes an admin POST whose X-Cairn-CSRF header matches, with no form field (the upload path)', async () => {
    const cookies = await seedSession('own@x.dev');
    cookies.jar.set(csrfCookieName(true), 'TOK');
    const url = 'https://test.dev/admin/posts/p1';
    const ev: CairnEvent = {
      url: new URL(url),
      // A text/plain raw-body upload with the token in the header and no csrf form field.
      request: new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'text/plain', 'x-cairn-csrf': 'TOK' },
        body: new Uint8Array([0xff, 0xd8, 0xff]),
      }),
      params: { concept: 'posts', id: 'p1' },
      route: { id: '/admin/[concept]/[id]' },
      cookies,
      locals: {},
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
    expect(ev.locals.cairnEditor?.email).toBe('own@x.dev');
    expect(seen).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
  });

  /** A request to a site-authored admin endpoint, built with the given init and a CSRF cookie of TOK. */
  function rawAdminEvent(init: RequestInit, cookies: ReturnType<typeof makeCookies>): CairnEvent {
    const url = 'https://test.dev/admin/partner-hook';
    return {
      url: new URL(url),
      request: new Request(url, init),
      params: {},
      route: { id: '/admin/partner-hook' },
      cookies,
      locals: {},
      setHeaders: () => {},
    };
  }

  it('refuses an untyped-body admin POST that carries no token, never resolving', async () => {
    const cookies = await seedSession('own@x.dev');
    cookies.jar.set(csrfCookieName(true), 'TOK');
    const ev = rawAdminEvent(
      { method: 'POST', headers: { origin: 'https://partner.dev' }, body: new Blob([new Uint8Array([1, 2, 3])]) },
      cookies,
    );
    expect(ev.request.headers.get('content-type')).toBeNull();
    let resolved = false;
    const res = await handle({
      event: ev,
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(false);
    expect(res.status).toBe(403);
  });

  it('refuses an admin POST in the binary remote-form content type that carries no token', async () => {
    const cookies = await seedSession('own@x.dev');
    cookies.jar.set(csrfCookieName(true), 'TOK');
    const ev = rawAdminEvent(
      { method: 'POST', headers: { 'content-type': 'application/x-sveltekit-formdata' }, body: 'x' },
      cookies,
    );
    let resolved = false;
    const res = await handle({
      event: ev,
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(false);
    expect(res.status).toBe(403);
  });

  it('passes an untyped-body admin POST whose X-Cairn-CSRF header matches, body intact', async () => {
    const cookies = await seedSession('own@x.dev');
    cookies.jar.set(csrfCookieName(true), 'TOK');
    const ev = rawAdminEvent(
      { method: 'POST', headers: { 'x-cairn-csrf': 'TOK' }, body: new Blob([new Uint8Array([7, 8])]) },
      cookies,
    );
    let seen: Uint8Array | null = null;
    const res = await handle({
      event: ev,
      resolve: async () => {
        seen = new Uint8Array(await ev.request.arrayBuffer());
        return OK;
      },
    });
    expect(res).toBe(OK);
    expect(seen).toEqual(new Uint8Array([7, 8]));
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
  /** The guard under a Worker env with no AUTH_DB binding. */
  function handleUnbound(input: Parameters<typeof handle>[0]): Promise<Response> {
    return withTestEnv({ AUTH_DB: undefined }, () => handle(input));
  }

  function unboundEvent(pathname: string): CairnEvent {
    const url = `https://test.dev${pathname}`;
    return {
      url: new URL(url),
      request: new Request(url),
      params: {},
      route: { id: '/admin/[...path]' },
      cookies: makeCookies(),
      locals: {},
      setHeaders: () => {},
    };
  }

  it('serves the bindings condition page for a gated request and never resolves', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let resolved = false;
    const res = await handleUnbound({
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

  it('logs guard.refused at error level with reason=bindings and the condition id', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await handleUnbound({ event: unboundEvent('/admin'), resolve: async () => OK });
    const records = errorSpy.mock.calls.map(
      (c) => c[0] as { event?: string; reason?: string; conditionId?: string; path?: string },
    );
    expect(
      records.some(
        (r) =>
          r.event === 'guard.refused' &&
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
    const res = await handleUnbound({
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

describe('dev-backend flag in a deployed runtime (fail-closed tripwire)', () => {
  // AUTH_DB is bound so a refusal proves the tripwire fires before the bindings/session logic, not
  // because a binding is missing. The string '1' is the Worker-var form the dev backend sets.
  /** The guard under a Worker env carrying the dev-backend flag. */
  function handleFlagged(flag: string | boolean, input: Parameters<typeof handle>[0]): Promise<Response> {
    return withTestEnv({ CAIRN_DEV_BACKEND: flag }, () => handle(input));
  }

  function devBackendEvent(pathname: string): CairnEvent {
    const url = `https://test.dev${pathname}`;
    return {
      url: new URL(url),
      request: new Request(url),
      params: {},
      route: { id: '/admin/[...path]' },
      cookies: makeCookies(),
      locals: {},
      setHeaders: () => {},
    };
  }

  it('refuses with 503, never resolves, and logs guard.refused reason=dev_backend_in_prod', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let resolved = false;
    const res = await handleFlagged('1', {
      event: devBackendEvent('/admin'),
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(false);
    expect(res.status).toBe(503);
    const records = errorSpy.mock.calls.map(
      (c) => c[0] as { event?: string; reason?: string; path?: string },
    );
    expect(
      records.some(
        (r) => r.event === 'guard.refused' && r.reason === 'dev_backend_in_prod' && r.path === '/admin',
      ),
    ).toBe(true);
    vi.restoreAllMocks();
  });

  it('trips on the boolean true form as well', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handleFlagged(true, { event: devBackendEvent('/admin'), resolve: async () => OK });
    expect(res.status).toBe(503);
    vi.restoreAllMocks();
  });
});

describe('guard rejection logging', () => {
  it('logs no guard.refused for a non-admin cross-origin form POST', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({ event: formEvent('/contact', { origin: 'https://evil.dev' }), resolve: async () => OK });
    const events = warnSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).not.toContain('guard.refused');
    vi.restoreAllMocks();
  });

  it('logs guard.refused reason=https for a deployed admin request over http', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({ event: httpEvent('/admin'), resolve: async () => OK });
    const reasons = warnSpy.mock.calls.map((c) => (c[0] as { reason?: string }).reason);
    expect(reasons).toContain('https');
    vi.restoreAllMocks();
  });

  it('logs guard.refused reason=csrf for an admin form POST with no valid token', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({ event: formEvent('/admin/login'), resolve: async () => OK });
    const reasons = warnSpy.mock.calls.map((c) => (c[0] as { reason?: string }).reason);
    expect(reasons).toContain('csrf');
    vi.restoreAllMocks();
  });
});

describe('guard.refused CSRF discriminator (Task 3): detail, witness, hasSession', () => {
  type CsrfRecord = { reason?: string; detail?: string; witness?: string; hasSession?: boolean };

  it('reads no-cookie/witness=field/hasSession=false with no cookie, no header, and no session', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({ event: formEvent('/admin/login'), resolve: async () => OK });
    const records = warnSpy.mock.calls.map((c) => c[0] as CsrfRecord);
    expect(records).toContainEqual(
      expect.objectContaining({ reason: 'csrf', detail: 'no-cookie', witness: 'field', hasSession: false }),
    );
    vi.restoreAllMocks();
  });

  it('reads no-witness/witness=field when the cookie is present but no csrf field was submitted', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({ event: formEvent('/admin/login', { csrfCookie: 'TOK' }), resolve: async () => OK });
    const records = warnSpy.mock.calls.map((c) => c[0] as CsrfRecord);
    expect(records).toContainEqual(
      expect.objectContaining({ reason: 'csrf', detail: 'no-witness', witness: 'field' }),
    );
    vi.restoreAllMocks();
  });

  it('reads mismatch/witness=field when a submitted field does not match the cookie', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({
      event: formEvent('/admin/login', { csrfCookie: 'TOK', csrfField: 'WRONG' }),
      resolve: async () => OK,
    });
    const records = warnSpy.mock.calls.map((c) => c[0] as CsrfRecord);
    expect(records).toContainEqual(
      expect.objectContaining({ reason: 'csrf', detail: 'mismatch', witness: 'field' }),
    );
    vi.restoreAllMocks();
  });

  it('reads mismatch/witness=header for a media-shaped POST with a stale header (the precedence falsifiability proof)', async () => {
    // The upload transport: text/plain content type, no csrf form field at all, only a header. A
    // stale (wrong) header must read mismatch/witness=header, never fall through to the field path
    // (which would misreport it as no-witness, the incident this pass closes).
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const url = 'https://test.dev/admin/media/upload';
    const ev: CairnEvent = {
      url: new URL(url),
      request: new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'text/plain', 'x-cairn-csrf': 'WRONG' },
        body: new Uint8Array([0xff, 0xd8, 0xff]),
      }),
      params: {},
      route: { id: '/admin/[...path]' },
      cookies: makeCookies({ [csrfCookieName(true)]: 'TOK' }),
      locals: {},
      setHeaders: () => {},
    };
    const res = await handle({ event: ev, resolve: async () => OK });
    expect(res.status).toBe(403);
    const records = warnSpy.mock.calls.map((c) => c[0] as CsrfRecord);
    expect(records).toContainEqual(
      expect.objectContaining({ reason: 'csrf', detail: 'mismatch', witness: 'header' }),
    );
    expect(records.some((r) => r.detail === 'no-witness')).toBe(false);
    vi.restoreAllMocks();
  });

  it('reads unparseable-body/witness=field when no header was sent and the body cannot be read as form data', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const url = 'https://test.dev/admin/login';
    const ev: CairnEvent = {
      url: new URL(url),
      request: new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=z' },
        body: 'not actually multipart',
      }),
      params: {},
      route: { id: '/admin/[...path]' },
      cookies: makeCookies({ [csrfCookieName(true)]: 'TOK' }),
      locals: {},
      setHeaders: () => {},
    };
    await handle({ event: ev, resolve: async () => OK });
    const records = warnSpy.mock.calls.map((c) => c[0] as CsrfRecord);
    expect(records).toContainEqual(
      expect.objectContaining({ reason: 'csrf', detail: 'unparseable-body', witness: 'field' }),
    );
    vi.restoreAllMocks();
  });

  it('reads hasSession=true when a session cookie is present alongside a failed CSRF check', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sessionCookies = await seedSession('own@x.dev');
    sessionCookies.jar.set(csrfCookieName(true), 'TOK');
    const url = 'https://test.dev/admin/posts/p1';
    const ev: CairnEvent = {
      url: new URL(url),
      request: new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrf: 'WRONG' }),
      }),
      params: { concept: 'posts', id: 'p1' },
      route: { id: '/admin/[concept]/[id]' },
      cookies: sessionCookies,
      locals: {},
      setHeaders: () => {},
    };
    await handle({ event: ev, resolve: async () => OK });
    const records = warnSpy.mock.calls.map((c) => c[0] as CsrfRecord);
    expect(records).toContainEqual(
      expect.objectContaining({ reason: 'csrf', detail: 'mismatch', witness: 'field', hasSession: true }),
    );
    vi.restoreAllMocks();
  });

  it('never logs token material, prefix, or length on any csrf rejection', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await handle({
      event: formEvent('/admin/login', { csrfCookie: 'a-very-recognizable-secret-token', csrfField: 'WRONG' }),
      resolve: async () => OK,
    });
    const serialized = JSON.stringify(warnSpy.mock.calls);
    expect(serialized).not.toContain('a-very-recognizable-secret-token');
    expect(serialized).not.toContain('WRONG');
    vi.restoreAllMocks();
  });
});
