import { describe, it, expect } from 'vitest';
import { operatorSecretResolver } from '../../../scripts/docs-readers/run.js';
import type { InstallationToken } from '../../../scripts/docs-readers/lib/github-app-token.js';

/** A fake clock: `now()` reads a mutable box, so a test advances time without a real delay. */
function fakeClock(startMs: number): { now: () => number; advance: (ms: number) => void } {
  let current = startMs;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

/**
 * A fake mint that returns a fresh token each call, one hour ahead of the clock it is given.
 * `calls` is a mutable box, read live (never destructured), so an assertion after more calls
 * still sees the current count rather than a snapshot from construction time.
 */
function fakeMint(clock: { now: () => number }): { mint: () => Promise<InstallationToken>; calls: { count: number } } {
  const calls = { count: 0 };
  const mint = async (): Promise<InstallationToken> => {
    calls.count += 1;
    return { token: `token-${calls.count}`, expiresAt: new Date(clock.now() + 60 * 60 * 1000).toISOString(), repositories: ['cairn-scratch-b'] };
  };
  return { mint, calls };
}

/**
 * A mint that rejects on its first `failures` calls, then succeeds. `calls` is a mutable box, the
 * same live-read convention as `fakeMint`.
 */
function flakyMint(failures: number): { mint: () => Promise<InstallationToken>; calls: { count: number } } {
  const calls = { count: 0 };
  const mint = async (): Promise<InstallationToken> => {
    calls.count += 1;
    if (calls.count <= failures) throw new Error(`mint attempt ${calls.count} failed`);
    return { token: `token-${calls.count}`, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), repositories: ['cairn-scratch-b'] };
  };
  return { mint, calls };
}

describe('operatorSecretResolver: CAIRN_GH_READ_TOKEN re-minting', () => {
  it('mints once, then reuses the cached token while it is well short of expiry', async () => {
    const clock = fakeClock(0);
    const { mint, calls } = fakeMint(clock);
    const resolve = operatorSecretResolver({ now: clock.now, mint });
    expect(await resolve('CAIRN_GH_READ_TOKEN')).toBe('token-1');
    clock.advance(5 * 60 * 1000); // five minutes: nowhere near the ten-minute remint margin
    expect(await resolve('CAIRN_GH_READ_TOKEN')).toBe('token-1');
    expect(calls.count).toBe(1);
  });

  it('re-mints once the cached token is within the ten-minute remint margin of its own expiry', async () => {
    const clock = fakeClock(0);
    const { mint, calls } = fakeMint(clock);
    const resolve = operatorSecretResolver({ now: clock.now, mint });
    expect(await resolve('CAIRN_GH_READ_TOKEN')).toBe('token-1');
    expect(calls.count).toBe(1);
    clock.advance(52 * 60 * 1000); // 52 minutes into a one-hour token: 8 minutes left, under the 10-minute margin
    expect(await resolve('CAIRN_GH_READ_TOKEN')).toBe('token-2');
    expect(calls.count).toBe(2);
  });

  it('never mints twice for two calls racing the same in-flight mint', async () => {
    const clock = fakeClock(0);
    let resolveMint!: (token: InstallationToken) => void;
    let callCount = 0;
    const mint = () => {
      callCount += 1;
      return new Promise<InstallationToken>((resolve) => {
        resolveMint = resolve;
      });
    };
    const resolver = operatorSecretResolver({ now: clock.now, mint });
    const first = resolver('CAIRN_GH_READ_TOKEN');
    const second = resolver('CAIRN_GH_READ_TOKEN');
    resolveMint({ token: 'token-1', expiresAt: new Date(clock.now() + 60 * 60 * 1000).toISOString(), repositories: ['cairn-scratch-b'] });
    expect(await first).toBe('token-1');
    expect(await second).toBe('token-1');
    expect(callCount).toBe(1);
  });

  it('recovers within one call when the first mint attempt fails but its bounded retry succeeds', async () => {
    const clock = fakeClock(0);
    const { mint, calls } = flakyMint(1);
    const resolve = operatorSecretResolver({ now: clock.now, mint });
    await expect(resolve('CAIRN_GH_READ_TOKEN')).resolves.toBe('token-2');
    expect(calls.count).toBe(2);
  });

  it('fails the call after the retry also fails, and does not leave the rejected mint cached', async () => {
    const clock = fakeClock(0);
    const { mint, calls } = flakyMint(2);
    const resolve = operatorSecretResolver({ now: clock.now, mint });
    await expect(resolve('CAIRN_GH_READ_TOKEN')).rejects.toThrow('mint attempt 2 failed');
    expect(calls.count).toBe(2);
    // The next call must mint fresh rather than replay the same rejection forever.
    await expect(resolve('CAIRN_GH_READ_TOKEN')).resolves.toBe('token-3');
    expect(calls.count).toBe(3);
  });
});
