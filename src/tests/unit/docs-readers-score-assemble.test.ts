import { describe, it, expect } from 'vitest';
import {
  buildCatchRunRecords,
  buildPrecisionRunRecords,
  classForJob,
  finalOutcome,
  indexReaderJobs,
  joinAdjudications,
  joinCatchRulings,
  parseReaderJobId,
} from '../../../scripts/docs-readers/lib/score-assemble.js';
import type { BatchReport, JobReport } from '../../../scripts/docs-readers/lib/types.js';
import type { JudgeBatchReport } from '../../../scripts/docs-readers/lib/runner.js';
import type { CatchPacketKey, AdjudicatorPacketKey } from '../../../scripts/docs-readers/judge-packets.js';

const VALID_CLASSES = new Set(['docs-only', 'docs-and-binary', 'docs-and-site', 'repository']);
const USAGE = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 };

function verifiedBlock(ok = true): JobReport['verified'] {
  return { ok, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] };
}

function job(overrides: Partial<JobReport> = {}): JobReport {
  return {
    id: 'evaluator-planted-1',
    class: 'docs-only',
    model: 'claude-opus-5-5',
    outcome: 'done',
    stalls: [],
    assumed: [],
    pagesRead: [],
    quotes: [],
    steps: [],
    diverged: [],
    checks: [],
    ruleCandidates: [],
    denials: [],
    proxyBlocked: [],
    packageFetches: [],
    usage: USAGE,
    verified: verifiedBlock(),
    ...overrides,
  };
}

function batchReport(jobs: JobReport[], overrides: Partial<BatchReport> = {}): BatchReport {
  return { batch: 'validation', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: USAGE, jobs, verified: true, ...overrides };
}

/** Wrap a batch report with the file path `indexReaderJobs` now requires. */
function at(path: string, report: BatchReport): { path: string; report: BatchReport } {
  return { path, report };
}

describe('parseReaderJobId', () => {
  it('parses a job id into its base job, role, and index', () => {
    expect(parseReaderJobId('evaluator-planted-1')).toEqual({ job: 'evaluator', role: 'planted', index: 1 });
    expect(parseReaderJobId('core-developer-control-3')).toEqual({ job: 'core-developer', role: 'control', index: 3 });
    expect(parseReaderJobId('scripter-heldout-2')).toEqual({ job: 'scripter', role: 'heldout', index: 2 });
  });

  it('is null for an id that does not follow the convention', () => {
    expect(parseReaderJobId('not-a-job-id')).toBeNull();
    expect(parseReaderJobId('evaluator-planted')).toBeNull();
  });
});

describe('finalOutcome', () => {
  it('reads the top-level fields at attempt 1 when the job carries no attempts array', () => {
    const j = job({ outcome: 'done' });
    const result = finalOutcome(j);
    expect(result.outcome.outcome).toBe('done');
    expect(result.attempt).toBe(1);
  });

  it('reads the attempt marked final, and its own 1-based position, when attempts exist', () => {
    const j = job({
      attempts: [
        { cause: 'initial', final: false, transcript: 't1', outcome: 'stalled', stalls: [], assumed: [], pagesRead: [], quotes: [], steps: [], diverged: [], checks: [], ruleCandidates: [], denials: [], proxyBlocked: [], packageFetches: [], usage: USAGE, verified: verifiedBlock(false) },
        { cause: 'unverified', final: true, transcript: 't2', outcome: 'done', stalls: [], assumed: [], pagesRead: [], quotes: [], steps: [], diverged: [], checks: [], ruleCandidates: [], denials: [], proxyBlocked: [], packageFetches: [], usage: USAGE, verified: verifiedBlock(true) },
      ],
    });
    const result = finalOutcome(j);
    expect(result.outcome.outcome).toBe('done');
    expect(result.outcome.verified.ok).toBe(true);
    expect(result.attempt).toBe(2);
  });

  it('throws when attempts exist but none is marked final', () => {
    const j = job({
      attempts: [{ cause: 'initial', final: false, transcript: 't1', outcome: 'done', stalls: [], assumed: [], pagesRead: [], quotes: [], steps: [], diverged: [], checks: [], ruleCandidates: [], denials: [], proxyBlocked: [], packageFetches: [], usage: USAGE, verified: verifiedBlock() }],
    });
    expect(() => finalOutcome(j)).toThrow(/no attempt marked final/);
  });
});

describe('classForJob', () => {
  it('resolves a known scoring class', () => {
    expect(classForJob('docs-only', VALID_CLASSES)).toBe('docs-only');
  });

  it('throws for a judge class or an unknown name', () => {
    expect(() => classForJob('judge-catch', VALID_CLASSES)).toThrow(/judge-catch/);
    expect(() => classForJob('nonsense', VALID_CLASSES)).toThrow(/nonsense/);
  });
});

describe('indexReaderJobs', () => {
  it('indexes a job by its own id, resolving its class, final outcome, and own source', () => {
    const report = batchReport([job({ id: 'evaluator-planted-1' })]);
    const { byId, problems } = indexReaderJobs([at('r.json', report)], VALID_CLASSES);
    expect(problems).toHaveLength(0);
    const indexed = byId.get('evaluator-planted-1');
    expect(indexed?.parsed).toEqual({ job: 'evaluator', role: 'planted', index: 1 });
    expect(indexed?.classId).toBe('docs-only');
    expect(indexed?.batchRunId).toBe('r');
    expect(indexed?.finalAttempt).toBe(1);
  });

  it('is a problem, never silently dropped, for a job whose id does not follow the convention', () => {
    const report = batchReport([job({ id: 'not-a-job-id' })]);
    const { byId, problems } = indexReaderJobs([at('r.json', report)], VALID_CLASSES);
    expect(byId.size).toBe(0);
    expect(problems[0]).toContain('not-a-job-id');
  });

  it('is a problem for a job whose class is not a known scoring class', () => {
    const report = batchReport([job({ id: 'evaluator-planted-1', class: 'judge-catch' })]);
    const { problems } = indexReaderJobs([at('r.json', report)], VALID_CLASSES);
    expect(problems[0]).toContain('evaluator-planted-1');
  });

  it('sets opus from the model alone, independent of verified', () => {
    const opusVerified = job({ id: 'evaluator-planted-1', model: 'claude-opus-5-5', verified: verifiedBlock(true) });
    const sonnetVerified = job({ id: 'evaluator-planted-2', model: 'claude-sonnet-5', verified: verifiedBlock(true) });
    const opusUnverified = job({ id: 'evaluator-planted-3', model: 'claude-opus-5-5', verified: verifiedBlock(false) });
    const { byId } = indexReaderJobs([at('r.json', batchReport([opusVerified, sonnetVerified, opusUnverified]))], VALID_CLASSES);
    expect(byId.get('evaluator-planted-1')?.opus).toBe(true);
    expect(byId.get('evaluator-planted-2')?.opus).toBe(false);
    // An unverified Opus run is still opus: true. Only its own verified flag, kept separately,
    // says the run itself did not verify.
    expect(byId.get('evaluator-planted-3')?.opus).toBe(true);
    expect(byId.get('evaluator-planted-3')?.outcome.verified.ok).toBe(false);
  });

  it('resolves a job id shared by two reports through the judge key that names one of them, in either report order', () => {
    const reportA = batchReport([job({ id: 'operator-control-1' })], { runId: 'run-a' });
    const reportB = batchReport([job({ id: 'operator-control-1' })], { runId: 'run-b' });
    const keyRefs = [{ jobId: 'operator-control-1', reportPath: 'b.json', runId: 'run-b' }];

    const forward = indexReaderJobs([at('a.json', reportA), at('b.json', reportB)], VALID_CLASSES, keyRefs);
    const backward = indexReaderJobs([at('b.json', reportB), at('a.json', reportA)], VALID_CLASSES, keyRefs);

    expect(forward.problems).toHaveLength(0);
    expect(backward.problems).toHaveLength(0);
    expect(forward.byId.get('operator-control-1')?.batchRunId).toBe('run-b');
    expect(backward.byId.get('operator-control-1')?.batchRunId).toBe('run-b');
    expect(forward.notes[0]).toContain('superseded');
    expect(forward.notes[0]).toContain('run-a');
    expect(backward.notes[0]).toContain('run-a');
  });

  it('refuses a duplicate job id with no judge key to resolve it, naming the id', () => {
    const reportA = batchReport([job({ id: 'operator-control-1' })], { runId: 'run-a' });
    const reportB = batchReport([job({ id: 'operator-control-1' })], { runId: 'run-b' });
    const { byId, problems } = indexReaderJobs([at('a.json', reportA), at('b.json', reportB)], VALID_CLASSES);
    expect(byId.has('operator-control-1')).toBe(false);
    expect(problems[0]).toContain('operator-control-1');
  });

  it('refuses a duplicate job id whose keys name neither candidate', () => {
    const reportA = batchReport([job({ id: 'operator-control-1' })], { runId: 'run-a' });
    const reportB = batchReport([job({ id: 'operator-control-1' })], { runId: 'run-b' });
    const keyRefs = [{ jobId: 'operator-control-1', reportPath: 'c.json', runId: 'run-c' }];
    const { byId, problems } = indexReaderJobs([at('a.json', reportA), at('b.json', reportB)], VALID_CLASSES, keyRefs);
    expect(byId.has('operator-control-1')).toBe(false);
    expect(problems[0]).toContain('operator-control-1');
  });
});

function judgeBatch(jobs: JudgeBatchReport['jobs']): JudgeBatchReport {
  return { batch: 'catch', runId: 'r', kind: 'catchJudge', stopReason: 'complete', budgetTokens: 0, usage: USAGE, jobs, verified: true };
}

const CATCH_JUDGE_VERIFIED = { ok: true, init: true, canaries: true, problems: [] };

describe('joinCatchRulings', () => {
  it('joins a catch-judge job\'s rulings back to real plant ids through the key file', () => {
    const catchJudgeJob = { id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done' as const, rulings: [{ itemId: 'plant-1', ruling: 'caught' as const, reason: 'r' }], usage: USAGE, verified: CATCH_JUDGE_VERIFIED };
    const key: CatchPacketKey = {
      kind: 'catch',
      builtFrom: 'sources',
      report: { path: 'r.json', jobId: 'evaluator-planted-1', attempt: 1, runId: 'run-1' },
      plants: { 'plant-1': { plantId: 'PLANT-X1' } },
      items: {},
      inputs: {},
    };
    const readerJob = job({ id: 'evaluator-planted-1' });
    const { byId: indexed } = indexReaderJobs([at('r.json', batchReport([readerJob], { runId: 'run-1' }))], VALID_CLASSES);
    const { byReaderJobId, problems } = joinCatchRulings([judgeBatch([catchJudgeJob])], [key], indexed);
    expect(problems).toHaveLength(0);
    expect(byReaderJobId.get('evaluator-planted-1')).toEqual({ 'PLANT-X1': 'caught' });
  });

  it('is a problem, and skips the key, when the reader job id matches no catch-judge job', () => {
    const key: CatchPacketKey = { kind: 'catch', builtFrom: 'sources', report: { path: 'r.json', jobId: 'missing-job', attempt: 1, runId: 'run-1' }, plants: {}, items: {}, inputs: {} };
    const { byReaderJobId, problems } = joinCatchRulings([judgeBatch([])], [key], new Map());
    expect(byReaderJobId.size).toBe(0);
    expect(problems[0]).toContain('missing-job');
  });

  it('is a problem for an unverified catch-judge job', () => {
    const catchJudgeJob = { id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done' as const, rulings: [], usage: USAGE, verified: { ...CATCH_JUDGE_VERIFIED, ok: false } };
    const key: CatchPacketKey = { kind: 'catch', builtFrom: 'sources', report: { path: 'r.json', jobId: 'evaluator-planted-1', attempt: 1, runId: 'run-1' }, plants: {}, items: {}, inputs: {} };
    const { problems } = joinCatchRulings([judgeBatch([catchJudgeJob])], [key], new Map());
    expect(problems[0]).toContain('unverified');
  });

  it('is a problem for a catch-judge job carrying stoppedBy, checked even when verified is otherwise true', () => {
    const catchJudgeJob = { id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'aborted' as const, rulings: [], usage: USAGE, verified: CATCH_JUDGE_VERIFIED, stoppedBy: 'rateLimit' as const };
    const key: CatchPacketKey = { kind: 'catch', builtFrom: 'sources', report: { path: 'r.json', jobId: 'evaluator-planted-1', attempt: 1, runId: 'run-1' }, plants: {}, items: {}, inputs: {} };
    const { problems } = joinCatchRulings([judgeBatch([catchJudgeJob])], [key], new Map());
    expect(problems[0]).toContain('stoppedBy');
  });

  it('is a problem when a key\'s own report trace does not match the indexed job\'s own source', () => {
    const catchJudgeJob = { id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done' as const, rulings: [], usage: USAGE, verified: CATCH_JUDGE_VERIFIED };
    // The key claims a different runId than the report the reader job actually came from.
    const key: CatchPacketKey = { kind: 'catch', builtFrom: 'sources', report: { path: 'r.json', jobId: 'evaluator-planted-1', attempt: 1, runId: 'wrong-run' }, plants: {}, items: {}, inputs: {} };
    const readerJob = job({ id: 'evaluator-planted-1' });
    const { byId: indexed } = indexReaderJobs([at('r.json', batchReport([readerJob], { runId: 'run-1' }))], VALID_CLASSES);
    const { problems } = joinCatchRulings([judgeBatch([catchJudgeJob])], [key], indexed);
    expect(problems[0]).toContain('evaluator-planted-1');
    expect(problems[0]).toMatch(/wrong-run/);
  });

  it('is a problem for a plant with zero or more than one ruling, never silently missed or merged', () => {
    const catchJudgeJob = {
      id: 'evaluator-planted-1',
      class: 'judge-catch',
      model: 'claude-opus-5-5',
      outcome: 'done' as const,
      rulings: [
        { itemId: 'plant-2', ruling: 'caught' as const, reason: 'r' },
        { itemId: 'plant-2', ruling: 'missed' as const, reason: 'r2' },
      ],
      usage: USAGE,
      verified: CATCH_JUDGE_VERIFIED,
    };
    const key: CatchPacketKey = {
      kind: 'catch',
      builtFrom: 'sources',
      report: { path: 'r.json', jobId: 'evaluator-planted-1', attempt: 1, runId: 'run-1' },
      plants: { 'plant-1': { plantId: 'PLANT-X1' }, 'plant-2': { plantId: 'PLANT-X2' } },
      items: {},
      inputs: {},
    };
    const { byReaderJobId, problems } = joinCatchRulings([judgeBatch([catchJudgeJob])], [key], new Map());
    expect(problems.some((p) => p.includes('PLANT-X1') && p.includes('0 ruling'))).toBe(true);
    expect(problems.some((p) => p.includes('PLANT-X2') && p.includes('2 ruling'))).toBe(true);
    expect(byReaderJobId.get('evaluator-planted-1')).toEqual({});
  });
});

describe('buildCatchRunRecords', () => {
  it('builds a catch run record per planted job and groups scripter-heldout separately', () => {
    const { byId: indexed } = indexReaderJobs([at('r.json', batchReport([job({ id: 'evaluator-planted-1' }), job({ id: 'scripter-heldout-1', class: 'repository' })]))], VALID_CLASSES);
    const catchesByReaderJobId = new Map<string, Record<string, 'caught' | 'missed'>>([
      ['evaluator-planted-1', { 'PLANT-X1': 'caught' }],
      ['scripter-heldout-1', { 'HELDOUT-X1': 'caught' }],
    ]);
    const { catchRunsByJob, heldOutRuns, problems } = buildCatchRunRecords(indexed, catchesByReaderJobId);
    expect(catchRunsByJob.evaluator).toHaveLength(1);
    expect(catchRunsByJob.evaluator[0].catches).toEqual({ 'PLANT-X1': 'caught' });
    expect(heldOutRuns).toHaveLength(1);
    expect(heldOutRuns[0].catches).toEqual({ 'HELDOUT-X1': 'caught' });
    expect(problems).toHaveLength(0);
  });

  it('is a problem, never silently scored as catching nothing, for a planted job with no joined catch-judge rulings', () => {
    const { byId: indexed } = indexReaderJobs([at('r.json', batchReport([job({ id: 'evaluator-planted-1' })]))], VALID_CLASSES);
    const { catchRunsByJob, problems } = buildCatchRunRecords(indexed, new Map());
    expect(catchRunsByJob.evaluator[0].catches).toEqual({});
    expect(problems[0]).toContain('evaluator-planted-1');
  });
});

describe('joinAdjudications', () => {
  it('joins an adjudicator job\'s items, marking a mechanically excluded item harness-filtered', () => {
    const adjudicatorJob = {
      id: 'evaluator-control-1',
      class: 'judge-adjudicator',
      model: 'claude-opus-5-5',
      outcome: 'done' as const,
      rulings: [{ itemId: 'item-1', class: 'finding' as const, subjectGroupId: 'subject-a', ruling: 'false' as const, reason: 'r' }],
      usage: USAGE,
      verified: CATCH_JUDGE_VERIFIED,
    };
    const key: AdjudicatorPacketKey = {
      kind: 'adjudicator',
      builtFrom: 'sources',
      report: { path: 'r.json', jobId: 'evaluator-control-1', attempt: 1, runId: 'run-1' },
      items: { 'item-1': { field: 'stalls', sourceIndex: 0 }, 'item-2': { field: 'assumed', sourceIndex: 0 } },
      excluded: ['item-2'],
      treeCommit: 'c',
      treeAbsent: [],
      inputs: {},
    };
    const readerJob = job({ id: 'evaluator-control-1' });
    const { byId: indexed } = indexReaderJobs([at('r.json', batchReport([readerJob], { runId: 'run-1' }))], VALID_CLASSES);
    const { byReaderJobId, problems } = joinAdjudications([{ ...judgeBatch([adjudicatorJob]), kind: 'adjudicator' }], [key], indexed);
    expect(problems).toHaveLength(0);
    const items = byReaderJobId.get('evaluator-control-1');
    expect(items).toEqual([
      { itemId: 'item-1', harnessFiltered: false, adjudication: { class: 'finding', subjectGroupId: 'subject-a', ruling: 'false' } },
      { itemId: 'item-2', harnessFiltered: true },
    ]);
  });

  it('is a problem for an unverified adjudicator job', () => {
    const adjudicatorJob = { id: 'evaluator-control-1', class: 'judge-adjudicator', model: 'claude-opus-5-5', outcome: 'done' as const, rulings: [], usage: USAGE, verified: { ...CATCH_JUDGE_VERIFIED, ok: false } };
    const key: AdjudicatorPacketKey = { kind: 'adjudicator', builtFrom: 'sources', report: { path: 'r.json', jobId: 'evaluator-control-1', attempt: 1, runId: 'run-1' }, items: {}, excluded: [], treeCommit: 'c', treeAbsent: [], inputs: {} };
    const { problems } = joinAdjudications([judgeBatch([adjudicatorJob])], [key], new Map());
    expect(problems[0]).toContain('unverified');
  });

  it('is a problem for an adjudicator item with zero or more than one ruling', () => {
    const adjudicatorJob = {
      id: 'evaluator-control-1',
      class: 'judge-adjudicator',
      model: 'claude-opus-5-5',
      outcome: 'done' as const,
      rulings: [
        { itemId: 'item-2', class: 'finding' as const, subjectGroupId: 's', ruling: 'false' as const, reason: 'r' },
        { itemId: 'item-2', class: 'finding' as const, subjectGroupId: 's', ruling: 'real' as const, reason: 'r2' },
      ],
      usage: USAGE,
      verified: CATCH_JUDGE_VERIFIED,
    };
    const key: AdjudicatorPacketKey = {
      kind: 'adjudicator',
      builtFrom: 'sources',
      report: { path: 'r.json', jobId: 'evaluator-control-1', attempt: 1, runId: 'run-1' },
      items: { 'item-1': { field: 'stalls', sourceIndex: 0 }, 'item-2': { field: 'assumed', sourceIndex: 0 } },
      excluded: [],
      treeCommit: 'c',
      treeAbsent: [],
      inputs: {},
    };
    const { byReaderJobId, problems } = joinAdjudications([judgeBatch([adjudicatorJob])], [key], new Map());
    expect(problems.some((p) => p.includes('item-1') && p.includes('0 ruling'))).toBe(true);
    expect(problems.some((p) => p.includes('item-2') && p.includes('2 ruling'))).toBe(true);
    expect(byReaderJobId.get('evaluator-control-1')).toEqual([]);
  });
});

describe('buildPrecisionRunRecords', () => {
  it('builds a precision run only for a control-role job', () => {
    const { byId: indexed } = indexReaderJobs([at('r.json', batchReport([job({ id: 'evaluator-control-1' }), job({ id: 'evaluator-planted-1' })]))], VALID_CLASSES);
    const itemsByReaderJobId = new Map([['evaluator-control-1', [{ itemId: 'i1', harnessFiltered: false, adjudication: { class: 'finding' as const, subjectGroupId: 's', ruling: 'false' as const } }]]]);
    const { runs, problems } = buildPrecisionRunRecords(indexed, itemsByReaderJobId);
    expect(runs).toHaveLength(1);
    expect(runs[0].runId).toBe('evaluator-control-1');
    expect(problems).toHaveLength(0);
  });

  it('takes itemCount from the run\'s own final outcome, never from the key\'s item count', () => {
    const readerJob = job({
      id: 'evaluator-control-1',
      stalls: [{ text: 's1', blockedBy: null }],
      assumed: [{ text: 'a1', blockedBy: null }],
      diverged: [{ quote: { path: 'p', line: 1, text: 't', ok: true }, didInstead: 'x', why: 'y', blockedBy: null }],
    });
    const { byId: indexed } = indexReaderJobs([at('r.json', batchReport([readerJob]))], VALID_CLASSES);
    // The key (via itemsByReaderJobId) resolves only one item, far fewer than the run's own three
    // catch-field entries; itemCount must still read three, from the outcome, not one.
    const itemsByReaderJobId = new Map([['evaluator-control-1', [{ itemId: 'i1', harnessFiltered: false, adjudication: { class: 'finding' as const, subjectGroupId: 's', ruling: 'false' as const } }]]]);
    const { runs } = buildPrecisionRunRecords(indexed, itemsByReaderJobId);
    expect(runs[0].itemCount).toBe(3);
  });

  it('is a problem, never silently scored with zero items, for a control job with no joined adjudicator items', () => {
    const { byId: indexed } = indexReaderJobs([at('r.json', batchReport([job({ id: 'evaluator-control-1' })]))], VALID_CLASSES);
    const { problems } = buildPrecisionRunRecords(indexed, new Map());
    expect(problems[0]).toContain('evaluator-control-1');
  });
});
