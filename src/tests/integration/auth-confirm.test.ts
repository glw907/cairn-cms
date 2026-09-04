import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, makeCookies, makeRecordingCookies, countRows, expectRedirect } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { generateToken, hashToken, sessionCookieName, csrfCookieName, cookieName } from '../../lib/auth/crypto.js';
import { issueToken, createSession } from '../../lib/auth/store.js';

const db = env.AUTH_DB;
const routes = createAuthRoutes({ branding: { siteName: 'Test', from: 'noreply@test.dev' }, send: async () => {} });

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM editor')]);
});

// The nonce a request action would have left in the requesting browser, and the value every
// token below is bound to. A confirm carries it back in the pending cookie or it is refused.
const PENDING_NONCE = 'a-pending-login-nonce';

/** The pending-login cookie's name for a request whose cookies resolve `secure`. */
function pendingCookieName(secure: boolean): string {
  return cookieName('cairn_login_pending', secure);
}

/** The cookie seed a browser that requested the link would carry into a confirm. */
function pendingSeed(secure = true): Record<string, string> {
  return { [pendingCookieName(secure)]: PENDING_NONCE };
}

/** Seed an editor and a live token bound to `nonce`, returning the raw token for a confirm POST. */
async function liveToken(email: string, nonce: string = PENDING_NONCE): Promise<string> {
  await seedEditor(email, 'Ed', 'editor');
  const token = generateToken();
  const now = Date.now();
  await issueToken(db, email, await hashToken(token), now + 10_000, now, await hashToken(nonce));
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
    const cookies = makeCookies(pendingSeed());
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
    const cookies = makeCookies(pendingSeed());
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies })),
    );
    const replay = await expectRedirect(() =>
      routes.confirmAction(
        makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies: makeCookies(pendingSeed()) }),
      ),
    );
    expect(replay.location).toBe('/admin/login?error=expired');
    expect(await countRows('session')).toBe(1);
  });

  it('refuses an expired token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const token = generateToken();
    const now = Date.now();
    await issueToken(db, 'ed@x.dev', await hashToken(token), now - 1, now, await hashToken(PENDING_NONCE));
    const redirect = await expectRedirect(() =>
      routes.confirmAction(
        makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies: makeCookies(pendingSeed()) }),
      ),
    );
    expect(redirect.location).toBe('/admin/login?error=expired');
    expect(await countRows('session')).toBe(0);
  });
});

describe('session cookie prefix and attributes (Unit 1)', () => {
  it('sets a __Host- prefixed Secure cookie on https', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeRecordingCookies(pendingSeed());
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies })),
    );
    // Two sets: the session cookie, then the rotated CSRF cookie (asserted below in its own case).
    expect(cookies.sets.map((s) => s.name)).toEqual(['__Host-cairn_session', '__Host-cairn_csrf']);
    expect(cookies.sets[0].opts).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
  });

  it('sets a plain unprefixed cookie on local http', async () => {
    const token = await liveToken('ed2@x.dev');
    const cookies = makeRecordingCookies(pendingSeed(false));
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
    const cookies = makeRecordingCookies(pendingSeed());
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
    const cookies = makeRecordingCookies({ ...pendingSeed(), [csrfCookieName(true)]: 'PRE-LOGIN-VALUE' });
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
    const cookies = makeRecordingCookies({ ...pendingSeed(), [csrfCookieName(true)]: 'PRE-LOGIN-VALUE' });
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token: 'bogus' }, cookies })),
    );
    expect(cookies.sets).toHaveLength(0);
    expect(cookies.deletes).toHaveLength(0);
    expect(cookies.get(csrfCookieName(true))).toBe('PRE-LOGIN-VALUE');
  });
});

describe('same-browser binding (login-CSRF)', () => {
  const confirmUrl = 'https://test.dev/admin/auth/confirm';

  it('refuses a BOUND token from a browser with no pending cookie, under its own error code, and leaves it confirmable', async () => {
    // The attacker's own emailed link, put in front of a victim's browser, lands the victim in
    // the attacker's session unless the confirming browser proves it is the one that asked. The
    // refusal is the consume's own predicate answering (nonce_hash = NULL is never true in SQL),
    // not a short-circuit before it, so the row survives for the browser that asked.
    const token = await liveToken('ed@x.dev');
    const redirect = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies: makeCookies() })),
    );
    expect(redirect.location).toBe('/admin/login?error=no-pending-request');
    expect(await countRows('session')).toBe(0);
    expect(await countRows('magic_token')).toBe(1);

    const fromTheBoundBrowser = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies: makeCookies(pendingSeed()) })),
    );
    expect(fromTheBoundBrowser.location).toBe('/admin');
    expect(await countRows('session')).toBe(1);
  });

  it('confirms an UNBOUND token row with no pending cookie, the pre-0004 semantics the NULL column keeps', async () => {
    // A row whose nonce_hash is NULL: written before migrations/0004_login_nonce.sql, by
    // create-cairn-site's bootstrap INSERT, or hand-seeded as a lockout recovery. The confirm
    // passes null rather than refusing on the absent cookie, so `nonce_hash IS NULL` matches and
    // the link still signs the editor in. Losing this would strand every such row unconfirmable.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const token = generateToken();
    const now = Date.now();
    await issueToken(db, 'ed@x.dev', await hashToken(token), now + 10_000, now);
    expect(await db.prepare('SELECT nonce_hash FROM magic_token').first<{ nonce_hash: string | null }>()).toEqual({
      nonce_hash: null,
    });

    const redirect = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies: makeCookies() })),
    );
    expect(redirect.location).toBe('/admin');
    expect(await countRows('session')).toBe(1);
    expect(await countRows('magic_token')).toBe(0);
  });

  it('reads expired, not no-pending-request, when the cookie survives the token it was minted with', async () => {
    // The message-priority the longer pending-cookie life exists to produce: an ordinary editor
    // clicking a stale link arrives WITH their cookie and reads the accurate instruction.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const token = generateToken();
    const now = Date.now();
    await issueToken(db, 'ed@x.dev', await hashToken(token), now - 1, now, await hashToken(PENDING_NONCE));
    const redirect = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies: makeCookies(pendingSeed()) })),
    );
    expect(redirect.location).toBe('/admin/login?error=expired');
  });

  it('refuses a pending cookie holding some other browser’s nonce and leaves the token unburned', async () => {
    // Presence alone is not the check: a browser with its own pending login must not be able to
    // confirm a token minted for a different one.
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies({ [pendingCookieName(true)]: 'someone-elses-nonce' });
    const redirect = await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies })));
    expect(redirect.location).toBe('/admin/login?error=expired');
    expect(await countRows('session')).toBe(0);
    expect(await countRows('magic_token')).toBe(1);
  });

  it('deletes the pending cookie on a successful confirm', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeRecordingCookies(pendingSeed());
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies })));
    expect(cookies.get(pendingCookieName(true))).toBeUndefined();
    expect(cookies.deletes).toContainEqual({
      name: pendingCookieName(true),
      opts: { path: '/', secure: true },
    });
  });

  it('leaves the pending cookie in place when the confirm fails, so a stumble is not a lockout', async () => {
    await liveToken('ed@x.dev');
    const cookies = makeRecordingCookies(pendingSeed());
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token: 'bogus' }, cookies })));
    expect(cookies.get(pendingCookieName(true))).toBe(PENDING_NONCE);
    expect(cookies.deletes).toHaveLength(0);
  });

  it('deletes the pending cookie at logout, with the secure its setter used', async () => {
    const cookies = makeRecordingCookies(pendingSeed());
    await expectRedirect(() =>
      routes.logoutAction(makeEvent({ url: 'https://test.dev/admin/auth/logout', form: {}, cookies })),
    );
    expect(cookies.get(pendingCookieName(true))).toBeUndefined();
    expect(cookies.deletes).toContainEqual({
      name: pendingCookieName(true),
      opts: { path: '/', secure: true },
    });
  });
});

describe('confirm and logout logging', () => {
  const confirmUrl = 'https://test.dev/admin/auth/confirm';

  it('logs auth.token.confirmed and auth.session.created on a valid confirm', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies(pendingSeed());
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies })));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.token.confirmed');
    expect(events).toContain('auth.session.created');
    vi.restoreAllMocks();
  });

  it('logs auth.session.destroyed with the deleted row own email when logout destroys a session', async () => {
    // Establish a session through confirm, keeping the cookie jar that holds its id.
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies(pendingSeed());
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies })));
    const logoutEvent = makeEvent({ url: 'https://test.dev/admin/auth/logout', form: {}, cookies });
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expectRedirect(() => routes.logoutAction(logoutEvent));
    const destroyed = infoSpy.mock.calls
      .map((c) => c[0] as { event?: string; email?: string })
      .filter((r) => r.event === 'auth.session.destroyed');
    expect(destroyed).toHaveLength(1);
    expect(destroyed[0].email).toBe('ed@x.dev');
    vi.restoreAllMocks();
  });

  it('logs nothing when the presented session id names no row, so the record means a real deletion', async () => {
    // A stale cookie surviving its own row expiry: the delete matches nothing, so there is no
    // destruction to record.
    const cookies = makeCookies({ [sessionCookieName(true)]: 'sid-already-gone' });
    const logoutEvent = makeEvent({ url: 'https://test.dev/admin/auth/logout', form: {}, cookies });
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expectRedirect(() => routes.logoutAction(logoutEvent));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).not.toContain('auth.session.destroyed');
    vi.restoreAllMocks();
  });

  it('logs nothing when the presented session id names an already-expired row, so an expired teardown is not counted as a live sign-out', async () => {
    // The row is still there (unlike the case above), but its own expires_at has already passed;
    // the delete still removes it, it just must not emit the destroyed record.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await createSession(db, 'sid-expired', 'ed@x.dev', Date.now() - 1_000, Date.now() - 20_000);
    const cookies = makeCookies({ [sessionCookieName(true)]: 'sid-expired' });
    const logoutEvent = makeEvent({ url: 'https://test.dev/admin/auth/logout', form: {}, cookies });
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expectRedirect(() => routes.logoutAction(logoutEvent));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).not.toContain('auth.session.destroyed');
    vi.restoreAllMocks();
    expect(await countRows('session')).toBe(0);
  });

  it('deletes the CSRF cookie alongside the session cookie, so a persistent token cannot survive sign-out', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies({ ...pendingSeed(), [csrfCookieName(true)]: 'a-live-csrf-token' });
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
      // The pending-login nonce goes too: a sign-out clears every cairn-owned credential.
      { name: 'cairn_login_pending', opts: { path: '/', secure: false } },
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
    const cookies = makeCookies(pendingSeed());
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
