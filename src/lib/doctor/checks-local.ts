// The doctor's local-config checks: the wrangler bindings, the observability sink, the
// svelte.config CSRF handoff, and the site-config validation. Every read goes through the
// injected ctx.readFile, so the tests pass fixtures and the bin passes node:fs.
import { fail, pass, skip } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { readWranglerConfig } from './wrangler-config.js';
import { parseSiteConfig, urlPolicyFrom } from '../nav/site-config.js';
import { normalizeConcepts } from '../content/concepts.js';
import { defineFields } from '../content/schema.js';
import type { ConceptConfig } from '../content/types.js';

const NO_WRANGLER: CheckResult = skip('no wrangler.jsonc or wrangler.toml found');

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
		if (missing.length) return fail(`missing ${missing.join(' and ')}`);
		return pass('EMAIL and AUTH_DB are declared');
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
			return fail('observability.enabled is not true');
		}
		return pass('observability.enabled is true');
	},
};

// A line whose trimmed start is a comment marker cannot disable anything, so a commented-out
// checkOrigin: false never green-lights the handoff.
function hasUncommentedDisable(text: string): boolean {
	return text.split('\n').some((line) => {
		const trimmed = line.trimStart();
		if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
			return false;
		}
		return /checkOrigin\s*:\s*false/.test(trimmed);
	});
}

// The guard-wiring heuristic. The tutorial's hooks file imports createAuthGuard from
// @glw907/cairn-cms/sveltekit and hands it the exported handle, which the first clause matches
// directly; a site that wraps the guard in its own module still mentions cairn beside a handle.
function wiresCairnGuard(text: string): boolean {
	if (text.includes('@glw907/cairn-cms')) return true;
	return /cairn/i.test(text) && /handle/.test(text);
}

export const configCsrfDisable: DoctorCheck = {
	id: 'config.csrf-disable',
	conditionId: 'config.csrf-disable-missing',
	title: 'Framework CSRF handoff',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		const text = await ctx.readFile('svelte.config.js');
		if (text === null) return skip('svelte.config.js not found');
		if (!hasUncommentedDisable(text)) {
			return fail('no checkOrigin: false found (heuristic text read)');
		}
		// The disable alone proves nothing: with the framework check off and no cairn guard in
		// the hooks, the admin form POSTs have no CSRF protection at all. The pair is the check.
		const hooks =
			(await ctx.readFile('src/hooks.server.ts')) ?? (await ctx.readFile('src/hooks.server.js'));
		if (hooks === null || !wiresCairnGuard(hooks)) {
			return fail(
				'checkOrigin is off but no cairn guard found in src/hooks.server.ts; the site may have no CSRF protection'
			);
		}
		return pass(
			'checkOrigin: false found and the hooks file wires the cairn guard (heuristic text read)'
		);
	},
};

// Where sites keep site.config.yaml. The adapter's configPath is TypeScript the CLI cannot
// evaluate, so the check probes the conventional spots instead (the repo root and the two
// src locations the production sites use).
const SITE_CONFIG_PATHS = ['site.config.yaml', 'src/lib/site.config.yaml', 'src/site.config.yaml'];

export const configSiteConfig: DoctorCheck = {
	id: 'config.site-config',
	conditionId: 'config.site-config-invalid',
	title: 'Site config',
	async run(ctx: DoctorContext): Promise<CheckResult> {
		let text: string | null = null;
		for (const path of SITE_CONFIG_PATHS) {
			text = await ctx.readFile(path);
			if (text !== null) break;
		}
		if (text === null) return skip(`no site.config.yaml found (looked in ${SITE_CONFIG_PATHS.join(', ')})`);
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
			return pass('parsed and URL policy validated (the adapter concept set is not checkable from the CLI)');
		} catch (err) {
			return fail(err instanceof Error ? err.message : String(err));
		}
	},
};
