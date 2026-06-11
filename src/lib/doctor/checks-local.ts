// The doctor's local-config checks: the wrangler bindings, the observability sink, the
// svelte.config CSRF handoff, and the site-config validation. Every read goes through the
// injected ctx.readFile, so the tests pass fixtures and the bin passes node:fs.
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { readWranglerConfig } from './wrangler-config.js';
import { parseSiteConfig, urlPolicyFrom } from '../nav/site-config.js';
import { normalizeConcepts } from '../content/concepts.js';
import { defineFields } from '../content/schema.js';
import type { ConceptConfig } from '../content/types.js';

const NO_WRANGLER: CheckResult = {
	status: 'skip',
	detail: 'no wrangler.jsonc or wrangler.toml found',
};

export const configBindings: DoctorCheck = {
	id: 'config.bindings',
	conditionId: 'config.bindings-missing',
	title: 'Wrangler bindings',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		const facts = await readWranglerConfig(ctx.readFile);
		if (facts === null) return NO_WRANGLER;
		const missing: string[] = [];
		if (!facts.hasEmailBinding) missing.push('EMAIL (send_email)');
		if (!facts.hasAuthDb) missing.push('AUTH_DB (d1_databases)');
		if (missing.length) return { status: 'fail', detail: `missing ${missing.join(' and ')}` };
		return { status: 'pass', detail: 'EMAIL and AUTH_DB are declared' };
	},
};

export const configObservability: DoctorCheck = {
	id: 'config.observability',
	conditionId: 'config.observability-off',
	title: 'Workers Logs sink',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		const facts = await readWranglerConfig(ctx.readFile);
		if (facts === null) return NO_WRANGLER;
		if (!facts.observabilityEnabled) {
			return { status: 'fail', detail: 'observability.enabled is not true' };
		}
		return { status: 'pass', detail: 'observability.enabled is true' };
	},
};

export const configCsrfDisable: DoctorCheck = {
	id: 'config.csrf-disable',
	conditionId: 'config.csrf-disable-missing',
	title: 'Framework CSRF handoff',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		const text = await ctx.readFile('svelte.config.js');
		if (text === null) return { status: 'skip', detail: 'svelte.config.js not found' };
		if (/checkOrigin\s*:\s*false/.test(text)) {
			return { status: 'pass', detail: 'checkOrigin: false found (heuristic text read)' };
		}
		return { status: 'fail', detail: 'no checkOrigin: false found (heuristic text read)' };
	},
};

export const configSiteConfig: DoctorCheck = {
	id: 'config.site-config',
	conditionId: 'config.site-config-invalid',
	title: 'Site config',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		const text = await ctx.readFile('site.config.yaml');
		if (text === null) return { status: 'skip', detail: 'site.config.yaml not found' };
		try {
			const policy = urlPolicyFrom(parseSiteConfig(text));
			// Run the engine's own URL-policy validation by declaring a synthetic empty concept
			// per policy key. Routing is concept-fixed in the engine (CONCEPT_ROUTING, never the
			// adapter), so the dated rules apply faithfully here. What a CLI cannot check without
			// evaluating the adapter is whether each policy key names a concept the site declares.
			const synthetic = Object.fromEntries(
				Object.keys(policy).map((id): [string, ConceptConfig] => [id, { dir: '', schema: defineFields([]) }])
			);
			normalizeConcepts(synthetic, policy);
			return {
				status: 'pass',
				detail: 'parsed and URL policy validated (the adapter concept set is not checkable from the CLI)',
			};
		} catch (err) {
			return { status: 'fail', detail: err instanceof Error ? err.message : String(err) };
		}
	},
};
