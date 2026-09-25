import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  applyCatchReplacements,
  applyPrecisionReplacements,
  computeAgreement,
  deriveReplacements,
  drawAgreementSample,
  fiveItemTestPasses,
  type CatchCallPoolItem,
  type FindingPoolItem,
  type RuledItem,
} from '../../../scripts/docs-readers/lib/score-agreement.js';
import type { AgreementSampleFile } from '../../../scripts/docs-readers/lib/score-agreement.js';
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

  it('notes a category absent from the pool by the fixed vocabulary, not just a short one', () => {
    // The pool carries no "harness" item at all; the fixed findings vocabulary still expects one.
    const pool = [...Array.from({ length: 10 }, (_, i) => finding(`real-${i}`, 'real')), ...Array.from({ length: 10 }, (_, i) => finding(`false-${i}`, 'false'))];
    const sample = drawAgreementSample({ orderingLabel: LABEL, findingsPool: pool, catchCallsPool: [], perStratum: 15 });
    expect(sample.findings.filter((item) => item.primaryLabel === 'harness')).toHaveLength(0);
    expect(sample.notes.some((note) => note.includes('"harness"') && note.includes('absent from the pool'))).toBe(true);
    expect(sample.notes.some((note) => note.includes('"harness"') && note.includes('too small to balance'))).toBe(false);
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

  it('matches an exact hand-computed pooled kappa', () => {
    // Findings (15 items, 3 balanced categories of 5): po = 9/15 = 0.6, and since both raters'
    // marginals stay 1/3 each by construction, pe = 3 * (1/3 * 1/3) = 1/3 exactly.
    //   kappa_findings = (3/5 - 1/3) / (1 - 1/3) = (4/15) / (2/3) = 2/5 = 0.4.
    const findingsPrimary = ['real', 'real', 'real', 'real', 'real', 'false', 'false', 'false', 'false', 'false', 'harness', 'harness', 'harness', 'harness', 'harness'];
    const findingsFable = ['real', 'real', 'real', 'false', 'false', 'false', 'false', 'false', 'harness', 'harness', 'harness', 'harness', 'harness', 'real', 'real'];
    const findings: RuledItem[] = findingsPrimary.map((primaryLabel, i) => ({ itemId: `f${i}`, primaryLabel, fableLabel: findingsFable[i] }));

    // Catch calls (15 items, caught 8 / missed 7): po = 12/15 = 0.8, pe = (8/15 * 7/15) * 2 = 112/225.
    //   kappa_catchCalls = (12/15 - 112/225) / (1 - 112/225) = (68/225) / (113/225) = 68/113.
    const catchCallsPrimary = ['caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed'];
    const catchCallsFable = ['caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'caught'];
    const catchCalls: RuledItem[] = catchCallsPrimary.map((primaryLabel, i) => ({ itemId: `c${i}`, primaryLabel, fableLabel: catchCallsFable[i] }));

    const result = computeAgreement({ findings, catchCalls });
    expect(result.findings.kappa).toBeCloseTo(0.4, 6);
    expect(result.catchCalls.kappa).toBeCloseTo(68 / 113, 6);

    // Pooled (equal weight, n = 15 each): po = (0.6 + 0.8) / 2 = 0.7; pe = (1/3 + 112/225) / 2 = 187/450.
    //   kappa = (0.7 - 187/450) / (1 - 187/450) = (128/450) / (263/450) = 128/263.
    expect(result.method).toBe('kappa');
    expect(result.value).toBeCloseTo(128 / 263, 6);
  });

  it('never computes chance agreement over the union of the two label sets, which would inflate kappa', () => {
    // The same distribution as the exact hand-computed case above, reused so its pooled kappa
    // (128/263, about 0.4867) can be checked against the wrong union-chance kappa the spec
    // explicitly bans: pooling every item's own primary and Fable label across a five-category
    // union (real, false, harness, caught, missed) rather than within each stratum's own set.
    const findingsPrimary = ['real', 'real', 'real', 'real', 'real', 'false', 'false', 'false', 'false', 'false', 'harness', 'harness', 'harness', 'harness', 'harness'];
    const findingsFable = ['real', 'real', 'real', 'false', 'false', 'false', 'false', 'false', 'harness', 'harness', 'harness', 'harness', 'harness', 'real', 'real'];
    const findings: RuledItem[] = findingsPrimary.map((primaryLabel, i) => ({ itemId: `f${i}`, primaryLabel, fableLabel: findingsFable[i] }));

    const catchCallsPrimary = ['caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed'];
    const catchCallsFable = ['caught', 'caught', 'caught', 'caught', 'caught', 'caught', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'caught'];
    const catchCalls: RuledItem[] = catchCallsPrimary.map((primaryLabel, i) => ({ itemId: `c${i}`, primaryLabel, fableLabel: catchCallsFable[i] }));

    // The banned union computation, worked by hand for comparison only (never called from the
    // library): union marginals over all 30 items across five categories give pe = 187/900, so
    // kappa_union = (0.7 - 187/900) / (1 - 187/900) = (443/900) / (713/900) = 443/713, about
    // 0.6213: over the 0.6 bar, on the opposite side from the correctly pooled kappa below.
    const unionKappa = 443 / 713;
    expect(unionKappa).toBeGreaterThanOrEqual(0.6);

    const result = computeAgreement({ findings, catchCalls });
    expect(result.method).toBe('kappa');
    expect(result.value).toBeCloseTo(128 / 263, 6);
    expect(result.pass).toBe(false);
    expect(result.value).toBeLessThan(0.6);
    // The implementation's own value sits nowhere near the banned union figure.
    expect(Math.abs(result.value - unionKappa)).toBeGreaterThan(0.1);
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

describe('deriveReplacements', () => {
  const sample: Pick<AgreementSampleFile, 'findings' | 'catchCalls'> = {
    findings: [
      { itemId: 'f1', runId: 'r1', jobId: 'evaluator', primaryLabel: 'false' },
      { itemId: 'f2', runId: 'r1', jobId: 'evaluator', primaryLabel: 'real' },
    ],
    catchCalls: [
      { itemId: 'c1', runId: 'r2', plantId: 'PLANT-X1', primaryLabel: 'caught' },
      { itemId: 'c2', runId: 'r2', plantId: 'PLANT-X2', primaryLabel: 'missed' },
    ],
  };

  it('emits a replacement only for a sampled item where Fable disagreed with the primary label', () => {
    const replacements = deriveReplacements(
      sample,
      [{ itemId: 'f1', fableLabel: 'real' }, { itemId: 'f2', fableLabel: 'real' }],
      [{ itemId: 'c1', fableLabel: 'missed' }, { itemId: 'c2', fableLabel: 'missed' }],
    );
    expect(replacements).toEqual([
      { kind: 'finding', runId: 'r1', refId: 'f1', label: 'real' },
      { kind: 'catchCall', runId: 'r2', refId: 'PLANT-X1', label: 'missed' },
    ]);
  });

  it('emits no replacement at all when Fable agreed with every sampled item', () => {
    const replacements = deriveReplacements(
      sample,
      [{ itemId: 'f1', fableLabel: 'false' }, { itemId: 'f2', fableLabel: 'real' }],
      [{ itemId: 'c1', fableLabel: 'caught' }, { itemId: 'c2', fableLabel: 'missed' }],
    );
    expect(replacements).toEqual([]);
  });
});

describe('applyCatchReplacements', () => {
  it('replaces a matched run and plant\'s catch, leaving every other entry untouched', () => {
    const runsByJob: Record<string, CatchRunRecord[]> = {
      evaluator: [{ runId: 'r1', verified: true, opus: true, catches: { P1: 'caught', P2: 'missed' } }],
    };
    const result = applyCatchReplacements(runsByJob, [{ kind: 'catchCall', runId: 'r1', refId: 'P1', label: 'missed' }]);
    expect(result.evaluator[0].catches).toEqual({ P1: 'missed', P2: 'missed' });
    // The input is never mutated.
    expect(runsByJob.evaluator[0].catches.P1).toBe('caught');
  });
});

describe('applyPrecisionReplacements', () => {
  it('replaces a matched run and item\'s ruling, keeping its own subject group', () => {
    const runs: PrecisionRunRecord[] = [
      {
        runId: 'r1',
        job: 'evaluator',
        classId: 'docs-only',
        verified: true,
        opus: true,
        itemCount: 1,
        items: [{ itemId: 'i1', harnessFiltered: false, adjudication: { class: 'finding', subjectGroupId: 'subject-a', ruling: 'false' } }],
      },
    ];
    const result = applyPrecisionReplacements(runs, [{ kind: 'finding', runId: 'r1', refId: 'i1', label: 'real' }]);
    expect(result[0].items?.[0]).toEqual({ itemId: 'i1', harnessFiltered: false, adjudication: { class: 'finding', subjectGroupId: 'subject-a', ruling: 'real' } });
  });

  it('leaves a run with no items untouched', () => {
    const runs: PrecisionRunRecord[] = [{ runId: 'r1', job: 'evaluator', classId: 'docs-only', verified: false, opus: true, itemCount: 2 }];
    const result = applyPrecisionReplacements(runs, [{ kind: 'finding', runId: 'r1', refId: 'i1', label: 'real' }]);
    expect(result[0]).toEqual(runs[0]);
  });
});
