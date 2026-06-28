// src/tests/unit/auth-authorize.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runAuthorize } from '../../lib/auth/authorize.js';
import { log } from '../../lib/log/index.js';

const ctx = { email: 'a@b.c', platform: undefined };

describe('runAuthorize', () => {
  it('returns the callback scopes on success', async () => {
    expect(await runAuthorize(() => ['member'], ctx)).toEqual(['member']);
    expect(await runAuthorize(async () => ['member:gold'], ctx)).toEqual(['member:gold']);
  });
  it('returns [] and logs when the callback throws', async () => {
    const spy = vi.spyOn(log, 'error').mockImplementation(() => {});
    expect(await runAuthorize(() => { throw new Error('boom'); }, ctx)).toEqual([]);
    expect(spy).toHaveBeenCalledWith('auth.authorize.failed', expect.objectContaining({ email: 'a@b.c' }));
    spy.mockRestore();
  });
  it('returns [] and logs on timeout', async () => {
    const spy = vi.spyOn(log, 'error').mockImplementation(() => {});
    // Widen the gap (deadline 5ms vs callback 200ms) so the deadline fires first without flake.
    const slow = () => new Promise<string[]>((r) => setTimeout(() => r(['member']), 200));
    expect(await runAuthorize(slow, ctx, 5)).toEqual([]);
    expect(spy).toHaveBeenCalledWith('auth.authorize.failed', expect.objectContaining({ error: 'timeout' }));
    spy.mockRestore();
  });
  it('returns [] for a missing callback without logging', async () => {
    expect(await runAuthorize(undefined, ctx)).toEqual([]);
  });
  it('returns [] for a non-array return', async () => {
    const spy = vi.spyOn(log, 'error').mockImplementation(() => {});
    // @ts-expect-error deliberately wrong return
    expect(await runAuthorize(() => 'nope', ctx)).toEqual([]);
    spy.mockRestore();
  });
});
