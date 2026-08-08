import { describe, it, expect } from 'vitest';
import {
  headingAnchors,
  linksIn,
  blankInlineCode,
  isExternal,
  findBrokenLinks,
  hasUnreleasedHeading,
  unreleasedParityMismatch,
} from '../../../scripts/checks/docs-links.mjs';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

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

describe('hasUnreleasedHeading', () => {
  it('matches a bare "## Unreleased" heading', () => {
    expect(hasUnreleasedHeading('# Changelog\n\n## Unreleased\n\nnotes.\n')).toBe(true);
  });

  it('matches "## Unreleased: <summary>", the upgrade guide\'s own convention', () => {
    expect(hasUnreleasedHeading('## Unreleased: a new gate\n\nnotes.\n')).toBe(true);
  });

  it('does not match a version heading', () => {
    expect(hasUnreleasedHeading('## 0.91.0\n\nnotes.\n')).toBe(false);
  });
});

describe('unreleasedParityMismatch', () => {
  it('agrees when neither side has an Unreleased heading', () => {
    expect(unreleasedParityMismatch('## 0.91.0\n', '## 0.91.0: a recipe\n')).toBeNull();
  });

  it('agrees when both sides have an Unreleased heading', () => {
    expect(unreleasedParityMismatch('## Unreleased\n', '## Unreleased: a recipe\n')).toBeNull();
  });

  it('fails when only the CHANGELOG carries an Unreleased heading', () => {
    const mismatch = unreleasedParityMismatch('## Unreleased\n', '## 0.91.0: a recipe\n');
    expect(mismatch).toMatch(/CHANGELOG\.md/);
    expect(mismatch).toMatch(/upgrade-cairn\.md/);
  });

  it('fails when only the upgrade guide carries an Unreleased heading', () => {
    const mismatch = unreleasedParityMismatch('## 0.91.0\n', '## Unreleased: a recipe\n');
    expect(mismatch).toMatch(/upgrade-cairn\.md/);
    expect(mismatch).toMatch(/CHANGELOG\.md/);
  });

  // The 0.91.0 cut shipped exactly the drift this gate now catches: CHANGELOG.md's window was
  // renamed and the upgrade guide's was not. Read the real, current files, since the whole point of
  // this gate is proving today's tree is in sync, not a synthetic pair of strings.
  it('agrees on the real, current CHANGELOG.md and docs/guides/upgrade-cairn.md', () => {
    const root = resolve(__dirname, '../../..');
    const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
    const upgradeGuide = readFileSync(resolve(root, 'docs/guides/upgrade-cairn.md'), 'utf8');
    expect(unreleasedParityMismatch(changelog, upgradeGuide)).toBeNull();
  });
});
