#!/usr/bin/env -S npx tsx
/**
 * The operating characteristic: the pass 1 beta-binomial refit, the sensitivity pass-probability
 * table, the per-class floors, the stability figures, and the pooled and per-class thresholds at
 * any achieved plant count, all seeded (seed 20260924) where a simulation is involved. The
 * `thresholds` CLI subcommand recomputes every threshold at whatever plant counts a job actually
 * achieved and writes the pinned thresholds file the scorer reads.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/oc-curve.ts thresholds --plants JOB=N[,JOB=N...] [--out FILE]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { betaBinomialShape, passProbability, refitBetaBinomial, type RefitResult } from './lib/beta-binomial.js';
import { mulberry32, randomBeta } from './lib/random.js';

/** The seed every simulated figure here is drawn under. */
export const SEED = 20260924;

/** The intraclass correlation range the design holds across, its low and high ends. */
const ICC_LOW = 0.25;
const ICC_HIGH = 0.95;

/**
 * The pass 1 beta-binomial refit: pass 1's two Opus runs per plant, recounted under this spec's
 * counting rule (a catch made only in `ruleCandidates[]` counts as a miss), caught 4 plants in
 * both runs, 2 in one, and 11 in neither.
 * @returns The maximum-likelihood mean and intraclass correlation, and the profile 95 percent
 * interval over the intraclass correlation.
 */
export function pass1Refit(): RefitResult {
  return refitBetaBinomial({ 2: 4, 1: 2, 0: 11 }, 2);
}

/**
 * The pass-probability table over a grid of true recall and intraclass correlation values, at a
 * fixed plant count and threshold.
 * @param n - The plant count.
 * @param threshold - The pass threshold.
 * @param recalls - The true recall values to tabulate.
 * @param iccs - The intraclass correlation values to tabulate.
 * @returns One row per intraclass correlation, one column per recall.
 */
export function sensitivityTable(n: number, threshold: number, recalls: number[], iccs: number[]): number[][] {
  return iccs.map((icc) => recalls.map((recall) => passProbability(n, threshold, recall, icc)));
}

/** One count's pooled threshold, and the recall-0.6 and recall-0.8 pass probabilities that bind it. */
export interface PooledThresholdResult {
  threshold: number | null;
  recall60PassMax: number | null;
  recall80PassMin: number | null;
}

/**
 * The pooled sensitivity threshold at a plant count: the smallest count of catches at which a true
 * recall of 0.6 passes with probability at most 0.1 and 0.8 passes with probability at least 0.8,
 * at every intraclass correlation from 0.25 to 0.95. Both bounds bind at this range's own
 * endpoints (the recall-0.6 pass probability peaks at 0.25, the recall-0.8 one bottoms at 0.95),
 * so checking the two endpoints alone is exact, not an approximation.
 * @param n - The plant count.
 * @returns The threshold, or null when no count meets the rule, plus the two binding
 * probabilities (also null when there is no threshold).
 */
export function pooledThreshold(n: number): PooledThresholdResult {
  for (let t = 1; t <= n; t += 1) {
    const recall60PassMax = passProbability(n, t, 0.6, ICC_LOW);
    const recall80PassMin = passProbability(n, t, 0.8, ICC_HIGH);
    if (recall60PassMax <= 0.1 && recall80PassMin >= 0.8) return { threshold: t, recall60PassMax, recall80PassMin };
  }
  return { threshold: null, recall60PassMax: null, recall80PassMin: null };
}

/** The intraclass correlation grid a class floor is checked across: 0.25 to 0.95, in steps of 0.01. */
const FLOOR_ICC_GRID = Array.from({ length: 71 }, (_, i) => Math.round((ICC_LOW + i * 0.01) * 100) / 100);

/**
 * A class's sensitivity floor at its achieved plant count: the largest catch count a class at true
 * recall 0.8 reaches with probability at least 0.9, at every intraclass correlation in the range.
 * Unlike the pooled threshold, the floor's own binding intraclass correlation is not always at a
 * grid endpoint, so this sweeps the whole range in steps of 0.01.
 * @param n - The class's achieved plant count.
 * @returns The floor, or null when a class at one plant has no count that meets the rule.
 */
export function classFloor(n: number): number | null {
  let floor: number | null = null;
  for (let k = 1; k <= n; k += 1) {
    const minPass = Math.min(...FLOOR_ICC_GRID.map((icc) => passProbability(n, k, 0.8, icc)));
    if (minPass >= 0.9) floor = k;
  }
  return floor;
}

/**
 * Fleiss' kappa over an N-plant by three-run binary catch matrix, the two-category case: each
 * subject's own observed agreement is how many of its three rater pairs agree, averaged; chance
 * agreement comes from the overall share of "caught" ratings across every cell.
 * @param matrix - One row per plant, one column per run, each cell 1 (caught) or 0 (missed).
 * @returns Fleiss' kappa, or `NaN` when every rating agrees (chance agreement is already 1).
 */
export function fleissKappa(matrix: number[][]): number {
  const raters = matrix[0]?.length ?? 0;
  if (raters === 0 || matrix.length === 0) return NaN;
  const perSubject = matrix.map((row) => {
    const ones = row.reduce((sum, cell) => sum + cell, 0);
    const zeros = raters - ones;
    return (ones * (ones - 1) + zeros * (zeros - 1)) / (raters * (raters - 1));
  });
  const meanAgreement = perSubject.reduce((sum, p) => sum + p, 0) / perSubject.length;
  const totalCells = matrix.length * raters;
  const shareOnes = matrix.reduce((sum, row) => sum + row.reduce((s, c) => s + c, 0), 0) / totalCells;
  const chanceAgreement = shareOnes ** 2 + (1 - shareOnes) ** 2;
  return chanceAgreement < 1 ? (meanAgreement - chanceAgreement) / (1 - chanceAgreement) : NaN;
}

/** One intraclass correlation's simulated stability figures. */
export interface StabilityFigure {
  icc: number;
  /** The share of simulated draws whose Fleiss' kappa clears 0.35. */
  probAtLeast035: number;
}

/**
 * Simulate Fleiss' kappa's distribution at a fixed true recall, over a grid of intraclass
 * correlations, by drawing each plant's per-run catch probability from a beta distribution and
 * each of its three runs from a Bernoulli draw at that probability.
 * The options object carries the seed every draw is generated under, the plant count and draw
 * count per intraclass correlation, the intraclass correlation values to simulate, and the true
 * recall every draw shares.
 * @returns One figure per intraclass correlation, in the order given.
 */
export function simulateStability(options: { seed: number; n?: number; draws?: number; iccs?: number[]; trueRecall?: number }): StabilityFigure[] {
  const { seed, n = 42, draws = 5000, iccs = [0.95, 0.72, 0.5, 0.35, 0.25, 0.2], trueRecall = 0.8 } = options;
  const rng = mulberry32(seed);
  return iccs.map((icc) => {
    const { a, b } = betaBinomialShape(trueRecall, icc);
    let passCount = 0;
    for (let draw = 0; draw < draws; draw += 1) {
      const matrix: number[][] = [];
      for (let plant = 0; plant < n; plant += 1) {
        const p = randomBeta(rng, a, b);
        matrix.push([rng() < p ? 1 : 0, rng() < p ? 1 : 0, rng() < p ? 1 : 0]);
      }
      const kappa = fleissKappa(matrix);
      if (Number.isFinite(kappa) && kappa >= 0.35) passCount += 1;
    }
    return { icc, probAtLeast035: passCount / draws };
  });
}

/**
 * The development jobs' classes, mirroring `scripts/docs-readers/batches/baseline.json`'s own
 * `id`/`class` pairs (each job id there carries a `-N` run suffix this map strips).
 */
export const JOB_CLASS: Record<string, string> = {
  evaluator: 'docs-only',
  operator: 'docs-and-binary',
  designer: 'docs-and-site',
  extender: 'docs-and-site',
  'core-developer': 'repository',
  scripter: 'repository',
};

/** The recomputed thresholds file's shape, as the scorer reads it. */
export interface ThresholdsFile {
  seed: number;
  achieved: { pooled: number; perClass: Record<string, number> };
  pooled: PooledThresholdResult;
  floors: Record<string, { plants: number; floor: number | null }>;
}

/**
 * Recompute every threshold at a set of achieved per-job plant counts: the pooled threshold at the
 * summed count, and each class's floor at its own summed count.
 * @param plantsByJob - Each job's achieved plant count.
 * @param jobClass - The job-to-class map (`JOB_CLASS` by default).
 * @returns The thresholds file.
 */
export function recomputeThresholds(plantsByJob: Record<string, number>, jobClass: Record<string, string> = JOB_CLASS): ThresholdsFile {
  const perClass: Record<string, number> = {};
  for (const [job, plants] of Object.entries(plantsByJob)) {
    const cls = jobClass[job];
    if (!cls) throw new Error(`job "${job}" has no class mapping`);
    perClass[cls] = (perClass[cls] ?? 0) + plants;
  }
  const pooledCount = Object.values(plantsByJob).reduce((sum, n) => sum + n, 0);
  const floors: Record<string, { plants: number; floor: number | null }> = {};
  for (const [cls, plants] of Object.entries(perClass)) floors[cls] = { plants, floor: classFloor(plants) };
  return { seed: SEED, achieved: { pooled: pooledCount, perClass }, pooled: pooledThreshold(pooledCount), floors };
}

/**
 * Parse `--plants JOB=N[,JOB=N...]`.
 * @param value - The flag's raw value.
 * @returns Each job's achieved plant count.
 */
function parsePlants(value: string): Record<string, number> {
  const plants: Record<string, number> = {};
  for (const pair of value.split(',')) {
    const [job, count] = pair.split('=');
    if (!job || count === undefined || Number.isNaN(Number(count))) throw new Error(`bad --plants entry "${pair}"`);
    plants[job.trim()] = Number(count);
  }
  return plants;
}

/**
 * Run the `oc-curve.ts thresholds` CLI.
 * @param argv - The arguments after `thresholds`.
 * @returns The process exit code.
 */
export function main(argv: string[]): number {
  if (argv[0] !== 'thresholds') {
    process.stderr.write('usage: oc-curve.ts thresholds --plants JOB=N[,JOB=N...] [--out FILE]\n');
    return 1;
  }
  let plantsValue: string | undefined;
  let out: string | undefined;
  const rest = argv.slice(1);
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--plants') plantsValue = rest[++i];
    else if (rest[i] === '--out') out = rest[++i];
    else throw new Error(`unknown flag "${rest[i]}"`);
  }
  if (!plantsValue) throw new Error('--plants is required');
  const file = recomputeThresholds(parsePlants(plantsValue));
  const json = `${JSON.stringify(file, null, 2)}\n`;
  if (out) writeFileSync(resolve(out), json);
  else process.stdout.write(json);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
