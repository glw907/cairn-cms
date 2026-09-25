/**
 * Combine the pooled sensitivity bar, the agreement bar, and each class's own sensitivity floor
 * and precision bar into the per-class verdict the failure rule defines, plus the all-classes-failed
 * flag (O5).
 */
import type { AgreementResult } from './score-agreement.js';
import type { ClassSensitivityResult, PooledSensitivityResult } from './score-catch.js';
import type { ClassPrecisionResult } from './score-precision.js';
import { CLASS_IDS, type ClassId } from './score-types.js';

/** One class's full verdict: its own sensitivity and precision results, and the reasons behind its verdict. */
export interface ClassVerdict {
  classId: ClassId;
  sensitivity: ClassSensitivityResult;
  precision: ClassPrecisionResult;
  verdict: 'validated' | 'advisory';
  reasons: string[];
}

/**
 * A class validates when the instrument-wide sensitivity and agreement bars pass and its own
 * sensitivity floor and precision bar pass, with a null floor treated as passing (Path map,
 * "Recomputed thresholds"). A class with a failing verdict carries every reason that applied, so a
 * caller need not re-derive which bar cost it. Takes the pooled sensitivity and agreement results,
 * and each class's own sensitivity and precision results.
 * @returns Every class's verdict, in `CLASS_IDS` order, and whether every class failed.
 */
export function scoreClassVerdicts({
  pooledSensitivity,
  agreement,
  classSensitivities,
  classPrecisions,
}: {
  pooledSensitivity: PooledSensitivityResult;
  agreement: AgreementResult;
  classSensitivities: Record<ClassId, ClassSensitivityResult>;
  classPrecisions: Record<ClassId, ClassPrecisionResult>;
}): { classes: ClassVerdict[]; allClassesFailed: boolean } {
  const classes = CLASS_IDS.map((classId): ClassVerdict => {
    const sensitivity = classSensitivities[classId];
    const precision = classPrecisions[classId];
    const reasons: string[] = [];
    if (!pooledSensitivity.pass) reasons.push('instrument-wide sensitivity bar failed');
    if (!agreement.pass) reasons.push('judge agreement bar failed');
    if (!sensitivity.pass) reasons.push(`class sensitivity floor failed (${sensitivity.caught} of ${sensitivity.achieved}, floor ${sensitivity.floor})`);
    if (!precision.pass) reasons.push(`class precision bar failed (${precision.falseFindings} false finding(s) over the limit ${precision.limit})`);
    const validated = pooledSensitivity.pass && agreement.pass && sensitivity.pass && precision.pass;
    return { classId, sensitivity, precision, verdict: validated ? 'validated' : 'advisory', reasons };
  });
  return { classes, allClassesFailed: classes.every((cls) => cls.verdict === 'advisory') };
}
