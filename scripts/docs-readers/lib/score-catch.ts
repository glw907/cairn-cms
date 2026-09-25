/**
 * The catch scorer: the plant-by-plant catch matrix, the pooled and per-class sensitivity bars
 * against a thresholds file, the held-out found rule, and the recall measures the spec reports but
 * does not gate on (exact intervals, recall by type, per-run recall, and Fleiss' kappa, both
 * instrument-wide and per class). The on-map filter restricts a development bundle's plants to a
 * job's path map, the proxy tuning rounds are scored against.
 */
import { binomialAtLeast } from './beta-binomial.js';
import { fleissKappa, type ThresholdsFile } from '../oc-curve.js';
import type { PathMap } from '../path-map.js';
import { CLASS_IDS, SEMANTIC_PLANT_TYPES, type CatchRunRecord, type ClassId, type PlantSpec, type PlantType } from './score-types.js';

/**
 * Whether a plant's line sits inside a job's on-path map: within a narrowed map's own ranges for
 * that page when the ceiling narrowed it, or within one of the page's on-path sections otherwise.
 * A plant with no page or line (a bundle that never restricts by the map) is always on-map.
 * @param map - The job's path map.
 * @param plant - The plant to place.
 * @returns True when the plant's line sits on the map.
 */
export function isPlantOnMap(map: PathMap, plant: Pick<PlantSpec, 'page' | 'line'>): boolean {
  const { page, line } = plant;
  if (page === undefined || line === undefined) return true;
  const ranges = map.ranges?.[page];
  if (ranges) return ranges.some(([start, end]) => line >= start && line <= end);
  const sections = map.pages[page]?.sections ?? [];
  return sections.some((section) => line >= section.start && line <= section.end);
}

/** One plant's catch outcome across its job's runs, after the unverified-run and opus-only rules. */
export interface PlantCatchTally {
  plantId: string;
  job: string;
  classId: ClassId;
  type: PlantType;
  semantic: boolean;
  /** Each counted run's own caught/missed outcome, in run order. */
  runsCaught: boolean[];
  caughtCount: number;
  /** At least two of the plant's counted runs caught it. */
  caught: boolean;
}

/**
 * Tally every plant's catch outcome from its job's runs: an uncounted run (opus-filtered out of a
 * development bundle) contributes no entry to `runsCaught`; a counted but unverified run
 * contributes `false` (the rerun rule: a still-failing planted run catches nothing).
 * @param plants - Every plant to tally.
 * @param runsByJob - Each job's runs, in a fixed order shared across every plant on that job.
 * @param opusOnly - When true (a development bundle), a run without `opus: true` is dropped
 * entirely rather than counted as a miss.
 * @returns One tally per plant, in the given order.
 */
export function tallyPlantCatches(plants: readonly PlantSpec[], runsByJob: Readonly<Record<string, readonly CatchRunRecord[]>>, opusOnly = false): PlantCatchTally[] {
  return plants.map((plant) => {
    const runs = (runsByJob[plant.job] ?? []).filter((run) => !opusOnly || run.opus !== false);
    const runsCaught = runs.map((run) => run.verified && run.catches[plant.id] === 'caught');
    const caughtCount = runsCaught.filter(Boolean).length;
    return {
      plantId: plant.id,
      job: plant.job,
      classId: plant.classId,
      type: plant.type,
      semantic: plant.semantic,
      runsCaught,
      caughtCount,
      caught: caughtCount >= 2,
    };
  });
}

/** The instrument-wide pooled sensitivity bar's result. */
export interface PooledSensitivityResult {
  caught: number;
  achieved: number;
  threshold: number | null;
  pass: boolean;
}

/**
 * Score the pooled sensitivity bar: at least the thresholds file's pooled threshold of the
 * achieved plant count's tallies caught. A null threshold (no count meets the operating
 * characteristic's rule) never passes, per "Recomputed thresholds": sensitivity has no gate.
 * @param tallies - Every plant's catch tally.
 * @param thresholds - The recomputed thresholds file.
 * @returns The pooled bar's caught count, achieved plant count, threshold, and pass/fail.
 */
export function scorePooledSensitivity(tallies: readonly PlantCatchTally[], thresholds: ThresholdsFile): PooledSensitivityResult {
  const caught = tallies.filter((tally) => tally.caught).length;
  const threshold = thresholds.pooled.threshold;
  return { caught, achieved: thresholds.achieved.pooled, threshold, pass: threshold !== null && caught >= threshold };
}

/** One class's own sensitivity floor result. */
export interface ClassSensitivityResult {
  classId: ClassId;
  caught: number;
  achieved: number;
  floor: number | null;
  /** True when the floor is null (no gate for a class this short) or the class met it. */
  pass: boolean;
}

/**
 * Score one class's sensitivity floor. A null floor (a class left with too few plants for the
 * operating characteristic to set one) never fails the class on its own: "that floor is reported,
 * and the class validates on the pooled bar, agreement, and its precision."
 * @param classId - The class to score.
 * @param tallies - Every plant's catch tally (filtered to this class here).
 * @param thresholds - The recomputed thresholds file.
 * @returns The class's caught count, achieved plant count, floor, and pass/fail.
 */
export function scoreClassSensitivity(classId: ClassId, tallies: readonly PlantCatchTally[], thresholds: ThresholdsFile): ClassSensitivityResult {
  const classTallies = tallies.filter((tally) => tally.classId === classId);
  const caught = classTallies.filter((tally) => tally.caught).length;
  const floorEntry = thresholds.floors[classId];
  const floor = floorEntry?.floor ?? null;
  const achieved = floorEntry?.plants ?? classTallies.length;
  return { classId, caught, achieved, floor, pass: floor === null || caught >= floor };
}

/** One held-out defect's found result. */
export interface HeldOutResult {
  id: string;
  caughtCount: number;
  /** Found when caught in at least two of its three scripter-heldout runs. */
  found: boolean;
}

/**
 * Score the held-out found rule over the scripter-heldout runs: a defect is found when at least
 * two of its three runs rule it caught. Held-out defects enter no class verdict (reported only).
 * @param defectIds - Every held-out defect id.
 * @param runs - The scripter-heldout runs (normally three, verified Opus by construction).
 * @returns One result per defect id, in the given order.
 */
export function scoreHeldOut(defectIds: readonly string[], runs: readonly CatchRunRecord[]): HeldOutResult[] {
  return defectIds.map((id) => {
    const caughtCount = runs.filter((run) => run.verified && run.catches[id] === 'caught').length;
    return { id, caughtCount, found: caughtCount >= 2 };
  });
}

/** A recall count with its exact (Clopper-Pearson) 95 percent interval. */
export interface RecallReport {
  caught: number;
  total: number;
  rate: number | null;
  interval: { lower: number; upper: number } | null;
}

/**
 * The success probability at which `binomialAtLeast(n, t, p)` crosses `target`, by bisection over
 * the tail probability's monotone rise in `p`.
 * @param n - The trial count.
 * @param t - The tail's lower success count.
 * @param target - The tail probability to solve for.
 * @returns The crossing probability.
 */
function solveTailProbability(n: number, t: number, target: number): number {
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 100; step += 1) {
    const mid = (lo + hi) / 2;
    if (binomialAtLeast(n, t, mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The exact (Clopper-Pearson) binomial confidence interval for `k` successes in `n` trials, found
 * by bisection on `binomialAtLeast`'s own monotone tail probability rather than a normal
 * approximation.
 * @param k - The success count.
 * @param n - The trial count.
 * @param alpha - The two-sided significance level (0.05 for a 95 percent interval).
 * @returns The interval's lower and upper bound.
 */
export function clopperPearson(k: number, n: number, alpha = 0.05): { lower: number; upper: number } {
  if (n === 0) return { lower: 0, upper: 1 };
  const lower = k === 0 ? 0 : solveTailProbability(n, k, alpha / 2);
  const upper = k === n ? 1 : solveTailProbability(n, k + 1, 1 - alpha / 2);
  return { lower, upper };
}

/**
 * A recall report over a set of tallies: the caught count, the total, the rate, and its exact
 * interval. A tally-free set reports a null rate and interval rather than a `0 / 0` division.
 * @param tallies - The tallies to summarize.
 * @returns The recall report.
 */
export function recallOf(tallies: readonly PlantCatchTally[]): RecallReport {
  const total = tallies.length;
  if (total === 0) return { caught: 0, total: 0, rate: null, interval: null };
  const caught = tallies.filter((tally) => tally.caught).length;
  return { caught, total, rate: caught / total, interval: clopperPearson(caught, total) };
}

/**
 * Per-class recall, over every class id, even one with no tallies at all.
 * @param tallies - Every plant's catch tally.
 * @returns One recall report per class id.
 */
export function recallByClass(tallies: readonly PlantCatchTally[]): Record<ClassId, RecallReport> {
  const result = {} as Record<ClassId, RecallReport>;
  for (const classId of CLASS_IDS) result[classId] = recallOf(tallies.filter((tally) => tally.classId === classId));
  return result;
}

/**
 * Recall split by plant type: semantic (`false-behavior`, `contradiction`,
 * `precondition-or-ordering`) against token (every other type).
 * @param tallies - Every plant's catch tally.
 * @returns The semantic and token recall reports.
 */
export function recallByPlantKind(tallies: readonly PlantCatchTally[]): { semantic: RecallReport; token: RecallReport } {
  return {
    semantic: recallOf(tallies.filter((tally) => SEMANTIC_PLANT_TYPES.has(tally.type))),
    token: recallOf(tallies.filter((tally) => !SEMANTIC_PLANT_TYPES.has(tally.type))),
  };
}

/**
 * Each run position's own marginal recall: the share of plants that run alone caught, across every
 * plant that carries an entry at that position. A plant whose job counted fewer runs than another
 * (an opus-filtered development bundle) simply carries fewer positions; each position's share is
 * taken over only the plants that reached it.
 * @param tallies - Every plant's catch tally.
 * @returns One recall share per run position, in position order.
 */
export function perRunRecall(tallies: readonly PlantCatchTally[]): number[] {
  const maxRuns = tallies.reduce((max, tally) => Math.max(max, tally.runsCaught.length), 0);
  return Array.from({ length: maxRuns }, (_, position) => {
    const atPosition = tallies.filter((tally) => tally.runsCaught.length > position);
    if (atPosition.length === 0) return 0;
    return atPosition.filter((tally) => tally.runsCaught[position]).length / atPosition.length;
  });
}

/** Fleiss' kappa is only well-defined over a rectangular matrix (every plant carrying the same run count); a set with none is skipped. */
function toKappaMatrix(tallies: readonly PlantCatchTally[]): number[][] {
  const runCounts = new Set(tallies.map((tally) => tally.runsCaught.length));
  if (runCounts.size !== 1 || [...runCounts][0] === 0) return [];
  return tallies.map((tally) => tally.runsCaught.map((caught) => (caught ? 1 : 0)));
}

/**
 * Stability (Fleiss' kappa), instrument-wide and per class, reported beside the pass rates a 0.35
 * floor would have had; this function reports only the kappa figures themselves. `NaN` (every
 * rating agrees, or the matrix is not rectangular) is passed through, never coerced.
 * @param tallies - Every plant's catch tally.
 * @returns The instrument-wide kappa and each class's own.
 */
export function stabilityKappa(tallies: readonly PlantCatchTally[]): { instrumentWide: number; byClass: Record<ClassId, number> } {
  const byClass = {} as Record<ClassId, number>;
  for (const classId of CLASS_IDS) byClass[classId] = fleissKappa(toKappaMatrix(tallies.filter((tally) => tally.classId === classId)));
  return { instrumentWide: fleissKappa(toKappaMatrix(tallies)), byClass };
}
