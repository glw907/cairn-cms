import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [
      { id: 'posts', label: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], summaryFields: [], validate: ok },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: 'src/content/.cairn/index.json',
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

/** A layout-load event with a settable editor, path, and cookie jar. */
function makeEvent(opts: {
  pathname: string;
  editor: { email: string; displayName: string; role: 'owner' | 'editor' };
  cookies?: Record<string, string>;
}) {
  return {
    url: new URL(`https://t.example${opts.pathname}`),
    params: {},
    request: new Request('https://t.example'),
    locals: { editor: opts.editor },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    cookies: { get: (name: string) => opts.cookies?.[name] },
  };
}

describe('layoutLoad', () => {
  it('carries the editor email and resolves the theme from the cookie', () => {
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'owner' },
      cookies: { 'cairn-admin-theme': 'cairn-admin-dark' },
    });
    const data = routes.layoutLoad(event as never);
    expect(data.user.email).toBe('ed@example.com');
    expect(data.theme).toBe('cairn-admin-dark');
  });

  it('defaults the theme to light when no cookie is set', () => {
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'editor' },
      cookies: {},
    });
    expect(routes.layoutLoad(event as never).theme).toBe('cairn-admin');
  });

  it('ignores an unknown cookie value and falls back to light', () => {
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'editor' },
      cookies: { 'cairn-admin-theme': 'bogus' },
    });
    expect(routes.layoutLoad(event as never).theme).toBe('cairn-admin');
  });
});

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
      await routes.createAction(createEvent({ title: 'Hello World', slug: 'hello-world', date: '2026-05-01' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-01-hello-world?new=1');
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
      await routes.createAction(createEvent({ title: 'X', slug: 'existing', date: '2026-05-01' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*already%20exists/i);
    }
  });

  /** A runtime whose posts concept truncates the date prefix to the month. */
  function monthRuntime(): CairnRuntime {
    const r = runtime();
    r.concepts[0] = { ...r.concepts[0], datePrefix: 'month' };
    return r;
  }

  /** A runtime that adds a non-dated `pages` concept alongside posts. */
  function pagesRuntime(): CairnRuntime {
    const r = runtime();
    r.concepts.push({
      id: 'pages',
      label: 'Pages',
      dir: 'src/content/pages',
      routing: { routable: true, dated: false, inFeeds: false },
      permalink: '/:slug',
      datePrefix: 'day',
      fields: [],
      summaryFields: [],
      validate: () => ({ ok: true as const, data: {} }),
    });
    return r;
  }

  function pagesEvent(form: Record<string, string>) {
    const body = new URLSearchParams(form);
    return {
      url: new URL('https://t.example/admin/pages'),
      params: { concept: 'pages' },
      request: new Request('https://t.example/admin/pages', { method: 'POST', body }),
      locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
      platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    };
  }

  it('composes a day-granular dated id from the date and slug', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.createAction(createEvent({ title: 'Snowball', slug: 'snowball', date: '2026-06-15' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toBe('/admin/posts/2026-06-15-snowball?new=1');
    }
  });

  it('truncates the dated id to the concept granularity (month)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(monthRuntime(), deps);
    try {
      await routes.createAction(createEvent({ slug: 'welcome', date: '2026-05-20' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-welcome?new=1');
    }
  });

  it('bounces when a dated concept gets no date', async () => {
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.createAction(createEvent({ slug: 'welcome' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=/);
    }
  });

  it('bounces when a dated slug carries its own date-like prefix', async () => {
    const routes = createContentRoutes(runtime(), deps);
    try {
      await routes.createAction(createEvent({ slug: '2026-05-31-x', date: '2026-06-15' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=/);
    }
  });

  it('uses the slug verbatim as the id for a non-dated concept', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(pagesRuntime(), deps);
    try {
      await routes.createAction(pagesEvent({ slug: 'about' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/pages/about?new=1');
    }
  });
});

describe('listDeleteAction', () => {
  function deleteFormEvent(form: Record<string, string>) {
    const body = new URLSearchParams(form);
    return {
      url: new URL('https://t.example/admin/posts'),
      params: { concept: 'posts' },
      request: new Request('https://t.example/admin/posts', { method: 'POST', body }),
      locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
      platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    };
  }

  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
  }

  // The delete path: one manifest read, then the commitFiles sequence (GET ref, GET commit,
  // POST trees, POST commits, PATCH ref). Mirrors the deleteAction unit fixtures.
  function commitFetch(manifestRaw: string) {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.includes('/contents/')) return new Response(manifestRaw, { status: 200 });
      if (method === 'GET' && url.includes('/git/ref/')) return json({ object: { sha: 'head1' } });
      if (method === 'GET' && url.includes('/git/commits/')) return json({ tree: { sha: 'basetree' } });
      if (method === 'POST' && url.endsWith('/git/trees')) return json({ sha: 'newtree' });
      if (method === 'POST' && url.endsWith('/git/commits')) return json({ sha: 'commit1' });
      if (method === 'PATCH' && url.includes('/git/refs/')) return json({ ref: 'refs/heads/main' });
      return new Response('unexpected', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    return calls;
  }

  it('deletes an entry whose id arrives in the form body when no inbound links exist', async () => {
    const manifest = JSON.stringify({
      version: 1,
      entries: [{ id: '2026-05-01-hello', concept: 'posts', title: 'Hello', permalink: '/p/hello', draft: false, links: [] }],
    });
    commitFetch(manifest);
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = deleteFormEvent({ id: '2026-05-01-hello' });
    try {
      await routes.listDeleteAction(event as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toBe('/admin/posts');
    }
  });

  it('blocks the delete and returns the inbound links when something links to the entry', async () => {
    const manifest = JSON.stringify({
      version: 1,
      entries: [
        { id: '2026-05-01-hello', concept: 'posts', title: 'Hello', permalink: '/p/hello', draft: false, links: [] },
        { id: 'b', concept: 'posts', title: 'B', permalink: '/p/b', draft: false, links: [{ concept: 'posts', id: '2026-05-01-hello' }] },
      ],
    });
    const calls = commitFetch(manifest);
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = deleteFormEvent({ id: '2026-05-01-hello' });
    const result = (await routes.listDeleteAction(event as never)) as unknown as {
      status: number; data: { inboundLinks: unknown[] };
    };
    expect(result.status).toBe(409);
    expect(result.data.inboundLinks.length).toBeGreaterThan(0);
    // Block-until-clean: no commit when links exist.
    expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
  });

  it('rejects an invalid id from the form with a 400', async () => {
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = deleteFormEvent({ id: '../escape' });
    await expect(routes.listDeleteAction(event as never)).rejects.toMatchObject({ status: 400 });
  });
});
