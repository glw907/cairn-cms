import { describe, it, expect } from 'vitest';
import { csrfCookieName, generateCsrfToken } from '../../lib/auth/crypto.js';

describe('CSRF crypto primitives', () => {
  it('prefixes the cookie name with __Host- only when secure', () => {
    expect(csrfCookieName(true)).toBe('__Host-cairn_csrf');
    expect(csrfCookieName(false)).toBe('cairn_csrf');
  });

  it('generates a url-safe 256-bit token that differs each call', () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url, unpadded
    expect(generateCsrfToken()).not.toBe(token);
  });
});
