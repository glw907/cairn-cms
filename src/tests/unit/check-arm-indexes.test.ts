import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { findUnindexedPages } from '../../../scripts/checks/check-arm-indexes.mjs';
import { DELETION_LIST_PATH } from '../../../scripts/checks/arm-state.mjs';

const KEPT = ['docs/extend/migration-notes.md', 'docs/extend/upgrade-cairn.md', 'docs/extend/choose-an-ai-posture.md'];
const LIST = { deleted: ['docs/README.md', 'docs/why-cairn.md', 'docs/admin/is-it-working.md'], kept: KEPT };

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * A temp repo root with the two always-present indexes (reference and internal), the deletion
 * list, and the given files.
 */
function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'cairn-arm-indexes-'));
  roots.push(root);
  const all: Record<string, string> = {
    'docs/reference/README.md': '# Reference\n',
    'docs/internal/README.md': '# Internal\n',
    [DELETION_LIST_PATH]: JSON.stringify(LIST),
    ...files,
  };
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const pages = (...paths: string[]) => Object.fromEntries(paths.map((p) => [p, '# Page\n']));
/** An index at `docs/<arm>/README.md` linking each named file in the same directory. */
const indexLinking = (...names: string[]) => names.map((name) => `- [${name}](${name})`).join('\n') + '\n';

describe('findUnindexedPages: the absent state', () => {
  it('passes with the admin, editors, and extend arms and the front door all gone', () => {
    expect(findUnindexedPages(tree({}))).toEqual([]);
  });
});

describe('findUnindexedPages: the extend arm in each state', () => {
  it('passes the kept set alone, with no extend index', () => {
    expect(findUnindexedPages(tree(pages(...KEPT)))).toEqual([]);
  });

  it('fails the kept set plus one new page with no index', () => {
    const root = tree(pages(...KEPT, 'docs/extend/a-new-page.md'));
    expect(() => findUnindexedPages(root)).toThrow(/arm index not found: docs\/extend\/README\.md/);
  });

  it('passes the same tree once the index links every page in the arm', () => {
    const root = tree({
      ...pages(...KEPT, 'docs/extend/a-new-page.md'),
      'docs/extend/README.md': indexLinking('migration-notes.md', 'upgrade-cairn.md', 'choose-an-ai-posture.md', 'a-new-page.md'),
    });
    expect(findUnindexedPages(root)).toEqual([]);
  });

  it('fails a rebuilt arm whose index skips a kept page, since the full check covers the whole arm', () => {
    const root = tree({
      ...pages(...KEPT, 'docs/extend/a-new-page.md'),
      'docs/extend/README.md': indexLinking('upgrade-cairn.md', 'choose-an-ai-posture.md', 'a-new-page.md'),
    });
    expect(findUnindexedPages(root)).toEqual([
      { arm: 'docs/extend', page: 'docs/extend/migration-notes.md', index: 'docs/extend/README.md' },
    ]);
  });
});

describe('findUnindexedPages: the admin arm regaining a page', () => {
  it('fails an admin page with no index', () => {
    expect(() => findUnindexedPages(tree(pages('docs/admin/is-it-working.md')))).toThrow(
      /arm index not found: docs\/admin\/README\.md/,
    );
  });

  it('fails an admin page its index does not link', () => {
    const root = tree({ ...pages('docs/admin/is-it-working.md', 'docs/admin/other.md'), 'docs/admin/README.md': indexLinking('other.md') });
    expect(findUnindexedPages(root)).toEqual([
      { arm: 'docs/admin', page: 'docs/admin/is-it-working.md', index: 'docs/admin/README.md' },
    ]);
  });
});

describe('findUnindexedPages: the front door', () => {
  it('fails a rebuilt front door that does not link the evaluator page', () => {
    const root = tree({ 'docs/README.md': '# Docs\n', 'docs/why-cairn.md': '# Why\n' });
    expect(findUnindexedPages(root)).toEqual([{ arm: 'front door', page: 'docs/why-cairn.md', index: 'docs/README.md' }]);
  });

  it('passes a rebuilt front door that links it', () => {
    const root = tree({ 'docs/README.md': '[Why](why-cairn.md)\n', 'docs/why-cairn.md': '# Why\n' });
    expect(findUnindexedPages(root)).toEqual([]);
  });
});

describe('findUnindexedPages: the arms it always checks', () => {
  it('still fails an unindexed reference page, whatever the narrative arms hold', () => {
    const root = tree(pages('docs/reference/core.md'));
    expect(findUnindexedPages(root)).toEqual([
      { arm: 'docs/reference', page: 'docs/reference/core.md', index: 'docs/reference/README.md' },
    ]);
  });

  it('fails closed without the deletion list', () => {
    const root = tree({});
    rmSync(join(root, DELETION_LIST_PATH));
    expect(() => findUnindexedPages(root)).toThrow(/deletion-list\.json does not exist/);
  });

  it('passes on the real tree', () => {
    expect(findUnindexedPages(resolve(__dirname, '../../..'))).toEqual([]);
  });
});
