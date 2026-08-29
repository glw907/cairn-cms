import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, makeCookies, makeRecordingCookies, countRows, expectRedirect } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { generateToken, hashToken, sessionCookieName, csrfCookieName } from '../../lib/auth/crypto.js';
import { issueToken } from '../../lib/auth/store.js';

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
    expect(cookies.sets).toHaveLength(1);
    expect(cookies.sets[0].name).toBe('__Host-cairn_session');
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
    expect(cookies.get(csrfCookieName(true))).toBe('a-live-csrf-token');
    const logoutEvent = makeEvent({ url: 'https://test.dev/admin/auth/logout', form: {}, cookies });
    await expectRedirect(() => routes.logoutAction(logoutEvent));
    expect(cookies.get(sessionCookieName(true))).toBeUndefined();
    expect(cookies.get(csrfCookieName(true))).toBeUndefined();
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
