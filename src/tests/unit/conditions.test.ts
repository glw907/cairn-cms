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

	it('carries no logEvent on the config, hsts, and github entries yet', () => {
		// Task 2 adds the github.unreachable log event; until then the entry stays bare.
		for (const id of [
			'config.bindings-missing',
			'config.observability-off',
			'config.csrf-disable-missing',
			'config.site-config-invalid',
			'edge.hsts-off',
			'github.app-unreachable',
		]) {
			expect(condition(id).logEvent, id).toBeUndefined();
		}
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
