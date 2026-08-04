// The closed vocabulary the `?error=` query channel is still allowed to speak (task D, the
// refusal-channel convergence pass). resolveRefusalCode is the security boundary: an unrecognized
// value must resolve to null, never pass through as free text.
import { describe, it, expect } from 'vitest';
import { resolveRefusalCode, refusalMessage } from '../../lib/sveltekit/refusal-codes.js';

describe('resolveRefusalCode', () => {
  it('recognizes each of the four closed codes', () => {
    expect(resolveRefusalCode('expired')).toBe('expired');
    expect(resolveRefusalCode('nothing_to_publish')).toBe('nothing_to_publish');
    expect(resolveRefusalCode('publish_conflict')).toBe('publish_conflict');
    expect(resolveRefusalCode('publish_failed')).toBe('publish_failed');
  });

  it('rejects a crafted free-text value, an unknown code, and a null query', () => {
    expect(resolveRefusalCode('You have been signed out. Sign in again.')).toBeNull();
    expect(resolveRefusalCode('nothing-to-publish')).toBeNull();
    expect(resolveRefusalCode('')).toBeNull();
    expect(resolveRefusalCode(null)).toBeNull();
  });

  it('rejects a value that only shares a prototype-chain name with the map (Object.hasOwn, not `in`)', () => {
    expect(resolveRefusalCode('toString')).toBeNull();
    expect(resolveRefusalCode('constructor')).toBeNull();
  });
});

describe('refusalMessage', () => {
  it('resolves each code to its own engine copy', () => {
    expect(refusalMessage('nothing_to_publish')).toBe('Nothing to publish. Every entry is already live.');
    expect(refusalMessage('publish_conflict')).toBe('The site changed while publishing. Reload and try again.');
    expect(refusalMessage('expired')).toBe('That link expired. Request a new one below.');
    expect(refusalMessage('publish_failed')).toMatch(/did not publish/i);
  });
});
