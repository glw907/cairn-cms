import { describe, it, expect } from 'vitest';
import type { AgreementResult, StratumAgreement } from '../../../scripts/docs-readers/lib/score-agreement.js';
import type { ClassSensitivityResult, PooledSensitivityResult } from '../../../scripts/docs-readers/lib/score-catch.js';
import type { ClassPrecisionResult } from '../../../scripts/docs-readers/lib/score-precision.js';
import { scoreClassVerdicts } from '../../../scripts/docs-readers/lib/score-verdict.js';
import { CLASS_IDS, type ClassId } from '../../../scripts/docs-readers/lib/score-types.js';

const STRATUM: StratumAgreement = { n: 15, po: 1, pe: 0.3, kappa: 1, fiveItemPass: true };
const PASSING_AGREEMENT: AgreementResult = { findings: STRATUM, catchCalls: STRATUM, method: 'kappa', value: 0.9, pass: true };
const FAILING_AGREEMENT: AgreementResult = { findings: STRATUM, catchCalls: STRATUM, method: 'kappa', value: 0.2, pass: false };

const PASSING_POOLED: PooledSensitivityResult = { caught: 31, achieved: 42, threshold: 31, pass: true };
const FAILING_POOLED: PooledSensitivityResult = { caught: 20, achieved: 42, threshold: 31, pass: false };

function sensitivity(overrides: Partial<ClassSensitivityResult> = {}): Record<ClassId, ClassSensitivityResult> {
  const result = {} as Record<ClassId, ClassSensitivityResult>;
  for (const classId of CLASS_IDS) result[classId] = { classId, caught: 5, achieved: 7, floor: 4, pass: true, ...overrides };
  return result;
}

function precision(overrides: Partial<ClassPrecisionResult> = {}): Record<ClassId, ClassPrecisionResult> {
  const result = {} as Record<ClassId, ClassPrecisionResult>;
  for (const classId of CLASS_IDS) result[classId] = { classId, falseFindings: 0, limit: 3, pass: true, share: 1, ...overrides };
  return result;
}

describe('scoreClassVerdicts', () => {
  it('validates every class when every bar passes', () => {
    const { classes, allClassesFailed } = scoreClassVerdicts({
      pooledSensitivity: PASSING_POOLED,
      agreement: PASSING_AGREEMENT,
      classSensitivities: sensitivity(),
      classPrecisions: precision(),
    });
    expect(classes.every((cls) => cls.verdict === 'validated')).toBe(true);
    expect(allClassesFailed).toBe(false);
  });

  it('marks all four classes advisory when the agreement bar fails', () => {
    const { classes, allClassesFailed } = scoreClassVerdicts({
      pooledSensitivity: PASSING_POOLED,
      agreement: FAILING_AGREEMENT,
      classSensitivities: sensitivity(),
      classPrecisions: precision(),
    });
    expect(classes.every((cls) => cls.verdict === 'advisory')).toBe(true);
    expect(classes.every((cls) => cls.reasons.some((r) => r.includes('agreement')))).toBe(true);
    expect(allClassesFailed).toBe(true);
  });

  it('marks all four classes advisory when the pooled sensitivity bar fails', () => {
    const { classes, allClassesFailed } = scoreClassVerdicts({
      pooledSensitivity: FAILING_POOLED,
      agreement: PASSING_AGREEMENT,
      classSensitivities: sensitivity(),
      classPrecisions: precision(),
    });
    expect(classes.every((cls) => cls.verdict === 'advisory')).toBe(true);
    expect(allClassesFailed).toBe(true);
  });

  it('marks only the failing class advisory when one class fails its own precision bar', () => {
    const precisions = precision();
    precisions['docs-only'] = { classId: 'docs-only', falseFindings: 5, limit: 3, pass: false, share: 0.2 };
    const { classes, allClassesFailed } = scoreClassVerdicts({
      pooledSensitivity: PASSING_POOLED,
      agreement: PASSING_AGREEMENT,
      classSensitivities: sensitivity(),
      classPrecisions: precisions,
    });
    const byClass = Object.fromEntries(classes.map((cls) => [cls.classId, cls]));
    expect(byClass['docs-only'].verdict).toBe('advisory');
    expect(byClass['docs-only'].reasons.some((r) => r.includes('precision'))).toBe(true);
    expect(byClass['docs-and-binary'].verdict).toBe('validated');
    expect(byClass['docs-and-site'].verdict).toBe('validated');
    expect(byClass['repository'].verdict).toBe('validated');
    expect(allClassesFailed).toBe(false);
  });

  it('marks only the failing class advisory when one class fails its own sensitivity floor', () => {
    const sensitivities = sensitivity();
    sensitivities['repository'] = { classId: 'repository', caught: 2, achieved: 14, floor: 9, pass: false };
    const { classes } = scoreClassVerdicts({
      pooledSensitivity: PASSING_POOLED,
      agreement: PASSING_AGREEMENT,
      classSensitivities: sensitivities,
      classPrecisions: precision(),
    });
    const byClass = Object.fromEntries(classes.map((cls) => [cls.classId, cls]));
    expect(byClass['repository'].verdict).toBe('advisory');
    expect(byClass['docs-only'].verdict).toBe('validated');
  });

  it('validates a class whose own floor is null, on the rest of the bars', () => {
    const sensitivities = sensitivity();
    sensitivities['docs-only'] = { classId: 'docs-only', caught: 0, achieved: 1, floor: null, pass: true };
    const { classes } = scoreClassVerdicts({
      pooledSensitivity: PASSING_POOLED,
      agreement: PASSING_AGREEMENT,
      classSensitivities: sensitivities,
      classPrecisions: precision(),
    });
    expect(classes.find((cls) => cls.classId === 'docs-only')?.verdict).toBe('validated');
  });
});
