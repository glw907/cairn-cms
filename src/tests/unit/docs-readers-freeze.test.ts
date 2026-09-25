import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildManifest, hashBytes, hashFile, loadManifest, verifyTree, writeManifest } from '../../../scripts/docs-readers/freeze.js';

/** A small fixture tree of two tracked files, for a manifest that does not need real git. */
function fixtureTree(): { root: string; listFiles: () => string[] } {
  const root = mkdtempSync(join(tmpdir(), 'docs-readers-freeze-'));
  mkdirSync(join(root, 'lib'), { recursive: true });
  writeFileSync(join(root, 'a.txt'), 'a\n');
  writeFileSync(join(root, 'lib', 'b.txt'), 'b\n');
  return { root, listFiles: () => ['a.txt', 'lib/b.txt'] };
}

describe('hashBytes and hashFile', () => {
  it('hashes a file to the same sha256 as its bytes', () => {
    const root = mkdtempSync(join(tmpdir(), 'docs-readers-freeze-'));
    try {
      const file = join(root, 'x.txt');
      writeFileSync(file, 'hello\n');
      expect(hashFile(file)).toBe(hashBytes('hello\n'));
      expect(hashFile(file)).toHaveLength(64);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('buildManifest, writeManifest, and loadManifest', () => {
  it('hashes every file listFiles names, and round-trips through disk with a stable manifestHash', () => {
    const { root, listFiles } = fixtureTree();
    try {
      const manifest = buildManifest({
        tag: 'docs-reset-1b-freeze',
        root,
        imageId: 'sha256:image',
        cliVersion: '2.1.280',
        models: { reader: 'claude-opus-5-5', catchJudge: 'claude-opus-5-5', adjudicator: 'claude-opus-5-5', agreement: 'fable' },
        jobs: { 'job-a': 'deadbeef' },
        heldOutPins: { 'docs/reference/cli-cairn-doctor.md': '3453668f' },
        seeds: { oc: 20260924 },
        listFiles,
      });
      expect(Object.keys(manifest.files)).toEqual(['a.txt', 'lib/b.txt']);
      expect(manifest.files['a.txt']).toBe(hashFile(join(root, 'a.txt')));

      const manifestPath = join(root, 'manifest.json');
      const { hash } = writeManifest(manifest, manifestPath);
      const loaded = loadManifest(manifestPath);
      expect(loaded.manifest).toEqual(manifest);
      expect(loaded.hash).toBe(hash);
      // The same bytes hash the same way a second time, so the stamp a gated batch carries is stable.
      expect(hashBytes(readFileSync(manifestPath))).toBe(hash);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('verifyTree', () => {
  function baseManifest(root: string, listFiles: () => string[]) {
    return buildManifest({
      tag: 'docs-reset-1b-freeze',
      root,
      imageId: 'sha256:image',
      cliVersion: '2.1.280',
      models: { reader: 'claude-opus-5-5', catchJudge: 'claude-opus-5-5', adjudicator: 'claude-opus-5-5', agreement: 'fable' },
      jobs: { 'job-a': 'deadbeef' },
      heldOutPins: {},
      seeds: {},
      listFiles,
    });
  }

  it('reports no problems when nothing has drifted', () => {
    const { root, listFiles } = fixtureTree();
    try {
      const manifest = baseManifest(root, listFiles);
      const problems = verifyTree({ manifest, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: { 'job-a': 'deadbeef' }, listFiles });
      expect(problems).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('names a file changed by one byte', () => {
    const { root, listFiles } = fixtureTree();
    try {
      const manifest = baseManifest(root, listFiles);
      writeFileSync(join(root, 'a.txt'), 'A\n');
      const problems = verifyTree({ manifest, root, imageId: 'sha256:image', cliVersion: '2.1.280', listFiles });
      expect(problems).toEqual(['file changed: a.txt']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('names a file added since the manifest, and a file removed from the tree', () => {
    const { root, listFiles } = fixtureTree();
    try {
      const manifest = baseManifest(root, listFiles);
      writeFileSync(join(root, 'c.txt'), 'c\n');
      const problems = verifyTree({
        manifest,
        root,
        imageId: 'sha256:image',
        cliVersion: '2.1.280',
        listFiles: () => ['a.txt', 'c.txt'],
      });
      expect(problems).toEqual(['file added: c.txt', 'file removed: lib/b.txt']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('names a changed image id and CLI version', () => {
    const { root, listFiles } = fixtureTree();
    try {
      const manifest = baseManifest(root, listFiles);
      const problems = verifyTree({ manifest, root, imageId: 'sha256:other', cliVersion: '2.1.281', listFiles });
      expect(problems).toEqual([
        'image id: manifest has sha256:image, current is sha256:other',
        'CLI version: manifest has 2.1.280, current is 2.1.281',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('names a job commit that differs from the manifest, and a job the manifest never pinned', () => {
    const { root, listFiles } = fixtureTree();
    try {
      const manifest = baseManifest(root, listFiles);
      const problems = verifyTree({
        manifest,
        root,
        imageId: 'sha256:image',
        cliVersion: '2.1.280',
        jobs: { 'job-a': 'other-commit', 'job-b': 'anything' },
        listFiles,
      });
      expect(problems).toEqual(['job job-a commit: manifest has deadbeef, batch has other-commit', 'job job-b: not in the manifest']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
