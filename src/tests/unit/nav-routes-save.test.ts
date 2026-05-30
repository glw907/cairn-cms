import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNavRoutes } from '../../lib/sveltekit/nav-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
    navMenu: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 },
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

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
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method === 'PUT') return new Response(JSON.stringify({ commit: { sha: 'abc' } }), { status: 200 });
      const accept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? '');
      if (accept.includes('raw')) {
        return new Response('siteName: S\nmenus:\n  primary:\n    - label: Old\n', { status: 200 });
      }
      return new Response(JSON.stringify({ sha: 'old' }), { status: 200 });
    }));
    const routes = createNavRoutes(runtime(), deps);
    try {
      await routes.navSave(saveEvent(JSON.stringify([{ label: 'Home', url: '/' }])) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/nav?saved=1');
    }
    const put = calls.find((c) => c.init?.method === 'PUT')!;
    expect(put.url).toContain('site.config.yaml');
    const sent = JSON.parse(String(put.init!.body));
    expect(sent.author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    expect(sent).not.toHaveProperty('committer');
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

  it('reports a 409 conflict as a reload prompt without overwriting', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response('conflict', { status: 409 });
      const accept = String((init?.headers as Record<string, string> | undefined)?.Accept ?? '');
      if (accept.includes('raw')) {
        return new Response('siteName: S\nmenus:\n  primary:\n    - label: Old\n', { status: 200 });
      }
      return new Response(JSON.stringify({ sha: 'old' }), { status: 200 });
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
