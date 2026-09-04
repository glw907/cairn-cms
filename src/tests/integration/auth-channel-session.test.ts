// Task 4 of the auth-channel factory plan: the session half of the flow (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md, Flows: logout,
// resolveSubject, revokeSessions), proven against real miniflare D1.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { hashToken } from '../../lib/auth/crypto.js';
import * as store from '../../lib/auth-channel/store.js';
import {
  applyChannelSchema,
  makeChannelConfig,
  makeCookies,
  makeEvent,
  resetChannelDb,
  seedCode,
  sessionRowCount,
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

  it('logs nothing when the incoming session cookie names no row, so the record means a real deletion', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-orphan-gone' }));
    // A session cookie whose row is already gone (expired and swept, or a stale browser copy):
    // destroyChannelSession's RETURNING finds nothing, so the emit at this third call site must
    // stay conditional on it the same way logout's and the verify-refused revocation's do.
    const { nonceToken, code } = await seedCode({ contact: 'orphan-gone@x.test', subject: 'sub-orphan-gone' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken, [SESSION_HTTPS]: 'a-token-whose-row-is-gone' });
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = await channel.actions.confirm(makeEvent({ code, cookies: jar }));
      expect(result).toEqual({ ok: true });
      const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
      expect(events).not.toContain('auth.channel.session.destroyed');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('logs nothing when the orphaned row is already expired, so an expired teardown is not counted as a live sign-out', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-orphan-expired' }));
    const firstToken = await signIn(channel, 'orphan-expired@x.test', 'sub-orphan-expired');
    // The old row exists but its own expiry has already passed, the same forcing technique
    // resolveSubject's own expiry test uses.
    await db.prepare('UPDATE cairn_channel_session SET expires_at = ?1').bind(Date.now() - 1000).run();

    const { nonceToken, code } = await seedCode({ contact: 'orphan-expired@x.test', subject: 'sub-orphan-expired' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken, [SESSION_HTTPS]: firstToken });
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = await channel.actions.confirm(makeEvent({ code, cookies: jar }));
      expect(result).toEqual({ ok: true });
      const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
      expect(events).not.toContain('auth.channel.session.destroyed');
    } finally {
      vi.restoreAllMocks();
    }
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
      // Both deletes carry the `secure` their setters used: without it a logout over http on a
      // non-localhost host answers with a Set-Cookie the browser discards, and the session stands.
      expect(sessionDelete?.opts.secure).toBe(true);
      expect(pendingDelete?.opts.secure).toBe(true);
      const destroyedRecords = infoSpy.mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .filter((r) => r.event === 'auth.channel.session.destroyed');
      expect(destroyedRecords).toHaveLength(1);
      // The record never carries the roster identity, only the channel's own pseudonym.
      expect(JSON.stringify(destroyedRecords[0])).not.toContain('sub-logout');
      expect(destroyedRecords[0].correlationId).toMatch(/^[0-9a-f]{16}$/);
    } finally {
      vi.restoreAllMocks();
    }

    expect(await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }))).toBeNull();
  });

  it('records the same correlation id the request flow derived for that subject', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-correlate' }));
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const token = await signIn(channel, 'correlate@x.test', 'sub-correlate');
      // The request flow's own record for this identity, derived from the salted subject hash.
      await channel.actions.request(makeEvent({ contact: 'correlate@x.test' }));
      const requested = infoSpy.mock.calls
        .map((c) => c[0] as { event?: string; correlationId?: string })
        .filter((r) => r.event === 'auth.channel.requested' && r.correlationId);
      expect(requested.length).toBeGreaterThan(0);

      await channel.actions.logout(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
      const destroyed = infoSpy.mock.calls
        .map((c) => c[0] as { event?: string; correlationId?: string })
        .filter((r) => r.event === 'auth.channel.session.destroyed');
      expect(destroyed).toHaveLength(1);
      expect(destroyed[0].correlationId).toBe(requested[requested.length - 1].correlationId);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('completes, logs auth.channel.salt_unavailable, and logs nothing else when the salt read faults, so a teardown never strands the member', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-salt-fault' }));
    const token = await signIn(channel, 'salt-fault@x.test', 'sub-salt-fault');
    const jar = makeCookies({ [SESSION_HTTPS]: token });

    // signIn only exercises confirmAction, which never derives an identity and so never calls
    // resolveSalt: the salt read this test forces to fault is genuinely the first one this channel
    // instance attempts, not one resolveSalt's own cache would have already answered from memory.

    // Drop the meta table only after signIn already verified the schema on this channel instance
    // (schemaVerified caches to true): logout's resolveVerifiedSession then skips the recheck and
    // reaches destroyChannelSession normally, and only the salt read that follows faults, the same
    // way logSessionDestroyed's own doc comment describes.
    await db.exec('DROP TABLE cairn_channel_meta');
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await channel.actions.logout(makeEvent({ cookies: jar }));
      expect(result).toEqual({ ok: true });
      const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
      expect(events).not.toContain('auth.channel.session.destroyed');

      const faults = warnSpy.mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .filter((r) => r.event === 'auth.channel.salt_unavailable');
      expect(faults).toHaveLength(1);
      expect(faults[0].path).toBe('logout');
      expect(typeof faults[0].error).toBe('string');
      // No correlationId: none is derivable without the salt, and the only substitute would be
      // the raw subject, which this channel's no-roster-identity posture forbids.
      expect(faults[0].correlationId).toBeUndefined();
      expect(JSON.stringify(faults[0])).not.toContain('sub-salt-fault');

      // The teardown itself must still have run: the salt fault only skips the log record, per
      // logSessionDestroyed's contract, never the deletion that made a record true in the first
      // place.
      const tokenHash = await hashToken(token);
      const sessionRow = await db
        .prepare('SELECT 1 FROM cairn_channel_session WHERE token_hash = ?1')
        .bind(tokenHash)
        .first();
      expect(sessionRow).toBeNull();
    } finally {
      vi.restoreAllMocks();
      await db.exec('CREATE TABLE IF NOT EXISTS cairn_channel_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      await db
        .prepare("INSERT OR IGNORE INTO cairn_channel_meta (key, value) VALUES ('schema_version', '1')")
        .run();
      // No identity_salt restore needed: the harness's own resetChannelDb beforeEach deletes every
      // meta row but schema_version before the next test runs, so a restored salt would just be
      // discarded again.
    }
  });

  it('records path: "revoke" (not "logout") when the salt fault happens on a verify-refused revocation', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(
      makeConfig({ lookup: async () => 'sub-revoke-salt-fault', verify: async () => false }),
    );
    const token = await signIn(channel, 'revoke-salt-fault@x.test', 'sub-revoke-salt-fault');

    // Same forcing technique as the logout case above: drop the meta table only after signIn has
    // already verified the schema on this channel instance, so resolveSubject's own verify-refused
    // teardown reaches destroyChannelSession normally and only the salt read that follows faults.
    await db.exec('DROP TABLE cairn_channel_meta');
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const subject = await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
      expect(subject).toBeNull();
      const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
      expect(events).not.toContain('auth.channel.session.destroyed');

      const faults = warnSpy.mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .filter((r) => r.event === 'auth.channel.salt_unavailable');
      expect(faults).toHaveLength(1);
      expect(faults[0].path).toBe('revoke');
      expect(faults[0].correlationId).toBeUndefined();
    } finally {
      vi.restoreAllMocks();
      await db.exec('CREATE TABLE IF NOT EXISTS cairn_channel_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
      await db
        .prepare("INSERT OR IGNORE INTO cairn_channel_meta (key, value) VALUES ('schema_version', '1')")
        .run();
    }
  });

  it('logs nothing when the session cookie names no row, so the record means a real deletion', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig());
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = await channel.actions.logout(
        makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: 'a-token-whose-row-is-gone' }) }),
      );
      expect(result).toEqual({ ok: true });
      const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
      expect(events).not.toContain('auth.channel.session.destroyed');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('logs nothing when the session row is already expired, so an expired teardown is not counted as a live sign-out', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-logout-expired' }));
    const token = await signIn(channel, 'logout-expired@x.test', 'sub-logout-expired');
    // Force the row's expiry into the past directly, the same technique
    // resolveSubject's own expiry test uses, so the row still exists but is no longer live.
    await db.prepare('UPDATE cairn_channel_session SET expires_at = ?1').bind(Date.now() - 1000).run();
    const jar = makeCookies({ [SESSION_HTTPS]: token });

    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = await channel.actions.logout(makeEvent({ cookies: jar }));
      expect(result).toEqual({ ok: true });
      const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
      expect(events).not.toContain('auth.channel.session.destroyed');
    } finally {
      vi.restoreAllMocks();
    }
    // The delete stays unconditional: the expired row is gone regardless of the skipped record.
    expect(await sessionRowCount()).toBe(0);
  });

  // The stale-clock regression (round B): logoutAction must read Date.now() AT the liveness
  // comparison, not before the awaits (resolveVerifiedSession, destroyChannelSession, hashToken)
  // that precede it, matching the confirm and revoke sites. The row's expiry is set to fall
  // between "before those awaits" and "after them": a `now` captured early would still read the
  // row as live and wrongly log a destroyed record; a `now` read fresh at the comparison correctly
  // finds it already expired and stays silent.
  it('reads the clock fresh at the liveness comparison, not before the awaited destroy call', async () => {
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-logout-stale-clock' }));
    const token = await signIn(channel, 'logout-stale-clock@x.test', 'sub-logout-stale-clock');
    // Live when logoutAction starts, expired only after the artificial delay below elapses.
    const expiresAt = Date.now() + 30;
    await db.prepare('UPDATE cairn_channel_session SET expires_at = ?1').bind(expiresAt).run();
    const jar = makeCookies({ [SESSION_HTTPS]: token });

    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const originalDestroy = store.destroyChannelSession;
    const destroySpy = vi
      .spyOn(store, 'destroyChannelSession')
      .mockImplementation(async (...args: Parameters<typeof store.destroyChannelSession>) => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return originalDestroy(...args);
      });
    try {
      const result = await channel.actions.logout(makeEvent({ cookies: jar }));
      expect(result).toEqual({ ok: true });
      expect(destroySpy).toHaveBeenCalledTimes(1);
      const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
      expect(events).not.toContain('auth.channel.session.destroyed');
    } finally {
      vi.restoreAllMocks();
    }
    // The delete stays unconditional regardless of the skipped record.
    expect(await sessionRowCount()).toBe(0);
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
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-expiry', limits: { session: { ttlMs: MINUTE } } }));
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
    const verify = vi.fn<NonNullable<AuthChannelConfig<ChannelTestEnv>['verify']>>(async () => false);
    const channel = createAuthChannel<ChannelTestEnv>(makeConfig({ lookup: async () => 'sub-verify', verify }));
    const token = await signIn(channel, 'verify@x.test', 'sub-verify');
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    let subject: string | null;
    try {
      subject = await channel.resolveSubject(makeEvent({ cookies: makeCookies({ [SESSION_HTTPS]: token }) }));
      // The revocation records like any other session teardown, under the pseudonym derived from
      // the subject the session resolved to, never the subject itself.
      const destroyed = infoSpy.mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .filter((r) => r.event === 'auth.channel.session.destroyed');
      expect(destroyed).toHaveLength(1);
      expect(destroyed[0].correlationId).toMatch(/^[0-9a-f]{16}$/);
      expect(JSON.stringify(destroyed[0])).not.toContain('sub-verify');
    } finally {
      infoSpy.mockRestore();
    }
    expect(subject).toBeNull();
    // verify receives the binding and nothing else: a narrow context, never the event, since a
    // false here destroys the session row on every authenticated request. Asserted member by
    // member rather than with one toHaveBeenCalledWith, since deep-equating the live D1 binding
    // makes vitest serialize an RPC stub that answers no inspect().
    expect(verify).toHaveBeenCalledTimes(1);
    const [verifiedSubject, verifyCtx] = verify.mock.calls[0];
    expect(verifiedSubject).toBe('sub-verify');
    expect(Object.keys(verifyCtx)).toEqual(['env']);
    expect(verifyCtx.env?.CHANNEL_DB).toBe(db);
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
