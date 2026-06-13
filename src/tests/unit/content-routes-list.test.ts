import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [
      { id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], summaryFields: [], validate: ok },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: 'src/content/.cairn/index.json',
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

const MANIFEST_PATH = 'src/content/.cairn/index.json';

/** Serialize a manifest fixture; entries default the fields listLoad does not read. */
function manifestRaw(entries: Partial<{ id: string; concept: string; title: string; date: string; draft: boolean; summary: string }>[]): string {
  return JSON.stringify({
    version: 1,
    entries: entries.map((e) => ({ concept: 'posts', permalink: `/posts/${e.id}`, draft: false, links: [], ...e })),
  });
}

/** The contents-API reads the double served, the calls the manifest path exists to avoid. */
function contentsReads(gh: GithubDouble): string[] {
  return gh.calls.filter((c) => c.method === 'GET' && c.url.includes('/contents/')).map((c) => c.url);
}

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

/** Stub fetch with an empty ref listing so layoutLoad's pending-branch scan resolves clean. */
function stubNoRefs() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
}

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
    cookies: { get: (name: string) => opts.cookies?.[name], set: () => {}, delete: () => {} },
  };
}

describe('layoutLoad', () => {
  it('carries the editor email and resolves the theme from the cookie', async () => {
    stubNoRefs();
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'owner' },
      cookies: { 'cairn-admin-theme': 'cairn-admin-dark' },
    });
    const data = await routes.layoutLoad(event as never);
    expect(data.user.email).toBe('ed@example.com');
    expect(data.theme).toBe('cairn-admin-dark');
  });

  it('defaults the theme to light when no cookie is set', async () => {
    stubNoRefs();
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'editor' },
      cookies: {},
    });
    expect((await routes.layoutLoad(event as never)).theme).toBe('cairn-admin');
  });

  it('ignores an unknown cookie value and falls back to light', async () => {
    stubNoRefs();
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'editor' },
      cookies: { 'cairn-admin-theme': 'bogus' },
    });
    expect((await routes.layoutLoad(event as never)).theme).toBe('cairn-admin');
  });

  it('reads the collapsed nav groups from the cookie, url-decoded', async () => {
    stubNoRefs();
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'editor' },
      cookies: { 'cairn-admin-nav-collapsed': `Core,${encodeURIComponent('Black & White')}` },
    });
    expect((await routes.layoutLoad(event as never)).collapsedNav).toEqual(['Core', 'Black & White']);
  });

  it('defaults collapsedNav to empty when no cookie is set', async () => {
    stubNoRefs();
    const routes = createContentRoutes(runtime(), { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'editor' },
      cookies: {},
    });
    expect((await routes.layoutLoad(event as never)).collapsedNav).toEqual([]);
  });
});

describe('listLoad', () => {
  it('projects published rows straight from the manifest, with no per-file reads', async () => {
    // Main carries only the manifest: no entry files exist, so a row can come from nowhere else.
    const gh = new GithubDouble({
      main: {
        [MANIFEST_PATH]: manifestRaw([
          { id: '2026-04-older', title: 'Older', date: '2026-04-01' },
          { id: '2026-05-hello', title: 'Hello', date: '2026-05-01', draft: true },
          { id: 'about', concept: 'pages', title: 'About' }, // another concept's row stays out
        ]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.conceptId).toBe('posts');
    expect(data.dated).toBe(true);
    // Newest id first, the same order the old crawl produced.
    expect(data.entries).toEqual([
      { id: '2026-05-hello', title: 'Hello', date: '2026-05-01', draft: true, status: 'published', summary: null },
      { id: '2026-04-older', title: 'Older', date: '2026-04-01', draft: false, status: 'published', summary: null },
    ]);
    expect(data.error).toBeNull();
    // One contents read total: the manifest itself.
    expect(contentsReads(gh)).toEqual([expect.stringContaining('.cairn/index.json')]);
  });

  it('fills a published row summary from the manifest, falling back to null', async () => {
    const gh = new GithubDouble({
      main: {
        [MANIFEST_PATH]: manifestRaw([
          { id: '2026-05-hello', title: 'Hello', date: '2026-05-01', summary: 'Indexed blurb.' },
          { id: '2026-04-older', title: 'Older', date: '2026-04-01' }, // no summary in the manifest row
        ]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    const indexed = data.entries.find((e) => e.id === '2026-05-hello');
    const bare = data.entries.find((e) => e.id === '2026-04-older');
    expect(indexed?.status).toBe('published');
    expect(indexed?.summary).toBe('Indexed blurb.');
    expect(bare?.summary).toBeNull();
  });

  it('derives a pending row summary from the branch frontmatter, else the body', async () => {
    const gh = new GithubDouble({
      main: {
        [MANIFEST_PATH]: manifestRaw([
          { id: '2026-05-hello', title: 'Hello', date: '2026-05-01' },
        ]),
      },
      // An edited entry whose branch carries a description: the summary reads that description.
      'cairn/posts/2026-05-hello': {
        'src/content/posts/2026-05-hello.md':
          '---\ntitle: Hello\ndate: 2026-05-01\ndescription: Branch blurb.\n---\nBody we ignore.',
      },
      // A branch-only entry with no description: the summary is the body excerpt.
      'cairn/posts/2026-06-fresh': {
        'src/content/posts/2026-06-fresh.md':
          '---\ntitle: Fresh\ndate: 2026-06-01\n---\nThe body becomes the excerpt.',
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    const edited = data.entries.find((e) => e.id === '2026-05-hello');
    const fresh = data.entries.find((e) => e.id === '2026-06-fresh');
    expect(edited?.status).toBe('edited');
    expect(edited?.summary).toBe('Branch blurb.');
    expect(fresh?.status).toBe('new');
    expect(fresh?.summary).toBe('The body becomes the excerpt.');
  });

  it('trusts a manifest that parses but is empty, without crawling the tree', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: manifestRaw([]) } });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([]);
    expect(data.error).toBeNull();
    expect(gh.calls.some((c) => c.method === 'GET' && c.url.includes('/git/trees/'))).toBe(false);
  });

  it('degrades to an inline error when the listing fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([]);
    expect(data.error).toMatch(/could not load/i);
  });

  it('degrades to the same inline error when the manifest is malformed', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: 'not json' } });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([]);
    expect(data.error).toMatch(/could not load/i);
  });

  it('degrades to its own message when the token mint fails', async () => {
    const routes = createContentRoutes(runtime(), { mintToken: async () => { throw new Error('no key'); } });
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([]);
    expect(data.error).toMatch(/could not authenticate/i);
  });

  it('surfaces a create-form error from the query', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: manifestRaw([]) } });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }, '?error=Bad+slug') as never);
    expect(data.formError).toBe('Bad slug');
  });

  it('surfaces the publish-all count from the query and defaults it to null', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: manifestRaw([]) } });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const flashed = await routes.listLoad(listEvent({ concept: 'posts' }, '?publishedAll=3') as never);
    expect(flashed.publishedAll).toBe(3);
    const plain = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(plain.publishedAll).toBeNull();
  });
});

describe('listLoad with pending branches', () => {
  it('marks a manifest row whose pending branch exists as edited, read branch-first', async () => {
    const gh = new GithubDouble({
      main: {
        [MANIFEST_PATH]: manifestRaw([
          { id: '2026-05-hello', title: 'Old title', date: '2026-05-01' },
          { id: '2026-04-older', title: 'Older', date: '2026-04-01' },
        ]),
      },
      'cairn/posts/2026-05-hello': {
        'src/content/posts/2026-05-hello.md': '---\ntitle: Pending title\ndate: 2026-05-01\ndraft: true\n---\nx',
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    // The edited row carries the branch's title and draft flag, not the manifest's.
    expect(data.entries).toEqual([
      { id: '2026-05-hello', title: 'Pending title', date: '2026-05-01', draft: true, status: 'edited', summary: 'x' },
      { id: '2026-04-older', title: 'Older', date: '2026-04-01', draft: false, status: 'published', summary: null },
    ]);
    expect(data.error).toBeNull();
    // Two contents reads: the manifest plus the one pending entry's branch file.
    expect(contentsReads(gh)).toHaveLength(2);
  });

  it('appends a branch-only entry as new with its branch data, after the manifest rows', async () => {
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: manifestRaw([{ id: '2026-04-older', title: 'Older', date: '2026-04-01' }]) },
      'cairn/posts/2026-06-fresh': {
        'src/content/posts/2026-06-fresh.md': '---\ntitle: Brand New\ndate: 2026-06-01\n---\nx',
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    // Ordering parity with the old crawl: new rows append after the published set even when
    // their ids would sort first.
    expect(data.entries).toEqual([
      { id: '2026-04-older', title: 'Older', date: '2026-04-01', draft: false, status: 'published', summary: null },
      { id: '2026-06-fresh', title: 'Brand New', date: '2026-06-01', draft: false, status: 'new', summary: 'x' },
    ]);
  });

  it('ignores a ref with an invalid id instead of listing a phantom row', async () => {
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: manifestRaw([{ id: '2026-05-hello', title: 'Hello', date: '2026-05-01' }]) },
      'cairn/posts/a%2fb': {}, // percent-escaped id fails the slug rule, so it never reaches a read
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([
      { id: '2026-05-hello', title: 'Hello', date: '2026-05-01', draft: false, status: 'published', summary: null },
    ]);
  });

  it('degrades a branch-only row to its id when the branch read fails', async () => {
    // The ref exists but its tree lacks the entry file, so the branch read comes back empty.
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: manifestRaw([]) },
      'cairn/posts/2026-06-ghost': {},
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([
      { id: '2026-06-ghost', title: '2026-06-ghost', date: null, draft: false, status: 'new', summary: null },
    ]);
  });
});

describe('listLoad without a manifest (fallback crawl)', () => {
  it('crawls the tree and reads each file when the manifest is absent', async () => {
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-05-hello.md': '---\ntitle: Hello\ndate: 2026-05-01\ndraft: true\n---\nx',
        'src/content/posts/2026-04-older.md': '---\ntitle: Older\ndate: 2026-04-01\n---\nx',
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([
      { id: '2026-05-hello', title: 'Hello', date: '2026-05-01', draft: true, status: 'published', summary: 'x' },
      { id: '2026-04-older', title: 'Older', date: '2026-04-01', draft: false, status: 'published', summary: 'x' },
    ]);
    expect(data.error).toBeNull();
    expect(gh.calls.some((c) => c.method === 'GET' && c.url.includes('/git/trees/'))).toBe(true);
  });

  it('marks an entry whose pending branch exists as edited, read branch-first', async () => {
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-05-hello.md': '---\ntitle: Old title\ndate: 2026-05-01\n---\nx',
        'src/content/posts/2026-04-older.md': '---\ntitle: Older\ndate: 2026-04-01\n---\nx',
      },
      'cairn/posts/2026-05-hello': {
        'src/content/posts/2026-05-hello.md': '---\ntitle: Pending title\ndate: 2026-05-01\ndraft: true\n---\nx',
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([
      { id: '2026-05-hello', title: 'Pending title', date: '2026-05-01', draft: true, status: 'edited', summary: 'x' },
      { id: '2026-04-older', title: 'Older', date: '2026-04-01', draft: false, status: 'published', summary: 'x' },
    ]);
  });

  it('appends a branch-only entry as new with its branch data', async () => {
    const gh = new GithubDouble({
      main: { 'src/content/posts/2026-04-older.md': '---\ntitle: Older\ndate: 2026-04-01\n---\nx' },
      'cairn/posts/2026-06-fresh': {
        'src/content/posts/2026-06-fresh.md': '---\ntitle: Brand New\ndate: 2026-06-01\n---\nx',
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.listLoad(listEvent({ concept: 'posts' }) as never);
    expect(data.entries).toEqual([
      { id: '2026-04-older', title: 'Older', date: '2026-04-01', draft: false, status: 'published', summary: 'x' },
      { id: '2026-06-fresh', title: 'Brand New', date: '2026-06-01', draft: false, status: 'new', summary: 'x' },
    ]);
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
      singular: 'Pages',
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
      if (method === 'DELETE' && url.includes('/git/refs/')) return new Response('Not Found', { status: 404 }); // no pending branch
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
      status: number; data: { error: string; inboundLinks: unknown[] };
    };
    expect(result.status).toBe(409);
    expect(result.data.error).toContain('2026-05-01-hello');
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
