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

  it('coalesces concurrent misses into one mint', async () => {
    // A cold isolate's parallel loads call before the first mint resolves; both must ride the
    // same in-flight mint rather than each minting their own token.
    let resolveMint!: (token: string) => void;
    const mint = vi.fn(() => new Promise<string>((resolve) => { resolveMint = resolve; }));
    const get = createInstallationTokenCache(mint, () => 1000);
    const first = get(creds);
    const second = get(creds);
    resolveMint('ghs_shared');
    expect(await first).toBe('ghs_shared');
    expect(await second).toBe('ghs_shared');
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it('clears a rejected mint so the next call re-mints', async () => {
    const mint = vi.fn<(c: typeof creds) => Promise<string>>()
      .mockRejectedValueOnce(new Error('mint failed'))
      .mockResolvedValue('ghs_retry');
    const get = createInstallationTokenCache(mint, () => 1000);
    await expect(get(creds)).rejects.toThrow('mint failed');
    expect(await get(creds)).toBe('ghs_retry');
    expect(mint).toHaveBeenCalledTimes(2);
  });
});
