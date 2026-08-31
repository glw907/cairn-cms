import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, makeRecordingCookies, countRows, expectRedirect } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { hashToken } from '../../lib/auth/crypto.js';
import type { MagicLinkMessage } from '../../lib/email.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM editor')]);
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

  it('awaits the send before returning, never backgrounding it', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    let finished = false;
    const routes = createAuthRoutes({
      branding,
      send: async () => {
        await Promise.resolve();
        finished = true;
      },
    });
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(finished).toBe(true); // the send completed before requestAction returned
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

describe('login nonce cookie (same-browser binding)', () => {
  const url = 'https://test.dev/admin/auth/request';
  // The public-observable name, spelled out rather than derived, so a rename cannot pass silently.
  const pending = '__Host-cairn_login_pending';

  /** The one pending-cookie Set-Cookie a request emitted, as a comparable shape. */
  function pendingSet(cookies: ReturnType<typeof makeRecordingCookies>) {
    const sets = cookies.sets.filter((s) => s.name === pending);
    expect(sets).toHaveLength(1);
    return sets[0];
  }

  /** The magic-link token out of a sent message's confirm URL. */
  function tokenOf(message: MagicLinkMessage): string {
    const match = /token=([A-Za-z0-9_-]+)/.exec(message.html);
    expect(match).not.toBeNull();
    return match![1];
  }

  it('mints one identical pending cookie on all four exits, before any branch on the editor', async () => {
    // send-ok, the non-editor neutral exit, throttled, and send-failed. Anything less than one
    // identical Set-Cookie on every exit is a one-request allowlist oracle in the headers.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes } = routesWithSink();
    const failing = routesWithFailingSend();

    const sendOk = makeRecordingCookies();
    expect(await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: sendOk }))).toEqual({
      status: 'sent',
      sent: true,
    });
    const throttled = makeRecordingCookies();
    expect(await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: throttled }))).toEqual({
      status: 'throttled',
      sent: false,
    });
    const neutral = makeRecordingCookies();
    expect(await routes.requestAction(makeEvent({ url, form: { email: 'stranger@x.dev' }, cookies: neutral }))).toEqual({
      status: 'sent',
      sent: true,
    });
    await seedEditor('ed2@x.dev', 'Ed2', 'editor');
    const sendFailed = makeRecordingCookies();
    expect(await failing.requestAction(makeEvent({ url, form: { email: 'ed2@x.dev' }, cookies: sendFailed }))).toEqual({
      status: 'send_error',
      sent: false,
    });

    for (const jar of [sendOk, throttled, neutral, sendFailed]) {
      const set = pendingSet(jar);
      expect(set.opts).toEqual({ path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 });
      expect(set.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('emits headers identical to the send-ok path on the non-editor neutral exit, Set-Cookie included', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes } = routesWithSink();
    const editorJar = makeRecordingCookies();
    const strangerJar = makeRecordingCookies();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: editorJar }));
    await routes.requestAction(makeEvent({ url, form: { email: 'stranger@x.dev' }, cookies: strangerJar }));
    // The nonce value is per-browser random, so identity is over everything a header carries
    // besides the value itself, plus the value's own shape.
    const shape = (jar: ReturnType<typeof makeRecordingCookies>) =>
      JSON.stringify(jar.sets.map((s) => ({ name: s.name, opts: s.opts, length: s.value.length })));
    expect(shape(strangerJar)).toBe(shape(editorJar));
    expect(pendingSet(strangerJar).value).not.toBe(pendingSet(editorJar).value);
  });

  it('reuses an unexpired pending cookie, so a throttled resend leaves the first link confirmable', async () => {
    // Unconditional rotation would point the cookie at a nonce no live token is bound to, which
    // locks the editor out of the link already sitting in their inbox.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const cookies = makeRecordingCookies();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies }));
    const first = cookies.sets.filter((s) => s.name === pending);
    const resend = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies }));
    expect(resend).toEqual({ status: 'throttled', sent: false });
    const both = cookies.sets.filter((s) => s.name === pending);
    expect(both).toHaveLength(2);
    expect(both[1].value).toBe(first[0].value);

    const redirect = await expectRedirect(() =>
      routes.confirmAction(
        makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token: tokenOf(sent[0]) }, cookies }),
      ),
    );
    expect(redirect.location).toBe('/admin');
  });

  it('leaves the surviving cookie confirming the surviving token across two cookie-less concurrent requests', async () => {
    // The pending-cookie analogue of the CSRF double-mint WATCH: one browser, no cookie yet, two
    // request POSTs in flight. Whichever token row survives must be bound to the nonce the jar
    // ends up holding.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const cookies = makeRecordingCookies();
    await Promise.all([
      routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies })),
      routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies })),
    ]);
    expect(await countRows('magic_token')).toBe(1);
    const values = new Set(cookies.sets.filter((s) => s.name === pending).map((s) => s.value));
    expect(values.size).toBe(1);

    const surviving = await db.prepare('SELECT token_hash FROM magic_token').first<{ token_hash: string }>();
    const hashes = await Promise.all(sent.map((message) => hashToken(tokenOf(message))));
    const index = hashes.indexOf(surviving!.token_hash);
    expect(index).toBeGreaterThanOrEqual(0);
    const redirect = await expectRedirect(() =>
      routes.confirmAction(
        makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token: tokenOf(sent[index]) }, cookies }),
      ),
    );
    expect(redirect.location).toBe('/admin');
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
