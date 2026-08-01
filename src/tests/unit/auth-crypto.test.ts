import { describe, it, expect } from 'vitest';
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
    // Two strings whose only difference is a single multibyte character.
    expect(tokensMatch('tökén-Ä', 'tökén-Ä')).toBe(true);
    expect(tokensMatch('tökén-Ä', 'tökén-B')).toBe(false);
  });
});
