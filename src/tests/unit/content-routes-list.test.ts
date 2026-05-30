import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [
      { id: 'posts', label: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, fields: [], validate: ok },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    renderPreview: (md) => md,
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function listEvent(params: Record<string, string>, search = '') {
  return {
    url: new URL(`https://t.example/admin/posts${search}`),
    params,
    request: new Request('https://t.example'),
    locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('listLoad', () => {
  it('lists entries with title, date, and draft from each file frontmatter', async () => {
    const tree = {
      tree: [
        { path: 'src/content/posts/2026-05-hello.md', type: 'blob' },
        { path: 'src/content/posts/2026-04-older.md', type: 'blob' },
      ],
      truncated: false,
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/git/trees/')) return new Response(JSON.stringify(tree), { status: 200 });
      if (url.includes('hello')) return new Response('---\ntitle: Hello\ndate: 2026-05-01\ndraft: true\n---\nbody', { status: 200 });
      return new Response('---\ntitle: Older\ndate: 2026-04-01\n---\nbody', { status: 200 });
    }));

    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.conceptId).toBe('posts');
    expect(data.dated).toBe(true);
    expect(data.entries[0]).toMatchObject({ id: '2026-05-hello', title: 'Hello', date: '2026-05-01', draft: true });
    expect(data.entries[1]).toMatchObject({ id: '2026-04-older', title: 'Older', draft: false });
    expect(data.error).toBeNull();
  });

  it('degrades to an inline error when the listing fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([]);
    expect(data.error).toMatch(/could not load/i);
  });

  it('surfaces a create-form error from the query', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ tree: [], truncated: false }), { status: 200 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }, '?error=Bad+slug') as never);
    expect(data.formError).toBe('Bad slug');
  });
});

describe('createAction', () => {
  function createEvent(form: Record<string, string>) {
    const body = new URLSearchParams(form);
    return {
      url: new URL('https://t.example/admin/posts'),
      params: { concept: 'posts' },
      request: new Request('https://t.example/admin/posts', { method: 'POST', body }),
      locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
      platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    };
  }

  it('redirects to the editor for a fresh slug', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.createAction(createEvent({ title: 'Hello World', slug: '2026-05-hello-world', date: '2026-05-01' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hello-world?new=1');
    }
  });

  it('bounces back with an error for an invalid slug', async () => {
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.createAction(createEvent({ title: 'X', slug: 'Bad Slug!' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/\/admin\/posts\?error=/);
    }
  });

  it('refuses to clobber an existing file', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('exists', { status: 200 })));
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.createAction(createEvent({ title: 'X', slug: '2026-05-existing' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*already%20exists/i);
    }
  });
});
