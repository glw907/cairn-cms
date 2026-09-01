import { describe, it, expect, vi } from 'vitest';
import { readWranglerConfig } from '../../lib/doctor/wrangler-config.js';
import { runDoctor } from '../../lib/doctor/run.js';
import {
  configBindings,
  configMediaBucket,
  configObservability,
  configCsrfDisable,
  configSiteConfig,
  configPublicOrigin,
  configTidyKey,
  roleWiring,
  configNoReferrerBlanket,
} from '../../lib/doctor/checks-local.js';
import type { DoctorContext } from '../../lib/doctor/types.js';
import type { RolesDeclaration } from '../../lib/auth/roles.js';

const GOOD_JSONC = `{
  // the worker name
  "name": "site",
  "account_id": "cf-acct-1",
  /* bindings the engine needs */
  "send_email": [
    { "name": "EMAIL" },
  ],
  "d1_databases": [
    { "binding": "AUTH_DB", "database_name": "auth", "database_id": "abc-123" },
  ],
  "r2_buckets": [
    { "binding": "MEDIA_BUCKET", "bucket_name": "site-media" },
  ],
  "observability": { "enabled": true },
  "vars": { "PUBLIC_ORIGIN": "https://example.com" },
}`;

const GOOD_TOML = `name = "site"
account_id = "cf-acct-2"

[[send_email]]
name = "EMAIL"

[[d1_databases]]
binding = "AUTH_DB"
database_name = "auth"
database_id = "toml-456"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "site-media"

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
menus:
  primary: []
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
      accountId: 'cf-acct-1',
      r2Buckets: ['MEDIA_BUCKET'],
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
      accountId: 'cf-acct-2',
      r2Buckets: ['MEDIA_BUCKET'],
    });
  });

  it('leaves publicOrigin undefined when the config declares no vars', async () => {
    const facts = await readWranglerConfig(
      ctx({ 'wrangler.jsonc': '{ "send_email": [{ "name": "EMAIL" }] }' }).readFile
    );
    expect(facts?.publicOrigin).toBeUndefined();
  });

  it('leaves accountId undefined when the config declares none', async () => {
    const jsonc = await readWranglerConfig(
      ctx({ 'wrangler.jsonc': '{ "name": "site" }' }).readFile
    );
    expect(jsonc?.accountId).toBeUndefined();
    const toml = await readWranglerConfig(ctx({ 'wrangler.toml': 'name = "site"\n' }).readFile);
    expect(toml?.accountId).toBeUndefined();
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

  it('parses the r2_buckets binding names from jsonc', async () => {
    const jsonc = `{
      "r2_buckets": [
        { "binding": "MEDIA_BUCKET", "bucket_name": "m" },
        { "binding": "OTHER", "bucket_name": "o" },
      ],
    }`;
    const facts = await readWranglerConfig(ctx({ 'wrangler.jsonc': jsonc }).readFile);
    expect(facts?.r2Buckets).toEqual(['MEDIA_BUCKET', 'OTHER']);
  });

  it('parses the r2_buckets binding names from toml', async () => {
    const toml = `[[r2_buckets]]\nbinding = "MEDIA_BUCKET"\nbucket_name = "m"\n\n[[r2_buckets]]\nbinding = "OTHER"\nbucket_name = "o"\n`;
    const facts = await readWranglerConfig(ctx({ 'wrangler.toml': toml }).readFile);
    expect(facts?.r2Buckets).toEqual(['MEDIA_BUCKET', 'OTHER']);
  });

  it('leaves r2Buckets an empty array when the config declares no r2_buckets', async () => {
    const jsonc = await readWranglerConfig(ctx({ 'wrangler.jsonc': '{ "name": "site" }' }).readFile);
    expect(jsonc?.r2Buckets).toEqual([]);
    const toml = await readWranglerConfig(ctx({ 'wrangler.toml': 'name = "site"\n' }).readFile);
    expect(toml?.r2Buckets).toEqual([]);
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

  it('passes on EMAIL and AUTH_DB alone and never demands an r2 binding', async () => {
    // The hard bindings check must not regress a no-media site: a config with EMAIL and AUTH_DB
    // but no r2_buckets still passes (decision 9).
    const jsonc = `{
      "send_email": [{ "name": "EMAIL" }],
      "d1_databases": [{ "binding": "AUTH_DB", "database_id": "x" }]
    }`;
    const result = await configBindings.run(ctx({ 'wrangler.jsonc': jsonc }));
    expect(result.status).toBe('pass');
    expect(result.detail).not.toContain('r2');
    expect(result.detail).not.toContain('MEDIA');
  });
});

describe('config.media-bucket', () => {
  const MEDIA_JSONC = `{
    "r2_buckets": [{ "binding": "MEDIA_BUCKET", "bucket_name": "m" }]
  }`;

  it('skips when the adapter declares no media binding', async () => {
    const result = await configMediaBucket.run(ctx({ 'wrangler.jsonc': MEDIA_JSONC }));
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('no media assets');
  });

  it('skips with the no-wrangler message when a media binding is declared but no config exists', async () => {
    const result = await configMediaBucket.run(ctx({}, { mediaBucketBinding: 'MEDIA_BUCKET' }));
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('wrangler.jsonc');
  });

  it('passes when the adapter binding is present in wrangler r2_buckets', async () => {
    const result = await configMediaBucket.run(
      ctx({ 'wrangler.jsonc': MEDIA_JSONC }, { mediaBucketBinding: 'MEDIA_BUCKET' })
    );
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('MEDIA_BUCKET');
  });

  it('passes against a toml r2_buckets binding', async () => {
    const toml = `[[r2_buckets]]\nbinding = "MEDIA_BUCKET"\nbucket_name = "m"\n`;
    const result = await configMediaBucket.run(
      ctx({ 'wrangler.toml': toml }, { mediaBucketBinding: 'MEDIA_BUCKET' })
    );
    expect(result.status).toBe('pass');
  });

  it('fails when the adapter binding is absent from wrangler r2_buckets', async () => {
    const result = await configMediaBucket.run(
      ctx({ 'wrangler.jsonc': MEDIA_JSONC }, { mediaBucketBinding: 'OTHER_BUCKET' })
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('OTHER_BUCKET');
    expect(result.detail).toContain('r2_buckets');
  });

  it('reuses the config.bindings-missing condition (no new registry entry)', () => {
    expect(configMediaBucket.conditionId).toBe('config.bindings-missing');
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

  it('reports unchecked when neither svelte.config.js nor vite.config.ts exists', async () => {
    const result = await configCsrfDisable.run(ctx({}));
    expect(result.status).toBe('unchecked');
    expect(result.detail).toContain('svelte.config.js');
    expect(result.detail).toContain('vite.config.ts');
  });

  it('reads the disable off vite.config.ts when svelte.config.js is absent (the bare sv create shape)', async () => {
    const result = await configCsrfDisable.run(
      ctx({ 'vite.config.ts': CSRF_DISABLED, 'src/hooks.server.ts': CAIRN_HOOKS })
    );
    expect(result.status).toBe('pass');
  });

  it('fails, never passes or skips, when both files exist but neither carries the disable', async () => {
    const result = await configCsrfDisable.run(
      ctx({
        'svelte.config.js': 'export default { kit: {} };',
        'vite.config.ts': 'export default { plugins: [] };',
      })
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('heuristic');
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

  it('fails on a stale per-concept content block, pointing to defineConcept (Contract v2)', async () => {
    const yaml = `siteName: Test\ncontent:\n  posts:\n    permalink: /:year/:month/:slug\n`;
    const result = await configSiteConfig.run(ctx({ 'site.config.yaml': yaml }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('defineConcept');
  });

  it('finds the config at the src/lib conventional location', async () => {
    const result = await configSiteConfig.run(ctx({ 'src/lib/site.config.yaml': GOOD_SITE_CONFIG }));
    expect(result.status).toBe('pass');
  });

  it('finds the config at src/theme, where create-cairn-site and the showcase bake it', async () => {
    const result = await configSiteConfig.run(ctx({ 'src/theme/site.config.yaml': GOOD_SITE_CONFIG }));
    expect(result.status).toBe('pass');
  });

  it('reports unchecked when site.config.yaml is absent from every conventional location', async () => {
    const result = await configSiteConfig.run(ctx({}));
    expect(result.status).toBe('unchecked');
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

describe('config.tidy-key', () => {
  const TIDY_ON = `siteName: Test Site\ntidy:\n  enabled: true\n`;
  const TIDY_OFF = `siteName: Test Site\ntidy:\n  enabled: false\n`;
  const KEY_IN_VARS = `{ "vars": { "ANTHROPIC_API_KEY": "sk-test" } }`;
  const KEY_IN_DEV_VARS = `ANTHROPIC_API_KEY = "sk-test"\n`;
  // A referenced-but-unextractable name: keyAppearsIn is true, extractKeyValue finds no literal
  // value (the real deployed-Worker-secret shape: only the NAME shows up locally, never a value).
  const KEY_NAME_ONLY = `{ "vars": { "ANTHROPIC_API_KEY": "" } }`;

  /** A fetch stub answering the Anthropic models probe with the given status, so the active-probe
   *  tests never touch the network. */
  function fetchStub(status: number): typeof fetch {
    return (async () => new Response('{}', { status })) as unknown as typeof fetch;
  }

  /** A fetch stub that rejects, standing in for a network failure (the doctor runs offline, DNS
   *  fails, and so on): the probe must fail soft to 'unknown', never a false 'invalid'. */
  function fetchNetworkFailure(): typeof fetch {
    return (async () => {
      throw new Error('network unreachable');
    }) as unknown as typeof fetch;
  }

  it('skips when no site config is found', async () => {
    const result = await configTidyKey.run(ctx({}));
    expect(result.status).toBe('skip');
  });

  it('skips when tidy is disabled (the key is irrelevant)', async () => {
    const result = await configTidyKey.run(ctx({ 'site.config.yaml': TIDY_OFF }));
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('tidy');
  });

  it('skips when tidy is absent from the config', async () => {
    const result = await configTidyKey.run(ctx({ 'site.config.yaml': GOOD_SITE_CONFIG }));
    expect(result.status).toBe('skip');
  });

  it('fails when tidy is enabled and the key is in neither wrangler vars nor .dev.vars', async () => {
    const result = await configTidyKey.run(
      ctx({ 'site.config.yaml': TIDY_ON, 'wrangler.jsonc': GOOD_JSONC })
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('ANTHROPIC_API_KEY');
    expect(result.detail).toContain('verify');
  });

  it('passes without probing when only the key NAME is referenced (a real Worker secret, no literal value)', async () => {
    const fetchMock = vi.fn(fetchStub(200));
    const result = await configTidyKey.run(
      ctx({ 'site.config.yaml': TIDY_ON, 'wrangler.jsonc': KEY_NAME_ONLY }, { fetch: fetchMock })
    );
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('could not read a literal value');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('actively probes a literal key from a wrangler var and passes when Anthropic accepts it', async () => {
    const fetchMock = vi.fn(fetchStub(200));
    const result = await configTidyKey.run(
      ctx({ 'site.config.yaml': TIDY_ON, 'wrangler.jsonc': KEY_IN_VARS }, { fetch: fetchMock })
    );
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('accepts it');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('api.anthropic.com/v1/models');
    expect((init as { headers: Record<string, string> }).headers['x-api-key']).toBe('sk-test');
  });

  it('actively probes a literal key from .dev.vars and passes when Anthropic accepts it', async () => {
    const fetchMock = vi.fn(fetchStub(200));
    const result = await configTidyKey.run(
      ctx({ 'site.config.yaml': TIDY_ON, '.dev.vars': KEY_IN_DEV_VARS }, { fetch: fetchMock })
    );
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('accepts it');
  });

  it('fails when Anthropic rejects the literal key (401)', async () => {
    const result = await configTidyKey.run(
      ctx({ 'site.config.yaml': TIDY_ON, '.dev.vars': KEY_IN_DEV_VARS }, { fetch: vi.fn(fetchStub(401)) })
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('rejected');
  });

  it('fails when Anthropic rejects the literal key (403)', async () => {
    const result = await configTidyKey.run(
      ctx({ 'site.config.yaml': TIDY_ON, '.dev.vars': KEY_IN_DEV_VARS }, { fetch: vi.fn(fetchStub(403)) })
    );
    expect(result.status).toBe('fail');
  });

  it('fails soft to an unverified pass on a network error, never claiming invalid', async () => {
    const result = await configTidyKey.run(
      ctx({ 'site.config.yaml': TIDY_ON, '.dev.vars': KEY_IN_DEV_VARS }, { fetch: fetchNetworkFailure() })
    );
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('could not reach Anthropic');
  });

  it('fails even when no wrangler config and no .dev.vars exist', async () => {
    const result = await configTidyKey.run(ctx({ 'site.config.yaml': TIDY_ON }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('ANTHROPIC_API_KEY');
  });

  it('carries its own condition id, not borrowing config.bindings-missing', () => {
    expect(configTidyKey.conditionId).toBe('config.tidy-key-missing');
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

describe('auth.role-wiring (the double-wiring check)', () => {
  const CUSTOM_ROLES: RolesDeclaration = {
    owner: 'owner',
    instructor: { capability: 'editor', home: '/admin/schedule' },
  };
  const WIRED_HOOKS = `import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { roles } from './lib/cairn.config';
export const handle = createAuthGuard({ roles });
`;
  const UNWIRED_HOOKS = `import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
export const handle = createAuthGuard();
`;
  // A bare options identifier: the doctor cannot read into it, so it may well carry roles.
  // Failing this would not be a high-confidence positive, so it must skip, not fail.
  const INDIRECT_HOOKS = `import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { guardOpts } from './lib/guard-config';
export const handle = createAuthGuard(guardOpts);
`;

  it('skips when the site declares no custom roles (the default owner/editor pair)', async () => {
    const result = await roleWiring.run(ctx({ 'src/hooks.server.ts': UNWIRED_HOOKS }));
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('no custom roles');
  });

  it('reports info when hooks.server is absent, since the wiring cannot be read', async () => {
    const result = await roleWiring.run(ctx({}, { roles: CUSTOM_ROLES }));
    expect(result.status).toBe('info');
    expect(result.detail).toContain('hooks.server');
  });

  it('reports info when no createAuthGuard call is in the hooks (wrapped in another module)', async () => {
    const wrapped = `export { handle } from './lib/my-guard';\n`;
    const result = await roleWiring.run(
      ctx({ 'src/hooks.server.ts': wrapped }, { roles: CUSTOM_ROLES })
    );
    expect(result.status).toBe('info');
    expect(result.detail).toContain('no createAuthGuard');
  });

  it('reports info (not fail) when the guard is passed a bare options identifier the doctor cannot read', async () => {
    const result = await roleWiring.run(
      ctx({ 'src/hooks.server.ts': INDIRECT_HOOKS }, { roles: CUSTOM_ROLES })
    );
    expect(result.status).toBe('info');
    expect(result.detail).toContain('options object');
    expect(result.detail).toContain('cannot read');
  });

  it('fails when custom roles are declared but the guard is not passed roles', async () => {
    const result = await roleWiring.run(
      ctx({ 'src/hooks.server.ts': UNWIRED_HOOKS }, { roles: CUSTOM_ROLES })
    );
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('instructor');
    expect(result.detail).toContain('roles');
    expect(result.detail).toContain('none capability');
  });

  it('passes when the guard is passed the declared vocabulary', async () => {
    const result = await roleWiring.run(
      ctx({ 'src/hooks.server.ts': WIRED_HOOKS }, { roles: CUSTOM_ROLES })
    );
    expect(result.status).toBe('pass');
  });

  it('reads src/hooks.server.js when the .ts spelling is absent', async () => {
    const result = await roleWiring.run(
      ctx({ 'src/hooks.server.js': UNWIRED_HOOKS }, { roles: CUSTOM_ROLES })
    );
    expect(result.status).toBe('fail');
  });

  it('ties to the auth.role-wiring-missing condition', () => {
    expect(roleWiring.conditionId).toBe('auth.role-wiring-missing');
  });
});

describe('config.no-referrer-blanket (the blanket no-referrer trap)', () => {
  // A site-wide, unconditional write: no pathname guard anywhere near the header set, so the
  // heuristic reads it as blanket.
  const HOOKS_BLANKET = `import type { Handle } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
};
`;

  // The same header, but only for a token-bearing route the site itself scopes.
  const HOOKS_SCOPED = `import type { Handle } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (event.url.pathname.startsWith('/admin')) {
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  return response;
};
`;

  const HOOKS_NO_MENTION = `export const handle = ({ event, resolve }) => resolve(event);\n`;

  const HEADERS_BLANKET = `/*
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
`;

  const HEADERS_SCOPED = `/admin/*
  Referrer-Policy: no-referrer

/*
  X-Frame-Options: DENY
`;

  // A `#` comment interleaved INSIDE a block, between the path line and its header line. Without
  // the comment-skip, this line reads as an un-indented path line and splits the real `/*` block
  // in two, so the header line below attaches to the comment's own bogus block instead and the
  // blanket match on `/*` is lost. A comment merely ABOVE the path line would not discriminate
  // here: it forms its own harmless zero-header block whose path text never matches the
  // catch-all glob, so the real block below it is read correctly either way.
  const HEADERS_BLANKET_WITH_COMMENT = `/*
# generated by @sveltejs/adapter-cloudflare
  Referrer-Policy: no-referrer
`;

  // The catch-all glob written as the pathname of an absolute URL, which Cloudflare also accepts.
  const HEADERS_BLANKET_ABSOLUTE_URL = `https://example.com/*
  Referrer-Policy: no-referrer
`;

  // A comma-separated fallback list resolves to its last token; no-referrer is the effective
  // policy here even though it is not the entire header value.
  const HEADERS_BLANKET_LIST = `/*
  Referrer-Policy: strict-origin, no-referrer
`;

  // no-referrer appears in the list, but not last, so a compliant browser never resolves to it.
  const HEADERS_LIST_NOT_LAST = `/*
  Referrer-Policy: no-referrer, strict-origin-when-cross-origin
`;

  // A block comment merely showing the header in a code sample, not setting it.
  const HOOKS_BLOCK_COMMENT = `import type { Handle } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  /* response.headers.set('Referrer-Policy', 'no-referrer'); */
  return response;
};
`;

  // A line comment warning about the policy, not setting it.
  const HOOKS_LINE_COMMENT = `import type { Handle } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  // response.headers.set('Referrer-Policy', 'no-referrer'); // do not do this site-wide
  return response;
};
`;

  // Scoped with route.id rather than pathname.
  const HOOKS_SCOPED_ROUTE_ID = `import type { Handle } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (event.route.id?.startsWith('/(admin)')) {
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  return response;
};
`;

  // Scoped with url.href rather than pathname.
  const HOOKS_SCOPED_URL_HREF = `import type { Handle } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (event.url.href.includes('/admin')) {
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  return response;
};
`;

  it('fails on a site-wide Referrer-Policy: no-referrer in src/hooks.server.ts, naming Origin: null and the remedy', async () => {
    const result = await configNoReferrerBlanket.run(ctx({ 'src/hooks.server.ts': HOOKS_BLANKET }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('src/hooks.server.ts');
    expect(result.detail).toContain('Origin: null');
    expect(result.detail).toContain('strict-origin-when-cross-origin');
    expect(result.detail).toContain('heuristic');
  });

  it('fails on a site-wide Referrer-Policy: no-referrer in static/_headers, naming Origin: null and the remedy', async () => {
    const result = await configNoReferrerBlanket.run(ctx({ 'static/_headers': HEADERS_BLANKET }));
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('static/_headers');
    expect(result.detail).toContain('Origin: null');
    expect(result.detail).toContain('strict-origin-when-cross-origin');
  });

  it('passes when no-referrer is scoped to a token-bearing route in static/_headers', async () => {
    const result = await configNoReferrerBlanket.run(ctx({ 'static/_headers': HEADERS_SCOPED }));
    expect(result.status).toBe('pass');
  });

  it('passes when no-referrer is scoped to a token-bearing route in src/hooks.server.ts', async () => {
    const result = await configNoReferrerBlanket.run(ctx({ 'src/hooks.server.ts': HOOKS_SCOPED }));
    expect(result.status).toBe('pass');
  });

  it('passes when neither source mentions no-referrer at all', async () => {
    const result = await configNoReferrerBlanket.run(
      ctx({ 'src/hooks.server.ts': HOOKS_NO_MENTION, 'static/_headers': '/*\n  X-Frame-Options: DENY\n' })
    );
    expect(result.status).toBe('pass');
  });

  it('skips, naming both sources and a remedy, when neither src/hooks.server.ts nor static/_headers is readable', async () => {
    const result = await configNoReferrerBlanket.run(ctx({}));
    expect(result.status).toBe('skip');
    expect(result.detail).toContain('src/hooks.server.ts');
    expect(result.detail).toContain('static/_headers');
    expect(result.detail).toContain('strict-origin-when-cross-origin');
    expect(result.detail).toContain('is-it-working.md#scope-a-site-wide-no-referrer-policy');
  });

  it('reads src/hooks.server.js when the .ts spelling is absent', async () => {
    const result = await configNoReferrerBlanket.run(ctx({ 'src/hooks.server.js': HOOKS_BLANKET }));
    expect(result.status).toBe('fail');
  });

  it('names the sources it actually read on a pass', async () => {
    const result = await configNoReferrerBlanket.run(ctx({ 'static/_headers': HEADERS_SCOPED }));
    expect(result.status).toBe('pass');
    expect(result.detail).toContain('read static/_headers');
    expect(result.detail).toContain('src/hooks.server.ts (or .js) not found');
  });

  it('ties to the config.no-referrer-blanket condition', () => {
    expect(configNoReferrerBlanket.conditionId).toBe('config.no-referrer-blanket');
  });

  describe('_headers parser fixes', () => {
    it('fails on a blanket _headers block with a # comment interleaved inside it', async () => {
      const result = await configNoReferrerBlanket.run(
        ctx({ 'static/_headers': HEADERS_BLANKET_WITH_COMMENT })
      );
      expect(result.status).toBe('fail');
    });

    it('fails on a catch-all path written as the pathname of an absolute URL', async () => {
      const result = await configNoReferrerBlanket.run(
        ctx({ 'static/_headers': HEADERS_BLANKET_ABSOLUTE_URL })
      );
      expect(result.status).toBe('fail');
    });

    it('fails when no-referrer is the last token of a comma-separated policy list', async () => {
      const result = await configNoReferrerBlanket.run(ctx({ 'static/_headers': HEADERS_BLANKET_LIST }));
      expect(result.status).toBe('fail');
    });

    it('passes when no-referrer appears in a policy list but is not the last (effective) token', async () => {
      const result = await configNoReferrerBlanket.run(
        ctx({ 'static/_headers': HEADERS_LIST_NOT_LAST })
      );
      expect(result.status).toBe('pass');
    });
  });

  describe('hooks heuristic fixes', () => {
    it('passes when the only no-referrer mention is inside a block comment', async () => {
      const result = await configNoReferrerBlanket.run(
        ctx({ 'src/hooks.server.ts': HOOKS_BLOCK_COMMENT })
      );
      expect(result.status).toBe('pass');
    });

    it('passes when the only no-referrer mention is inside a line comment', async () => {
      const result = await configNoReferrerBlanket.run(
        ctx({ 'src/hooks.server.ts': HOOKS_LINE_COMMENT })
      );
      expect(result.status).toBe('pass');
    });

    it('passes when the header is scoped with route.id rather than pathname', async () => {
      const result = await configNoReferrerBlanket.run(
        ctx({ 'src/hooks.server.ts': HOOKS_SCOPED_ROUTE_ID })
      );
      expect(result.status).toBe('pass');
    });

    it('passes when the header is scoped with url.href rather than pathname', async () => {
      const result = await configNoReferrerBlanket.run(
        ctx({ 'src/hooks.server.ts': HOOKS_SCOPED_URL_HREF })
      );
      expect(result.status).toBe('pass');
    });
  });
});
