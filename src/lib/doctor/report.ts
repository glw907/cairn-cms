// The doctor's report: one aligned line per check, then a why/remediation block per failure
// resolved from the condition registry, then a count summary. Plain text, no ANSI color, so the
// output reads the same in a terminal and a CI log. An unknown conditionId is a programming
// error; condition() throws and the report does not paper over it.
import { condition } from '../diagnostics/index.js';
import type { CheckResult, DoctorCheck } from './types.js';

const TAG: Record<CheckResult['status'], string> = {
	pass: 'PASS',
	fail: 'FAIL',
	skip: 'SKIP',
};

/**
 *
 */
export function formatReport(results: { check: DoctorCheck; result: CheckResult }[]): string {
	const lines = results.map(
		({ check, result }) => `${TAG[result.status]}  ${check.title}: ${result.detail}`
	);

	const failures = results.filter(({ result }) => result.status === 'fail');
	for (const { check } of failures) {
		const entry = condition(check.conditionId);
		lines.push('', `${check.title} failed.`, `  Why: ${entry.why}`, `  Fix: ${entry.remediation}`);
	}

	const count = (status: CheckResult['status']) =>
		results.filter(({ result }) => result.status === status).length;
	lines.push('', `${count('pass')} passed, ${count('fail')} failed, ${count('skip')} skipped`);

	return lines.join('\n');
}
