import { describe, it, expect } from 'vitest';
import { parseCairnToken, extractCairnLinks, formatCairnToken } from '../../lib/content/links.js';

describe('parseCairnToken', () => {
  it('parses a concept and a dated id', () => {
    expect(parseCairnToken('cairn:posts/2026-01-04-waxing-guide')).toEqual({
      concept: 'posts',
      id: '2026-01-04-waxing-guide',
    });
  });
  it('parses an undated id', () => {
    expect(parseCairnToken('cairn:pages/about')).toEqual({ concept: 'pages', id: 'about' });
  });
  it('returns null for a non-cairn href', () => {
    expect(parseCairnToken('https://example.com')).toBeNull();
    expect(parseCairnToken('/posts/x')).toBeNull();
    expect(parseCairnToken('#anchor')).toBeNull();
  });
  it('returns null for a malformed token', () => {
    expect(parseCairnToken('cairn:posts')).toBeNull(); // no id
    expect(parseCairnToken('cairn:/about')).toBeNull(); // no concept
    expect(parseCairnToken('cairn:posts/Bad Id')).toBeNull(); // invalid id
  });
});

describe('extractCairnLinks', () => {
  it('collects cairn links in document order, deduped', () => {
    const body = [
      'See [the guide](cairn:posts/2026-01-04-waxing-guide) and [about](cairn:pages/about).',
      'Again [the guide](cairn:posts/2026-01-04-waxing-guide).',
      'And an [external](https://example.com).',
    ].join('\n\n');
    expect(extractCairnLinks(body)).toEqual([
      { concept: 'posts', id: '2026-01-04-waxing-guide' },
      { concept: 'pages', id: 'about' },
    ]);
  });
  it('ignores a cairn token inside a code span or fence', () => {
    const body = 'Inline `cairn:posts/x` and\n\n```\ncairn:posts/y\n```\n';
    expect(extractCairnLinks(body)).toEqual([]);
  });
  it('returns an empty array for a body with no links', () => {
    expect(extractCairnLinks('Just prose.')).toEqual([]);
  });
});

describe('formatCairnToken', () => {
  it('writes the cairn: token for a ref', () => {
    expect(formatCairnToken({ concept: 'posts', id: '2026-01-04-waxing-guide' })).toBe(
      'cairn:posts/2026-01-04-waxing-guide',
    );
    expect(formatCairnToken({ concept: 'pages', id: 'about' })).toBe('cairn:pages/about');
  });
  it('round-trips with parseCairnToken', () => {
    const ref = { concept: 'posts', id: 'hello' };
    expect(parseCairnToken(formatCairnToken(ref))).toEqual(ref);
  });
});
