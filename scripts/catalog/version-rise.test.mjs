// The version-rise check's contract, run against a scratch git repository: a changed catalog
// directory must carry a manifest whose version rose by SemVer precedence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';

const SCRIPT = path.join(repoRoot(import.meta.url), 'scripts/catalog/version-rise.mjs');

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** Writes a theme or set directory with a manifest at `version` and one content file. */
function write(cwd, dir, manifest, version, body) {
  mkdirSync(path.join(cwd, dir), { recursive: true });
  writeFileSync(path.join(cwd, dir, manifest), JSON.stringify({ version }));
  writeFileSync(path.join(cwd, dir, 'file.txt'), body);
}

/** Commits everything and returns the new HEAD sha. */
function commit(cwd, message) {
  git(cwd, 'add', '-A');
  git(cwd, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
}

/** Builds a repo with a base commit, applies `change`, and runs the script over the range. */
function run(change, extraArgs) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'version-rise-'));
  try {
    git(cwd, 'init', '-q', '-b', 'main');
    write(cwd, 'themes/alpha', 'cairn-theme.json', '1.0.0', 'one');
    write(cwd, 'sets/blog', 'cairn-set.json', '1.0.0', 'one');
    const base = commit(cwd, 'base');
    change(cwd);
    const head = commit(cwd, 'change');
    const args = extraArgs ?? ['--range', `${base}..${head}`];
    return spawnSync('node', [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test('a changed theme file with an unchanged version fails and names the theme', () => {
  const r = run((cwd) => write(cwd, 'themes/alpha', 'cairn-theme.json', '1.0.0', 'two'));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /themes\/alpha/);
});

test('a changed set file with an unchanged version fails and names the set', () => {
  const r = run((cwd) => write(cwd, 'sets/blog', 'cairn-set.json', '1.0.0', 'two'));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /sets\/blog/);
});

test('the same change with a raised version passes', () => {
  const r = run((cwd) => write(cwd, 'themes/alpha', 'cairn-theme.json', '1.0.1', 'two'));
  assert.equal(r.status, 0, r.stderr);
});

test('a lowered version fails', () => {
  const r = run((cwd) => write(cwd, 'themes/alpha', 'cairn-theme.json', '0.9.0', 'two'));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /themes\/alpha/);
});

test('a prerelease below its release counts as lowered', () => {
  assert.equal(run((cwd) => write(cwd, 'themes/alpha', 'cairn-theme.json', '1.0.0-rc.1', 'two')).status, 1);
});

test('a new theme passes', () => {
  const r = run((cwd) => write(cwd, 'themes/beta', 'cairn-theme.json', '0.1.0', 'new'));
  assert.equal(r.status, 0, r.stderr);
});

test('a deleted directory is ignored', () => {
  const r = run((cwd) => rmSync(path.join(cwd, 'themes/alpha'), { recursive: true }));
  assert.equal(r.status, 0, r.stderr);
});

test('a change outside the catalog directories passes', () => {
  const r = run((cwd) => writeFileSync(path.join(cwd, 'README.md'), 'hi'));
  assert.equal(r.status, 0, r.stderr);
});

test('with no --range it compares from the merge base with origin/main', () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'version-rise-'));
  try {
    git(cwd, 'init', '-q', '-b', 'main');
    write(cwd, 'themes/alpha', 'cairn-theme.json', '1.0.0', 'one');
    const base = commit(cwd, 'base');
    git(cwd, 'update-ref', 'refs/remotes/origin/main', base);
    write(cwd, 'themes/alpha', 'cairn-theme.json', '1.0.0', 'two');
    commit(cwd, 'change');
    const r = spawnSync('node', [SCRIPT], { cwd, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /themes\/alpha/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
