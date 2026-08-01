import { describe, it, expect, vi } from 'vitest';
import {
  generateToken,
  generateSessionId,
  hashToken,
  cookieName,
  tokensMatch,
  sessionCookieName,
  csrfCookieName,
} from '../../lib/auth/crypto.js';

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

describe('cookieName', () => {
  it('prefixes with __Host- when secure, and leaves the base bare otherwise', () => {
    expect(cookieName('cairn_session', true)).toBe('__Host-cairn_session');
    expect(cookieName('cairn_session', false)).toBe('cairn_session');
  });

  it('applies the same prefixing to an arbitrary base', () => {
    expect(cookieName('asc-member', true)).toBe('__Host-asc-member');
    expect(cookieName('asc-member', false)).toBe('asc-member');
  });

  it('is the byte-identical basis for the engine cookie-name functions', () => {
    for (const secure of [true, false]) {
      expect(sessionCookieName(secure)).toBe(cookieName('cairn_session', secure));
      expect(csrfCookieName(secure)).toBe(cookieName('cairn_csrf', secure));
    }
  });

  it('throws on a base that already carries a __Host- or __Secure- prefix', () => {
    expect(() => cookieName('__Host-cairn_session', true)).toThrow();
    expect(() => cookieName('__Secure-cairn_session', true)).toThrow();
  });

  it('throws on a differently-cased prefix, since a browser matches __Host-/__Secure- case-insensitively', () => {
    expect(() => cookieName('__host-cairn_session', true)).toThrow();
    expect(() => cookieName('__SECURE-cairn_session', true)).toThrow();
  });

  it('throws on a base carrying a character outside the cookie-name token set', () => {
    expect(() => cookieName('bad;name', true)).toThrow();
    expect(() => cookieName('bad=name', true)).toThrow();
    expect(() => cookieName('bad name', true)).toThrow();
    expect(() => cookieName('bad\nname', true)).toThrow();
  });

  it('does not throw on the engine-reserved cairn_ namespace', () => {
    expect(() => cookieName('cairn_session', true)).not.toThrow();
    expect(() => cookieName('cairn_anything', false)).not.toThrow();
  });
});

describe('tokensMatch', () => {
  it('is true for equal tokens', () => {
    expect(tokensMatch('abc123', 'abc123')).toBe(true);
  });

  it('is deliberately false for two empty strings', () => {
    expect(tokensMatch('', '')).toBe(false);
  });

  it('is false for a same-length mismatch', () => {
    expect(tokensMatch('abc123', 'abc124')).toBe(false);
  });

  it('is false for a different length', () => {
    expect(tokensMatch('abc', 'abcd')).toBe(false);
  });

  it('compares a non-ASCII pair correctly by byte, not by code unit', () => {
    // é (U+00E9) and ë (U+00EB) both encode to 2 UTF-8 bytes, so this pair is the same total
    // byte length and must reach the byte-comparison loop, unlike a pair that differs in byte
    // length (which the length check alone would already reject).
    expect(tokensMatch('tökén-é', 'tökén-é')).toBe(true);
    expect(tokensMatch('tökén-é', 'tökén-ë')).toBe(false);
  });

  it('calls a native crypto.subtle.timingSafeEqual when the runtime provides one', () => {
    const original = crypto.subtle as SubtleCrypto & { timingSafeEqual?: unknown };
    const stub = vi.fn((a: ArrayBufferView, b: ArrayBufferView) => {
      const aBytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
      const bBytes = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
      return aBytes.length === bBytes.length && aBytes.every((byte, i) => byte === bBytes[i]);
    });
    original.timingSafeEqual = stub;
    try {
      expect(tokensMatch('abc123', 'abc123')).toBe(true);
      expect(tokensMatch('abc123', 'abc124')).toBe(false);
      expect(stub).toHaveBeenCalledTimes(2);
    } finally {
      delete original.timingSafeEqual;
    }
  });
});
