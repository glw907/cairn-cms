#!/usr/bin/env node
// cairn-cms: the stable-source gate. A stable cut must be the tree of the candidate that passed the
// release gate, plus only the edits that turn that candidate's version into the stable's. This
// check reads what `next` serves, finds the candidate's tag, and refuses unless the diff from that
// tag to HEAD is exactly the cut's own file set with exactly the cut's own line shapes (the set a
// candidate cut's `git show --stat` lists). Any other change, a source line, a body line of
// CHANGELOG or MIGRATION-NOTES, a rename, a mode change, a binary file, means the stable would
// ship something the gate never saw, so the answer is one more candidate.
//
// It takes no target argument: it runs `git fetch origin main` and demands HEAD equal origin/main,
// then prints the sha it read so the release is created with that sha literally. The rules are a
// pure function over a command runner, so the tests need no registry or repository state.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const PACKAGES = ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'];

const SEMVER = '\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?';
const VERSION_LINE = /^\s*"version": "[^"]+",?$/;
const PIN_LINE = new RegExp(`^\\s*"@glw907/cairn-cms(?:-dev)?": "\\^${SEMVER}",?$`);
const BARE_VERSION = new RegExp(`^${SEMVER}$`);
const HEADING = new RegExp(`^## ${SEMVER}$`);
const SIZE_MARKER = /^<!-- release-size: \w+ -->$/;
const RELEASED_LINE = /^Released \d{4}-\d{2}-\d{2}\.$/;
const ANCHOR = /\(\.\/CHANGELOG\.md#[0-9a-z-]+\)/;
const ANCHOR_ALL = new RegExp(ANCHOR.source, 'g');

/** @typedef {{ removed: string[], added: string[] }} ChangedLines */
/** @typedef {(cmd: string, args: string[]) => { status: number | null, stdout: string }} Runner */

/**
 * @param {(line: string) => boolean} test
 * @returns {(lines: ChangedLines) => boolean}
 */
const everyLine = (test) => ({ removed, added }) => [...removed, ...added].every(test);

/**
 * The files a stable cut may touch, each with the predicate over its removed and added lines.
 * @type {Record<string, (lines: ChangedLines) => boolean>}
 */
export const RULES = {
  'package.json': everyLine((l) => VERSION_LINE.test(l)),
  'package-lock.json': everyLine((l) => VERSION_LINE.test(l)),
  'packages/cairn-cms-dev/package.json': everyLine((l) => VERSION_LINE.test(l)),
  'packages/create-cairn-site/package.json': everyLine((l) => VERSION_LINE.test(l)),
  'templates/waymark/package.json': everyLine((l) => PIN_LINE.test(l)),
  'templates/waymark/.claude/cairn/VERSION': everyLine((l) => BARE_VERSION.test(l)),
  'CHANGELOG.md': everyLine((l) => HEADING.test(l) || SIZE_MARKER.test(l) || RELEASED_LINE.test(l)),
  // A heading, or a body line whose only change is the CHANGELOG anchor it links to.
  'MIGRATION-NOTES.md': ({ removed, added }) => {
    /** @param {string[]} side */
    const body = (side) => side.filter((l) => !HEADING.test(l));
    const before = body(removed);
    const after = body(added);
    const anchored = [...before, ...after].every((l) => ANCHOR.test(l));
    /** @param {string[]} side */
    const flat = (side) => side.map((l) => l.replace(ANCHOR_ALL, '(./CHANGELOG.md#_)'));
    return (
      anchored &&
      before.length === after.length &&
      flat(before).every((l, i) => l === flat(after)[i]) &&
      [...removed, ...added].every((l) => HEADING.test(l) || ANCHOR.test(l))
    );
  }
};
/**
 * Paths a stable cut may change freely: harness and test code, and inert records that ship in no
 * package. A changed path in this set skips every check, status and mode included. A unit test
 * pins the set against the shipped inputs, so a glob that covers one fails the suite.
 * @type {readonly string[]}
 */
export const IGNORED = Object.freeze([
  'scripts/gate/**',
  'src/tests/**',
  'packages/*/test/**',
  'examples/showcase/e2e/**',
  'docs/STATUS.md',
  'BACKLOG.md',
  'ROADMAP.md',
  'docs/internal/**'
]);

/**
 * @param {string} glob - A path glob where `**` spans directories and `*` stays inside one.
 * @returns {RegExp} The anchored pattern for the glob.
 */
export function globToRegExp(glob) {
  const escape = (/** @type {string} */ text) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const body = glob
    .split('**')
    .map((part) => part.split('*').map(escape).join('[^/]*'))
    .join('.*');
  return new RegExp(`^${body}$`);
}

/**
 * Whether a changed path is in the ignore set. A rename or copy entry carries a tab between its two
 * paths and is never ignored, so a move out of an ignored path cannot hide.
 * @param {string} path - A path from `git diff --raw`.
 * @param {readonly string[]} [globs] - The ignore set; defaults to IGNORED.
 * @returns {boolean} Whether the path is ignored.
 */
export function isIgnored(path, globs = IGNORED) {
  return !path.includes('\t') && globs.some((g) => globToRegExp(g).test(path));
}

const HASHES_FILE ='guidance-hashes.json';
const ALLOWED = new Set([...Object.keys(RULES), HASHES_FILE]);

/**
 * The removed and added lines of one file's `git diff --text` output, headers and hunk markers
 * dropped.
 * @param {string} diff
 * @returns {{ removed: string[], added: string[] }}
 */
export function changedLines(diff) {
  const removed = [];
  const added = [];
  let inHunk = false;
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) inHunk = true;
    else if (!inHunk) continue;
    else if (line.startsWith('+')) added.push(line.slice(1));
    else if (line.startsWith('-')) removed.push(line.slice(1));
  }
  return { removed, added };
}

/**
 * Check that HEAD is a stable cut of the tag `next` points at.
 * @param {Runner} run
 * @returns {{ ok: boolean, errors: string[], sha?: string, next?: string }}
 */
export function checkStableSource(run) {
  /** @param {string} cmd @param {string[]} args */
  const out = (cmd, args) => run(cmd, args).stdout.trim();
  /** @param {...string} errors */
  const fail = (...errors) => ({ ok: false, errors });

  if (run('git', ['fetch', 'origin', 'main']).status !== 0) return fail('git fetch origin main failed');
  const head = out('git', ['rev-parse', 'HEAD']);
  const origin = out('git', ['rev-parse', 'origin/main']);
  if (!head || head !== origin) return fail(`HEAD (${head}) is not origin/main (${origin}); cut a stable from the merged main`);

  const tags = PACKAGES.map((pkg) => out('npm', ['view', pkg, 'dist-tags.next']));
  if (tags.some((t) => !t) || new Set(tags).size !== 1) {
    return fail(`next differs across the packages: ${PACKAGES.map((p, i) => `${p}=${tags[i] || '(none)'}`).join(', ')}`);
  }
  const next = tags[0];
  const tag = `v${next}`;
  if (run('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`]).status !== 0) return fail(`tag ${tag} is absent`);

  const errors = [];
  const files = [];
  for (const line of out('git', ['diff', '--raw', tag, 'HEAD']).split('\n').filter(Boolean)) {
    const m = /^:(\d+) (\d+) \w+ \w+ ([A-Z]\d*)\t(.+)$/.exec(line);
    if (!m) {
      errors.push(`unreadable diff entry: ${line}`);
      continue;
    }
    const [, oldMode, newMode, status, path] = m;
    if (isIgnored(path)) continue;
    if (status !== 'M') errors.push(`${path}: status ${status}, only a modification is allowed`);
    else if (oldMode !== newMode) errors.push(`${path}: mode ${oldMode} to ${newMode}`);
    else if (!ALLOWED.has(path)) errors.push(`${path}: outside the stable cut's file set`);
    else files.push(path);
  }

  for (const path of files) {
    if (path === HASHES_FILE) {
      if (run('node', ['scripts/build/build-guidance-hashes.mjs', '--check']).status !== 0) {
        errors.push(`${path}: build-guidance-hashes --check reports it stale`);
      }
      continue;
    }
    const lines = changedLines(run('git', ['diff', '--text', tag, 'HEAD', '--', path]).stdout);
    if (RULES[path](lines)) continue;
    const offenders = [...lines.removed.map((l) => `-${l}`), ...lines.added.map((l) => `+${l}`)];
    errors.push(`${path}: changed lines outside the cut's shape:\n    ${offenders.join('\n    ')}`);
  }

  return errors.length ? { ok: false, errors } : { ok: true, errors: [], sha: head, next };
}

function main() {
  /** @type {Runner} */
  const run = (cmd, args) => {
    const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
    return { status: r.status, stdout: r.stdout ?? '' };
  };
  const result = checkStableSource(run);
  if (!result.ok) {
    for (const e of result.errors) console.error(`check-stable-source: ${e}`);
    process.exitCode = 1;
    return;
  }
  console.log(`check-stable-source: OK, HEAD is a stable cut of v${result.next}`);
  console.log(`sha: ${result.sha}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
