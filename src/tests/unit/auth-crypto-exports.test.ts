import { describe, it, expect } from 'vitest';
import * as authCrypto from '../../lib/auth-crypto/index.js';

// generateCsrfToken and generateSessionId are demoted (retires pass, batch 1b): both bodies were
// byte-identical to generateToken under a second name; still exported from `auth/crypto.ts` for
// internal use (`sveltekit/csrf.ts`, `sveltekit/auth-routes.ts`).
const DEMOTED = ['generateCsrfToken', 'generateSessionId'];

describe('auth-crypto exports', () => {
  it('exposes exactly the four crypto primitives', () => {
    const names = Object.keys(authCrypto).sort();
    expect(names).toEqual(['cookieName', 'generateToken', 'hashToken', 'tokensMatch']);
  });

  it('omits the demoted generator aliases', () => {
    for (const name of DEMOTED) {
      expect(name in authCrypto).toBe(false);
    }
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
