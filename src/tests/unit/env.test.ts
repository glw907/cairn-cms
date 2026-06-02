import { describe, it, expect } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { requireOrigin, requireDb } from '../../lib/env.js';

describe('requireOrigin', () => {
  it('returns the configured origin', () => {
    expect(requireOrigin({ PUBLIC_ORIGIN: 'https://ecnordic.ski' })).toBe('https://ecnordic.ski');
  });

  it('throws when the origin is unset', () => {
    expect(() => requireOrigin({})).toThrow(/PUBLIC_ORIGIN/);
  });

  it('throws when the origin is empty', () => {
    expect(() => requireOrigin({ PUBLIC_ORIGIN: '' })).toThrow(/PUBLIC_ORIGIN/);
  });

  it('allows http on localhost for dev', () => {
    expect(requireOrigin({ PUBLIC_ORIGIN: 'http://localhost:5173' })).toBe('http://localhost:5173');
  });

  it('throws on a non-https origin that is not local', () => {
    expect(() => requireOrigin({ PUBLIC_ORIGIN: 'http://ecnordic.ski' })).toThrow(/https/);
  });

  it('rejects a lookalike localhost host', () => {
    expect(() => requireOrigin({ PUBLIC_ORIGIN: 'http://localhost.evil.com' })).toThrow(/https/);
  });
});

describe('requireDb', () => {
  it('returns the configured binding', () => {
    const db = {} as D1Database;
    expect(requireDb({ AUTH_DB: db })).toBe(db);
  });

  it('throws when the binding is missing', () => {
    expect(() => requireDb({})).toThrow(/AUTH_DB/);
  });
});
