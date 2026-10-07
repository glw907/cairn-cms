// GET /admin/healthz. Signs a dummy JWT through the real App-signing path so a broken
// PKCS#1-to-PKCS#8 conversion is caught early (spec §7.8). The payload is pass/fail and a
// coarse detail only; it never carries the key or a token.
import { signingSelfTest } from '../github/signing.js';
import { isGithubApp } from '../github/backend.js';
import type { CairnRuntime } from '../content/types.js';
import type { CairnEvent } from './types.js';
import { env } from './workers-env.js';

/** The `/admin/healthz` payload. */
export interface HealthData {
  ok: boolean;
  checks: { githubAppSigning: { ok: boolean; detail?: string } };
}

/**
 * Run the signing self-test against the configured App id and the Worker's key secret. The self-test
 * is GitHub-specific, so it narrows the provider on `kind === 'github-app'` for the App id; a
 * non-GitHub backend skips the signing check.
 *
 * Takes the {@link CairnEvent} the health route serves; the key itself is read from the Worker env,
 * so the event carries nothing this check reads today.
 */
export async function loadHealth(event: CairnEvent, runtime: CairnRuntime): Promise<HealthData> {
  const key = env.GITHUB_APP_PRIVATE_KEY_B64;
  const provider = runtime.backend;
  const githubAppSigning =
    isGithubApp(provider) && key
      ? await signingSelfTest(provider.appId, key)
      : { ok: false, detail: 'GITHUB_APP_PRIVATE_KEY_B64 is not configured' };
  return { ok: githubAppSigning.ok, checks: { githubAppSigning } };
}
