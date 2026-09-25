import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  assertThresholdsMatchTally,
  clopperPearson,
  isPlantOnMap,
  nearestStepDistance,
  perRunRecall,
  plantPathPosition,
  recallByBucket,
  recallByClass,
  recallByPlantKind,
  recallByPlantRun,
  recallOf,
  scoreClassSensitivity,
  scoreHeldOut,
  scorePooledSensitivity,
  stabilityKappa,
  tallyPlantCatches,
  type PlantCatchTally,
} from '../../../scripts/docs-readers/lib/score-catch.js';
import type { CatchRunRecord, PlantSpec } from '../../../scripts/docs-readers/lib/score-types.js';
import type { PathMap } from '../../../scripts/docs-readers/path-map.js';
import type { ThresholdsFile } from '../../../scripts/docs-readers/oc-curve.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, 'scripts/docs-readers/fixtures', name), 'utf8')) as T;
}

const PLANT = (id: string, job: string, classId: PlantSpec['classId'], overrides: Partial<PlantSpec> = {}): PlantSpec => ({
  id,
  job,
  classId,
  type: 'false-behavior',
  semantic: true,
  ...overrides,
});

const RUN = (runId: string, catches: Record<string, 'caught' | 'missed'>, overrides: Partial<CatchRunRecord> = {}): CatchRunRecord => ({
  runId,
  verified: true,
  opus: true,
  catches,
  ...overrides,
});

describe('isPlantOnMap', () => {
  const map: PathMap = {
    job: 'evaluator',
    verifiedRuns: 3,
    mode: 'steps',
    pages: { 'docs/a.md': { lines: 100, sections: [{ heading: 'H2', level: 2, start: 10, end: 20, quotes: 3, runs: 3 }] } },
    onPathShare: 0.1,
    narrowed: false,
    widened: false,
    capacity: 7,
    noMap: null,
  };

  it('is true for a plant inside an on-path section', () => {
    expect(isPlantOnMap(map, { page: 'docs/a.md', line: 15 })).toBe(true);
  });

  it('is false for a plant outside every on-path section', () => {
    expect(isPlantOnMap(map, { page: 'docs/a.md', line: 50 })).toBe(false);
  });

  it('prefers a narrowed map\'s own ranges over its sections', () => {
    const narrowed: PathMap = { ...map, narrowed: true, ranges: { 'docs/a.md': [[12, 14]] } };
    expect(isPlantOnMap(narrowed, { page: 'docs/a.md', line: 15 })).toBe(false);
    expect(isPlantOnMap(narrowed, { page: 'docs/a.md', line: 13 })).toBe(true);
  });

  it('is true for a plant with no page or line (a bundle that never restricts by the map)', () => {
    expect(isPlantOnMap(map, {})).toBe(true);
  });
});

describe('tallyPlantCatches', () => {
  it('counts a plant caught when at least two of its three runs catch it', () => {
    const plants = [PLANT('P1', 'evaluator', 'docs-only')];
    const runs = { evaluator: [RUN('r1', { P1: 'caught' }), RUN('r2', { P1: 'caught' }), RUN('r3', { P1: 'missed' })] };
    const [tally] = tallyPlantCatches(plants, runs);
    expect(tally.caughtCount).toBe(2);
    expect(tally.caught).toBe(true);
  });

  it('never counts a still-failing run\'s catches: an unverified run catches nothing', () => {
    const plants = [PLANT('P1', 'evaluator', 'docs-only')];
    const runs = { evaluator: [RUN('r1', { P1: 'caught' }, { verified: false }), RUN('r2', { P1: 'caught' }), RUN('r3', { P1: 'missed' })] };
    const [tally] = tallyPlantCatches(plants, runs);
    expect(tally.caughtCount).toBe(1);
    expect(tally.caught).toBe(false);
  });

  it('drops a non-opus run entirely under opusOnly, rather than counting it a miss', () => {
    const plants = [PLANT('P1', 'evaluator', 'docs-only')];
    const runs = { evaluator: [RUN('r1', { P1: 'caught' }), RUN('r2', { P1: 'caught' }, { opus: false })] };
    const [tally] = tallyPlantCatches(plants, runs, true);
    expect(tally.runsCaught).toEqual([true]);
    expect(tally.caughtCount).toBe(1);
  });
});

describe('scorePooledSensitivity', () => {
  it('applies the fixture thresholds file\'s value at 40 achieved plants', () => {
    const thresholds = fixture<ThresholdsFile>('thresholds-40-plants.json');
    expect(thresholds.pooled.threshold).toBe(30);
    const tallies: PlantCatchTally[] = Array.from({ length: 40 }, (_, i) => ({
      plantId: `P${i}`,
      job: 'evaluator',
      classId: 'docs-only',
      type: 'false-behavior',
      semantic: true,
      runsCaught: [true, true, false],
      caughtCount: 2,
      caught: i < 30, // exactly 30 caught, 10 not
    }));
    const result = scorePooledSensitivity(tallies, thresholds);
    expect(result.achieved).toBe(40);
    expect(result.caught).toBe(30);
    expect(result.pass).toBe(true);
  });

  it('fails when the caught count sits one under the fixture threshold', () => {
    const thresholds = fixture<ThresholdsFile>('thresholds-40-plants.json');
    const tallies: PlantCatchTally[] = Array.from({ length: 40 }, (_, i) => ({
      plantId: `P${i}`,
      job: 'evaluator',
      classId: 'docs-only',
      type: 'false-behavior',
      semantic: true,
      runsCaught: [],
      caughtCount: i < 29 ? 2 : 0,
      caught: i < 29,
    }));
    expect(scorePooledSensitivity(tallies, thresholds).pass).toBe(false);
  });

  it('never passes when the thresholds file carries no pooled threshold (34 plants)', () => {
    const thresholds = fixture<ThresholdsFile>('thresholds-34-plants.json');
    expect(thresholds.pooled.threshold).toBeNull();
    const tallies: PlantCatchTally[] = Array.from({ length: 34 }, (_, i) => ({
      plantId: `P${i}`,
      job: 'evaluator',
      classId: 'docs-only',
      type: 'false-behavior',
      semantic: true,
      runsCaught: [],
      caughtCount: 2,
      caught: true,
    }));
    const result = scorePooledSensitivity(tallies, thresholds);
    expect(result.pass).toBe(false);
    expect(result.achieved).toBe(34);
  });
});

describe('scoreClassSensitivity', () => {
  it('reports a null floor and passes on the rest, for a class with one plant', () => {
    const thresholds = fixture<ThresholdsFile>('thresholds-one-plant-class.json');
    expect(thresholds.floors['docs-only']).toEqual({ plants: 1, floor: null });
    const tallies: PlantCatchTally[] = [
      { plantId: 'P1', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [true, false, false], caughtCount: 1, caught: false },
    ];
    const result = scoreClassSensitivity('docs-only', tallies, thresholds);
    expect(result.floor).toBeNull();
    expect(result.caught).toBe(0);
    expect(result.pass).toBe(true);
  });

  it('fails a class whose caught count sits under its own floor', () => {
    const thresholds = fixture<ThresholdsFile>('thresholds-40-plants.json');
    const tallies: PlantCatchTally[] = Array.from({ length: 7 }, (_, i) => ({
      plantId: `P${i}`,
      job: 'evaluator',
      classId: 'docs-only' as const,
      type: 'false-behavior' as const,
      semantic: true,
      runsCaught: [],
      caughtCount: 0,
      caught: i < 3,
    }));
    const result = scoreClassSensitivity('docs-only', tallies, thresholds);
    expect(result.floor).toBe(4);
    expect(result.caught).toBe(3);
    expect(result.pass).toBe(false);
  });
});

describe('scoreHeldOut', () => {
  it('finds a defect caught in at least two of three runs', () => {
    const runs = [RUN('h1', { 'HELDOUT-X': 'caught' }), RUN('h2', { 'HELDOUT-X': 'caught' }), RUN('h3', { 'HELDOUT-X': 'missed' })];
    expect(scoreHeldOut(['HELDOUT-X'], runs)[0]).toEqual({ id: 'HELDOUT-X', caughtCount: 2, found: true });
  });

  it('does not find a defect caught in only one of three runs', () => {
    const runs = [RUN('h1', { 'HELDOUT-X': 'caught' }), RUN('h2', { 'HELDOUT-X': 'missed' }), RUN('h3', { 'HELDOUT-X': 'missed' })];
    expect(scoreHeldOut(['HELDOUT-X'], runs)[0]).toEqual({ id: 'HELDOUT-X', caughtCount: 1, found: false });
  });
});

describe('clopperPearson and recallOf', () => {
  it('reports a null rate and interval for an empty tally set, never a 0 / 0 division', () => {
    expect(recallOf([])).toEqual({ caught: 0, total: 0, rate: null, interval: null });
  });

  it('brackets 0.5 with a wide interval at a small sample', () => {
    const interval = clopperPearson(2, 4);
    expect(interval.lower).toBeLessThan(0.5);
    expect(interval.upper).toBeGreaterThan(0.5);
  });

  it('gives a zero lower bound at zero successes and a one upper bound at all successes', () => {
    expect(clopperPearson(0, 5).lower).toBe(0);
    expect(clopperPearson(5, 5).upper).toBe(1);
  });
});

describe('recallByPlantRun', () => {
  it('reports a null rate and interval when no tally carries a counted run, never a 0 / 0 division', () => {
    const tallies: PlantCatchTally[] = [{ plantId: 'P1', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [], caughtCount: 0, caught: false }];
    expect(recallByPlantRun(tallies)).toEqual({ caught: 0, total: 0, rate: null, interval: null });
  });

  it('counts a plant\'s single counted run caught, where the gated two-of-three rule (caught) would score it missed', () => {
    const tallies: PlantCatchTally[] = [{ plantId: 'P1', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [true], caughtCount: 1, caught: false }];
    expect(recallByPlantRun(tallies)).toEqual({ caught: 1, total: 1, rate: 1, interval: clopperPearson(1, 1) });
  });

  it('sums caught and counted runs across every tally, not just the caught plants', () => {
    const tallies: PlantCatchTally[] = [
      { plantId: 'P1', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [true, true, false], caughtCount: 2, caught: true },
      { plantId: 'P2', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [false, true], caughtCount: 1, caught: false },
    ];
    expect(recallByPlantRun(tallies)).toEqual({ caught: 3, total: 5, rate: 3 / 5, interval: clopperPearson(3, 5) });
  });
});

describe('recallByClass and recallByPlantKind', () => {
  const tallies: PlantCatchTally[] = [
    { plantId: 'P1', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [], caughtCount: 2, caught: true },
    { plantId: 'P2', job: 'evaluator', classId: 'docs-only', type: 'stale-path', semantic: false, runsCaught: [], caughtCount: 0, caught: false },
  ];

  it('reports a recall entry for every class id, even one with no tallies', () => {
    const byClass = recallByClass(tallies);
    expect(byClass['docs-only'].total).toBe(2);
    expect(byClass['repository'].total).toBe(0);
    expect(byClass['repository'].rate).toBeNull();
  });

  it('splits recall by semantic and token plant types', () => {
    const byKind = recallByPlantKind(tallies);
    expect(byKind.semantic.total).toBe(1);
    expect(byKind.semantic.caught).toBe(1);
    expect(byKind.token.total).toBe(1);
    expect(byKind.token.caught).toBe(0);
  });
});

describe('perRunRecall', () => {
  it('reports each run position\'s own marginal recall', () => {
    const tallies: PlantCatchTally[] = [
      { plantId: 'P1', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [true, false, true], caughtCount: 2, caught: true },
      { plantId: 'P2', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [false, false, true], caughtCount: 1, caught: false },
    ];
    expect(perRunRecall(tallies)).toEqual([0.5, 0, 1]);
  });
});

describe('stabilityKappa', () => {
  it('reports NaN for an empty tally set rather than throwing', () => {
    const result = stabilityKappa([]);
    expect(Number.isNaN(result.instrumentWide)).toBe(true);
  });

  it('reports a finite kappa when runs disagree some of the time', () => {
    const tallies: PlantCatchTally[] = [
      { plantId: 'P1', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [true, true, false], caughtCount: 2, caught: true },
      { plantId: 'P2', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [false, false, true], caughtCount: 1, caught: false },
      { plantId: 'P3', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, runsCaught: [true, false, false], caughtCount: 1, caught: false },
    ];
    const result = stabilityKappa(tallies);
    expect(Number.isFinite(result.instrumentWide)).toBe(true);
    expect(Number.isFinite(result.byClass['docs-only'])).toBe(true);
    expect(Number.isNaN(result.byClass['repository'])).toBe(true);
  });
});

describe('assertThresholdsMatchTally', () => {
  it('passes when the tallied plant counts match the thresholds file', () => {
    const thresholds = fixture<ThresholdsFile>('thresholds-40-plants.json');
    const plants: PlantSpec[] = [
      ...Array.from({ length: 7 }, (_, i) => ({ id: `e${i}`, job: 'evaluator', classId: 'docs-only' as const })),
      ...Array.from({ length: 7 }, (_, i) => ({ id: `o${i}`, job: 'operator', classId: 'docs-and-binary' as const })),
      ...Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, job: 'designer', classId: 'docs-and-site' as const })),
      ...Array.from({ length: 13 }, (_, i) => ({ id: `r${i}`, job: 'core-developer', classId: 'repository' as const })),
    ];
    expect(() => assertThresholdsMatchTally(plants, thresholds)).not.toThrow();
  });

  it('throws and names the pooled counts when they mismatch', () => {
    const thresholds = fixture<ThresholdsFile>('thresholds-40-plants.json');
    const plants: PlantSpec[] = [{ id: 'e1', job: 'evaluator', classId: 'docs-only' }];
    expect(() => assertThresholdsMatchTally(plants, thresholds)).toThrow(/pooled count \(40\).*tallied plant count \(1\)/);
  });

  it('throws and names a class\'s own counts when they mismatch', () => {
    const thresholds = fixture<ThresholdsFile>('thresholds-40-plants.json');
    const plants: PlantSpec[] = [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, job: 'evaluator', classId: 'docs-only' as const })),
      ...Array.from({ length: 7 }, (_, i) => ({ id: `o${i}`, job: 'operator', classId: 'docs-and-binary' as const })),
      ...Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, job: 'designer', classId: 'docs-and-site' as const })),
      ...Array.from({ length: 14 }, (_, i) => ({ id: `r${i}`, job: 'core-developer', classId: 'repository' as const })),
    ];
    expect(() => assertThresholdsMatchTally(plants, thresholds)).toThrow(/class "docs-only"/);
  });
});

describe('plantPathPosition', () => {
  const map: PathMap = {
    job: 'evaluator',
    verifiedRuns: 3,
    mode: 'steps',
    pages: {
      'docs/a.md': {
        lines: 100,
        sections: [
          { heading: 'H2a', level: 2, start: 10, end: 20, quotes: 3, runs: 3 },
          { heading: 'H2b', level: 2, start: 30, end: 40, quotes: 3, runs: 3 },
        ],
      },
    },
    onPathShare: 0.2,
    narrowed: false,
    widened: false,
    capacity: 7,
    noMap: null,
  };

  it('ranks a plant by its section\'s 1-based position in path order', () => {
    expect(plantPathPosition(map, { page: 'docs/a.md', line: 15 })).toBe(1);
    expect(plantPathPosition(map, { page: 'docs/a.md', line: 35 })).toBe(2);
  });

  it('is null for a plant outside every on-path section', () => {
    expect(plantPathPosition(map, { page: 'docs/a.md', line: 50 })).toBeNull();
  });

  it('is null for a plant with no page or line', () => {
    expect(plantPathPosition(map, {})).toBeNull();
  });
});

describe('nearestStepDistance', () => {
  it('finds the smallest absolute distance to a same-page step', () => {
    const steps = [{ page: 'docs/a.md', line: 10 }, { page: 'docs/a.md', line: 25 }, { page: 'docs/b.md', line: 12 }];
    expect(nearestStepDistance({ page: 'docs/a.md', line: 20 }, steps)).toBe(5);
  });

  it('is null when no step sits on the plant\'s own page', () => {
    expect(nearestStepDistance({ page: 'docs/c.md', line: 20 }, [{ page: 'docs/a.md', line: 10 }])).toBeNull();
  });
});

describe('recallByBucket', () => {
  it('groups tallies by an arbitrary bucket key, excluding a null key', () => {
    const tallies: PlantCatchTally[] = [
      { plantId: 'P1', job: 'evaluator', classId: 'docs-only', runsCaught: [], caughtCount: 2, caught: true },
      { plantId: 'P2', job: 'evaluator', classId: 'docs-only', runsCaught: [], caughtCount: 0, caught: false },
      { plantId: 'P3', job: 'evaluator', classId: 'docs-only', runsCaught: [], caughtCount: 2, caught: true },
    ];
    const buckets = recallByBucket(tallies, (t) => (t.plantId === 'P3' ? null : 'a'));
    expect(buckets.a).toEqual({ caught: 1, total: 2, rate: 0.5, interval: expect.any(Object) });
    expect(Object.keys(buckets)).toEqual(['a']);
  });
});
