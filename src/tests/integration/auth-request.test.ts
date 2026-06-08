import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, countRows } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import type { MagicLinkMessage } from '../../lib/email.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM editor')]);
});

function routesWithSink() {
  const sent: MagicLinkMessage[] = [];
  const routes = createAuthRoutes({
    branding: { siteName: 'Test', from: 'noreply@test.dev' },
    send: async (_env, message) => void sent.push(message),
  });
  return { routes, sent };
}

describe('request a link (scenarios 1, 2)', () => {
  it('sends exactly one link to an allow-listed editor and stores a token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const result = await routes.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'ed@x.dev' } }));
    expect(result).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ed@x.dev');
    expect(sent[0].html).toContain('https://test.dev/admin/auth/confirm?token=');
    expect(await countRows('magic_token')).toBe(1);
  });

  it('returns the same response and sends nothing for a non-allow-listed email', async () => {
    const { routes, sent } = routesWithSink();
    const result = await routes.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'stranger@x.dev' } }));
    expect(result).toEqual({ sent: true });
    expect(sent).toHaveLength(0);
    expect(await countRows('magic_token')).toBe(0);
  });
});

describe('request hardening (Unit 4)', () => {
  const url = 'https://test.dev/admin/auth/request';

  it('suppresses a second request inside the cooldown window', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(sent).toHaveLength(1);
    expect(await countRows('magic_token')).toBe(1);
  });

  it('sends again once the cooldown has passed', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { issueToken } = await import('../../lib/auth/store.js');
    const { hashToken, generateToken } = await import('../../lib/auth/crypto.js');
    const old = Date.now() - 61_000; // older than the 60s cooldown, still inside the 10-min TTL
    await issueToken(db, 'ed@x.dev', await hashToken(generateToken()), old + 600_000, old);
    const { routes, sent } = routesWithSink();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(sent).toHaveLength(1);
    expect(await countRows('magic_token')).toBe(1);
  });

  it('backgrounds the send through waitUntil when present', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const promises: Promise<unknown>[] = [];
    const result = await routes.requestAction(
      makeEvent({ url, form: { email: 'ed@x.dev' }, waitUntil: (p) => promises.push(p) }),
    );
    expect(result).toEqual({ sent: true });
    expect(promises).toHaveLength(1);
    await Promise.all(promises);
    expect(sent).toHaveLength(1);
  });
});

describe('request logging', () => {
  const url = 'https://test.dev/admin/auth/request';

  it('logs auth.link.requested then auth.token.minted for an allow-listed editor', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { routes } = routesWithSink();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.link.requested');
    expect(events).toContain('auth.token.minted');
    vi.restoreAllMocks();
  });

  it('logs auth.link.requested but never auth.token.minted for a stranger', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { routes } = routesWithSink();
    await routes.requestAction(makeEvent({ url, form: { email: 'stranger@x.dev' } }));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.link.requested');
    expect(events).not.toContain('auth.token.minted');
    vi.restoreAllMocks();
  });

  it('logs auth.link.send_failed when the send rejects', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const routes = createAuthRoutes({
      branding: { siteName: 'Test', from: 'noreply@test.dev' },
      send: async () => {
        throw new Error('smtp down');
      },
    });
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const events = errorSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.link.send_failed');
    vi.restoreAllMocks();
  });
});
