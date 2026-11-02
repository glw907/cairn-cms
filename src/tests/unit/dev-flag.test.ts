import { describe, it, expect, afterEach, vi } from 'vitest';
import { isDevBackendFlagSet, readPublicOrigin } from '../../lib/dev-flag.js';

describe('isDevBackendFlagSet', () => {
  it('counts only the string "1" and boolean true as set', () => {
    expect(isDevBackendFlagSet('1')).toBe(true);
    expect(isDevBackendFlagSet(true)).toBe(true);
  });

  it('treats near-misses and absence as unset', () => {
    for (const raw of ['true', 'yes', '0', '', 1, false, undefined]) {
      expect(isDevBackendFlagSet(raw)).toBe(false);
    }
  });
});

describe('readPublicOrigin reads the module env alone', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the env value when PUBLIC_ORIGIN is set there', () => {
    expect(readPublicOrigin({ PUBLIC_ORIGIN: 'https://site.example' })).toBe('https://site.example');
  });

  it('returns nothing when PUBLIC_ORIGIN is set only in process.env', () => {
    vi.stubEnv('PUBLIC_ORIGIN', 'https://site.example');
    expect(readPublicOrigin({})).toBeUndefined();
    expect(readPublicOrigin(undefined)).toBeUndefined();
  });

  it('treats an empty or non-string value as absent', () => {
    expect(readPublicOrigin({ PUBLIC_ORIGIN: '' })).toBeUndefined();
    expect(readPublicOrigin({ PUBLIC_ORIGIN: 42 })).toBeUndefined();
  });
});
