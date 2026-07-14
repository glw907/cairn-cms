import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, countRows } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import type { MagicLinkMessage } from '../../lib/email.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM editor')]);
});

const branding = { siteName: 'Test', from: 'noreply@test.dev' };

function routesWithSink() {
  const sent: MagicLinkMessage[] = [];
  const routes = createAuthRoutes({
    branding,
    send: async (_env, message) => void sent.push(message),
  });
  return { routes, sent };
}

// A sender that fails the way an un-onboarded Cloudflare binding does.
function routesWithFailingSend() {
  return createAuthRoutes({
    branding,
    send: async () => {
      throw Object.assign(new Error('not verified'), { code: 'E_SENDER_NOT_VERIFIED' });
    },
  });
}

describe('request a link (scenarios 1, 2)', () => {
  it('sends exactly one link to an allow-listed editor and stores a token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const result = await routes.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'ed@x.dev' } }));
    expect(result).toEqual({ status: 'sent', sent: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ed@x.dev');
    expect(sent[0].html).toContain('https://test.dev/admin/auth/confirm?token=');
    expect(await countRows('magic_token')).toBe(1);
  });

  it('returns the same response and sends nothing for a non-allow-listed email', async () => {
    const { routes, sent } = routesWithSink();
    const result = await routes.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'stranger@x.dev' } }));
    expect(result).toEqual({ status: 'sent', sent: true });
    expect(sent).toHaveLength(0);
    expect(await countRows('magic_token')).toBe(0);
  });

  it('returns a byte-identical result for a stranger and an editor whose send succeeds (non-leak)', async () => {
    // The relaxed-non-leak posture (email-delivery design) keeps the neutral and send-ok paths
    // identical, so the common case never reveals allowlist membership. Only the send_error and
    // throttled paths differ, and they do so by design for editor feedback.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes } = routesWithSink();
    const url = 'https://test.dev/admin/auth/request';
    const editorResult = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const strangerResult = await routes.requestAction(makeEvent({ url, form: { email: 'stranger@x.dev' } }));
    expect(editorResult).toEqual(strangerResult);
    expect(editorResult).toEqual({ status: 'sent', sent: true });
    // toEqual is key-order-insensitive; the serialized comparison pins true byte-identity.
    expect(JSON.stringify(editorResult)).toBe(JSON.stringify(strangerResult));
  });
});

describe('request hardening (Unit 4)', () => {
  const url = 'https://test.dev/admin/auth/request';

  it('suppresses a second request inside the cooldown window and reports throttled', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const first = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const second = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(first).toEqual({ status: 'sent', sent: true });
    expect(second).toEqual({ status: 'throttled', sent: false });
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

  it('awaits the send and never backgrounds it through waitUntil', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const promises: Promise<unknown>[] = [];
    let finished = false;
    const routes = createAuthRoutes({
      branding,
      send: async () => {
        await Promise.resolve();
        finished = true;
      },
    });
    const result = await routes.requestAction(
      makeEvent({ url, form: { email: 'ed@x.dev' }, waitUntil: (p) => promises.push(p) }),
    );
    expect(finished).toBe(true); // the send completed before requestAction returned
    expect(promises).toHaveLength(0); // the send was not handed to waitUntil
    expect(result).toEqual({ status: 'sent', sent: true });
  });

  it('returns send_error when the send rejects, after awaiting it', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const routes = routesWithFailingSend();
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(result).toEqual({ status: 'send_error', sent: false });
    expect(await countRows('magic_token')).toBe(1); // the token row was written before the send threw
  });
});

describe('bootstrap owner (config-declared, Task 7)', () => {
  const url = 'https://test.dev/admin/auth/request';
  const bootstrapOwner = { email: 'Boss@X.dev', displayName: 'Boss' };

  it('inserts the owner on an empty table for the matching email, then proceeds normally', async () => {
    const { routes, sent } = (() => {
      const s: MagicLinkMessage[] = [];
      return { routes: createAuthRoutes({ branding, bootstrapOwner, send: async (_e, m) => void s.push(m) }), sent: s };
    })();
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'boss@x.dev' } }));
    expect(result).toEqual({ status: 'sent', sent: true });
    expect(sent).toHaveLength(1);
    expect(await countRows('editor')).toBe(1);
  });

  it('matches the configured email case-insensitively', async () => {
    const routes = createAuthRoutes({ branding, bootstrapOwner, send: async () => {} });
    await routes.requestAction(makeEvent({ url, form: { email: 'BOSS@X.DEV' } }));
    expect(await countRows('editor')).toBe(1);
  });

  it('grants nothing once any editor row already exists', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = (() => {
      const s: MagicLinkMessage[] = [];
      return { routes: createAuthRoutes({ branding, bootstrapOwner, send: async (_e, m) => void s.push(m) }), sent: s };
    })();
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'boss@x.dev' } }));
    // The bootstrap email is not itself an editor and the table is non-empty, so it behaves
    // exactly like an unknown email today.
    expect(result).toEqual({ status: 'sent', sent: true });
    expect(sent).toHaveLength(0);
    expect(await countRows('editor')).toBe(1);
  });

  it('behaves like an unknown email on an empty table when the email does not match', async () => {
    const routes = createAuthRoutes({ branding, bootstrapOwner, send: async () => {} });
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'stranger@x.dev' } }));
    expect(result).toEqual({ status: 'sent', sent: true });
    expect(await countRows('editor')).toBe(0);
  });

  it('inserts exactly one owner row across two concurrent matching requests', async () => {
    const routes = createAuthRoutes({ branding, bootstrapOwner, send: async () => {} });
    await Promise.all([
      routes.requestAction(makeEvent({ url, form: { email: 'boss@x.dev' } })),
      routes.requestAction(makeEvent({ url, form: { email: 'boss@x.dev' } })),
    ]);
    expect(await countRows('editor')).toBe(1);
  });

  it('logs editor.bootstrapped with the email on insert', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const routes = createAuthRoutes({ branding, bootstrapOwner, send: async () => {} });
    await routes.requestAction(makeEvent({ url, form: { email: 'boss@x.dev' } }));
    const record = infoSpy.mock.calls
      .map((c) => c[0] as { event?: string; email?: string })
      .find((r) => r.event === 'editor.bootstrapped');
    expect(record?.email).toBe('boss@x.dev');
    vi.restoreAllMocks();
  });

  it('never inserts when no bootstrapOwner is configured', async () => {
    const { routes } = routesWithSink();
    await routes.requestAction(makeEvent({ url, form: { email: 'boss@x.dev' } }));
    expect(await countRows('editor')).toBe(0);
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

  it('logs auth.link.send_failed with the binding code and the mapped condition when the send rejects', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const routes = routesWithFailingSend();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const record = errorSpy.mock.calls
      .map((c) => c[0] as { event?: string; code?: string; conditionId?: string })
      .find((r) => r.event === 'auth.link.send_failed');
    expect(record).toBeDefined();
    expect(record?.code).toBe('E_SENDER_NOT_VERIFIED');
    expect(record?.conditionId).toBe('email.sender-not-onboarded');
    vi.restoreAllMocks();
  });

  it('scrubs a confirm-link token and truncates an oversized error in the send_failed record', async () => {
    // A custom sender's thrown error is operator code, so it may embed the failed message (and
    // with it the magic link). The logged error field must never carry the token, and it stays
    // bounded so an abusive payload cannot inflate the record.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const routes = createAuthRoutes({
      branding,
      send: async (_env, message) => {
        throw new Error(`delivery failed for ${message.html}\n${'x'.repeat(1000)}`);
      },
    });
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const record = errorSpy.mock.calls
      .map((c) => c[0] as { event?: string; error?: string })
      .find((r) => r.event === 'auth.link.send_failed');
    expect(record?.error).toBeDefined();
    expect(record?.error).not.toMatch(/token=(?!\[redacted\])/);
    expect(record?.error?.length).toBeLessThanOrEqual(300);
    vi.restoreAllMocks();
  });
});
