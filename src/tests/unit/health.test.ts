import { describe, it, expect } from 'vitest';
import { createGithubApp } from '../../lib/index.js';
import { loadHealth } from '../../lib/sveltekit/health.js';
import { testEvent } from '../helpers/test-event.js';
import { setFakeEnv } from '../helpers/cloudflare-workers-fake.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [],
    backend: createGithubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '123', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
  };
}

/** A request event, with `env` installed as the Worker env the health check reads. */
function event(env: Record<string, unknown>) {
  setFakeEnv(env);
  return testEvent();
}

describe('loadHealth', () => {
  it('reports a failure when the key is unset, without throwing', async () => {
    const data = await loadHealth(event({}), runtime());
    expect(data.ok).toBe(false);
    expect(data.checks.githubAppSigning.ok).toBe(false);
  });

  it('reports a failure with a coarse detail for a bad key, never the key itself', async () => {
    const data = await loadHealth(event({ GITHUB_APP_PRIVATE_KEY_B64: 'bm90LWEta2V5' }), runtime());
    expect(data.ok).toBe(false);
    expect(data.checks.githubAppSigning.detail).toBeTruthy();
    expect(JSON.stringify(data)).not.toContain('bm90LWEta2V5');
  });
});
