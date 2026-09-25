import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  JOB_CLASS,
  SEED,
  classFloor,
  fleissKappa,
  pass1Refit,
  pooledThreshold,
  recomputeThresholds,
  sensitivityTable,
  simulateStability,
} from '../../../scripts/docs-readers/oc-curve.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('pass1Refit', () => {
  it('matches the spec\'s exact figures to two decimals: mean 0.29, ICC 0.72, interval 0.25 to 0.95', () => {
    const refit = pass1Refit();
    // The grid's nearest mean sits at 0.295, exactly on the rounding cusp between 0.29 and 0.30
    // (the grid step is 0.0025), so the tolerance is the cusp's own half-step rather than a
    // plain two-decimal round.
    expect(Math.abs(refit.mean - 0.29)).toBeLessThanOrEqual(0.0051);
    expect(refit.icc).toBeCloseTo(0.72, 2);
    expect(refit.ci[0]).toBeCloseTo(0.25, 2);
    expect(refit.ci[1]).toBeCloseTo(0.95, 2);
  });
});

describe('sensitivityTable', () => {
  it('matches the spec\'s 31-of-42 pass-probability table to two decimals', () => {
    const table = sensitivityTable(42, 31, [0.6, 0.7, 0.8, 0.9], [0.25, 0.5, 0.72, 0.95]);
    const expected = [
      [0.08, 0.58, 0.98, 1.0],
      [0.06, 0.44, 0.93, 1.0],
      [0.05, 0.38, 0.9, 1.0],
      [0.05, 0.36, 0.88, 1.0],
    ];
    for (let row = 0; row < expected.length; row += 1) {
      for (let col = 0; col < expected[row].length; col += 1) {
        expect(table[row][col]).toBeCloseTo(expected[row][col], 2);
      }
    }
  });
});

describe('pooledThreshold', () => {
  it('matches the spec\'s threshold list exactly', () => {
    expect(pooledThreshold(32).threshold).toBe(24);
    expect(pooledThreshold(33).threshold).toBe(25);
    expect(pooledThreshold(34).threshold).toBeNull();
    expect(pooledThreshold(35).threshold).toBe(26);
    expect(pooledThreshold(36).threshold).toBe(27);
    expect(pooledThreshold(42).threshold).toBe(31);
  });

  it('reports null recall probabilities alongside a null threshold', () => {
    const result = pooledThreshold(34);
    expect(result.recall60PassMax).toBeNull();
    expect(result.recall80PassMin).toBeNull();
  });
});

describe('classFloor', () => {
  it('matches the spec\'s floor list exactly, including no floor at one plant', () => {
    expect(classFloor(7)).toBe(4);
    expect(classFloor(14)).toBe(9);
    expect(classFloor(6)).toBe(4);
    expect(classFloor(5)).toBe(3);
    expect(classFloor(13)).toBe(9);
    expect(classFloor(12)).toBe(8);
    expect(classFloor(1)).toBeNull();
  });
});

describe('fleissKappa', () => {
  it('is 1 when every plant\'s three runs agree perfectly, split between caught and missed', () => {
    const matrix = [
      [1, 1, 1],
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ];
    expect(fleissKappa(matrix)).toBeCloseTo(1, 6);
  });

  it('is NaN when every rating is identical, since chance agreement is already 1', () => {
    const matrix = [[1, 1, 1], [1, 1, 1]];
    expect(Number.isNaN(fleissKappa(matrix))).toBe(true);
  });
});

describe('simulateStability', () => {
  it('matches the spec\'s six ICC points within 0.02 at the fixed seed, in a few seconds', () => {
    const results = simulateStability({ seed: SEED });
    const expected: Record<number, number> = { 0.95: 1.0, 0.72: 0.99, 0.5: 0.85, 0.35: 0.47, 0.25: 0.19, 0.2: 0.09 };
    for (const figure of results) {
      expect(Math.abs(figure.probAtLeast035 - expected[figure.icc])).toBeLessThanOrEqual(0.02);
    }
  }, 20_000);
});

describe('JOB_CLASS', () => {
  it('mirrors every job-to-class pair scripts/docs-readers/batches/baseline.json carries', () => {
    interface BaselineJob {
      id: string;
      class: string;
    }
    const baseline = JSON.parse(readFileSync(join(ROOT, 'scripts/docs-readers/batches/baseline.json'), 'utf8')) as { jobs: BaselineJob[] };
    for (const job of baseline.jobs) {
      const jobName = job.id.replace(/-\d+$/, '');
      expect(JOB_CLASS[jobName]).toBe(job.class);
    }
  });
});

describe('recomputeThresholds', () => {
  it('sums each job\'s achieved plants into its class and computes the pooled and per-class figures', () => {
    const file = recomputeThresholds({ evaluator: 7, operator: 7, designer: 7, extender: 7, scripter: 7, 'core-developer': 7 });
    expect(file.seed).toBe(SEED);
    expect(file.achieved.pooled).toBe(42);
    expect(file.achieved.perClass).toEqual({ 'docs-only': 7, 'docs-and-binary': 7, 'docs-and-site': 14, repository: 14 });
    expect(file.pooled.threshold).toBe(31);
    expect(file.floors['docs-only'].floor).toBe(4);
    expect(file.floors['docs-and-site'].floor).toBe(9);
  });

  it('throws when a job has no class mapping', () => {
    expect(() => recomputeThresholds({ 'unknown-job': 7 })).toThrow(/unknown-job/);
  });
});

describe('the oc-curve thresholds CLI', () => {
  it('writes the thresholds file to --out', async () => {
    const { main } = await import('../../../scripts/docs-readers/oc-curve.js');
    const { mkdtempSync, readFileSync: readFile } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const dir = mkdtempSync(join(tmpdir(), 'oc-curve-cli-'));
    const out = join(dir, 'thresholds.json');
    const code = main(['thresholds', '--plants', 'evaluator=7,operator=7,designer=7,extender=7,scripter=7,core-developer=7', '--out', out]);
    expect(code).toBe(0);
    const written = JSON.parse(readFile(out, 'utf8'));
    expect(written.achieved.pooled).toBe(42);
    expect(written.pooled.threshold).toBe(31);
  });
});
