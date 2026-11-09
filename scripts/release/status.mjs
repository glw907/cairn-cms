#!/usr/bin/env node
// cairn-cms: the release status. It prints a JSON checklist of what a finished release holds and
// exits non-zero until every item does: the tag on origin, the GitHub release and its prerelease
// flag, the dist-tags for the stage, a provenance attestation on both packages, and the
// CHANGELOG heading. A prerelease also needs a passing gate verdict, which runs through
// `scripts/gate/verdict.mjs`; a stable runs no verdict.
//
// Interface: `node scripts/release/status.mjs <version>`. Exit 0 or 1; the last line is `Next:`.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGES } from '../checks/check-stable-source.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REGISTRY = 'https://registry.npmjs.org';
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** @typedef {(cmd: string, args: string[]) => { status: number | null, stdout: string }} Runner */
/** @typedef {{ ok: boolean, detail: string }} Item */

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
 * Build the checklist for a version.
 * @param {{ run: Runner, fetchFn: typeof fetch, changelog: string }} deps - `changelog` is the text of CHANGELOG.md.
 * @param {string} version
 * @returns {Promise<{ ok: boolean, version: string, stage: string, items: Record<string, Item>, next: string }>} The checklist.
 */
export async function status({ run, fetchFn, changelog }, version) {
  const prerelease = version.includes('-');
  /** @type {Record<string, Item>} */
  const items = {};

  const tag = `v${version}`;
  const remote = run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
  items.tag = { ok: remote.status === 0 && remote.stdout.trim() !== '', detail: remote.stdout.trim() ? `${tag} is on origin` : `${tag} is not on origin` };

  const view = run('gh', ['release', 'view', tag, '--json', 'tagName,isPrerelease']);
  /** @type {{ isPrerelease?: boolean } | null} */
  let release = null;
  try {
    release = view.status === 0 ? JSON.parse(view.stdout) : null;
  } catch {
    release = null;
  }
  items.release = !release
    ? { ok: false, detail: `no GitHub release ${tag}` }
    : { ok: release.isPrerelease === prerelease, detail: `isPrerelease is ${release.isPrerelease}, expected ${prerelease}` };

  const packuments = await Promise.all(PACKAGES.map((p) => getJson(fetchFn, `${REGISTRY}/${p}`)));
  /** @type {Record<string, string | undefined>[]} */
  const tags = packuments.map((m) => m?.['dist-tags'] ?? {});
  const expected = prerelease ? { next: PACKAGES } : { latest: PACKAGES };
  /** @type {string[]} */
  const behind = [];
  for (const [name, pkgs] of Object.entries(expected)) {
    for (const pkg of pkgs) {
      const held = tags[PACKAGES.indexOf(pkg)][name];
      if (held !== version) behind.push(`${pkg}: ${name} holds ${held ?? '(none)'}`);
    }
  }
  items.distTags = { ok: behind.length === 0, detail: behind.length ? behind.join('; ') : `dist-tags hold ${version}` };

  const versions = await Promise.all(PACKAGES.map((p) => getJson(fetchFn, `${REGISTRY}/${p}/${version}`)));
  const unattested = PACKAGES.filter((_, i) => !versions[i]?.dist?.attestations?.provenance);
  items.provenance = { ok: unattested.length === 0, detail: unattested.length ? `no provenance on ${unattested.join(', ')}` : 'provenance on both' };

  const heading = new RegExp(`^## ${version.replace(/[.+]/g, '\\$&')}$`, 'm');
  items.changelog = { ok: heading.test(changelog), detail: heading.test(changelog) ? `CHANGELOG has ## ${version}` : `CHANGELOG has no ## ${version} heading` };

  if (prerelease) {
    const verdict = run('node', ['scripts/gate/verdict.mjs', version]);
    items.verdict = { ok: verdict.status === 0, detail: verdict.status === 0 ? 'the gate verdict passes' : `verdict.mjs exited ${verdict.status}` };
  }

  const missing = Object.entries(items).filter(([, i]) => !i.ok).map(([name]) => name);
  return {
    ok: missing.length === 0,
    version,
    stage: prerelease ? 'prerelease' : 'stable',
    items,
    next: missing.length ? `Next: ${missing.join(', ')} not yet holding; finish them and rerun status` : `Next: ${version} is complete`
  };
}

async function main() {
  const version = process.argv[2] ?? '';
  if (!SEMVER.test(version)) {
    console.error(`status: "${version}" is not a version`);
    process.exitCode = 1;
    console.log('Next: rerun with a version');
    return;
  }
  /** @type {Runner} */
  const run = (cmd, args) => {
    const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
    return { status: r.status, stdout: r.stdout ?? '' };
  };
  const result = await status({ run, fetchFn: fetch, changelog: readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8') }, version);
  const { next, ...checklist } = result;
  console.log(JSON.stringify(checklist, null, 2));
  if (!result.ok) process.exitCode = 1;
  console.log(next);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
