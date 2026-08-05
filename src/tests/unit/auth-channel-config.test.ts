// cairn-cms: construction-time validation for createAuthChannel (Task 2 of the auth-channel
// factory plan). Every clamp in the spec's Defaults table, the required-challenge rejection, the
// cairn_-prefix rejection, the kind rejection, a valid construction's full shape, and the
// devDelivery wrapper-bypass case: a site wrapping devDelivery in its own deliver function must
// still refuse at call time without the dev flag.
import { describe, it, expect } from 'vitest';
import { createAuthChannel, devDelivery } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig, DeliverContext } from '../../lib/auth-channel/index.js';

type TestEnv = { CAIRN_DEV_BACKEND?: string };

function validConfig(overrides: Partial<AuthChannelConfig<TestEnv>> = {}): AuthChannelConfig<TestEnv> {
  return {
    resolveDb: () => undefined,
    deliver: async () => {},
    lookup: async () => null,
    normalize: (raw) => raw,
    challenge: async () => true,
    cookie: { name: 'member_session' },
    ...overrides,
  };
}

describe('createAuthChannel construction', () => {
  it('returns the full shape on a valid, all-defaults construction', () => {
    const channel = createAuthChannel<TestEnv>(validConfig());
    expect(typeof channel.actions.request).toBe('function');
    expect(typeof channel.actions.confirm).toBe('function');
    expect(typeof channel.actions.logout).toBe('function');
    expect(typeof channel.resolveSubject).toBe('function');
    expect(typeof channel.revokeSessions).toBe('function');
  });

  it('rejects a missing challenge (required config)', () => {
    const cfg = validConfig() as unknown as Record<string, unknown>;
    delete cfg.challenge;
    expect(() => createAuthChannel(cfg as unknown as AuthChannelConfig<TestEnv>)).toThrow(/challenge/);
  });

  it('rejects a cairn_-prefixed cookie base', () => {
    expect(() => createAuthChannel(validConfig({ cookie: { name: 'cairn_member' } }))).toThrow(/cairn_/);
  });

  it('accepts a cookie base that does not carry the reserved prefix', () => {
    expect(() => createAuthChannel(validConfig({ cookie: { name: 'member_session' } }))).not.toThrow();
  });

  it('rejects a kind other than "code"', () => {
    const cfg = validConfig({ kind: 'passkey' as unknown as 'code' });
    expect(() => createAuthChannel(cfg)).toThrow(/kind/i);
  });

  it('accepts an explicit kind of "code"', () => {
    expect(() => createAuthChannel(validConfig({ kind: 'code' }))).not.toThrow();
  });

  interface ClampCase {
    field: keyof NonNullable<AuthChannelConfig<TestEnv>['ttl']>;
    valid: number;
    low?: number;
    high?: number;
  }

  const DAY_MS = 24 * 60 * 60 * 1000;

  // One row per line of the spec's Defaults table. `low`/`high` are present only when that row
  // states the corresponding bound; a row with only one stated bound gets only one rejection test.
  const clampCases: ClampCase[] = [
    { field: 'codeLength', valid: 9, low: 7, high: 11 },
    { field: 'codeTtlMs', valid: 900_000, high: 900_001 },
    { field: 'attemptCap', valid: 10, high: 11 },
    { field: 'cooldownMs', valid: 30_000, low: 29_999 },
    { field: 'requesterCap', valid: 50, low: 4, high: 101 },
    { field: 'identityCeiling', valid: 10, low: 9 },
    { field: 'escalationThreshold', valid: 10, low: 9 },
    { field: 'liveRowCap', valid: 20, high: 21 },
    { field: 'sessionTtlMs', valid: 365 * DAY_MS, high: 365 * DAY_MS + 1 },
  ];

  describe.each(clampCases)('config.ttl.$field', ({ field, valid, low, high }) => {
    it('accepts the boundary value the clamp permits', () => {
      const ttl = { [field]: valid } as AuthChannelConfig<TestEnv>['ttl'];
      expect(() => createAuthChannel(validConfig({ ttl }))).not.toThrow();
    });

    if (low !== undefined) {
      it('rejects a value below the floor', () => {
        const ttl = { [field]: low } as AuthChannelConfig<TestEnv>['ttl'];
        expect(() => createAuthChannel(validConfig({ ttl }))).toThrow();
      });
    }

    if (high !== undefined) {
      it('rejects a value above the ceiling', () => {
        const ttl = { [field]: high } as AuthChannelConfig<TestEnv>['ttl'];
        expect(() => createAuthChannel(validConfig({ ttl }))).toThrow();
      });
    }

    it('rejects zero and a negative value regardless of stated bounds', () => {
      // The ceiling-only rows would otherwise admit these, and each is a live defect at runtime
      // (a non-positive attemptCap locks every code unguessed; a non-positive codeTtlMs expires
      // codes at mint), so construction rejects them universally.
      for (const bad of [0, -1]) {
        const ttl = { [field]: bad } as AuthChannelConfig<TestEnv>['ttl'];
        expect(() => createAuthChannel(validConfig({ ttl }))).toThrow(/positive|at least/);
      }
    });
  });
});

describe('devDelivery, direct and wrapped', () => {
  it('refuses without the dev flag', async () => {
    await expect(
      devDelivery('member@example.com', '12345678', { env: {}, waitUntil: () => {} } as DeliverContext<TestEnv>),
    ).rejects.toThrow(/CAIRN_DEV_BACKEND/);
  });

  it('delivers once the dev flag is set', async () => {
    await expect(
      devDelivery('member@example.com', '12345678', {
        env: { CAIRN_DEV_BACKEND: '1' },
        waitUntil: () => {},
      }),
    ).resolves.toBeUndefined();
  });

  it('constructs cleanly when a site wraps devDelivery as its deliver callback', () => {
    const wrapped = (contact: string, code: string, ctx: DeliverContext<TestEnv>) =>
      devDelivery(contact, code, ctx);
    expect(() => createAuthChannel(validConfig({ deliver: wrapped }))).not.toThrow();
  });

  it('the wrapper still refuses at call time without the dev flag (the bypass case)', async () => {
    const wrapped = (contact: string, code: string, ctx: DeliverContext<TestEnv>) =>
      devDelivery(contact, code, ctx);
    await expect(wrapped('member@example.com', '12345678', { env: {}, waitUntil: () => {} })).rejects.toThrow(
      /CAIRN_DEV_BACKEND/,
    );
  });
});
