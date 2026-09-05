// cairn-cms: identity derivation and code handling for the auth-channel factory. No D1 access
// lives here; store.ts owns every SQL statement.
import { hashToken } from '../auth/crypto.js';

/**
 * The salted, prefixed identity a channel correlates on: `hashToken(salt + 's:' + subject)` for
 * a known subject, `hashToken(salt + 'c:' + contact)` otherwise. The `'s:'`/`'c:'` prefixes keep
 * a subject-derived and a contact-derived identity non-confusable even when a site's `subject`
 * happens to be an email address; the per-deployment salt keeps the hash from reversing against
 * a small contact space (an unsalted hash over a 10-digit phone number recovers in seconds).
 */
export async function deriveIdentity(salt: string, subject: string | null, contact: string): Promise<string> {
  const material = subject !== null ? `${salt}s:${subject}` : `${salt}c:${contact}`;
  return hashToken(material);
}

/**
 * A uniform, rejection-sampled draw in `[0, rangeExclusive)`. A single Uint32 draw only covers
 * `[0, 2**32)`, too small for the 10-digit code the clamp permits (`10**10` exceeds `2**32`), so
 * this draws enough random bytes to comfortably exceed `rangeExclusive` instead and interprets
 * them as an unsigned integer via `reduce`, safe up to `Number.MAX_SAFE_INTEGER`, which every
 * length the clamp permits stays well under. Rejecting draws at or above the largest multiple of
 * `rangeExclusive` that fits removes modulo bias, so no value is more likely than another.
 */
function drawBelow(rangeExclusive: number): number {
  const byteLength = Math.ceil(Math.log2(rangeExclusive) / 8) + 1;
  const range = 256 ** byteLength;
  const limit = range - (range % rangeExclusive);
  const buf = new Uint8Array(byteLength);
  let draw: number;
  do {
    crypto.getRandomValues(buf);
    draw = buf.reduce((acc, b) => acc * 256 + b, 0);
  } while (draw >= limit);
  return draw % rangeExclusive;
}

/**
 * A rejection-sampled, zero-padded numeric code of exactly `length` digits, so the guessing
 * bound in the security model holds against a genuinely uniform distribution rather than one
 * skewed by modulo bias toward the low end of the range.
 */
export function generateCode(length: number): string {
  const max = 10 ** length;
  return String(drawBelow(max)).padStart(length, '0');
}

/**
 * Strip everything but digits and require exactly `length` of them, so an autofilled
 * `1234 5678` and a leading-zero code both canonicalize while a short or non-numeric submission
 * is rejected before it ever reaches the store (and so costs no attempt). Returns null for
 * anything that does not canonicalize to exactly `length` digits.
 */
export function canonicalizeCode(raw: string, length: number): string | null {
  const digits = raw.replace(/\D/g, '');
  return digits.length === length ? digits : null;
}

/**
 * The address half of the requester bucket: `event.getClientAddress()`, narrowed to its /64 for
 * IPv6 so a single host cannot rotate through its own subnet to dodge the requester cap. The
 * caller pairs this with the derived identity to form the full bucket key (spec, Flows: "the
 * pair of the client address ... and the identity"); the address alone would let one hostile
 * host exhaust a shared venue's budget for every member behind it.
 */
export function requesterBucket(event: { getClientAddress(): string }): string {
  const address = event.getClientAddress();
  const bare = address.replace(/^\[|]$/g, '').split('%')[0];
  // An IPv4-mapped literal (`::ffff:a.b.c.d`, common from Node-based runtimes) is an IPv4
  // address wearing IPv6 syntax. Narrowing it as IPv6 would collapse every such client into the
  // single `0:0:0:0` /64, one shared bucket an attacker could exhaust for a known identity, so
  // unwrap to the embedded IPv4 address instead.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(bare);
  if (mapped) return mapped[1];
  return bare.includes(':') ? ipv6Prefix64(bare) : bare;
}

/** Expand a possibly-compressed, bare IPv6 literal to its eight hextets, keeping the first four (/64). */
function ipv6Prefix64(bare: string): string {
  const [head, tail] = bare.includes('::') ? bare.split('::') : [bare, undefined];
  const headParts = head ? head.split(':').filter(Boolean) : [];
  const tailParts = tail ? tail.split(':').filter(Boolean) : [];
  const missing = Math.max(8 - headParts.length - tailParts.length, 0);
  const groups = [...headParts, ...Array<string>(missing).fill('0'), ...tailParts];
  return groups.slice(0, 4).join(':');
}
