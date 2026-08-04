// Task 4 of the auth-channel factory plan: confirm's eight-step flow (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md, Flows), proven against real
// miniflare D1. The confirm-side lockout regression test is the structural guard the design's
// three review rounds needed for this half of the flow: an attacker who shares a victim's
// identity (by knowing their contact) can drive the identity failure gate past its threshold, and
// the victim must still complete with nothing worse than one challenge round trip.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { D1Database, D1DatabaseSession } from '@cloudflare/workers-types';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { mintCode, provisionSalt, charge } from '../../lib/auth-channel/store.js';
import { deriveIdentity, generateCode } from '../../lib/auth-channel/identity.js';
import { hashToken, cookieName } from '../../lib/auth/crypto.js';
import { applyChannelSchema, resetChannelDb } from './_channel-harness.js';
import { expectHttpError } from '../_redirect-assertions.js';
import type { CookieJar, CookieSetOptions } from '../../lib/sveltekit/types.js';

type TestEnv = { CHANNEL_DB: D1Database };

const db = env.CHANNEL_DB;

beforeAll(async () => {
  await applyChannelSchema(db);
});

beforeEach(async () => {
  await resetChannelDb(db);
});

function session(): D1DatabaseSession {
  return db.withSession('first-primary');
}

/** An in-memory cookie jar that also records every set()/delete() call, for attribute assertions. */
function makeCookies(initial: Record<string, string> = {}): CookieJar & {
  sets: { name: string; value: string; opts: CookieSetOptions }[];
  deletes: string[];
} {
  const jar = new Map(Object.entries(initial));
  const sets: { name: string; value: string; opts: CookieSetOptions }[] = [];
  const deletes: string[] = [];
  return {
    sets,
    deletes,
    get: (name) => jar.get(name),
    set: (name, value, opts) => {
      jar.set(name, value);
      sets.push({ name, value, opts });
    },
    delete: (name) => {
      jar.delete(name);
      deletes.push(name);
    },
  };
}

interface EventInput {
  url?: string;
  address?: string;
  code?: string;
  challengeToken?: string;
  cookies?: ReturnType<typeof makeCookies>;
  origin?: string | null;
}

/** Build a confirm-action event. Origin defaults to the URL's own origin so ordinary tests never
 *  trip the unconditional origin check; pass `origin: null` or a mismatched value to test it. */
function makeEvent(input: EventInput = {}) {
  const url = input.url ?? 'https://member.example.test/login';
  const u = new URL(url);
  const headers: Record<string, string> = {};
  const origin = input.origin === undefined ? u.origin : input.origin;
  if (origin !== null) headers.origin = origin;
  const body = new URLSearchParams();
  if (input.code !== undefined) body.set('code', input.code);
  if (input.challengeToken !== undefined) body.set('challenge-token', input.challengeToken);
  const request = new Request(url, { method: 'POST', body, headers });
  return {
    url: u,
    request,
    cookies: input.cookies ?? makeCookies(),
    getClientAddress: () => input.address ?? '203.0.113.1',
    platform: { env: { CHANNEL_DB: db } },
  };
}

/** A minimal, valid config. `challenge` reads a real form field rather than trivially passing,
 *  so the escalation retry path is exercised the way a site's own Turnstile check would behave:
 *  absent on the first submission, present once the site renders its widget. */
function makeConfig(overrides: Partial<AuthChannelConfig<TestEnv>> = {}): AuthChannelConfig<TestEnv> {
  return {
    resolveDb: (e) => e?.CHANNEL_DB,
    deliver: async () => {},
    lookup: async () => null,
    normalize: (raw) => raw.trim().toLowerCase(),
    challenge: async (_event, form) => form.get('challenge-token') === 'passed',
    cookie: { name: 'member_session' },
    ...overrides,
  };
}

const PENDING_HTTPS = cookieName('member_session_pending', true);

/** Mint a code row directly against the store, bypassing the request action entirely, so a
 *  confirm test controls the nonce, code, and subject precisely. */
async function seedCode(opts: {
  contact: string;
  subject: string | null;
  now?: number;
  ttlMs?: number;
  requesterBucket?: string;
}): Promise<{ nonceToken: string; code: string; identity: string; nonceHash: string }> {
  const nonceToken = crypto.randomUUID();
  const nonceHash = await hashToken(nonceToken);
  const salt = await provisionSalt(session());
  const identity = await deriveIdentity(salt, opts.subject, opts.contact);
  const code = generateCode(8);
  const codeHash = await hashToken(code);
  const now = opts.now ?? Date.now();
  await mintCode(
    session(),
    nonceHash,
    identity,
    codeHash,
    opts.subject,
    now,
    opts.ttlMs ?? 10 * 60_000,
    60_000,
    opts.requesterBucket ?? `bucket-${nonceToken}`,
  );
  return { nonceToken, code, identity, nonceHash };
}

/** A code guaranteed to differ from the one supplied. */
function wrongCodeFor(code: string): string {
  return code === '00000000' ? '11111111' : '00000000';
}

async function codeRowCount(): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM cairn_channel_code').first<{ n: number }>();
  return row?.n ?? 0;
}

async function sessionCount(): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM cairn_channel_session').first<{ n: number }>();
  return row?.n ?? 0;
}

async function attemptsFor(nonceHash: string): Promise<number | null> {
  const row = await db
    .prepare('SELECT attempts FROM cairn_channel_code WHERE nonce_hash = ?1')
    .bind(nonceHash)
    .first<{ attempts: number }>();
  return row?.attempts ?? null;
}

describe('origin and scheme checks', () => {
  it('refuses a mismatched origin', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig());
    const { status } = await expectHttpError(() =>
      channel.actions.confirm(makeEvent({ code: '12345678', origin: 'https://evil.test' })),
    );
    expect(status).toBe(403);
  });

  it('refuses plain http outside localhost', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig());
    const { status } = await expectHttpError(() =>
      channel.actions.confirm(makeEvent({ url: 'http://member.example.test/login', code: '12345678' })),
    );
    expect(status).toBe(403);
  });
});

describe('unavailable (input-independent fault)', () => {
  it('answers unavailable when resolveDb yields no binding', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ resolveDb: () => undefined }));
    const result = await channel.actions.confirm(makeEvent({ code: '12345678', cookies: makeCookies({ [PENDING_HTTPS]: 'x' }) }));
    expect(result).toEqual({ error: 'unavailable' });
  });
});

describe('no attempt spent, no row consumed', () => {
  it('a malformed code costs no attempt', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const { nonceToken, nonceHash } = await seedCode({ contact: 'a@x.test', subject: 'sub-1' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const result = await channel.actions.confirm(makeEvent({ code: '123 45', cookies: jar }));
    expect(result).toEqual({ error: 'bad-code' });
    expect(await attemptsFor(nonceHash)).toBe(0);
  });

  it('an absent nonce costs no attempt and reaches no store', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const result = await channel.actions.confirm(makeEvent({ code: '12345678' }));
    expect(result).toEqual({ error: 'no-pending-request' });
    expect(await codeRowCount()).toBe(0);
  });

  it('a mismatched nonce costs no attempt on the real row', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const { nonceHash } = await seedCode({ contact: 'a@x.test', subject: 'sub-1' });
    const jar = makeCookies({ [PENDING_HTTPS]: crypto.randomUUID() });
    const result = await channel.actions.confirm(makeEvent({ code: '12345678', cookies: jar }));
    expect(result).toEqual({ error: 'expired' });
    expect(await attemptsFor(nonceHash)).toBe(0);
  });

  it('a challenge-required response costs no attempt and consumes no row', async () => {
    const contact = 'gated@x.test';
    const subject = 'gated-subject';
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => subject, ttl: { escalationThreshold: 10 } }));
    const salt = await provisionSalt(session());
    const identity = await deriveIdentity(salt, subject, contact);
    // Exhaust the identity's escalation gate directly, without needing ten separate wrong
    // confirms; the lockout regression test below proves the gate is charged by the real path.
    for (let i = 0; i < 10; i++) {
      await charge(session(), identity, 'escalation', Date.now(), 10);
    }
    const { nonceToken, nonceHash } = await seedCode({ contact, subject });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const result = await channel.actions.confirm(makeEvent({ code: '12345678', cookies: jar }));
    expect(result).toEqual({ error: 'challenge-required' });
    expect(await attemptsFor(nonceHash)).toBe(0);
    expect(await codeRowCount()).toBe(1);
  });
});

describe('expiry (step 4)', () => {
  it('returns expired rather than incrementing toward locked', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const past = Date.now() - 20 * 60_000;
    const { nonceToken, code, nonceHash } = await seedCode({ contact: 'a@x.test', subject: 'sub-1', now: past });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const result = await channel.actions.confirm(makeEvent({ code, cookies: jar }));
    expect(result).toEqual({ error: 'expired' });
    expect(await attemptsFor(nonceHash)).toBe(0);
  });
});

describe('the attempt cap (steps 6-7)', () => {
  it('admits exactly cap wrong guesses before locking', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const { nonceToken, code } = await seedCode({ contact: 'a@x.test', subject: 'sub-1' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const wrong = wrongCodeFor(code);

    for (let i = 0; i < 5; i++) {
      const result = await channel.actions.confirm(makeEvent({ code: wrong, cookies: jar }));
      expect(result).toEqual({ error: 'bad-code' });
    }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const locked = await channel.actions.confirm(makeEvent({ code: wrong, cookies: jar }));
      expect(locked).toEqual({ error: 'locked' });
      const lockedRecords = warnSpy.mock.calls.map((c) => c[0] as { event?: string }).filter((r) => r.event === 'auth.channel.locked');
      expect(lockedRecords.length).toBeGreaterThan(0);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('a re-mint after the cooldown resets attempts, giving a locked member an exit', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const initialNow = Date.now();
    const { nonceToken, code, identity, nonceHash } = await seedCode({ contact: 'a@x.test', subject: 'sub-1', now: initialNow });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const wrong = wrongCodeFor(code);
    for (let i = 0; i < 6; i++) {
      await channel.actions.confirm(makeEvent({ code: wrong, cookies: jar }));
    }
    expect((await attemptsFor(nonceHash)) as number).toBeGreaterThan(5);

    // The site's own resend reuses the same nonce; mintCode's cooldown upsert resets attempts to
    // zero on a fresh code once the cooldown has elapsed.
    const freshCode = generateCode(8);
    const freshCodeHash = await hashToken(freshCode);
    const minted = await mintCode(session(), nonceHash, identity, freshCodeHash, 'sub-1', initialNow + 61_000, 10 * 60_000, 60_000, 'exit-bucket');
    expect(minted).toBe(true);
    expect(await attemptsFor(nonceHash)).toBe(0);

    const result = await channel.actions.confirm(makeEvent({ code: freshCode, cookies: jar }));
    expect(result).toEqual({ ok: true });
  });
});

describe('bad-code, locked, and expired are deep-equal between a decoy identity and a real one', () => {
  it('bad-code, with identical attempt deltas', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => null }));
    const decoy = await seedCode({ contact: 'decoy@x.test', subject: null });
    const real = await seedCode({ contact: 'real@x.test', subject: 'real-subject' });
    const decoyJar = makeCookies({ [PENDING_HTTPS]: decoy.nonceToken });
    const realJar = makeCookies({ [PENDING_HTTPS]: real.nonceToken });

    const decoyResult = await channel.actions.confirm(makeEvent({ code: wrongCodeFor(decoy.code), cookies: decoyJar }));
    const realResult = await channel.actions.confirm(makeEvent({ code: wrongCodeFor(real.code), cookies: realJar }));

    expect(decoyResult).toEqual({ error: 'bad-code' });
    expect(realResult).toEqual({ error: 'bad-code' });
    expect(JSON.stringify(decoyResult)).toBe(JSON.stringify(realResult));
    expect(await attemptsFor(decoy.nonceHash)).toBe(1);
    expect(await attemptsFor(real.nonceHash)).toBe(1);
  });

  it('locked, with identical attempt deltas', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => null }));
    const decoy = await seedCode({ contact: 'decoy2@x.test', subject: null });
    const real = await seedCode({ contact: 'real2@x.test', subject: 'real-subject-2' });
    const decoyJar = makeCookies({ [PENDING_HTTPS]: decoy.nonceToken });
    const realJar = makeCookies({ [PENDING_HTTPS]: real.nonceToken });
    const decoyWrong = wrongCodeFor(decoy.code);
    const realWrong = wrongCodeFor(real.code);

    for (let i = 0; i < 5; i++) {
      await channel.actions.confirm(makeEvent({ code: decoyWrong, cookies: decoyJar }));
      await channel.actions.confirm(makeEvent({ code: realWrong, cookies: realJar }));
    }
    const decoyResult = await channel.actions.confirm(makeEvent({ code: decoyWrong, cookies: decoyJar }));
    const realResult = await channel.actions.confirm(makeEvent({ code: realWrong, cookies: realJar }));

    expect(decoyResult).toEqual({ error: 'locked' });
    expect(realResult).toEqual({ error: 'locked' });
    expect(JSON.stringify(decoyResult)).toBe(JSON.stringify(realResult));
  });

  it('expired, identically', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => null }));
    const past = Date.now() - 20 * 60_000;
    const decoy = await seedCode({ contact: 'decoy3@x.test', subject: null, now: past });
    const real = await seedCode({ contact: 'real3@x.test', subject: 'real-subject-3', now: past });
    const decoyJar = makeCookies({ [PENDING_HTTPS]: decoy.nonceToken });
    const realJar = makeCookies({ [PENDING_HTTPS]: real.nonceToken });

    const decoyResult = await channel.actions.confirm(makeEvent({ code: decoy.code, cookies: decoyJar }));
    const realResult = await channel.actions.confirm(makeEvent({ code: real.code, cookies: realJar }));

    expect(decoyResult).toEqual({ error: 'expired' });
    expect(realResult).toEqual({ error: 'expired' });
    expect(JSON.stringify(decoyResult)).toBe(JSON.stringify(realResult));
  });
});

describe('a decoy row and an empty-subject row never mint', () => {
  it('a correctly guessed decoy code answers bad-code and mints nothing', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => null }));
    const { nonceToken, code, nonceHash } = await seedCode({ contact: 'decoy4@x.test', subject: null });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const result = await channel.actions.confirm(makeEvent({ code, cookies: jar }));
    expect(result).toEqual({ error: 'bad-code' });
    expect(await sessionCount()).toBe(0);
    // The row is consumed even though nothing minted: it no longer answers by nonce hash.
    expect(await attemptsFor(nonceHash)).toBeNull();
  });

  it('a correctly guessed empty-subject row answers bad-code, logs the roster fault, and mints nothing', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => '' }));
    const { nonceToken, code, nonceHash } = await seedCode({ contact: 'fault@x.test', subject: '' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await channel.actions.confirm(makeEvent({ code, cookies: jar }));
      expect(result).toEqual({ error: 'bad-code' });
      expect(await sessionCount()).toBe(0);
      expect(await attemptsFor(nonceHash)).toBeNull();
      const faultRecords = errorSpy.mock.calls
        .map((c) => c[0] as { event?: string; outcome?: string })
        .filter((r) => r.event === 'auth.channel.confirmed' && r.outcome === 'empty_subject_fault');
      expect(faultRecords.length).toBeGreaterThan(0);
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe('concurrency and replay (step 8)', () => {
  it('two concurrent confirms with one valid code mint exactly one session', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'race-subject' }));
    const { nonceToken, code } = await seedCode({ contact: 'race@x.test', subject: 'race-subject' });
    const jarA = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const jarB = makeCookies({ [PENDING_HTTPS]: nonceToken });

    const [a, b] = await Promise.all([
      channel.actions.confirm(makeEvent({ code, cookies: jarA })),
      channel.actions.confirm(makeEvent({ code, cookies: jarB })),
    ]);

    const results = [a, b];
    const oks = results.filter((r) => 'ok' in r);
    expect(oks).toHaveLength(1);
    expect(await sessionCount()).toBe(1);
  });

  it('replay of a consumed code fails', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'replay-subject' }));
    const { nonceToken, code } = await seedCode({ contact: 'replay@x.test', subject: 'replay-subject' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const first = await channel.actions.confirm(makeEvent({ code, cookies: jar }));
    expect(first).toEqual({ ok: true });
    expect(await sessionCount()).toBe(1);

    // A replay presents the same stale nonce even though the server told the browser to clear
    // it: an attacker who captured the cookie in transit can still resubmit it.
    const replayJar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const replay = await channel.actions.confirm(makeEvent({ code, cookies: replayJar }));
    expect(replay).not.toEqual({ ok: true });
    expect(await sessionCount()).toBe(1);
  });
});

describe('the confirm-side lockout regression test', () => {
  it('an attacker exceeding the identity failure gate never blocks the victim, who requested first', async () => {
    const contact = 'shared-member@x.test';
    const subject = 'shared-member-subject';
    const channel = createAuthChannel<TestEnv>(
      makeConfig({ lookup: async () => subject, ttl: { escalationThreshold: 10 } }), // the clamp floor, so the test exceeds it quickly
    );

    // The victim requests first, in their own cookie jar, and holds a valid code.
    const victim = await seedCode({ contact, subject });
    const victimJar = makeCookies({ [PENDING_HTTPS]: victim.nonceToken });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // An attacker who knows the victim's contact (the design's named residual risk) mints ten
      // separate rows sharing the victim's identity and wrongly guesses each once, from a
      // separate jar and address every time so no per-row or per-requester-bucket cap ever
      // fires; only the shared identity's escalation gate does.
      for (let i = 0; i < 10; i++) {
        const attacker = await seedCode({ contact, subject, requesterBucket: `attacker-${i}` });
        const attackerJar = makeCookies({ [PENDING_HTTPS]: attacker.nonceToken });
        const result = await channel.actions.confirm(
          makeEvent({ code: wrongCodeFor(attacker.code), cookies: attackerJar, address: `198.51.100.${100 + i}` }),
        );
        expect(result).toEqual({ error: 'bad-code' });
      }

      // The gate is now exhausted for this shared identity. The victim's own confirm, using
      // their own held nonce and correct code, meets challenge-required at most once (their
      // site's confirm form carries no token on the first submission) and never a hard wall.
      const first = await channel.actions.confirm(makeEvent({ code: victim.code, cookies: victimJar }));
      let final = first;
      if ('error' in first && first.error === 'challenge-required') {
        const escalatedRecords = warnSpy.mock.calls
          .map((c) => c[0] as { event?: string })
          .filter((r) => r.event === 'auth.channel.escalated');
        expect(escalatedRecords.length).toBeGreaterThan(0);
        final = await channel.actions.confirm(
          makeEvent({ code: victim.code, cookies: victimJar, challengeToken: 'passed' }),
        );
      }

      expect(first).not.toEqual({ error: 'locked' });
      expect(final).toEqual({ ok: true });
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe('nonce cookie cleared and no contact in any log record', () => {
  it('clears the pending nonce cookie on success', async () => {
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const { nonceToken, code } = await seedCode({ contact: 'clear@x.test', subject: 'sub-1' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const result = await channel.actions.confirm(makeEvent({ code, cookies: jar }));
    expect(result).toEqual({ ok: true });
    expect(jar.deletes).toContain(PENDING_HTTPS);
  });

  it('no confirm log record carries a contact', async () => {
    const contact = 'secret-contact@x.test';
    const channel = createAuthChannel<TestEnv>(makeConfig({ lookup: async () => 'sub-1' }));
    const { nonceToken, code } = await seedCode({ contact, subject: 'sub-1' });
    const jar = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await channel.actions.confirm(makeEvent({ code, cookies: jar }));
      const records = infoSpy.mock.calls.map((c) => JSON.stringify(c[0]));
      for (const record of records) {
        expect(record).not.toContain(contact);
      }
    } finally {
      vi.restoreAllMocks();
    }
  });
});
