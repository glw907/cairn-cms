/**
 * The scorer's integrity checks: which batches development mode may read, and gated mode's three
 * requirements (every job stamped, the stamp matching the manifest at its tag, and the post-freeze
 * chain verified for every artifact the scoring run depends on).
 */
import { readChain, verifyChain, chainPrefixLength } from './chain.js';
import type { FreezeStamp } from './types.js';

/**
 * The batch names development mode may score: pass 1's saved batches, rescored under this spec's
 * rules, and round 1's own batch. A batch outside this set is either a live gated batch or a
 * caller's mistake, and development mode refuses either way, since it can never emit a bar or a
 * class verdict.
 */
export const DEVELOPMENT_BATCH_NAMES: ReadonlySet<string> = new Set(['validation', 'validation-rerun', 'baseline', 'baseline-rerun', 'round1']);

/**
 * Whether development mode may read a batch, by its own name.
 * @param batchName - A batch report's `batch` field.
 * @returns `ok: false` with a problem naming the batch when it is not a development batch.
 */
export function checkDevelopmentBatch(batchName: string): { ok: boolean; problem?: string } {
  if (DEVELOPMENT_BATCH_NAMES.has(batchName)) return { ok: true };
  return { ok: false, problem: `batch "${batchName}" is not a development batch; development mode reads only ${[...DEVELOPMENT_BATCH_NAMES].sort().join(', ')}` };
}

/** One report's gated stamp, as the scorer reads it. */
export interface StampedReport {
  /** A label for problem messages: the report's own path, optionally with its job id. */
  label: string;
  freeze?: FreezeStamp;
}

/**
 * Check one report's freeze stamp against the manifest gated mode requires: present at all, its
 * tag matching, and its `manifestHash` matching the manifest's own current hash (the hash of the
 * manifest file's bytes, as `freeze.ts` computes it).
 * @param report - The report to check, labeled for its problem message.
 * @param manifestTag - The frozen tag the manifest carries.
 * @param manifestHash - The manifest file's own current sha256.
 * @returns `ok: false` with one problem naming the report when the stamp is missing or stale.
 */
export function checkGatedStamp(report: StampedReport, manifestTag: string, manifestHash: string): { ok: boolean; problem?: string } {
  if (!report.freeze) return { ok: false, problem: `${report.label}: report is unstamped; gated mode requires a freeze stamp` };
  if (report.freeze.tag !== manifestTag) {
    return { ok: false, problem: `${report.label}: stamped tag "${report.freeze.tag}" does not match the manifest's tag "${manifestTag}"` };
  }
  if (report.freeze.manifestHash !== manifestHash) {
    return { ok: false, problem: `${report.label}: stale manifestHash (stamped "${report.freeze.manifestHash}", manifest is now "${manifestHash}")` };
  }
  return { ok: true };
}

/**
 * One report's own chain dependency check: its `chainHead` (the prefix of the chain it saw at gate
 * time or its last resume) and the chain-relative artifact paths its scoring reads.
 */
export interface GatedChainCheck {
  label: string;
  chainHead: string;
  dependsOn: readonly string[];
}

/**
 * Verify the post-freeze chain gated mode requires: every artifact on disk matches its own latest
 * chain entry (the chain's own linkage and file-drift check), and, for each report being scored,
 * none of the artifacts its scoring depends on was chained after that report's own `chainHead`
 * prefix, since an entry appended after a report's chain head postdates it, and the report cannot
 * have read that later version. Takes the post-freeze chain file, the directory each chain entry's
 * own path is resolved against, and every report being scored with the artifact paths its scoring
 * reads.
 * @returns Every problem found; `ok` when none were.
 */
export function verifyGatedChain({
  chainFile,
  root,
  checks,
}: {
  chainFile: string;
  root: string;
  checks: readonly GatedChainCheck[];
}): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const drift = verifyChain(chainFile, root);
  for (const broken of drift.brokenLinks) problems.push(broken.reason);
  for (const mismatch of drift.fileMismatches) problems.push(`chain artifact "${mismatch.path}": ${mismatch.reason}`);

  const latestLine = new Map<string, number>();
  readChain(chainFile).forEach((entry, index) => latestLine.set(entry.path, index + 1));

  for (const check of checks) {
    let prefixLength: number;
    try {
      prefixLength = chainPrefixLength(chainFile, check.chainHead);
    } catch (error) {
      problems.push(`${check.label}: chain head matches no prefix of the chain (${(error as Error).message})`);
      continue;
    }
    for (const path of check.dependsOn) {
      const line = latestLine.get(path);
      if (line === undefined) {
        problems.push(`${check.label}: no chain entry for "${path}"`);
        continue;
      }
      if (line > prefixLength) {
        problems.push(`${check.label}: artifact "${path}" (chained at line ${line}) postdates this report, which read only the chain's first ${prefixLength} entries`);
      }
    }
  }
  return { ok: problems.length === 0, problems };
}
