// Task 15: the two-tier tidy settings save action (spec 2.8). The save mirrors the nav editor's
// read-modify-commit exactly: validate the posted conventions, read the committed YAML, commit the
// document edited with setTidy through commitFile, and bounce a stale-SHA conflict back as a reload
// prompt. Only the conventions block is written, so the developer-tier enabled/model facts are never
// flipped by an editor save. The save 404s when tidy is off (the server half of the truthful gate);
// the route-level 404 outside the settings view is the viewAction gate, covered in the cairn-admin
// actions test.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseSiteConfig } from '../../lib/nav/site-config.js';
import type { CairnRuntime } from '../../lib/content/types.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

const CONFIG_PATH = 'src/lib/site.config.yaml';

function runtime(over: Partial<CairnRuntime> = {}): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
    navMenu: { configPath: CONFIG_PATH, menuName: 'primary', label: 'Primary nav', maxDepth: 2 },
    tidy: { enabled: true, model: 'claude-sonnet-4-6' },
    ...over,
  };
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

function saveEvent(conventionsJson: string) {
  const body = new URLSearchParams({ conventions: conventionsJson });
  return {
    url: new URL('https://t.example/admin/settings'),
    params: {},
    request: new Request('https://t.example/admin/settings', { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

// The committed YAML the read step returns, carrying the developer-tier facts plus a comment, so the
// preserve-comments-and-facts assertion has something to round-trip.
const SEED_YAML = [
  '# the site config',
  'siteName: S',
  'tidy:',
  '  enabled: true',
  '  model: claude-sonnet-4-6',
  '  conventions:',
  '    fixes: true',
  '',
].join('\n');

afterEach(() => vi.restoreAllMocks());

describe('settingsSave', () => {
  it('commits the conventions block to the committed YAML, preserving the developer-tier facts', async () => {
    // The settings save is a head-guarded atomic commit (Git Data API), so the stateful double
    // seeds main with the YAML and answers the ref read, the head-guarded commit, and the write.
    const gh = new GithubDouble({ main: { [CONFIG_PATH]: SEED_YAML } });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const conventions = JSON.stringify({ fixes: true, oxfordComma: 'always', timeFormat: '5 PM' });
    try {
      await routes.settingsSave(saveEvent(conventions) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/settings?saved=1');
    }
    // The commit names the session editor as author.
    const commitPost = gh.calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/commits'))!;
    expect((commitPost.body as { author: unknown }).author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    // The committed content carries the new conventions and keeps the developer-tier facts and comment.
    const committed = gh.read('main', CONFIG_PATH)!;
    expect(committed).toContain('# the site config');
    expect(committed).toContain('enabled: true');
    expect(committed).toContain('model: claude-sonnet-4-6');
    const reparsed = parseSiteConfig(committed);
    expect(reparsed.tidy?.enabled).toBe(true);
    // The boolean toggles (enDashRanges/smartQuotes/brandCaps) are non-optional, so the validator
    // fills their false default; a collapsed multi-position toggle is dropped (none here).
    expect(reparsed.tidy?.conventions).toEqual({
      fixes: true,
      oxfordComma: 'always',
      timeFormat: '5 PM',
      enDashRanges: false,
      smartQuotes: false,
      brandCaps: false,
    });
  });

  it('404s when tidy is not enabled and never reads or commits (the server half of the gate)', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime({ tidy: { enabled: false } }), deps);
    await expect(routes.settingsSave(saveEvent('{"fixes":true}') as never)).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bounces a malformed conventions payload back to the form and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(), deps);
    // oxfordComma carries a value outside its allowed set.
    try {
      await routes.settingsSave(saveEvent('{"oxfordComma":"sometimes"}') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/\/admin\/settings\?error=/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a head-moved conflict as a reload prompt without overwriting', async () => {
    // The save is now head-guarded: settingsSave reads the head, then commit(expectedHead) re-reads
    // it. Return a different head on the second ref read so the fail-closed commit raises
    // CommitConflictError, which settingsSave maps to the reload prompt. The raw read serves the YAML.
    let refReads = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const accept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? '');
      if (method === 'GET' && accept.includes('raw')) return new Response(SEED_YAML, { status: 200 });
      if (method === 'GET' && url.includes('/git/ref/heads/')) {
        refReads += 1;
        return new Response(JSON.stringify({ object: { sha: refReads === 1 ? 'h1' : 'h2' } }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }));
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.settingsSave(saveEvent('{"fixes":true}') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });

  it('404s when the config file is gone at save time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    await expect(routes.settingsSave(saveEvent('{"fixes":true}') as never)).rejects.toMatchObject({ status: 404 });
  });
});

describe('settingsLoad', () => {
  function loadEvent(env: Record<string, unknown> = {}) {
    return {
      url: new URL('https://t.example/admin/settings'),
      params: {},
      request: new Request('https://t.example/admin/settings'),
      locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
      platform: { env },
    };
  }

  it('opens the editor tier only when tidy is enabled AND the key is present (truthful gate)', () => {
    const routes = createContentRoutes(runtime(), deps);
    const data = routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
    expect(data.enabled).toBe(true);
    expect(data.tidyEnabled).toBe(true);
    expect(data.keyConfigured).toBe(true);
    expect(data.modelLabel).toBe('Claude Sonnet');
    expect(data.conventions.fixes).toBe(true);
  });

  it('keeps the gate closed when the key is missing, even with tidy enabled', () => {
    const routes = createContentRoutes(runtime(), deps);
    const data = routes.settingsLoad(loadEvent({}) as never);
    expect(data.enabled).toBe(false);
    expect(data.tidyEnabled).toBe(true);
    expect(data.keyConfigured).toBe(false);
  });

  it('never returns the API key, only a presence flag', () => {
    const routes = createContentRoutes(runtime(), deps);
    const data = routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-secret-value' }) as never);
    expect(JSON.stringify(data)).not.toContain('sk-secret-value');
  });

  it('keeps the gate closed when tidy is off', () => {
    const routes = createContentRoutes(runtime({ tidy: { enabled: false } }), deps);
    const data = routes.settingsLoad(loadEvent({ ANTHROPIC_API_KEY: 'sk-test' }) as never);
    expect(data.enabled).toBe(false);
    expect(data.tidyEnabled).toBe(false);
  });
});
