import { describe, it, expect, vi, afterEach } from 'vitest';
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
  it('reports the signing check as not applicable for a non-GitHub provider', async () => {
    const rt = { ...runtime(), backend: { kind: 'other' } } as unknown as CairnRuntime;
    const data = await loadHealth(event({}), rt);
    expect(data.ok).toBe(true);
    expect(data.checks.githubAppSigning).toEqual({ ok: true, detail: 'not-applicable' });
  });

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

describe('loadHealth when the check itself throws', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs health.failed with the error message and rethrows, so the route can answer its fixed detail', async () => {
    const sink = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rt = Object.defineProperty({ ...runtime() }, 'backend', {
      get() {
        throw new Error('the provider read threw');
      },
    }) as CairnRuntime;
    await expect(loadHealth(event({}), rt)).rejects.toThrow('the provider read threw');
    expect(sink).toHaveBeenCalledTimes(1);
    const { timestamp, ...record } = sink.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof timestamp).toBe('string');
    expect(record).toEqual({ level: 'error', event: 'health.failed', error: 'the provider read threw' });
  });
});
