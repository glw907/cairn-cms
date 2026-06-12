import { describe, it, expect } from 'vitest';
import {
	condition,
	allConditions,
	REGISTRY,
	type CairnCondition,
} from '../../lib/diagnostics/conditions.js';

const PASS_3_IDS = [
	'config.bindings-missing',
	'config.observability-off',
	'config.csrf-disable-missing',
	'config.site-config-invalid',
	'edge.hsts-off',
	'auth.store-unreachable',
	'github.app-unreachable',
] as const;

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

	it('resolves the Pass 3 doctor conditions with their severities', () => {
		expect(condition('config.bindings-missing').severity).toBe('blocker');
		expect(condition('config.observability-off').severity).toBe('warning');
		expect(condition('config.csrf-disable-missing').severity).toBe('warning');
		expect(condition('config.site-config-invalid').severity).toBe('blocker');
		expect(condition('edge.hsts-off').severity).toBe('warning');
		expect(condition('auth.store-unreachable').severity).toBe('blocker');
		expect(condition('github.app-unreachable').severity).toBe('blocker');
	});

	it('resolves the public-origin condition (the deliberate post-0.50.0 unfreeze)', () => {
		const c = condition('config.public-origin-invalid');
		expect(c.severity).toBe('blocker');
		expect(c.why).toMatch(/unset/i);
		expect(c.why).toMatch(/url/i);
		expect(c.remediation).toContain('PUBLIC_ORIGIN');
		expect(c.remediation).toMatch(/https/);
		expect(c.docsAnchor).toBe('cloudflare-readiness.md#set-the-public-origin');
	});

	it('pins the registry at thirteen entries', () => {
		// Twelve through 0.50.0, plus config.public-origin-invalid: the sanctioned unfreeze that
		// lets requireOrigin join the condition model. Grow this count only with a registry change.
		expect(allConditions()).toHaveLength(13);
	});

	it('carries no logEvent on the config and hsts entries', () => {
		// These conditions surface at deploy or doctor time, not through a runtime log record.
		for (const id of [
			'config.bindings-missing',
			'config.observability-off',
			'config.csrf-disable-missing',
			'config.site-config-invalid',
			'config.public-origin-invalid',
			'edge.hsts-off',
		]) {
			expect(condition(id).logEvent, id).toBeUndefined();
		}
	});

	it('correlates github.app-unreachable with the github.unreachable log event', () => {
		expect(condition('github.app-unreachable').logEvent).toBe('github.unreachable');
	});

	it('includes every Pass 3 id in allConditions()', () => {
		const ids = allConditions().map((c) => c.id);
		for (const id of PASS_3_IDS) expect(ids).toContain(id);
	});

	it('rejects replacing a registry entry (frozen registry)', () => {
		expect(() => {
			REGISTRY['edge.https-not-forced'] = { ...condition('edge.https-not-forced') };
		}).toThrow(TypeError);
	});

	it('rejects mutating a field on a registry entry (frozen entries)', () => {
		expect(() => {
			condition('edge.https-not-forced').title = 'changed';
		}).toThrow(TypeError);
	});
});
