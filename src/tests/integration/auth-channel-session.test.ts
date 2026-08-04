// Task 4 of the auth-channel factory plan: the session half of the flow (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md, Flows: logout,
// resolveSubject, revokeSessions), proven against real miniflare D1.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { hashToken } from '../../lib/auth/crypto.js';
import {
  applyChannelSchema,
  makeChannelConfig,
  makeCookies,
  makeEvent,
  resetChannelDb,
  seedCode,
  PENDING_HTTP,
  PENDING_HTTPS,
  SESSION_HTTP,
  SESSION_HTTPS,
} from './_channel-harness.js';
import type { ChannelTestEnv } from './_channel-harness.js';
import { expectHttpError } from '../_redirect-assertions.js';

const db = env.CHANNEL_DB;
const MINUTE = 60_000;

beforeAll(async () => {
  await applyChannelSchema();
});

beforeEach(async () => {
  await resetChannelDb();
});

function makeConfig(overrides: Partial<AuthChannelConfig<ChannelTestEnv>> = {}): AuthChannelConfig<ChannelTestEnv> {
  return makeChannelConfig(overrides).config;
}

/** Confirm a freshly seeded code and return the session token the browser would hold. */
async function signIn(channel: ReturnType<typeof createAuthChannel<ChannelTestEnv>>, contact: string, subject: string): Promise<string> {
  const { nonceToken, code } = await seedCode({ contact, subject });
  const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
  const result = await channel.actions.confirm(makeEvent({ code, cookies: jar }));
  if (!('ok' in result)) throw new Error(`signIn helper: confirm did not succeed: ${JSON.stringify(result)}`);
  const set = jar.sets.find((s) => s.name === SESSION_HTTPS);
  if (!set) throw new Error('signIn helper: no session cookie was set');
  return set.value;
}

describe('session cookie attributes on confirm success', () => {
  it('carries Path=/, HttpOnly, SameSite=Lax, Max-Age matching the session TTL, and Secure with __Host- on https', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const { nonceToken, code } = await seedCode({ contact: 'cookie@x.test', subject: 'sub-1' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    await channel.actions.confirm(makeEvent({ code, cookies: jar }));
    const set = jar.sets.find((s) => s.name === SESSION_HTTPS);
    expect(set).toBeDefined();
    expect(set?.name.startsWith('__Host-')).toBe(true);
    expect(set?.opts).toMatchObject({
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
    });
  });

  it('drops Secure and the __Host- prefix on local http', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const { nonceToken, code } = await seedCode({ contact: 'cookie2@x.test', subject: 'sub-1' });
    // On local http the pending cookie itself carries the unprefixed name, so the jar must hold
    // the nonce under that name for the confirm call to find its row.
    const jar = makeCookies({ [PENDING_HTTP]: nonceToken });
    await channel.actions.confirm(
      makeEvent({ url: 'http://localhost:5173/login', code, cookies: jar }),
    );
    const set = jar.sets.find((s) => s.name === SESSION_HTTP);
    expect(set).toBeDefined();
    expect(set?.name.startsWith('__Host-')).toBe(false);
    expect(set?.opts.secure).toBe(false);
  });
});

describe('confirm cleans up an orphaned prior session', () => {
  it('deletes the row an incoming session cookie names and logs session.destroyed with the correlation id', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-orphan' }));
    const firstToken = await signIn(channel, 'orphan@x.test', 'sub-orphan');
    const firstHash = await hashToken(firstToken);

    // A second confirm from the same browser, still carrying the first session's cookie: the old
    // row must not survive as an orphan once the new session mints.
    const { nonceToken, code } = await seedCode({ contact: 'orphan@x.test', subject: 'sub-orphan' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken, [SESSION_HTTPS]: firstToken });
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = await channel.actions.confirm(makeEvent({ code, cookies: jar }));
      expect(result).toEqual({ ok: true });
      const destroyed = infoSpy.mock.calls
        .map((c) => c[0] as { event?: string; correlationId?: string })
        .filter((r) => r.event === 'auth.channel.session.destroyed');
      expect(destroyed).toHaveLength(1);
      expect(destroyed[0].correlationId).toMatch(/^[0-9a-f]{16}$/);
    } finally {
      vi.restoreAllMocks();
    }
    const oldRow = await db
      .prepare('SELECT COUNT(*) AS n FROM cairn_channel_session WHERE token_hash = ?1')
      .bind(firstHash)
      .first<{ n: number }>();
    expect(oldRow?.n ?? 0).toBe(0);
  });
});

describe('logout', () => {
  it('refuses a mismatched origin', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig());
    const { status } = await expectHttpError(() => channel.actions.logout(makeEvent({ origin: 'https://evil.test' })));
    expect(status).toBe(403);
  });

  it('refuses plain http outside localhost', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig());
    const { status } = await expectHttpError(() =>
      channel.actions.logout(makeEvent({ url: 'http://member.example.test/login' })),
    );
    expect(status).toBe(403);
  });

  it('deletes the session row, clears both cookies, and logs session.destroyed', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-logout' }));
    const token = await signIn(channel, 'logout@x.test', 'sub-logout');
    const jar = makeCookies({ [SESSION_HTTPS]: token, [PENDING_HTTPS]: 'stale-nonce' });

    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = await channel.actions.logout(makeEvent({ cookies: jar }));
      expect(result).toEqual({ ok: true });
      const sessionDelete = jar.deletes.find((d) => d.name === SESSION_HTTPS);
      const pendingDelete = jar.deletes.find((d) => d.name === PENDING_HTTPS);
      expect(sessionDelete).toBeDefined();
      expect(sessionDelete?.opts.path).toBe('/');
      expect(pendingDelete).toBeDefined();
      expect(pendingDelete?.opts.path).toBe('/');
      const destroyedRecords = infoSpy.mock.calls
        .map((c) => c[0] as { event?: string })
        .filter((r) => r.event === 'auth.channel.session.destroyed');
      expect(destroyedRecords.length).toBeGreaterThan(0);
    } finally {
      vi.restoreAllMocks();
    }

    expect(await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }))).toBeNull();
  });

  it('is a no-op, still clearing cookies, when no session cookie is present', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig());
    const jar = makeCookies();
    const result = await channel.actions.logout(makeEvent({ cookies: jar }));
    expect(result).toEqual({ ok: true });
  });
});

describe('resolveSubject', () => {
  it('round-trips a subject from a valid session cookie', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-roundtrip' }));
    const token = await signIn(channel, 'roundtrip@x.test', 'sub-roundtrip');
    const subject = await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
    expect(subject).toBe('sub-roundtrip');
  });

  it('is null when no session cookie is present', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig());
    expect(await channel.resolveSubject(makeEvent())).toBeNull();
  });

  it('is null after the session has expired', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-expiry', ttl: { sessionTtlMs: MINUTE } }));
    const token = await signIn(channel, 'expiry@x.test', 'sub-expiry');
    // Force the row's expiry into the past directly, rather than waiting out the TTL.
    await db.prepare('UPDATE cairn_channel_session SET expires_at = ?1').bind(Date.now() - 1000).run();
    const subject = await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
    expect(subject).toBeNull();
  });

  it('is null after logout', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-logout2' }));
    const token = await signIn(channel, 'logout2@x.test', 'sub-logout2');
    await channel.actions.logout(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
    const subject = await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
    expect(subject).toBeNull();
  });

  it('is null and destroys the row when verify returns false', async () => {
    const verify = vi.fn(async () => false);
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-verify', verify }));
    const token = await signIn(channel, 'verify@x.test', 'sub-verify');
    const subject = await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
    expect(subject).toBeNull();
    expect(verify).toHaveBeenCalledWith('sub-verify');
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM cairn_channel_session WHERE token_hash = ?1')
      .bind(await hashToken(token))
      .first<{ n: number }>();
    expect(row?.n ?? 0).toBe(0);
  });

  it('is null when verify throws, but the session row survives the outage', async () => {
    // A throwing verify is a roster backend fault, not a roster answer: the resolution is
    // refused for this request only. Destroying the row here would convert a transient outage
    // into a permanent mass revocation, so the same session must resolve again once the hook
    // recovers.
    let backendUp = false;
    const channel = createAuthChannel<ChannelTestEnv>(
      makeConfig({
        lookup: async () => 'sub-verify-throw',
        verify: async () => {
          if (!backendUp) throw new Error('verify backend down');
          return true;
        },
      }),
    );
    const token = await signIn(channel, 'verify-throw@x.test', 'sub-verify-throw');
    const during = await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
    expect(during).toBeNull();
    backendUp = true;
    const after = await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
    expect(after).toBe('sub-verify-throw');
  });
});

describe('revokeSessions', () => {
  it('cuts every session for a subject, leaving other subjects untouched', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig());
    // Two independent sign-ins for the same subject (a member with two sessions), plus one for
    // an unrelated subject that must survive.
    const tokenA = await signIn(channel, 'shared-subject-a@x.test', 'shared-subject');
    const tokenB = await signIn(channel, 'shared-subject-b@x.test', 'shared-subject');
    const otherToken = await signIn(channel, 'other-subject@x.test', 'other-subject');

    await channel.revokeSessions(db, 'shared-subject');

    expect(await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: tokenA }) }))).toBeNull();
    expect(await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: tokenB }) }))).toBeNull();
    expect(await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: otherToken }) }))).toBe('other-subject');
  });
});
