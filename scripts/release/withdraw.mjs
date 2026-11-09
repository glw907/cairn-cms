#!/usr/bin/env node
// cairn-cms: the candidate withdrawal. It prints the commands that retire a failed candidate and
// never runs one: npm trusted publishing does not cover `npm deprecate`, so a person runs the
// printed lines with their own login. It reads the registry to learn which of the two packages
// published, so a half-published candidate is deprecated only where it landed. For a promoted
// candidate, `--promote-run <id>` names the promote run whose log holds the `dist-tags before the
// move:` listing, and the output moves `next` back to it.
//
// Interface: `node scripts/release/withdraw.mjs <version> [--promote-run <id>]`. Exit 0 or 1; the
// last line is `Next:`.
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGES } from '../checks/check-stable-source.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PRERELEASE = /^\d+\.\d+\.\d+-[0-9A-Za-z.-]+$/;

/** @typedef {(cmd: string, args: string[]) => { status: number | null, stdout: string }} Runner */

/**
 * Read the tags the promote job listed before it moved anything. The job prints
 * `npm dist-tag ls` for each package under an `== <package>` line, one `tag: version` line per tag.
 * @param {string} log - The text of `gh run view <id> --log`.
 * @returns {Record<string, string>[]} One tag map per package, in `PACKAGES` order; empty when the log cannot be read.
 */
export function parsePromoteLog(log) {
  const lines = log.split('\n').map((l) => l.replace(/^.*?\d{4}-\d\d-\d\dT[\d:.]+Z /, '').trimEnd());
  const start = lines.indexOf('dist-tags before the move:');
  if (start < 0) return [];
  /** @type {Record<string, Record<string, string>>} */
  const byPackage = {};
  /** @type {Record<string, string> | undefined} */
  let current;
  for (const line of lines.slice(start + 1)) {
    const header = /^== (\S+)$/.exec(line);
    if (header) {
      current = byPackage[header[1]] = {};
      continue;
    }
    const m = /^([\w.-]+): (\S+)$/.exec(line);
    if (!m) break;
    if (current) current[m[1]] = m[2];
  }
  return PACKAGES.every((p) => byPackage[p]) ? PACKAGES.map((p) => byPackage[p]) : [];
}

/**
 * Plan the withdrawal of a candidate.
 * @param {Runner} run - Runs read-only `npm view` and `gh run view`.
 * @param {{ version: string, promoteRun?: string }} options
 * @returns {{ ok: boolean, errors: string[], commands: string[], next: string }} The commands to print.
 */
export function withdraw(run, { version, promoteRun }) {
  /** @param {...string} errors */
  const fail = (...errors) => ({ ok: false, errors, commands: [], next: 'Next: fix the above and rerun withdraw' });
  if (!PRERELEASE.test(version)) return fail(`"${version}" is not a prerelease candidate`);

  /** @type {Record<string, string>[]} */
  let before = [];
  if (promoteRun) {
    const log = run('gh', ['run', 'view', promoteRun, '--log']);
    if (log.status !== 0) return fail(`gh run view ${promoteRun} --log failed`);
    before = parsePromoteLog(log.stdout);
    if (!before.length) return fail(`run ${promoteRun}'s log holds no readable "dist-tags before the move:" listing for ${PACKAGES.length} packages; read it by hand`);
  }

  const published = PACKAGES.filter((p) => run('npm', ['view', `${p}@${version}`, 'version']).stdout.trim() === version);
  if (!published.length) {
    return { ok: true, errors: [], commands: [], next: `Next: ${version} is on the registry for none of the packages; nothing to withdraw` };
  }

  /** @type {string[]} */
  const commands = [];
  for (const pkg of published) {
    commands.push(`npm deprecate "${pkg}@${version}" "withdrawn: failed the release gate, do not install"`);
  }
  for (const pkg of published) {
    const held = run('npm', ['view', pkg, 'dist-tags', '--json']).stdout;
    /** @type {Record<string, string>} */
    let tags = {};
    try {
      tags = JSON.parse(held);
    } catch {
      /* an unreadable listing leaves no tag to remove */
    }
    if (tags.gate === version) commands.push(`npm dist-tag rm ${pkg} gate`);
  }
  if (before.length) {
    for (const pkg of published) {
      const previous = before[PACKAGES.indexOf(pkg)];
      if (previous.next === version) continue;
      commands.push(previous.next ? `npm dist-tag add ${pkg}@${previous.next} next` : `npm dist-tag rm ${pkg} next`);
    }
  }
  return { ok: true, errors: [], commands, next: 'Next: run the printed commands with your own npm login' };
}

function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf('--promote-run');
  const promoteRun = at >= 0 ? args[at + 1] : undefined;
  const version = args.find((a, i) => !a.startsWith('--') && i !== at + 1) ?? '';
  /** @type {Runner} */
  const run = (cmd, a) => {
    const r = spawnSync(cmd, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
    return { status: r.status, stdout: r.stdout ?? '' };
  };
  const result = withdraw(run, { version, promoteRun });
  for (const e of result.errors) console.error(`withdraw: ${e}`);
  if (!result.ok) process.exitCode = 1;
  for (const c of result.commands) console.log(c);
  console.log(result.next);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
