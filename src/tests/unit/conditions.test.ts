import { describe, it, expect } from 'vitest';
import { condition, allConditions, type CairnCondition } from '../../lib/diagnostics/conditions.js';

describe('condition registry', () => {
	it('resolves each guard condition by id', () => {
		expect(condition('edge.https-not-forced').severity).toBe('blocker');
		expect(condition('auth.csrf-token-invalid').title).toMatch(/csrf/i);
		expect(condition('auth.csrf-origin-mismatch').logEvent).toBe('guard.rejected');
	});

	it('resolves the two email conditions', () => {
		expect(condition('email.sender-not-onboarded').severity).toBe('blocker');
		expect(condition('email.sender-not-onboarded').remediation).toMatch(
			/wrangler email sending enable/
		);
		expect(condition('email.sender-not-onboarded').logEvent).toBe('auth.link.send_failed');
		expect(condition('email.send-failed').severity).toBe('blocker');
		expect(condition('email.send-failed').logEvent).toBe('auth.link.send_failed');
	});

	it('throws on an unknown id', () => {
		expect(() => condition('nope.not-real')).toThrow(/unknown cairn condition/);
	});

	it('every entry carries the required human fields', () => {
		const required: (keyof CairnCondition)[] = ['id', 'severity', 'title', 'why', 'remediation'];
		for (const c of allConditions()) {
			for (const key of required) expect(c[key], `${c.id}.${key}`).toBeTruthy();
			expect(c.severity === 'blocker' || c.severity === 'warning').toBe(true);
		}
	});

	it('id matches the registry key for every entry', () => {
		for (const c of allConditions()) expect(condition(c.id)).toBe(c);
	});
});
