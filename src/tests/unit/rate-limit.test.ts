import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit, checkRateLimitKeys } from '../../lib/cloudflare/rate-limit.js';
import type { RateLimitLike } from '../../lib/cloudflare/rate-limit.js';

function fakeBinding(results: boolean[]): { binding: RateLimitLike; calls: string[] } {
  const calls: string[] = [];
  let index = 0;
  const binding: RateLimitLike = {
    limit: vi.fn(async ({ key }: { key: string }) => {
      calls.push(key);
      const success = results[index] ?? true;
      index += 1;
      return { success };
    }),
  };
  return { binding, calls };
}

describe('checkRateLimit', () => {
  it('returns true and calls nothing for an undefined binding', async () => {
    expect(await checkRateLimit(undefined, 'k')).toBe(true);
  });

  it('returns true when the binding answers success: true', async () => {
    const { binding } = fakeBinding([true]);
    expect(await checkRateLimit(binding, 'k')).toBe(true);
  });

  it('returns false when the binding answers success: false', async () => {
    const { binding } = fakeBinding([false]);
    expect(await checkRateLimit(binding, 'k')).toBe(false);
  });

  it('calls the binding with exactly { key }', async () => {
    const { binding } = fakeBinding([true]);
    await checkRateLimit(binding, 'the-key');
    expect(binding.limit).toHaveBeenCalledWith({ key: 'the-key' });
    expect(binding.limit).toHaveBeenCalledTimes(1);
  });

  it('propagates a throwing limit() rather than swallowing it', async () => {
    const binding: RateLimitLike = {
      limit: vi.fn(async () => {
        throw new Error('boom');
      }),
    };
    await expect(checkRateLimit(binding, 'k')).rejects.toThrow('boom');
  });

  it('returns false when a malformed limiter response has no boolean success field', async () => {
    const binding: RateLimitLike = {
      limit: vi.fn(async () => ({}) as any),
    };
    expect(await checkRateLimit(binding, 'k')).toBe(false);
  });
});

describe('checkRateLimitKeys', () => {
  it('returns true with no call for an empty keys array', async () => {
    const { binding, calls } = fakeBinding([]);
    expect(await checkRateLimitKeys(binding, [])).toBe(true);
    expect(calls).toEqual([]);
  });

  it('returns true and calls the binding once per key, in order, when every key passes', async () => {
    const { binding, calls } = fakeBinding([true, true, true]);
    expect(await checkRateLimitKeys(binding, ['a', 'b', 'c'])).toBe(true);
    expect(calls).toEqual(['a', 'b', 'c']);
  });

  it('short-circuits at the first failing key: later keys are never called', async () => {
    const { binding, calls } = fakeBinding([true, false, true]);
    expect(await checkRateLimitKeys(binding, ['a', 'b', 'c'])).toBe(false);
    expect(calls).toEqual(['a', 'b']);
  });

  it('returns true with no call for an undefined binding, even with several keys', async () => {
    const { calls } = fakeBinding([]);
    expect(await checkRateLimitKeys(undefined, ['a', 'b', 'c'])).toBe(true);
    expect(calls).toEqual([]);
  });
});
