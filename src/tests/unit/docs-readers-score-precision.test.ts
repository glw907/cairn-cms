import { describe, it, expect } from 'vitest';
import { findingCountsForRun, precisionByClass, scoreClassPrecision } from '../../../scripts/docs-readers/lib/score-precision.js';
import type { PrecisionRunRecord } from '../../../scripts/docs-readers/lib/score-types.js';

const RUN = (runId: string, classId: PrecisionRunRecord['classId'], overrides: Partial<PrecisionRunRecord> = {}): PrecisionRunRecord => ({
  runId,
  job: 'evaluator',
  classId,
  verified: true,
  itemCount: 0,
  ...overrides,
});

describe('findingCountsForRun', () => {
  it('counts every catch-field item as a false finding when the run is unverified, per the rerun rule', () => {
    const run = RUN('r1', 'docs-only', { verified: false, itemCount: 3 });
    expect(findingCountsForRun(run)).toEqual({ runId: 'r1', falseFindings: 3, realFindings: 0, totalItems: 3 });
  });

  it('counts a false-ruled, non-harness-excluded item as a false finding', () => {
    const run = RUN('r1', 'docs-only', {
      items: [
        { itemId: 'i1', harnessExcluded: false, ruling: 'false' },
        { itemId: 'i2', harnessExcluded: false, ruling: 'real' },
        { itemId: 'i3', harnessExcluded: true },
        { itemId: 'i4', harnessExcluded: false, ruling: 'harness' },
      ],
    });
    expect(findingCountsForRun(run)).toEqual({ runId: 'r1', falseFindings: 1, realFindings: 1, totalItems: 4 });
  });

  it('reports zero findings for a run with no catch-field items, never a divide by zero', () => {
    expect(findingCountsForRun(RUN('r1', 'docs-only', { items: [] }))).toEqual({ runId: 'r1', falseFindings: 0, realFindings: 0, totalItems: 0 });
  });
});

describe('scoreClassPrecision', () => {
  it('passes a class with zero false findings, reported as exactly zero', () => {
    const runs = [RUN('r1', 'docs-only', { items: [] }), RUN('r2', 'docs-only', { items: [] }), RUN('r3', 'docs-only', { items: [] })];
    const result = scoreClassPrecision('docs-only', runs);
    expect(result.falseFindings).toBe(0);
    expect(result.limit).toBe(3);
    expect(result.pass).toBe(true);
    expect(result.share).toBeNull();
  });

  it('sets the limit to the pool\'s own run count: 3 for a one-job class, 6 for a two-job class', () => {
    const oneJob = [RUN('r1', 'docs-only'), RUN('r2', 'docs-only'), RUN('r3', 'docs-only')];
    expect(scoreClassPrecision('docs-only', oneJob).limit).toBe(3);
    const twoJob = Array.from({ length: 6 }, (_, i) => RUN(`r${i}`, 'docs-and-site'));
    expect(scoreClassPrecision('docs-and-site', twoJob).limit).toBe(6);
  });

  it('fails a class whose summed false findings exceed its pool size', () => {
    const runs = [
      RUN('r1', 'docs-only', { items: [{ itemId: 'i1', harnessExcluded: false, ruling: 'false' }, { itemId: 'i2', harnessExcluded: false, ruling: 'false' }] }),
      RUN('r2', 'docs-only', { items: [{ itemId: 'i3', harnessExcluded: false, ruling: 'false' }, { itemId: 'i4', harnessExcluded: false, ruling: 'false' }] }),
      RUN('r3', 'docs-only', { items: [] }),
    ];
    const result = scoreClassPrecision('docs-only', runs);
    expect(result.falseFindings).toBe(4);
    expect(result.limit).toBe(3);
    expect(result.pass).toBe(false);
  });

  it('counts every item in an unverified mapping run\'s catch fields as a false finding: three items, three false findings', () => {
    const runs = [RUN('r1', 'docs-only', { verified: false, itemCount: 3 })];
    const result = scoreClassPrecision('docs-only', runs);
    expect(result.falseFindings).toBe(3);
  });

  it('never counts a run from another class', () => {
    const runs = [RUN('r1', 'docs-only', { items: [{ itemId: 'i1', harnessExcluded: false, ruling: 'false' }] }), RUN('r2', 'repository')];
    expect(scoreClassPrecision('repository', runs).falseFindings).toBe(0);
  });
});

describe('precisionByClass', () => {
  it('reports every class, including one with an empty pool: zero false findings, limit zero, a pass', () => {
    const result = precisionByClass([RUN('r1', 'docs-only')]);
    expect(result['docs-only'].limit).toBe(1);
    expect(result['repository'].limit).toBe(0);
    expect(result['repository'].falseFindings).toBe(0);
    expect(result['repository'].pass).toBe(true);
  });
});
