// cairn-cms: the bridge from the adapter's backend config and the Worker's secret to the
// App signer's input. One tested place owns the join and the missing-secret failure, so the
// save action stays thin and a misconfigured Worker fails by name, not with a deep
// TypeError. Mirrors requireDb/requireOrigin in env.ts.
import { CairnError } from '../diagnostics/index.js';
import type { CairnEnv } from '../env.js';
import type { AppCredentials } from './types.js';

/**
 * Assemble the `AppCredentials` the signer needs from the GitHub App's identity (app id,
 * installation) and the Worker's private-key secret. Throws a CairnError naming
 * `github.app-unreachable` when the secret is unset, since the App cannot authenticate without it.
 */
export function appCredentials(
  identity: { appId: string; installationId: string },
  env: CairnEnv,
): AppCredentials {
  const privateKeyB64 = env.GITHUB_APP_PRIVATE_KEY_B64;
  if (!privateKeyB64) {
    throw new CairnError('github.app-unreachable', {
      message: 'GITHUB_APP_PRIVATE_KEY_B64 is not configured',
    });
  }
  return { appId: identity.appId, installationId: identity.installationId, privateKeyB64 };
}
