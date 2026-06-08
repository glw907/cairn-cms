import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, makeCookies } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { issueToken, createSession } from '../../lib/auth/store.js';
import {
  generateToken,
  generateSessionId,
  hashToken,
  sessionCookieName,
  TOKEN_TTL_MS,
  SESSION_TTL_MS,
} from '../../lib/auth/crypto.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM magic_token'),
    db.prepare('DELETE FROM session'),
    db.prepare('DELETE FROM editor'),
  ]);
});

function routes() {
  return createAuthRoutes({ branding: { siteName: 'T', from: 'n@test.dev' }, send: async () => {} });
}

/** Capture every record any console method emits during `run`. */
async function records(run: () => Promise<unknown>): Promise<unknown[]> {
  const captured: unknown[] = [];
  const grab = (c: unknown[]) => captured.push(c[0]);
  vi.spyOn(console, 'log').mockImplementation((...c) => grab(c));
  vi.spyOn(console, 'warn').mockImplementation((...c) => grab(c));
  vi.spyOn(console, 'error').mockImplementation((...c) => grab(c));
  try {
    await run().catch(() => {});
  } finally {
    vi.restoreAllMocks();
  }
  return captured;
}

describe('log redaction', () => {
  it('never logs the raw magic-link token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    // Pin the token by issuing it directly, then confirm with the same value.
    const token = generateToken();
    const now = Date.now();
    await issueToken(db, 'ed@x.dev', await hashToken(token), now + TOKEN_TTL_MS, now);
    const captured = await records(() =>
      routes().confirmAction(
        makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies: makeCookies() }),
      ),
    );
    const blob = JSON.stringify(captured);
    expect(blob).not.toContain(token);
  });

  it('never logs the raw magic-link token on the request/mint path', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    // The token is generated inside requestAction and embedded in the magic-link. Capture the
    // sent message and pull the real token out of its link, so the redaction assert is exact.
    let token = '';
    const r = createAuthRoutes({
      branding: { siteName: 'T', from: 'n@test.dev' },
      send: async (_env, message) => {
        const link = new URL(message.text.match(/https:\/\/\S+/)?.[0] ?? '');
        token = link.searchParams.get('token') ?? '';
      },
    });
    // makeEvent supplies no waitUntil, so the send is awaited inline and the callback runs here.
    const captured = await records(() =>
      r.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'ed@x.dev' } })),
    );
    // Guard: the send ran and we captured a real, full-length token; the assert below cannot pass
    // vacuously on an empty string.
    expect(token).not.toBe('');
    expect(token.length).toBeGreaterThan(40);
    const blob = JSON.stringify(captured);
    expect(blob).not.toContain(token);
  });

  it('never logs the raw session id at logout', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const id = generateSessionId();
    const now = Date.now();
    await createSession(db, id, 'ed@x.dev', now + SESSION_TTL_MS, now);
    const cookies = makeCookies({ [sessionCookieName(true)]: id });
    const captured = await records(() =>
      routes().logoutAction(makeEvent({ url: 'https://test.dev/admin/auth/logout', form: {}, cookies })),
    );
    const blob = JSON.stringify(captured);
    expect(blob).not.toContain(id);
  });
});
