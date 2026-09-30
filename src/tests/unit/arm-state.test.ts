import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ARM_NAMES,
  DELETION_LIST_PATH,
  armOf,
  armState,
  loadDeletionList,
  readArmStates,
} from '../../../scripts/checks/arm-state.mjs';

const KEPT = ['docs/extend/migration-notes.md', 'docs/extend/upgrade-cairn.md', 'docs/extend/choose-an-ai-posture.md'];
const LIST = {
  deleted: ['docs/README.md', 'docs/why-cairn.md', 'docs/admin/is-it-working.md', 'docs/editors/welcome.md', 'docs/extend/architecture.md'],
  kept: KEPT,
};

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A temp repo root holding the given files and the deletion list (none when `list` is null). */
function tree(files: Record<string, string>, list: unknown = LIST): string {
  const root = mkdtempSync(join(tmpdir(), 'cairn-arm-state-'));
  roots.push(root);
  const all: Record<string, string> = { ...files };
  if (list !== null) all[DELETION_LIST_PATH] = typeof list === 'string' ? list : JSON.stringify(list);
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const page = (...paths: string[]) => Object.fromEntries(paths.map((p) => [p, '# Page\n']));

describe('armOf', () => {
  it('places a page in its arm, the two front-door files in the front door, and anything else nowhere', () => {
    expect(armOf('docs/admin/is-it-working.md')).toBe('admin');
    expect(armOf('docs/editors/sub/deep.md')).toBe('editors');
    expect(armOf('docs/extend/migration-notes.md')).toBe('extend');
    expect(armOf('docs/README.md')).toBe('front-door');
    expect(armOf('docs/why-cairn.md')).toBe('front-door');
    expect(armOf('docs/reference/core.md')).toBeNull();
    expect(armOf('docs/STATUS.md')).toBeNull();
    expect(armOf('docs/admin/diagram.png')).toBeNull();
  });
});

describe('armState: the three states', () => {
  it('reports absent when the arm directory is gone', () => {
    const root = tree(page('docs/reference/README.md'));
    expect(armState(root, 'admin')).toBe('absent');
  });

  it('reports absent when the arm directory holds no page at all', () => {
    const root = tree({ 'docs/editors/diagram.png': 'x' });
    expect(armState(root, 'editors')).toBe('absent');
  });

  it('reports kept-only when the arm holds only kept-set pages', () => {
    const root = tree(page(...KEPT));
    expect(armState(root, 'extend')).toBe('kept-only');
  });

  it('reports rebuilt when the arm holds a page outside the kept set, beside the kept pages', () => {
    const root = tree(page(...KEPT, 'docs/extend/a-new-page.md'));
    expect(armState(root, 'extend')).toBe('rebuilt');
  });

  it('reports rebuilt for a deletion-list page still on disk, so today\'s tree keeps every full check', () => {
    const root = tree(page('docs/admin/is-it-working.md'));
    expect(armState(root, 'admin')).toBe('rebuilt');
  });

  it('counts a page in a subdirectory of the arm', () => {
    const root = tree(page('docs/admin/deep/nested.md'));
    expect(armState(root, 'admin')).toBe('rebuilt');
  });

  it('reports the front door absent with neither file, and rebuilt with either', () => {
    expect(armState(tree(page('docs/reference/README.md')), 'front-door')).toBe('absent');
    expect(armState(tree(page('docs/README.md')), 'front-door')).toBe('rebuilt');
    expect(armState(tree(page('docs/why-cairn.md')), 'front-door')).toBe('rebuilt');
  });

  it('never reads a directory or an index existing as the trigger: an arm index alone is a page like any other', () => {
    // An index is a page outside the kept set, so it rebuilds the arm; an empty directory does not.
    const withIndex = tree(page(...KEPT, 'docs/extend/README.md'));
    expect(armState(withIndex, 'extend')).toBe('rebuilt');
    const root = tree({});
    mkdirSync(join(root, 'docs/admin'), { recursive: true });
    expect(armState(root, 'admin')).toBe('absent');
  });

  it('rejects an unknown arm name', () => {
    const root = tree({});
    expect(() => armState(root, 'reference')).toThrow(/unknown arm "reference"/);
  });
});

describe('readArmStates', () => {
  it('reports every arm at once', () => {
    const root = tree(page(...KEPT, 'docs/editors/welcome.md'));
    expect(readArmStates(root)).toEqual({ admin: 'absent', editors: 'rebuilt', extend: 'kept-only', 'front-door': 'absent' });
    expect(Object.keys(readArmStates(root))).toEqual(ARM_NAMES);
  });
});

describe('loadDeletionList: fails closed', () => {
  it('reads the committed list', () => {
    const root = resolve(__dirname, '../../..');
    const list = loadDeletionList(root);
    expect(list.kept).toEqual(KEPT);
    expect(list.deleted).toHaveLength(49);
  });

  it('throws when the list is absent, so no gate reads a missing list as an empty arm', () => {
    const root = tree(page(...KEPT), null);
    expect(() => loadDeletionList(root)).toThrow(/deletion-list\.json.*does not exist/);
    expect(() => readArmStates(root)).toThrow(/does not exist/);
  });

  it('throws on invalid JSON', () => {
    expect(() => loadDeletionList(tree({}, '{ nope'))).toThrow(/not valid JSON/);
  });

  it('throws when either array is missing or holds a non-string', () => {
    expect(() => loadDeletionList(tree({}, { deleted: [] }))).toThrow(/"deleted" and "kept"/);
    expect(() => loadDeletionList(tree({}, { deleted: [], kept: [3] }))).toThrow(/"deleted" and "kept"/);
    expect(() => loadDeletionList(tree({}, []))).toThrow(/"deleted" and "kept"/);
  });

  it('throws on a path in no arm', () => {
    expect(() => loadDeletionList(tree({}, { deleted: ['docs/reference/core.md'], kept: [] }))).toThrow(
      /docs\/reference\/core\.md is in no arm/,
    );
  });

  it('throws on a path listed twice, across or within the two lists', () => {
    expect(() =>
      loadDeletionList(tree({}, { deleted: ['docs/extend/upgrade-cairn.md'], kept: ['docs/extend/upgrade-cairn.md'] })),
    ).toThrow(/upgrade-cairn\.md appears more than once/);
  });
});
