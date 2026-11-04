#!/usr/bin/env node
// cairn-cms: the post-publish verify. It checks that a dist-tag holds the version on all three
// packages and that each carries a provenance attestation. For a stable it also proves the
// published stable is the final candidate's tarball plus only the cut's own edits: each package's
// two tarballs are fetched, every file is diffed line by line, and `check-stable-source.mjs`'s
// `RULES` judge each differing file by kind. `guidance-hashes.json` is judged by
// `build-guidance-hashes.mjs --check` on the stable tree. Any other differing line fails.
//
// Interface: `node scripts/release/verify.mjs <version> [--tag <t>] [--from <candidate>]`. The tag
// defaults to `gate` for a prerelease and `latest` for a stable; `--from` names the candidate when
// `next` no longer holds it. Exit 0 or 1; the last line is `Next:`.
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGES, RULES } from '../checks/check-stable-source.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REGISTRY = 'https://registry.npmjs.org';
const HASHES_FILE = 'guidance-hashes.json';

/** @typedef {(cmd: string, args: string[]) => { status: number | null, stdout: string }} Runner */
/** @typedef {{ removed: string[], added: string[] } | { status: 'added' | 'removed' | 'binary' | 'reordered' }} FileDiff */

/**
 * Where a tarball path sits in the repository, for the paths whose location differs.
 * @type {Record<string, Record<string, string>>}
 */
const REPO_PATHS = {
  '@glw907/cairn-cms-dev': { 'package.json': 'packages/cairn-cms-dev/package.json' },
  'create-cairn-site': {
    'package.json': 'packages/create-cairn-site/package.json',
    'template/package.json': 'templates/waymark/package.json',
    'template/.claude/cairn/VERSION': 'templates/waymark/.claude/cairn/VERSION'
  }
};

/**
 * Read a gzipped tar into a map of path to bytes. The leading `package/` segment is dropped, and a
 * pax `path` record overrides the header name.
 * @param {Uint8Array} gz - The `.tgz` bytes.
 * @returns {Map<string, Buffer>} Regular files only.
 */
export function untar(gz) {
  const tar = gunzipSync(gz);
  /** @type {Map<string, Buffer>} */
  const files = new Map();
  const text = (/** @type {number} */ from, /** @type {number} */ len) => tar.toString('utf8', from, from + len).replace(/\0.*$/s, '');
  let paxPath = '';
  for (let at = 0; at + 512 <= tar.length; ) {
    if (tar.subarray(at, at + 512).every((b) => b === 0)) break;
    const size = parseInt(text(at + 124, 12).trim() || '0', 8);
    const type = text(at + 156, 1) || '0';
    const prefix = text(at + 345, 155);
    const name = paxPath || (prefix ? `${prefix}/${text(at, 100)}` : text(at, 100));
    const body = tar.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') {
      paxPath = /(?:^|\n)\d+ path=([^\n]*)/.exec(body.toString('utf8'))?.[1] ?? '';
      continue;
    }
    paxPath = '';
    if (type === '0') files.set(name.split('/').slice(1).join('/'), Buffer.from(body));
  }
  return files;
}

/**
 * The lines of `a` with no counterpart in `b`, counting duplicates.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {{ unmatched: string[], matched: string[] }}
 */
function subtract(a, b) {
  /** @type {Map<string, number>} */
  const budget = new Map();
  for (const line of b) budget.set(line, (budget.get(line) ?? 0) + 1);
  /** @type {string[]} */
  const unmatched = [];
  /** @type {string[]} */
  const matched = [];
  for (const line of a) {
    const left = budget.get(line) ?? 0;
    if (left > 0) {
      budget.set(line, left - 1);
      matched.push(line);
    } else unmatched.push(line);
  }
  return { unmatched, matched };
}

/**
 * Diff two package trees file by file. A modified text file reports its removed and added lines; a
 * file whose shared lines changed order is `reordered`, so a moved line cannot hide.
 * @param {Map<string, Buffer>} before
 * @param {Map<string, Buffer>} after
 * @returns {Record<string, FileDiff>} Only the paths that differ.
 */
export function diffTrees(before, after) {
  /** @type {Record<string, FileDiff>} */
  const diffs = {};
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const a = before.get(path);
    const b = after.get(path);
    if (!a) diffs[path] = { status: 'added' };
    else if (!b) diffs[path] = { status: 'removed' };
    else if (!a.equals(b)) {
      if (a.includes(0) || b.includes(0)) {
        diffs[path] = { status: 'binary' };
        continue;
      }
      const left = subtract(a.toString('utf8').split('\n'), b.toString('utf8').split('\n'));
      const right = subtract(b.toString('utf8').split('\n'), a.toString('utf8').split('\n'));
      diffs[path] =
        left.matched.join('\n') === right.matched.join('\n')
          ? { removed: left.unmatched, added: right.unmatched }
          : { status: 'reordered' };
    }
  }
  return diffs;
}

/**
 * Judge one package's differing files against the cut's rules.
 * @param {string} pkg - The package name.
 * @param {Record<string, FileDiff>} diffs - From `diffTrees`.
 * @returns {{ errors: string[], hashesChanged: boolean }} `hashesChanged` asks the caller to run the hash check.
 */
export function judgeDiffs(pkg, diffs) {
  /** @type {string[]} */
  const errors = [];
  let hashesChanged = false;
  for (const [path, diff] of Object.entries(diffs)) {
    if ('status' in diff) {
      errors.push(`${pkg}: ${path} is ${diff.status}, only a modification of a cut-shaped file is allowed`);
      continue;
    }
    if (path === HASHES_FILE) {
      hashesChanged = true;
      continue;
    }
    const rule = RULES[REPO_PATHS[pkg]?.[path] ?? path];
    if (rule && rule(diff)) continue;
    const lines = [...diff.removed.map((l) => `-${l}`), ...diff.added.map((l) => `+${l}`)];
    errors.push(`${pkg}: ${path}: ${rule ? "changed lines outside the cut's shape" : "outside the stable cut's file set"}:\n    ${lines.slice(0, 20).join('\n    ')}`);
  }
  return { errors, hashesChanged };
}

/**
 * @param {typeof fetch} fetchFn
 * @param {string} url
 * @returns {Promise<any>} The parsed body, or null when the registry does not answer ok.
 */
async function getJson(fetchFn, url) {
  try {
    const res = await fetchFn(url, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * @param {typeof fetch} fetchFn
 * @param {string} pkg
 * @param {string} version
 * @returns {Promise<Map<string, Buffer>>} The unpacked tarball.
 */
async function fetchTarball(fetchFn, pkg, version) {
  const base = pkg.split('/').pop();
  const res = await fetchFn(`${REGISTRY}/${pkg}/-/${base}-${version}.tgz`);
  if (!res.ok) throw new Error(`${pkg}@${version}: the tarball answered ${res.status}`);
  return untar(new Uint8Array(await res.arrayBuffer()));
}

/**
 * Verify a published version.
 * @param {{ fetchFn: typeof fetch, run: Runner }} deps - `run` executes the guidance-hash check.
 * @param {{ version: string, tag?: string, from?: string }} options
 * @returns {Promise<{ ok: boolean, errors: string[], next: string }>} The outcome.
 */
export async function verify({ fetchFn, run }, { version, tag, from }) {
  const stable = !version.includes('-');
  const wanted = tag ?? (stable ? 'latest' : 'gate');
  /** @type {string[]} */
  const errors = [];

  const packuments = await Promise.all(PACKAGES.map((p) => getJson(fetchFn, `${REGISTRY}/${p}`)));
  PACKAGES.forEach((p, i) => {
    const held = packuments[i]?.['dist-tags']?.[wanted];
    if (held !== version) errors.push(`${p}: ${wanted} holds ${held ?? '(unreadable)'}, expected ${version}`);
  });
  const versions = await Promise.all(PACKAGES.map((p) => getJson(fetchFn, `${REGISTRY}/${p}/${version}`)));
  PACKAGES.forEach((p, i) => {
    if (!versions[i]?.dist?.attestations?.provenance) errors.push(`${p}@${version}: no provenance attestation`);
  });

  if (stable) {
    const held = packuments.map((m) => m?.['dist-tags']?.next);
    const candidate = from ?? held[0];
    if (!candidate || (!from && new Set(held).size !== 1)) {
      errors.push(`next differs across the packages (${held.map((h) => h ?? '(none)').join(', ')}); pass --from <candidate>`);
    } else if (candidate === version) {
      errors.push(`next already holds ${version}; pass --from <candidate> to name the final candidate`);
    } else {
      for (const pkg of PACKAGES) {
        try {
          const [before, after] = await Promise.all([fetchTarball(fetchFn, pkg, candidate), fetchTarball(fetchFn, pkg, version)]);
          const judged = judgeDiffs(pkg, diffTrees(before, after));
          errors.push(...judged.errors);
          if (judged.hashesChanged && run('node', ['scripts/build/build-guidance-hashes.mjs', '--check']).status !== 0) {
            errors.push(`${pkg}: ${HASHES_FILE} differs from ${candidate} and build-guidance-hashes --check reports it stale`);
          }
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }
    }
  }

  return errors.length
    ? { ok: false, errors, next: 'Next: fix the above (a failed stable means one more candidate), then rerun verify' }
    : { ok: true, errors: [], next: `Next: ${wanted} holds ${version} with provenance${stable ? ', and the stable matches its candidate' : '; promote it'}` };
}

async function main() {
  const args = process.argv.slice(2);
  /** @param {string} flag */
  const flagValue = (flag) => {
    const at = args.indexOf(flag);
    return at >= 0 ? args[at + 1] : undefined;
  };
  const tag = flagValue('--tag');
  const from = flagValue('--from');
  const version = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--tag' && args[i - 1] !== '--from') ?? '';
  if (!version) {
    console.error('verify: usage: verify.mjs <version> [--tag <t>] [--from <candidate>]');
    process.exitCode = 1;
    console.log('Next: rerun with a version');
    return;
  }
  /** @type {Runner} */
  const run = (cmd, a) => {
    const r = spawnSync(cmd, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
    return { status: r.status, stdout: r.stdout ?? '' };
  };
  const result = await verify({ fetchFn: fetch, run }, { version, tag, from });
  for (const e of result.errors) console.error(`verify: ${e}`);
  if (!result.ok) process.exitCode = 1;
  console.log(result.next);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
