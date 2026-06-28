import { describe, it, expect } from 'vitest';
import { appCredentials } from '../../lib/github/credentials.js';
import { CairnError } from '../../lib/diagnostics/index.js';

const backend = {
  appId: '3847496',
  installationId: '135372268',
};

describe('appCredentials', () => {
  it('assembles AppCredentials from the App identity and the key secret', () => {
    const creds = appCredentials(backend, { GITHUB_APP_PRIVATE_KEY_B64: 'a2V5' });
    expect(creds).toEqual({ appId: '3847496', installationId: '135372268', privateKeyB64: 'a2V5' });
  });

  it('throws a named error when the key secret is unset', () => {
    expect(() => appCredentials(backend, {})).toThrow(/GITHUB_APP_PRIVATE_KEY_B64/);
  });

  it('names the registered GitHub App condition on the missing-secret throw', () => {
    let thrown: unknown;
    try {
      appCredentials(backend, {});
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(CairnError);
    expect((thrown as CairnError).conditionId).toBe('github.app-unreachable');
  });
});
