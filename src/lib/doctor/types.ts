// The doctor's check model (diagnostics spec, Arm B). Each check is isolated: no check reads
// another's result. The conditionId ties the check to the registry entry whose why/remediation
// the report prints, keeping the doctor, the runtime errors, and the checklist on one identity.
import type { RolesDeclaration } from '../auth/roles.js';
import type { AiPosture } from '../content/types.js';

type CheckStatus = 'pass' | 'fail' | 'skip' | 'info' | 'unchecked';

export interface CheckResult {
  status: CheckStatus;
  /** One line of evidence ("sending subdomain enabled", "wrangler.jsonc not found"). */
  detail: string;
}

/**
 * A check helper's either-result: the resolved value, or a CheckResult to return from run()
 * as-is. Every ad hoc `{ <payload> } | { fail: CheckResult }` shape a multi-step check builds
 * (resolve a zone, then read one of its settings, then query D1) converges on this one generic
 * instead of a bespoke union per call site, so a caller's `'fail' in x` guard means the same
 * thing everywhere.
 */
export type CheckOutcome<T> = { value: T } | { fail: CheckResult };

/** Result constructors, so a check body reads one outcome per line instead of object literals. */
export function pass(detail: string): CheckResult {
  return { status: 'pass', detail };
}

/**
 * Build a failing check result; `detail` is the one line of evidence the report prints.
 */
export function fail(detail: string): CheckResult {
  return { status: 'fail', detail };
}

/**
 * Build a skipped check result; `detail` names the missing input the check could not run
 * without. `skip` means the check is not applicable at all (an opt-in feature that is off, a
 * role vocabulary with nothing custom to wire); it never gates. Contrast {@link unchecked}, for
 * a check that IS applicable but could not look.
 */
export function skip(detail: string): CheckResult {
  return { status: 'skip', detail };
}

/**
 * Build an informational check result; `detail` carries the finding and, where relevant, its own
 * guidance. `info` covers a heuristic that could not see enough to render a verdict, or a finding
 * that is advisory rather than a deploy blocker. It never gates, the same as {@link skip}, but
 * unlike skip it names something the check actually observed.
 */
export function info(detail: string): CheckResult {
  return { status: 'info', detail };
}

/**
 * Build an unchecked result; `detail` names the input a deterministic check needed and could not
 * read (an absent or unreadable file, a lockfile format none of the readers recognize). Unlike
 * {@link skip}, `unchecked` means the check WOULD have an answer if it could look, so it drives
 * exit 3 rather than passing the run silently.
 */
export function unchecked(detail: string): CheckResult {
  return { status: 'unchecked', detail };
}

export interface DoctorCheck {
  /** Stable id, e.g. 'email.sender-onboarded'. */
  id: string;
  /** The registry condition this check probes; the report prints its remediation on failure. */
  conditionId: string;
  title: string;
  run: (ctx: DoctorContext) => Promise<CheckResult>;
}

/** Everything a check may read, resolved once by the bin. Absent fields make checks skip. */
export interface DoctorContext {
  /** The site directory the doctor runs in. */
  cwd: string;
  /** The from-address (--from / CAIRN_FROM). */
  from?: string;
  /** owner/name (--repo / GITHUB_REPO). */
  repo?: string;
  /** CLOUDFLARE_API_TOKEN. */
  cfToken?: string;
  /** CLOUDFLARE_ACCOUNT_ID. */
  cfAccountId?: string;
  /** PUBLIC_ORIGIN, the env fallback when the wrangler vars carry none. */
  publicOrigin?: string;
  /**
   * The adapter's media bucket binding (cairn.assets.bucketBinding), derived off the adapter.
   *  Undefined when the site declares no media assets; the media-bucket check skips in that case.
   */
  mediaBucketBinding?: string;
  /** GITHUB_APP_ID / GITHUB_APP_INSTALLATION_ID / GITHUB_APP_PRIVATE_KEY_B64. */
  github?: { appId: string; installationId: string; privateKeyB64: string };
  /**
   * The site's declared role vocabulary, derived off the adapter's `roles` field the same way
   *  `mediaBucketBinding` is derived. Undefined for a zero-config site, in which case the
   *  vocabulary-aware checks fall back to the implicit owner/editor pair.
   */
  roles?: RolesDeclaration;
  /**
   * The site's stated AI-crawler posture, derived off the adapter's `aiPosture` field the same
   *  way `roles` is derived. Undefined when the site states no posture; the live posture check
   *  reports that absence rather than skipping.
   */
  aiPosture?: AiPosture;
  /** Injected fetch for tests; defaults to global fetch. */
  fetch: typeof fetch;
  /** Read a file under cwd, or null when absent. Injected for tests. */
  readFile: (relPath: string) => Promise<string | null>;
}
