#!/usr/bin/env node
// cairn-cms: the release preflight. Before a cut it checks the tree is clean, HEAD is the tip of
// origin's main as the remote reports it (a stale local `origin/main` cannot pass), the version is
// unpublished on all three packages, both installs are present, and `## Unreleased` holds something
// to release. A stable cut is the candidate's own tree, so `--stable` skips the empty-window check.
//
// Interface: `node scripts/release/preflight.mjs <version> [--stable]`. Exit 0 or 1; the last line
// is `Next:`.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGES } from '../checks/check-stable-source.mjs';
import { missingInstalls } from '../checks/close-prebuilt.mjs';
import { unreleasedWindow } from '../checks/check-version.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** @typedef {(cmd: string, args: string[]) => { status: number | null, stdout: string }} Runner */

/**
 * Run the preflight checks and collect every failure.
 * @param {Runner} run - Runs git and npm from the repo root.
 * @param {{ version: string, stable: boolean, root: string, exists: (path: string) => boolean, changelog: string }} options
 * @returns {{ ok: boolean, errors: string[], sha?: string, next: string }} The outcome.
 */
export function preflight(run, { version, stable, root, exists, changelog }) {
  /** @type {string[]} */
  const errors = [];
  const out = (/** @type {string} */ cmd, /** @type {string[]} */ args) => run(cmd, args).stdout.trim();

  if (out('git', ['status', '--porcelain'])) errors.push('the working tree is dirty; commit or `git restore` it');

  const head = out('git', ['rev-parse', 'HEAD']);
  const remote = out('git', ['ls-remote', 'origin', 'refs/heads/main']).split(/\s+/)[0];
  if (!head || head !== remote) {
    errors.push(`HEAD (${head || 'unreadable'}) is not the tip of origin main (${remote || 'unreadable'}); merge and pull first`);
  }

  for (const pkg of PACKAGES) {
    const r = run('npm', ['view', pkg, 'versions', '--json']);
    if (r.status !== 0 && !/E404/.test(r.stdout)) {
      errors.push(`${pkg}: npm view failed (status ${r.status}), so the published versions are unknown`);
      continue;
    }
    /** @type {unknown} */
    let published = [];
    try {
      published = JSON.parse(r.stdout || '[]');
    } catch {
      errors.push(`${pkg}: npm view answered something unreadable`);
      continue;
    }
    const list = Array.isArray(published) ? published : [published];
    if (list.includes(version)) errors.push(`${pkg} already has ${version} published; pick the next version`);
  }

  for (const cmd of missingInstalls(exists, root)) errors.push(`an install is missing; run ${cmd}`);

  if (!stable && !(unreleasedWindow(changelog) ?? '').trim()) {
    errors.push('## Unreleased is missing or empty; there is nothing to release');
  }

  return errors.length
    ? { ok: false, errors, next: 'Next: fix the above and rerun preflight' }
    : { ok: true, errors, sha: head, next: `Next: run bump ${version}` };
}

function main() {
  const args = process.argv.slice(2);
  const version = args.find((a) => !a.startsWith('--')) ?? '';
  /** @type {Runner} */
  const run = (cmd, a) => {
    const r = spawnSync(cmd, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
    return { status: r.status, stdout: r.stdout ?? '' };
  };
  const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
  const result = preflight(run, { version, stable: args.includes('--stable'), root: ROOT, exists: existsSync, changelog });
  for (const e of result.errors) console.error(`preflight: ${e}`);
  if (result.ok) console.log(`preflight: OK, HEAD is ${result.sha}`);
  else process.exitCode = 1;
  console.log(result.next);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
