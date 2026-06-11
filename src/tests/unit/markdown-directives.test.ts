import { describe, it, expect } from 'vitest';
import { directiveLineKind, findInlineDirectives } from '../../lib/components/markdown-directives.js';

describe('directiveLineKind', () => {
  it('recognizes container fences with and without names and attributes', () => {
    expect(directiveLineKind(':::gallery')).toBe('fence');
    expect(directiveLineKind('::: gallery')).toBe('fence');
    expect(directiveLineKind(':::gallery{cols=3}')).toBe('fence');
    expect(directiveLineKind(':::')).toBe('fence');
    expect(directiveLineKind('  :::')).toBe('fence');
  });
  it('recognizes leaf directives', () => {
    expect(directiveLineKind('::hr')).toBe('leaf');
    expect(directiveLineKind('::youtube[Intro]{id=abc}')).toBe('leaf');
  });
  it('rejects prose, emphasis, and URLs', () => {
    expect(directiveLineKind('Plain prose line')).toBeNull();
    expect(directiveLineKind('a sentence with :colons: inside')).toBeNull();
    expect(directiveLineKind('https://example.com')).toBeNull();
  });
});

describe('findInlineDirectives', () => {
  it('finds inline directives with ranges', () => {
    expect(findInlineDirectives('See :icon[ski]{size=16} here')).toEqual([{ from: 4, to: 23 }]);
  });
  it('ignores URLs, bare colons, and leaf/container forms', () => {
    expect(findInlineDirectives('https://example.com and ::leaf')).toEqual([]);
    expect(findInlineDirectives('a :smile: emoji')).toEqual([]);
  });
});
