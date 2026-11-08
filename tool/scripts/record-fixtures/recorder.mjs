// Staging: one scrubbed body per file, named like the corpus (`<route>.<case>.<status>.json`) with
// a provenance block, plus the latency of each route against the request timeout.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const TIMEOUT_MS = 15_000;

/**
 * @param {{ dir: string, runId: string, scrubber: ReturnType<import('./scrub.mjs').createScrubber>, today?: string }} options
 * @returns {{ record: (entry: { provider: 'cloudflare' | 'github', route: string, caseName: string, status: number, source: string, body: unknown, latencyMs: number }) => void, latencies: () => { route: string, status: number, latencyMs: number, withinTimeout: boolean }[] }}
 */
export function createRecorder({ dir, runId, scrubber, today = new Date().toISOString().slice(0, 10) }) {
  const seen = [];
  return {
    record({ provider, route, caseName, status, source, body, latencyMs }) {
      const staged = {
        provenance: {
          captured: today,
          source,
          status,
          note: `recorded verbatim from a live call by tool/scripts/record-fixtures, run ${runId}; credentials, emails, and identifiers scrubbed to placeholders`,
        },
        body: scrubber.scrub(body),
      };
      mkdirSync(join(dir, provider), { recursive: true });
      writeFileSync(join(dir, provider, `${route}.${caseName}.${status}.json`), `${JSON.stringify(staged, null, 2)}\n`);
      seen.push({ route: `${route}.${caseName}`, status, latencyMs, withinTimeout: latencyMs < TIMEOUT_MS });
    },
    latencies: () => [...seen],
  };
}
