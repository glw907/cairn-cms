// cairn-doctor's assembly: the flag parser, the context builder, and the default check
// registry, all pure functions so the bin shell stays a thin wrapper like cairn-manifest's.
// The module is internal; no public subpath exports it, and index.ts's barrel plus the bin
// are its only consumers.
import type { DoctorCheck, DoctorContext } from './types.js';
import {
  configBindings,
  configMediaBucket,
  configObservability,
  configCsrfDisable,
  configSiteConfig,
  configPublicOrigin,
  configTidyKey,
  adminMountShape,
} from './checks-local.js';
import { configDependencyFloors } from './check-floors.js';
import { emailSenderOnboarded, edgeHttpsForced, edgeHsts, authStore } from './checks-cloudflare.js';
import { githubApp } from './checks-github.js';

const USAGE =
  'Usage: cairn-doctor [--from <address>] [--repo <owner/name>] [--send-test <address>] [--probe [url]]';

export interface DoctorArgs {
  from?: string;
  repo?: string;
  sendTest?: string;
  /**
   * The live admin probe: a URL when --probe carried one, true for the bare flag (probe the
   *  PUBLIC_ORIGIN input), absent when the flag never appeared (the probe does not run).
   */
  probe?: string | true;
}

const FLAGS: Record<string, 'from' | 'repo' | 'sendTest'> = {
  '--from': 'from',
  '--repo': 'repo',
  '--send-test': 'sendTest',
};

/** Parse the bin's argv (long flags only). Throws with a usage line on anything unexpected. */
export function parseArgs(argv: string[]): DoctorArgs {
  const args: DoctorArgs = {};
  for (let i = 0; i < argv.length; ) {
    const flag = argv[i];
    // --probe alone is meaningful (probe the PUBLIC_ORIGIN input), so its value is optional.
    if (flag === '--probe') {
      const value = argv[i + 1];
      const bare = value === undefined || value.startsWith('--');
      args.probe = bare ? true : value;
      i += bare ? 1 : 2;
      continue;
    }
    const key = FLAGS[flag];
    if (!key) throw new Error(`unknown argument ${flag}\n${USAGE}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} needs a value\n${USAGE}`);
    }
    args[key] = value;
    i += 2;
  }
  return args;
}

/**
 * Build the doctor's context from the environment and the parsed flags. A flag beats its env
 * variable, and github assembles only when the whole credential trio is present, so the GitHub
 * check skips with one remediation line instead of failing on a partial setup. fetch and
 * readFile stay with the bin, which injects the real ones.
 */
export function contextFromEnv(
  env: Record<string, string | undefined>,
  args: DoctorArgs,
  cwd: string
): Omit<DoctorContext, 'fetch' | 'readFile'> {
  const { GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY_B64 } = env;
  return {
    cwd,
    from: args.from ?? env.CAIRN_FROM,
    repo: args.repo ?? env.GITHUB_REPO,
    cfToken: env.CLOUDFLARE_API_TOKEN,
    cfAccountId: env.CLOUDFLARE_ACCOUNT_ID,
    publicOrigin: env.PUBLIC_ORIGIN,
    github:
      GITHUB_APP_ID && GITHUB_APP_INSTALLATION_ID && GITHUB_APP_PRIVATE_KEY_B64
        ? {
            appId: GITHUB_APP_ID,
            installationId: GITHUB_APP_INSTALLATION_ID,
            privateKeyB64: GITHUB_APP_PRIVATE_KEY_B64,
          }
        : undefined,
  };
}

/**
 * The lazy derivation sources the bin wires up: the adapter read through the consumer's own
 *  Vite resolution and the wrangler config's account_id. Each runs only when an input it feeds
 *  is still missing, so a doctor run with full flags touches neither.
 */
export interface DerivationSources {
  /**
   * Returns `{ owner, repo, from, mediaBucketBinding }` off the adapter, or null when nothing is
   *  derivable.
   */
  adapterFacts: () => Promise<{
    owner?: string;
    repo?: string;
    from?: string;
    mediaBucketBinding?: string;
  } | null>;
  /** Returns the wrangler config's account_id, or undefined when none is declared. */
  wranglerAccountId: () => Promise<string | undefined>;
}

/**
 * Fill the context's missing inputs from the repo the doctor runs in: from and repo off the
 * adapter, the account id off the wrangler config. An explicit flag or env value always wins
 * (contextFromEnv already resolved those into ctx), each source runs lazily and only for
 * inputs still missing, and a derivation failure leaves the input absent so its check skips
 * with the usual remediation line instead of the doctor crashing. The API token is never
 * derived; it stays env-only.
 */
export async function deriveMissingInputs(
  ctx: Omit<DoctorContext, 'fetch' | 'readFile'>,
  sources: DerivationSources
): Promise<Omit<DoctorContext, 'fetch' | 'readFile'>> {
  const out = { ...ctx };
  // The adapter read also carries the media bucket binding, which has no env source, so it runs
  // when from, repo, or the media binding is still missing. A failure leaves each input absent so
  // its check skips with the usual remediation rather than the doctor crashing.
  if (
    out.from === undefined ||
    out.repo === undefined ||
    out.mediaBucketBinding === undefined
  ) {
    const facts = await sources.adapterFacts().catch(() => null);
    if (out.from === undefined && typeof facts?.from === 'string') {
      out.from = facts.from;
    }
    if (
      out.repo === undefined &&
      typeof facts?.owner === 'string' &&
      typeof facts?.repo === 'string'
    ) {
      out.repo = `${facts.owner}/${facts.repo}`;
    }
    if (out.mediaBucketBinding === undefined && typeof facts?.mediaBucketBinding === 'string') {
      out.mediaBucketBinding = facts.mediaBucketBinding;
    }
  }
  if (out.cfAccountId === undefined) {
    const accountId = await sources.wranglerAccountId().catch(() => undefined);
    if (typeof accountId === 'string') out.cfAccountId = accountId;
  }
  return out;
}

/**
 * The default registry: the local config checks, the four Cloudflare checks, and the GitHub App
 * chain. The live send is opt-in (--send-test) and never sits here; the bin appends it. A
 * fresh array per call, so that append mutates nothing shared.
 */
export function defaultChecks(): DoctorCheck[] {
  return [
    configBindings,
    configMediaBucket,
    configObservability,
    configCsrfDisable,
    configSiteConfig,
    configPublicOrigin,
    configTidyKey,
    adminMountShape,
    configDependencyFloors,
    emailSenderOnboarded,
    edgeHttpsForced,
    edgeHsts,
    authStore,
    githubApp,
  ];
}
