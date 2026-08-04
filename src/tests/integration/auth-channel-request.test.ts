// Task 3 of the auth-channel factory plan: the request action's eight-step flow (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md, Flows), proven against real
// miniflare D1. The lockout regression test is the structural guard the design's three review
// rounds needed: a victim who requests first must complete a login with no extra interaction even
// after an attacker in a separate cookie jar blows past every identity-keyed cap.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig, DeliverContext } from '../../lib/auth-channel/index.js';
import { consumeCode } from '../../lib/auth-channel/store.js';
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

/** An in-memory cookie jar that also records every set() call, for attribute assertions. */
function makeCookies(initial: Record<string, string> = {}): CookieJar & {
  sets: { name: string; value: string; opts: CookieSetOptions }[];
} {
  const jar = new Map(Object.entries(initial));
  const sets: { name: string; value: string; opts: CookieSetOptions }[] = [];
  return {
    sets,
    get: (name) => jar.get(name),
    set: (name, value, opts) => {
      jar.set(name, value);
      sets.push({ name, value, opts });
    },
    delete: (name) => void jar.delete(name),
  };
}

interface EventInput {
  url?: string;
  address?: string;
  contact?: string;
  cookies?: ReturnType<typeof makeCookies>;
  origin?: string | null;
  waitUntil?: (promise: Promise<unknown>) => void;
}

/** Build a request-action event. Origin defaults to the URL's own origin so ordinary tests never
 *  trip the unconditional origin check; pass `origin: null` or a mismatched value to test it. */
function makeEvent(input: EventInput = {}) {
  const url = input.url ?? 'https://member.example.test/login';
  const u = new URL(url);
  const headers: Record<string, string> = {};
  const origin = input.origin === undefined ? u.origin : input.origin;
  if (origin !== null) headers.origin = origin;
  const request = new Request(url, {
    method: 'POST',
    body: new URLSearchParams(input.contact !== undefined ? { contact: input.contact } : {}),
    headers,
  });
  return {
    url: u,
    request,
    cookies: input.cookies ?? makeCookies(),
    getClientAddress: () => input.address ?? '203.0.113.1',
    platform: {
      env: { CHANNEL_DB: db },
      ...(input.waitUntil ? { ctx: { waitUntil: input.waitUntil } } : {}),
    },
  };
}

/** A minimal, valid config: identity function normalize, a challenge that always passes, and a
 *  deliver spy recording every call. Overridable per test. */
function makeConfig(
  overrides: Partial<AuthChannelConfig<TestEnv>> = {},
): { config: AuthChannelConfig<TestEnv>; sent: { contact: string; code: string }[] } {
  const sent: { contact: string; code: string }[] = [];
  const config: AuthChannelConfig<TestEnv> = {
    resolveDb: (e) => e?.CHANNEL_DB,
    deliver: async (contact, code) => {
      sent.push({ contact, code });
    },
    lookup: async () => null,
    normalize: (raw) => raw.trim().toLowerCase(),
    challenge: async () => true,
    cookie: { name: 'member_session' },
    ...overrides,
  };
  return { config, sent };
}

async function codeRowCount(): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM cairn_channel_code').first<{ n: number }>();
  return row?.n ?? 0;
}

async function budgetCount(scope: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(SUM(count), 0) AS n FROM cairn_channel_budget WHERE scope = ?1')
    .bind(scope)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

const PENDING_HTTPS = cookieName('member_session_pending', true);
const PENDING_HTTP = cookieName('member_session_pending', false);

describe('origin and scheme checks', () => {
  it('refuses a mismatched origin', async () => {
    const { config } = makeConfig();
    const channel = createAuthChannel<TestEnv>(config);
    const event = makeEvent({ contact: 'a@x.test', origin: 'https://evil.test' });
    const { status } = await expectHttpError(() => channel.actions.request(event));
    expect(status).toBe(403);
    expect(await codeRowCount()).toBe(0);
  });

  it('refuses plain http outside localhost', async () => {
    const { config } = makeConfig();
    const channel = createAuthChannel<TestEnv>(config);
    const event = makeEvent({ url: 'http://member.example.test/login', contact: 'a@x.test' });
    const { status } = await expectHttpError(() => channel.actions.request(event));
    expect(status).toBe(403);
  });

  it('allows plain http on localhost', async () => {
    const { config, sent } = makeConfig({ lookup: async () => 'sub-1' });
    const channel = createAuthChannel<TestEnv>(config);
    const event = makeEvent({ url: 'http://localhost:5173/login', contact: 'a@x.test' });
    const result = await channel.actions.request(event);
    expect(result).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
  });
});

describe('challenge (step 2)', () => {
  it('a false challenge writes no row, calls no deliver, charges nothing, and answers challenge-required', async () => {
    const { config, sent } = makeConfig({ challenge: async () => false, lookup: async () => 'sub-1' });
    const channel = createAuthChannel<TestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'known@x.test' }));
    expect(result).toEqual({ error: 'challenge-required' });
    expect(sent).toHaveLength(0);
    expect(await codeRowCount()).toBe(0);
    expect(await budgetCount('send')).toBe(0);
  });

  it('a throwing challenge fails closed the same way', async () => {
    const { config, sent } = makeConfig({
      challenge: async () => {
        throw new Error('turnstile down');
      },
    });
    const channel = createAuthChannel<TestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'known@x.test' }));
    expect(result).toEqual({ error: 'challenge-required' });
    expect(sent).toHaveLength(0);
    expect(await codeRowCount()).toBe(0);
  });
});

describe('normalize (step 3)', () => {
  it('rejects output over 254 characters', async () => {
    const { config } = makeConfig({ normalize: () => 'x'.repeat(255) });
    const channel = createAuthChannel<TestEnv>(config);
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
    const channel = createAuthChannel<TestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'anything' }));
    expect(result).toEqual({ error: 'invalid' });
  });

  it('rejects an empty contact', async () => {
    const { config } = makeConfig();
    const channel = createAuthChannel<TestEnv>(config);
    const result = await channel.actions.request(makeEvent());
    expect(result).toEqual({ error: 'invalid' });
    expect(await codeRowCount()).toBe(0);
  });
});

describe('unavailable (input-independent faults)', () => {
  it('answers unavailable when resolveDb yields no binding', async () => {
    const { config } = makeConfig({ resolveDb: () => undefined });
    const channel = createAuthChannel<TestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'a@x.test' }));
    expect(result).toEqual({ error: 'unavailable' });
  });

  it('answers the byte-identical body when the schema does not match', async () => {
    await db.prepare("UPDATE cairn_channel_meta SET value = '0' WHERE key = 'schema_version'").run();
    try {
      const { config: absentConfig } = makeConfig({ resolveDb: () => undefined });
      const absentChannel = createAuthChannel<TestEnv>(absentConfig);
      const absentResult = await absentChannel.actions.request(makeEvent({ contact: 'a@x.test' }));

      const { config: mismatchConfig } = makeConfig();
      const mismatchChannel = createAuthChannel<TestEnv>(mismatchConfig);
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
    const knownChannel = createAuthChannel<TestEnv>(knownConfig);
    const knownResult = await knownChannel.actions.request(makeEvent({ contact: 'known@x.test', address: '203.0.113.10' }));

    const { config: unknownConfig, sent: unknownSent } = makeConfig();
    const unknownChannel = createAuthChannel<TestEnv>(unknownConfig);
    const unknownResult = await unknownChannel.actions.request(makeEvent({ contact: 'unknown@x.test', address: '203.0.113.11' }));

    const { config: cooldownConfig, sent: cooldownSent } = makeConfig({ lookup: async () => 'sub-2' });
    const cooldownChannel = createAuthChannel<TestEnv>(cooldownConfig);
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
    const channel = createAuthChannel<TestEnv>(config);
    const jar = makeCookies();
    const first = await channel.actions.request(makeEvent({ contact: 'ed@x.test', cookies: jar }));
    const second = await channel.actions.request(makeEvent({ contact: 'ed@x.test', cookies: jar }));
    expect(first).toEqual({ sent: true });
    expect(second).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    expect(await codeRowCount()).toBe(1);
    expect(await budgetCount('send')).toBe(1);
  });

  it('concurrent requests against one reused, cooldown-elapsed nonce deliver exactly once', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(1_700_000_000_000);
      const { config, sent } = makeConfig({ lookup: async () => 'sub-1' });
      const channel = createAuthChannel<TestEnv>(config);
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
    const channel = createAuthChannel<TestEnv>(config);
    const jar = makeCookies();

    const first = await channel.actions.request(makeEvent({ contact: 'fail@x.test', cookies: jar }));
    expect(first).toEqual({ sent: true });
    expect(calls).toBe(1);
    expect(await codeRowCount()).toBe(0);
    expect(await budgetCount('send')).toBe(0);

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
    const channel = createAuthChannel<TestEnv>(config);
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
    const channel = createAuthChannel<TestEnv>(config);
    const result = await channel.actions.request(
      makeEvent({ contact: 'bg@x.test', waitUntil: (p) => void scheduled.push(p) }),
    );
    expect(result).toEqual({ sent: true });
    expect(scheduled).toHaveLength(1);
    await scheduled[0];
    expect(sent).toHaveLength(1);
  });
});

describe('nonce cookie attributes', () => {
  it('carries Path=/, HttpOnly, SameSite=Lax, Max-Age matching the code TTL, and Secure with __Host- on https', async () => {
    const { config } = makeConfig({ lookup: async () => 'sub-1' });
    const channel = createAuthChannel<TestEnv>(config);
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
    const channel = createAuthChannel<TestEnv>(config);
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
    const { config, sent } = makeConfig({
      lookup: async (c) => (c === contact ? subject : null),
      ttl: { identityCeiling: 10 }, // the clamp floor, so the test exceeds it quickly
    });
    const channel = createAuthChannel<TestEnv>(config);

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
    const victimNonceHash = await hashToken(victimNonceToken as string);
    const victimCodeHash = await hashToken(victimCode);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // A separate attacker, in a separate cookie jar per attempt and a distinct client address
      // per attempt (so no per-requester-bucket cap ever trips), exceeds the identity send
      // ceiling: the only identity-keyed cap this action can reach (the escalation threshold is
      // confirm-side, Task 4). Twelve attacker sends plus the victim's own puts the identity's
      // count at 13, past the ceiling of 10.
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
    } finally {
      vi.restoreAllMocks();
    }

    // The victim completes with no interaction beyond the one ordinary request above: their held
    // nonce and code still consume successfully (Task 4's confirm action does not exist yet, so
    // this is proven at the store layer, exactly as the code the confirm action will call).
    const consumed = await consumeCode(db.withSession('first-primary'), victimNonceHash, victimCodeHash, Date.now());
    expect(consumed).toEqual({ subject });
  });
});

describe('a throwing lookup', () => {
  it('answers identically to an unknown contact, writes a decoy row, and logs one lookup_failed record at warn', async () => {
    const { config, sent } = makeConfig({
      lookup: async () => {
        throw new Error('roster db down');
      },
    });
    const channel = createAuthChannel<TestEnv>(config);
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
