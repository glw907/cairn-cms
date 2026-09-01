// cairn-cms: construction-time validation for createAuthChannel (Task 2 of the auth-channel
// factory plan). Every clamp in the spec's Defaults table, the required-challenge rejection, the
// cairn_-prefix rejection, the kind rejection, and a valid construction's full shape.
import { describe, it, expect } from 'vitest';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';

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

  type Limits = NonNullable<AuthChannelConfig<TestEnv>['limits']>;

  interface ClampCase {
    group: keyof Limits;
    field: string;
    valid: number;
    low?: number;
    high?: number;
  }

  const DAY_MS = 24 * 60 * 60 * 1000;

  /** One override object naming exactly one knob, the shape a site tuning one thing writes. */
  function oneLimit(group: keyof Limits, field: string, value: number): Limits {
    return { [group]: { [field]: value } } as Limits;
  }

  // One row per line of the spec's Defaults table, under the group that now holds it. `low`/`high`
  // are present only when that row states the corresponding bound; a row with only one stated bound
  // gets only one rejection test.
  const clampCases: ClampCase[] = [
    { group: 'code', field: 'length', valid: 9, low: 7, high: 11 },
    { group: 'code', field: 'ttlMs', valid: 900_000, high: 900_001 },
    { group: 'code', field: 'attemptCap', valid: 10, high: 11 },
    { group: 'throttle', field: 'cooldownMs', valid: 30_000, low: 29_999 },
    { group: 'throttle', field: 'requesterCap', valid: 50, low: 4, high: 101 },
    { group: 'throttle', field: 'identityCeiling', valid: 10, low: 9 },
    { group: 'throttle', field: 'escalationThreshold', valid: 10, low: 9 },
    { group: 'throttle', field: 'liveRowCap', valid: 20, high: 21 },
    { group: 'session', field: 'ttlMs', valid: 365 * DAY_MS, high: 365 * DAY_MS + 1 },
  ];

  describe.each(clampCases)('config.limits.$group.$field', ({ group, field, valid, low, high }) => {
    it('accepts the boundary value the clamp permits', () => {
      expect(() => createAuthChannel(validConfig({ limits: oneLimit(group, field, valid) }))).not.toThrow();
    });

    if (low !== undefined) {
      it('rejects a value below the floor', () => {
        expect(() => createAuthChannel(validConfig({ limits: oneLimit(group, field, low) }))).toThrow();
      });
    }

    if (high !== undefined) {
      it('rejects a value above the ceiling', () => {
        expect(() => createAuthChannel(validConfig({ limits: oneLimit(group, field, high) }))).toThrow();
      });
    }

    it('names the group and the field in the rejection message', () => {
      const outOfRange = high !== undefined ? high : (low as number);
      expect(() => createAuthChannel(validConfig({ limits: oneLimit(group, field, outOfRange) }))).toThrow(
        new RegExp(`config\\.limits\\.${group}\\.${field}`),
      );
    });

    it('rejects zero and a negative value regardless of stated bounds', () => {
      // The ceiling-only rows would otherwise admit these, and each is a live defect at runtime
      // (a non-positive attemptCap locks every code unguessed; a non-positive code ttlMs expires
      // codes at mint), so construction rejects them universally.
      for (const bad of [0, -1]) {
        expect(() => createAuthChannel(validConfig({ limits: oneLimit(group, field, bad) }))).toThrow(
          /positive|at least/,
        );
      }
    });
  });

  it('takes a single-knob override as one named knob, with no sibling group required', () => {
    // The regrouped bag is only worth having if tuning one thing stays a one-liner. A site that
    // wants a 90-day session names the session's own ttl and nothing else.
    const ninetyDays = 90 * DAY_MS;
    expect(() => createAuthChannel(validConfig({ limits: { session: { ttlMs: ninetyDays } } }))).not.toThrow();
  });
});
