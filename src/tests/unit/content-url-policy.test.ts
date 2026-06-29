import { describe, it, expect } from 'vitest';
import { tagSlug, tagArchivePath, parseTagPath } from '../../lib/content/url-policy.js';

describe('tagSlug', () => {
  it('lowercases and hyphenates a multi-word tag value', () => {
    expect(tagSlug('Web Design')).toBe('web-design');
  });

  it('is stable and non-empty for a value of only non-alphanumerics', () => {
    const slug = tagSlug('C++');
    expect(slug).toBeTruthy();
    expect(slug).toBe(tagSlug('C++'));
  });
});

describe('tagArchivePath', () => {
  it('joins the base and the slugified value with a slash', () => {
    expect(tagArchivePath('/topics', 'Web Design')).toBe('/topics/web-design');
  });
});

describe('parseTagPath', () => {
  it('returns "index" for an exact base match', () => {
    expect(parseTagPath('/topics', '/topics')).toBe('index');
  });

  it('returns the slug for exactly one segment under the base', () => {
    expect(parseTagPath('/topics', '/topics/web-design')).toEqual({ tag: 'web-design' });
  });

  it('returns null for more than one segment under the base', () => {
    expect(parseTagPath('/topics', '/topics/a/b')).toBeNull();
  });

  it('returns null for a non-matching base', () => {
    expect(parseTagPath('/topics', '/other')).toBeNull();
  });
});
