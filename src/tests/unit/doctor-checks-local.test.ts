import { describe, it, expect } from 'vitest';
import { readWranglerConfig } from '../../lib/doctor/wrangler-config.js';
import { runDoctor } from '../../lib/doctor/run.js';
import {
	configBindings,
	configObservability,
	configCsrfDisable,
	configSiteConfig,
	configPublicOrigin,
} from '../../lib/doctor/checks-local.js';
import type { DoctorContext } from '../../lib/doctor/types.js';

const GOOD_JSONC = `{
	// the worker name
	"name": "site",
	/* bindings the engine needs */
	"send_email": [
		{ "name": "EMAIL" },
	],
	"d1_databases": [
		{ "binding": "AUTH_DB", "database_name": "auth", "database_id": "abc-123" },
	],
	"observability": { "enabled": true },
	"vars": { "PUBLIC_ORIGIN": "https://example.com" },
}`;

const GOOD_TOML = `name = "site"

[[send_email]]
name = "EMAIL"

[[d1_databases]]
binding = "AUTH_DB"
database_name = "auth"
database_id = "toml-456"

[observability]
enabled = true

[vars]
PUBLIC_ORIGIN = "https://example.org"
`;

const CSRF_DISABLED = `const config = { kit: { csrf: { checkOrigin: false } } };
export default config;
`;

// The tutorial's hooks wiring: the engine guard imported from the package and handed the export.
const CAIRN_HOOKS = `import type { Handle } from '@sveltejs/kit';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
const guard = createAuthGuard();
export const handle: Handle = ({ event, resolve }) => guard({ event, resolve });
`;

const GOOD_SITE_CONFIG = `siteName: Test Site
content:
  posts:
    permalink: /posts/:year/:slug
`;

function ctx(files: Record<string, string>, extra: Partial<DoctorContext> = {}): DoctorContext {
	return {
		cwd: '/site',
		fetch: globalThis.fetch,
		readFile: async (relPath) => files[relPath] ?? null,
		...extra,
	};
}

describe('readWranglerConfig', () => {
	it('returns null when neither wrangler file exists', async () => {
		expect(await readWranglerConfig(ctx({}).readFile)).toBeNull();
	});

	it('reads the facts from jsonc with comments and trailing commas', async () => {
		const facts = await readWranglerConfig(ctx({ 'wrangler.jsonc': GOOD_JSONC }).readFile);
		expect(facts).toEqual({
			hasEmailBinding: true,
			hasAuthDb: true,
			authDbId: 'abc-123',
			observabilityEnabled: true,
			publicOrigin: 'https://example.com',
		});
	});

	it('reads the facts from toml', async () => {
		const facts = await readWranglerConfig(ctx({ 'wrangler.toml': GOOD_TOML }).readFile);
		expect(facts).toEqual({
			hasEmailBinding: true,
			hasAuthDb: true,
			authDbId: 'toml-456',
			observabilityEnabled: true,
			publicOrigin: 'https://example.org',
		});
	});

	it('leaves publicOrigin undefined when the config declares no vars', async () => {
		const facts = await readWranglerConfig(
			ctx({ 'wrangler.jsonc': '{ "send_email": [{ "name": "EMAIL" }] }' }).readFile
		);
		expect(facts?.publicOrigin).toBeUndefined();
	});

	it('prefers jsonc when both files exist', async () => {
		const facts = await readWranglerConfig(
			ctx({ 'wrangler.jsonc': GOOD_JSONC, 'wrangler.toml': 'name = "other"' }).readFile
		);
		expect(facts?.authDbId).toBe('abc-123');
	});

	it('misses an AUTH_DB declared under a differently named binding', async () => {
		const toml = `[[d1_databases]]\nbinding = "OTHER_DB"\ndatabase_id = "x"\n`;
		const facts = await readWranglerConfig(ctx({ 'wrangler.toml': toml }).readFile);
		expect(facts?.hasAuthDb).toBe(false);
		expect(facts?.authDbId).toBeUndefined();
	});

	it('throws a clean error on malformed jsonc, echoing none of the content', async () => {
		const broken = '{ "name": "site", "send_email": [ { SECRET-LOOKING-GARBAGE';
		await expect(readWranglerConfig(ctx({ 'wrangler.jsonc': broken }).readFile)).rejects.toThrow(
			'wrangler.jsonc did not parse'
		);
		await expect(
			readWranglerConfig(ctx({ 'wrangler.jsonc': broken }).readFile)
		).rejects.not.toThrow(/SECRET-LOOKING-GARBAGE/);
	});
});

describe('config.bindings', () => {
	it('passes when EMAIL and AUTH_DB are both declared (jsonc)', async () => {
		const result = await configBindings.run(ctx({ 'wrangler.jsonc': GOOD_JSONC }));
		expect(result.status).toBe('pass');
	});

	it('passes against a toml config carrying both bindings', async () => {
		const result = await configBindings.run(ctx({ 'wrangler.toml': GOOD_TOML }));
		expect(result.status).toBe('pass');
	});

	it('fails naming EMAIL when the send_email binding is absent', async () => {
		const jsonc = `{
			"d1_databases": [{ "binding": "AUTH_DB", "database_id": "abc" }]
		}`;
		const result = await configBindings.run(ctx({ 'wrangler.jsonc': jsonc }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('EMAIL');
		expect(result.detail).not.toContain('AUTH_DB');
	});

	it('skips naming both filenames when no wrangler config exists', async () => {
		const result = await configBindings.run(ctx({}));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('wrangler.jsonc');
		expect(result.detail).toContain('wrangler.toml');
	});

	it('fails (not skips) through the runner on a malformed wrangler.jsonc, with the clean detail', async () => {
		const broken = '{ "name": "site", "send_email": [ { SECRET-LOOKING-GARBAGE';
		const { results, failed } = await runDoctor(
			[configBindings],
			ctx({ 'wrangler.jsonc': broken })
		);
		expect(failed).toBe(1);
		expect(results[0].result.status).toBe('fail');
		expect(results[0].result.detail).toContain('wrangler.jsonc did not parse');
		expect(results[0].result.detail).not.toContain('SECRET-LOOKING-GARBAGE');
	});

	it('ties to the config.bindings-missing condition', () => {
		expect(configBindings.conditionId).toBe('config.bindings-missing');
	});
});

describe('config.observability', () => {
	it('passes when observability.enabled is true', async () => {
		const result = await configObservability.run(ctx({ 'wrangler.jsonc': GOOD_JSONC }));
		expect(result.status).toBe('pass');
	});

	it('fails when toml carries enabled = false', async () => {
		const toml = GOOD_TOML.replace('enabled = true', 'enabled = false');
		const result = await configObservability.run(ctx({ 'wrangler.toml': toml }));
		expect(result.status).toBe('fail');
	});

	it('fails when the jsonc config omits observability', async () => {
		const jsonc = `{ "send_email": [{ "name": "EMAIL" }] }`;
		const result = await configObservability.run(ctx({ 'wrangler.jsonc': jsonc }));
		expect(result.status).toBe('fail');
	});

	it('skips when no wrangler config exists', async () => {
		const result = await configObservability.run(ctx({}));
		expect(result.status).toBe('skip');
	});

	it('ties to the config.observability-off condition', () => {
		expect(configObservability.conditionId).toBe('config.observability-off');
	});
});

describe('config.csrf-disable', () => {
	it('passes when the disable is present and the hooks file wires the cairn guard, noting both', async () => {
		const result = await configCsrfDisable.run(
			ctx({ 'svelte.config.js': CSRF_DISABLED, 'src/hooks.server.ts': CAIRN_HOOKS })
		);
		expect(result.status).toBe('pass');
		expect(result.detail).toContain('checkOrigin: false');
		expect(result.detail).toContain('guard');
	});

	it('accepts the guard wiring in src/hooks.server.js when no .ts file exists', async () => {
		const result = await configCsrfDisable.run(
			ctx({ 'svelte.config.js': CSRF_DISABLED, 'src/hooks.server.js': CAIRN_HOOKS })
		);
		expect(result.status).toBe('pass');
	});

	it('fails when the only checkOrigin: false sits on a commented-out line', async () => {
		const config = `const config = { kit: {
	// csrf: { checkOrigin: false },
} };
export default config;
`;
		const result = await configCsrfDisable.run(
			ctx({ 'svelte.config.js': config, 'src/hooks.server.ts': CAIRN_HOOKS })
		);
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('heuristic');
	});

	it('fails naming the risk when the disable is present but no hooks file exists', async () => {
		const result = await configCsrfDisable.run(ctx({ 'svelte.config.js': CSRF_DISABLED }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('no cairn guard found');
		expect(result.detail).toContain('no CSRF protection');
	});

	it('fails when the hooks file never mentions cairn', async () => {
		const hooks = `export const handle = ({ event, resolve }) => resolve(event);\n`;
		const result = await configCsrfDisable.run(
			ctx({ 'svelte.config.js': CSRF_DISABLED, 'src/hooks.server.ts': hooks })
		);
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('no cairn guard found');
	});

	it('fails when the disable is absent, naming the heuristic', async () => {
		const result = await configCsrfDisable.run(
			ctx({ 'svelte.config.js': 'export default { kit: {} };' })
		);
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('heuristic');
	});

	it('skips when svelte.config.js is absent', async () => {
		const result = await configCsrfDisable.run(ctx({}));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('svelte.config.js');
	});

	it('ties to the config.csrf-disable-missing condition', () => {
		expect(configCsrfDisable.conditionId).toBe('config.csrf-disable-missing');
	});
});

describe('config.site-config', () => {
	it('passes a valid minimal site config and names the adapter-less scope', async () => {
		const result = await configSiteConfig.run(ctx({ 'site.config.yaml': GOOD_SITE_CONFIG }));
		expect(result.status).toBe('pass');
		expect(result.detail).toContain('adapter');
	});

	it('fails with the parse message on broken YAML', async () => {
		const result = await configSiteConfig.run(ctx({ 'site.config.yaml': '- just\n- a list\n' }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('Site config must be a YAML mapping');
	});

	it('fails with the engine validator message on a bad permalink', async () => {
		const yaml = `siteName: Test\ncontent:\n  posts:\n    permalink: posts/:slug\n`;
		const result = await configSiteConfig.run(ctx({ 'site.config.yaml': yaml }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('must start with "/"');
	});

	it('fails when a non-dated concept uses a date token', async () => {
		const yaml = `siteName: Test\ncontent:\n  pages:\n    permalink: /:year/:slug\n`;
		const result = await configSiteConfig.run(ctx({ 'site.config.yaml': yaml }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('date token');
	});

	it('finds the config at the src/lib conventional location', async () => {
		const result = await configSiteConfig.run(ctx({ 'src/lib/site.config.yaml': GOOD_SITE_CONFIG }));
		expect(result.status).toBe('pass');
	});

	it('skips when site.config.yaml is absent from every conventional location', async () => {
		const result = await configSiteConfig.run(ctx({}));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('src/lib/site.config.yaml');
	});

	it('ties to the config.site-config-invalid condition', () => {
		expect(configSiteConfig.conditionId).toBe('config.site-config-invalid');
	});
});

describe('config.public-origin', () => {
	it('passes on the https origin from the jsonc vars, naming the value and the source', async () => {
		const result = await configPublicOrigin.run(ctx({ 'wrangler.jsonc': GOOD_JSONC }));
		expect(result.status).toBe('pass');
		expect(result.detail).toContain('https://example.com');
		expect(result.detail).toContain('wrangler vars');
	});

	it('passes on the https origin from the toml vars', async () => {
		const result = await configPublicOrigin.run(ctx({ 'wrangler.toml': GOOD_TOML }));
		expect(result.status).toBe('pass');
		expect(result.detail).toContain('https://example.org');
	});

	it('passes on an http localhost origin, matching the runtime dev allowance', async () => {
		const result = await configPublicOrigin.run(
			ctx({}, { publicOrigin: 'http://localhost:5173' })
		);
		expect(result.status).toBe('pass');
		expect(result.detail).toContain('environment');
	});

	it('fails with the runtime message when the wrangler config carries no PUBLIC_ORIGIN', async () => {
		const jsonc = '{ "send_email": [{ "name": "EMAIL" }] }';
		const result = await configPublicOrigin.run(ctx({ 'wrangler.jsonc': jsonc }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('PUBLIC_ORIGIN is not configured');
	});

	it('fails on a value that does not parse as a URL', async () => {
		const result = await configPublicOrigin.run(ctx({}, { publicOrigin: 'not a url' }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('not a valid URL');
	});

	it('fails on http for a non-local host, naming the https requirement', async () => {
		const result = await configPublicOrigin.run(ctx({}, { publicOrigin: 'http://ecnordic.ski' }));
		expect(result.status).toBe('fail');
		expect(result.detail).toContain('https');
	});

	it('falls back to the environment when the config exists without the var', async () => {
		const jsonc = '{ "send_email": [{ "name": "EMAIL" }] }';
		const result = await configPublicOrigin.run(
			ctx({ 'wrangler.jsonc': jsonc }, { publicOrigin: 'https://env.example.com' })
		);
		expect(result.status).toBe('pass');
		expect(result.detail).toContain('https://env.example.com');
		expect(result.detail).toContain('environment');
	});

	it('lets the wrangler var beat the environment, since the deployed Worker reads it', async () => {
		const result = await configPublicOrigin.run(
			ctx({ 'wrangler.jsonc': GOOD_JSONC }, { publicOrigin: 'https://env.example.com' })
		);
		expect(result.status).toBe('pass');
		expect(result.detail).toContain('https://example.com');
	});

	it('skips when no wrangler config exists and the environment carries nothing', async () => {
		const result = await configPublicOrigin.run(ctx({}));
		expect(result.status).toBe('skip');
		expect(result.detail).toContain('PUBLIC_ORIGIN');
	});

	it('ties to the config.public-origin-invalid condition', () => {
		expect(configPublicOrigin.conditionId).toBe('config.public-origin-invalid');
	});
});

describe('the full local set against one good site', () => {
	it('passes all five checks', async () => {
		const site = ctx({
			'wrangler.jsonc': GOOD_JSONC,
			'svelte.config.js': CSRF_DISABLED,
			'src/hooks.server.ts': CAIRN_HOOKS,
			'site.config.yaml': GOOD_SITE_CONFIG,
		});
		const checks = [
			configBindings,
			configObservability,
			configCsrfDisable,
			configSiteConfig,
			configPublicOrigin,
		];
		for (const check of checks) {
			const result = await check.run(site);
			expect(result.status, check.id).toBe('pass');
		}
	});
});
