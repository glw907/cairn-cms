import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest, gitTrackedFiles, hashBytes, hashFile, loadManifest, main, verifyTree, writeManifest } from '../../../scripts/docs-readers/freeze.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DOCS_READERS_ROOT = join(REPO_ROOT, 'scripts', 'docs-readers');

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

/** A real git repository in a fresh temp directory. */
function gitRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'docs-readers-gittrack-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}

describe('gitTrackedFiles: the real function against a real git repository', () => {
  it('lists a tracked file and an untracked, unignored file alike, but never a file ignored by .gitignore', () => {
    const root = gitRepo();
    try {
      writeFileSync(join(root, 'tracked.txt'), 'tracked\n');
      execFileSync('git', ['add', 'tracked.txt'], { cwd: root });
      writeFileSync(join(root, 'untracked.txt'), 'untracked\n');
      writeFileSync(join(root, '.gitignore'), 'ignored.txt\n');
      writeFileSync(join(root, 'ignored.txt'), 'ignored\n');
      const files = gitTrackedFiles(root);
      expect(files).toContain('tracked.txt');
      expect(files).toContain('untracked.txt');
      expect(files).not.toContain('ignored.txt');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('drops a tracked path removed from disk but still in the index, rather than let a caller hash a missing file', () => {
    const root = gitRepo();
    try {
      writeFileSync(join(root, 'tracked.txt'), 'tracked\n');
      execFileSync('git', ['add', 'tracked.txt'], { cwd: root });
      rmSync(join(root, 'tracked.txt'));
      expect(gitTrackedFiles(root)).not.toContain('tracked.txt');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('excludes anything under post-freeze/, tracked or not', () => {
    const root = gitRepo();
    try {
      mkdirSync(join(root, 'post-freeze'), { recursive: true });
      writeFileSync(join(root, 'post-freeze', 'manifest.json'), '{}\n');
      execFileSync('git', ['add', 'post-freeze/manifest.json'], { cwd: root });
      writeFileSync(join(root, 'post-freeze', 'chain.jsonl'), '\n');
      expect(gitTrackedFiles(root)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lists the three judge kinds\' frozen prompt files, so the manifest hash covers them', () => {
    const files = gitTrackedFiles(DOCS_READERS_ROOT);
    expect(files).toContain('prompts/catch-judge.md');
    expect(files).toContain('prompts/adjudicator.md');
    expect(files).toContain('prompts/agreement.md');
  });
});

describe('main: the build and verify subcommands', () => {
  const ALL_MODELS = ['--model', 'reader=claude-opus-5-5', '--model', 'catchJudge=claude-opus-5-5', '--model', 'adjudicator=claude-opus-5-5', '--model', 'agreement=fable'];

  it('refuses to build with usage unless all four models are given', () => {
    const root = mkdtempSync(join(tmpdir(), 'docs-readers-freeze-main-'));
    try {
      const out = join(root, 'manifest.json');
      const missingOne = ['build', '--tag', 't', '--out', out, '--image', 'sha256:x', '--cli-version', '2.1.280', '--model', 'reader=claude-opus-5-5'];
      expect(main(missingOne)).toBe(2);
      expect(() => readFileSync(out)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('builds with --build (the plan’s own alias), keeps a numeric seed as a number, and keeps a non-numeric seed as a string, never NaN', () => {
    const root = mkdtempSync(join(tmpdir(), 'docs-readers-freeze-main-'));
    try {
      const out = join(root, 'manifest.json');
      const code = main([
        '--build',
        '--tag', 'docs-reset-1b-freeze',
        '--out', out,
        '--image', 'sha256:x',
        '--cli-version', '2.1.280',
        ...ALL_MODELS,
        '--seed', 'oc=20260924',
        '--seed', 'label=docs-reset-1b-agreement',
      ]);
      expect(code).toBe(0);
      const { manifest } = loadManifest(out);
      expect(manifest.models).toEqual({ reader: 'claude-opus-5-5', catchJudge: 'claude-opus-5-5', adjudicator: 'claude-opus-5-5', agreement: 'fable' });
      expect(manifest.seeds.oc).toBe(20260924);
      expect(typeof manifest.seeds.oc).toBe('number');
      expect(manifest.seeds.label).toBe('docs-reset-1b-agreement');
      expect(JSON.stringify(manifest)).not.toContain('null');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('verifies with --verify (the plan’s own alias), passing dry against the manifest it just built', () => {
    const root = mkdtempSync(join(tmpdir(), 'docs-readers-freeze-main-'));
    try {
      const out = join(root, 'manifest.json');
      expect(main(['--build', '--tag', 't', '--out', out, '--image', 'sha256:x', '--cli-version', '2.1.280', ...ALL_MODELS])).toBe(0);
      expect(main(['--verify', '--manifest', out, '--image', 'sha256:x', '--cli-version', '2.1.280'])).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
