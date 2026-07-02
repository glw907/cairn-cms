// The doctor's local-config checks: the wrangler bindings, the observability sink, the
// svelte.config CSRF handoff, the site-config validation, and the public origin. Every read
// goes through the injected ctx.readFile, so the tests pass fixtures and the bin passes node:fs.
import { fail, pass, skip } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { readWranglerConfig } from './wrangler-config.js';
import { requireOrigin } from '../env.js';
import { parseSiteConfig } from '../nav/site-config.js';
import type { SiteConfig } from '../nav/site-config.js';

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

// The R2 media bucket is never added to the hard config.bindings check, so a no-media site never
// fails on a missing media binding (decision 9). This conditional runs only when the adapter
// declares assets, matching the adapter's bucketBinding against wrangler's r2_buckets. It reuses the
// config.bindings-missing condition rather than registering a new one, so the readiness count holds.
export const configMediaBucket: DoctorCheck = {
  id: 'config.media-bucket',
  conditionId: 'config.bindings-missing',
  title: 'Media bucket binding',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    const binding = ctx.mediaBucketBinding;
    if (binding === undefined) return skip('no media assets configured');
    const facts = await readWranglerConfig(ctx.readFile);
    if (facts === null) return NO_WRANGLER;
    if (!facts.r2Buckets.includes(binding)) {
      return fail(
        `adapter declares media bucket ${binding} but no matching r2_buckets binding is in wrangler`
      );
    }
    return pass(`media bucket ${binding} is declared`);
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

export const configPublicOrigin: DoctorCheck = {
  id: 'config.public-origin',
  conditionId: 'config.public-origin-invalid',
  title: 'Public origin',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    // The wrangler vars hold the value the deployed Worker reads, so they beat the local
    // environment; the env fallback covers a dashboard-set var the file never carries.
    const facts = await readWranglerConfig(ctx.readFile);
    const fromVars = facts?.publicOrigin;
    const origin = fromVars ?? ctx.publicOrigin;
    if (facts === null && origin === undefined) {
      return skip('no wrangler config found and PUBLIC_ORIGIN is not in the environment');
    }
    // requireOrigin is the runtime rule (unset, not a URL, http off localhost); reusing it
    // keeps the doctor and the Worker on one judgment.
    try {
      requireOrigin({ PUBLIC_ORIGIN: origin });
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
    const source = fromVars !== undefined ? 'wrangler vars' : 'environment';
    return pass(`PUBLIC_ORIGIN is ${origin} (${source})`);
  },
};

// Where sites keep site.config.yaml. The adapter's configPath is TypeScript the CLI cannot
// evaluate, so the check probes the conventional spots instead (the repo root and the two
// src locations the production sites use).
const SITE_CONFIG_PATHS = ['site.config.yaml', 'src/lib/site.config.yaml', 'src/site.config.yaml'];

// Read the first site.config.yaml that exists in a conventional spot, or null when none does.
async function readSiteConfigText(ctx: DoctorContext): Promise<string | null> {
  for (const path of SITE_CONFIG_PATHS) {
    const text = await ctx.readFile(path);
    if (text !== null) return text;
  }
  return null;
}

export const configSiteConfig: DoctorCheck = {
  id: 'config.site-config',
  conditionId: 'config.site-config-invalid',
  title: 'Site config',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    const text = await readSiteConfigText(ctx);
    if (text === null) return skip(`no site.config.yaml found (looked in ${SITE_CONFIG_PATHS.join(', ')})`);
    try {
      // Parse-only. parseSiteConfig validates the root shape and, since Contract v2, hard-errors on a
      // stale per-concept `content:` block (URL policy moved onto defineConcept). The per-concept URL
      // policy is now validated at the concept declaration, which a CLI cannot reach without the adapter.
      parseSiteConfig(text);
      return pass('parsed (per-concept URL policy lives on the adapter concepts, not checkable from the CLI)');
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  },
};

// A site enables tidy with `tidy.enabled: true` in the committed config; ignore a config the rest of
// the doctor reports through configSiteConfig, so a parse error here just skips rather than doubling
// the failure.
function tidyEnabled(text: string): boolean {
  let config: SiteConfig;
  try {
    config = parseSiteConfig(text);
  } catch {
    return false;
  }
  return config.tidy?.enabled === true;
}

// The Anthropic key is a Worker secret, so the doctor cannot prove it is unset (it is in neither the
// committed wrangler config nor anything readFile reaches). It CAN read the two spots a key would also
// appear if set as a plain var: the wrangler config text and .dev.vars. A bare presence-by-name read
// is enough for the heuristic; the runtime fail(503) and --probe are the real truth checks.
function keyAppearsIn(text: string | null): boolean {
  return text !== null && text.includes('ANTHROPIC_API_KEY');
}

// The tidy secret heuristic. It reuses the config.bindings-missing condition rather than registering a
// new one, so the readiness count holds (the same pattern configMediaBucket uses). A warn here is not a
// definitive unset claim: it asks the operator to verify the secret, since a wrangler secret is
// invisible to the CLI.
export const configTidyKey: DoctorCheck = {
  id: 'config.tidy-key',
  conditionId: 'config.bindings-missing',
  title: 'Tidy API key',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    const text = await readSiteConfigText(ctx);
    if (text === null) return skip('no site.config.yaml found, so tidy enablement is unknown');
    if (!tidyEnabled(text)) return skip('tidy is not enabled in the site config');
    const wrangler =
      (await ctx.readFile('wrangler.jsonc')) ?? (await ctx.readFile('wrangler.toml'));
    if (keyAppearsIn(wrangler)) {
      return pass('ANTHROPIC_API_KEY appears in the wrangler vars (verify it is the real key, not a placeholder)');
    }
    const devVars = await ctx.readFile('.dev.vars');
    if (keyAppearsIn(devVars)) {
      return pass('ANTHROPIC_API_KEY appears in .dev.vars (the local override; verify the Worker secret is set for production)');
    }
    return fail(
      'tidy is enabled but ANTHROPIC_API_KEY is in neither the wrangler vars nor .dev.vars; verify the secret is configured with wrangler secret put ANTHROPIC_API_KEY'
    );
  },
};

// The candidate files of the four-file /admin mount. There is no directory listing in
// DoctorContext, so the check reads these known paths; a route file can be .ts or .js, so both
// spellings are probed. Whatever exists is concatenated and scanned for the two mount signals.
const ADMIN_MOUNT_PATHS = [
  'src/routes/admin/+layout.server.ts',
  'src/routes/admin/+layout.server.js',
  'src/routes/admin/+layout.svelte',
  'src/routes/admin/[...path]/+page.server.ts',
  'src/routes/admin/[...path]/+page.server.js',
  'src/routes/admin/[...path]/+page.svelte',
];

// The one-line guidance the skip carries: the expected files plus the fix. It also seeds the
// admin.mount-incomplete condition's remediation, kept here so the skip detail reads on its own.
const ADMIN_MOUNT_GUIDANCE =
  'no wired /admin mount detected; mount the shared /admin/+layout that renders CairnAdminShell and calls createCairnAdmin(runtime).shellLoad, and the /admin/[...path] catch-all rendering CairnAdmin';

// The mount-shape heuristic, loose like wiresCairnGuard above so a renamed or wrapped composer
// still reads as wired. A shellLoad member-access on ANY identifier (not a literal admin.shellLoad)
// proves the layout calls the composer's load; a CairnAdminShell mention anywhere under /admin
// proves the shared chrome renders. Both signals together is a pass; neither is a skip-with-guidance.
function wiresAdminShell(text: string): boolean {
  return /CairnAdminShell/.test(text);
}

function callsShellLoad(text: string): boolean {
  return /\.\s*shellLoad\b/.test(text);
}

// Read every candidate mount file that exists and join their bodies, so the two signals can be
// found across whichever files the site keeps them in.
async function readAdminMountText(ctx: DoctorContext): Promise<string | null> {
  const bodies: string[] = [];
  for (const path of ADMIN_MOUNT_PATHS) {
    const text = await ctx.readFile(path);
    if (text !== null) bodies.push(text);
  }
  return bodies.length ? bodies.join('\n') : null;
}

// A best-effort, non-blocking nudge: it never returns fail. A fail is a hard exit-1 deploy gate
// (runDoctor exits 1 on any fail regardless of severity), so a warning-severity heuristic that
// could not see an unconventionally-wired site must skip-with-guidance, never go falsely red. A
// pass needs both the shellLoad call and the CairnAdminShell render across the mount files.
export const adminMountShape: DoctorCheck = {
  id: 'admin.mount-shape',
  conditionId: 'admin.mount-incomplete',
  title: 'Custom /admin mount',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    const text = await readAdminMountText(ctx);
    if (text === null) return skip(ADMIN_MOUNT_GUIDANCE);
    if (callsShellLoad(text) && wiresAdminShell(text)) {
      return pass('the /admin mount wires shellLoad and renders CairnAdminShell (heuristic text read)');
    }
    return skip(ADMIN_MOUNT_GUIDANCE);
  },
};
