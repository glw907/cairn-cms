import { describe, it, expect } from 'vitest';
import { githubApp } from '../../lib/index.js';
import { healthLoad } from '../../lib/sveltekit/health.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '123', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
  };
}

function event(env: Record<string, unknown>) {
  return { platform: { env } };
}

describe('healthLoad', () => {
  it('reports a failure when the key is unset, without throwing', async () => {
    const data = await healthLoad(event({}) as never, runtime());
    expect(data.ok).toBe(false);
    expect(data.checks.githubAppSigning.ok).toBe(false);
  });

  it('reports a failure with a coarse detail for a bad key, never the key itself', async () => {
    const data = await healthLoad(event({ GITHUB_APP_PRIVATE_KEY_B64: 'bm90LWEta2V5' }) as never, runtime());
    expect(data.ok).toBe(false);
    expect(data.checks.githubAppSigning.detail).toBeTruthy();
    expect(JSON.stringify(data)).not.toContain('bm90LWEta2V5');
  });
});
