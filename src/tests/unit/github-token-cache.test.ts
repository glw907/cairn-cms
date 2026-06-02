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
});
