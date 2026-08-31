import { describe, it, expect } from 'vitest';
import * as cloudflare from '../../lib/cloudflare/index.js';

describe('cloudflare exports', () => {
  it('exposes exactly the two platform primitives', () => {
    const names = Object.keys(cloudflare).sort();
    expect(names).toEqual(['resolveRateLimit', 'verifyTurnstile']);
  });

  it('resolveRateLimit reports no-binding with no binding configured', async () => {
    await expect(cloudflare.resolveRateLimit(undefined, 'k')).resolves.toEqual({ outcome: 'no-binding' });
  });

  it('verifyTurnstile returns false for a blank token and secret', async () => {
    await expect(cloudflare.verifyTurnstile('', '')).resolves.toBe(false);
  });
});
