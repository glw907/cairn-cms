// Staging: one scrubbed body per file, named like the corpus (`<route>.<case>.<status>.json`) with
// a provenance block, plus the latency of each route against the request timeout. Bodies are held
// in memory until `flush`, so every name the run learns, from any body, is a needle in every file.
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { shapeBody } from './scrub.mjs';

export const TIMEOUT_MS = 15_000;

const SLUG = /^[a-z0-9_-]+$/;

/**
 * Write a file the owner alone can read, whatever mode an earlier copy had.
 * @param {string} path
 * @param {string} text
 */
export function writePrivate(path, text) {
  writeFileSync(path, text, { mode: 0o600 });
  chmodSync(path, 0o600);
}

/**
 * @typedef {{ provider: 'cloudflare' | 'github', route: string, caseName: string, status: number, source: string, body: unknown, latencyMs: number }} Entry
 */

/**
 * @param {{ dir: string, runId: string, scrubber: ReturnType<import('./scrub.mjs').createScrubber>, today?: string }} options
 * @returns {{ record: (entry: Entry) => void, flush: () => void, latencies: () => { route: string, status: number, latencyMs: number, withinTimeout: boolean }[] }}
 */
export function createRecorder({ dir, runId, scrubber, today = new Date().toISOString().slice(0, 10) }) {
  /** @type {Entry[]} */
  const pending = [];
  const seen = [];
  return {
    record(entry) {
      if (!SLUG.test(entry.route) || !SLUG.test(entry.caseName)) throw new Error('A corpus route or case name must be lowercase letters, digits, hyphens, and underscores.');
      pending.push(entry);
      seen.push({ route: `${entry.route}.${entry.caseName}`, status: entry.status, latencyMs: entry.latencyMs, withinTimeout: entry.latencyMs < TIMEOUT_MS });
    },
    flush() {
      const entries = pending.splice(0);
      // Shape every body first: a shape holds the names it replaces, and the scrub below must see them all.
      const shaped = entries.map((entry) => shapeBody(entry.provider, entry.route, entry.body, scrubber));
      entries.forEach(({ provider, route, caseName, status, source }, index) => {
        const staged = {
          provenance: {
            captured: today,
            source: scrubber.scrub(source),
            status,
            note: `recorded from a live call by tool/scripts/record-fixtures, run ${runId}; identity and inventory bodies reduced to their decoded fields; credentials, emails, names, and identifiers scrubbed to placeholders`,
          },
          body: scrubber.scrub(shaped[index]),
        };
        mkdirSync(join(dir, provider), { recursive: true, mode: 0o700 });
        writePrivate(join(dir, provider, `${route}.${caseName}.${status}.json`), `${JSON.stringify(staged, null, 2)}\n`);
      });
    },
    latencies: () => [...seen],
  };
}
