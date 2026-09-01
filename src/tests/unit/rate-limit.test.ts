import { describe, it, expect, vi } from 'vitest';
import { resolveRateLimit } from '../../lib/cloudflare/rate-limit.js';
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

describe('resolveRateLimit', () => {
  it('returns no-binding and calls nothing for an undefined binding', async () => {
    expect(await resolveRateLimit(undefined, 'k')).toEqual({ outcome: 'no-binding' });
  });

  it('returns no-binding for an undefined binding even with several keys', async () => {
    const { calls } = fakeBinding([]);
    expect(await resolveRateLimit(undefined, ['a', 'b', 'c'])).toEqual({ outcome: 'no-binding' });
    expect(calls).toEqual([]);
  });

  it('returns allowed when the binding answers success: true', async () => {
    const { binding } = fakeBinding([true]);
    expect(await resolveRateLimit(binding, 'k')).toEqual({ outcome: 'allowed' });
  });

  it('returns limited with the failing key when the binding answers success: false', async () => {
    const { binding } = fakeBinding([false]);
    expect(await resolveRateLimit(binding, 'k')).toEqual({ outcome: 'limited', key: 'k' });
  });

  it('calls the binding with exactly { key }', async () => {
    const { binding } = fakeBinding([true]);
    await resolveRateLimit(binding, 'the-key');
    expect(binding.limit).toHaveBeenCalledWith({ key: 'the-key' });
    expect(binding.limit).toHaveBeenCalledTimes(1);
  });

  it('captures a throwing limit() into the failed arm rather than throwing', async () => {
    const error = new Error('boom');
    const binding: RateLimitLike = {
      limit: vi.fn(async () => {
        throw error;
      }),
    };
    expect(await resolveRateLimit(binding, 'k')).toEqual({ outcome: 'failed', error });
  });

  it('returns limited when a malformed limiter response has no boolean success field', async () => {
    const binding: RateLimitLike = {
      limit: vi.fn(async () => ({}) as any),
    };
    expect(await resolveRateLimit(binding, 'k')).toEqual({ outcome: 'limited', key: 'k' });
  });

  it('allows a single string key with no call for an undefined binding', async () => {
    expect(await resolveRateLimit(undefined, 'solo')).toEqual({ outcome: 'no-binding' });
  });

  it('allows an empty keys array, returning allowed with no call', async () => {
    const { binding, calls } = fakeBinding([]);
    expect(await resolveRateLimit(binding, [])).toEqual({ outcome: 'allowed' });
    expect(calls).toEqual([]);
  });

  it('calls the binding once per key, in order, when every key passes', async () => {
    const { binding, calls } = fakeBinding([true, true, true]);
    expect(await resolveRateLimit(binding, ['a', 'b', 'c'])).toEqual({ outcome: 'allowed' });
    expect(calls).toEqual(['a', 'b', 'c']);
  });

  it('short-circuits at the first failing key: later keys are never called', async () => {
    const { binding, calls } = fakeBinding([true, false, true]);
    expect(await resolveRateLimit(binding, ['a', 'b', 'c'])).toEqual({ outcome: 'limited', key: 'b' });
    expect(calls).toEqual(['a', 'b']);
  });
});
