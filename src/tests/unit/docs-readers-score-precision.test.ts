import { describe, it, expect } from 'vitest';
import { findingCountsForRun, missingPlannedRuns, plannedPoolSize, precisionByClass, scoreClassPrecision } from '../../../scripts/docs-readers/lib/score-precision.js';
import type { PrecisionItem, PrecisionRunRecord } from '../../../scripts/docs-readers/lib/score-types.js';

const RUN = (runId: string, classId: PrecisionRunRecord['classId'], overrides: Partial<PrecisionRunRecord> = {}): PrecisionRunRecord => ({
  runId,
  job: 'evaluator',
  classId,
  verified: true,
  opus: true,
  itemCount: 0,
  ...overrides,
});

const FINDING = (itemId: string, subjectGroupId: string, ruling: 'real' | 'false' | 'harness'): PrecisionItem => ({
  itemId,
  harnessFiltered: false,
  adjudication: { class: 'finding', subjectGroupId, ruling },
});

describe('findingCountsForRun', () => {
  it('counts every catch-field item as a false finding when the run is unverified, per the rerun rule', () => {
    const run = RUN('r1', 'docs-only', { verified: false, itemCount: 3 });
    expect(findingCountsForRun(run)).toEqual({ runId: 'r1', falseFindings: 3, realFindings: 0, totalItems: 3 });
  });

  it('counts one false finding per subject group, not per item: two items sharing a subject count once', () => {
    const run = RUN('r1', 'docs-only', {
      items: [FINDING('i1', 'subject-a', 'false'), FINDING('i2', 'subject-a', 'false'), FINDING('i3', 'subject-b', 'real')],
    });
    expect(findingCountsForRun(run)).toEqual({ runId: 'r1', falseFindings: 1, realFindings: 1, totalItems: 3 });
  });

  it('excludes a harness-filtered item and a harness-ruled finding from both counts', () => {
    const run = RUN('r1', 'docs-only', {
      items: [{ itemId: 'i1', harnessFiltered: true }, FINDING('i2', 'subject-b', 'harness'), { itemId: 'i3', harnessFiltered: false, adjudication: { class: 'interpretation' } }],
    });
    expect(findingCountsForRun(run)).toEqual({ runId: 'r1', falseFindings: 0, realFindings: 0, totalItems: 3 });
  });

  it('reports zero findings for a run with no catch-field items, never a divide by zero', () => {
    expect(findingCountsForRun(RUN('r1', 'docs-only', { items: [] }))).toEqual({ runId: 'r1', falseFindings: 0, realFindings: 0, totalItems: 0 });
  });
});

describe('plannedPoolSize', () => {
  it('is three runs per planned job', () => {
    expect(plannedPoolSize(1)).toBe(3);
    expect(plannedPoolSize(2)).toBe(6);
  });
});

describe('scoreClassPrecision', () => {
  it('passes a class with zero false findings, reported as exactly zero', () => {
    const runs = [RUN('r1', 'docs-only', { items: [] }), RUN('r2', 'docs-only', { items: [] }), RUN('r3', 'docs-only', { items: [] })];
    const result = scoreClassPrecision('docs-only', runs, 1);
    expect(result.falseFindings).toBe(0);
    expect(result.limit).toBe(3);
    expect(result.pass).toBe(true);
    expect(result.share).toBeNull();
  });

  it('sets the limit to the class\'s planned pool size, not the count of runs a caller happened to supply', () => {
    const oneRunOnly = [RUN('r1', 'docs-only')];
    expect(scoreClassPrecision('docs-only', oneRunOnly, 1).limit).toBe(3);
    const twoJobFull = Array.from({ length: 6 }, (_, i) => RUN(`r${i}`, 'docs-and-site'));
    expect(scoreClassPrecision('docs-and-site', twoJobFull, 2).limit).toBe(6);
  });

  it('fails a class whose summed subject-group false findings exceed its planned pool size', () => {
    const runs = [
      RUN('r1', 'docs-only', { items: [FINDING('i1', 's1', 'false'), FINDING('i2', 's2', 'false')] }),
      RUN('r2', 'docs-only', { items: [FINDING('i3', 's3', 'false'), FINDING('i4', 's4', 'false')] }),
      RUN('r3', 'docs-only', { items: [] }),
    ];
    const result = scoreClassPrecision('docs-only', runs, 1);
    expect(result.falseFindings).toBe(4);
    expect(result.limit).toBe(3);
    expect(result.pass).toBe(false);
  });

  it('counts every item in an unverified mapping run\'s catch fields as a false finding: three items, three false findings', () => {
    const runs = [RUN('r1', 'docs-only', { verified: false, itemCount: 3 })];
    const result = scoreClassPrecision('docs-only', runs, 1);
    expect(result.falseFindings).toBe(3);
  });

  it('never counts a run from another class', () => {
    const runs = [RUN('r1', 'docs-only', { items: [FINDING('i1', 's1', 'false')] }), RUN('r2', 'repository')];
    expect(scoreClassPrecision('repository', runs, 2).falseFindings).toBe(0);
  });
});

describe('precisionByClass', () => {
  it('reports every class, including one with an empty pool: zero false findings, limit at its planned size, a pass', () => {
    const result = precisionByClass([RUN('r1', 'docs-only')], { 'docs-only': 1, 'docs-and-binary': 1, 'docs-and-site': 2, repository: 2 });
    expect(result['docs-only'].limit).toBe(3);
    expect(result['repository'].limit).toBe(6);
    expect(result['repository'].falseFindings).toBe(0);
    expect(result['repository'].pass).toBe(true);
  });
});

describe('missingPlannedRuns', () => {
  it('names every job position not present in the run id set', () => {
    const present = new Set(['evaluator-1', 'evaluator-2']);
    expect(missingPlannedRuns(['evaluator'], present)).toEqual(['evaluator-3']);
  });

  it('is empty when every job\'s three positions are present', () => {
    const present = new Set(['evaluator-1', 'evaluator-2', 'evaluator-3']);
    expect(missingPlannedRuns(['evaluator'], present)).toEqual([]);
  });

  it('names positions across every job in the class', () => {
    const present = new Set(['designer-1', 'designer-2', 'designer-3', 'extender-1']);
    expect(missingPlannedRuns(['designer', 'extender'], present)).toEqual(['extender-2', 'extender-3']);
  });
});
