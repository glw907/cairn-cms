#!/usr/bin/env node
// cairn-cms: the dist-tag wait. After a publish it polls the registry, bypassing every cache, until
// the tag holds the version on both packages, for up to ten minutes. A timeout names each
// package and what its tag holds, so a lagging package is visible rather than a bare failure.
//
// Interface: `node scripts/release/wait.mjs <version> <tag>`. Exit 0 or 1; the last line is
// `Next:`.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGES } from '../checks/check-stable-source.mjs';

const TIMEOUT_MS = 10 * 60 * 1000;
const INTERVAL_MS = 15 * 1000;

/**
 * Poll until every package's dist-tag holds the version.
 * @param {typeof fetch} fetchFn - The fetch to poll with.
 * @param {{ version: string, tag: string, sleep?: (ms: number) => Promise<void>, now?: () => number, timeoutMs?: number, intervalMs?: number }} options
 *   `sleep` and `now` are the clock seams.
 * @returns {Promise<{ ok: boolean, errors: string[], next: string }>} The outcome.
 */
export async function waitForTag(fetchFn, { version, tag, sleep, now, timeoutMs = TIMEOUT_MS, intervalMs = INTERVAL_MS }) {
  const pause = sleep ?? ((/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms)));
  const clock = now ?? Date.now;
  const start = clock();
  /** @type {string[]} */
  let held = [];
  for (;;) {
    held = await Promise.all(
      PACKAGES.map(async (pkg) => {
        try {
          const res = await fetchFn(`https://registry.npmjs.org/${pkg}`, { cache: 'no-store' });
          if (!res.ok) return `(registry answered ${res.status})`;
          const body = /** @type {{ 'dist-tags'?: Record<string, string> }} */ (await res.json());
          return body['dist-tags']?.[tag] ?? '(no such tag)';
        } catch {
          return '(unreachable)';
        }
      })
    );
    if (held.every((v) => v === version)) {
      return { ok: true, errors: [], next: `Next: ${tag} serves ${version} on both packages; run the smoke` };
    }
    if (clock() - start >= timeoutMs) break;
    await pause(intervalMs);
  }
  return {
    ok: false,
    errors: [
      `${tag} did not reach ${version} within ${timeoutMs / 60000} minutes`,
      ...PACKAGES.map((p, i) => `${p}: ${tag} holds ${held[i]}`)
    ],
    next: 'Next: check the publish run, then rerun wait'
  };
}

async function main() {
  const [version, tag] = process.argv.slice(2);
  if (!version || !tag) {
    console.error('wait: usage: wait.mjs <version> <tag>');
    process.exitCode = 1;
    console.log('Next: rerun with a version and a tag');
    return;
  }
  const result = await waitForTag(fetch, { version, tag });
  for (const e of result.errors) console.error(`wait: ${e}`);
  if (!result.ok) process.exitCode = 1;
  console.log(result.next);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
