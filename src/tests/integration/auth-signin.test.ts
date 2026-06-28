import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { signIn } from '../../lib/sveltekit/auth-routes.server.js';
import { resolvePrincipalRow, createSession } from '../../lib/auth/store.js';
import { makeRecordingCookies, seedEditor } from './_auth-harness.js';
import { sessionCookieName } from '../../lib/auth/crypto.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM session'),
    db.prepare('DELETE FROM magic_token'),
    db.prepare('DELETE FROM editor'),
  ]);
});

function ev(cookies = makeRecordingCookies()) {
  return {
    url: new URL('https://test.dev/auth/google/callback'),
    request: new Request('https://test.dev/x'),
    cookies,
    locals: {},
    platform: { env: { AUTH_DB: env.AUTH_DB, PUBLIC_ORIGIN: 'https://test.dev' } },
    setHeaders() {},
  };
}

describe('signIn', () => {
  it('mints a member-tier session by default and rotates prior sessions', async () => {
    await createSession(env.AUTH_DB, 'old', 'g@x.io', 'member', Date.now() + 1000, Date.now());
    const e = ev();
    await signIn(e as never, 'g@x.io');
    expect(await resolvePrincipalRow(env.AUTH_DB, 'old', Date.now())).toBeNull();
    const set = (e.cookies as ReturnType<typeof makeRecordingCookies>).sets.find(
      (s) => s.name === sessionCookieName(true),
    );
    const row = await resolvePrincipalRow(env.AUTH_DB, set!.value, Date.now());
    expect(row).toMatchObject({ email: 'g@x.io', tier: 'member' });
  });

  it('mints an admin-tier session when asked', async () => {
    await seedEditor('board@x.io', 'B', 'editor');
    const e = ev();
    await signIn(e as never, 'board@x.io', { tier: 'admin' });
    const set = (e.cookies as ReturnType<typeof makeRecordingCookies>).sets.find(
      (s) => s.name === sessionCookieName(true),
    );
    expect((await resolvePrincipalRow(env.AUTH_DB, set!.value, Date.now()))?.tier).toBe('admin');
  });
});
