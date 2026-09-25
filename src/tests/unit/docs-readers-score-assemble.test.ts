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
    usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 },
    verified: verifiedBlock(),
    ...overrides,
  };
}

function batchReport(jobs: JobReport[]): BatchReport {
  return { batch: 'validation', runId: 'r', stopReason: 'complete', budgetTokens: 0, usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 }, jobs, verified: true };
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
  it('reads the top-level fields when the job carries no attempts array', () => {
    const j = job({ outcome: 'done' });
    expect(finalOutcome(j).outcome).toBe('done');
  });

  it('reads the attempt marked final when attempts exist', () => {
    const j = job({
      attempts: [
        { cause: 'initial', final: false, transcript: 't1', outcome: 'stalled', stalls: [], assumed: [], pagesRead: [], quotes: [], steps: [], diverged: [], checks: [], ruleCandidates: [], denials: [], proxyBlocked: [], packageFetches: [], usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 }, verified: verifiedBlock(false) },
        { cause: 'unverified', final: true, transcript: 't2', outcome: 'done', stalls: [], assumed: [], pagesRead: [], quotes: [], steps: [], diverged: [], checks: [], ruleCandidates: [], denials: [], proxyBlocked: [], packageFetches: [], usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 }, verified: verifiedBlock(true) },
      ],
    });
    const outcome = finalOutcome(j);
    expect(outcome.outcome).toBe('done');
    expect(outcome.verified.ok).toBe(true);
  });

  it('throws when attempts exist but none is marked final', () => {
    const j = job({
      attempts: [{ cause: 'initial', final: false, transcript: 't1', outcome: 'done', stalls: [], assumed: [], pagesRead: [], quotes: [], steps: [], diverged: [], checks: [], ruleCandidates: [], denials: [], proxyBlocked: [], packageFetches: [], usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 }, verified: verifiedBlock() }],
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
  it('indexes a job by its own id, resolving its class and final outcome', () => {
    const report = batchReport([job({ id: 'evaluator-planted-1' })]);
    const { byId, problems } = indexReaderJobs([report], VALID_CLASSES);
    expect(problems).toHaveLength(0);
    const indexed = byId.get('evaluator-planted-1');
    expect(indexed?.parsed).toEqual({ job: 'evaluator', role: 'planted', index: 1 });
    expect(indexed?.classId).toBe('docs-only');
  });

  it('notes, never throws for, a job whose id does not follow the convention', () => {
    const report = batchReport([job({ id: 'not-a-job-id' })]);
    const { byId, problems } = indexReaderJobs([report], VALID_CLASSES);
    expect(byId.size).toBe(0);
    expect(problems[0]).toContain('not-a-job-id');
  });

  it('notes a job whose class is not a known scoring class', () => {
    const report = batchReport([job({ id: 'evaluator-planted-1', class: 'judge-catch' })]);
    const { problems } = indexReaderJobs([report], VALID_CLASSES);
    expect(problems[0]).toContain('evaluator-planted-1');
  });

  it('marks a run opus only when isVerifiedOpusRun says so', () => {
    const opusJob = job({ id: 'evaluator-planted-1', model: 'claude-opus-5-5', verified: verifiedBlock(true) });
    const sonnetJob = job({ id: 'evaluator-planted-2', model: 'claude-sonnet-5', verified: verifiedBlock(true) });
    const { byId } = indexReaderJobs([batchReport([opusJob, sonnetJob])], VALID_CLASSES);
    expect(byId.get('evaluator-planted-1')?.opus).toBe(true);
    expect(byId.get('evaluator-planted-2')?.opus).toBe(false);
  });
});

function judgeBatch(jobs: JudgeBatchReport['jobs']): JudgeBatchReport {
  return { batch: 'catch', runId: 'r', kind: 'catchJudge', stopReason: 'complete', budgetTokens: 0, usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 }, jobs, verified: true };
}

describe('joinCatchRulings', () => {
  it('joins a catch-judge job\'s rulings back to real plant ids through the key file', () => {
    const catchJudgeJob = { id: 'evaluator-planted-1', class: 'judge-catch', model: 'claude-opus-5-5', outcome: 'done' as const, rulings: [{ itemId: 'plant-1', ruling: 'caught' as const, reason: 'r' }], usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 }, verified: { ok: true, init: true, canaries: true, problems: [] } };
    const key: CatchPacketKey = {
      kind: 'catch',
      builtFrom: 'sources',
      report: { path: 'r.json', jobId: 'evaluator-planted-1', attempt: 1, runId: 'run-1' },
      plants: { 'plant-1': { plantId: 'PLANT-X1' } },
      items: {},
      inputs: {},
    };
    const { byReaderJobId, problems } = joinCatchRulings([judgeBatch([catchJudgeJob])], [key]);
    expect(problems).toHaveLength(0);
    expect(byReaderJobId.get('evaluator-planted-1')).toEqual({ 'PLANT-X1': 'caught' });
  });

  it('notes and skips a key whose reader job id matches no catch-judge job', () => {
    const key: CatchPacketKey = { kind: 'catch', builtFrom: 'sources', report: { path: 'r.json', jobId: 'missing-job', attempt: 1, runId: 'run-1' }, plants: {}, items: {}, inputs: {} };
    const { byReaderJobId, problems } = joinCatchRulings([judgeBatch([])], [key]);
    expect(byReaderJobId.size).toBe(0);
    expect(problems[0]).toContain('missing-job');
  });
});

describe('buildCatchRunRecords', () => {
  it('builds a catch run record per planted job and groups scripter-heldout separately', () => {
    const { byId: indexed } = indexReaderJobs([batchReport([job({ id: 'evaluator-planted-1' }), job({ id: 'scripter-heldout-1', class: 'repository' })])], VALID_CLASSES);
    const catchesByReaderJobId = new Map<string, Record<string, 'caught' | 'missed'>>([
      ['evaluator-planted-1', { 'PLANT-X1': 'caught' }],
      ['scripter-heldout-1', { 'HELDOUT-X1': 'caught' }],
    ]);
    const { catchRunsByJob, heldOutRuns, notes } = buildCatchRunRecords(indexed, catchesByReaderJobId);
    expect(catchRunsByJob.evaluator).toHaveLength(1);
    expect(catchRunsByJob.evaluator[0].catches).toEqual({ 'PLANT-X1': 'caught' });
    expect(heldOutRuns).toHaveLength(1);
    expect(heldOutRuns[0].catches).toEqual({ 'HELDOUT-X1': 'caught' });
    expect(notes).toHaveLength(0);
  });

  it('notes, never throws, a planted job with no joined catch-judge rulings', () => {
    const { byId: indexed } = indexReaderJobs([batchReport([job({ id: 'evaluator-planted-1' })])], VALID_CLASSES);
    const { catchRunsByJob, notes } = buildCatchRunRecords(indexed, new Map());
    expect(catchRunsByJob.evaluator[0].catches).toEqual({});
    expect(notes[0]).toContain('evaluator-planted-1');
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
      usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 },
      verified: { ok: true, init: true, canaries: true, problems: [] },
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
    const { byReaderJobId, problems } = joinAdjudications([{ ...judgeBatch([adjudicatorJob]), kind: 'adjudicator' }], [key]);
    expect(problems).toHaveLength(0);
    const items = byReaderJobId.get('evaluator-control-1');
    expect(items).toEqual([
      { itemId: 'item-1', harnessFiltered: false, adjudication: { class: 'finding', subjectGroupId: 'subject-a', ruling: 'false' } },
      { itemId: 'item-2', harnessFiltered: true },
    ]);
  });
});

describe('buildPrecisionRunRecords', () => {
  it('builds a precision run only for a control-role job', () => {
    const { byId: indexed } = indexReaderJobs([batchReport([job({ id: 'evaluator-control-1' }), job({ id: 'evaluator-planted-1' })])], VALID_CLASSES);
    const itemsByReaderJobId = new Map([['evaluator-control-1', [{ itemId: 'i1', harnessFiltered: false, adjudication: { class: 'finding' as const, subjectGroupId: 's', ruling: 'false' as const } }]]]);
    const { runs, notes } = buildPrecisionRunRecords(indexed, itemsByReaderJobId);
    expect(runs).toHaveLength(1);
    expect(runs[0].runId).toBe('evaluator-control-1');
    expect(runs[0].itemCount).toBe(1);
    expect(notes).toHaveLength(0);
  });
});
