import { describe, it, expect } from 'vitest';
import { deriveIdentity, generateCode, canonicalizeCode, requesterBucket } from '../../lib/auth-channel/identity.js';

describe('deriveIdentity', () => {
  it('hashes a known subject under the s: prefix', async () => {
    const id = await deriveIdentity('salt-a', 'subject-1', 'ignored@example.test');
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes an unknown contact under the c: prefix', async () => {
    const id = await deriveIdentity('salt-a', null, 'unknown@example.test');
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('yields different values for the same string used as subject and as contact', async () => {
    const asSubject = await deriveIdentity('salt-a', 'same-string', 'ignored@example.test');
    const asContact = await deriveIdentity('salt-a', null, 'same-string');
    expect(asSubject).not.toBe(asContact);
  });

  it('is deterministic for the same salt, subject, and contact', async () => {
    const first = await deriveIdentity('salt-a', 'subject-1', 'contact-1');
    const second = await deriveIdentity('salt-a', 'subject-1', 'contact-1');
    expect(first).toBe(second);
  });

  it('differs across salts for the same subject', async () => {
    const a = await deriveIdentity('salt-a', 'subject-1', 'contact-1');
    const b = await deriveIdentity('salt-b', 'subject-1', 'contact-1');
    expect(a).not.toBe(b);
  });
});

describe('generateCode', () => {
  it('is zero-padded and exactly the requested length', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode(8);
      expect(code).toMatch(/^[0-9]{8}$/);
    }
  });

  it('supports the full clamp range', () => {
    expect(generateCode(8)).toHaveLength(8);
    expect(generateCode(10)).toHaveLength(10);
  });

  it('does not repeat every draw across many calls (rejection sampling is not stuck)', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateCode(8)));
    expect(seen.size).toBeGreaterThan(150);
  });
});

describe('canonicalizeCode', () => {
  it('accepts a space-separated autofill of the right digit count', () => {
    expect(canonicalizeCode('1234 5678', 8)).toBe('12345678');
  });

  it('accepts a leading-zero code', () => {
    expect(canonicalizeCode('01234567', 8)).toBe('01234567');
  });

  it('rejects a short submission', () => {
    expect(canonicalizeCode('123', 8)).toBeNull();
  });

  it('rejects a non-numeric submission', () => {
    expect(canonicalizeCode('abcdefgh', 8)).toBeNull();
  });

  it('rejects a submission with extra digits', () => {
    expect(canonicalizeCode('123456789', 8)).toBeNull();
  });
});

describe('requesterBucket', () => {
  it('returns an IPv4 address unmodified', () => {
    const event = { getClientAddress: () => '203.0.113.7' };
    expect(requesterBucket(event)).toBe('203.0.113.7');
  });

  it('narrows a full IPv6 address to its /64 prefix', () => {
    const event = { getClientAddress: () => '2001:db8:85a3:1234:5678:8a2e:370:7334' };
    expect(requesterBucket(event)).toBe('2001:db8:85a3:1234');
  });

  it('narrows a compressed IPv6 address to the same /64 prefix as its expanded form', () => {
    const compressed = { getClientAddress: () => '2001:db8:85a3::8a2e:370:7334' };
    const expanded = { getClientAddress: () => '2001:db8:85a3:0:8a2e:370:7334:0000' };
    // Both addresses share the first four hextets once :: is expanded, so both requester
    // buckets must agree even though one host omitted the trailing zero group entirely.
    expect(requesterBucket(compressed)).toBe(requesterBucket(expanded));
    expect(requesterBucket(compressed)).toBe('2001:db8:85a3:0');
  });

  it('gives two hosts in different /64s different buckets', () => {
    const a = { getClientAddress: () => '2001:db8:85a3::1' };
    const b = { getClientAddress: () => '2001:db8:85a4::1' };
    expect(requesterBucket(a)).not.toBe(requesterBucket(b));
  });

  it('gives two hosts in the same /64 the same bucket', () => {
    const a = { getClientAddress: () => '2001:db8:85a3::1' };
    const b = { getClientAddress: () => '2001:db8:85a3::2' };
    expect(requesterBucket(a)).toBe(requesterBucket(b));
  });

  it('unwraps an IPv4-mapped IPv6 literal to its embedded IPv4 address', () => {
    // Node-based runtimes commonly report IPv4 clients as `::ffff:a.b.c.d`. Narrowing that as
    // IPv6 collapses every such client into one shared `0:0:0:0` bucket, which an attacker on
    // any network could exhaust for a known identity, so the mapped form must unwrap instead.
    const event = { getClientAddress: () => '::ffff:203.0.113.7' };
    expect(requesterBucket(event)).toBe('203.0.113.7');
  });

  it('gives two IPv4-mapped clients on different networks different buckets', () => {
    const a = { getClientAddress: () => '::ffff:203.0.113.7' };
    const b = { getClientAddress: () => '::FFFF:198.51.100.9' };
    expect(requesterBucket(a)).not.toBe(requesterBucket(b));
    expect(requesterBucket(b)).toBe('198.51.100.9');
  });

  it('buckets a mapped IPv4 client identically to the same client reported as bare IPv4', () => {
    const mapped = { getClientAddress: () => '::ffff:203.0.113.7' };
    const bare = { getClientAddress: () => '203.0.113.7' };
    expect(requesterBucket(mapped)).toBe(requesterBucket(bare));
  });
});
