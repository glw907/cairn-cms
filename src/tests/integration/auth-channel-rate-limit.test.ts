// Task 5 of the auth-channel factory plan: the optional rate limit on request and confirm (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md, Surface's rateLimit? row;
// plan docs/superpowers/plans/2026-08-03-auth-channel-factory.md, Task 5). THE RULE this suite
// exists to prove: no control keyed on the victim's identity may deny, delay, or destroy
// anything, so the default key must be the composed requester bucket (the address half paired
// with the derived identity), never the identity alone -- the key-composition test below is the
// structural guard against the default key silently collapsing to the identity alone. This
// suite uses a structural stub for the binding; the real Cloudflare limiter's period and
// per-colo semantics are not proven here (Task 7's reference page notes that).
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { RateLimitLike } from '../../lib/auth-channel/index.js';
import { log } from '../../lib/log/index.js';
import {
  applyChannelSchema,
  budgetSum,
  codeRowCount,
  makeChannelConfig as makeConfig,
  makeCookies,
  makeEvent,
  resetChannelDb,
  seedCode,
  PENDING_HTTPS,
} from './_channel-harness.js';
import type { ChannelTestEnv } from './_channel-harness.js';
import { expectRedirect } from '../_redirect-assertions.js';

beforeAll(async () => {
  await applyChannelSchema();
});

beforeEach(async () => {
  await resetChannelDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rate limit: absent binding degrades to open', () => {
  it('runs request normally and logs rate_limit_absent with no PII', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const { config, sent } = makeConfig({
      lookup: async () => 'sub-1',
      rateLimit: { resolve: () => undefined },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'known@x.test' }));
    expect(result).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    const call = warnSpy.mock.calls.find(([event]) => event === 'auth.channel.rate_limit_absent');
    expect(call).toBeDefined();
    const fields = call?.[1] as Record<string, unknown>;
    expect(fields.correlationId).toEqual(expect.any(String));
    expect(JSON.stringify(fields)).not.toContain('known@x.test');
  });
});

describe('rate limit: throwing key()/limit() degrades to open', () => {
  it('a throwing key() logs rate_limit_failed, never rate_limit_absent', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const limiter: RateLimitLike = { limit: async () => ({ success: true }) };
    const { config, sent } = makeConfig({
      lookup: async () => 'sub-1',
      rateLimit: {
        resolve: () => limiter,
        key: () => {
          throw new Error('key derivation failed');
        },
      },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'known@x.test' }));
    expect(result).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'auth.channel.rate_limit_failed',
      expect.objectContaining({ error: 'key derivation failed', correlationId: expect.any(String) }),
    );
    expect(warnSpy).not.toHaveBeenCalledWith('auth.channel.rate_limit_absent', expect.anything());
  });

  it('a throwing limit() logs rate_limit_failed, never rate_limit_absent', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const limiter: RateLimitLike = {
      limit: async () => Promise.reject(new Error('binding unreachable')),
    };
    const { config, sent } = makeConfig({
      lookup: async () => 'sub-1',
      rateLimit: { resolve: () => limiter },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'known@x.test' }));
    expect(result).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(
      'auth.channel.rate_limit_failed',
      expect.objectContaining({ error: 'binding unreachable', correlationId: expect.any(String) }),
    );
    expect(warnSpy).not.toHaveBeenCalledWith('auth.channel.rate_limit_absent', expect.anything());
  });

  it('a redirect() thrown from key() rethrows rather than degrading to open', async () => {
    const limiter: RateLimitLike = { limit: async () => ({ success: true }) };
    const { config, sent } = makeConfig({
      lookup: async () => 'sub-1',
      rateLimit: {
        resolve: () => limiter,
        key: () => {
          throw redirect(303, '/somewhere');
        },
      },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const { status, location } = await expectRedirect(() =>
      channel.actions.request(makeEvent({ contact: 'known@x.test' })),
    );
    expect(status).toBe(303);
    expect(location).toBe('/somewhere');
    expect(sent).toHaveLength(0);
  });
});

describe('rate limit: blocked', () => {
  it('blocks request, answers throttled, logs rate_limited, and charges/mints nothing', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const limiter: RateLimitLike = { limit: async () => ({ success: false }) };
    const { config, sent } = makeConfig({
      lookup: async () => 'sub-1',
      rateLimit: { resolve: () => limiter },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const result = await channel.actions.request(makeEvent({ contact: 'known@x.test' }));
    expect(result).toEqual({ error: 'throttled' });
    expect(sent).toHaveLength(0);
    expect(await codeRowCount()).toBe(0);
    expect(await budgetSum('send')).toBe(0);
    const call = warnSpy.mock.calls.find(([event]) => event === 'auth.channel.rate_limited');
    expect(call).toBeDefined();
    const fields = call?.[1] as Record<string, unknown>;
    expect(fields.correlationId).toEqual(expect.any(String));
    expect(JSON.stringify(fields)).not.toContain('known@x.test');
  });

  it('blocks confirm, answers throttled, logs rate_limited, and consumes/charges nothing', async () => {
    const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});
    const { nonceToken } = await seedCode({ contact: 'known@x.test', subject: 'sub-1' });
    const limiter: RateLimitLike = { limit: async () => ({ success: false }) };
    const config = makeConfig({ rateLimit: { resolve: () => limiter } }).config;
    const channel = createAuthChannel<ChannelTestEnv>(config);
    const cookies = makeCookies({ [PENDING_HTTPS]: nonceToken });
    const result = await channel.actions.confirm(makeEvent({ cookies, code: '00000000' }));
    expect(result).toEqual({ error: 'throttled' });
    expect(await codeRowCount()).toBe(1);
    expect(await budgetSum('escalation')).toBe(0);
    const call = warnSpy.mock.calls.find(([event]) => event === 'auth.channel.rate_limited');
    expect(call).toBeDefined();
    const fields = call?.[1] as Record<string, unknown>;
    expect(fields.correlationId).toEqual(expect.any(String));
    expect(JSON.stringify(fields)).not.toContain('known@x.test');
  });
});

describe('rate limit: default key composition', () => {
  it('two different requester buckets against one identity do not share a limit', async () => {
    const keys: string[] = [];
    const limiter: RateLimitLike = {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: true };
      },
    };
    const { config } = makeConfig({
      lookup: async () => null,
      rateLimit: { resolve: () => limiter },
    });
    const channel = createAuthChannel<ChannelTestEnv>(config);

    await channel.actions.request(makeEvent({ contact: 'shared@x.test', address: '203.0.113.10' }));
    await channel.actions.request(makeEvent({ contact: 'shared@x.test', address: '198.51.100.20' }));

    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
    // Each key carries the address-and-identity join, never the identity alone: stripping the
    // identity half (everything after the last '|') must still leave the two keys distinct.
    const addressHalves = keys.map((k) => k.slice(0, k.lastIndexOf('|')));
    expect(addressHalves[0]).not.toBe(addressHalves[1]);
    const identityHalves = keys.map((k) => k.slice(k.lastIndexOf('|') + 1));
    expect(identityHalves[0]).toBe(identityHalves[1]);
  });
});
