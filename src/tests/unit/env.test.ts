import { describe, it, expect } from 'vitest';
import { requireOrigin } from '../../lib/env.js';

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
});
