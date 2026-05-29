import { describe, it, expect } from 'vitest';
import { generateToken, generateSessionId, hashToken } from '../../lib/auth/crypto.js';

describe('hashToken', () => {
  it('is the lowercase hex SHA-256 of the input', async () => {
    // Known vector: SHA-256("abc").
    expect(await hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is deterministic and 64 hex chars', async () => {
    const a = await hashToken('some-token-value');
    const b = await hashToken('some-token-value');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateToken / generateSessionId', () => {
  it('returns url-safe strings with no padding', () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateSessionId()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('does not repeat across calls', () => {
    const seen = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(seen.size).toBe(100);
  });
});
