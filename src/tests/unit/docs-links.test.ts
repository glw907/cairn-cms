import { describe, it, expect, afterEach } from 'vitest';
import {
  headingAnchors,
  linksIn,
  blankInlineCode,
  isExternal,
  filesInScope,
  findBrokenLinks,
  checkLinks,
  hasUnreleasedHeading,
  unreleasedParityMismatch,
  legacyTarget,
  legacyMapProblems,
} from '../../../scripts/checks/docs-links.mjs';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { DELETION_LIST_PATH } from '../../../scripts/checks/arm-state.mjs';

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
    mkdirSync(join(dir, dirname(DELETION_LIST_PATH)), { recursive: true });
    writeFileSync(join(dir, DELETION_LIST_PATH), JSON.stringify({ deleted: [], kept: [] }));
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
    expect(legacyTarget('CHANGELOG.md', 'docs/guides/upgrade-cairn.md')).toBe(
      'docs/extend/upgrade-cairn.md'
    );
  });

  it('resolves the same path written with a leading ./ or carrying an anchor', () => {
    expect(legacyTarget('CHANGELOG.md', './docs/guides/upgrade-cairn.md')).toBe(
      'docs/extend/upgrade-cairn.md'
    );
    expect(legacyTarget('CHANGELOG.md', 'docs/guides/upgrade-cairn.md#precondition')).toBe(
      'docs/extend/upgrade-cairn.md'
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
      'docs/reference/core.md': 'docs/extend/upgrade-cairn.md',
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('docs/reference/core.md');
    expect(problems[0]).toContain('exists again');
  });

  it('fails a key that no CHANGELOG link names', () => {
    const problems = legacyMapProblems(root, {
      'docs/guides/never-cited-anywhere.md': 'docs/extend/upgrade-cairn.md',
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('never-cited-anywhere.md');
    expect(problems[0]).toContain('no CHANGELOG.md link names');
  });
});

// The harvest deletes the old narrative pages while dated records keep linking to them. A dated
// record is immutable, so its links into deletion-list paths are accepted permanently; the same
// link anywhere else stays broken. A LEGACY_PATH_MAP value on the deletion list is accepted only
// until its arm is rebuilt (arm-state.mjs), when the entry has to be repointed at a live page.
describe('deletion-list links', () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  const KEPT = ['docs/extend/migration-notes.md', 'docs/extend/upgrade-cairn.md', 'docs/extend/choose-an-ai-posture.md'];
  const LIST = { deleted: ['docs/admin/is-it-working.md', 'docs/extend/enable-tidy.md', 'docs/why-cairn.md'], kept: KEPT };

  function fixtureRoot(files: Record<string, string>, { list = true } = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'docs-links-harvest-'));
    tmpDirs.push(dir);
    const all: Record<string, string> = { 'CHANGELOG.md': '# Changelog\n', ...files };
    if (list) all[DELETION_LIST_PATH] = JSON.stringify(LIST);
    for (const [path, content] of Object.entries(all)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
    return dir;
  }

  it('accepts a dated record\'s link into a deleted page, anchor and all, from each dated tree', () => {
    const root = fixtureRoot({
      'CHANGELOG.md': '# Changelog\n\nsee [check](docs/admin/is-it-working.md#force-https-at-the-edge)\n',
      'docs/internal/record/2026-09-01-x.md': 'see [tidy](../../extend/enable-tidy.md)\n',
      'docs/internal/history/old.md': 'see [why](../../why-cairn.md)\n',
      'docs/internal/feedback/note.md': 'see [check](../../admin/is-it-working.md)\n',
      'docs/internal/record/2026-09-02-y.md': 'see [the editors arm](../../editors/)\n',
    });
    expect(findBrokenLinks(root)).toEqual([]);
  });

  it('fails a non-dated file\'s link to a deleted arm\'s directory', () => {
    const root = fixtureRoot({ 'docs/reference/core.md': 'see [the editors arm](../editors/)\n' });
    expect(findBrokenLinks(root)).toHaveLength(1);
  });

  it('fails the same link written anywhere that is not a dated record', () => {
    const root = fixtureRoot({ 'docs/reference/core.md': 'see [tidy](../extend/enable-tidy.md)\n' });
    expect(findBrokenLinks(root)).toEqual([
      { file: 'docs/reference/core.md', line: 1, dest: '../extend/enable-tidy.md', reason: 'target not found: ../extend/enable-tidy.md' },
    ]);
  });

  it('fails a dated record\'s dead link to a path the deletion list does not name', () => {
    const root = fixtureRoot({ 'docs/internal/record/x.md': 'see [gone](../../extend/never-existed.md)\n' });
    expect(findBrokenLinks(root)).toHaveLength(1);
  });

  it('fails a dated record\'s link to a kept page that is gone, since only deleted pages are excused', () => {
    const root = fixtureRoot({ 'docs/internal/record/x.md': 'see [notes](../../extend/migration-notes.md)\n' });
    expect(findBrokenLinks(root)).toHaveLength(1);
  });

  it('fails closed without the deletion list', () => {
    const root = fixtureRoot({}, { list: false });
    expect(() => findBrokenLinks(root)).toThrow(/deletion-list\.json does not exist/);
  });

  describe('a LEGACY_PATH_MAP value on the deletion list', () => {
    const changelog = '# Changelog\n\nsee [tidy](docs/guides/enable-tidy.md)\n';
    const map = { 'docs/guides/enable-tidy.md': 'docs/extend/enable-tidy.md' };

    it('is accepted while its arm holds only the kept set', () => {
      const root = fixtureRoot({ 'CHANGELOG.md': changelog, ...Object.fromEntries(KEPT.map((p) => [p, '# Kept\n'])) });
      expect(legacyMapProblems(root, map)).toEqual([]);
    });

    it('is accepted while its arm is absent', () => {
      const root = fixtureRoot({ 'CHANGELOG.md': changelog });
      expect(legacyMapProblems(root, map)).toEqual([]);
    });

    it('fails once its arm is rebuilt without the page, so the entry gets repointed', () => {
      const root = fixtureRoot({ 'CHANGELOG.md': changelog, 'docs/extend/a-new-page.md': '# New\n' });
      const problems = legacyMapProblems(root, map);
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('docs/extend/enable-tidy.md');
      expect(problems[0]).toContain('no longer exists');
    });

    it('still fails a missing value the deletion list does not name, in any arm state', () => {
      const root = fixtureRoot({ 'CHANGELOG.md': changelog });
      const problems = legacyMapProblems(root, { 'docs/guides/enable-tidy.md': 'docs/extend/no-such-page.md' });
      expect(problems).toEqual([expect.stringContaining('docs/extend/no-such-page.md')]);
    });
  });
});

// During an arm's rebuild, pages link forward to outline pages a later stage has not drafted. A link
// to a path a committed outline names passes as pending; a path in no outline still fails.
describe('forward links to outline pages', () => {
  const tmpDirs: string[] = [];
  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function fixtureRoot(files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), 'docs-links-outline-'));
    tmpDirs.push(dir);
    const all: Record<string, string> = {
      'CHANGELOG.md': '# Changelog\n',
      [DELETION_LIST_PATH]: JSON.stringify({ deleted: [], kept: [] }),
      'docs/internal/outlines/extend.json': JSON.stringify({
        arm: 'extend',
        pages: [{ path: 'docs/extend/later-page.md' }, { path: 'docs/extend/another-page.md' }],
      }),
      ...files,
    };
    for (const [path, content] of Object.entries(all)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
    return dir;
  }

  it('passes a link to an outline page not on disk and counts it pending', () => {
    const root = fixtureRoot({ 'docs/extend/here.md': 'see [later](later-page.md) and [more](./another-page.md)\n' });
    const { broken, pending } = checkLinks(root);
    expect(broken).toEqual([]);
    expect(pending).toHaveLength(2);
    expect(pending[0]).toMatchObject({ file: 'docs/extend/here.md', line: 1, dest: 'later-page.md' });
    expect(findBrokenLinks(root)).toEqual([]);
  });

  it('fails a link to a path in no outline', () => {
    const root = fixtureRoot({ 'docs/extend/here.md': 'see [gone](never-planned.md)\n' });
    const { broken, pending } = checkLinks(root);
    expect(pending).toEqual([]);
    expect(broken).toEqual([
      { file: 'docs/extend/here.md', line: 1, dest: 'never-planned.md', reason: 'target not found: never-planned.md' },
    ]);
  });

  it('does not check the anchor on a pending link', () => {
    const root = fixtureRoot({ 'docs/extend/here.md': 'see [later](later-page.md#no-such-heading)\n' });
    const { broken, pending } = checkLinks(root);
    expect(broken).toEqual([]);
    expect(pending).toHaveLength(1);
  });

  it('checks the anchor once the outline page exists on disk', () => {
    const root = fixtureRoot({
      'docs/extend/here.md': 'see [later](later-page.md#no-such-heading)\n',
      'docs/extend/later-page.md': '# Later\n',
    });
    const { broken, pending } = checkLinks(root);
    expect(pending).toEqual([]);
    expect(broken).toHaveLength(1);
  });

  it('goes strict again once the outline is gone', () => {
    const root = fixtureRoot({ 'docs/extend/here.md': 'see [later](later-page.md)\n' });
    rmSync(join(root, 'docs/internal/outlines'), { recursive: true });
    expect(checkLinks(root).broken).toHaveLength(1);
  });
});
