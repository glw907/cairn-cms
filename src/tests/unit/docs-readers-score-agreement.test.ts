import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  applyCatchReplacements,
  applyPrecisionReplacements,
  computeAgreement,
  drawAgreementSample,
  fiveItemTestPasses,
  type CatchCallPoolItem,
  type FindingPoolItem,
  type RuledItem,
} from '../../../scripts/docs-readers/lib/score-agreement.js';
import type { CatchRunRecord, PrecisionRunRecord } from '../../../scripts/docs-readers/lib/score-types.js';

const LABEL = 'docs-reset-1b-agreement';

function finding(itemId: string, primaryLabel: FindingPoolItem['primaryLabel']): FindingPoolItem {
  return { itemId, runId: `run-${itemId}`, jobId: 'evaluator', primaryLabel };
}

function catchCall(itemId: string, primaryLabel: CatchCallPoolItem['primaryLabel']): CatchCallPoolItem {
  return { itemId, runId: `run-${itemId}`, plantId: `plant-${itemId}`, primaryLabel };
}

function sha(itemId: string): string {
  return createHash('sha256').update(LABEL + itemId).digest('hex');
}

describe('drawAgreementSample', () => {
  it('draws the whole pool, in sha256 order, when the pool is at or under the target', () => {
    const pool = [finding('a', 'real'), finding('b', 'false'), finding('c', 'harness')];
    const sample = drawAgreementSample({ orderingLabel: LABEL, findingsPool: pool, catchCallsPool: [], perStratum: 15 });
    expect(sample.findings).toHaveLength(3);
    const ids = sample.findings.map((item) => item.itemId);
    const sortedIds = [...ids].sort((x, y) => (sha(x) < sha(y) ? -1 : 1));
    expect(ids).toEqual(sortedIds);
    expect(sample.notes.some((note) => note.includes('only 3 item'))).toBe(true);
  });

  it('balances a stratum by primary ruling, splitting an odd remainder across categories', () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => catchCall(`caught-${i}`, 'caught')),
      ...Array.from({ length: 10 }, (_, i) => catchCall(`missed-${i}`, 'missed')),
    ];
    const sample = drawAgreementSample({ orderingLabel: LABEL, findingsPool: [], catchCallsPool: pool, perStratum: 15 });
    const caught = sample.catchCalls.filter((item) => item.primaryLabel === 'caught').length;
    const missed = sample.catchCalls.filter((item) => item.primaryLabel === 'missed').length;
    expect(sample.catchCalls).toHaveLength(15);
    // 15 / 2 categories: base 7, remainder 1 goes to the first category in sorted order ("caught").
    expect(caught).toBe(8);
    expect(missed).toBe(7);
  });

  it('draws a category short of its target in full, notes it, and fills the shortfall from the leftover pool', () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => finding(`real-${i}`, 'real')),
      ...Array.from({ length: 10 }, (_, i) => finding(`false-${i}`, 'false')),
      ...Array.from({ length: 2 }, (_, i) => finding(`harness-${i}`, 'harness')),
    ];
    const sample = drawAgreementSample({ orderingLabel: LABEL, findingsPool: pool, catchCallsPool: [], perStratum: 15 });
    expect(sample.findings).toHaveLength(15);
    expect(sample.findings.filter((item) => item.primaryLabel === 'harness')).toHaveLength(2);
    expect(sample.notes.some((note) => note.includes('"harness"') && note.includes('too small to balance'))).toBe(true);
  });

  it('is deterministic across repeated draws of the same pool', () => {
    const pool = Array.from({ length: 20 }, (_, i) => finding(`f${i}`, i % 3 === 0 ? 'real' : i % 3 === 1 ? 'false' : 'harness'));
    const first = drawAgreementSample({ orderingLabel: LABEL, findingsPool: pool, catchCallsPool: [] });
    const second = drawAgreementSample({ orderingLabel: LABEL, findingsPool: pool, catchCallsPool: [] });
    expect(first.findings.map((item) => item.itemId)).toEqual(second.findings.map((item) => item.itemId));
  });
});

describe('fiveItemTestPasses', () => {
  it('passes when both raters carry at least five items outside their own largest category', () => {
    const primary = ['a', 'a', 'a', 'a', 'a', 'b', 'b', 'b', 'b', 'b', 'c', 'c', 'c', 'c', 'c'];
    const fable = [...primary];
    expect(fiveItemTestPasses(primary, fable)).toBe(true);
  });

  it('fails when a rater\'s labels sit mostly in one category', () => {
    const primary = ['a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'b', 'c'];
    const fable = ['a', 'a', 'a', 'a', 'a', 'b', 'b', 'b', 'b', 'b', 'c', 'c', 'c', 'c', 'c'];
    expect(fiveItemTestPasses(primary, fable)).toBe(false);
  });
});

function evenlySplitItems(labels: readonly string[], agreeCount: number, disagreeLabel: string): RuledItem[] {
  return labels.map((label, i) => ({ itemId: `i${i}`, primaryLabel: label, fableLabel: i < agreeCount ? label : disagreeLabel }));
}

describe('computeAgreement', () => {
  it('uses pooled kappa when both strata pass the five-item test, and passes at high agreement', () => {
    const balanced = ['real', 'real', 'real', 'real', 'real', 'false', 'false', 'false', 'false', 'false', 'harness', 'harness', 'harness', 'harness', 'harness'];
    const findings = evenlySplitItems(balanced, 14, 'false');
    const catchLabels = ['caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed'];
    const catchCalls = evenlySplitItems(catchLabels, 14, 'missed');
    const result = computeAgreement({ findings, catchCalls });
    expect(result.method).toBe('kappa');
    expect(result.value).toBeGreaterThanOrEqual(0.6);
    expect(result.pass).toBe(true);
  });

  it('falls back to pooled raw agreement when a stratum fails the five-item test', () => {
    const skewed = Array.from({ length: 15 }, (_, i) => (i < 13 ? 'real' : i === 13 ? 'false' : 'harness'));
    const findings = evenlySplitItems(skewed, 15, 'real'); // perfect agreement, still fails the five-item test
    const catchLabels = ['caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed'];
    const catchCalls = evenlySplitItems(catchLabels, 15, 'caught'); // perfect agreement
    const result = computeAgreement({ findings, catchCalls });
    expect(result.findings.fiveItemPass).toBe(false);
    expect(result.method).toBe('rawAgreement');
    expect(result.reason).toBeTruthy();
    expect(result.value).toBe(1);
    expect(result.pass).toBe(true);
  });

  it('fails the raw-agreement fallback below 85 percent', () => {
    const skewed = Array.from({ length: 15 }, (_, i) => (i < 13 ? 'real' : i === 13 ? 'false' : 'harness'));
    // Half the items disagree: well under 85 percent raw agreement.
    const findings = evenlySplitItems(skewed, 8, 'false');
    const catchCalls: RuledItem[] = [];
    const result = computeAgreement({ findings, catchCalls });
    expect(result.method).toBe('rawAgreement');
    expect(result.pass).toBe(false);
  });
});

describe('applyCatchReplacements', () => {
  it('replaces a matched run and plant\'s catch, leaving every other entry untouched', () => {
    const runsByJob: Record<string, CatchRunRecord[]> = {
      evaluator: [{ runId: 'r1', verified: true, catches: { P1: 'caught', P2: 'missed' } }],
    };
    const result = applyCatchReplacements(runsByJob, [{ kind: 'catchCall', runId: 'r1', refId: 'P1', label: 'missed' }]);
    expect(result.evaluator[0].catches).toEqual({ P1: 'missed', P2: 'missed' });
    // The input is never mutated.
    expect(runsByJob.evaluator[0].catches.P1).toBe('caught');
  });
});

describe('applyPrecisionReplacements', () => {
  it('replaces a matched run and item\'s ruling', () => {
    const runs: PrecisionRunRecord[] = [
      { runId: 'r1', job: 'evaluator', classId: 'docs-only', verified: true, itemCount: 1, items: [{ itemId: 'i1', harnessExcluded: false, ruling: 'false' }] },
    ];
    const result = applyPrecisionReplacements(runs, [{ kind: 'finding', runId: 'r1', refId: 'i1', label: 'real' }]);
    expect(result[0].items?.[0]).toEqual({ itemId: 'i1', harnessExcluded: false, ruling: 'real' });
  });

  it('leaves a run with no items untouched', () => {
    const runs: PrecisionRunRecord[] = [{ runId: 'r1', job: 'evaluator', classId: 'docs-only', verified: false, itemCount: 2 }];
    const result = applyPrecisionReplacements(runs, [{ kind: 'finding', runId: 'r1', refId: 'i1', label: 'real' }]);
    expect(result[0]).toEqual(runs[0]);
  });
});
