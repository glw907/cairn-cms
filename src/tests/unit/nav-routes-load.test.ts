import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNavRoutes } from '../../lib/sveltekit/nav-routes.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { runtime as baseRuntime, postsConcept, contentEvent } from './_content-harness.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(navMenu: CairnRuntime['navMenu']): CairnRuntime {
  return baseRuntime({
    concepts: [
      postsConcept(),
      {
        id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages',
        routing: { routable: true, dated: false, inFeeds: false },
        permalink: '/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [],
        validate: () => ({ ok: true as const, data: {} }),
      },
    ],
    navMenu,
  });
}

function loadEvent(search = '') {
  return contentEvent({ url: `https://t.example/admin/nav${search}`, editor: { email: 'e@t', displayName: 'E', role: 'editor', capability: 'editor' } });
}

const NAV = { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };

afterEach(() => vi.restoreAllMocks());

describe('navLoad', () => {
  it('reads the menu and lists page-like concepts for the picker', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('site.config.yaml')) {
        return new Response('siteName: S\nmenus:\n  primary:\n    - label: Home\n      url: /\n', { status: 200 });
      }
      if (url.includes('/git/trees/')) {
        return new Response(JSON.stringify({ tree: [{ path: 'src/content/pages/about.md', type: 'blob' }], truncated: false }), { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV));
    const data = await routes.navLoad(loadEvent() as never);
    expect(data.menu).toEqual({ name: 'primary', label: 'Primary nav', maxDepth: 2 });
    expect(data.tree).toEqual([{ label: 'Home', url: '/' }]);
    expect(data.pages).toEqual([{ label: 'about', url: '/about' }]);
    expect(data.error).toBeNull();
  });

  it('degrades to an empty tree when the config is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 });
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV));
    const data = await routes.navLoad(loadEvent() as never);
    expect(data.tree).toEqual([]);
    expect(data.error).toBeNull();
  });

  it('degrades to an empty tree when the config is unparsable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('site.config.yaml')) return new Response(': not valid yaml :\n', { status: 200 });
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 });
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV));
    const data = await routes.navLoad(loadEvent() as never);
    expect(data.tree).toEqual([]);
  });

  it('logs the site-config condition at error level when the swallow hides a malformed config', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('site.config.yaml')) return new Response(': not valid yaml :\n', { status: 200 });
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 });
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV));
    await routes.navLoad(loadEvent() as never);
    const records = errorSpy.mock.calls.map(
      (c) => c[0] as { event?: string; conditionId?: string; error?: string },
    );
    expect(
      records.some(
        (r) => r.event === 'config.invalid' && r.conditionId === 'config.site-config-invalid' && !!r.error,
      ),
    ).toBe(true);
  });

  it('stays silent when the config is merely absent (the empty tree is the expected state)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 });
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV));
    await routes.navLoad(loadEvent() as never);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reads the saved flag from the query', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/git/trees/')) return new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 });
      return new Response('Not Found', { status: 404 });
    }));
    const routes = createNavRoutes(runtime(NAV));
    const data = await routes.navLoad(loadEvent('?saved=1') as never);
    expect(data.saved).toBe(true);
  });

  it('404s when no navMenu is configured', async () => {
    const routes = createNavRoutes(runtime(undefined));
    await expect(routes.navLoad(loadEvent() as never)).rejects.toMatchObject({ status: 404 });
  });

  it('refuses a none-capability session with 403 (the nav editor is an engine admin-mutation surface)', async () => {
    const routes = createNavRoutes(runtime(NAV));
    const event = {
      url: new URL('https://t.example/admin/nav'),
      params: {},
      request: new Request('https://t.example/admin/nav'),
      locals: { editor: { email: 'inst@t', displayName: 'Inst', role: 'instructor', capability: 'none' } },
      platform: { env: {} },
    };
    await expect(routes.navLoad(event as never)).rejects.toMatchObject({ status: 403 });
  });
});
