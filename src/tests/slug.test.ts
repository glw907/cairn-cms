import { describe, it, expect } from 'vitest';
import { slugify } from '../lib/slug';

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('strips punctuation and collapses separators', () => {
    expect(slugify("Geoff's  First Post!!")).toBe('geoffs-first-post');
  });
  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Edge-- ')).toBe('edge');
  });
  it('returns empty for punctuation-only input', () => {
    expect(slugify('!!!')).toBe('');
  });
});
