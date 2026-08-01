import { describe, it, expect } from 'vitest';
import * as authCrypto from '../../lib/auth-crypto/index.js';

describe('auth-crypto exports', () => {
  it('exposes exactly the six crypto primitives', () => {
    const names = Object.keys(authCrypto).sort();
    expect(names).toEqual([
      'cookieName',
      'generateCsrfToken',
      'generateSessionId',
      'generateToken',
      'hashToken',
      'tokensMatch',
    ]);
  });

  it('generateToken returns a url-safe 256-bit token', () => {
    expect(authCrypto.generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashToken returns a lowercase hex SHA-256 digest', async () => {
    expect(await authCrypto.hashToken('anything')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('cookieName applies the __Host- prefix when secure', () => {
    expect(authCrypto.cookieName('x', true)).toBe('__Host-x');
  });
});
