// The doctor's local-config checks: the wrangler bindings, the observability sink, the
// svelte.config CSRF handoff, the site-config validation, and the public origin. Every read
// goes through the injected ctx.readFile, so the tests pass fixtures and the bin passes node:fs.
import { fail, pass, skip } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { readWranglerConfig } from './wrangler-config.js';
import { requireOrigin } from '../env.js';
import { parseSiteConfig } from '../nav/site-config.js';
import type { SiteConfig } from '../nav/site-config.js';
import { DEFAULT_ROLES } from '../auth/roles.js';

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
// is enough to know the name is referenced somewhere.
function keyAppearsIn(text: string | null): boolean {
  return text !== null && text.includes('ANTHROPIC_API_KEY');
}

// Pull a literal ANTHROPIC_API_KEY value out of a plain-var file (.dev.vars' KEY=value lines, or a
// wrangler vars entry shaped ANTHROPIC_API_KEY: "value" / ANTHROPIC_API_KEY = "value"). Undefined
// when the name is absent or the value cannot be isolated (a Worker secret is invisible to any of
// this, by design), matching keyAppearsIn's fallback presence check.
function extractKeyValue(text: string | null): string | undefined {
  if (text === null) return undefined;
  const match = /ANTHROPIC_API_KEY["']?\s*[:=]\s*"?([^"\s,}]+)"?/.exec(text);
  return match?.[1];
}

// The zero-token key-health probe (save-500-honest-errors, Task 5), a raw fetch against the models
// endpoint mirroring the doctor's own githubApp check idiom (checks-github.ts): a real live call
// through ctx.fetch, never the SDK, so a test's fetch stub stands in with no real network or key.
// A 401/403 confirms the key is invalid; any other failure (network, DNS, a non-2xx the API never
// returns for a bad key) fails soft to 'unknown' rather than a false claim of invalid.
async function probeAnthropicKey(fetchImpl: typeof fetch, apiKey: string): Promise<'valid' | 'invalid' | 'unknown'> {
  try {
    const res = await fetchImpl('https://api.anthropic.com/v1/models?limit=1', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    });
    if (res.status === 401 || res.status === 403) return 'invalid';
    return res.ok ? 'valid' : 'unknown';
  } catch {
    return 'unknown';
  }
}

// The tidy secret check. It reuses the config.bindings-missing condition rather than registering a
// new one, so the readiness count holds (the same pattern configMediaBucket uses). Presence alone
// stopped being the bar (save-500-honest-errors, Task 5): when a literal value is readable locally
// (the common `.dev.vars` case, or an unusual literal wrangler var), the doctor actively verifies it
// against Anthropic and reports valid/invalid distinctly, the same live-network posture as the
// GitHub App check; when only the NAME is referenced (a real deployed Worker secret, invisible to
// this CLI), it still passes but says so honestly rather than claiming verification it cannot do.
export const configTidyKey: DoctorCheck = {
  id: 'config.tidy-key',
  conditionId: 'config.bindings-missing',
  title: 'Tidy API key',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    const text = await readSiteConfigText(ctx);
    if (text === null) return skip('no site.config.yaml found, so tidy enablement is unknown');
    if (!tidyEnabled(text)) return skip('tidy is not enabled in the site config');

    const wrangler = (await ctx.readFile('wrangler.jsonc')) ?? (await ctx.readFile('wrangler.toml'));
    const devVars = await ctx.readFile('.dev.vars');
    const key = extractKeyValue(devVars) ?? extractKeyValue(wrangler);

    if (key === undefined) {
      if (keyAppearsIn(wrangler) || keyAppearsIn(devVars)) {
        return pass(
          'ANTHROPIC_API_KEY is referenced, but the doctor could not read a literal value locally to verify it (a Worker secret is invisible to the CLI); verify with wrangler secret put or --probe against a deployed admin'
        );
      }
      return fail(
        'tidy is enabled but ANTHROPIC_API_KEY is in neither the wrangler vars nor .dev.vars; verify the secret is configured with wrangler secret put ANTHROPIC_API_KEY'
      );
    }

    const status = await probeAnthropicKey(ctx.fetch, key);
    if (status === 'valid') return pass('ANTHROPIC_API_KEY is present and Anthropic accepts it');
    if (status === 'invalid') {
      return fail('ANTHROPIC_API_KEY is present but Anthropic rejected it (401/403); it may be revoked or mistyped');
    }
    return pass('ANTHROPIC_API_KEY is present, but the doctor could not reach Anthropic to verify it (a network error); this is not a failure, just unverified');
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

// The double-wiring failure this catches: a site declares a role vocabulary on its adapter with
// defineRoles, but forgets the second half of the wiring, createAuthGuard({ roles }) in
// src/hooks.server.ts. The running guard then falls back to the implicit owner/editor pair, and
// every editor whose role is outside that pair resolves to `none` capability (verified: an
// undeclared role resolves to none, not owner). The auth.role-vocabulary check cannot see this,
// because the editor rows still match the *declared* vocabulary; the divergence is between the
// declaration and the guard's own construction, which only the hooks source reveals.
//
// What the doctor can see: the declared vocabulary (ctx.roles, derived off the adapter) and the
// hooks source via readFile. What it cannot see: the guard object the runtime actually builds. So
// this reads the nearest observable proxy, the createAuthGuard call in the conventional hooks file,
// the same heuristic-text stance configCsrfDisable takes. The residual gap: a site that wraps the
// guard in another module, builds the roles argument dynamically, or passes a bare options
// identifier the doctor cannot read into (createAuthGuard(guardOpts)) reads as 'absent' or
// 'indirect' and skips rather than failing, so a positive fail is high-confidence and a miss is a
// skip, never a false red.

// The role names a site declares beyond the implicit owner/editor pair. These are exactly the roles
// a guard on the default fallback would resolve to `none`, so they are what makes the wiring matter.
function customRoleNames(roles: DoctorContext['roles']): string[] {
  if (roles === undefined) return [];
  return Object.keys(roles).filter((name) => !Object.hasOwn(DEFAULT_ROLES, name));
}

// Read the createAuthGuard call in the hooks text and report whether it is passed a roles argument.
// 'absent' when no direct createAuthGuard call is found (wrapped or renamed elsewhere). 'indirect'
// when the call's argument is a bare reference the doctor cannot read into, such as
// createAuthGuard(guardOpts): that object may well carry roles, so failing it would not be a
// high-confidence positive. Both cases skip rather than fail. The non-greedy capture takes the
// call's own argument list; a `roles` word inside it is the wiring signal, and an object literal
// (a `{` in the capture) is what makes the argument readable at all.
function guardRoleWiring(text: string): 'wired' | 'unwired' | 'indirect' | 'absent' {
  const match = /createAuthGuard\s*\(([\s\S]*?)\)/.exec(text);
  if (!match) return 'absent';
  const args = match[1].trim();
  if (/\broles\b/.test(args)) return 'wired';
  if (args !== '' && !args.includes('{')) return 'indirect';
  return 'unwired';
}

export const roleWiring: DoctorCheck = {
  id: 'auth.role-wiring',
  conditionId: 'auth.role-wiring-missing',
  title: 'Guard role wiring',
  async run(ctx: DoctorContext): Promise<CheckResult> {
    const custom = customRoleNames(ctx.roles);
    if (custom.length === 0) {
      return skip('no custom roles declared; the guard fallback owner/editor already matches the vocabulary');
    }
    const hooks =
      (await ctx.readFile('src/hooks.server.ts')) ?? (await ctx.readFile('src/hooks.server.js'));
    if (hooks === null) {
      return skip('src/hooks.server.ts not found, so the guard role wiring cannot be checked');
    }
    const wiring = guardRoleWiring(hooks);
    if (wiring === 'absent') {
      return skip(
        'no createAuthGuard call found in src/hooks.server.ts (heuristic text read); the guard may be wired in another module'
      );
    }
    if (wiring === 'indirect') {
      return skip(
        'createAuthGuard is passed an options object the doctor cannot read (heuristic text read); verify the guard receives the declared roles'
      );
    }
    if (wiring === 'unwired') {
      return fail(
        `the adapter declares custom role(s) ${custom.join(', ')} but createAuthGuard in src/hooks.server.ts is not passed { roles }; the running guard falls back to owner/editor and resolves those roles to none capability (heuristic text read)`
      );
    }
    return pass('createAuthGuard is passed the declared role vocabulary (heuristic text read)');
  },
};
