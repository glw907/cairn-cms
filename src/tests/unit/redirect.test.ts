import { describe, it, expect } from 'vitest';
import { validateRedirect } from '../../lib/sveltekit/redirect.js';

const origin = 'https://club.org';
describe('validateRedirect', () => {
  it('accepts a same-origin relative path', () => {
    expect(validateRedirect('/account', origin)).toBe('/account');
    expect(validateRedirect('/a/b?x=1', origin)).toBe('/a/b?x=1');
  });
  it('rejects protocol-relative, backslash, absolute-other-origin, and userinfo tricks', () => {
    for (const bad of ['//evil.com', '/\\evil.com', '\\/evil.com', 'https://evil.com', 'https://club.org.evil.com', 'https:evil.com', 'https://user@evil.com', '%2f%2fevil.com']) {
      expect(validateRedirect(bad, origin)).toBeNull();
    }
  });
  it('rejects dot-segment inputs that normalize to a protocol-relative path', () => {
    // new URL('/..//evil', origin).pathname is '//evil', a protocol-relative Location off-origin.
    for (const bad of ['/..//evil.com', '/.//evil.com', '/foo/../..//evil.com', '/%2e%2e//evil.com']) {
      expect(validateRedirect(bad, origin)).toBeNull();
    }
  });
  it('rejects null and empty', () => {
    expect(validateRedirect(null, origin)).toBeNull();
    expect(validateRedirect('', origin)).toBeNull();
  });
});
