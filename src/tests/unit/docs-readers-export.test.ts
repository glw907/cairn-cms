import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXPORT_COMMIT_DATE,
  EXPORT_COMMIT_EMAIL,
  EXPORT_COMMIT_MESSAGE,
  EXPORT_COMMIT_NAME,
  REPOSITORY_EXCLUDED_PATHS,
  absentPaths,
  assertNoExcludedPaths,
  assertOneCleanCommit,
  assertPinnedCommit,
  exportGitEnv,
  isExcluded,
  normalizeMtimes,
  preparePlanterExport,
  prepareRepositoryExport,
  resolveCommit,
} from '../../../scripts/docs-readers/lib/prepare-class.js';
import { main as planterExportMain } from '../../../scripts/docs-readers/planter-export.js';
import { recordAbsentLists } from '../../../scripts/docs-readers/prepare-validation.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** The fixed instant, in milliseconds, every prepared file's mtime must equal. */
const FIXED_MS = Date.parse(EXPORT_COMMIT_DATE);

/** A fresh scratch directory, removed by the caller. */
function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `docs-readers-export-${prefix}-`));
}

/** Write a small text file, creating its parent directories. */
function write(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Run git in `cwd` with the caller's own environment, returning trimmed stdout. */
function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd }).toString().trim();
}

/** Run git against a prepared tree the way a reader would, isolated from any host config. */
function readerGit(dir: string, args: string[]): string {
  return execFileSync('git', args, { cwd: dir, env: exportGitEnv(dir) }).toString();
}

/** Commit every file under `repoRoot`, initializing it first when needed, and return the commit id. */
function commitAll(repoRoot: string, message = 'source commit'): string {
  if (!existsSync(join(repoRoot, '.git'))) {
    git(repoRoot, ['init', '-q']);
    git(repoRoot, ['config', 'user.email', 'source@example.com']);
    git(repoRoot, ['config', 'user.name', 'Source']);
  }
  git(repoRoot, ['add', '-A']);
  git(repoRoot, ['commit', '-q', '-m', message]);
  return git(repoRoot, ['rev-parse', 'HEAD']);
}

/**
 * Every path, directory, and symlink under `dir`, `dir` included, whose own mtime is not the fixed
 * instant, read with `lstat` so a symlink is judged by its own time.
 */
function offTimePaths(dir: string): string[] {
  const off: string[] = [];
  const walk = (current: string): void => {
    if (lstatSync(current).mtimeMs !== FIXED_MS) off.push(current);
    if (!lstatSync(current).isDirectory()) return;
    for (const name of readdirSync(current)) walk(join(current, name));
  };
  walk(dir);
  return off;
}

/** Every file's raw bytes under `dir`, `.git` included, as one string for a leak search. */
function rawTreeText(dir: string): string {
  const parts: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) parts.push(readFileSync(full, 'latin1'));
    }
  };
  walk(dir);
  return parts.join('\n');
}

/** A source repository carrying one of every path the repository exclusions name, plus kept files. */
function sourceWithExcludedPaths(): { repoRoot: string; commit: string; excluded: string[]; kept: string[] } {
  const repoRoot = tmp('source');
  const excluded = [
    'docs/HISTORY.md',
    'docs/STATUS.md',
    'ROADMAP.md',
    'docs/internal/docs-friction-log.md',
    'docs/internal/record/2026-01-01-note.md',
    'docs/superpowers/plans/plan.md',
    'scripts/docs-readers/run.ts',
    'scripts/docs-readers/fixtures/dev-items.json',
    'src/tests/unit/docs-readers-batch.test.ts',
    'src/tests/unit/docs-readers-export.test.ts',
  ];
  const kept = ['README.md', 'CONTRIBUTING.md', 'docs/internal/facts/admin.md', 'src/tests/unit/other.test.ts', 'scripts/check.mjs'];
  for (const path of [...excluded, ...kept]) write(join(repoRoot, path), `content of ${path}\n`);
  return { repoRoot, commit: commitAll(repoRoot), excluded, kept };
}

describe('assertPinnedCommit', () => {
  it('refuses HEAD, a branch name, and an id the checkout does not hold', () => {
    const repoRoot = tmp('pin');
    try {
      write(join(repoRoot, 'a.md'), 'a\n');
      const commit = commitAll(repoRoot);
      expect(() => assertPinnedCommit(repoRoot, 'HEAD')).toThrow(/not a pinned commit id/);
      expect(() => assertPinnedCommit(repoRoot, 'main')).toThrow(/not a pinned commit id/);
      expect(() => assertPinnedCommit(repoRoot, 'deadbeefdeadbeef')).toThrow(/does not exist/);
      expect(() => assertPinnedCommit(repoRoot, commit)).not.toThrow();
      expect(() => assertPinnedCommit(repoRoot, commit.slice(0, 8))).not.toThrow();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('assertOneCleanCommit', () => {
  it('rejects a tree with two commits', () => {
    const dir = tmp('two-commits');
    try {
      write(join(dir, 'a.md'), 'first\n');
      commitAll(dir, 'one');
      write(join(dir, 'a.md'), 'second\n');
      commitAll(dir, 'two');
      expect(() => assertOneCleanCommit(dir)).toThrow(/carries 2 commits/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a one-commit tree with a modified file, and one with an untracked file', () => {
    const dir = tmp('dirty');
    try {
      write(join(dir, 'a.md'), 'committed\n');
      commitAll(dir);
      expect(() => assertOneCleanCommit(dir)).not.toThrow();
      write(join(dir, 'a.md'), 'changed after the commit\n');
      expect(() => assertOneCleanCommit(dir)).toThrow(/dirty git status/);
      git(dir, ['checkout', '--', 'a.md']);
      write(join(dir, 'new/b.md'), 'never committed\n');
      expect(() => assertOneCleanCommit(dir)).toThrow(/dirty git status/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a tree with no repository at all', () => {
    const dir = tmp('no-git');
    try {
      write(join(dir, 'a.md'), 'a\n');
      expect(() => assertOneCleanCommit(dir)).toThrow(/carries no git repository/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('normalizeMtimes', () => {
  it('sets every file, directory, and symlink, the root included, to the fixed instant', () => {
    const dir = tmp('mtimes');
    try {
      write(join(dir, 'a/b/c.md'), 'c\n');
      write(join(dir, 'd.md'), 'd\n');
      execFileSync('ln', ['-s', 'b/c.md', join(dir, 'a/link')]);
      normalizeMtimes(dir);
      expect(offTimePaths(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('prepareRepositoryExport: the synthetic commit', () => {
  it('carries exactly one commit under the neutral identity, a clean status, and the fixed mtime on every path', () => {
    const { repoRoot, commit } = sourceWithExcludedPaths();
    const dest = tmp('dest');
    try {
      prepareRepositoryExport({ repoRoot, commit, dest });
      expect(() => assertOneCleanCommit(dest)).not.toThrow();
      expect(readerGit(dest, ['log', '--format=%an|%ae|%aI|%cn|%ce|%cI|%B']).trim()).toBe(
        [EXPORT_COMMIT_NAME, EXPORT_COMMIT_EMAIL, '2000-01-01T00:00:00Z', EXPORT_COMMIT_NAME, EXPORT_COMMIT_EMAIL, '2000-01-01T00:00:00Z', EXPORT_COMMIT_MESSAGE].join('|'),
      );
      expect(offTimePaths(dest)).toEqual([]);
    } finally {
      for (const dir of [repoRoot, dest]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('tracks a file the source commit tracked even when the export’s own .gitignore matches it', () => {
    const repoRoot = tmp('ignored-source');
    const dest = tmp('ignored-dest');
    try {
      write(join(repoRoot, '.gitignore'), 'notes/\n');
      write(join(repoRoot, 'README.md'), '# a project\n');
      commitAll(repoRoot);
      write(join(repoRoot, 'notes/kept.md'), 'tracked despite the ignore rule\n');
      git(repoRoot, ['add', '-f', 'notes/kept.md']);
      const commit = commitAll(repoRoot, 'force-add');
      prepareRepositoryExport({ repoRoot, commit, dest });
      expect(readerGit(dest, ['ls-files']).split('\n')).toContain('notes/kept.md');
    } finally {
      for (const dir of [repoRoot, dest]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ignores a host identity, hook path, template directory, and author variables', () => {
    const { repoRoot, commit } = sourceWithExcludedPaths();
    const dest = tmp('isolated-dest');
    const host = tmp('host-config');
    const hostEmail = 'host-leak@example.com';
    const hookMarker = join(host, 'hook-ran');
    const leakKeys = ['GIT_CONFIG_GLOBAL', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_EMAIL', 'EMAIL'] as const;
    const saved = Object.fromEntries(leakKeys.map((key) => [key, process.env[key]]));
    try {
      const hooks = join(host, 'hooks');
      for (const hook of ['pre-commit', 'commit-msg', 'post-commit']) {
        write(join(hooks, hook), `#!/bin/sh\ntouch ${hookMarker}\n`);
        chmodSync(join(hooks, hook), 0o755);
      }
      write(join(host, 'template/description'), `${hostEmail}\n`);
      write(join(host, 'template/hooks/post-commit'), `#!/bin/sh\ntouch ${hookMarker}\n`);
      chmodSync(join(host, 'template/hooks/post-commit'), 0o755);
      write(
        join(host, 'gitconfig'),
        `[user]\n\tname = Host Leak\n\temail = ${hostEmail}\n[core]\n\thooksPath = ${hooks}\n[init]\n\ttemplateDir = ${join(host, 'template')}\n`,
      );
      process.env.GIT_CONFIG_GLOBAL = join(host, 'gitconfig');
      process.env.GIT_AUTHOR_EMAIL = hostEmail;
      process.env.GIT_COMMITTER_EMAIL = hostEmail;
      process.env.EMAIL = hostEmail;
      prepareRepositoryExport({ repoRoot, commit, dest });
      expect(existsSync(hookMarker)).toBe(false);
      expect(readerGit(dest, ['cat-file', '-p', 'HEAD'])).not.toContain(hostEmail);
      expect(rawTreeText(dest)).not.toContain(hostEmail);
      expect(existsSync(join(dest, '.git/hooks'))).toBe(false);
    } finally {
      for (const key of leakKeys) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
      for (const dir of [repoRoot, dest, host]) rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('exclusions and absent lists', () => {
  it('matches a directory entry by prefix, a pattern within its last segment, and an exact path exactly', () => {
    expect(isExcluded('docs/superpowers/', 'docs/superpowers/plans/p.md')).toBe(true);
    expect(isExcluded('docs/superpowers/', 'docs/superpowers-notes.md')).toBe(false);
    expect(isExcluded('src/tests/unit/docs-readers-*', 'src/tests/unit/docs-readers-run.test.ts')).toBe(true);
    expect(isExcluded('src/tests/unit/docs-readers-*', 'src/tests/unit/nested/docs-readers-run.test.ts')).toBe(false);
    expect(isExcluded('ROADMAP.md', 'ROADMAP.md')).toBe(true);
    expect(isExcluded('ROADMAP.md', 'docs/ROADMAP.md')).toBe(false);
  });

  it('expands a pattern to the paths it matches and keeps every other entry as written', () => {
    const tracked = ['src/tests/unit/docs-readers-b.test.ts', 'src/tests/unit/docs-readers-a.test.ts', 'src/tests/unit/other.test.ts', 'README.md'];
    expect(absentPaths(['docs/superpowers/', 'src/tests/unit/docs-readers-*', 'ROADMAP.md'], tracked)).toEqual([
      'docs/superpowers/',
      'src/tests/unit/docs-readers-a.test.ts',
      'src/tests/unit/docs-readers-b.test.ts',
      'ROADMAP.md',
    ]);
  });

  it('fails the post-export check on a pattern match that survived', () => {
    const dir = tmp('survived-pattern');
    try {
      write(join(dir, 'src/tests/unit/docs-readers-run.test.ts'), 'x');
      expect(() => assertNoExcludedPaths(dir)).toThrow(/src\/tests\/unit\/docs-readers-run\.test\.ts/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes exactly a builder’s own exclusions into the job file’s absent list, and neither path is in its tree', () => {
    const { repoRoot, commit } = sourceWithExcludedPaths();
    const dest = tmp('fixture-builder');
    const batchDir = tmp('batch');
    try {
      const exclusions = ['docs/HISTORY.md', 'scripts/docs-readers/'];
      const { absent } = prepareRepositoryExport({ repoRoot, commit, dest, exclusions });
      const batchPath = join(batchDir, 'batch.json');
      const other = join(batchDir, 'other-control');
      writeFileSync(
        batchPath,
        JSON.stringify({ name: 'b', concurrency: 1, budgetTokens: 1, jobs: [{ id: 'fixture-1', prepared: dest, commit }, { id: 'other-1', prepared: other }] }),
      );
      recordAbsentLists(batchPath, new Map([[dest, absent]]));
      const written = JSON.parse(readFileSync(batchPath, 'utf8')) as { jobs: Array<{ id: string; absent?: string[] }> };
      expect(written.jobs[0].absent).toEqual(exclusions);
      expect(written.jobs[1].absent).toBeUndefined();
      for (const path of exclusions) expect(existsSync(join(dest, path))).toBe(false);
      // A path the builder did not exclude is still exported, so the absent list is the builder's own.
      expect(existsSync(join(dest, 'docs/STATUS.md'))).toBe(true);
    } finally {
      for (const dir of [repoRoot, dest, batchDir]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps every excluded path out of a repository export and derives its absent list from the default exclusions', () => {
    const { repoRoot, commit, excluded, kept } = sourceWithExcludedPaths();
    const dest = tmp('repo-export');
    try {
      const { absent } = prepareRepositoryExport({ repoRoot, commit, dest });
      for (const path of excluded) expect(existsSync(join(dest, path)), path).toBe(false);
      for (const path of kept) expect(existsSync(join(dest, path)), path).toBe(true);
      expect(readerGit(dest, ['ls-files']).split('\n').filter((path) => REPOSITORY_EXCLUDED_PATHS.some((entry) => isExcluded(entry, path)))).toEqual([]);
      expect(absent).toEqual([
        'docs/internal/record/',
        'docs/superpowers/',
        'scripts/docs-readers/',
        'src/tests/unit/docs-readers-batch.test.ts',
        'src/tests/unit/docs-readers-export.test.ts',
        'docs/HISTORY.md',
        'docs/STATUS.md',
        'ROADMAP.md',
        'docs/internal/docs-friction-log.md',
      ]);
    } finally {
      for (const dir of [repoRoot, dest]) rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('preparePlanterExport', () => {
  it('writes a plain tree with no .git and none of the excluded paths', () => {
    const { repoRoot, commit, excluded, kept } = sourceWithExcludedPaths();
    const dest = tmp('planter');
    try {
      preparePlanterExport({ repoRoot, commit, dest });
      expect(existsSync(join(dest, '.git'))).toBe(false);
      for (const path of excluded) expect(existsSync(join(dest, path)), path).toBe(false);
      for (const path of kept) expect(existsSync(join(dest, path)), path).toBe(true);
    } finally {
      for (const dir of [repoRoot, dest]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses HEAD through its command line, and exports a named commit', () => {
    const { repoRoot, commit } = sourceWithExcludedPaths();
    const dest = tmp('planter-cli');
    try {
      expect(() => planterExportMain(['--commit', 'HEAD', '--out', dest], repoRoot)).toThrow(/not a pinned commit id/);
      expect(() => planterExportMain(['--out', dest], repoRoot)).toThrow(/usage/);
      planterExportMain(['--commit', commit, '--out', dest], repoRoot);
      expect(existsSync(join(dest, 'README.md'))).toBe(true);
    } finally {
      for (const dir of [repoRoot, dest]) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps every excluded path out of this repository’s own export, the harness tests and fixtures included', { timeout: 60_000 }, () => {
    const dest = tmp('planter-real');
    try {
      const commit = resolveCommit(ROOT, 'HEAD');
      const { absent } = preparePlanterExport({ repoRoot: ROOT, commit, dest });
      expect(existsSync(join(dest, '.git'))).toBe(false);
      expect(existsSync(join(dest, 'package.json'))).toBe(true);
      for (const entry of REPOSITORY_EXCLUDED_PATHS.filter((path) => !path.includes('*'))) expect(existsSync(join(dest, entry)), entry).toBe(false);
      expect(readdirSync(join(dest, 'src/tests/unit')).filter((name) => name.startsWith('docs-readers-'))).toEqual([]);
      expect(existsSync(join(dest, 'scripts/docs-readers/fixtures'))).toBe(false);
      expect(absent.filter((path) => path.startsWith('src/tests/unit/docs-readers-')).length).toBeGreaterThan(0);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});
