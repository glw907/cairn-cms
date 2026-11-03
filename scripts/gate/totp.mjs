// RFC 6238 time-based one-time passwords over node:crypto (HMAC-SHA-1, 30 second step), for the
// gate's machine-account sign-in. The secret is read from the environment only and never printed.
import { createHmac } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decode an RFC 4648 base32 string, ignoring spaces, padding, and case, as authenticator apps
 * display secrets.
 * @param {string} text the base32 secret
 * @returns {Buffer} the decoded key bytes
 */
export function base32Decode(text) {
  const clean = text.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  /** @type {number[]} */
  const bytes = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error('The TOTP secret is not base32.');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * The one-time code for a key at a moment (RFC 6238 over RFC 4226's truncation).
 * @param {Buffer} key the raw shared secret
 * @param {number} timeMs the moment, in epoch milliseconds
 * @param {{ digits?: number, stepSeconds?: number }} [options] the code length (6) and the step (30)
 * @returns {string} the zero-padded code
 */
export function totpFromKey(key, timeMs, { digits = 6, stepSeconds = 30 } = {}) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timeMs / 1000 / stepSeconds)));
  const hmac = createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, '0');
}

/**
 * The current code for the machine account's secret.
 * @param {Record<string, string | undefined>} env the environment holding `GITHUB_TEST_TOTP_SECRET`
 * @param {number} [timeMs] the moment, defaulting to now
 * @returns {string} the six-digit code
 */
export function totpFromEnv(env, timeMs = Date.now()) {
  const secret = env.GITHUB_TEST_TOTP_SECRET;
  if (!secret) throw new Error('GITHUB_TEST_TOTP_SECRET is not set.');
  return totpFromKey(base32Decode(secret), timeMs);
}
