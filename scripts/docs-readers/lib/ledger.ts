/**
 * The reader-usage ledger. Reader runs spend outside the Workflow counter, so the runner appends
 * every run's usage here and totals it by the pass's counting rule: input, output, and
 * cache-creation tokens count against the ceiling; cache-read tokens are reported separately and
 * do not count.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { emptyUsage } from './transcript.js';
import type { LedgerEntry, ReportUsage, Usage } from './types.js';

/**
 * The tokens a usage record counts against the ceiling.
 * @param usage - The four counts.
 * @returns Input plus output plus cache creation.
 */
export function countedTokens(usage: Usage): number {
  return usage.input + usage.output + usage.cacheCreation;
}

/**
 * Add two usage records.
 * @param a - One record.
 * @param b - The other record.
 * @returns A new record holding the sums.
 */
export function addUsage(a: Usage, b: Usage): Usage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheCreation: a.cacheCreation + b.cacheCreation,
    cacheRead: a.cacheRead + b.cacheRead,
  };
}

/**
 * The usage shape a report carries: the four counts, the counted total, and cache reads apart.
 * @param usage - The four counts.
 * @returns The report's `usage` block.
 */
export function reportUsage(usage: Usage): ReportUsage {
  return { ...usage, counted: countedTokens(usage) };
}

/**
 * Append one run's usage to the ledger file.
 * @param file - The ledger path (JSON lines).
 * @param entry - The batch, run id, job id, model, and usage of one run.
 */
export function appendLedger(file: string, entry: LedgerEntry): void {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify({ ...entry, counted: countedTokens(entry.usage) })}\n`);
}

/**
 * Read the ledger's entries.
 * @param file - The ledger path.
 * @returns The entries, oldest first; none when the file does not exist.
 */
export function readLedger(file: string): LedgerEntry[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as LedgerEntry);
}

/**
 * Total a set of ledger entries by the counting rule.
 * @param entries - Ledger entries, each carrying a `usage` record.
 * @returns The summed counts, the counted total, and the number of runs.
 */
export function ledgerTotal(entries: LedgerEntry[]): ReportUsage & { runs: number } {
  let usage = emptyUsage();
  for (const entry of entries) usage = addUsage(usage, entry.usage);
  return { ...reportUsage(usage), runs: entries.length };
}
