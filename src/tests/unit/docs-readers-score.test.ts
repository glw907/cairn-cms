import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { appendEntry, hashFile } from '../../../scripts/docs-readers/lib/chain.js';
import { loadManifest } from '../../../scripts/docs-readers/freeze.js';
import { main } from '../../../scripts/docs-readers/score.js';
import { recomputeThresholds } from '../../../scripts/docs-readers/oc-curve.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OC_CURVE_SEED_KEY = 'oc-curve';

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

const USAGE = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 };
const VERIFIED = { ok: true, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] };

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

  /** A catch-judge JudgeBatchReport with one job per given reader job id, each ruling `plant-1` caught. */
  function catchJudgeRulings(readerJobIds: string[]): unknown {
    return {
      batch: 'catch-round0',
      runId: 'r',
      kind: 'catchJudge',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: readerJobIds.map((id) => ({ id, class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r' }], usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] } })),
    };
  }

  function catchKey(readerJobId: string, plantId: string): unknown {
    return { kind: 'catch', builtFrom: 'sources', report: { path: savedReport, jobId: readerJobId, attempt: 1, runId: 'run' }, plants: { 'plant-1': { plantId } }, items: {}, inputs: {} };
  }

  it('scores a pass 1 saved report in development mode', () => {
    const plantsPath = writeJsonFile('dev-plants.json', [{ id: 'PLANT-X1', job: 'evaluator', page: 'docs/fixture-page.md', line: 12 }]);
    const mapPath = writeJsonFile('evaluator-map.json', {
      job: 'evaluator',
      verifiedRuns: 2,
      mode: 'proxy',
      pages: { 'docs/fixture-page.md': { lines: 100, sections: [{ heading: 'lead', level: 1, start: 1, end: 30, quotes: 2, runs: 2 }] } },
      onPathShare: 0.3,
      narrowed: false,
      widened: false,
      capacity: 7,
      noMap: null,
    });
    // Both of pass1-trimmed.json's evaluator-planted jobs rule the same plant caught, meeting the
    // two-of-three rule (here, two of the two counted opus runs).
    const rulingsPath = writeJsonFile('catch-rulings.json', catchJudgeRulings(['evaluator-planted-1', 'evaluator-planted-2']));
    const key1Path = writeJsonFile('evaluator-planted-1-key.json', catchKey('evaluator-planted-1', 'PLANT-X1'));
    const key2Path = writeJsonFile('evaluator-planted-2-key.json', catchKey('evaluator-planted-2', 'PLANT-X1'));
    const outPath = join(dir, 'dev-out.json');
    const code = main([
      'dev',
      '--report', savedReport,
      '--catch-rulings', rulingsPath,
      '--catch-key', key1Path,
      '--catch-key', key2Path,
      '--plants', plantsPath,
      '--map', `evaluator=${mapPath}`,
      '--out', outPath,
    ]);
    expect(code).toBe(0);
    const result = readOut(outPath);
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('development');
    expect(result).not.toHaveProperty('classes');
    expect(result).not.toHaveProperty('allClassesFailed');
    const byJob = result.byJob as Record<string, { onMapPlantCount: number; onMapCaught: number }>;
    expect(byJob.evaluator.onMapPlantCount).toBe(1);
    expect(byJob.evaluator.onMapCaught).toBe(1);
  });

  it('refuses a test-set batch, naming it, and never reads the plants file', () => {
    const testSetReport = writeJsonFile('test-set-report.json', { batch: 'test-set', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [] });
    const outPath = join(dir, 'dev-out.json');
    const exitCode = main(['dev', '--report', testSetReport, '--plants', '/does/not/exist.json', '--out', outPath]);
    expect(exitCode).toBe(1);
    const result = readOut(outPath);
    expect(result.ok).toBe(false);
    expect((result.problems as string[])[0]).toContain('test-set');
  });

  it('refuses a round1 report whose job carries a freeze stamp, naming the job', () => {
    const report = writeJsonFile('round1-report.json', {
      batch: 'round1',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: { tag: 't', manifestHash: 'h', chainHead: 'c' } }],
    });
    const outPath = join(dir, 'dev-out.json');
    const code = main(['dev', '--report', report, '--plants', '/does/not/exist.json', '--out', outPath]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems[0]).toContain('evaluator-planted-1');
    expect(problems[0]).toContain('freeze');
  });

  it('restricts development precision to verified Opus runs: a verified run with zero false findings plus an unverified run with nine items gives zero', () => {
    const report = writeJsonFile('round1-precision-report.json', {
      batch: 'round1',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [
        { id: 'evaluator-control-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED },
        { id: 'evaluator-control-2', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: { ...VERIFIED, ok: false } },
      ],
    });
    const adjudicatorRulings = {
      batch: 'adjudicator-round1',
      runId: 'r',
      kind: 'adjudicator',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-control-1', class: 'judge-adjudicator', model: 'claude-opus-5-5', outcome: 'done', rulings: [], usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] } }],
    };
    const rulingsPath = writeJsonFile('adjudicator-rulings.json', adjudicatorRulings);
    const key1Path = writeJsonFile('evaluator-control-1-key.json', { kind: 'adjudicator', builtFrom: 'sources', report: { path: report, jobId: 'evaluator-control-1', attempt: 1, runId: 'run' }, items: {}, excluded: [], treeCommit: 'c', treeAbsent: [], inputs: {} });
    // evaluator-control-2 has nine catch-field items but is unverified: the assembler's itemCount
    // for it comes from its own adjudicator key, which this fixture gives nine entries so the
    // unverified run's item count is nine, per the rerun rule's own fallback count. Development
    // mode, unlike gated mode, drops this run from both the numerator and the denominator.
    const nineItems: Record<string, unknown> = {};
    for (let i = 0; i < 9; i += 1) nineItems[`item-${i}`] = { field: 'stalls', sourceIndex: i };
    const key2Path = writeJsonFile('evaluator-control-2-key.json', { kind: 'adjudicator', builtFrom: 'sources', report: { path: report, jobId: 'evaluator-control-2', attempt: 1, runId: 'run2' }, items: nineItems, excluded: [], treeCommit: 'c', treeAbsent: [], inputs: {} });
    const outPath = join(dir, 'dev-out.json');
    const code = main([
      'dev',
      '--report', report,
      '--adjudicator-rulings', rulingsPath,
      '--adjudicator-key', key1Path,
      '--adjudicator-key', key2Path,
      '--plants', writeJsonFile('empty-plants.json', []),
      '--out', outPath,
    ]);
    expect(code).toBe(0);
    const byJob = readOut(outPath).byJob as Record<string, { verifiedControlRunCount: number; totalFalseFindings: number; falseFindingsPerVerifiedControlRun: number | null }>;
    expect(byJob.evaluator.verifiedControlRunCount).toBe(1);
    expect(byJob.evaluator.totalFalseFindings).toBe(0);
    expect(byJob.evaluator.falseFindingsPerVerifiedControlRun).toBe(0);
  });
});

describe('score.ts gated', () => {
  let manifestPath: string;
  let chainPath: string;
  let manifestTag: string;
  let manifestHash: string;
  let chainHeadAfterThresholds: string;
  let thresholdsPath: string;

  const JOB_PLANT_COUNT: Record<string, number> = { evaluator: 7, operator: 7, designer: 7, extender: 6, 'core-developer': 7, scripter: 6 };
  const JOB_CLASS: Record<string, string> = { evaluator: 'docs-only', operator: 'docs-and-binary', designer: 'docs-and-site', extender: 'docs-and-site', 'core-developer': 'repository', scripter: 'repository' };
  const JOBS = Object.keys(JOB_PLANT_COUNT);

  beforeEach(() => {
    manifestTag = 'docs-reset-1b-freeze';
    manifestPath = writeJsonFile('manifest.json', { tag: manifestTag, files: {}, imageId: 'img', cliVersion: 'v1', models: {}, jobs: {}, heldOutPins: {}, seeds: { [OC_CURVE_SEED_KEY]: 20260924 } });
    ({ hash: manifestHash } = loadManifest(manifestPath));

    chainPath = join(dir, 'chain.jsonl');
    appendEntry(chainPath, { path: 'manifest.json', sha256: manifestHash, commit: 'c0' });

    thresholdsPath = join(dir, 'thresholds.json');
    const thresholds = recomputeThresholds({ evaluator: 7, operator: 7, designer: 7, extender: 6, 'core-developer': 7, scripter: 6 });
    writeFileSync(thresholdsPath, `${JSON.stringify(thresholds, null, 2)}\n`);
    appendEntry(chainPath, { path: 'thresholds.json', sha256: hashFile(thresholdsPath), commit: 'c1' });
    chainHeadAfterThresholds = hashFile(chainPath);
  });

  /**
   * Every planted and control reader job across all six development jobs, three runs each,
   * every job stamped and verified. Which plants a run actually catches, and which control run
   * carries a false finding, come from the separate catch-judge and adjudicator rulings this
   * report's own job ids join to, never from this function.
   */
  function buildReaderReport(): unknown {
    const jobs: unknown[] = [];
    for (const job of JOBS) {
      for (let n = 1; n <= 3; n += 1) {
        jobs.push({ id: `${job}-planted-${n}`, class: JOB_CLASS[job], model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: { tag: manifestTag, manifestHash, chainHead: chainHeadAfterThresholds } });
        jobs.push({ id: `${job}-control-${n}`, class: JOB_CLASS[job], model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: { tag: manifestTag, manifestHash, chainHead: chainHeadAfterThresholds } });
      }
    }
    return { batch: 'gated-planted', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs };
  }

  /** One catch-judge job per planted reader job id, with `caughtCount` of the job's plants marked caught in exactly two of three runs. */
  function buildCatchRulingsAndKeys(caughtByJob: Record<string, number>, reportPath: string): { rulingsPath: string; keyPaths: string[] } {
    const judgeJobs: unknown[] = [];
    const keyPaths: string[] = [];
    for (const job of JOBS) {
      const count = JOB_PLANT_COUNT[job];
      const plantIds = Array.from({ length: count }, (_, i) => `${job}-P${i}`);
      for (let n = 1; n <= 3; n += 1) {
        const jobId = `${job}-planted-${n}`;
        const rulings = plantIds.map((_, i) => ({ itemId: `plant-${i + 1}`, ruling: n <= 2 && i < caughtByJob[job] ? 'caught' : 'missed', reason: 'r' }));
        judgeJobs.push({ id: jobId, class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings, usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] } });
        const plants: Record<string, { plantId: string }> = {};
        plantIds.forEach((plantId, i) => (plants[`plant-${i + 1}`] = { plantId }));
        keyPaths.push(writeJsonFile(`${jobId}-catch-key.json`, { kind: 'catch', builtFrom: 'sources', report: { path: reportPath, jobId, attempt: 1, runId: jobId }, plants, items: {}, inputs: {} }));
      }
    }
    const rulingsPath = writeJsonFile('catch-rulings.json', { batch: 'gated-catch', runId: 'r', kind: 'catchJudge', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: judgeJobs });
    return { rulingsPath, keyPaths };
  }

  /** One adjudicator job per control reader job id, with `falseFindingsByClass` false-ruled subject groups placed on that class's first control run. */
  function buildAdjudicatorRulingsAndKeys(falseFindingsByClass: Partial<Record<string, number>>, reportPath: string): { rulingsPath: string; keyPaths: string[] } {
    const judgeJobs: unknown[] = [];
    const keyPaths: string[] = [];
    for (const job of JOBS) {
      for (let n = 1; n <= 3; n += 1) {
        const jobId = `${job}-control-${n}`;
        const classId = JOB_CLASS[job];
        const count = n === 1 ? (falseFindingsByClass[classId] ?? 0) : 0;
        const rulings = Array.from({ length: count }, (_, i) => ({ itemId: `item-${i + 1}`, class: 'finding', subjectGroupId: `subject-${jobId}-${i}`, ruling: 'false', reason: 'r' }));
        judgeJobs.push({ id: jobId, class: 'judge-adjudicator', model: 'claude-opus-5-5', outcome: 'done', rulings, usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] } });
        const items: Record<string, unknown> = {};
        for (let i = 0; i < count; i += 1) items[`item-${i + 1}`] = { field: 'stalls', sourceIndex: i };
        keyPaths.push(writeJsonFile(`${jobId}-adjudicator-key.json`, { kind: 'adjudicator', builtFrom: 'sources', report: { path: reportPath, jobId, attempt: 1, runId: jobId }, items, excluded: [], treeCommit: 'c', treeAbsent: [], inputs: {} }));
      }
    }
    const rulingsPath = writeJsonFile('adjudicator-rulings.json', { batch: 'gated-adjudicator', runId: 'r', kind: 'adjudicator', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: judgeJobs });
    return { rulingsPath, keyPaths };
  }

  function buildPlants(): string {
    const plants: unknown[] = [];
    for (const job of JOBS) {
      for (let i = 0; i < JOB_PLANT_COUNT[job]; i += 1) plants.push({ id: `${job}-P${i}`, job, classId: JOB_CLASS[job], type: 'false-behavior', semantic: true });
    }
    return writeJsonFile('plants.json', plants);
  }

  function buildAgreement(overrides: { findings?: unknown[]; catchCalls?: unknown[]; fableLabels?: Record<string, string> } = {}): { samplePath: string; rulingsPath: string } {
    const findings = overrides.findings ?? [
      { itemId: 'f1', runId: 'evaluator-control-1', jobId: 'evaluator', primaryLabel: 'real' },
      { itemId: 'f2', runId: 'evaluator-control-1', jobId: 'evaluator', primaryLabel: 'false' },
      { itemId: 'f3', runId: 'evaluator-control-1', jobId: 'evaluator', primaryLabel: 'harness' },
      { itemId: 'f4', runId: 'evaluator-control-1', jobId: 'evaluator', primaryLabel: 'real' },
      { itemId: 'f5', runId: 'evaluator-control-1', jobId: 'evaluator', primaryLabel: 'false' },
    ];
    const catchCalls = overrides.catchCalls ?? [
      { itemId: 'c1', runId: 'evaluator-planted-1', plantId: 'evaluator-P0', primaryLabel: 'caught' },
      { itemId: 'c2', runId: 'evaluator-planted-1', plantId: 'evaluator-P1', primaryLabel: 'missed' },
      { itemId: 'c3', runId: 'evaluator-planted-1', plantId: 'evaluator-P2', primaryLabel: 'caught' },
      { itemId: 'c4', runId: 'evaluator-planted-1', plantId: 'evaluator-P3', primaryLabel: 'missed' },
      { itemId: 'c5', runId: 'evaluator-planted-1', plantId: 'evaluator-P4', primaryLabel: 'caught' },
    ];
    const samplePath = writeJsonFile('agreement-sample.json', { orderingLabel: 'docs-reset-1b-agreement', findings, catchCalls, notes: [] });
    appendEntry(chainPath, { path: 'agreement-sample.json', sha256: hashFile(samplePath), commit: 'c2' });
    // Fable's own ruling per item: the primary label by default (full agreement), unless
    // `fableLabels` overrides a specific item to disagree.
    const rulings = [...findings, ...catchCalls].map((item: any) => ({ itemId: item.itemId, ruling: overrides.fableLabels?.[item.itemId] ?? item.primaryLabel, reason: 'r' }));
    const rulingsReport = { batch: 'agreement', runId: 'r', kind: 'agreement', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [{ id: 'agreement-1', class: 'judge-agreement', model: 'fable', outcome: 'done', rulings, usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] } }] };
    const rulingsPath = writeJsonFile('agreement-rulings.json', rulingsReport);
    appendEntry(chainPath, { path: 'agreement-rulings.json', sha256: hashFile(rulingsPath), commit: 'c3' });
    return { samplePath, rulingsPath };
  }

  const ALL_PASS_CAUGHT: Record<string, number> = { evaluator: 5, operator: 5, designer: 4, extender: 6, 'core-developer': 5, scripter: 5 };

  function runGatedScore({
    caughtByJob = ALL_PASS_CAUGHT,
    falseFindingsByClass = {},
    agreement,
  }: {
    caughtByJob?: Record<string, number>;
    falseFindingsByClass?: Partial<Record<string, number>>;
    agreement?: { findings?: unknown[]; catchCalls?: unknown[]; fableLabels?: Record<string, string> };
  }): { code: number; result: Record<string, unknown> } {
    const reportPath = writeJsonFile(`report-${Math.random()}.json`, buildReaderReport());
    const { rulingsPath: catchRulingsPath, keyPaths: catchKeyPaths } = buildCatchRulingsAndKeys(caughtByJob, reportPath);
    const { rulingsPath: adjudicatorRulingsPath, keyPaths: adjudicatorKeyPaths } = buildAdjudicatorRulingsAndKeys(falseFindingsByClass, reportPath);
    const plantsPath = buildPlants();
    const { samplePath, rulingsPath: agreementRulingsPath } = buildAgreement(agreement);
    const outPath = join(dir, `out-${Math.random()}.json`);
    const args = [
      'gated',
      '--report', reportPath,
      '--catch-rulings', catchRulingsPath,
      ...catchKeyPaths.flatMap((p) => ['--catch-key', p]),
      '--adjudicator-rulings', adjudicatorRulingsPath,
      ...adjudicatorKeyPaths.flatMap((p) => ['--adjudicator-key', p]),
      '--plants', plantsPath,
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', samplePath,
      '--agreement-rulings', agreementRulingsPath,
      '--out', outPath,
    ];
    const code = main(args);
    return { code, result: readOut(outPath) };
  }

  it('passes every bar on a hand-computed all-pass fixture (pooled 30 of 40, every floor and precision met)', () => {
    const { code, result } = runGatedScore({});
    expect(code).toBe(0);
    expect(result.ok).toBe(true);
    const pooled = result.pooledSensitivity as { caught: number; pass: boolean };
    expect(pooled.caught).toBe(30);
    expect(pooled.pass).toBe(true);
    const classes = result.classes as Array<{ classId: string; verdict: string }>;
    expect(classes.every((cls) => cls.verdict === 'validated')).toBe(true);
    expect(result.allClassesFailed).toBe(false);
  });

  it('fails the pooled sensitivity bar and marks every class advisory when the caught count sits under the threshold', () => {
    const { result } = runGatedScore({ caughtByJob: { evaluator: 4, operator: 4, designer: 4, extender: 5, 'core-developer': 4, scripter: 5 } });
    const pooled = result.pooledSensitivity as { caught: number; pass: boolean };
    expect(pooled.caught).toBe(26);
    expect(pooled.pass).toBe(false);
    expect(result.allClassesFailed).toBe(true);
    const classes = result.classes as Array<{ verdict: string; reasons: string[] }>;
    expect(classes.every((cls) => cls.verdict === 'advisory')).toBe(true);
    expect(classes.every((cls) => cls.reasons.some((r) => r.includes('instrument-wide sensitivity')))).toBe(true);
  });

  it('fails only one class\'s own sensitivity floor, leaving the rest validated', () => {
    const { result } = runGatedScore({ caughtByJob: { evaluator: 3, operator: 5, designer: 4, extender: 6, 'core-developer': 7, scripter: 5 } });
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
  });

  it('fails only one class\'s own precision bar, leaving the rest validated', () => {
    const { result } = runGatedScore({ falseFindingsByClass: { 'docs-only': 5 } });
    const classes = result.classes as Array<{ classId: string; verdict: string; precision: { falseFindings: number } }>;
    const byClass = Object.fromEntries(classes.map((cls) => [cls.classId, cls]));
    expect(byClass['docs-only'].precision.falseFindings).toBe(5);
    expect(byClass['docs-only'].verdict).toBe('advisory');
    expect(byClass['docs-and-binary'].verdict).toBe('validated');
  });

  it('marks every class advisory when the agreement bar fails', () => {
    // Fable disagrees with the primary label on every sampled item: raw agreement is zero, well
    // under the fallback's 85 percent, so the bar fails regardless of which method applies.
    const findings = Array.from({ length: 5 }, (_, i) => ({ itemId: `f${i}`, runId: 'evaluator-control-1', jobId: 'evaluator', primaryLabel: 'real' as const }));
    const fableLabels = Object.fromEntries(findings.map((f) => [f.itemId, 'false']));
    const { result } = runGatedScore({ agreement: { findings, fableLabels } });
    const agreement = result.agreement as { pass: boolean };
    expect(agreement.pass).toBe(false);
    const classes = result.classes as Array<{ verdict: string; reasons: string[] }>;
    expect(classes.every((cls) => cls.verdict === 'advisory')).toBe(true);
    expect(classes.every((cls) => cls.reasons.some((r) => r.includes('agreement')))).toBe(true);
  });

  it('never lets a false finding in a round1 tuning report reach gated precision scoring: it never matches the planned pool\'s job ids', () => {
    // A stray round1/tuning report the caller mistakenly points the CLI at: its job ids
    // ("evaluator-tuning-control-1") never match the planned "<job>-control-<n>" pattern the
    // gated precision pool draws from, so its false finding can never reach any class's count.
    const reportPath = writeJsonFile('report-base.json', buildReaderReport());
    const tuningReportPath = writeJsonFile('report-tuning.json', {
      batch: 'round1',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-tuning-control-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED }],
    });
    const { rulingsPath: catchRulingsPath, keyPaths: catchKeyPaths } = buildCatchRulingsAndKeys(ALL_PASS_CAUGHT, reportPath);
    const { rulingsPath: adjudicatorRulingsPath, keyPaths: adjudicatorKeyPaths } = buildAdjudicatorRulingsAndKeys({}, reportPath);
    // The tuning report's own job carries a false finding in its adjudicator rulings, joined
    // through a key whose reader job id is the tuning job's, never one of the planned pool's ids.
    const tuningAdjudicatorRulings = { batch: 'tuning', runId: 'r', kind: 'adjudicator', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [{ id: 'evaluator-tuning-control-1', class: 'judge-adjudicator', model: 'claude-opus-5-5', outcome: 'done', rulings: [{ itemId: 'item-1', class: 'finding', subjectGroupId: 'subject-tuning', ruling: 'false', reason: 'r' }], usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] } }] };
    const tuningRulingsPath = writeJsonFile('tuning-adjudicator-rulings.json', tuningAdjudicatorRulings);
    const tuningKeyPath = writeJsonFile('evaluator-tuning-control-1-key.json', { kind: 'adjudicator', builtFrom: 'sources', report: { path: tuningReportPath, jobId: 'evaluator-tuning-control-1', attempt: 1, runId: 'run' }, items: { 'item-1': { field: 'stalls', sourceIndex: 0 } }, excluded: [], treeCommit: 'c', treeAbsent: [], inputs: {} });
    const plantsPath = buildPlants();
    const { samplePath, rulingsPath: agreementRulingsPath } = buildAgreement();
    const outPath = join(dir, 'out.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--report', tuningReportPath,
      '--catch-rulings', catchRulingsPath,
      ...catchKeyPaths.flatMap((p) => ['--catch-key', p]),
      '--adjudicator-rulings', adjudicatorRulingsPath,
      '--adjudicator-rulings', tuningRulingsPath,
      ...adjudicatorKeyPaths.flatMap((p) => ['--adjudicator-key', p]),
      '--adjudicator-key', tuningKeyPath,
      '--plants', plantsPath,
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', samplePath,
      '--agreement-rulings', agreementRulingsPath,
      '--out', outPath,
    ]);
    // The stray report's own job id fails the "<job>-<role>-<index>" role match at index time
    // (its role parses as "tuning", not "control"), so it never joins the precision pool at all,
    // and the run itself is refused as an unindexed job rather than silently ignored.
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-tuning-control-1'))).toBe(true);
  });

  it('rejects an unstamped report in both modes', () => {
    const reportPath = writeJsonFile('unstamped-report.json', {
      batch: 'gated-planted',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED }],
    });
    const devOut = join(dir, 'dev-out.json');
    const devCode = main(['dev', '--report', reportPath, '--plants', '/does/not/exist.json', '--out', devOut]);
    expect(devCode).toBe(1);
    expect((readOut(devOut).problems as string[])[0]).toContain('gated-planted');

    const gatedOut = join(dir, 'gated-out.json');
    const gatedCode = main(['gated', '--report', reportPath, '--plants', '/does/not/exist.json', '--thresholds', thresholdsPath, '--manifest', manifestPath, '--chain', chainPath, '--root', dir, '--agreement-sample', '/does/not/exist.json', '--out', gatedOut]);
    expect(gatedCode).toBe(1);
    expect((readOut(gatedOut).problems as string[])[0]).toContain('unstamped');
  });

  it('rejects a report stamped against a stale manifestHash, naming the report', () => {
    const reportPath = writeJsonFile('stale-report.json', {
      batch: 'gated-planted',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: { tag: manifestTag, manifestHash: 'a-stale-hash', chainHead: chainHeadAfterThresholds } }],
    });
    const outPath = join(dir, 'gated-out.json');
    const code = main(['gated', '--report', reportPath, '--plants', '/does/not/exist.json', '--thresholds', thresholdsPath, '--manifest', manifestPath, '--chain', chainPath, '--root', dir, '--agreement-sample', '/does/not/exist.json', '--out', outPath]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems[0]).toContain(reportPath);
    expect(problems[0]).toContain('a-stale-hash');
  });

  it('refuses and names a report whose own stopReason is not complete', () => {
    const reportPath = writeJsonFile('incomplete-report.json', {
      batch: 'gated-planted',
      runId: 'r',
      stopReason: 'budget',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: { tag: manifestTag, manifestHash, chainHead: chainHeadAfterThresholds } }],
    });
    const outPath = join(dir, 'gated-out.json');
    const code = main(['gated', '--report', reportPath, '--plants', '/does/not/exist.json', '--thresholds', thresholdsPath, '--manifest', manifestPath, '--chain', chainPath, '--root', dir, '--agreement-sample', '/does/not/exist.json', '--out', outPath]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('budget'))).toBe(true);
  });

  it('refuses and names a job carrying stoppedBy with no final attempt', () => {
    const reportPath = writeJsonFile('stopped-job-report.json', {
      batch: 'gated-planted',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', stoppedBy: 'rateLimit', pendingCause: 'initial', freeze: { tag: manifestTag, manifestHash, chainHead: chainHeadAfterThresholds } }],
    });
    const outPath = join(dir, 'gated-out.json');
    const code = main(['gated', '--report', reportPath, '--plants', '/does/not/exist.json', '--thresholds', thresholdsPath, '--manifest', manifestPath, '--chain', chainPath, '--root', dir, '--agreement-sample', '/does/not/exist.json', '--out', outPath]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-planted-1'))).toBe(true);
  });

  it('refuses and names every planned mapping run position missing from the precision pool', () => {
    // evaluator-control-3's own reader job is absent from the report entirely: the class's
    // precision pool is genuinely short a planned position, not just missing its judge rulings.
    const fullReport = buildReaderReport() as { jobs: Array<{ id: string }> };
    const reportPath = writeJsonFile('missing-run-report.json', { ...fullReport, jobs: fullReport.jobs.filter((j) => j.id !== 'evaluator-control-3') });
    const { rulingsPath: catchRulingsPath, keyPaths: catchKeyPaths } = buildCatchRulingsAndKeys(ALL_PASS_CAUGHT, reportPath);
    const { rulingsPath: adjudicatorRulingsPath, keyPaths: adjudicatorKeyPaths } = buildAdjudicatorRulingsAndKeys({}, reportPath);
    const keptKeys = adjudicatorKeyPaths.filter((p) => !p.includes('evaluator-control-3'));
    const plantsPath = buildPlants();
    const { samplePath, rulingsPath: agreementRulingsPath } = buildAgreement();
    const outPath = join(dir, 'missing-run-out.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--catch-rulings', catchRulingsPath,
      ...catchKeyPaths.flatMap((p) => ['--catch-key', p]),
      '--adjudicator-rulings', adjudicatorRulingsPath,
      ...keptKeys.flatMap((p) => ['--adjudicator-key', p]),
      '--plants', plantsPath,
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', samplePath,
      '--agreement-rulings', agreementRulingsPath,
      '--out', outPath,
    ]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-3'))).toBe(true);
  });

  it('refuses when the thresholds file\'s seed does not match the manifest\'s pinned oc-curve seed', () => {
    const badManifestPath = writeJsonFile('bad-seed-manifest.json', { tag: manifestTag, files: {}, imageId: 'img', cliVersion: 'v1', models: {}, jobs: {}, heldOutPins: {}, seeds: { [OC_CURVE_SEED_KEY]: 1 } });
    const { hash: badManifestHash } = loadManifest(badManifestPath);
    const badChainPath = join(dir, 'bad-chain.jsonl');
    // The genesis entry's own path names this scenario's own manifest file, distinct from the
    // shared `dir`'s original "manifest.json" (verifyChain checks every chain-tracked path
    // against the file actually on disk at that path, so reusing the same path name for two
    // different manifest contents in one directory would itself be a file-drift mismatch).
    appendEntry(badChainPath, { path: 'bad-seed-manifest.json', sha256: badManifestHash, commit: 'c0' });
    appendEntry(badChainPath, { path: 'thresholds.json', sha256: hashFile(thresholdsPath), commit: 'c1' });
    const chainHead = hashFile(badChainPath);
    const reportPath = writeJsonFile('bad-seed-report.json', {
      batch: 'gated-planted',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: { tag: manifestTag, manifestHash: badManifestHash, chainHead } }],
    });
    const outPath = join(dir, 'bad-seed-out.json');
    const code = main(['gated', '--report', reportPath, '--plants', '/does/not/exist.json', '--thresholds', thresholdsPath, '--manifest', badManifestPath, '--chain', badChainPath, '--root', dir, '--agreement-sample', '/does/not/exist.json', '--out', outPath]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('seed'))).toBe(true);
  });

  it('marks every class advisory and gives the achieved count at 34 plants (no pooled threshold exists)', () => {
    const thirtyFour = writeJsonFile('thresholds-34.json', recomputeThresholds({ evaluator: 6, operator: 6, designer: 6, extender: 6, 'core-developer': 5, scripter: 5 }));
    const chain34 = join(dir, 'chain-34.jsonl');
    appendEntry(chain34, { path: 'manifest.json', sha256: manifestHash, commit: 'c0' });
    appendEntry(chain34, { path: 'thresholds-34.json', sha256: hashFile(thirtyFour), commit: 'c1' });
    const chainHead34 = hashFile(chain34);
    const caughtByJob34: Record<string, number> = { evaluator: 6, operator: 6, designer: 6, extender: 6, 'core-developer': 5, scripter: 5 };
    const jobPlantCount34: Record<string, number> = { evaluator: 6, operator: 6, designer: 6, extender: 6, 'core-developer': 5, scripter: 5 };
    const reportPath = writeJsonFile('report-34.json', (() => {
      const jobs: unknown[] = [];
      for (const job of JOBS) for (let n = 1; n <= 3; n += 1) {
        jobs.push({ id: `${job}-planted-${n}`, class: JOB_CLASS[job], model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: { tag: manifestTag, manifestHash, chainHead: chainHead34 } });
        jobs.push({ id: `${job}-control-${n}`, class: JOB_CLASS[job], model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: { tag: manifestTag, manifestHash, chainHead: chainHead34 } });
      }
      return { batch: 'gated-planted', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs };
    })());
    const judgeJobs: unknown[] = [];
    const keyPaths: string[] = [];
    for (const job of JOBS) {
      const count = jobPlantCount34[job];
      const plantIds = Array.from({ length: count }, (_, i) => `${job}-P${i}`);
      for (let n = 1; n <= 3; n += 1) {
        const jobId = `${job}-planted-${n}`;
        const rulings = plantIds.map((_, i) => ({ itemId: `plant-${i + 1}`, ruling: n <= 2 && i < caughtByJob34[job] ? 'caught' : 'missed', reason: 'r' }));
        judgeJobs.push({ id: jobId, class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings, usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] } });
        const plants: Record<string, { plantId: string }> = {};
        plantIds.forEach((plantId, i) => (plants[`plant-${i + 1}`] = { plantId }));
        keyPaths.push(writeJsonFile(`${jobId}-34-catch-key.json`, { kind: 'catch', builtFrom: 'sources', report: { path: reportPath, jobId, attempt: 1, runId: jobId }, plants, items: {}, inputs: {} }));
      }
    }
    const catchRulingsPath = writeJsonFile('catch-rulings-34.json', { batch: 'gated-catch', runId: 'r', kind: 'catchJudge', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: judgeJobs });
    const { rulingsPath: adjudicatorRulingsPath, keyPaths: adjudicatorKeyPaths } = buildAdjudicatorRulingsAndKeys({}, reportPath);
    const plantsPath = writeJsonFile('plants-34.json', JOBS.flatMap((job) => Array.from({ length: jobPlantCount34[job] }, (_, i) => ({ id: `${job}-P${i}`, job, classId: JOB_CLASS[job], type: 'false-behavior', semantic: true }))));
    const { samplePath, rulingsPath: agreementRulingsPath } = buildAgreement();
    appendEntry(chain34, { path: 'agreement-sample.json', sha256: hashFile(samplePath), commit: 'c2' });
    appendEntry(chain34, { path: 'agreement-rulings.json', sha256: hashFile(agreementRulingsPath), commit: 'c3' });
    const outPath = join(dir, 'out-34.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--catch-rulings', catchRulingsPath,
      ...keyPaths.flatMap((p) => ['--catch-key', p]),
      '--adjudicator-rulings', adjudicatorRulingsPath,
      ...adjudicatorKeyPaths.flatMap((p) => ['--adjudicator-key', p]),
      '--plants', plantsPath,
      '--thresholds', thirtyFour,
      '--manifest', manifestPath,
      '--chain', chain34,
      '--root', dir,
      '--agreement-sample', samplePath,
      '--agreement-rulings', agreementRulingsPath,
      '--out', outPath,
    ]);
    expect(code).toBe(0);
    const result = readOut(outPath);
    const pooled = result.pooledSensitivity as { threshold: number | null; achieved: number };
    expect(pooled.threshold).toBeNull();
    expect(pooled.achieved).toBe(34);
    const classes = result.classes as Array<{ verdict: string }>;
    expect(classes.every((cls) => cls.verdict === 'advisory')).toBe(true);
  });
});
