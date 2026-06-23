// The doctor's runner: every check executes, every result lands in the table. A throwing check
// records a fail and the run continues, so one broken probe never hides the rest of the picture.
import { fail } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';

/**
 *
 */
export async function runDoctor(
	checks: DoctorCheck[],
	ctx: DoctorContext
): Promise<{ results: { check: DoctorCheck; result: CheckResult }[]; failed: number }> {
	const results: { check: DoctorCheck; result: CheckResult }[] = [];
	let failed = 0;
	for (const check of checks) {
		let result: CheckResult;
		try {
			result = await check.run(ctx);
		} catch (err) {
			result = fail(String(err));
		}
		if (result.status === 'fail') failed += 1;
		results.push({ check, result });
	}
	return { results, failed };
}
