#!/usr/bin/env node
// Fails when a catalog directory (`themes/<id>/` or `sets/<kind>/`) changed across a git range
// and its manifest version did not rise by SemVer precedence.
//
// Usage: node scripts/catalog/version-rise.mjs [--range <base>..<head>]
// With no range it compares `git merge-base origin/main HEAD` to HEAD.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

/** The manifest file name for each catalog root. */
const MANIFESTS = { themes: 'cairn-theme.json', sets: 'cairn-set.json' };

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Reads a manifest's version at a revision, or null when the file is absent there. */
function versionAt(rev, dir, manifest) {
  try {
    return JSON.parse(git('show', `${rev}:${dir}/${manifest}`)).version ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns one problem string per catalog directory that changed without a version rise.
 * A directory absent at `base` is new and passes; one absent at `head` is deleted and ignored.
 *
 * @param base - The range's base revision.
 * @param head - The range's head revision.
 */
export function findProblems(base, head) {
  const files = git('diff', '--name-only', '--no-renames', `${base}`, `${head}`, '--', 'themes', 'sets')
    .split('\n')
    .filter(Boolean);
  const dirs = new Set();
  for (const file of files) {
    const [root, id] = file.split('/');
    if (MANIFESTS[root] && id && file.split('/').length > 2) dirs.add(`${root}/${id}`);
  }
  const problems = [];
  for (const dir of [...dirs].sort()) {
    const manifest = MANIFESTS[dir.split('/')[0]];
    const before = versionAt(base, dir, manifest);
    const after = versionAt(head, dir, manifest);
    if (before === null || after === null) continue;
    if (!semver.valid(before) || !semver.valid(after)) {
      problems.push(`${dir}: version "${before}" or "${after}" is not valid SemVer`);
    } else if (!semver.gt(after, before)) {
      problems.push(`${dir}: changed but its version did not rise (${before} to ${after})`);
    }
  }
  return problems;
}

/** Resolves the range argument, defaulting to the merge base with origin/main. */
function resolveRange(argv) {
  const at = argv.indexOf('--range');
  const given = at === -1 ? null : argv[at + 1];
  if (at !== -1 && !given) throw new Error('--range needs <base>..<head>');
  if (given) {
    const [base, head] = given.split('..');
    if (!base || !head) throw new Error(`--range "${given}" is not <base>..<head>`);
    return { base, head };
  }
  return { base: git('merge-base', 'origin/main', 'HEAD').trim(), head: 'HEAD' };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { base, head } = resolveRange(process.argv.slice(2));
    const problems = findProblems(base, head);
    for (const problem of problems) console.error(problem);
    if (problems.length) process.exit(1);
    console.log('version-rise: every changed theme and set raised its version.');
  } catch (error) {
    console.error(`version-rise: ${error.message}`);
    process.exit(1);
  }
}
