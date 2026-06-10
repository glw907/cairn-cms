import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'Test Site',
    concepts: [
      { id: 'posts', label: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], summaryFields: [], validate: ok },
      { id: 'pages', label: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, permalink: '/:slug', datePrefix: 'day', fields: [], summaryFields: [], validate: ok },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: 'src/content/.cairn/index.json',
  };
}

function event(pathname: string, role: 'owner' | 'editor') {
  return {
    url: new URL(`https://test.example${pathname}`),
    params: {},
    request: new Request('https://test.example'),
    locals: { editor: { email: 'e@test', displayName: 'Ed', role } },
    platform: { env: {} },
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('layoutLoad', () => {
  it('returns nav concepts, the user, the active path, and owner capability', async () => {
    const routes = createContentRoutes(runtime());
    const data = await routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.siteName).toBe('Test Site');
    expect(data.user).toEqual({ displayName: 'Ed', email: 'e@test', role: 'owner' });
    expect(data.concepts).toEqual([
      { id: 'posts', label: 'Posts' },
      { id: 'pages', label: 'Pages' },
    ]);
    expect(data.pathname).toBe('/admin/posts');
    expect(data.canManageEditors).toBe(true);
    expect(data.navLabel).toBeNull();
  });

  it('issues a CSRF token in the layout data', async () => {
    const routes = createContentRoutes(runtime());
    const data = await routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('denies the manage-editors capability to an editor', async () => {
    const routes = createContentRoutes(runtime());
    const data = await routes.layoutLoad(event('/admin/pages', 'editor') as never);
    expect(data.canManageEditors).toBe(false);
  });

  it('exposes the nav label when a navMenu is configured', async () => {
    const rt = runtime();
    rt.navMenu = { configPath: 'x.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const data = await createContentRoutes(rt).layoutLoad(event('/admin/nav', 'editor') as never);
    expect(data.navLabel).toBe('Primary nav');
  });

  it('lists the pending entries parsed from the cairn refs', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/2026-05-hello', 'main');
    gh.createBranch('cairn/pages/about', 'main');
    gh.createBranch('cairn/oops', 'main'); // malformed: no entry id, dropped by the parser
    gh.install();
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const data = await routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.pendingEntries).toEqual([
      { concept: 'pages', id: 'about' },
      { concept: 'posts', id: '2026-05-hello' },
    ]);
  });

  it('degrades pendingEntries to null when the token mint fails, keeping the rest', async () => {
    const routes = createContentRoutes(runtime(), {
      mintToken: async () => {
        throw new Error('no key');
      },
    });
    const data = await routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.pendingEntries).toBeNull();
    expect(data.siteName).toBe('Test Site');
    expect(data.user.email).toBe('e@test');
    expect(data.concepts).toHaveLength(2);
  });
});

describe('indexRedirect', () => {
  it('redirects /admin to the first concept', () => {
    const routes = createContentRoutes(runtime());
    expect(() => routes.indexRedirect()).toThrow();
    try {
      routes.indexRedirect();
    } catch (e) {
      expect((e as { status: number; location: string }).status).toBe(307);
      expect((e as { location: string }).location).toBe('/admin/posts');
    }
  });
});
