import { describe, it, expect, vi } from 'vitest';
import { createInstallationTokenCache } from '../../lib/github/signing.js';

const creds = { appId: '1', installationId: '2', privateKeyB64: 'x' };

describe('installation token cache (Unit 3)', () => {
  it('mints once and reuses the token within the TTL', async () => {
    const mint = vi.fn(async () => 'ghs_token');
    let t = 1000;
    const get = createInstallationTokenCache(mint, () => t, 55 * 60 * 1000);
    expect(await get(creds)).toBe('ghs_token');
    t += 60 * 1000; // one minute later, inside the TTL
    expect(await get(creds)).toBe('ghs_token');
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it('re-mints once the TTL has passed', async () => {
    let n = 0;
    const mint = vi.fn(async () => `ghs_${n++}`);
    let t = 1000;
    const get = createInstallationTokenCache(mint, () => t, 55 * 60 * 1000);
    expect(await get(creds)).toBe('ghs_0');
    t += 56 * 60 * 1000; // past the 55-minute TTL
    expect(await get(creds)).toBe('ghs_1');
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it('keys the cache by installationId', async () => {
    const mint = vi.fn(async (c: typeof creds) => `ghs_${c.installationId}`);
    const get = createInstallationTokenCache(mint, () => 1000);
    expect(await get({ ...creds, installationId: 'a' })).toBe('ghs_a');
    expect(await get({ ...creds, installationId: 'b' })).toBe('ghs_b');
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it('mints separately for two concurrent misses rather than sharing one in-flight promise', async () => {
    // Coalescing on a shared pending promise is exactly the workerd hazard this cache must
    // not reintroduce: a canceled subrequest's promise never settles, and every caller that
    // rode it would hang forever. Two concurrent cold misses each mint their own token, which
    // is the cheap and safe side of that trade.
    let n = 0;
    const mint = vi.fn(async () => `ghs_${n++}`);
    const get = createInstallationTokenCache(mint, () => 1000);
    const [first, second] = await Promise.all([get(creds), get(creds)]);
    expect(first).toMatch(/^ghs_\d$/);
    expect(second).toMatch(/^ghs_\d$/);
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it('clears a rejected mint so the next call re-mints', async () => {
    // Nothing is cached until a mint resolves, so a rejection leaves no entry to evict.
    const mint = vi.fn<(c: typeof creds) => Promise<string>>()
      .mockRejectedValueOnce(new Error('mint failed'))
      .mockResolvedValue('ghs_retry');
    const get = createInstallationTokenCache(mint, () => 1000);
    await expect(get(creds)).rejects.toThrow('mint failed');
    expect(await get(creds)).toBe('ghs_retry');
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it('never serves an unsettled in-flight mint to a later caller', async () => {
    // Pins the 2026-07-13 production cache-poisoning bug: a workerd request that answers
    // before its mint fetch settles gets that fetch canceled, and the canceled promise never
    // settles. The old promise-caching design then served that dead promise to every later
    // caller in the isolate for the full TTL. This simulates the first call's mint never
    // settling and asserts a later call still resolves, by minting its own token instead of
    // reusing the abandoned one.
    const mint = vi.fn<(c: typeof creds) => Promise<string>>()
      .mockReturnValueOnce(new Promise<string>(() => {})) // never settles
      .mockResolvedValue('ghs_fresh');
    const get = createInstallationTokenCache(mint, () => 1000);
    void get(creds); // the abandoned request; never awaited
    expect(await get(creds)).toBe('ghs_fresh');
    expect(mint).toHaveBeenCalledTimes(2);
  });
});
