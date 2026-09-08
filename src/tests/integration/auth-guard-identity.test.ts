// Task 2 of the identity-seam pass: the guard's identity branch. Mounted on
// auth-guard.test.ts's own harness (env.AUTH_DB, asHandle, ./_auth-harness.js). A fixture
// resolver whose answer each test controls stands in for a site's own identity gate.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeCookies } from './_auth-harness.js';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import { createSession, resolveSession } from '../../lib/auth/store.js';
import { sessionCookieName } from '../../lib/auth/crypto.js';
import { defineRoles } from '../../lib/auth/roles.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';
import type { IdentityResolver, ResolvedIdentity, IdentityRefusal } from '../../lib/sveltekit/guard.js';

const db = env.AUTH_DB;

// createAuthGuard is annotated `: Handle`, kit's own ambient type (the interop carve-out); this
// bridges it to the lighter CairnEvent shape this file's fakes build, matching auth-guard.test.ts.
function asHandle(guard: ReturnType<typeof createAuthGuard>): (input: {
  event: CairnEvent;
  resolve: (event: CairnEvent) => Promise<Response>;
}) => Promise<Response> {
  return guard as unknown as (input: {
    event: CairnEvent;
    resolve: (event: CairnEvent) => Promise<Response>;
  }) => Promise<Response>;
}

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
    platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: 'https://test.dev' } },
    setHeaders: () => {},
  };
}

function guardWith(
  resolve: IdentityResolver['resolve'],
  extra: { roles?: Parameters<typeof defineRoles>[0] } = {},
) {
  return asHandle(
    createAuthGuard({
      identity: { resolve, logoutUrl: '/goodbye', label: 'Acme SSO' },
      roles: extra.roles ? defineRoles(extra.roles) : undefined,
    }),
  );
}

function resolved(email: string, displayName?: string): ResolvedIdentity {
  return { ok: true, email, displayName };
}

function refused(reason: string): IdentityRefusal {
  return { ok: false, reason };
}

describe('guard identity branch: rostered', () => {
  it('sets locals.cairnEditor and locals.cairnAccess, capability resolved through the roles option', async () => {
    await seedEditor('owner@x.dev', 'Roster Name', 'club-admin');
    const guard = guardWith(async () => resolved('owner@x.dev'), {
      roles: { owner: 'owner', 'club-admin': 'editor' },
    });
    const ev = event('/admin');
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnEditor).toEqual({
      email: 'owner@x.dev',
      displayName: 'Roster Name',
      role: 'club-admin',
      capability: 'editor',
    });
    expect(ev.locals.cairnAccess).toEqual({});
  });

  it("prefers the roster row's displayName over the resolver's advisory one", async () => {
    await seedEditor('owner@x.dev', 'Roster Name', 'owner');
    const guard = guardWith(async () => resolved('owner@x.dev', 'Resolver Name'));
    const ev = event('/admin');
    await guard({ event: ev, resolve: async () => OK });
    expect(ev.locals.cairnEditor?.displayName).toBe('Roster Name');
  });

  it("uses the resolver's advisory displayName, capped at 120 characters, when the roster row's is empty", async () => {
    await seedEditor('owner@x.dev', '', 'owner');
    const longName = 'N'.repeat(200);
    const guard = guardWith(async () => resolved('owner@x.dev', longName));
    const ev = event('/admin');
    await guard({ event: ev, resolve: async () => OK });
    expect(ev.locals.cairnEditor?.displayName).toBe(longName.slice(0, 120));
  });

  it('normalizes the resolved email before the roster lookup', async () => {
    await seedEditor('owner@example.org', 'Roster Name', 'owner');
    const guard = guardWith(async () => resolved(' Owner@Example.org '));
    const ev = event('/admin');
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.cairnEditor?.email).toBe('owner@example.org');
  });

  it('revokes live: a roster DELETE after resolution refuses the next request', async () => {
    await seedEditor('owner@x.dev', 'Roster Name', 'owner');
    const guard = guardWith(async () => resolved('owner@x.dev'));
    const first = event('/admin');
    expect(await guard({ event: first, resolve: async () => OK })).toBe(OK);
    await db.prepare('DELETE FROM editor WHERE email = ?').bind('owner@x.dev').run();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const second = event('/admin');
    const res = await guard({ event: second, resolve: async () => OK });
    expect(res).not.toBe(OK);
    expect(res.status).toBe(403);
    expect(second.locals.cairnEditor).toBeUndefined();
    warnSpy.mockRestore();
  });
});

describe('guard identity branch: resolved but unrostered', () => {
  it('renders the unknown-identity condition and logs auth.identity.unknown with email only', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const guard = guardWith(async () => resolved('nobody@x.dev'));
    const ev = event('/admin');
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res).not.toBe(OK);
    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body).toContain('nobody@x.dev');
    expect(ev.locals.cairnEditor).toBeUndefined();
    expect(ev.locals.cairnIdentity).toEqual({ label: 'Acme SSO', logoutUrl: '/goodbye' });
    const records = warnSpy.mock.calls.map((c) => c[0] as { event?: string; email?: string });
    const match = records.find((r) => r.event === 'auth.identity.unknown');
    expect(match).toMatchObject({ event: 'auth.identity.unknown', email: 'nobody@x.dev' });
    vi.restoreAllMocks();
  });

  it('escapes an email containing markup', async () => {
    const guard = guardWith(async () => resolved('<script>alert(1)</script>@x.dev'));
    const ev = event('/admin');
    const res = await guard({ event: ev, resolve: async () => OK });
    const body = await res.text();
    expect(body).not.toContain('<script>alert(1)</script>');
    expect(body).toContain('&lt;script&gt;');
  });
});

describe('guard identity branch: refusals', () => {
  for (const [reason, level] of [
    ['missing', 'warn'],
    ['invalid', 'warn'],
    ['a-sites-own-word', 'warn'],
  ] as const) {
    it(`renders the unresolved condition and logs guard.rejected at ${level} for reason=${reason}`, async () => {
      const spy = vi.spyOn(console, level).mockImplementation(() => {});
      const guard = guardWith(async () => refused(reason));
      const ev = event('/admin');
      const res = await guard({ event: ev, resolve: async () => OK });
      expect(res).not.toBe(OK);
      expect(res.status).toBe(403);
      const body = await res.text();
      expect(body).toContain('did not carry a confirmed identity');
      const records = spy.mock.calls.map(
        (c) => c[0] as { event?: string; reason?: string; detail?: string; conditionId?: string },
      );
      expect(
        records.some(
          (r) =>
            r.event === 'guard.rejected' &&
            r.reason === 'identity' &&
            r.detail === reason &&
            r.conditionId === 'auth.identity-unresolved',
        ),
      ).toBe(true);
      vi.restoreAllMocks();
    });
  }

  it('logs the operator-fault reasons at error level', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const guard = guardWith(async () => refused('keys'));
    const ev = event('/admin');
    await guard({ event: ev, resolve: async () => OK });
    const records = errorSpy.mock.calls.map((c) => c[0] as { event?: string; detail?: string });
    expect(records.some((r) => r.event === 'guard.rejected' && r.detail === 'keys')).toBe(true);
    vi.restoreAllMocks();
  });

  it('renders the unresolved condition and logs detail=error when the resolver throws, never a 500', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const guard = guardWith(async () => {
      throw new Error('gate unreachable');
    });
    const ev = event('/admin');
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res.status).toBe(403);
    expect(res.status).not.toBe(500);
    const records = errorSpy.mock.calls.map(
      (c) => c[0] as { event?: string; reason?: string; detail?: string; error?: string },
    );
    const match = records.find((r) => r.event === 'guard.rejected' && r.reason === 'identity');
    expect(match?.detail).toBe('error');
    expect(match?.error).toContain('gate unreachable');
    vi.restoreAllMocks();
  });

  it('renders the unresolved condition and performs no roster query for a non-string email', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const findSpy = vi.spyOn(db, 'prepare');
    const guard = guardWith(async () => ({ ok: true, email: undefined as unknown as string }));
    const ev = event('/admin');
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res.status).toBe(403);
    const editorQuery = findSpy.mock.calls.some((c) => String(c[0]).includes('FROM editor'));
    expect(editorQuery).toBe(false);
    vi.restoreAllMocks();
  });

  it('renders the unresolved condition and performs no roster query for an empty email', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const findSpy = vi.spyOn(db, 'prepare');
    const guard = guardWith(async () => resolved('   '));
    const ev = event('/admin');
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res.status).toBe(403);
    const editorQuery = findSpy.mock.calls.some((c) => String(c[0]).includes('FROM editor'));
    expect(editorQuery).toBe(false);
    vi.restoreAllMocks();
  });
});

describe('guard identity branch: locals.cairnIdentity and public paths', () => {
  it('carries locals.cairnIdentity and calls resolve zero times on /admin/login and /admin/auth/confirm', async () => {
    const resolve = vi.fn<IdentityResolver['resolve']>(async () => resolved('owner@x.dev'));
    const guard = asHandle(
      createAuthGuard({ identity: { resolve, logoutUrl: '/goodbye', label: 'Acme SSO' } }),
    );
    const loginEv = event('/admin/login');
    await guard({ event: loginEv, resolve: async () => OK });
    expect(loginEv.locals.cairnIdentity).toEqual({ label: 'Acme SSO', logoutUrl: '/goodbye' });

    const confirmEv = event('/admin/auth/confirm');
    await guard({ event: confirmEv, resolve: async () => OK });
    expect(confirmEv.locals.cairnIdentity).toEqual({ label: 'Acme SSO', logoutUrl: '/goodbye' });

    expect(resolve).not.toHaveBeenCalled();
  });

  it('carries locals.cairnIdentity on a rostered admit and on a refusal', async () => {
    await seedEditor('owner@x.dev', 'Roster Name', 'owner');
    const admitted = event('/admin');
    const admitGuard = guardWith(async () => resolved('owner@x.dev'));
    await admitGuard({ event: admitted, resolve: async () => OK });
    expect(admitted.locals.cairnIdentity).toEqual({ label: 'Acme SSO', logoutUrl: '/goodbye' });

    const refusedEv = event('/admin');
    const refuseGuard = guardWith(async () => refused('missing'));
    await refuseGuard({ event: refusedEv, resolve: async () => OK });
    expect(refusedEv.locals.cairnIdentity).toEqual({ label: 'Acme SSO', logoutUrl: '/goodbye' });
  });
});

describe('guard identity branch: an existing session cookie is inert', () => {
  it('refuses a valid pre-existing session plus an identity refusal, calling resolveSession zero times, hasSession untouched', async () => {
    await seedEditor('own@x.dev', 'Ed', 'owner');
    await createSession(db, 'sid-ok', 'own@x.dev', Date.now() + 10_000, Date.now());
    const cookies = makeCookies({ [sessionCookieName(true)]: 'sid-ok' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const prepareSpy = vi.spyOn(db, 'prepare');
    const guard = guardWith(async () => refused('missing'));
    const ev = event('/admin', cookies);
    const res = await guard({ event: ev, resolve: async () => OK });
    expect(res).not.toBe(OK);
    expect(ev.locals.cairnEditor).toBeUndefined();
    // resolveSession's own query joins session to editor; no such query ran under identity mode.
    const sessionQuery = prepareSpy.mock.calls.some((c) => String(c[0]).includes('FROM session s JOIN editor'));
    expect(sessionQuery).toBe(false);
    prepareSpy.mockRestore();
    // The session row itself is inert: resolving it directly still finds it live, so the guard's
    // refusal came from the identity branch, not from the row expiring or being deleted.
    const stillLive = await resolveSession(db, 'sid-ok', Date.now());
    expect(stillLive).not.toBeNull();
    vi.restoreAllMocks();
  });
});
