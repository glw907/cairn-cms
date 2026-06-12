import { describe, it, expect } from 'vitest';
import { parseCairnToken, extractCairnLinks, formatCairnToken, escapeLinkText, rewriteCairnLink } from '../../lib/content/links.js';

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

describe('rewriteCairnLink', () => {
  it('rewrites the href, keeping the display text', () => {
    const doc = 'see [the guide](cairn:posts/old) now';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('see [the guide](cairn:posts/new) now');
  });
  it('keeps an escaped-bracket label exactly', () => {
    const doc = 'see [Notes \\[draft\\]](cairn:posts/old) end';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('see [Notes \\[draft\\]](cairn:posts/new) end');
  });
  it('keeps a link title', () => {
    const doc = 'a [t](cairn:posts/old "a title") b';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('a [t](cairn:posts/new "a title") b');
  });
  it('rewrites every occurrence of that href', () => {
    const doc = '[a](cairn:posts/old) and [b](cairn:posts/old)';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('[a](cairn:posts/new) and [b](cairn:posts/new)');
  });
  it('leaves a token inside a code span untouched', () => {
    const doc = '`[x](cairn:posts/old)` and [x](cairn:posts/old)';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('`[x](cairn:posts/old)` and [x](cairn:posts/new)');
  });
  it('leaves a different url unchanged', () => {
    const doc = '[keep](cairn:pages/home)';
    expect(rewriteCairnLink(doc, 'cairn:posts/old', 'cairn:posts/new')).toBe('[keep](cairn:pages/home)');
  });
});

describe('escapeLinkText', () => {
  it('escapes a backslash and square brackets', () => {
    expect(escapeLinkText('a [b] c')).toBe('a \\[b\\] c');
    expect(escapeLinkText('back\\slash')).toBe('back\\\\slash');
  });
  it('leaves text without metacharacters unchanged', () => {
    expect(escapeLinkText('About Us (2026)')).toBe('About Us (2026)');
  });
});
