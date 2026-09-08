// Task 3 of the identity-seam pass: the magic-link surface under identity mode. Every case sets
// event.locals.cairnIdentity directly, the same shape the guard writes (Task 1), so this proves
// the routes' own branch rather than the guard's. Mounted through createCairnAdmin with no
// identity-aware admin config, since the routes read locals.cairnIdentity, not a config member.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeEvent, makeRecordingCookies, countRows, expectRedirect, expectHttpError } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { createCairnAdmin } from '../../lib/sveltekit/cairn-admin.js';
import { createSession } from '../../lib/auth/store.js';
import { githubApp } from '../../lib/index.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { CairnEvent } from '../../lib/sveltekit/types.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM editor')]);
});

const branding = { siteName: 'Test', from: 'noreply@test.dev' };
const IDENTITY = { label: 'Acme SSO', logoutUrl: '/goodbye' };

/** A minimal runtime for createCairnAdmin, mirroring cairn-admin-load.test.ts's own fixture. */
function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'Test Site',
    concepts: [
      { id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], schema: defineFieldset({}), summaryFields: [], validate: ok },
    ],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
  };
}

/** An admin catch-all event, with locals.cairnIdentity set the way the guard would set it. */
function adminEvent(pathname: string, opts: { search?: string; cookies?: ReturnType<typeof makeRecordingCookies>; form?: Record<string, string> } = {}): CairnEvent {
  const url = `https://test.dev${pathname}${opts.search ?? ''}`;
  const cookies = opts.cookies ?? makeRecordingCookies();
  const request = opts.form
    ? new Request(url, { method: 'POST', body: new URLSearchParams(opts.form) })
    : new Request(url);
  return {
    url: new URL(url),
    request,
    params: {},
    route: { id: '/admin/[...path]' },
    cookies,
    locals: { cairnIdentity: IDENTITY },
    platform: { env: { PUBLIC_ORIGIN: 'https://test.dev', AUTH_DB: db } },
    setHeaders: () => {},
  };
}

describe('the hand-off page (loginLoad under identity mode)', () => {
  it('returns only the identity shape, mints no pending nonce, and issues no CSRF token', async () => {
    const admin = createCairnAdmin(runtime(), {});
    const cookies = makeRecordingCookies();
    const data = await admin.load(adminEvent('/admin/login', { cookies }));
    expect(data).toEqual({ view: 'login', page: { identity: { label: 'Acme SSO' } } });
    expect(cookies.sets).toEqual([]);
  });
});

describe('requestAction under identity mode', () => {
  it('404s before requireDb, before request.formData(), and before any cookie write, minting nothing', async () => {
    const admin = createCairnAdmin(runtime(), {});
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cookies = makeRecordingCookies();
    // No AUTH_DB and no PUBLIC_ORIGIN in the event's platform.env: a 404 raised after either
    // guard would still pass this test by accident, so both are absent to prove the 404 comes
    // first.
    const ev: CairnEvent = {
      url: new URL('https://test.dev/admin/login?/request'),
      request: new Request('https://test.dev/admin/login?/request', { method: 'POST', body: new URLSearchParams({ email: 'nobody@test.dev' }) }),
      params: {},
      route: { id: '/admin/[...path]' },
      cookies,
      locals: { cairnIdentity: IDENTITY },
      platform: { env: {} },
      setHeaders: () => {},
    };
    expect((await expectHttpError(() => admin.actions.request(ev))).status).toBe(404);
    expect(cookies.sets).toEqual([]);
    const records = infoSpy.mock.calls.map((c) => c[0] as { event?: string });
    expect(records.some((r) => r.event === 'auth.token.minted')).toBe(false);
    expect(records.some((r) => r.event === 'auth.link.requested')).toBe(false);
    expect(await countRows('magic_token')).toBe(0);
    infoSpy.mockRestore();
  });
});

describe('confirmLoad under identity mode', () => {
  it('404s and sets no cookie', async () => {
    const admin = createCairnAdmin(runtime(), {});
    const cookies = makeRecordingCookies();
    expect(
      (await expectHttpError(() => admin.load(adminEvent('/admin/auth/confirm', { search: '?token=x', cookies })))).status,
    ).toBe(404);
    expect(cookies.sets).toEqual([]);
  });
});

describe('confirmAction under identity mode', () => {
  it('404s', async () => {
    const admin = createCairnAdmin(runtime(), {});
    const cookies = makeRecordingCookies();
    expect(
      (
        await expectHttpError(() =>
          admin.actions.confirm(adminEvent('/admin/auth/confirm', { cookies, form: { token: 'tok' } })),
        )
      ).status,
    ).toBe(404);
  });
});

describe('logoutAction under identity mode', () => {
  it('redirects to logoutUrl and still deletes every cookie', async () => {
    const admin = createCairnAdmin(runtime(), {});
    const cookies = makeRecordingCookies({ cairn_session: 'sid', cairn_csrf: 'csrf-tok' });
    const result = await expectRedirect(() => admin.actions.logout(adminEvent('/admin', { cookies })));
    expect(result.location).toBe('/goodbye');
    const deletedNames = cookies.deletes.map((d) => d.name);
    expect(deletedNames).toEqual(
      expect.arrayContaining(['cairn_session', 'cairn_csrf', '__Host-cairn_login_pending']),
    );
  });

  it('skips the session delete, emitting no auth.session.destroyed record even with a live row', async () => {
    await createSession(db, 'sid', 'ed@x.dev', Date.now() + 10_000, Date.now());
    const admin = createCairnAdmin(runtime(), {});
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cookies = makeRecordingCookies({ cairn_session: 'sid', cairn_csrf: 'csrf-tok' });
    await expectRedirect(() => admin.actions.logout(adminEvent('/admin', { cookies })));
    const records = infoSpy.mock.calls.map((c) => c[0] as { event?: string });
    expect(records.some((r) => r.event === 'auth.session.destroyed')).toBe(false);
    expect(await countRows('session')).toBe(1);
    infoSpy.mockRestore();
  });
});

describe('the five handlers, unchanged without locals.cairnIdentity', () => {
  it('loginLoad, requestAction, confirmLoad, confirmAction, and logoutAction all keep the magic-link behavior', async () => {
    const routes = createAuthRoutes({ branding });
    const loginCookies = makeRecordingCookies();
    const loginData = routes.loginLoad(makeEvent({ url: 'https://test.dev/admin/login', cookies: loginCookies }));
    expect('siteName' in loginData).toBe(true);
    expect(loginCookies.sets.length).toBeGreaterThan(0);

    const requestCookies = makeRecordingCookies();
    const requestResult = await routes.requestAction(
      makeEvent({ url: 'https://test.dev/admin/login', form: { email: 'nobody@test.dev' }, cookies: requestCookies }),
    );
    expect(requestResult.status).toBe('sent');

    const confirmCookies = makeRecordingCookies();
    const confirmData = routes.confirmLoad(makeEvent({ url: 'https://test.dev/admin/auth/confirm?token=x', cookies: confirmCookies }));
    expect(confirmData.token).toBe('x');

    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token: 'bogus' }, cookies: makeRecordingCookies() })),
    );

    const logoutResult = await expectRedirect(() =>
      routes.logoutAction(makeEvent({ url: 'https://test.dev/admin', cookies: makeRecordingCookies() })),
    );
    expect(logoutResult.location).toBe('/admin/login');
  });
});
