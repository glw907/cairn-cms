/**
 * The scorer's integrity checks: which batches development mode may read, and gated mode's
 * requirements (every job stamped, the stamp matching the manifest at its tag, every job actually
 * finished, and the post-freeze chain verified for every artifact the scoring run depends on).
 */
import { readChain, verifyChain, chainPrefixLength } from './chain.js';
import type { FreezeStamp } from './types.js';

/**
 * The batch names development mode may score: pass 1's validation batch and its rerun, rescored
 * under this spec's rules, round 1's own batch (O7 ruling: no other pass 1 batch is a development
 * batch for this spec's purposes), and pass 2a's five pilot batches, one per job, named explicitly
 * (never by a `pilot-2a-` prefix rule, so the unscored smoke batch `pilot-2a-smoke` stays refused).
 * A batch outside this set is either a live gated batch or a caller's mistake, and development mode
 * refuses either way, since it can never emit a bar or a class verdict.
 */
export const DEVELOPMENT_BATCH_NAMES: ReadonlySet<string> = new Set([
  'validation',
  'validation-rerun',
  'round1',
  'pilot-2a-operator',
  'pilot-2a-designer',
  'pilot-2a-extender',
  'pilot-2a-core-developer',
  'pilot-2a-scripter',
]);

/** A report development mode is asked to score: its batch name and every job's own freeze stamp. */
export interface DevelopmentModeReport {
  batch: string;
  jobs: ReadonlyArray<{ id: string; freeze?: unknown }>;
}

/**
 * Whether development mode may read a report: its batch name is a development batch, and no job
 * in it carries a freeze stamp at all, since a stamped job belongs to a gated batch by
 * construction and development mode can never emit a bar or a class verdict for one.
 * @param report - The report to check.
 * @returns `ok: false` with a problem naming the batch or the stamped job.
 */
export function checkDevelopmentBatch(report: DevelopmentModeReport): { ok: boolean; problem?: string } {
  if (!DEVELOPMENT_BATCH_NAMES.has(report.batch)) {
    return { ok: false, problem: `batch "${report.batch}" is not a development batch; development mode reads only ${[...DEVELOPMENT_BATCH_NAMES].sort().join(', ')}` };
  }
  const stamped = report.jobs.find((job) => job.freeze !== undefined);
  if (stamped) return { ok: false, problem: `batch "${report.batch}" job "${stamped.id}" carries a freeze stamp; development mode never reads a gated job` };
  return { ok: true };
}

/** A report gated mode is asked to score: its own stop reason, and every job's stop state. */
export interface GatedModeReport {
  label: string;
  stopReason: string;
  jobs: ReadonlyArray<{ id: string; stoppedBy?: unknown; pendingCause?: unknown }>;
}

/**
 * Whether a report gated mode is asked to score actually finished: its own `stopReason` is
 * `complete`, and no job carries `stoppedBy`/`pendingCause` (a batch-level stop left it with no
 * final attempt, so it has nothing a scorer could read).
 * @param report - The report to check, labeled for its problem message.
 * @returns `ok: false` with one problem per unfinished job, plus one for a non-`complete` stop reason.
 */
export function checkReportComplete(report: GatedModeReport): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  if (report.stopReason !== 'complete') problems.push(`${report.label}: stopReason is "${report.stopReason}", not "complete"`);
  for (const job of report.jobs) {
    if (job.stoppedBy !== undefined || job.pendingCause !== undefined) {
      problems.push(`${report.label}: job "${job.id}" carries stoppedBy/pendingCause and has no final attempt`);
    }
  }
  return { ok: problems.length === 0, problems };
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
 * Whether the manifest hash equals the chain's own genesis entry hash, the pinned link between the
 * freeze manifest and the post-freeze chain (the chain's first entry is always the manifest
 * itself, per its own "Task 5, the chain" pin).
 * @param chainFile - The post-freeze chain file.
 * @param manifestHash - The manifest file's own current sha256.
 * @returns `ok: false` with a problem when the chain is empty or its genesis entry does not match.
 */
export function checkManifestIsGenesis(chainFile: string, manifestHash: string): { ok: boolean; problem?: string } {
  const [genesis] = readChain(chainFile);
  if (!genesis) return { ok: false, problem: 'the post-freeze chain has no genesis entry' };
  if (genesis.sha256 !== manifestHash) {
    return { ok: false, problem: `the chain's genesis entry ("${genesis.sha256}") does not match the manifest's own hash ("${manifestHash}")` };
  }
  return { ok: true };
}

/**
 * One report's own chain dependency check: its `chainHead` (the prefix of the chain it saw at gate
 * time or its last resume) and the chain-relative artifact paths its scoring depends on.
 */
export interface GatedChainCheck {
  label: string;
  chainHead: string;
  dependsOn: readonly string[];
}

/**
 * Verify the post-freeze chain gated mode requires: every artifact on disk matches its own latest
 * chain entry (the chain's own linkage and file-drift check), for each report being scored, none
 * of the artifacts its scoring depends on was chained after that report's own `chainHead` prefix
 * (an entry appended after a report's chain head postdates it, and the report cannot have read
 * that later version), and, when given, that the agreement sample's own chain entry precedes every
 * one of the agreement rulings files' own entries (the sample is written, and chained, before any
 * Fable ruling exists, so every rulings file scored against it must postdate it in the chain).
 * Takes the post-freeze chain file; the directory each chain entry's own path is resolved
 * against; every report being scored with the artifact paths its scoring reads; and, optionally,
 * the sample path and every rulings path to order-check against it.
 * @returns Every problem found; `ok` when none were.
 */
export function verifyGatedChain({
  chainFile,
  root,
  checks,
  sampleBeforeRulings,
}: {
  chainFile: string;
  root: string;
  checks: readonly GatedChainCheck[];
  sampleBeforeRulings?: { samplePath: string; rulingsPaths: readonly string[] };
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

  if (sampleBeforeRulings) {
    const sampleLine = latestLine.get(sampleBeforeRulings.samplePath);
    if (sampleLine === undefined) {
      problems.push(`no chain entry for the agreement sample "${sampleBeforeRulings.samplePath}"`);
    } else {
      for (const rulingsPath of sampleBeforeRulings.rulingsPaths) {
        const rulingsLine = latestLine.get(rulingsPath);
        if (rulingsLine === undefined) problems.push(`no chain entry for the agreement rulings "${rulingsPath}"`);
        else if (sampleLine >= rulingsLine) {
          problems.push(`agreement sample "${sampleBeforeRulings.samplePath}" (chained at line ${sampleLine}) does not precede the rulings "${rulingsPath}" (chained at line ${rulingsLine})`);
        }
      }
    }
  }

  return { ok: problems.length === 0, problems };
}
