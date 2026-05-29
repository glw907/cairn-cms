// GET /admin/healthz. Signs a dummy JWT through the real App-signing path so a broken
// PKCS#1-to-PKCS#8 conversion is caught early (spec §7.8). The payload is pass/fail and a
// coarse detail only; it never carries the key or a token.
import { signingSelfTest } from '../github/signing.js';
import type { CairnRuntime } from '../content/types.js';
import type { GithubKeyEnv } from '../github/credentials.js';

/** The `/admin/healthz` payload. */
export interface HealthData {
  ok: boolean;
  checks: { githubAppSigning: { ok: boolean; detail?: string } };
}

/** Run the signing self-test against the configured App id and the Worker's key secret. */
export async function healthLoad(
  event: { platform?: { env?: GithubKeyEnv } },
  runtime: CairnRuntime,
): Promise<HealthData> {
  const key = event.platform?.env?.GITHUB_APP_PRIVATE_KEY_B64;
  const githubAppSigning = key
    ? await signingSelfTest(runtime.backend.appId, key)
    : { ok: false, detail: 'GITHUB_APP_PRIVATE_KEY_B64 is not configured' };
  return { ok: githubAppSigning.ok, checks: { githubAppSigning } };
}
