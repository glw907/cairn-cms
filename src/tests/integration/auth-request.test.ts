import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, makeRecordingCookies, countRows, expectRedirect } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { hashToken } from '../../lib/auth/crypto.js';
import type { MagicLinkMessage } from '../../lib/email.js';
import { runtime } from '../unit/_content-harness.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM editor')]);
});

const rt = runtime({ siteName: 'Test', email: { from: 'noreply@test.dev' } });

function routesWithSink() {
  const sent: MagicLinkMessage[] = [];
  const routes = createAuthRoutes({
    runtime: rt,
    send: async (_env, message) => void sent.push(message),
  });
  return { routes, sent };
}

// A sender that fails the way an un-onboarded Cloudflare binding does.
function routesWithFailingSend() {
  return createAuthRoutes({
    runtime: rt,
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
    expect(result).toEqual({ outcome: 'sent' });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ed@x.dev');
    expect(sent[0].html).toContain('https://test.dev/admin/auth/confirm?token=');
    expect(await countRows('magic_token')).toBe(1);
  });

  it('returns the same response and sends nothing for a non-allow-listed email', async () => {
    const { routes, sent } = routesWithSink();
    const result = await routes.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'stranger@x.dev' } }));
    expect(result).toEqual({ outcome: 'sent' });
    expect(sent).toHaveLength(0);
    expect(await countRows('magic_token')).toBe(0);
  });

  it('returns a byte-identical result for a stranger and an editor whose send succeeds (non-leak)', async () => {
    // The relaxed-non-leak posture (email-delivery design) keeps the neutral and send-ok paths
    // identical, so the common case never reveals allowlist membership. Only the send-error and
    // throttled paths differ, and they do so by design for editor feedback.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes } = routesWithSink();
    const url = 'https://test.dev/admin/auth/request';
    const editorResult = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const strangerResult = await routes.requestAction(makeEvent({ url, form: { email: 'stranger@x.dev' } }));
    expect(editorResult).toEqual(strangerResult);
    expect(editorResult).toEqual({ outcome: 'sent' });
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
    expect(first).toEqual({ outcome: 'sent' });
    expect(second).toEqual({ outcome: 'throttled' });
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
      runtime: rt,
      send: async () => {
        await Promise.resolve();
        finished = true;
      },
    });
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(finished).toBe(true); // the send completed before requestAction returned
    expect(result).toEqual({ outcome: 'sent' });
  });

  it('returns send-error when the send rejects, after awaiting it', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const routes = routesWithFailingSend();
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(result).toEqual({ outcome: 'send-error' });
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

  const confirmUrl = 'https://test.dev/admin/auth/confirm';

  /** The one live magic_token row, whole, for an assertion that a write did or did not land. */
  async function tokenRow(): Promise<Record<string, unknown> | null> {
    return await db
      .prepare('SELECT token_hash, email, expires_at, created_at, nonce_hash FROM magic_token')
      .first<Record<string, unknown>>();
  }

  /**
   * Everything a jar's Set-Cookie headers carry except the per-browser random values themselves,
   * plus each value's own shape, so two requests can be compared for header identity.
   */
  function headerShape(jar: ReturnType<typeof makeRecordingCookies>): string {
    return JSON.stringify(jar.sets.map((s) => ({ name: s.name, opts: s.opts, length: s.value.length })));
  }

  it('mints one identical pending cookie on all four exits, before any branch on the editor', async () => {
    // send-ok, the non-editor neutral exit, throttled, and send-failed. Anything less than one
    // identical Set-Cookie on every exit is a one-request allowlist oracle in the headers.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes } = routesWithSink();
    const failing = routesWithFailingSend();

    const sendOk = makeRecordingCookies();
    expect(await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: sendOk }))).toEqual({
      outcome: 'sent',
    });
    const throttled = makeRecordingCookies();
    expect(await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: throttled }))).toEqual({
      outcome: 'throttled',
    });
    const neutral = makeRecordingCookies();
    expect(await routes.requestAction(makeEvent({ url, form: { email: 'stranger@x.dev' }, cookies: neutral }))).toEqual({
      outcome: 'sent',
    });
    await seedEditor('ed2@x.dev', 'Ed2', 'editor');
    const sendFailed = makeRecordingCookies();
    expect(await failing.requestAction(makeEvent({ url, form: { email: 'ed2@x.dev' }, cookies: sendFailed }))).toEqual({
      outcome: 'send-error',
    });

    for (const jar of [sendOk, throttled, neutral, sendFailed]) {
      const set = pendingSet(jar);
      // maxAge is six times the token's own ten-minute TTL: the cookie holds an opaque nonce whose
      // server-side binding dies with the token row, so outliving the row grants nothing, and an
      // ordinary late click then arrives WITH the cookie and reads "expired" rather than the false
      // "different browser" message.
      expect(set.opts).toEqual({ path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600 });
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
    expect(headerShape(strangerJar)).toBe(headerShape(editorJar));
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
    expect(resend).toEqual({ outcome: 'throttled' });
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

  it('rebinds the live token to a throttled re-requester, so an attacker cannot lock an editor out', async () => {
    // The lockout the rebind closes (Geoff, 2026-08-31, "rebind, no email"): an attacker POSTs
    // this form for the editor's address once a minute. The link is emailed to the EDITOR, so the
    // attacker gains no token, but the row is bound to the attacker's browser and the cooldown the
    // attacker just started throttles the editor's own recovery request. Before the rebind the
    // editor could neither confirm the link in their inbox nor earn a new one.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();

    const attacker = makeRecordingCookies();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: attacker }));
    expect(sent).toHaveLength(1);

    const editor = makeRecordingCookies();
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const throttled = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: editor }));
    // No new token, no second email, and the cooldown window is untouched.
    expect(throttled).toEqual({ outcome: 'throttled' });
    expect(sent).toHaveLength(1);
    expect(await countRows('magic_token')).toBe(1);

    // The rebind is the one thing that makes a lockout attempt visible, so it emits a record.
    const records = infoSpy.mock.calls.map((c) => c[0] as Record<string, unknown>);
    const rebound = records.filter((r) => r.event === 'auth.token.rebound');
    expect(rebound).toHaveLength(1);
    expect(rebound[0]).toMatchObject({ level: 'info', email: 'ed@x.dev' });
    // The record carries the envelope and the email, never the nonce or its hash.
    expect(Object.keys(rebound[0]).sort()).toEqual(['email', 'event', 'level', 'timestamp']);
    const editorNonce = pendingSet(editor).value;
    expect(JSON.stringify(rebound[0])).not.toContain(editorNonce);
    expect(JSON.stringify(rebound[0])).not.toContain(await hashToken(editorNonce));
    vi.restoreAllMocks();

    // Last-requester-wins: the emailed token now confirms only in the browser that asked most
    // recently, and the earlier binding stops working without the token ever being burned.
    const token = tokenOf(sent[0]);
    const refused = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies: attacker })),
    );
    expect(refused.location).toBe('/admin/login?error=expired');
    expect(await countRows('magic_token')).toBe(1);

    const recovered = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: confirmUrl, form: { token }, cookies: editor })),
    );
    expect(recovered.location).toBe('/admin');
    expect(await countRows('session')).toBe(1);
  });

  it('leaves the row untouched when a throttled re-submit carries the same nonce', async () => {
    // A genuine double-submit from one browser. The rebind's own WHERE excludes an equal hash, so
    // this is a pure no-op rather than a write that happens to land on the same value.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes } = routesWithSink();
    const cookies = makeRecordingCookies();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies }));
    const before = await tokenRow();

    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const resend = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies }));
    expect(resend).toEqual({ outcome: 'throttled' });
    expect(await tokenRow()).toEqual(before);
    // Silent on the not-eligible arm: a record here would report a write that never happened.
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).not.toContain('auth.token.rebound');
    vi.restoreAllMocks();
  });

  it('stays silent on the not-eligible arm when the live row is unbound', async () => {
    // The hand-seeded recovery row. rebindToken leaves it alone, so nothing is reported either.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { issueToken } = await import('../../lib/auth/store.js');
    const now = Date.now();
    await issueToken(db, 'ed@x.dev', 'a-recovery-token-hash', now + 600_000, now);
    const { routes } = routesWithSink();

    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const throttled = await routes.requestAction(
      makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: makeRecordingCookies() }),
    );
    expect(throttled).toEqual({ outcome: 'throttled' });
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).not.toContain('auth.token.rebound');
    vi.restoreAllMocks();
    expect(
      await db.prepare('SELECT nonce_hash FROM magic_token').first<{ nonce_hash: string | null }>(),
    ).toEqual({ nonce_hash: null });
  });

  it('emits identical headers on a throttled answer whether or not it rebound the row', async () => {
    // The rebind is a server-side write only. Anything observable about it in the response would
    // reintroduce exactly the oracle the byte-identical exits exist to close.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes } = routesWithSink();
    const first = makeRecordingCookies();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: first }));

    const sameNonce = makeRecordingCookies({ [pending]: pendingSet(first).value });
    const otherNonce = makeRecordingCookies();
    const withoutRebind = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: sameNonce }));
    const withRebind = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: otherNonce }));

    expect(withoutRebind).toEqual({ outcome: 'throttled' });
    expect(withRebind).toEqual(withoutRebind);
    expect(headerShape(otherNonce)).toBe(headerShape(sameNonce));
  });

  it('mints the pending cookie in loginLoad, so a browser holds a nonce before it POSTs anything', async () => {
    const { routes } = routesWithSink();
    const cookies = makeRecordingCookies();
    routes.loginLoad(makeEvent({ url: 'https://test.dev/admin/login', cookies }));
    const set = pendingSet(cookies);
    expect(set.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(set.opts).toEqual({ path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600 });
  });

  it('leaves the loginLoad-minted nonce binding the surviving token across two concurrent POSTs', async () => {
    // The deployed shape a single shared in-process jar cannot model: each concurrent request
    // reads the Cookie header the browser sent at request start, never the other request's own
    // Set-Cookie, which is why two cookie-less POSTs could each mint a nonce and strand the
    // surviving token against the losing one. Two separate jars seeded from one browser's
    // cookies is that shape. loginLoad minted the nonce when the form rendered, so both requests
    // read the same value and the surviving row is bound to what the browser still holds.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();

    const browser = makeRecordingCookies();
    routes.loginLoad(makeEvent({ url: 'https://test.dev/admin/login', cookies: browser }));
    const minted = pendingSet(browser).value;

    const first = makeRecordingCookies({ [pending]: minted });
    const second = makeRecordingCookies({ [pending]: minted });
    await Promise.all([
      routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: first })),
      routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, cookies: second })),
    ]);
    expect(pendingSet(first).value).toBe(minted);
    expect(pendingSet(second).value).toBe(minted);
    expect(await countRows('magic_token')).toBe(1);

    const surviving = await db.prepare('SELECT token_hash FROM magic_token').first<{ token_hash: string }>();
    const hashes = await Promise.all(sent.map((message) => hashToken(tokenOf(message))));
    const index = hashes.indexOf(surviving!.token_hash);
    expect(index).toBeGreaterThanOrEqual(0);
    const redirect = await expectRedirect(() =>
      routes.confirmAction(
        makeEvent({
          url: 'https://test.dev/admin/auth/confirm',
          form: { token: tokenOf(sent[index]) },
          cookies: browser,
        }),
      ),
    );
    expect(redirect.location).toBe('/admin');
  });
});

describe('sign-in rate limit', () => {
  const url = 'https://test.dev/admin/auth/request';
  const pending = '__Host-cairn_login_pending';
  const address = '203.0.113.7';
  const headers = { 'cf-connecting-ip': address };
  // A fixed pending cookie, so the reused nonce makes two answers' Set-Cookie bytes comparable.
  const fixedNonce = 'a-fixed-pending-nonce-for-byte-comparison';

  /** A limiter double that answers `success` and records every key it is asked about. */
  function limiter(success: boolean) {
    const keys: string[] = [];
    return { keys, binding: { limit: async ({ key }: { key: string }) => (keys.push(key), { success }) } };
  }

  function routesLimitedBy(rateLimit: Parameters<typeof createAuthRoutes>[0]['rateLimit']) {
    const sent: MagicLinkMessage[] = [];
    const routes = createAuthRoutes({ runtime: rt, send: async (_env, message) => void sent.push(message), rateLimit });
    return { routes, sent };
  }

  /** The serialized result and Set-Cookie list of one request under the fixed pending cookie. */
  async function answer(routes: ReturnType<typeof createAuthRoutes>, email: string): Promise<string> {
    const jar = makeRecordingCookies({ [pending]: fixedNonce });
    const result = await routes.requestAction(makeEvent({ url, form: { email }, cookies: jar, headers }));
    return JSON.stringify({ result, sets: jar.sets });
  }

  it('answers a limited request exactly as a throttled one, for an editor and a non-editor alike', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes: open } = routesWithSink();
    await open.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const throttled = await answer(open, 'ed@x.dev');
    expect(JSON.parse(throttled).result).toEqual({ outcome: 'throttled' });

    const { keys, binding } = limiter(false);
    const { routes, sent } = routesLimitedBy(() => binding);
    expect(await answer(routes, 'ed@x.dev')).toBe(throttled);
    expect(await answer(routes, 'stranger@x.dev')).toBe(throttled);
    expect(keys).toEqual([`login:${address}`, `login:${address}`]);
    expect(sent).toHaveLength(0);
  });

  it('exits before the token write and logs auth.rate_limited with its scope and no address', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { binding } = limiter(false);
    const { routes } = routesLimitedBy(() => binding);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, headers }));
    const record = warnSpy.mock.calls.map((c) => c[0] as Record<string, unknown>).find((r) => r.event === 'auth.rate_limited');
    vi.restoreAllMocks();
    expect(record).toMatchObject({ level: 'warn', scope: 'login' });
    expect(Object.keys(record!).sort()).toEqual(['event', 'level', 'scope', 'timestamp']);
    expect(await countRows('magic_token')).toBe(0);
  });

  it('lets an allowed request through to the ordinary send', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { binding } = limiter(true);
    const { routes, sent } = routesLimitedBy(() => binding);
    expect(await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, headers }))).toEqual({ outcome: 'sent' });
    expect(sent).toHaveLength(1);
  });

  it('skips the limiter when the request carries no CF-Connecting-IP header', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { keys, binding } = limiter(false);
    const { routes, sent } = routesLimitedBy(() => binding);
    expect(await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }))).toEqual({ outcome: 'sent' });
    expect(keys).toEqual([]);
    expect(sent).toHaveLength(1);
  });

  it('lets the request through when the resolver finds no binding', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesLimitedBy(() => undefined);
    expect(await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, headers }))).toEqual({ outcome: 'sent' });
    expect(sent).toHaveLength(1);
  });

  it.each([
    {
      name: 'a limiter whose call throws',
      resolve: () => ({ limit: () => Promise.reject(new Error(`limiter down for login:${address}`)) }),
    },
    {
      name: 'a resolver that throws',
      resolve: () => {
        throw new Error(`no binding for ${address}`);
      },
    },
  ])('lets the request through and logs auth.rate_limit_failed for $name, with no address', async ({ resolve }) => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesLimitedBy(resolve);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, headers }));
    const records = warnSpy.mock.calls.map((c) => c[0] as Record<string, unknown>);
    vi.restoreAllMocks();
    expect(result).toEqual({ outcome: 'sent' });
    expect(sent).toHaveLength(1);
    const failed = records.filter((r) => r.event === 'auth.rate_limit_failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ level: 'warn', scope: 'login' });
    expect(Object.keys(failed[0]).sort()).toEqual(['error', 'event', 'level', 'scope', 'timestamp']);
    expect(JSON.stringify(failed[0])).not.toContain(address);
  });

  it('bounds the limiter key to a 64-character address', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { keys, binding } = limiter(true);
    const { routes } = routesLimitedBy(() => binding);
    await routes.requestAction(
      makeEvent({ url, form: { email: 'ed@x.dev' }, headers: { 'cf-connecting-ip': 'a'.repeat(500) } }),
    );
    expect(keys).toEqual([`login:${'a'.repeat(64)}`]);
  });

  /** The one auth.rate_limit_failed record a request under `resolve` writes. */
  async function failedRecord(resolve: Parameters<typeof routesLimitedBy>[0]) {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes } = routesLimitedBy(resolve);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' }, headers }));
    const records = warnSpy.mock.calls.map((c) => c[0] as Record<string, unknown>);
    vi.restoreAllMocks();
    return records.filter((r) => r.event === 'auth.rate_limit_failed')[0];
  }

  it('logs a useful error, not [object Object], when the resolver throws a non-Error value', async () => {
    const record = await failedRecord(() => {
      throw { status: 303, location: '/elsewhere' };
    });
    expect(record.error).toBe('non-error throw');
  });

  it('logs only the error name and a fixed message, so an address echoed in any form never reaches the record', async () => {
    const echoed = [
      '203.0.113.7',
      '0:0:0:0:0:0:0:1',
      '::1',
      encodeURIComponent('login:203.0.113.7'),
      '%32%30%33%2E%30%2E%31%31%33%2E%37',
    ].join(' ');
    const record = await failedRecord(() => ({
      limit: () => Promise.reject(Object.assign(new Error(`limiter failed for ${echoed}`), { name: 'LimiterError' })),
    }));
    expect(record.error).toBe('LimiterError: rate limit call failed');
    expect(JSON.stringify(record)).not.toContain('203.0.113.7');
    expect(JSON.stringify(record)).not.toContain('%32%30');
  });

  it('logs a name set to the address as a non-error throw', async () => {
    const record = await failedRecord(() => ({
      limit: () => Promise.reject(Object.assign(new Error('x'), { name: 'login:203.0.113.7' })),
    }));
    expect(record.error).toBe('non-error throw');
    expect(JSON.stringify(record)).not.toContain('203.0.113.7');
  });
});

describe('first-owner seeding', () => {
  const url = 'https://test.dev/admin/auth/request';

  it('never inserts an owner or sends a link for a requester on an empty table', async () => {
    const sent: MagicLinkMessage[] = [];
    const routes = createAuthRoutes({ runtime: rt, send: async (_e, m) => void sent.push(m) });
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'boss@x.dev' } }));
    expect(result).toEqual({ outcome: 'sent' });
    expect(await countRows('editor')).toBe(0);
    expect(sent).toHaveLength(0);
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
      runtime: rt,
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
