// Task 3 of the auth-channel factory plan: the request action's eight-step flow (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md, Flows), proven against real
// miniflare D1. The lockout regression test is the structural guard the design's three review
// rounds needed: a victim who requests first must complete a login with no extra interaction even
// after an attacker in a separate cookie jar blows past every identity-keyed cap.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import {
  applyChannelSchema,
  budgetSum,
  codeRowCount,
  makeChannelConfig as makeConfig,
  makeCookies,
  makeEvent,
  resetChannelDb,
  PENDING_HTTP,
  PENDING_HTTPS,
} from './_channel-harness.js';
import type { ChannelTestEnv } from './_channel-harness.js';
import { expectHttpError } from '../_redirect-assertions.js';

const db = env.CHANNEL_DB;

beforeAll(async () => {
  await applyChannelSchema();
});

beforeEach(async () => {
  await resetChannelDb();
});

describe('origin and scheme checks', () => {
  it('refuses a mismatched origin', async () => {
    const { config } = makeConfig();
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const event = makeEvent({ contact: 'a@x.test', origin: 'https://evil.test' });
    const { status } = await expectHttpError(() => channel.actions.request(event));
    expect(status).toBe(403);
    expect(await codeRowCount()).toBe(0);
  });

  it('refuses plain http outside localhost', async () => {
    const { config } = makeConfig();
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const event = makeEvent({ url: 'http://member.example.test/login', contact: 'a@x.test' });
    const { status } = await expectHttpError(() => channel.actions.request(event));
    expect(status).toBe(403);
  });

  it('allows plain http on localhost', async () => {
    const { config, sent } = makeConfig({ lookup: async () => 'sub-1' });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const event = makeEvent({ url: 'http://localhost:5173/login', contact: 'a@x.test' });
    const result = await channel.actions.request(event);
    expect(result).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
  });
});

describe('lookup reads the binding, never the request', () => {
  it('receives the normalized contact and a context carrying only the resolved env', async () => {
    // The narrow context is the security property, not an ergonomic one: lookup decides
    // subject-versus-decoy, and the factory swallows its throw as a miss, so a lookup that could
    // read request-shaped data would make roster membership request-controlled.
    const seen: { contact: string; ctx: { env: ChannelTestEnv | undefined } }[] = [];
    const { config } = makeConfig({
      lookup: async (contact, ctx) => {
        seen.push({ contact, ctx });
        return 'sub-ctx';
      },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);

    await channel.actions.request(makeEvent({ contact: '  Mixed@X.test  ' }));

    expect(seen).toHaveLength(1);
    expect(seen[0].contact).toBe('mixed@x.test');
    expect(Object.keys(seen[0].ctx)).toEqual(['env']);
    expect(seen[0].ctx.env?.CHANNEL_DB).toBe(db);
  });
});

describe('housekeeping rides the mint', () => {
  it('a successful request sweeps expired code rows, expired sessions, and stale budget rows', async () => {
    const past = Date.now() - 60 * 60 * 1000;
    await db
      .prepare(
        `INSERT INTO cairn_channel_code
           (nonce_hash, identity, code_hash, subject, kind, attempts, expires_at, created_at, requester_bucket)
         VALUES ('stale-nonce', 'stale-id', 'stale-hash', NULL, 'code', 0, ?1, ?2, 'stale-bucket')`,
      )
      .bind(past, past)
      .run();
    await db
      .prepare(
        `INSERT INTO cairn_channel_session (token_hash, subject, expires_at, created_at)
         VALUES ('stale-session', 'stale-subject', ?1, ?2)`,
      )
      .bind(past, past)
      .run();
    await db
      .prepare(
        `INSERT INTO cairn_channel_budget (bucket, scope, count, window_start, prev_count)
         VALUES ('stale:budget', 'stale', 1, ?1, 0)`,
      )
      .bind(past - 2 * 60 * 60 * 1000)
      .run();

    const { config } = makeConfig({ lookup: async () => 'sub-sweep' });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    // No platform on the test event, so the sweep awaits inline and is deterministic here.
    const result = await channel.actions.request(makeEvent({ contact: 'sweep@x.test' }));
    expect(result).toEqual({ sent: true });

    const staleCode = await db
      .prepare("SELECT COUNT(*) AS n FROM cairn_channel_code WHERE nonce_hash = 'stale-nonce'")
      .first<{ n: number }>();
    const staleSession = await db
      .prepare("SELECT COUNT(*) AS n FROM cairn_channel_session WHERE token_hash = 'stale-session'")
      .first<{ n: number }>();
    const staleBudget = await db
      .prepare("SELECT COUNT(*) AS n FROM cairn_channel_budget WHERE bucket = 'stale:budget'")
      .first<{ n: number }>();
    expect(staleCode?.n ?? -1).toBe(0);
    expect(staleSession?.n ?? -1).toBe(0);
    expect(staleBudget?.n ?? -1).toBe(0);
  });
});

describe('challenge (step 2)', () => {
  it('a false challenge writes no row, calls no deliver, charges nothing, and answers challenge-required', async () => {
    const { config, sent } = makeConfig({ challenge: async () => false, lookup: async () => 'sub-1' });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'known@x.test' }));
    expect(result).toEqual({ error: 'challenge-required' });
    expect(sent).toHaveLength(0);
    expect(await codeRowCount()).toBe(0);
    expect(await budgetSum('send')).toBe(0);
  });

  it('a throwing challenge fails closed the same way', async () => {
    const { config, sent } = makeConfig({
      challenge: async () => {
        throw new Error('turnstile down');
      },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'known@x.test' }));
    expect(result).toEqual({ error: 'challenge-required' });
    expect(sent).toHaveLength(0);
    expect(await codeRowCount()).toBe(0);
  });
});

describe('normalize (step 3)', () => {
  it('rejects output over 254 characters', async () => {
    const { config } = makeConfig({ normalize: () => 'x'.repeat(255) });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'anything' }));
    expect(result).toEqual({ error: 'invalid' });
    expect(await codeRowCount()).toBe(0);
  });

  it('rejects a throwing normalize', async () => {
    const { config } = makeConfig({
      normalize: () => {
        throw new Error('bad shape');
      },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'anything' }));
    expect(result).toEqual({ error: 'invalid' });
  });

  it('rejects an empty contact', async () => {
    const { config } = makeConfig();
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent());
    expect(result).toEqual({ error: 'invalid' });
    expect(await codeRowCount()).toBe(0);
  });
});

describe('unavailable (input-independent faults)', () => {
  it('answers unavailable when resolveDb yields no binding', async () => {
    const { config } = makeConfig({ resolveDb: () => undefined });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'a@x.test' }));
    expect(result).toEqual({ error: 'unavailable' });
  });

  it('answers the byte-identical body when the schema does not match', async () => {
    await db.prepare("UPDATE cairn_channel_meta SET value = '0' WHERE key = 'schema_version'").run();
    try {
      const { config: absentConfig } = makeConfig({ resolveDb: () => undefined });
      const absentChannel = createAuthChannel<ChannelTestEnv>(absentConfig);
      const absentResult = await absentChannel.actions.request(makeEvent({ contact: 'a@x.test' }));

      const { config: mismatchConfig } = makeConfig();
      const mismatchChannel = createAuthChannel<ChannelTestEnv>(mismatchConfig);
      const mismatchResult = await mismatchChannel.actions.request(makeEvent({ contact: 'a@x.test' }));

      expect(absentResult).toEqual({ error: 'unavailable' });
      expect(mismatchResult).toEqual({ error: 'unavailable' });
      expect(JSON.stringify(absentResult)).toBe(JSON.stringify(mismatchResult));
    } finally {
      await db.prepare("UPDATE cairn_channel_meta SET value = '1' WHERE key = 'schema_version'").run();
    }
  });
});

describe('response uniformity across known, unknown, and cooldown-held inputs', () => {
  it('known, unknown, and cooldown-held all answer the byte-identical {sent: true}', async () => {
    const { config: knownConfig, sent: knownSent } = makeConfig({ lookup: async () => 'sub-1' });
    const knownChannel = createAuthChannel<ChannelTestEnv>(knownConfig);
    const knownResult = await knownChannel.actions.request(makeEvent({ contact: 'known@x.test', address: '203.0.113.10' }));

    const { config: unknownConfig, sent: unknownSent } = makeConfig();
    const unknownChannel = createAuthChannel<ChannelTestEnv>(unknownConfig);
    const unknownResult = await unknownChannel.actions.request(makeEvent({ contact: 'unknown@x.test', address: '203.0.113.11' }));

    const { config: cooldownConfig, sent: cooldownSent } = makeConfig({ lookup: async () => 'sub-2' });
    const cooldownChannel = createAuthChannel<ChannelTestEnv>(cooldownConfig);
    const jar = makeCookies();
    await cooldownChannel.actions.request(makeEvent({ contact: 'again@x.test', address: '203.0.113.12', cookies: jar }));
    const cooldownResult = await cooldownChannel.actions.request(
      makeEvent({ contact: 'again@x.test', address: '203.0.113.12', cookies: jar }),
    );

    expect(knownResult).toEqual({ sent: true });
    expect(unknownResult).toEqual({ sent: true });
    expect(cooldownResult).toEqual({ sent: true });
    expect(JSON.stringify(knownResult)).toBe(JSON.stringify(unknownResult));
    expect(JSON.stringify(unknownResult)).toBe(JSON.stringify(cooldownResult));

    // No delivery on the unknown or the cooldown-held path; exactly one on the known path.
    expect(knownSent).toHaveLength(1);
    expect(unknownSent).toHaveLength(0);
    expect(cooldownSent).toHaveLength(1); // the cooldown channel's own first call delivered once
  });
});

describe('nonce reuse and the cooldown (step 7)', () => {
  it('two sequential requests in one jar inside the cooldown deliver once and leave the requester bucket charged once', async () => {
    const { config, sent } = makeConfig({ lookup: async () => 'sub-1' });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const jar = makeCookies();
    const first = await channel.actions.request(makeEvent({ contact: 'ed@x.test', cookies: jar }));
    const second = await channel.actions.request(makeEvent({ contact: 'ed@x.test', cookies: jar }));
    expect(first).toEqual({ sent: true });
    expect(second).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    expect(await codeRowCount()).toBe(1);
    expect(await budgetSum('send')).toBe(1);
  });

  it('a cooldown-held resend leaves the identity ceiling budget unchanged', async () => {
    const { config, sent } = makeConfig({ lookup: async () => 'sub-1' });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const jar = makeCookies();
    await channel.actions.request(makeEvent({ contact: 'ceiling-cooldown@x.test', cookies: jar }));
    const beforeResend = await budgetSum('ceiling');

    // The cooldown holds on this second call (same jar, same nonce), so nothing mints and
    // nothing delivers; the identity ceiling charge this call made must be refunded rather than
    // left standing, or a member's own resend taps would silently accrue toward the
    // ceiling_exceeded operator alarm.
    const second = await channel.actions.request(makeEvent({ contact: 'ceiling-cooldown@x.test', cookies: jar }));
    expect(second).toEqual({ sent: true });
    expect(sent).toHaveLength(1);

    const afterResend = await budgetSum('ceiling');
    expect(afterResend).toBe(beforeResend);
  });

  it('of two concurrent remints against one cooldown-elapsed nonce, exactly one wins and delivers a second code', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(1_700_000_000_000);
      const { config, sent } = makeConfig({ lookup: async () => 'sub-1' });
      const channel = createAuthChannel<ChannelTestEnv>(config);
      const jar = makeCookies();
      await channel.actions.request(makeEvent({ contact: 'race@x.test', cookies: jar }));
      expect(sent).toHaveLength(1);

      // Advance past the default 60s cooldown so both concurrent calls see it elapsed and race
      // for the same reused nonce_hash's conditional upsert.
      vi.setSystemTime(1_700_000_000_000 + 61_000);
      const [a, b] = await Promise.all([
        channel.actions.request(makeEvent({ contact: 'race@x.test', cookies: jar })),
        channel.actions.request(makeEvent({ contact: 'race@x.test', cookies: jar })),
      ]);
      expect(a).toEqual({ sent: true });
      expect(b).toEqual({ sent: true });
      // Exactly one of the two concurrent calls won the remint and delivered; the loser held the
      // cooldown and refunded rather than double-sending.
      expect(sent).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('delivery failure (step 8)', () => {
  it('a throwing deliver leaves no row, refunds the charge, and an immediate re-request delivers again', async () => {
    let calls = 0;
    const { config } = makeConfig({
      lookup: async () => 'sub-1',
      deliver: async () => {
        calls += 1;
        throw new Error('provider down');
      },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const jar = makeCookies();

    const first = await channel.actions.request(makeEvent({ contact: 'fail@x.test', cookies: jar }));
    expect(first).toEqual({ sent: true });
    expect(calls).toBe(1);
    expect(await codeRowCount()).toBe(0);
    expect(await budgetSum('send')).toBe(0);

    const second = await channel.actions.request(makeEvent({ contact: 'fail@x.test', cookies: jar }));
    expect(second).toEqual({ sent: true });
    expect(calls).toBe(2);
  });

  it('scrubs the contact out of the send_failed log record', async () => {
    const contact = 'leaky@x.test';
    const { config } = makeConfig({
      lookup: async () => 'sub-1',
      deliver: async () => {
        throw new Error(`failed to reach ${contact}`);
      },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await channel.actions.request(makeEvent({ contact }));
      const record = errorSpy.mock.calls
        .map((c) => c[0] as { event?: string; error?: string })
        .find((r) => r.event === 'auth.channel.send_failed');
      expect(record).toBeDefined();
      expect(record?.error).toBeDefined();
      expect(record?.error).not.toContain(contact);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('backgrounds delivery through waitUntil when a platform is present, with .catch already attached', async () => {
    const scheduled: Promise<unknown>[] = [];
    const { config, sent } = makeConfig({ lookup: async () => 'sub-1' });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(
      makeEvent({ contact: 'bg@x.test', waitUntil: (p) => void scheduled.push(p) }),
    );
    expect(result).toEqual({ sent: true });
    // Two backgrounded promises: the housekeeping sweep that rides every fresh mint, then the
    // delivery itself. Neither runs on the response path.
    expect(scheduled).toHaveLength(2);
    await Promise.all(scheduled);
    expect(sent).toHaveLength(1);
  });
});

describe('nonce cookie attributes', () => {
  it('carries Path=/, HttpOnly, SameSite=Lax, Max-Age matching the code TTL, and Secure with __Host- on https', async () => {
    const { config } = makeConfig({ lookup: async () => 'sub-1' });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const jar = makeCookies();
    await channel.actions.request(makeEvent({ contact: 'cookie@x.test', cookies: jar }));
    const set = jar.sets.find((s) => s.name === PENDING_HTTPS);
    expect(set).toBeDefined();
    expect(set?.name.startsWith('__Host-')).toBe(true);
    expect(set?.opts).toMatchObject({
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
    });
  });

  it('drops Secure and the __Host- prefix on local http', async () => {
    const { config } = makeConfig({ lookup: async () => 'sub-1' });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const jar = makeCookies();
    await channel.actions.request(makeEvent({ url: 'http://localhost:5173/login', contact: 'cookie@x.test', cookies: jar }));
    const set = jar.sets.find((s) => s.name === PENDING_HTTP);
    expect(set).toBeDefined();
    expect(set?.name.startsWith('__Host-')).toBe(false);
    expect(set?.opts.secure).toBe(false);
  });
});

describe('the lockout regression test', () => {
  it('an attacker exceeding the identity send ceiling from many buckets never blocks the victim, who requested first', async () => {
    const contact = 'roster-member@x.test';
    const subject = 'roster-member-subject';
    let challengeCalls = 0;
    const { config, sent } = makeConfig({
      lookup: async (c) => (c === contact ? subject : null),
      challenge: async () => {
        challengeCalls += 1;
        return true;
      },
      limits: { throttle: { identityCeiling: 10 } }, // the clamp floor, so the test exceeds it quickly
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);

    // The victim requests first, in their own cookie jar, and holds the resulting code.
    const victimJar = makeCookies();
    const victimResult = await channel.actions.request(
      makeEvent({ contact, address: '198.51.100.1', cookies: victimJar }),
    );
    expect(victimResult).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    const victimNonceToken = victimJar.get(PENDING_HTTPS);
    expect(victimNonceToken).toBeDefined();
    const victimCode = sent[0].code;

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // A separate attacker, in a separate cookie jar per attempt and a distinct client address
      // per attempt (so no per-requester-bucket cap ever trips), exceeds the identity send
      // ceiling: the only identity-keyed cap this action can reach (the escalation threshold is
      // confirm-side). Twelve attacker sends plus the victim's own puts the identity's count at
      // 13, past the ceiling of 10.
      for (let i = 0; i < 12; i++) {
        const attackerResult = await channel.actions.request(
          makeEvent({ contact, address: `198.51.100.${100 + i}`, cookies: makeCookies() }),
        );
        expect(attackerResult).toEqual({ sent: true });
      }

      // The identity ceiling never denies: every attacker send still delivered, and the operator
      // log fired for the ones past the ceiling.
      expect(sent).toHaveLength(13);
      const ceilingRecords = errorSpy.mock.calls
        .map((c) => c[0] as { event?: string })
        .filter((r) => r.event === 'auth.channel.ceiling_exceeded');
      expect(ceilingRecords.length).toBeGreaterThan(0);

      // The victim completes with no extra interaction beyond the one ordinary request above:
      // their own held nonce and code, run through the real composed confirm action (their jar,
      // their code), never the store layer directly.
      const challengeCallsBeforeConfirm = challengeCalls;
      const confirmResult = await channel.actions.confirm(makeEvent({ code: victimCode, cookies: victimJar }));
      expect(confirmResult).toEqual({ ok: true });

      const escalatedRecords = warnSpy.mock.calls
        .map((c) => c[0] as { event?: string })
        .filter((r) => r.event === 'auth.channel.escalated');
      expect(escalatedRecords).toHaveLength(0);
      // The identity escalation gate is confirm-side only and was never touched by the
      // request-side attack above, so the victim's confirm never had to invoke challenge.
      expect(challengeCalls).toBe(challengeCallsBeforeConfirm);

      const sessionRows = await db
        .prepare('SELECT COUNT(*) AS n FROM cairn_channel_session WHERE subject = ?1')
        .bind(subject)
        .first<{ n: number }>();
      expect(sessionRows?.n ?? -1).toBe(1);
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe('a throwing lookup', () => {
  it('answers identically to an unknown contact, writes a decoy row, and logs one lookup_failed record at warn', async () => {
    const { config, sent } = makeConfig({
      lookup: async () => {
        throw new Error('roster db down');
      },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const result = await channel.actions.request(
        makeEvent({ contact: 'someone@x.test', address: '198.51.100.50' }),
      );
      // The response and store effects match the ordinary unknown-contact path exactly.
      expect(result).toEqual({ sent: true });
      expect(sent).toHaveLength(0);
      expect(await codeRowCount()).toBe(1);
      // Exactly one requested record across all levels, at warn with the distinct outcome, so a
      // roster outage is visible to an operator without double-counting the request.
      const requested = [...warnSpy.mock.calls, ...infoSpy.mock.calls]
        .map((c) => c[0] as { event?: string; outcome?: string })
        .filter((r) => r.event === 'auth.channel.requested');
      expect(requested).toHaveLength(1);
      expect(requested[0].outcome).toBe('lookup_failed');
      const warnRequested = warnSpy.mock.calls
        .map((c) => c[0] as { event?: string })
        .filter((r) => r.event === 'auth.channel.requested');
      expect(warnRequested).toHaveLength(1);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
