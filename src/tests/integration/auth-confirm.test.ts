import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor, makeEvent, makeCookies, countRows, expectRedirect } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { generateToken, hashToken, COOKIE_NAME } from '../../lib/auth/crypto.js';
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
    expect(data).toEqual({ token });
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
    expect(cookies.get(COOKIE_NAME)).toBeTruthy();
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
