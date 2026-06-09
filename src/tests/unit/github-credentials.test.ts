import { describe, it, expect } from 'vitest';
import { appCredentials } from '../../lib/github/credentials.js';
import type { BackendConfig } from '../../lib/content/types.js';

const backend: BackendConfig = {
  owner: 'glw907',
  repo: 'ecnordic-ski',
  branch: 'main',
  appId: '3847496',
  installationId: '135372268',
};

describe('appCredentials', () => {
  it('assembles AppCredentials from the backend config and the key secret', () => {
    const creds = appCredentials(backend, { GITHUB_APP_PRIVATE_KEY_B64: 'a2V5' });
    expect(creds).toEqual({ appId: '3847496', installationId: '135372268', privateKeyB64: 'a2V5' });
  });

  it('throws a named error when the key secret is unset', () => {
    expect(() => appCredentials(backend, {})).toThrow(/GITHUB_APP_PRIVATE_KEY_B64/);
  });
});
