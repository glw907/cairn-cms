import { describe, it, expect, afterEach } from 'vitest';
import {
  headingAnchors,
  linksIn,
  blankInlineCode,
  isExternal,
  filesInScope,
  findBrokenLinks,
  hasUnreleasedHeading,
  unreleasedParityMismatch,
} from '../../../scripts/checks/docs-links.mjs';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

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

// skills/**/*.md and claude/**/*.md both ship in the tarball, so a dead link inside a packaged
// skill is as real a gate failure as one under docs/.
describe('scope over skills/ and claude/', () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function fixtureRoot() {
    const dir = mkdtempSync(join(tmpdir(), 'docs-links-scope-'));
    tmpDirs.push(dir);
    return dir;
  }

  it('includes a skills/*/SKILL.md file in scope', () => {
    const root = fixtureRoot();
    mkdirSync(join(root, 'skills', 'a-skill'), { recursive: true });
    writeFileSync(join(root, 'skills', 'a-skill', 'SKILL.md'), '# A skill\n');
    expect(filesInScope(root)).toContain('skills/a-skill/SKILL.md');
  });

  it('includes a claude/**/*.md file in scope when the tree exists', () => {
    const root = fixtureRoot();
    mkdirSync(join(root, 'claude'), { recursive: true });
    writeFileSync(join(root, 'claude', 'CLAUDE.md'), '# Fragment\n');
    expect(filesInScope(root)).toContain('claude/CLAUDE.md');
  });

  it('includes .claude/skills pages but skips captured exemplar pages', () => {
    const root = fixtureRoot();
    const refs = join(root, '.claude', 'skills', 'a-skill', 'references');
    mkdirSync(refs, { recursive: true });
    writeFileSync(join(refs, 'guide.md'), '# Guide\n');
    writeFileSync(join(refs, 'exemplar-capture.md'), '# Capture\n');
    const scope = filesInScope(root);
    expect(scope).toContain('.claude/skills/a-skill/references/guide.md');
    expect(scope).not.toContain('.claude/skills/a-skill/references/exemplar-capture.md');
  });

  it('omits claude/ from scope when the tree does not exist', () => {
    const root = fixtureRoot();
    expect(filesInScope(root).some((f) => f.startsWith('claude/'))).toBe(false);
  });

  it('fails a dead link inside a fixture skills/ tree', () => {
    const root = fixtureRoot();
    mkdirSync(join(root, 'skills', 'a-skill'), { recursive: true });
    writeFileSync(
      join(root, 'skills', 'a-skill', 'SKILL.md'),
      '# A skill\n\nsee [gone](./nowhere.md)\n'
    );
    const broken = findBrokenLinks(root);
    expect(broken).toHaveLength(1);
    expect(broken[0]).toMatchObject({ file: 'skills/a-skill/SKILL.md', dest: './nowhere.md' });
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
    expect(mismatch).toMatch(/MIGRATION-NOTES\.md/);
  });

  it('fails when only the migration notes carry an Unreleased heading', () => {
    const mismatch = unreleasedParityMismatch('## 0.91.0\n', '## Unreleased: a recipe\n');
    expect(mismatch).toMatch(/MIGRATION-NOTES\.md/);
    expect(mismatch).toMatch(/CHANGELOG\.md/);
  });

  // The 0.91.0 cut shipped exactly the drift this gate now catches: CHANGELOG.md's window was
  // renamed and the paired page's was not. Read the real, current files, since the whole point of
  // this gate is proving today's tree is in sync, not a synthetic pair of strings.
  it('agrees on the real, current CHANGELOG.md and MIGRATION-NOTES.md', () => {
    const root = resolve(__dirname, '../../..');
    const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
    const migrationNotes = readFileSync(resolve(root, 'MIGRATION-NOTES.md'), 'utf8');
    expect(unreleasedParityMismatch(changelog, migrationNotes)).toBeNull();
  });
});

// CHANGELOG.md is immutable, so its historical links keep the paths that were real when they
// shipped: a link from it into a docs/ page that no longer exists stands. Every other file's links
// stay checked against the tree, and the record's links to any other missing path still fail.
describe('the release record\'s links into retired docs pages', () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function fixtureRoot(files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), 'docs-links-record-'));
    tmpDirs.push(dir);
    const all: Record<string, string> = { 'CHANGELOG.md': '# Changelog\n', ...files };
    for (const [path, content] of Object.entries(all)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
    return dir;
  }

  it('accepts the release record\'s link into a retired docs page, anchor and all, and into a retired docs directory', () => {
    const root = fixtureRoot({
      'CHANGELOG.md': '# Changelog\n\nsee [doctor](docs/reference/cli-cairn-doctor.md#the-checks)\nsee [tidy](./docs/guides/enable-tidy.md)\nsee [the extend arm](docs/extend/)\n',
    });
    expect(findBrokenLinks(root)).toEqual([]);
  });

  it('still checks the anchor of a release-record link into a docs page that exists', () => {
    const root = fixtureRoot({
      'CHANGELOG.md': '# Changelog\n\nsee [x](docs/admin/x.md#gone)\n',
      'docs/admin/x.md': '# X\n',
    });
    expect(findBrokenLinks(root)).toEqual([
      { file: 'CHANGELOG.md', line: 3, dest: 'docs/admin/x.md#gone', reason: 'no heading "#gone" in docs/admin/x.md' },
    ]);
  });

  it('fails the release record\'s dead link outside docs/', () => {
    const root = fixtureRoot({ 'CHANGELOG.md': '# Changelog\n\nsee [gone](./NOPE.md)\n' });
    expect(findBrokenLinks(root)).toHaveLength(1);
  });

  it('fails the same retired-docs link written anywhere that is not the release record', () => {
    const root = fixtureRoot({ 'MIGRATION-NOTES.md': 'see [tidy](docs/extend/enable-tidy.md)\n' });
    expect(findBrokenLinks(root)).toEqual([
      { file: 'MIGRATION-NOTES.md', line: 1, dest: 'docs/extend/enable-tidy.md', reason: 'target not found: docs/extend/enable-tidy.md' },
    ]);
  });

  it('fails a docs page\'s dead link to a retired docs directory', () => {
    const root = fixtureRoot({ 'docs/internal/notes/x.md': 'see [the extend arm](../../extend/)\n' });
    expect(findBrokenLinks(root)).toHaveLength(1);
  });
});
