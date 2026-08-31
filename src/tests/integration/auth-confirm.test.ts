import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, makeCookies, makeRecordingCookies, countRows, expectRedirect } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { generateToken, hashToken, sessionCookieName, csrfCookieName } from '../../lib/auth/crypto.js';
import { issueToken, createSession } from '../../lib/auth/store.js';

const db = env.AUTH_DB;
const routes = createAuthRoutes({ branding: { siteName: 'Test', from: 'noreply@test.dev' }, send: async () => {} });

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM editor')]);
});

/** Seed an editor and a live token, returning the raw token for a confirm POST. */
async function liveToken(email: string): Promise<string> {
  await seedEditor(email, 'Ed', 'editor');
  const token = generateToken();
  const now = Date.now();
  await issueToken(db, email, await hashToken(token), now + 10_000, now);
  return token;
}

describe('confirm GET (scenario 5: consumes nothing)', () => {
  it('returns the token and leaves it in the store', async () => {
    const token = await liveToken('ed@x.dev');
    const data = await routes.confirmLoad(makeEvent({ url: `https://test.dev/admin/auth/confirm?token=${token}` }));
    // confirmLoad now also returns siteName and error; toMatchObject checks only token and store state.
    expect(data).toMatchObject({ token });
    expect(await countRows('magic_token')).toBe(1);
  });
});

describe('confirm POST (scenarios 1, 3, 4)', () => {
  it('verifies a valid token once: creates a session, sets the cookie, redirects to /admin', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies();
    const redirect = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies })),
    );
    expect(redirect).toEqual({ status: 303, location: '/admin' });
    expect(cookies.get(sessionCookieName(true))).toBeTruthy();
    expect(await countRows('session')).toBe(1);
    expect(await countRows('magic_token')).toBe(0);
  });

  it('refuses a replayed token', async () => {
    const token = await liveToken('ed@x.dev');
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token } })));
    const replay = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token } })),
    );
    expect(replay.location).toBe('/admin/login?error=expired');
    expect(await countRows('session')).toBe(1);
  });

  it('refuses an expired token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const token = generateToken();
    const now = Date.now();
    await issueToken(db, 'ed@x.dev', await hashToken(token), now - 1, now);
    const redirect = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token } })),
    );
    expect(redirect.location).toBe('/admin/login?error=expired');
    expect(await countRows('session')).toBe(0);
  });
});

describe('session cookie prefix and attributes (Unit 1)', () => {
  it('sets a __Host- prefixed Secure cookie on https', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeRecordingCookies();
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies })),
    );
    // Two sets: the session cookie, then the rotated CSRF cookie (asserted below in its own case).
    expect(cookies.sets.map((s) => s.name)).toEqual(['__Host-cairn_session', '__Host-cairn_csrf']);
    expect(cookies.sets[0].opts).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
  });

  it('sets a plain unprefixed cookie on local http', async () => {
    const token = await liveToken('ed2@x.dev');
    const cookies = makeRecordingCookies();
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'http://localhost/admin/auth/confirm', form: { token }, cookies })),
    );
    expect(cookies.sets[0].name).toBe('cairn_session');
    expect(cookies.sets[0].opts.secure).toBe(false);
  });

  it('mints a __Host- Secure session cookie over http when PUBLIC_ORIGIN resolves https, matching the CSRF pair (Task 6, N-4)', async () => {
    // A non-local http request: the bare `event.url.protocol` derivation this replaces would
    // have minted a bare, non-Secure cookie here, diverging from the CSRF cookie the same
    // request's csrfSecure already resolves Secure through makeEvent's default PUBLIC_ORIGIN.
    const token = await liveToken('ed3@x.dev');
    const cookies = makeRecordingCookies();
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'http://admin.example/admin/auth/confirm', form: { token }, cookies })),
    );
    expect(cookies.sets[0].name).toBe('__Host-cairn_session');
    expect(cookies.sets[0].opts.secure).toBe(true);
  });
});

describe('CSRF token rotation at successful login', () => {
  it('mints a new CSRF value, so a pre-login token cannot carry into the session', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeRecordingCookies({ [csrfCookieName(true)]: 'PRE-LOGIN-VALUE' });
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies })),
    );
    const csrfSets = cookies.sets.filter((s) => s.name === csrfCookieName(true));
    expect(csrfSets).toHaveLength(1);
    expect(csrfSets[0].value).not.toBe('PRE-LOGIN-VALUE');
    expect(csrfSets[0].value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(csrfSets[0].opts).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
    expect(cookies.get(csrfCookieName(true))).toBe(csrfSets[0].value);
  });

  it('leaves no CSRF cookie behind when the token is invalid, since no session was created', async () => {
    const cookies = makeRecordingCookies({ [csrfCookieName(true)]: 'PRE-LOGIN-VALUE' });
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token: 'bogus' }, cookies })),
    );
    expect(cookies.sets).toHaveLength(0);
    expect(cookies.deletes).toHaveLength(0);
    expect(cookies.get(csrfCookieName(true))).toBe('PRE-LOGIN-VALUE');
  });
});

describe('confirm and logout logging', () => {
  const confirmUrl = 'https://test.dev/admin/auth/confirm';

  it('logs auth.token.confirmed and auth.session.created on a valid confirm', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies();
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies })));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.token.confirmed');
    expect(events).toContain('auth.session.created');
    vi.restoreAllMocks();
  });

  it('logs auth.session.destroyed on logout when a session cookie is present', async () => {
    // Establish a session through confirm, keeping the cookie jar that holds its id.
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies();
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies })));
    const logoutEvent = makeEvent({ url: 'https://test.dev/admin/auth/logout', form: {}, cookies });
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expectRedirect(() => routes.logoutAction(logoutEvent));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.session.destroyed');
    vi.restoreAllMocks();
  });

  it('deletes the CSRF cookie alongside the session cookie, so a persistent token cannot survive sign-out', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies({ [csrfCookieName(true)]: 'a-live-csrf-token' });
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies })));
    // Confirm rotated the seeded value; what matters here is that a live CSRF cookie exists to
    // survive sign-out, not which value it holds.
    expect(cookies.get(csrfCookieName(true))).toBeTruthy();
    const logoutEvent = makeEvent({ url: 'https://test.dev/admin/auth/logout', form: {}, cookies });
    await expectRedirect(() => routes.logoutAction(logoutEvent));
    expect(cookies.get(sessionCookieName(true))).toBeUndefined();
    expect(cookies.get(csrfCookieName(true))).toBeUndefined();
  });

  it('deletes both cookie-name forms for both cookies, each with its matching secure (Task 6, N-1)', async () => {
    // http://127.0.0.1 is the case that bites: SvelteKit's own delete defaults `secure` on for
    // every host but `localhost` itself, and a browser drops a Secure Set-Cookie sent over http,
    // so the deletion never reaches the browser and the editor stays signed in. Both the
    // derived-secure form AND its opposite are deleted belt-and-braces, so a PUBLIC_ORIGIN change
    // between login and logout cannot strand a browser cookie under the name the current
    // derivation no longer produces.
    const cookies = makeRecordingCookies({
      [sessionCookieName(false)]: 'a-session-id',
      [csrfCookieName(false)]: 'a-live-csrf-token',
    });
    await expectRedirect(() =>
      routes.logoutAction(makeEvent({ url: 'http://127.0.0.1:8788/admin/auth/logout', form: {}, cookies })),
    );
    expect(cookies.deletes).toEqual([
      { name: 'cairn_session', opts: { path: '/', secure: false } },
      { name: '__Host-cairn_session', opts: { path: '/', secure: true } },
      { name: 'cairn_csrf', opts: { path: '/', secure: false } },
      { name: '__Host-cairn_csrf', opts: { path: '/', secure: true } },
    ]);
  });

  it('also deletes the __Host- form (and reads its id) when the derived secure no longer matches the cookie the browser actually holds (Task 6, N-1)', async () => {
    // Simulates the PUBLIC_ORIGIN-drift residual directly: the browser still carries the
    // __Host- session cookie from an earlier login, but this logout request's own derivation
    // (no PUBLIC_ORIGIN configured, a non-local http host) resolves secure=false. The bare-name
    // delete alone would strand the __Host- cookie in the browser; deleting both forms clears it,
    // and the session row deletes too, proving the id was read from the non-derived form.
    await seedEditor('ed4@x.dev', 'Ed', 'editor');
    const sessionId = 'a-host-prefixed-session';
    await createSession(env.AUTH_DB, sessionId, 'ed4@x.dev', Date.now() + 10_000, Date.now());
    const cookies = makeRecordingCookies({ [sessionCookieName(true)]: sessionId });
    const logoutEvent = {
      url: new URL('http://admin.example/admin/auth/logout'),
      request: new Request('http://admin.example/admin/auth/logout', { method: 'POST', body: new URLSearchParams() }),
      params: {},
      route: { id: '/admin/auth/[...path]' },
      cookies,
      locals: { cairnEditor: null },
      platform: { env: { AUTH_DB: env.AUTH_DB } },
      setHeaders: () => {},
    };
    await expectRedirect(() => routes.logoutAction(logoutEvent as never));
    expect(cookies.get(sessionCookieName(true))).toBeUndefined();
    expect(cookies.get(sessionCookieName(false))).toBeUndefined();
    expect(await countRows('session')).toBe(0);
  });

  it('clears the browser cookie even when the session-row delete fails, so a D1 fault never leaves both valid (HIGH2)', async () => {
    // Establish a real session, then swap in a D1 binding whose delete throws, simulating the
    // fault. Before this fix, the cookie was deleted only AFTER the (awaited) row delete, so a
    // fault here left both the row and the cookie intact and the editor silently still signed
    // in. The cookie must clear regardless of whether the row delete succeeds.
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies();
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies })));
    expect(await countRows('session')).toBe(1);

    const brokenDb = {
      prepare: () => ({
        bind: () => ({
          run: () => Promise.reject(new Error('D1 fault')),
        }),
      }),
    };
    const logoutEvent = {
      url: new URL('https://test.dev/admin/auth/logout'),
      request: new Request('https://test.dev/admin/auth/logout', { method: 'POST', body: new URLSearchParams() }),
      params: {},
      route: { id: '/admin/auth/[...path]' },
      cookies,
      locals: { cairnEditor: null },
      platform: { env: { AUTH_DB: brokenDb, PUBLIC_ORIGIN: 'https://test.dev' } },
      setHeaders: () => {},
    };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expectRedirect(() => routes.logoutAction(logoutEvent as never));
    // The cookie is gone from the jar regardless of the D1 fault.
    expect(cookies.get('__Host-cairn_session')).toBeUndefined();
    // The fault is logged, not swallowed silently.
    const events = errorSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.session.destroy_failed');
    vi.restoreAllMocks();
    // The row is untouched (the broken double never wrote), confirming the fault is real and the
    // row-vs-cookie asymmetry this test pins is not accidentally masked by a no-op double.
    expect(await countRows('session')).toBe(1);
  });
});
