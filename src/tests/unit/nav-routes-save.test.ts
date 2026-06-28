import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { createNavRoutes } from '../../lib/sveltekit/nav-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 },
  };
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

function saveEvent(treeJson: string) {
  const body = new URLSearchParams({ tree: treeJson });
  return {
    url: new URL('https://t.example/admin/nav'),
    params: {},
    request: new Request('https://t.example/admin/nav', { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('navSave', () => {
  it('commits the menu with the session editor as author, then redirects to saved', async () => {
    // The nav save is a head-guarded atomic commit (Git Data API), so the stateful double seeds
    // main with the YAML and answers the ref read, the head-guarded commit sequence, and the write.
    const gh = new GithubDouble({ main: { 'src/lib/site.config.yaml': 'siteName: S\nmenus:\n  primary:\n    - label: Old\n' } });
    gh.install();
    const routes = createNavRoutes(runtime(), deps);
    try {
      await routes.navSave(saveEvent(JSON.stringify([{ label: 'Home', url: '/' }])) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/nav?saved=1');
    }
    // The new YAML landed on main, carrying the new menu.
    expect(gh.read('main', 'src/lib/site.config.yaml')).toContain('label: Home');
    // The commit names the session editor as author, never a committer.
    const commitPost = gh.calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/commits'))!;
    expect((commitPost.body as { author: unknown }).author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    expect(commitPost.body).not.toHaveProperty('committer');
  });

  it('bounces an invalid tree back to the form and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createNavRoutes(runtime(), deps);
    try {
      await routes.navSave(saveEvent(JSON.stringify([{ url: '/no-label' }])) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/\/admin\/nav\?error=.*label/i);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('404s when the config file is gone at save time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createNavRoutes(runtime(), deps);
    await expect(routes.navSave(saveEvent(JSON.stringify([{ label: 'Home' }])) as never)).rejects.toMatchObject({ status: 404 });
  });

  it('reports a head-moved conflict as a reload prompt without overwriting', async () => {
    // The save is now head-guarded: navSave reads the head, then commit(expectedHead) re-reads it.
    // Return a different head on the second ref read so the fail-closed commit raises
    // CommitConflictError, which navSave maps to the reload prompt. The raw read serves the YAML.
    let refReads = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const accept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? '');
      if (method === 'GET' && accept.includes('raw')) {
        return new Response('siteName: S\nmenus:\n  primary:\n    - label: Old\n', { status: 200 });
      }
      if (method === 'GET' && url.includes('/git/ref/heads/')) {
        refReads += 1;
        return new Response(JSON.stringify({ object: { sha: refReads === 1 ? 'h1' : 'h2' } }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }));
    const routes = createNavRoutes(runtime(), deps);
    try {
      await routes.navSave(saveEvent(JSON.stringify([{ label: 'Home', url: '/' }])) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });
});
