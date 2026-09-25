import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { appendEntry, hashFile } from '../../../scripts/docs-readers/lib/chain.js';
import { loadManifest } from '../../../scripts/docs-readers/freeze.js';
import { main } from '../../../scripts/docs-readers/score.js';
import type { CatchRunRecord, ClassId, PlantSpec, PrecisionRunRecord } from '../../../scripts/docs-readers/lib/score-types.js';
import type { GatedBundle } from '../../../scripts/docs-readers/score.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'docs-readers-score-'));
});

function writeJsonFile(name: string, value: unknown): string {
  const path = join(dir, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

function readOut(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

describe('score.ts sample', () => {
  it('writes an agreement sample file from a pool file', () => {
    const poolPath = writeJsonFile('pool.json', {
      orderingLabel: 'docs-reset-1b-agreement',
      findingsPool: [
        { itemId: 'f1', runId: 'r1', jobId: 'evaluator', primaryLabel: 'real' },
        { itemId: 'f2', runId: 'r2', jobId: 'evaluator', primaryLabel: 'false' },
      ],
      catchCallsPool: [{ itemId: 'c1', runId: 'r1', plantId: 'PLANT-X1', primaryLabel: 'caught' }],
    });
    const outPath = join(dir, 'sample.json');
    expect(main(['sample', '--pool', poolPath, '--out', outPath])).toBe(0);
    const sample = readOut(outPath);
    expect(sample.orderingLabel).toBe('docs-reset-1b-agreement');
    expect((sample.findings as unknown[]).length).toBe(2);
    expect((sample.catchCalls as unknown[]).length).toBe(1);
  });
});

describe('score.ts dev', () => {
  const savedReport = resolve(ROOT, 'scripts/docs-readers/fixtures/saved-reports/pass1-trimmed.json');

  it('scores a pass 1 saved report in development mode', () => {
    const bundle = {
      round: 'round0',
      plants: [{ id: 'PLANT-X1', job: 'evaluator', classId: 'docs-only', type: 'false-behavior', semantic: true, page: 'docs/fixture-page.md', line: 12 }],
      pathMaps: {
        evaluator: {
          job: 'evaluator',
          verifiedRuns: 2,
          mode: 'proxy',
          pages: { 'docs/fixture-page.md': { lines: 100, sections: [{ heading: 'lead', level: 1, start: 1, end: 30, quotes: 2, runs: 2 }] } },
          onPathShare: 0.3,
          narrowed: false,
          widened: false,
          capacity: 7,
          noMap: null,
        },
      },
      catchRunsByJob: { evaluator: [{ runId: 'evaluator-planted-1', verified: true, opus: true, catches: { 'PLANT-X1': 'caught' } }] },
      precisionRuns: [],
    };
    const bundlePath = writeJsonFile('dev-bundle.json', bundle);
    const outPath = join(dir, 'dev-out.json');
    expect(main(['dev', '--report', savedReport, '--bundle', bundlePath, '--out', outPath])).toBe(0);
    const result = readOut(outPath);
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('development');
    expect(result).not.toHaveProperty('classes');
    expect(result).not.toHaveProperty('allClassesFailed');
  });

  it('refuses a test-set batch, naming it, and never reads the bundle', () => {
    const testSetReport = writeJsonFile('test-set-report.json', {
      batch: 'test-set',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 },
      verified: true,
      jobs: [],
    });
    const outPath = join(dir, 'dev-out.json');
    const exitCode = main(['dev', '--report', testSetReport, '--bundle', '/does/not/exist.json', '--out', outPath]);
    expect(exitCode).toBe(1);
    const result = readOut(outPath);
    expect(result.ok).toBe(false);
    expect((result.problems as string[])[0]).toContain('test-set');
  });
});

describe('score.ts gated', () => {
  let manifestPath: string;
  let chainPath: string;
  let manifestTag: string;
  let manifestHash: string;
  let chainHeadAfterThresholds: string;
  const thresholdsFixturePath = resolve(ROOT, 'scripts/docs-readers/fixtures/thresholds-40-plants.json');

  beforeEach(() => {
    manifestTag = 'docs-reset-1b-freeze';
    manifestPath = writeJsonFile('manifest.json', { tag: manifestTag, files: {}, imageId: 'img', cliVersion: 'v1', models: {}, jobs: {}, heldOutPins: {}, seeds: {} });
    ({ hash: manifestHash } = loadManifest(manifestPath));

    chainPath = join(dir, 'chain.jsonl');
    const thresholdsPath = join(dir, 'thresholds.json');
    writeFileSync(thresholdsPath, readFileSync(thresholdsFixturePath, 'utf8'));
    appendEntry(chainPath, { path: 'thresholds.json', sha256: hashFile(thresholdsPath), commit: 'c1' });
    chainHeadAfterThresholds = hashFile(chainPath);
  });

  /**
   * `freezeOverride` distinguishes "use the default valid stamp" (the parameter omitted) from
   * "carry no stamp at all" (`null`, explicitly), since a default parameter would otherwise treat
   * an explicit `undefined` the same as an omitted argument.
   */
  function writeGatedReport(jobIds: string[], freezeOverride?: Record<string, unknown> | null): string {
    const freeze = freezeOverride === undefined ? { tag: manifestTag, manifestHash, chainHead: chainHeadAfterThresholds } : freezeOverride;
    return writeJsonFile('gated-report.json', {
      batch: 'gated-planted',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 },
      verified: true,
      jobs: jobIds.map((id) => ({ id, ...(freeze ? { freeze } : {}) })),
    });
  }

  /** Three runs per job: `caughtCount` plants caught (in exactly two of three runs), the rest caught in none. */
  function buildJobRuns(jobId: string, plantIds: string[], caughtCount: number): CatchRunRecord[] {
    const catchesFor = (predicate: (i: number) => boolean): Record<string, 'caught' | 'missed'> =>
      Object.fromEntries(plantIds.map((id, i) => [id, predicate(i) ? 'caught' : 'missed']));
    return [
      { runId: `${jobId}-r1`, verified: true, catches: catchesFor((i) => i < caughtCount) },
      { runId: `${jobId}-r2`, verified: true, catches: catchesFor((i) => i < caughtCount) },
      { runId: `${jobId}-r3`, verified: true, catches: catchesFor(() => false) },
    ];
  }

  const JOB_CLASS: Record<string, ClassId> = {
    evaluator: 'docs-only',
    operator: 'docs-and-binary',
    designer: 'docs-and-site',
    extender: 'docs-and-site',
    'core-developer': 'repository',
    scripter: 'repository',
  };
  const JOB_PLANT_COUNT: Record<string, number> = { evaluator: 7, operator: 7, designer: 7, extender: 6, 'core-developer': 7, scripter: 6 };

  /** Build a full 40-plant gated bundle, one job's caught count overridable, with an optional per-class false-finding override. */
  function buildBundle({
    caughtByJob = { evaluator: 5, operator: 5, designer: 4, extender: 6, 'core-developer': 5, scripter: 5 },
    falseFindingsByClass = {},
    agreementFindings = [
      { itemId: 'f1', primaryLabel: 'real', fableLabel: 'real' },
      { itemId: 'f2', primaryLabel: 'false', fableLabel: 'false' },
      { itemId: 'f3', primaryLabel: 'harness', fableLabel: 'harness' },
      { itemId: 'f4', primaryLabel: 'real', fableLabel: 'real' },
      { itemId: 'f5', primaryLabel: 'false', fableLabel: 'false' },
    ],
    agreementCatchCalls = [
      { itemId: 'c1', primaryLabel: 'caught', fableLabel: 'caught' },
      { itemId: 'c2', primaryLabel: 'missed', fableLabel: 'missed' },
      { itemId: 'c3', primaryLabel: 'caught', fableLabel: 'caught' },
      { itemId: 'c4', primaryLabel: 'missed', fableLabel: 'missed' },
      { itemId: 'c5', primaryLabel: 'caught', fableLabel: 'caught' },
    ],
  }: {
    caughtByJob?: Record<string, number>;
    falseFindingsByClass?: Partial<Record<ClassId, number>>;
    agreementFindings?: Array<{ itemId: string; primaryLabel: string; fableLabel: string }>;
    agreementCatchCalls?: Array<{ itemId: string; primaryLabel: string; fableLabel: string }>;
  }): GatedBundle {
    const plants: PlantSpec[] = [];
    const catchRunsByJob: Record<string, CatchRunRecord[]> = {};
    const precisionRuns: PrecisionRunRecord[] = [];
    for (const [job, count] of Object.entries(JOB_PLANT_COUNT)) {
      const classId = JOB_CLASS[job];
      const plantIds = Array.from({ length: count }, (_, i) => `${job}-P${i}`);
      for (const id of plantIds) plants.push({ id, job, classId, type: 'false-behavior', semantic: true });
      catchRunsByJob[job] = buildJobRuns(job, plantIds, caughtByJob[job]);
      for (let i = 0; i < 3; i += 1) precisionRuns.push({ runId: `${job}-precision-${i}`, job, classId, verified: true, itemCount: 0, items: [] });
    }
    for (const [classId, count] of Object.entries(falseFindingsByClass)) {
      const run = precisionRuns.find((r) => r.classId === classId);
      if (run && count) run.items = Array.from({ length: count }, (_, i) => ({ itemId: `ff${i}`, harnessExcluded: false, ruling: 'false' as const }));
    }
    return {
      plants,
      catchRunsByJob,
      heldOut: { ids: [], runs: [] },
      precisionRuns,
      thresholds: JSON.parse(readFileSync(thresholdsFixturePath, 'utf8')) as GatedBundle['thresholds'],
      agreement: { findings: agreementFindings, catchCalls: agreementCatchCalls },
      chainDependsOn: ['thresholds.json'],
    };
  }

  function runGatedScore(bundle: GatedBundle, jobIds: string[] = ['evaluator']): { code: number; result: Record<string, unknown> } {
    const bundlePath = writeJsonFile(`bundle-${Math.random()}.json`, bundle);
    const report = writeGatedReport(jobIds);
    const outPath = join(dir, `out-${Math.random()}.json`);
    const code = main(['gated', '--report', report, '--manifest', manifestPath, '--chain', chainPath, '--root', dir, '--bundle', bundlePath, '--out', outPath]);
    return { code, result: readOut(outPath) };
  }

  it('passes every bar on a hand-computed all-pass fixture (pooled 30 of 40, every floor and precision met)', () => {
    const { code, result } = runGatedScore(buildBundle({}));
    expect(code).toBe(0);
    expect(result.ok).toBe(true);
    const pooled = result.pooledSensitivity as { caught: number; threshold: number; pass: boolean };
    expect(pooled.caught).toBe(30);
    expect(pooled.pass).toBe(true);
    const classes = result.classes as Array<{ classId: string; verdict: string }>;
    expect(classes.every((cls) => cls.verdict === 'validated')).toBe(true);
    expect(result.allClassesFailed).toBe(false);
  });

  it('fails the pooled sensitivity bar and marks every class advisory when the caught count sits under the threshold', () => {
    // Every class exactly meets its own floor (4, 4, 9, 9 = 26), but 26 is under the pooled threshold of 30.
    const { result } = runGatedScore(buildBundle({ caughtByJob: { evaluator: 4, operator: 4, designer: 4, extender: 5, 'core-developer': 4, scripter: 5 } }));
    const pooled = result.pooledSensitivity as { caught: number; pass: boolean };
    expect(pooled.caught).toBe(26);
    expect(pooled.pass).toBe(false);
    expect(result.allClassesFailed).toBe(true);
    const classes = result.classes as Array<{ classId: string; verdict: string; reasons: string[] }>;
    expect(classes.every((cls) => cls.verdict === 'advisory')).toBe(true);
    expect(classes.every((cls) => cls.reasons.some((r) => r.includes('instrument-wide sensitivity')))).toBe(true);
  });

  it('fails only one class\'s own sensitivity floor, leaving the rest validated', () => {
    // docs-only drops to 3 (under its floor of 4); repository rises to 12 to keep the pooled total at the 30 threshold.
    const { result } = runGatedScore(buildBundle({ caughtByJob: { evaluator: 3, operator: 5, designer: 4, extender: 6, 'core-developer': 7, scripter: 5 } }));
    const pooled = result.pooledSensitivity as { caught: number; pass: boolean };
    expect(pooled.caught).toBe(30);
    expect(pooled.pass).toBe(true);
    const classes = result.classes as Array<{ classId: string; verdict: string; sensitivity: { pass: boolean } }>;
    const byClass = Object.fromEntries(classes.map((cls) => [cls.classId, cls]));
    expect(byClass['docs-only'].verdict).toBe('advisory');
    expect(byClass['docs-only'].sensitivity.pass).toBe(false);
    expect(byClass['docs-and-binary'].verdict).toBe('validated');
    expect(byClass['docs-and-site'].verdict).toBe('validated');
    expect(byClass['repository'].verdict).toBe('validated');
    expect(result.allClassesFailed).toBe(false);
  });

  it('fails only one class\'s own precision bar, leaving the rest validated', () => {
    const { result } = runGatedScore(buildBundle({ falseFindingsByClass: { 'docs-only': 5 } }));
    const classes = result.classes as Array<{ classId: string; verdict: string; precision: { falseFindings: number; pass: boolean } }>;
    const byClass = Object.fromEntries(classes.map((cls) => [cls.classId, cls]));
    expect(byClass['docs-only'].precision.falseFindings).toBe(5);
    expect(byClass['docs-only'].verdict).toBe('advisory');
    expect(byClass['docs-and-binary'].verdict).toBe('validated');
    expect(byClass['docs-and-site'].verdict).toBe('validated');
    expect(byClass['repository'].verdict).toBe('validated');
  });

  it('marks every class advisory when the agreement bar fails', () => {
    const disagreeing = Array.from({ length: 15 }, (_, i) => ({ itemId: `f${i}`, primaryLabel: i % 2 === 0 ? 'real' : 'false', fableLabel: i % 2 === 0 ? 'false' : 'real' }));
    const { result } = runGatedScore(buildBundle({ agreementFindings: disagreeing }));
    const agreement = result.agreement as { pass: boolean };
    expect(agreement.pass).toBe(false);
    const classes = result.classes as Array<{ verdict: string; reasons: string[] }>;
    expect(classes.every((cls) => cls.verdict === 'advisory')).toBe(true);
    expect(classes.every((cls) => cls.reasons.some((r) => r.includes('agreement')))).toBe(true);
  });

  it('scores the pooled sensitivity bar after Fable\'s replacements: a replaced plant\'s new caught status is what the bar reads', () => {
    // evaluator-P6 sits at index 6, past the default caughtByJob.evaluator of 5, so it starts
    // caught in none of its three runs (the other tests' 30-of-40 baseline). Fable's replacements
    // flip its first two runs to "caught", crossing the two-of-three rule, so the pooled bar reads
    // 31, not the 30 every other all-pass-shaped test in this file reads.
    const bundle = buildBundle({});
    bundle.agreement.replacements = [
      { kind: 'catchCall', runId: 'evaluator-r1', refId: 'evaluator-P6', label: 'caught' },
      { kind: 'catchCall', runId: 'evaluator-r2', refId: 'evaluator-P6', label: 'caught' },
    ];
    const { result } = runGatedScore(bundle);
    expect((result.pooledSensitivity as { caught: number }).caught).toBe(31);
  });

  it('rejects an unstamped report in both modes', () => {
    const report = writeGatedReport(['evaluator-planted'], null);
    const devOut = join(dir, 'dev-out.json');
    const devCode = main(['dev', '--report', report, '--bundle', '/does/not/exist.json', '--out', devOut]);
    expect(devCode).toBe(1);
    expect((readOut(devOut).problems as string[])[0]).toContain('gated-planted');

    const gatedOut = join(dir, 'gated-out.json');
    const gatedCode = main(['gated', '--report', report, '--manifest', manifestPath, '--chain', chainPath, '--root', dir, '--bundle', '/does/not/exist.json', '--out', gatedOut]);
    expect(gatedCode).toBe(1);
    expect((readOut(gatedOut).problems as string[])[0]).toContain('unstamped');
  });

  it('rejects a report stamped against a stale manifestHash, naming the report', () => {
    const report = writeGatedReport(['evaluator-planted'], { tag: manifestTag, manifestHash: 'a-stale-hash', chainHead: chainHeadAfterThresholds });
    const outPath = join(dir, 'gated-out.json');
    const code = main(['gated', '--report', report, '--manifest', manifestPath, '--chain', chainPath, '--root', dir, '--bundle', '/does/not/exist.json', '--out', outPath]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems[0]).toContain(report);
    expect(problems[0]).toContain('a-stale-hash');
  });

  it('never lets a false finding in a tuning round\'s control run reach gated precision scoring: the two pools are separate bundles', () => {
    const devBundle = {
      round: 'round0',
      plants: [],
      pathMaps: {},
      catchRunsByJob: {},
      precisionRuns: [{ runId: 'tuning-r1', job: 'evaluator', classId: 'docs-only', verified: true, opus: true, itemCount: 1, items: [{ itemId: 'i1', harnessExcluded: false, ruling: 'false' }] }],
    };
    const devBundlePath = writeJsonFile('dev-bundle-tuning.json', devBundle);
    const devOut = join(dir, 'dev-tuning-out.json');
    const savedReport = resolve(ROOT, 'scripts/docs-readers/fixtures/saved-reports/pass1-trimmed.json');
    expect(main(['dev', '--report', savedReport, '--bundle', devBundlePath, '--out', devOut])).toBe(0);
    const devResult = readOut(devOut);
    const byJob = devResult.byJob as Record<string, { totalFalseFindings: number }>;
    expect(byJob.evaluator.totalFalseFindings).toBe(1);

    // The gated bundle never includes the tuning round's run at all, so docs-only's gated
    // precision is unaffected by it.
    const { result: gatedResult } = runGatedScore(buildBundle({}));
    const classes = gatedResult.classes as Array<{ classId: string; precision: { falseFindings: number } }>;
    expect(classes.find((cls) => cls.classId === 'docs-only')?.precision.falseFindings).toBe(0);
  });
});
