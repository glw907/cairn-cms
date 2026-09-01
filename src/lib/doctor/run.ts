// The doctor's runner: every check executes, every result lands in the table. A throwing check
// records a fail and the run continues, so one broken probe never hides the rest of the picture.
import { fail } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';

/**
 * Run every check against `ctx` in declared order, catching any throw as a failing result so one
 * broken probe never stops the rest. Returns every check paired with its result, plus the failed
 * and unchecked counts the bin uses to decide its exit code (fail drives exit 1, unchecked with
 * no fail drives exit 3).
 */
export async function runDoctor(
  checks: DoctorCheck[],
  ctx: DoctorContext
): Promise<{
  results: { check: DoctorCheck; result: CheckResult }[];
  failed: number;
  unchecked: number;
}> {
  const results: { check: DoctorCheck; result: CheckResult }[] = [];
  let failed = 0;
  let unchecked = 0;
  for (const check of checks) {
    let result: CheckResult;
    try {
      result = await check.run(ctx);
    } catch (err) {
      result = fail(err instanceof Error ? err.message : String(err));
    }
    if (result.status === 'fail') failed += 1;
    if (result.status === 'unchecked') unchecked += 1;
    results.push({ check, result });
  }
  return { results, failed, unchecked };
}
