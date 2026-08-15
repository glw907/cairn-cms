import { describe, it, expect } from 'vitest';
import {
  headingAnchors,
  linksIn,
  blankInlineCode,
  isExternal,
  findBrokenLinks,
  hasUnreleasedHeading,
  unreleasedParityMismatch,
  legacyTarget,
  legacyMapProblems,
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
    expect(mismatch).toMatch(/migration-notes\.md/);
  });

  it('fails when only the migration notes carry an Unreleased heading', () => {
    const mismatch = unreleasedParityMismatch('## 0.91.0\n', '## Unreleased: a recipe\n');
    expect(mismatch).toMatch(/migration-notes\.md/);
    expect(mismatch).toMatch(/CHANGELOG\.md/);
  });

  // The 0.91.0 cut shipped exactly the drift this gate now catches: CHANGELOG.md's window was
  // renamed and the paired page's was not. Read the real, current files, since the whole point of
  // this gate is proving today's tree is in sync, not a synthetic pair of strings.
  it('agrees on the real, current CHANGELOG.md and docs/extend/migration-notes.md', () => {
    const root = resolve(__dirname, '../../..');
    const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
    const migrationNotes = readFileSync(resolve(root, 'docs/extend/migration-notes.md'), 'utf8');
    expect(unreleasedParityMismatch(changelog, migrationNotes)).toBeNull();
  });
});

// Pass D deleted the guides, tutorial, and explanation arms. CHANGELOG.md is immutable, so its
// historical links keep the old paths and the gate translates them; every other file's links stay
// checked against the tree. These pin both halves, and the map's own anti-rot invariants.
describe('the legacy CHANGELOG path map', () => {
  const root = resolve(__dirname, '../../..');

  it('resolves a retired path written in CHANGELOG.md', () => {
    expect(legacyTarget('CHANGELOG.md', 'docs/guides/add-an-island.md')).toBe(
      'docs/extend/add-an-island.md'
    );
  });

  it('resolves the same path written with a leading ./ or carrying an anchor', () => {
    expect(legacyTarget('CHANGELOG.md', './docs/guides/add-an-island.md')).toBe(
      'docs/extend/add-an-island.md'
    );
    expect(legacyTarget('CHANGELOG.md', 'docs/explanation/security-model.md#who-may-edit')).toBe(
      'docs/extend/security-model.md'
    );
  });

  it('refuses the same retired path written in any other file', () => {
    expect(legacyTarget('ROADMAP.md', 'docs/guides/add-an-island.md')).toBeNull();
    expect(legacyTarget('docs/reference/core.md', 'docs/guides/add-an-island.md')).toBeNull();
  });

  it('leaves a live path alone', () => {
    expect(legacyTarget('CHANGELOG.md', 'docs/reference/core.md')).toBeNull();
  });

  // The map is only as good as its own upkeep: a value pointing nowhere, a key whose page came
  // back, or a key nothing cites all have to fail loudly rather than quietly excuse a link.
  it('holds its three invariants against the real tree', () => {
    expect(legacyMapProblems(root)).toEqual([]);
  });

  // The green assertion above cannot distinguish three working invariants from three that never
  // run, so each one gets its own red proof against a two-entry map. These were proven by hand
  // during the cutover and not banked, which is how a gate quietly stops gating.
  it('fails a value that names a page which does not exist', () => {
    const problems = legacyMapProblems(root, {
      'docs/guides/add-an-island.md': 'docs/extend/no-such-page.md',
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('docs/extend/no-such-page.md');
    expect(problems[0]).toContain('no longer exists');
  });

  it('fails a key whose own page is back on disk', () => {
    const problems = legacyMapProblems(root, {
      'docs/reference/core.md': 'docs/extend/architecture.md',
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('docs/reference/core.md');
    expect(problems[0]).toContain('exists again');
  });

  it('fails a key that no CHANGELOG link names', () => {
    const problems = legacyMapProblems(root, {
      'docs/guides/never-cited-anywhere.md': 'docs/extend/architecture.md',
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('never-cited-anywhere.md');
    expect(problems[0]).toContain('no CHANGELOG.md link names');
  });
});
