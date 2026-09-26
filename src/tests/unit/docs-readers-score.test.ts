import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { appendEntry, hashFile } from '../../../scripts/docs-readers/lib/chain.js';
import { loadManifest } from '../../../scripts/docs-readers/freeze.js';
import { main } from '../../../scripts/docs-readers/score.js';
import { recomputeThresholds } from '../../../scripts/docs-readers/oc-curve.js';
import { wilsonInterval } from '../../../scripts/docs-readers/lib/score-catch.js';

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

  // pass1-trimmed.json's own top-level runId, which a key's report trace must match.
  const SAVED_REPORT_RUN_ID = '20260924t081831-4ca4ee';

  function catchKey(readerJobId: string, plantId: string): unknown {
    return { kind: 'catch', builtFrom: 'sources', report: { path: savedReport, jobId: readerJobId, attempt: 1, runId: SAVED_REPORT_RUN_ID }, plants: { 'plant-1': { plantId } }, items: {}, inputs: {} };
  }

  it('scores a pass 1 saved report in development mode', () => {
    // This fixture has one on-map plant and only Opus runs, so neither the off-map exclusion nor
    // the non-Opus exclusion is pinned by this test.
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

  it('reports on-map catches per plant-run: one planted run per job that caught the plant reports 1 of 1, though the gated two-of-three rule scores 0', () => {
    const report = writeJsonFile('round1-single-run-report.json', {
      batch: 'round1',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED }],
    });
    const rulingsPath = writeJsonFile('single-run-catch-rulings.json', catchJudgeRulings(['evaluator-planted-1']));
    const keyPath = writeJsonFile('single-run-catch-key.json', { kind: 'catch', builtFrom: 'sources', report: { path: report, jobId: 'evaluator-planted-1', attempt: 1, runId: 'r' }, plants: { 'plant-1': { plantId: 'PLANT-X1' } }, items: {}, inputs: {} });
    const plantsPath = writeJsonFile('single-run-plants.json', [{ id: 'PLANT-X1', job: 'evaluator', page: 'docs/fixture-page.md', line: 12 }]);
    const mapPath = writeJsonFile('single-run-evaluator-map.json', {
      job: 'evaluator',
      verifiedRuns: 1,
      mode: 'proxy',
      pages: { 'docs/fixture-page.md': { lines: 100, sections: [{ heading: 'lead', level: 1, start: 1, end: 30, quotes: 2, runs: 2 }] } },
      onPathShare: 0.3,
      narrowed: false,
      widened: false,
      capacity: 7,
      noMap: null,
    });
    const outPath = join(dir, 'dev-out-single-run.json');
    const code = main([
      'dev',
      '--report', report,
      '--catch-rulings', rulingsPath,
      '--catch-key', keyPath,
      '--plants', plantsPath,
      '--map', `evaluator=${mapPath}`,
      '--out', outPath,
    ]);
    expect(code).toBe(0);
    const result = readOut(outPath);
    const byJob = result.byJob as Record<string, { onMapCaught: number; onMapPlantRunRecall: { caught: number; total: number; rate: number | null } }>;
    // The gated two-of-three rule (onMapCaught) can never register a catch on one counted run.
    expect(byJob.evaluator.onMapCaught).toBe(0);
    expect(byJob.evaluator.onMapPlantRunRecall).toMatchObject({ caught: 1, total: 1, rate: 1 });
    expect(result.onMapPlantRunRecall).toMatchObject({ caught: 1, total: 1, rate: 1 });
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
    // evaluator-control-2's own final outcome carries nine catch-field items (stalls[]), the
    // itemCount source since this round's fix; it is unverified, so per the rerun rule its own
    // nine items would each count false in gated mode, but development mode instead drops the
    // whole run from both the numerator and the denominator, never reading itemCount for it at all.
    const nineStalls = Array.from({ length: 9 }, (_, i) => ({ text: `s${i}`, blockedBy: null }));
    const report = writeJsonFile('round1-precision-report.json', {
      batch: 'round1',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [
        { id: 'evaluator-control-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED },
        { id: 'evaluator-control-2', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', stalls: nineStalls, verified: { ...VERIFIED, ok: false } },
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
    const key1Path = writeJsonFile('evaluator-control-1-key.json', { kind: 'adjudicator', builtFrom: 'sources', report: { path: report, jobId: 'evaluator-control-1', attempt: 1, runId: 'r' }, items: {}, excluded: [], treeCommit: 'c', treeAbsent: [], inputs: {} });
    const outPath = join(dir, 'dev-out.json');
    const code = main([
      'dev',
      '--report', report,
      '--adjudicator-rulings', rulingsPath,
      '--adjudicator-key', key1Path,
      '--plants', writeJsonFile('empty-plants.json', []),
      '--out', outPath,
    ]);
    expect(code).toBe(0);
    const byJob = readOut(outPath).byJob as Record<string, { verifiedControlRunCount: number; totalFalseFindings: number; falseFindingsPerVerifiedControlRun: number | null }>;
    expect(byJob.evaluator.verifiedControlRunCount).toBe(1);
    expect(byJob.evaluator.totalFalseFindings).toBe(0);
    expect(byJob.evaluator.falseFindingsPerVerifiedControlRun).toBe(0);
  });

  it('scores a pilot-2a batch name, but refuses the unscored smoke batch name, naming it', () => {
    const report = writeJsonFile('pilot-report.json', {
      batch: 'pilot-2a-operator',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'operator-control-1', class: 'docs-and-binary', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED }],
    });
    const outPath = join(dir, 'pilot-out.json');
    expect(main(['dev', '--report', report, '--plants', writeJsonFile('empty-plants-1.json', []), '--out', outPath])).toBe(0);
    expect(readOut(outPath).ok).toBe(true);

    const smokeReport = writeJsonFile('smoke-report.json', { batch: 'pilot-2a-smoke', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [] });
    const smokeOut = join(dir, 'smoke-out.json');
    expect(main(['dev', '--report', smokeReport, '--plants', '/does/not/exist.json', '--out', smokeOut])).toBe(1);
    expect((readOut(smokeOut).problems as string[])[0]).toContain('pilot-2a-smoke');
  });

  describe('--control-ids', () => {
    // Two control jobs (job-a-control-1, job-b-control-1) and one planted job (job-a-planted-1,
    // never a valid --control-ids value), all in one pilot-2a batch, so the "unlisted control
    // job" check has something to catch.
    function controlIdsReport(): string {
      return writeJsonFile('control-ids-report.json', {
        batch: 'pilot-2a-operator',
        runId: 'r',
        stopReason: 'complete',
        budgetTokens: 0,
        usage: USAGE,
        verified: true,
        jobs: [
          { id: 'job-a-control-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED },
          { id: 'job-a-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED },
          { id: 'job-b-control-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED },
        ],
      });
    }

    function runWithControlIds(controlIds: string, outName: string): { code: number; problems?: string[] } {
      const outPath = join(dir, outName);
      const code = main(['dev', '--report', controlIdsReport(), '--plants', writeJsonFile(`${outName}-plants.json`, []), '--control-ids', controlIds, '--out', outPath]);
      const result = readOut(outPath);
      return { code, problems: result.problems as string[] | undefined };
    }

    it('refuses an empty id in the list', () => {
      const { code, problems } = runWithControlIds('job-a-control-1,', 'empty-out.json');
      expect(code).toBe(1);
      expect(problems![0]).toContain('empty');
    });

    it('refuses an id absent from the reports, naming it', () => {
      const { code, problems } = runWithControlIds('job-a-control-1,unknown-control-1', 'absent-out.json');
      expect(code).toBe(1);
      expect(problems![0]).toContain('unknown-control-1');
    });

    it('refuses a duplicate id, naming it', () => {
      const { code, problems } = runWithControlIds('job-a-control-1,job-b-control-1,job-a-control-1', 'dup-out.json');
      expect(code).toBe(1);
      expect(problems![0]).toContain('job-a-control-1');
      expect(problems![0]).toContain('duplicate');
    });

    it('refuses a list that repeats an id absent from the reports as absent, not as a duplicate: the absent check runs before the duplicate check', () => {
      const { code, problems } = runWithControlIds('ghost-control-1,ghost-control-1', 'absent-repeat-out.json');
      expect(code).toBe(1);
      expect(problems![0]).toBe('--control-ids: id "ghost-control-1" is absent from the reports');
    });

    it('refuses an id whose role does not parse as control, naming it', () => {
      const { code, problems } = runWithControlIds('job-a-planted-1,job-b-control-1', 'role-out.json');
      expect(code).toBe(1);
      expect(problems![0]).toContain('job-a-planted-1');
    });

    it('refuses a control job the list leaves out, when a pilot-2a-* batch is present', () => {
      const { code, problems } = runWithControlIds('job-a-control-1', 'unlisted-out.json');
      expect(code).toBe(1);
      expect(problems![0]).toContain('job-b-control-1');
    });

    it('accepts every control job listed, with none left out', () => {
      const { code } = runWithControlIds('job-a-control-1,job-b-control-1', 'ok-out.json');
      expect(code).toBe(0);
    });
  });

  it('reports plantTallies from on-map tallies only, and onMapPlantRunWilson beside onMapPlantRunRecall', () => {
    // evaluator-planted-1 and -2 join no catch-judge rulings at all, so every plant's catch
    // defaults to missed for both counted runs: runsCaught is [false, false].
    const report = writeJsonFile('plant-tallies-report.json', {
      batch: 'round1',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [
        { id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED },
        { id: 'evaluator-planted-2', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED },
      ],
    });
    const plantsPath = writeJsonFile('plant-tallies-plants.json', [
      { id: 'PLANT-ON', job: 'evaluator', page: 'docs/fixture-page.md', line: 12 },
      { id: 'PLANT-OFF', job: 'evaluator', page: 'docs/fixture-page.md', line: 900 },
    ]);
    const mapPath = writeJsonFile('plant-tallies-map.json', {
      job: 'evaluator',
      verifiedRuns: 2,
      mode: 'proxy',
      pages: { 'docs/fixture-page.md': { lines: 1000, sections: [{ heading: 'lead', level: 1, start: 1, end: 30, quotes: 2, runs: 2 }] } },
      onPathShare: 0.3,
      narrowed: false,
      widened: false,
      capacity: 7,
      noMap: null,
    });
    const outPath = join(dir, 'plant-tallies-out.json');
    const code = main(['dev', '--report', report, '--plants', plantsPath, '--map', `evaluator=${mapPath}`, '--out', outPath]);
    expect(code).toBe(0);
    const result = readOut(outPath);
    const plantTallies = result.plantTallies as Array<{ plantId: string; job: string; runsCaught: boolean[] }>;
    expect(plantTallies).toHaveLength(1);
    expect(plantTallies[0]).toEqual({ plantId: 'PLANT-ON', job: 'evaluator', runsCaught: [false, false] });
    expect(plantTallies[0].runsCaught.some(Boolean)).toBe(false);
    const onMapPlantRunRecall = result.onMapPlantRunRecall as { caught: number; total: number };
    const wilson = result.onMapPlantRunWilson as { lower: number; upper: number };
    expect(wilson).toEqual(wilsonInterval(onMapPlantRunRecall.caught, onMapPlantRunRecall.total));
  });

  it('excludes an off-map plant from plantTallies even when its catch judge rules it caught', () => {
    const report = writeJsonFile('off-map-caught-report.json', {
      batch: 'round1',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED }],
    });
    const plantsPath = writeJsonFile('off-map-caught-plants.json', [
      { id: 'PLANT-ON', job: 'evaluator', page: 'docs/fixture-page.md', line: 12 },
      { id: 'PLANT-OFF', job: 'evaluator', page: 'docs/fixture-page.md', line: 900 },
    ]);
    const mapPath = writeJsonFile('off-map-caught-map.json', {
      job: 'evaluator',
      verifiedRuns: 1,
      mode: 'proxy',
      pages: { 'docs/fixture-page.md': { lines: 1000, sections: [{ heading: 'lead', level: 1, start: 1, end: 30, quotes: 2, runs: 2 }] } },
      onPathShare: 0.3,
      narrowed: false,
      widened: false,
      capacity: 7,
      noMap: null,
    });
    const rulingsPath = writeJsonFile('off-map-caught-rulings.json', {
      batch: 'catch-round0',
      runId: 'r',
      kind: 'catchJudge',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [
        {
          id: 'evaluator-planted-1',
          class: 'judge-catch',
          model: 'claude-opus-5-5',
          outcome: 'done',
          rulings: [
            { itemId: 'plant-on-item', ruling: 'caught', reason: 'r' },
            { itemId: 'plant-off-item', ruling: 'caught', reason: 'r' },
          ],
          usage: USAGE,
          verified: { ok: true, init: true, canaries: true, problems: [] },
        },
      ],
    });
    const keyPath = writeJsonFile('off-map-caught-key.json', {
      kind: 'catch',
      builtFrom: 'sources',
      report: { path: report, jobId: 'evaluator-planted-1', attempt: 1, runId: 'r' },
      plants: { 'plant-on-item': { plantId: 'PLANT-ON' }, 'plant-off-item': { plantId: 'PLANT-OFF' } },
      items: {},
      inputs: {},
    });
    const outPath = join(dir, 'off-map-caught-out.json');
    const code = main(['dev', '--report', report, '--catch-rulings', rulingsPath, '--catch-key', keyPath, '--plants', plantsPath, '--map', `evaluator=${mapPath}`, '--out', outPath]);
    expect(code).toBe(0);
    const plantTallies = readOut(outPath).plantTallies as Array<{ plantId: string; job: string; runsCaught: boolean[] }>;
    // PLANT-OFF is caught (both catch keys rule 'caught'), but only PLANT-ON, the on-map plant, appears.
    expect(plantTallies).toEqual([{ plantId: 'PLANT-ON', job: 'evaluator', runsCaught: [true] }]);
  });

  it('shows a catch through a new-field (wrong[]) item in its plant\'s plantTallies runsCaught, since a catch ruling is per plant, not per field', () => {
    const report = writeJsonFile('new-field-catch-report.json', {
      batch: 'round1',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [
        {
          id: 'evaluator-planted-1',
          class: 'docs-only',
          model: 'claude-opus-5-5',
          outcome: 'done',
          wrong: [{ quote: { path: 'docs/fixture-page.md', line: 12, text: 't', ok: true }, pageSays: 'a', actual: 'b', evidence: 'c' }],
          verified: VERIFIED,
        },
      ],
    });
    const plantsPath = writeJsonFile('new-field-catch-plants.json', [{ id: 'PLANT-X1', job: 'evaluator', page: 'docs/fixture-page.md', line: 12 }]);
    const mapPath = writeJsonFile('new-field-catch-map.json', {
      job: 'evaluator',
      verifiedRuns: 1,
      mode: 'proxy',
      pages: { 'docs/fixture-page.md': { lines: 100, sections: [{ heading: 'lead', level: 1, start: 1, end: 30, quotes: 2, runs: 2 }] } },
      onPathShare: 0.3,
      narrowed: false,
      widened: false,
      capacity: 7,
      noMap: null,
    });
    // Rebuilt from a real round 1 catch key (evaluator-planted-1-key.json) rather than a
    // hand-rolled stub, so this test proves against the key file's actual shape: item-1
    // (originally a stalls[] item at sourceIndex 0) is moved into the new wrong[] field, and the
    // report gains a matching wrong[] entry at that index.
    const round1Key = JSON.parse(
      readFileSync(resolve(ROOT, 'scripts/docs-readers/tuning/round1/catch-keys/evaluator-planted-1-key.json'), 'utf8'),
    ) as { items: Record<string, unknown> };
    const rulingsPath = writeJsonFile('new-field-catch-rulings.json', {
      batch: 'catch-round0',
      runId: 'r',
      kind: 'catchJudge',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [
        {
          id: 'evaluator-planted-1',
          class: 'judge-catch',
          model: 'claude-opus-5-5',
          outcome: 'done',
          rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'caught PLANT-X1; see item-1, the new wrong[] entry' }],
          usage: USAGE,
          verified: { ok: true, init: true, canaries: true, problems: [] },
        },
      ],
    });
    const keyPath = writeJsonFile('new-field-catch-key.json', {
      kind: 'catch',
      builtFrom: 'sources',
      report: { path: report, jobId: 'evaluator-planted-1', attempt: 1, runId: 'r' },
      plants: { 'plant-1': { plantId: 'PLANT-X1' } },
      items: { ...round1Key.items, 'item-1': { field: 'wrong', sourceIndex: 0 } },
      inputs: {},
    });
    const outPath = join(dir, 'new-field-catch-out.json');
    const code = main(['dev', '--report', report, '--catch-rulings', rulingsPath, '--catch-key', keyPath, '--plants', plantsPath, '--map', `evaluator=${mapPath}`, '--out', outPath]);
    expect(code).toBe(0);
    const plantTallies = readOut(outPath).plantTallies as Array<{ plantId: string; job: string; runsCaught: boolean[] }>;
    expect(plantTallies[0]).toEqual({ plantId: 'PLANT-X1', job: 'evaluator', runsCaught: [true] });
  });

  it('builds pooledPrecision over --control-ids: an unverified run falls back to itemCount/newFieldItemCount, and a verified run\'s false group holding a missing[] item counts as new-field', () => {
    const report = writeJsonFile('pooled-precision-report.json', {
      batch: 'pilot-2a-operator',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [
        {
          id: 'evaluator-control-1',
          class: 'docs-only',
          model: 'claude-opus-5-5',
          outcome: 'done',
          stalls: [{ text: 's1', blockedBy: null }, { text: 's2', blockedBy: null }],
          wrong: [{ quote: { path: 'p', line: 1, text: 't', ok: true }, pageSays: 'a', actual: 'b', evidence: 'c' }],
          verified: { ...VERIFIED, ok: false },
        },
        { id: 'evaluator-control-2', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED },
      ],
    });
    const adjudicatorRulings = {
      batch: 'adjudicator-pilot',
      runId: 'r',
      kind: 'adjudicator',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [
        {
          id: 'evaluator-control-2',
          class: 'judge-adjudicator',
          model: 'claude-opus-5-5',
          outcome: 'done',
          rulings: [
            { itemId: 'item-1', class: 'finding', subjectGroupId: 'g1', ruling: 'false', reason: 'r' },
            { itemId: 'item-2', class: 'finding', subjectGroupId: 'g2', ruling: 'false', reason: 'r' },
          ],
          usage: USAGE,
          verified: { ok: true, init: true, canaries: true, problems: [] },
        },
      ],
    };
    const rulingsPath = writeJsonFile('pooled-precision-adjudicator-rulings.json', adjudicatorRulings);
    const keyPath = writeJsonFile('pooled-precision-key.json', {
      kind: 'adjudicator',
      builtFrom: 'sources',
      report: { path: report, jobId: 'evaluator-control-2', attempt: 1, runId: 'r' },
      items: { 'item-1': { field: 'missing', sourceIndex: 0 }, 'item-2': { field: 'stalls', sourceIndex: 0 } },
      excluded: [],
      treeCommit: 'c',
      treeAbsent: [],
      inputs: {},
    });
    const outPath = join(dir, 'pooled-precision-out.json');
    const code = main([
      'dev',
      '--report', report,
      '--adjudicator-rulings', rulingsPath,
      '--adjudicator-key', keyPath,
      '--plants', writeJsonFile('pooled-precision-plants.json', []),
      '--control-ids', 'evaluator-control-1,evaluator-control-2',
      '--out', outPath,
    ]);
    expect(code).toBe(0);
    const pooled = readOut(outPath).pooledPrecision as {
      controlRunIds: string[];
      falseFindings: number;
      newFieldFalseFindings: number;
      otherFalseFindings: number;
      perRun: Array<{ runId: string; verified: boolean; falseFindings: number; newFieldFalseFindings: number }>;
    };
    expect(pooled.controlRunIds).toEqual(['evaluator-control-1', 'evaluator-control-2']);
    expect(pooled.perRun).toEqual([
      { runId: 'evaluator-control-1', verified: false, falseFindings: 3, newFieldFalseFindings: 1 },
      { runId: 'evaluator-control-2', verified: true, falseFindings: 2, newFieldFalseFindings: 1 },
    ]);
    expect(pooled.falseFindings).toBe(5);
    expect(pooled.newFieldFalseFindings).toBe(2);
    expect(pooled.otherFalseFindings).toBe(3);
  });

  it('omits pooledPrecision when --control-ids is absent', () => {
    const report = writeJsonFile('no-control-ids-report.json', { batch: 'round1', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [] });
    const outPath = join(dir, 'no-control-ids-out.json');
    expect(main(['dev', '--report', report, '--plants', writeJsonFile('no-control-ids-plants.json', []), '--out', outPath])).toBe(0);
    expect(readOut(outPath)).not.toHaveProperty('pooledPrecision');
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

  /** The freeze stamp every gated job (reader or judge) must carry, matching this suite's own manifest and chain. */
  function freezeStamp(): { tag: string; manifestHash: string; chainHead: string } {
    return { tag: manifestTag, manifestHash, chainHead: chainHeadAfterThresholds };
  }

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
        jobs.push({ id: `${job}-planted-${n}`, class: JOB_CLASS[job], model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: freezeStamp() });
        jobs.push({ id: `${job}-control-${n}`, class: JOB_CLASS[job], model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: freezeStamp() });
      }
    }
    return { batch: 'gated-planted', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs };
  }

  /** One catch-judge job per planted reader job id, with `caughtCount` of the job's plants marked caught in exactly two of three runs. Every key and the rulings file are entered into the chain. */
  function buildCatchRulingsAndKeys(caughtByJob: Record<string, number>, reportPath: string): { rulingsPath: string; keyPaths: string[] } {
    const judgeJobs: unknown[] = [];
    const keyPaths: string[] = [];
    for (const job of JOBS) {
      const count = JOB_PLANT_COUNT[job];
      const plantIds = Array.from({ length: count }, (_, i) => `${job}-P${i}`);
      for (let n = 1; n <= 3; n += 1) {
        const jobId = `${job}-planted-${n}`;
        const rulings = plantIds.map((_, i) => ({ itemId: `plant-${i + 1}`, ruling: n <= 2 && i < caughtByJob[job] ? 'caught' : 'missed', reason: 'r' }));
        judgeJobs.push({ id: jobId, class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings, usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: freezeStamp() });
        const plants: Record<string, { plantId: string }> = {};
        plantIds.forEach((plantId, i) => (plants[`plant-${i + 1}`] = { plantId }));
        const keyPath = writeJsonFile(`${jobId}-catch-key.json`, { kind: 'catch', builtFrom: 'sources', report: { path: reportPath, jobId, attempt: 1, runId: 'r' }, plants, items: {}, inputs: {} });
        appendEntry(chainPath, { path: `${jobId}-catch-key.json`, sha256: hashFile(keyPath), commit: 'c-key' });
        keyPaths.push(keyPath);
      }
    }
    const rulingsPath = writeJsonFile('catch-rulings.json', { batch: 'gated-catch', runId: 'r', kind: 'catchJudge', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: judgeJobs });
    appendEntry(chainPath, { path: 'catch-rulings.json', sha256: hashFile(rulingsPath), commit: 'c-catch-rulings' });
    return { rulingsPath, keyPaths };
  }

  /** One adjudicator job per control reader job id, with `falseFindingsByClass` false-ruled subject groups placed on that class's first control run. Every key and the rulings file are entered into the chain. */
  function buildAdjudicatorRulingsAndKeys(falseFindingsByClass: Partial<Record<string, number>>, reportPath: string): { rulingsPath: string; keyPaths: string[] } {
    const judgeJobs: unknown[] = [];
    const keyPaths: string[] = [];
    for (const job of JOBS) {
      for (let n = 1; n <= 3; n += 1) {
        const jobId = `${job}-control-${n}`;
        const classId = JOB_CLASS[job];
        const count = n === 1 ? (falseFindingsByClass[classId] ?? 0) : 0;
        const rulings = Array.from({ length: count }, (_, i) => ({ itemId: `item-${i + 1}`, class: 'finding', subjectGroupId: `subject-${jobId}-${i}`, ruling: 'false', reason: 'r' }));
        judgeJobs.push({ id: jobId, class: 'judge-adjudicator', model: 'claude-opus-5-5', outcome: 'done', rulings, usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: freezeStamp() });
        const items: Record<string, unknown> = {};
        for (let i = 0; i < count; i += 1) items[`item-${i + 1}`] = { field: 'stalls', sourceIndex: i };
        const keyPath = writeJsonFile(`${jobId}-adjudicator-key.json`, { kind: 'adjudicator', builtFrom: 'sources', report: { path: reportPath, jobId, attempt: 1, runId: 'r' }, items, excluded: [], treeCommit: 'c', treeAbsent: [], inputs: {} });
        appendEntry(chainPath, { path: `${jobId}-adjudicator-key.json`, sha256: hashFile(keyPath), commit: 'c-key' });
        keyPaths.push(keyPath);
      }
    }
    const rulingsPath = writeJsonFile('adjudicator-rulings.json', { batch: 'gated-adjudicator', runId: 'r', kind: 'adjudicator', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: judgeJobs });
    appendEntry(chainPath, { path: 'adjudicator-rulings.json', sha256: hashFile(rulingsPath), commit: 'c-adjudicator-rulings' });
    return { rulingsPath, keyPaths };
  }

  /**
   * Chains the plant record, then advances `chainHeadAfterThresholds` (the head every
   * subsequent job's own freeze stamp reads) past it: a planted or heldout job's own dependsOn
   * names the plant record, so its own chain head must already include it, the same way the real
   * sequence chains the plant record before any planted run's own batch starts.
   */
  function buildPlants(): string {
    const plants: unknown[] = [];
    for (const job of JOBS) {
      for (let i = 0; i < JOB_PLANT_COUNT[job]; i += 1) plants.push({ id: `${job}-P${i}`, job, classId: JOB_CLASS[job], type: 'false-behavior', semantic: true });
    }
    const plantsPath = writeJsonFile('plants.json', plants);
    appendEntry(chainPath, { path: 'plants.json', sha256: hashFile(plantsPath), commit: 'c-plants' });
    chainHeadAfterThresholds = hashFile(chainPath);
    return plantsPath;
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
    const rulingsReport = {
      batch: 'agreement',
      runId: 'r',
      kind: 'agreement',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'agreement-1', class: 'judge-agreement', model: 'fable', outcome: 'done', rulings, usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: freezeStamp() }],
    };
    const rulingsPath = writeJsonFile('agreement-rulings.json', rulingsReport);
    appendEntry(chainPath, { path: 'agreement-rulings.json', sha256: hashFile(rulingsPath), commit: 'c3' });
    return { samplePath, rulingsPath };
  }

  const ALL_PASS_CAUGHT: Record<string, number> = { evaluator: 5, operator: 5, designer: 4, extender: 6, 'core-developer': 5, scripter: 5 };

  /** Build every artifact a full gated run needs and return the CLI args, without invoking `main`, so a test can mutate them before running. */
  function buildGatedArgs({
    caughtByJob = ALL_PASS_CAUGHT,
    falseFindingsByClass = {},
    agreement,
  }: {
    caughtByJob?: Record<string, number>;
    falseFindingsByClass?: Partial<Record<string, number>>;
    agreement?: { findings?: unknown[]; catchCalls?: unknown[]; fableLabels?: Record<string, string> };
  } = {}): { args: string[]; outPath: string; reportPath: string } {
    // The plant record is chained (and chainHeadAfterThresholds advanced past it) before any
    // planted or heldout job's own freeze stamp is minted, since its own dependsOn names the
    // plant record.
    const plantsPath = buildPlants();
    const resolvedReportPath = writeJsonFile(`report-${Math.random()}.json`, buildReaderReport());
    const { rulingsPath: catchRulingsPath, keyPaths: catchKeyPaths } = buildCatchRulingsAndKeys(caughtByJob, resolvedReportPath);
    const { rulingsPath: adjudicatorRulingsPath, keyPaths: adjudicatorKeyPaths } = buildAdjudicatorRulingsAndKeys(falseFindingsByClass, resolvedReportPath);
    const { samplePath, rulingsPath: agreementRulingsPath } = buildAgreement(agreement);
    const outPath = join(dir, `out-${Math.random()}.json`);
    const args = [
      'gated',
      '--report', resolvedReportPath,
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
      '--heldout-ids', '',
      '--out', outPath,
    ];
    return { args, outPath, reportPath: resolvedReportPath };
  }

  function runGatedScore(options: Parameters<typeof buildGatedArgs>[0] = {}): { code: number; result: Record<string, unknown> } {
    const { args, outPath } = buildGatedArgs(options);
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

  it('refuses a stray round1 tuning report as an unstamped input, never letting its false finding reach any class', () => {
    // evaluator-tuning-control-1 parses as job "evaluator-tuning", role "control": the id
    // convention alone does not exclude it from the precision pool by job name. What actually
    // stops it here is that it is unstamped (a round1/tuning report carries no freeze at all),
    // which gated mode refuses before assembly ever runs, so its false finding never has a
    // chance to reach any class's precision count.
    const { args, outPath } = buildGatedArgs({});
    const tuningReportPath = writeJsonFile('report-tuning.json', {
      batch: 'round1',
      runId: 'r',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-tuning-control-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED }],
    });
    args.push('--report', tuningReportPath);
    const code = main(args);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-tuning-control-1') && p.includes('unstamped'))).toBe(true);
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
    const gatedCode = main([
      'gated',
      '--report', reportPath,
      '--plants', '/does/not/exist.json',
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', '/does/not/exist.json',
      '--agreement-rulings', '/does/not/exist-rulings.json',
      '--heldout-ids', '',
      '--out', gatedOut,
    ]);
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
    const code = main([
      'gated',
      '--report', reportPath,
      '--plants', '/does/not/exist.json',
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', '/does/not/exist.json',
      '--agreement-rulings', '/does/not/exist-rulings.json',
      '--heldout-ids', '',
      '--out', outPath,
    ]);
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
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: freezeStamp() }],
    });
    const outPath = join(dir, 'gated-out.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--plants', '/does/not/exist.json',
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', '/does/not/exist.json',
      '--agreement-rulings', '/does/not/exist-rulings.json',
      '--heldout-ids', '',
      '--out', outPath,
    ]);
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
      jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', stoppedBy: 'rateLimit', pendingCause: 'initial', freeze: freezeStamp() }],
    });
    const outPath = join(dir, 'gated-out.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--plants', '/does/not/exist.json',
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', '/does/not/exist.json',
      '--agreement-rulings', '/does/not/exist-rulings.json',
      '--heldout-ids', '',
      '--out', outPath,
    ]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-planted-1'))).toBe(true);
  });

  it('refuses and names a catch-judge batch report that fails checkGatedStamp', () => {
    const { args, outPath } = buildGatedArgs({});
    const catchRulingsIndex = args.indexOf('--catch-rulings') + 1;
    const badRulingsPath = writeJsonFile('bad-catch-rulings.json', {
      batch: 'gated-catch',
      runId: 'r',
      kind: 'catchJudge',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings: [], usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] } }],
    });
    appendEntry(chainPath, { path: 'bad-catch-rulings.json', sha256: hashFile(badRulingsPath), commit: 'c-bad' });
    args[catchRulingsIndex] = badRulingsPath;
    const code = main(args);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('catch-judge') && p.includes('unstamped'))).toBe(true);
  });

  it('refuses and names an unverified catch-judge job, never scoring around it', () => {
    const plantsPath = buildPlants();
    const reportPath = writeJsonFile('single-job-report.json', { batch: 'gated-planted', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: freezeStamp() }] });
    const key: unknown = { kind: 'catch', builtFrom: 'sources', report: { path: reportPath, jobId: 'evaluator-planted-1', attempt: 1, runId: 'r' }, plants: { 'plant-1': { plantId: 'evaluator-P0' } }, items: {}, inputs: {} };
    const keyPath = writeJsonFile('single-key.json', key);
    appendEntry(chainPath, { path: 'single-key.json', sha256: hashFile(keyPath), commit: 'c-key' });
    const rulings = { batch: 'catch', runId: 'r', kind: 'catchJudge', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [{ id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings: [], usage: USAGE, verified: { ok: false, init: true, canaries: true, problems: [] }, freeze: freezeStamp() }] };
    const rulingsPath = writeJsonFile('single-catch-rulings.json', rulings);
    appendEntry(chainPath, { path: 'single-catch-rulings.json', sha256: hashFile(rulingsPath), commit: 'c-rulings' });
    const { samplePath, rulingsPath: agreementRulingsPath } = buildAgreement();
    const outPath = join(dir, 'out.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--catch-rulings', rulingsPath,
      '--catch-key', keyPath,
      '--plants', plantsPath,
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', samplePath,
      '--agreement-rulings', agreementRulingsPath,
      '--heldout-ids', '',
      '--out', outPath,
    ]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('unverified'))).toBe(true);
  });

  it('refuses and names a planted reader job with no joined catch-judge key or rulings', () => {
    const plantsPath = buildPlants();
    const reportPath = writeJsonFile('single-job-no-key-report.json', { batch: 'gated-planted', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: freezeStamp() }] });
    const { samplePath, rulingsPath: agreementRulingsPath } = buildAgreement();
    const outPath = join(dir, 'out.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--plants', plantsPath,
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', samplePath,
      '--agreement-rulings', agreementRulingsPath,
      '--heldout-ids', '',
      '--out', outPath,
    ]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-planted-1') && p.includes('no catch-judge'))).toBe(true);
  });

  it('refuses and names a catch-judge key whose own trace does not match the indexed job it names', () => {
    const plantsPath = buildPlants();
    const reportPath = writeJsonFile('trace-mismatch-report.json', { batch: 'gated-planted', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: freezeStamp() }] });
    // The key claims a runId the reader report never carried.
    const key: unknown = { kind: 'catch', builtFrom: 'sources', report: { path: reportPath, jobId: 'evaluator-planted-1', attempt: 1, runId: 'wrong-run-id' }, plants: { 'plant-1': { plantId: 'evaluator-P0' } }, items: {}, inputs: {} };
    const keyPath = writeJsonFile('mismatch-key.json', key);
    appendEntry(chainPath, { path: 'mismatch-key.json', sha256: hashFile(keyPath), commit: 'c-key' });
    const rulings = { batch: 'catch', runId: 'r', kind: 'catchJudge', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [{ id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r' }], usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: freezeStamp() }] };
    const rulingsPath = writeJsonFile('mismatch-catch-rulings.json', rulings);
    appendEntry(chainPath, { path: 'mismatch-catch-rulings.json', sha256: hashFile(rulingsPath), commit: 'c-rulings' });
    const { samplePath, rulingsPath: agreementRulingsPath } = buildAgreement();
    const outPath = join(dir, 'out.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--catch-rulings', rulingsPath,
      '--catch-key', keyPath,
      '--plants', plantsPath,
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', samplePath,
      '--agreement-rulings', agreementRulingsPath,
      '--heldout-ids', '',
      '--out', outPath,
    ]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-planted-1') && p.includes('wrong-run-id'))).toBe(true);
  });

  it('refuses and names a catch-judge key plant with zero or more than one ruling', () => {
    const plantsPath = buildPlants();
    const reportPath = writeJsonFile('duplicate-ruling-report.json', { batch: 'gated-planted', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [{ id: 'evaluator-planted-1', class: 'docs-only', model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: freezeStamp() }] });
    const key: unknown = { kind: 'catch', builtFrom: 'sources', report: { path: reportPath, jobId: 'evaluator-planted-1', attempt: 1, runId: 'r' }, plants: { 'plant-1': { plantId: 'evaluator-P0' } }, items: {}, inputs: {} };
    const keyPath = writeJsonFile('dup-key.json', key);
    appendEntry(chainPath, { path: 'dup-key.json', sha256: hashFile(keyPath), commit: 'c-key' });
    // Two rulings for the same opaque item id: never exactly one.
    const rulings = {
      batch: 'catch',
      runId: 'r',
      kind: 'catchJudge',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r' }, { itemId: 'plant-1', ruling: 'missed', reason: 'r2' }], usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: freezeStamp() }],
    };
    const rulingsPath = writeJsonFile('dup-catch-rulings.json', rulings);
    appendEntry(chainPath, { path: 'dup-catch-rulings.json', sha256: hashFile(rulingsPath), commit: 'c-rulings' });
    const { samplePath, rulingsPath: agreementRulingsPath } = buildAgreement();
    const outPath = join(dir, 'out.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--catch-rulings', rulingsPath,
      '--catch-key', keyPath,
      '--plants', plantsPath,
      '--thresholds', thresholdsPath,
      '--manifest', manifestPath,
      '--chain', chainPath,
      '--root', dir,
      '--agreement-sample', samplePath,
      '--agreement-rulings', agreementRulingsPath,
      '--heldout-ids', '',
      '--out', outPath,
    ]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-P0') && p.includes('2 ruling'))).toBe(true);
  });

  it('refuses and names every planned mapping run position missing from the precision pool', () => {
    // evaluator-control-3's own reader job is absent from the report entirely: the class's
    // precision pool is genuinely short a planned position, not just missing its judge rulings.
    const plantsPath = buildPlants();
    const fullReport = buildReaderReport() as { jobs: Array<{ id: string }> };
    const reportPath = writeJsonFile('missing-run-report.json', { ...fullReport, jobs: fullReport.jobs.filter((j) => j.id !== 'evaluator-control-3') });
    const { rulingsPath: catchRulingsPath, keyPaths: catchKeyPaths } = buildCatchRulingsAndKeys(ALL_PASS_CAUGHT, reportPath);
    const { rulingsPath: adjudicatorRulingsPath, keyPaths: adjudicatorKeyPaths } = buildAdjudicatorRulingsAndKeys({}, reportPath);
    const keptKeys = adjudicatorKeyPaths.filter((p) => !p.includes('evaluator-control-3'));
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
      '--heldout-ids', '',
      '--out', outPath,
    ]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-3'))).toBe(true);
  });

  it('scores an unverified Opus mapping run\'s own three items as three false findings, and never refuses it as missing', () => {
    const { args, outPath, reportPath } = buildGatedArgs({});
    // evaluator-control-1's own reader run (never its adjudicator judge, which stays verified and
    // rules normally) is made unverified, with three catch-field items of its own; the run's model
    // is still Opus, and opus is set from the model alone now, so it stays in the planned pool, and
    // the rerun rule's own fallback (every one of its own catch-field items) counts three false
    // findings, read from the run's final outcome, never from its adjudicator key.
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { jobs: Array<{ id: string; verified: { ok: boolean }; stalls?: unknown[] }> };
    const target = report.jobs.find((j) => j.id === 'evaluator-control-1')!;
    target.verified = { ...target.verified, ok: false };
    target.stalls = [{ text: 's1', blockedBy: null }, { text: 's2', blockedBy: null }, { text: 's3', blockedBy: null }];
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    const code = main(args);
    expect(code).toBe(0);
    const result = readOut(outPath);
    const classes = result.classes as Array<{ classId: string; precision: { falseFindings: number } }>;
    const docsOnly = classes.find((cls) => cls.classId === 'docs-only')!;
    expect(docsOnly.precision.falseFindings).toBe(3);
  });

  it('requires --agreement-rulings in gated mode', () => {
    const { args } = buildGatedArgs({});
    const index = args.indexOf('--agreement-rulings');
    args.splice(index, 2);
    expect(main(args)).toBe(2);
  });

  it('refuses and names a sample item with no ruling from a verified, unstopped agreement job', () => {
    const { args, outPath } = buildGatedArgs({});
    const agreementRulingsIndex = args.indexOf('--agreement-rulings') + 1;
    // An agreement job that rules nothing at all: every sample item is left without a ruling.
    const emptyRulings = { batch: 'agreement', runId: 'r', kind: 'agreement', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [{ id: 'agreement-1', class: 'judge-agreement', model: 'fable', outcome: 'done', rulings: [], usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: freezeStamp() }] };
    const emptyRulingsPath = writeJsonFile('empty-agreement-rulings.json', emptyRulings);
    appendEntry(chainPath, { path: 'empty-agreement-rulings.json', sha256: hashFile(emptyRulingsPath), commit: 'c-empty' });
    args[agreementRulingsIndex] = emptyRulingsPath;
    const code = main(args);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('f1') && p.includes('0 ruling'))).toBe(true);
  });

  it('order-checks every agreement rulings path against the sample, refusing one chained before it', () => {
    // Chain "early-rulings.json" before building the rest of the gated fixture, so its own entry
    // sits earlier in the chain than the agreement sample's (buildGatedArgs chains the sample only
    // once buildAgreement runs, later than this).
    const earlyRulingsPath = writeJsonFile('early-rulings.json', { batch: 'early', runId: 'r', kind: 'agreement', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [] });
    appendEntry(chainPath, { path: 'early-rulings.json', sha256: hashFile(earlyRulingsPath), commit: 'c-early' });
    const { args, outPath } = buildGatedArgs({});
    args.push('--agreement-rulings', earlyRulingsPath);
    const code = main(args);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('early-rulings.json'))).toBe(true);
  });

  it('refuses and names a gated input path with no chain entry at all', () => {
    const { args, outPath } = buildGatedArgs({});
    const plantsIndex = args.indexOf('--plants') + 1;
    const strayPlantsPath = writeJsonFile('unchained-plants.json', []);
    // unchained-plants.json is deliberately never entered into the chain.
    args[plantsIndex] = strayPlantsPath;
    const code = main(args);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('unchained-plants.json') && p.includes('no chain entry'))).toBe(true);
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
    // A minimal but complete plant record, sample, and rulings, each chained, so this run clears
    // every earlier check (stamps, completeness, chain coverage) and reaches the seed check.
    const plantsPath = writeJsonFile('bad-seed-plants.json', []);
    appendEntry(badChainPath, { path: 'bad-seed-plants.json', sha256: hashFile(plantsPath), commit: 'c-plants' });
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
    const samplePath = writeJsonFile('bad-seed-sample.json', { orderingLabel: 'docs-reset-1b-agreement', findings: [], catchCalls: [], notes: [] });
    appendEntry(badChainPath, { path: 'bad-seed-sample.json', sha256: hashFile(samplePath), commit: 'c-sample' });
    const rulingsReport = { batch: 'agreement', runId: 'r', kind: 'agreement', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: [] };
    const rulingsPath = writeJsonFile('bad-seed-rulings.json', rulingsReport);
    appendEntry(badChainPath, { path: 'bad-seed-rulings.json', sha256: hashFile(rulingsPath), commit: 'c-rulings' });
    const outPath = join(dir, 'bad-seed-out.json');
    const code = main([
      'gated',
      '--report', reportPath,
      '--plants', plantsPath,
      '--thresholds', thresholdsPath,
      '--manifest', badManifestPath,
      '--chain', badChainPath,
      '--root', dir,
      '--agreement-sample', samplePath,
      '--agreement-rulings', rulingsPath,
      '--heldout-ids', '',
      '--out', outPath,
    ]);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('seed'))).toBe(true);
  });

  it('marks every class advisory and gives the achieved count at 34 plants (no pooled threshold exists)', () => {
    const thirtyFour = writeJsonFile('thresholds-34.json', recomputeThresholds({ evaluator: 6, operator: 6, designer: 6, extender: 6, 'core-developer': 5, scripter: 5 }));
    const chain34 = join(dir, 'chain-34.jsonl');
    appendEntry(chain34, { path: 'manifest.json', sha256: manifestHash, commit: 'c0' });
    appendEntry(chain34, { path: 'thresholds-34.json', sha256: hashFile(thirtyFour), commit: 'c1' });
    const caughtByJob34: Record<string, number> = { evaluator: 6, operator: 6, designer: 6, extender: 6, 'core-developer': 5, scripter: 5 };
    const jobPlantCount34: Record<string, number> = { evaluator: 6, operator: 6, designer: 6, extender: 6, 'core-developer': 5, scripter: 5 };
    // The plant record is chained before any planted or heldout job's own freeze stamp is minted,
    // the same ordering buildPlants() follows for the main fixture.
    const plantsPath = writeJsonFile('plants-34.json', JOBS.flatMap((job) => Array.from({ length: jobPlantCount34[job] }, (_, i) => ({ id: `${job}-P${i}`, job, classId: JOB_CLASS[job], type: 'false-behavior', semantic: true }))));
    appendEntry(chain34, { path: 'plants-34.json', sha256: hashFile(plantsPath), commit: 'c-plants' });
    const chainHead34 = hashFile(chain34);
    const stamp34 = { tag: manifestTag, manifestHash, chainHead: chainHead34 };
    const reportPath = writeJsonFile('report-34.json', (() => {
      const jobs: unknown[] = [];
      for (const job of JOBS) for (let n = 1; n <= 3; n += 1) {
        jobs.push({ id: `${job}-planted-${n}`, class: JOB_CLASS[job], model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: stamp34 });
        jobs.push({ id: `${job}-control-${n}`, class: JOB_CLASS[job], model: 'claude-opus-5-5', outcome: 'done', verified: VERIFIED, freeze: stamp34 });
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
        judgeJobs.push({ id: jobId, class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings, usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: stamp34 });
        const plants: Record<string, { plantId: string }> = {};
        plantIds.forEach((plantId, i) => (plants[`plant-${i + 1}`] = { plantId }));
        const keyPath = writeJsonFile(`${jobId}-34-catch-key.json`, { kind: 'catch', builtFrom: 'sources', report: { path: reportPath, jobId, attempt: 1, runId: 'r' }, plants, items: {}, inputs: {} });
        appendEntry(chain34, { path: `${jobId}-34-catch-key.json`, sha256: hashFile(keyPath), commit: 'c-key' });
        keyPaths.push(keyPath);
      }
    }
    const catchRulingsPath = writeJsonFile('catch-rulings-34.json', { batch: 'gated-catch', runId: 'r', kind: 'catchJudge', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: judgeJobs });
    appendEntry(chain34, { path: 'catch-rulings-34.json', sha256: hashFile(catchRulingsPath), commit: 'c-catch-rulings' });

    const adjudicatorJobs: unknown[] = [];
    const adjudicatorKeyPaths: string[] = [];
    for (const job of JOBS) {
      for (let n = 1; n <= 3; n += 1) {
        const jobId = `${job}-control-${n}`;
        adjudicatorJobs.push({ id: jobId, class: 'judge-adjudicator', model: 'claude-opus-5-5', outcome: 'done', rulings: [], usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: stamp34 });
        const keyPath = writeJsonFile(`${jobId}-34-adjudicator-key.json`, { kind: 'adjudicator', builtFrom: 'sources', report: { path: reportPath, jobId, attempt: 1, runId: 'r' }, items: {}, excluded: [], treeCommit: 'c', treeAbsent: [], inputs: {} });
        appendEntry(chain34, { path: `${jobId}-34-adjudicator-key.json`, sha256: hashFile(keyPath), commit: 'c-key' });
        adjudicatorKeyPaths.push(keyPath);
      }
    }
    const adjudicatorRulingsPath = writeJsonFile('adjudicator-rulings-34.json', { batch: 'gated-adjudicator', runId: 'r', kind: 'adjudicator', stopReason: 'complete', budgetTokens: 0, usage: USAGE, verified: true, jobs: adjudicatorJobs });
    appendEntry(chain34, { path: 'adjudicator-rulings-34.json', sha256: hashFile(adjudicatorRulingsPath), commit: 'c-adjudicator-rulings' });

    const findings = [
      { itemId: 'f1', runId: 'evaluator-control-1', jobId: 'evaluator', primaryLabel: 'real' },
      { itemId: 'f2', runId: 'evaluator-control-1', jobId: 'evaluator', primaryLabel: 'false' },
      { itemId: 'f3', runId: 'evaluator-control-1', jobId: 'evaluator', primaryLabel: 'harness' },
    ];
    const catchCalls = [
      { itemId: 'c1', runId: 'evaluator-planted-1', plantId: 'evaluator-P0', primaryLabel: 'caught' },
      { itemId: 'c2', runId: 'evaluator-planted-1', plantId: 'evaluator-P1', primaryLabel: 'missed' },
    ];
    const samplePath = writeJsonFile('agreement-sample-34.json', { orderingLabel: 'docs-reset-1b-agreement', findings, catchCalls, notes: [] });
    appendEntry(chain34, { path: 'agreement-sample-34.json', sha256: hashFile(samplePath), commit: 'c-sample' });
    const agreementRulings = {
      batch: 'agreement',
      runId: 'r',
      kind: 'agreement',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'agreement-1', class: 'judge-agreement', model: 'fable', outcome: 'done', rulings: [...findings, ...catchCalls].map((item) => ({ itemId: item.itemId, ruling: item.primaryLabel, reason: 'r' })), usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: stamp34 }],
    };
    const agreementRulingsPath = writeJsonFile('agreement-rulings-34.json', agreementRulings);
    appendEntry(chain34, { path: 'agreement-rulings-34.json', sha256: hashFile(agreementRulingsPath), commit: 'c-agreement-rulings' });

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
      '--heldout-ids', '',
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

  it('gives a held-out run the same empty dependsOn as a mapping run, so a chain head from before the plant record still scores', () => {
    // A held-out run lives inside the gated mapping batch, whose chain head predates the plant
    // record, the same as a mapping (control) run's own chain head here; neither depends on it.
    const chainHeadBeforePlants = chainHeadAfterThresholds;
    const { args, outPath, reportPath } = buildGatedArgs({});

    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { jobs: Array<{ id: string; freeze: { chainHead: string } }> };
    const mappingJob = report.jobs.find((j) => j.id === 'evaluator-control-1')!;
    mappingJob.freeze.chainHead = chainHeadBeforePlants;
    report.jobs.push({
      id: 'scripter-heldout-1',
      class: 'repository',
      model: 'claude-opus-5-5',
      outcome: 'done',
      verified: VERIFIED,
      freeze: { tag: manifestTag, manifestHash, chainHead: chainHeadBeforePlants },
    } as unknown as { id: string; freeze: { chainHead: string } });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    const heldoutRulingsPath = writeJsonFile('heldout-catch-rulings.json', {
      batch: 'gated-catch',
      runId: 'r',
      kind: 'catchJudge',
      stopReason: 'complete',
      budgetTokens: 0,
      usage: USAGE,
      verified: true,
      jobs: [{ id: 'scripter-heldout-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done', rulings: [{ itemId: 'plant-1', ruling: 'caught', reason: 'r' }], usage: USAGE, verified: { ok: true, init: true, canaries: true, problems: [] }, freeze: freezeStamp() }],
    });
    appendEntry(chainPath, { path: 'heldout-catch-rulings.json', sha256: hashFile(heldoutRulingsPath), commit: 'c-heldout-catch-rulings' });
    const heldoutKeyPath = writeJsonFile('heldout-catch-key.json', {
      kind: 'catch',
      builtFrom: 'sources',
      report: { path: reportPath, jobId: 'scripter-heldout-1', attempt: 1, runId: 'r' },
      plants: { 'plant-1': { plantId: 'HELD-1' } },
      items: {},
      inputs: {},
    });
    appendEntry(chainPath, { path: 'heldout-catch-key.json', sha256: hashFile(heldoutKeyPath), commit: 'c-heldout-catch-key' });

    args.push('--catch-rulings', heldoutRulingsPath, '--catch-key', heldoutKeyPath);
    args[args.indexOf('--heldout-ids') + 1] = 'HELD-1';

    const code = main(args);
    const result = readOut(outPath);
    expect(code).toBe(0);
    expect(result.ok).toBe(true);
    expect(result.heldOut).toEqual([{ id: 'HELD-1', caughtCount: 1, found: false }]);
  });

  it('still refuses a planted job whose own chain head predates the plant record', () => {
    const chainHeadBeforePlants = chainHeadAfterThresholds;
    const { args, outPath, reportPath } = buildGatedArgs({});

    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { jobs: Array<{ id: string; freeze: { chainHead: string } }> };
    const plantedJob = report.jobs.find((j) => j.id === 'evaluator-planted-1')!;
    plantedJob.freeze.chainHead = chainHeadBeforePlants;
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    const code = main(args);
    expect(code).toBe(1);
    const problems = readOut(outPath).problems as string[];
    expect(problems.some((p) => p.includes('evaluator-planted-1') && p.includes('plants.json') && p.includes('postdates'))).toBe(true);
  });
});
