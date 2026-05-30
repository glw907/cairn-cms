import { describe, it, expect } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'Test Site',
    concepts: [
      { id: 'posts', label: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', fields: [], validate: ok },
      { id: 'pages', label: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, permalink: '/:slug', fields: [], validate: ok },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
  };
}

function event(pathname: string, role: 'owner' | 'editor') {
  return {
    url: new URL(`https://test.example${pathname}`),
    params: {},
    request: new Request('https://test.example'),
    locals: { editor: { email: 'e@test', displayName: 'Ed', role } },
    platform: { env: {} },
  };
}

describe('layoutLoad', () => {
  it('returns nav concepts, the user, the active path, and owner capability', () => {
    const routes = createContentRoutes(runtime());
    const data = routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.siteName).toBe('Test Site');
    expect(data.user).toEqual({ displayName: 'Ed', role: 'owner' });
    expect(data.concepts).toEqual([
      { id: 'posts', label: 'Posts' },
      { id: 'pages', label: 'Pages' },
    ]);
    expect(data.pathname).toBe('/admin/posts');
    expect(data.canManageEditors).toBe(true);
    expect(data.navLabel).toBeNull();
  });

  it('denies the manage-editors capability to an editor', () => {
    const routes = createContentRoutes(runtime());
    const data = routes.layoutLoad(event('/admin/pages', 'editor') as never);
    expect(data.canManageEditors).toBe(false);
  });

  it('exposes the nav label when a navMenu is configured', () => {
    const rt = runtime();
    rt.navMenu = { configPath: 'x.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const data = createContentRoutes(rt).layoutLoad(event('/admin/nav', 'editor') as never);
    expect(data.navLabel).toBe('Primary nav');
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
