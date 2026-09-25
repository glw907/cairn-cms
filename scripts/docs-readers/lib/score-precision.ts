/**
 * The precision scorer: false findings per run, under the unverified-run rerun rule and the
 * harness exclusion, and the per-class precision bar against the pool size itself (the bar's own
 * "at most one per run" reads as "false findings summed at most the run count").
 */
import { CLASS_IDS, type ClassId, type PrecisionRunRecord } from './score-types.js';

/** One run's own false and real finding counts, and its total examined items. */
export interface RunFindingCounts {
  runId: string;
  falseFindings: number;
  realFindings: number;
  totalItems: number;
}

/**
 * One run's finding counts. An unverified run (still failing after its rerun) counts every item in
 * its catch fields as a false finding, per the rerun rule, regardless of the harness filter; a
 * verified run counts a `false`-ruled, non-harness-excluded item as a false finding and a
 * `real`-ruled one as a real finding. A `harness`-ruled or filter-excluded item counts as neither.
 * @param run - The run to count.
 * @returns The run's false, real, and total item counts.
 */
export function findingCountsForRun(run: PrecisionRunRecord): RunFindingCounts {
  if (!run.verified) return { runId: run.runId, falseFindings: run.itemCount, realFindings: 0, totalItems: run.itemCount };
  const items = run.items ?? [];
  let falseFindings = 0;
  let realFindings = 0;
  for (const item of items) {
    if (item.harnessExcluded || item.ruling === 'harness') continue;
    if (item.ruling === 'false') falseFindings += 1;
    else if (item.ruling === 'real') realFindings += 1;
  }
  return { runId: run.runId, falseFindings, realFindings, totalItems: items.length };
}

/** One class's precision bar result. */
export interface ClassPrecisionResult {
  classId: ClassId;
  falseFindings: number;
  /** The bar: false findings summed over the pool at most one per run, so the limit is the pool's own run count. */
  limit: number;
  pass: boolean;
  /** Real findings as a share of every ruled finding; null when the class carried no finding at all, never a `0 / 0` division. */
  share: number | null;
}

/**
 * Score one class's precision bar: every run in `runs` already filtered to that class's own
 * pool (the caller decides which pool, gated mapping runs or a development round's control runs,
 * so a tuning-round run never reaches gated precision scoring by construction).
 * @param classId - The class to score.
 * @param runs - The class's own pool of precision runs.
 * @returns The class's false-finding sum, its limit, pass/fail, and its reported share.
 */
export function scoreClassPrecision(classId: ClassId, runs: readonly PrecisionRunRecord[]): ClassPrecisionResult {
  const classRuns = runs.filter((run) => run.classId === classId);
  const counts = classRuns.map(findingCountsForRun);
  const falseFindings = counts.reduce((sum, c) => sum + c.falseFindings, 0);
  const realFindings = counts.reduce((sum, c) => sum + c.realFindings, 0);
  const limit = classRuns.length;
  const total = falseFindings + realFindings;
  return { classId, falseFindings, limit, pass: falseFindings <= limit, share: total === 0 ? null : realFindings / total };
}

/**
 * Every class's precision bar, over every class id, even one with no runs in the pool at all (its
 * limit and false-finding count both report as zero, a pass, never a divide by zero).
 * @param runs - The full precision pool.
 * @returns One precision result per class id.
 */
export function precisionByClass(runs: readonly PrecisionRunRecord[]): Record<ClassId, ClassPrecisionResult> {
  const result = {} as Record<ClassId, ClassPrecisionResult>;
  for (const classId of CLASS_IDS) result[classId] = scoreClassPrecision(classId, runs);
  return result;
}
