// GET /healthz, a site-root route outside /admin. Signs a dummy JWT through the real App-signing
// path so a broken PKCS#1-to-PKCS#8 conversion is caught early (spec §7.8). The payload is
// pass/fail, a coarse detail, and the public key's fingerprint only; it never carries the key or a
// token. With `?live=1` it also mints one installation token to prove GitHub accepts the key,
// bounded per isolate so an anonymous caller cannot turn the route into a token-minting loop.
import { InstallationTokenError, installationToken, signingSelfTest } from '../github/signing.js';
import { isGithubApp } from '../github/backend.js';
import type { AppCredentials } from '../github/types.js';
import { log } from '../log/index.js';
import type { GithubTokenCheckReason } from '../log/events.js';
import type { CairnRuntime } from '../content/types.js';
import type { CairnEvent } from './types.js';
import { env, waitUntil } from './workers-env.js';

/** The `/healthz` payload. */
export interface HealthData {
  /** The signing check's result, and the live token check's when the request asked for one. */
  ok: boolean;
  checks: {
    /** The offline signing self-test, with the public key's `SHA256:` fingerprint when it passes. */
    githubAppSigning: { ok: boolean; detail?: string; fingerprint?: string };
    /**
     * The live installation-token mint, present only on a `?live=1` request that had a GitHub App
     * and a key to mint with. A failure's `detail` is `key_refused`, `installation_not_found`,
     * `installation_suspended`, or `unreachable`.
     */
    githubAppToken?: { ok: boolean; detail?: string };
  };
}

/** One live token check's outcome; `detail` names the failure class and is absent on success. */
type TokenCheck = { ok: boolean; detail?: GithubTokenCheckReason };

/** A timer a live check races its mint against. `clear` releases it once the race is decided. */
export interface CheckTimer {
  readonly fired: Promise<void>;
  clear(): void;
}

/** The time source a live check reads: the current time in milliseconds, and a one-shot timer. */
export interface CheckClock {
  now(): number;
  timer(ms: number): CheckTimer;
}

const realClock: CheckClock = {
  now: () => Date.now(),
  timer(ms) {
    let id: ReturnType<typeof setTimeout> | undefined;
    const fired = new Promise<void>((resolve) => {
      id = setTimeout(resolve, ms);
    });
    return { fired, clear: () => clearTimeout(id) };
  },
};

/** How long a settled verdict answers every later live call in the isolate. */
const VERDICT_TTL_MS = 60_000;

/** The mint's own abort deadline, each caller's wait, and the age at which an in-flight slot is dead. */
const MINT_TIMEOUT_MS = 5_000;

const UNREACHABLE: TokenCheck = { ok: false, detail: 'unreachable' };

/** Map a failed mint onto its class. Total: anything that is not a 401, 403, or 404 is unreachable. */
function classifyMintFailure(error: unknown): GithubTokenCheckReason {
  if (error instanceof InstallationTokenError) {
    if (error.status === 401) return 'key_refused';
    if (error.status === 404) return 'installation_not_found';
    if (error.status === 403) return 'installation_suspended';
  }
  return 'unreachable';
}

/**
 * Mint one installation token straight from the key, never through the shared token cache, and
 * discard it: the check needs only whether GitHub issued one.
 */
async function mintOnce(creds: AppCredentials): Promise<TokenCheck> {
  try {
    await installationToken(creds, AbortSignal.timeout(MINT_TIMEOUT_MS));
    return { ok: true };
  } catch (error) {
    const reason = classifyMintFailure(error);
    log.warn('github.unreachable', { scope: 'health', reason });
    return { ok: false, detail: reason };
  }
}

interface InstallationState {
  verdict?: { result: TokenCheck; at: number };
  slot?: { promise: Promise<TokenCheck>; startedAt: number };
}

/**
 * Build the per-isolate live token check. Parallel callers share one in-flight mint, and a settled
 * mint's verdict answers every caller for the next minute, so the route mints at most once per
 * isolate per minute however often it is asked.
 *
 * Sharing an in-flight promise is safe here only because no caller waits on it unbounded. Under
 * workerd a request's subrequests are canceled once its response completes, which can leave the
 * shared mint's promise never settling. Each caller therefore races it against a timer created in
 * its own request and reads `unreachable` when the timer wins; a slot at or past the timeout counts
 * as empty, so the next caller starts a fresh mint; and only the mint's own settlement writes the
 * verdict or clears the slot, so a caller giving up never caches a guess. The starter hands the mint
 * to `keepAlive` so a settled verdict outlives the starter's response.
 */
export function createLiveTokenCheck(
  clock: CheckClock = realClock,
  keepAlive: (promise: Promise<unknown>) => void = waitUntil,
): (creds: AppCredentials) => Promise<TokenCheck> {
  const states = new Map<string, InstallationState>();
  return async function check(creds: AppCredentials): Promise<TokenCheck> {
    const key = `${creds.appId}/${creds.installationId}`;
    let state = states.get(key);
    if (!state) {
      state = {};
      states.set(key, state);
    }
    const now = clock.now();
    if (state.verdict && now - state.verdict.at < VERDICT_TTL_MS) return state.verdict.result;
    let slot = state.slot;
    if (!slot || now - slot.startedAt >= MINT_TIMEOUT_MS) {
      const owner = state;
      const started: NonNullable<InstallationState['slot']> = {
        promise: mintOnce(creds).then((result) => {
          owner.verdict = { result, at: clock.now() };
          if (owner.slot === started) owner.slot = undefined;
          return result;
        }),
        startedAt: now,
      };
      state.slot = started;
      keepAlive(started.promise);
      slot = started;
    }
    const timer = clock.timer(MINT_TIMEOUT_MS);
    try {
      return await Promise.race([slot.promise, timer.fired.then(() => UNREACHABLE)]);
    } finally {
      timer.clear();
    }
  };
}

const liveTokenCheck = createLiveTokenCheck();

/**
 * Run the signing self-test against the configured App id and the Worker's key secret. The self-test
 * is GitHub-specific, so it narrows the provider on `kind === 'github-app'` for the App id; a
 * non-GitHub backend reports the check as `not-applicable` and passing.
 *
 * A request carrying `?live=1` also mints one installation token from the key and reports whether
 * GitHub issued it, so `ok` proves GitHub accepts the key rather than only that the key signs. The
 * mint runs only when there is a GitHub App, a key, and a passing signing check to mint with;
 * otherwise the payload leaves `githubAppToken` out, since a missing or unusable key is the signing
 * check's finding and not GitHub's. The plain call makes no network call.
 */
export async function loadHealth(event: CairnEvent, runtime: CairnRuntime): Promise<HealthData> {
  const key = env.GITHUB_APP_PRIVATE_KEY_B64;
  const provider = runtime.backend;
  let githubAppSigning: HealthData['checks']['githubAppSigning'];
  if (!isGithubApp(provider)) githubAppSigning = { ok: true, detail: 'not-applicable' };
  else if (!key) githubAppSigning = { ok: false, detail: 'GITHUB_APP_PRIVATE_KEY_B64 is not configured' };
  else githubAppSigning = await signingSelfTest(provider.appId, key);
  const checks: HealthData['checks'] = { githubAppSigning };
  if (event.url.searchParams.get('live') === '1' && isGithubApp(provider) && key && githubAppSigning.ok) {
    checks.githubAppToken = await liveTokenCheck({
      appId: provider.appId,
      installationId: provider.installationId,
      privateKeyB64: key,
    });
  }
  return { ok: githubAppSigning.ok && (checks.githubAppToken?.ok ?? true), checks };
}
