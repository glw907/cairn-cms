// RFC 6238 Appendix B, the SHA-1 vectors (8 digits), against the shared secret "12345678901234567890".
import { describe, it, expect } from 'vitest';
import { base32Decode, totpFromKey, totpFromEnv } from '../../../scripts/gate/totp.mjs';

const KEY = Buffer.from('12345678901234567890', 'ascii');
const BASE32_KEY = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('totp', () => {
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('matches the RFC 6238 SHA-1 vector at %i', (seconds, code) => {
    expect(totpFromKey(KEY, seconds * 1000, { digits: 8 })).toBe(code);
  });

  it('gives the six-digit code by default, the last six digits of the eight-digit one', () => {
    expect(totpFromKey(KEY, 59_000)).toBe('287082');
  });

  it('decodes a base32 secret as an authenticator displays it', () => {
    expect(base32Decode(BASE32_KEY).equals(KEY)).toBe(true);
    expect(base32Decode(BASE32_KEY.toLowerCase().replace(/(.{4})/g, '$1 ')).equals(KEY)).toBe(true);
    expect(() => base32Decode('not base32 !')).toThrow('not base32');
  });

  it('reads the secret from the environment only', () => {
    expect(totpFromEnv({ GITHUB_TEST_TOTP_SECRET: BASE32_KEY }, 59_000)).toBe('287082');
    expect(() => totpFromEnv({})).toThrow('GITHUB_TEST_TOTP_SECRET');
  });
});
