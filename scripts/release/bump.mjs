#!/usr/bin/env node
// cairn-cms: the release bump. It turns the tree into the cut of one version: the two manifests,
// the lockfile's version lines, the CHANGELOG heading and its `Released` line, the MIGRATION-NOTES
// heading and anchors, and the template pins and VERSION that `npm run emit:template` derives. The
// seven files are within the set `check-stable-source.mjs` allows. Every new text is computed in
// memory and checked before any file is written, and a failed emit puts every written file back.
//
// Interface: `node scripts/release/bump.mjs <version> [--date YYYY-MM-DD]`. Exit 0 or 1; the last
// line is `Next:`.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkVersion } from '../checks/check-version.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const MANIFESTS = ['package.json', 'packages/cairn-cms-dev/package.json'];
const TEMPLATE_FILES = ['templates/waymark/package.json', 'templates/waymark/.claude/cairn/VERSION'];
const WRITTEN = [...MANIFESTS, 'package-lock.json', 'CHANGELOG.md', 'MIGRATION-NOTES.md'];

/** @typedef {(cmd: string, args: string[]) => { status: number | null, stdout: string }} Runner */

/**
 * @param {string} label - A CHANGELOG heading label.
 * @returns {string} The anchor GitHub gives the heading.
 */
const slug = (label) => label.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-');

/**
 * @param {string} text
 * @param {string} from
 * @param {string} to
 * @returns {string} The text with every occurrence of `from` replaced.
 */
const replaceAll = (text, from, to) => text.split(from).join(to);

/**
 * Bump the tree rooted at `root` to `version`.
 * @param {Runner} run - Runs git and `npm run emit:template` from the root.
 * @param {{ root: string, version: string, date: string }} options - `date` is `YYYY-MM-DD`.
 * @returns {{ ok: boolean, errors: string[], changed: string[], next: string }} The outcome.
 */
export function bump(run, { root, version, date }) {
  /** @param {...string} errors */
  const fail = (...errors) => ({ ok: false, errors, changed: [], next: 'Next: fix the above and rerun bump' });
  const read = (/** @type {string} */ path) => readFileSync(join(root, path), 'utf8');

  if (!SEMVER.test(version)) return fail(`"${version}" is not a version`);
  const current = JSON.parse(read('package.json')).version;
  if (current === version) {
    return { ok: true, errors: [], changed: [], next: 'Next: the tree is already at this version; run preflight' };
  }
  if (run('git', ['status', '--porcelain']).stdout.trim()) {
    return fail('the working tree is dirty; commit it, or discard it with `git restore .`, before the bump');
  }

  /** @type {Record<string, string>} */
  const next = {};

  for (const path of MANIFESTS) {
    const text = read(path);
    if (JSON.parse(text).version !== current) return fail(`${path} is not at ${current}`);
    next[path] = text.replace(/^(\s*"version": ")[^"]+(",?)$/m, `$1${version}$2`);
  }

  const lockLine = `"version": "${current}"`;
  const lock = read('package-lock.json');
  const lockCount = lock.split(lockLine).length - 1;
  if (lockCount !== 4) return fail(`package-lock.json holds ${lockCount} lines at ${current}, expected 4`);
  next['package-lock.json'] = replaceAll(lock, lockLine, `"version": "${version}"`);

  const changelog = read('CHANGELOG.md');
  const headings = [...changelog.matchAll(/^## (\S+)$/gm)].map((m) => m[1]);
  const unreleasedAt = headings.indexOf('Unreleased');
  const below = headings.slice(unreleasedAt + 1).find((h) => SEMVER.test(h));
  if (unreleasedAt >= 0 && below && below.split('-')[0] === version.split('-')[0]) {
    return fail(`## Unreleased sits above ## ${below}, on the same version ${version.split('-')[0]}; fold the window into that section first`);
  }
  const label = unreleasedAt >= 0 ? 'Unreleased' : current;
  const escaped = label.replace(/\./g, '\\.');
  const section = new RegExp(`^## ${escaped}\\n(?:\\nReleased [^\\n]*\\n)?`, 'm');
  if (!section.test(changelog)) return fail(`CHANGELOG.md has no "## ${label}" heading to rename`);
  next['CHANGELOG.md'] = changelog.replace(section, `## ${version}\n\nReleased ${date}.\n`);

  const checked = checkVersion(version, next['CHANGELOG.md']);
  if (!checked.ok) return fail(`CHANGELOG.md fails the version check: ${checked.error}`);

  let notes = read('MIGRATION-NOTES.md');
  notes = notes.replace(new RegExp(`^## ${escaped}$`, 'm'), `## ${version}`);
  notes = replaceAll(notes, `(./CHANGELOG.md#${slug(label)})`, `(./CHANGELOG.md#${slug(version)})`);
  next['MIGRATION-NOTES.md'] = notes;

  const originals = new Map([...WRITTEN, ...TEMPLATE_FILES].filter((p) => existsSync(join(root, p))).map((p) => [p, read(p)]));
  for (const [path, text] of Object.entries(next)) writeFileSync(join(root, path), text);
  const emit = run('npm', ['run', 'emit:template']);
  if (emit.status !== 0) {
    for (const [path, text] of originals) writeFileSync(join(root, path), text);
    return fail(`npm run emit:template failed, so every file the bump wrote was restored:\n${emit.stdout.trim()}`);
  }

  return {
    ok: true,
    errors: [],
    changed: [...WRITTEN, ...TEMPLATE_FILES],
    next: `Next: review \`git diff\`, commit the cut as ${version}, and run preflight`
  };
}

function main() {
  const args = process.argv.slice(2);
  const dateAt = args.indexOf('--date');
  const date = dateAt >= 0 ? args[dateAt + 1] : new Date().toISOString().slice(0, 10);
  const version = args.find((a, i) => !a.startsWith('--') && i !== dateAt + 1) ?? '';
  /** @type {Runner} */
  const run = (cmd, a) => {
    const r = spawnSync(cmd, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
    return { status: r.status, stdout: `${r.stdout ?? ''}${r.status === 0 ? '' : (r.stderr ?? '')}` };
  };
  const result = bump(run, { root: ROOT, version, date });
  for (const e of result.errors) console.error(`bump: ${e}`);
  if (result.ok) console.log(result.changed.length ? `bump: wrote ${result.changed.length} files for ${version}` : 'bump: nothing to write');
  else process.exitCode = 1;
  console.log(result.next);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
