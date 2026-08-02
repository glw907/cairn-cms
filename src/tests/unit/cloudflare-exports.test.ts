import { describe, it, expect } from 'vitest';
import * as cloudflare from '../../lib/cloudflare/index.js';

describe('cloudflare exports', () => {
  it('exposes exactly the three platform primitives', () => {
    const names = Object.keys(cloudflare).sort();
    expect(names).toEqual(['checkRateLimit', 'checkRateLimitKeys', 'verifyTurnstile']);
  });

  it('checkRateLimit degrades to open with no binding', async () => {
    await expect(cloudflare.checkRateLimit(undefined, 'k')).resolves.toBe(true);
  });

  it('verifyTurnstile returns false for a blank token and secret', async () => {
    await expect(cloudflare.verifyTurnstile('', '')).resolves.toBe(false);
  });
});
