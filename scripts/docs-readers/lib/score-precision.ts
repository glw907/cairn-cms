/**
 * The precision scorer: false findings per run, counted one per adjudicator subject group (never
 * one per catch-field item, since several items can point at the same subject), under the
 * unverified-run rerun rule and the harness exclusion; and the per-class precision bar against the
 * class's own planned pool size, never the count of runs a caller happened to supply.
 */
import { CLASS_IDS, type ClassId, type PrecisionRunRecord } from './score-types.js';

/** One run's own false and real finding counts (each a subject group, not an item) and its total examined items. */
export interface RunFindingCounts {
  runId: string;
  falseFindings: number;
  realFindings: number;
  totalItems: number;
}

/**
 * One run's finding counts. An unverified run (still failing after its rerun) counts every item in
 * its catch fields as a false finding, one per item, per the rerun rule; there is no subject
 * grouping to count by, since the adjudicator never ran against a working report. A verified run's
 * items are grouped by `subjectGroupId` (a `finding`-classified, non-harness-filtered item only,
 * and never a `harness`-ruled one), and each group counts once, by its own ruling; every item in a
 * group is expected to share that group's ruling, so the first item found for a group decides it.
 * @param run - The run to count.
 * @returns The run's false, real, and total item counts.
 */
export function findingCountsForRun(run: PrecisionRunRecord): RunFindingCounts {
  if (!run.verified) return { runId: run.runId, falseFindings: run.itemCount, realFindings: 0, totalItems: run.itemCount };
  const items = run.items ?? [];
  const groupRulings = new Map<string, 'real' | 'false' | 'harness'>();
  for (const item of items) {
    if (item.harnessFiltered || !item.adjudication || item.adjudication.class !== 'finding') continue;
    const { subjectGroupId, ruling } = item.adjudication;
    if (!groupRulings.has(subjectGroupId)) groupRulings.set(subjectGroupId, ruling);
  }
  let falseFindings = 0;
  let realFindings = 0;
  for (const ruling of groupRulings.values()) {
    if (ruling === 'false') falseFindings += 1;
    else if (ruling === 'real') realFindings += 1;
  }
  return { runId: run.runId, falseFindings, realFindings, totalItems: items.length };
}

/** The planned mapping-run pool size for a class: three runs per job, one job for a one-job class, two for a two-job class. */
export function plannedPoolSize(jobCount: number): number {
  return jobCount * 3;
}

/** One class's precision bar result. */
export interface ClassPrecisionResult {
  classId: ClassId;
  falseFindings: number;
  /** The bar: false findings summed over the pool at most one per run, so the limit is the class's own planned pool size (never the count of runs a caller supplied). */
  limit: number;
  pass: boolean;
  /** Real findings as a share of every ruled finding; null when the class carried no finding at all, never a `0 / 0` division. */
  share: number | null;
}

/**
 * Score one class's precision bar against its own planned pool size. `runs` is the class's own
 * pool, already restricted to the planned Opus mapping runs (never `scripter-heldout`, never a
 * non-Opus run, never a tuning-round control run); `plannedJobCount` is how many jobs the class
 * plans (1 or 2), which fixes the bar's limit independently of how many runs `runs` actually
 * carries, so a missing run never inflates a class's own allowance.
 * @param classId - The class to score.
 * @param runs - The class's own pool of precision runs.
 * @param plannedJobCount - The class's planned job count (1 or 2).
 * @returns The class's false-finding sum, its limit, pass/fail, and its reported share.
 */
export function scoreClassPrecision(classId: ClassId, runs: readonly PrecisionRunRecord[], plannedJobCount: number): ClassPrecisionResult {
  const classRuns = runs.filter((run) => run.classId === classId);
  const counts = classRuns.map(findingCountsForRun);
  const falseFindings = counts.reduce((sum, c) => sum + c.falseFindings, 0);
  const realFindings = counts.reduce((sum, c) => sum + c.realFindings, 0);
  const limit = plannedPoolSize(plannedJobCount);
  const total = falseFindings + realFindings;
  return { classId, falseFindings, limit, pass: falseFindings <= limit, share: total === 0 ? null : realFindings / total };
}

/**
 * Every class's precision bar, over every class id, even one with no runs in the pool at all (its
 * false-finding count reports as zero, a pass, never a divide by zero).
 * @param runs - The full precision pool.
 * @param plannedJobCounts - Each class's own planned job count (1 or 2).
 * @returns One precision result per class id.
 */
export function precisionByClass(runs: readonly PrecisionRunRecord[], plannedJobCounts: Record<ClassId, number>): Record<ClassId, ClassPrecisionResult> {
  const result = {} as Record<ClassId, ClassPrecisionResult>;
  for (const classId of CLASS_IDS) result[classId] = scoreClassPrecision(classId, runs, plannedJobCounts[classId]);
  return result;
}

/**
 * Confirm a class's precision pool carries every planned run: for each of `jobs`, all three of its
 * mapping-run positions (1, 2, and 3) present in `runIds`. A job short a position is named; the
 * caller is expected to have already excluded `scripter-heldout` and any non-Opus run from
 * `runIds` before calling this, so a position that only ever existed as a Sonnet run is reported
 * missing here too, correctly.
 * @param jobs - The class's own jobs.
 * @param runIds - Every admissible run id already gathered for this class's pool.
 * @returns Every missing `<job>-<n>` position, empty when the pool is complete.
 */
export function missingPlannedRuns(jobs: readonly string[], runIds: ReadonlySet<string>): string[] {
  const missing: string[] = [];
  for (const job of jobs) {
    for (let position = 1; position <= 3; position += 1) {
      const id = `${job}-${position}`;
      if (!runIds.has(id)) missing.push(id);
    }
  }
  return missing;
}
