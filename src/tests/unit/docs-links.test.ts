import { describe, it, expect } from 'vitest';
import {
  headingAnchors,
  linksIn,
  blankInlineCode,
  isExternal,
  findBrokenLinks,
} from '../../../scripts/docs-links.mjs';
import { resolve } from 'node:path';

describe('headingAnchors', () => {
  it('slugs a heading GitHub-style and strips backticks and punctuation', () => {
    const anchors = headingAnchors('### `appJwt`\n## Auth and GitHub App\n#### URL identity!');
    expect(anchors.has('appjwt')).toBe(true);
    expect(anchors.has('auth-and-github-app')).toBe(true);
    expect(anchors.has('url-identity')).toBe(true);
  });

  it('dedups a repeated heading with a numeric suffix', () => {
    const anchors = headingAnchors('## Notes\n## Notes');
    expect([...anchors]).toEqual(['notes', 'notes-1']);
  });

  it('ignores a heading inside a fenced code block', () => {
    expect(headingAnchors('```\n## not a heading\n```').size).toBe(0);
  });
});

describe('linksIn', () => {
  it('finds an inline link with its line number', () => {
    expect(linksIn('intro\nsee [x](../a.md#h) here')).toEqual([{ line: 2, dest: '../a.md#h' }]);
  });

  it('ignores a link-shaped example inside inline code', () => {
    expect(linksIn('the token `[a](cairn:posts/x)` is literal')).toEqual([]);
  });

  it('ignores a link inside a fenced code block', () => {
    expect(linksIn('```\n[x](./gone.md)\n```')).toEqual([]);
  });
});

describe('blankInlineCode', () => {
  it('blanks single and double backtick spans', () => {
    expect(blankInlineCode('a `b` c ``d`` e').replace(/\s+/g, ' ')).toBe('a c e');
  });
});

describe('isExternal', () => {
  it('skips http, mailto, and the cairn content scheme', () => {
    expect(isExternal('https://example.com')).toBe(true);
    expect(isExternal('mailto:a@b.c')).toBe(true);
    expect(isExternal('cairn:posts/hello')).toBe(true);
    expect(isExternal('../reference/core.md')).toBe(false);
  });
});

describe('findBrokenLinks (the live docs gate)', () => {
  it('reports zero broken links across the real docs tree', () => {
    const broken = findBrokenLinks(resolve(__dirname, '../../..'));
    expect(broken).toEqual([]);
  });
});
