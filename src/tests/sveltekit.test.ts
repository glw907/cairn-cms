import { describe, it, expect, afterEach, vi } from 'vitest';
import { adminLayoutLoad, collectionListLoad, createEntry } from '../lib/sveltekit';
import { isHttpError, isRedirect } from '@sveltejs/kit';
import type { CairnAdapter } from '../lib/adapter';

// A fixture adapter with two folder collections, mirroring ecnordic's shape.
const adapter: CairnAdapter = {
  siteName: 'Test Site',
  sender: 'noreply@test',
  backend: { owner: 'o', repo: 'r', branch: 'main' },
  preview: { remarkPlugins: [], rehypePlugins: [] },
  collections: [
    { type: 'posts', label: 'Posts', dir: 'src/content/posts', fields: [], validate: (d) => d },
    { type: 'pages', label: 'Pages', dir: 'src/content/pages', fields: [], validate: (d) => d },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

// A fetch stub keyed by URL substring, so a directory listing and each raw-file read return
// distinct bodies (mirrors the contents-API shapes github.ts relies on).
function mockFetch(routes: { match: string; body: string; status?: number }[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes.find((r) => url.includes(r.match));
    if (!route) return new Response('not mocked', { status: 500 });
    return new Response(route.body, { status: route.status ?? 200 });
  });
}

const listEvent = (collection: string) => ({
  params: { collection },
  url: new URL(`https://x/admin/${collection}`),
  platform: { env: {} },
});

describe('adminLayoutLoad', () => {
  it('returns branding, session, pathname, and the collection nav list', () => {
    const data = adminLayoutLoad(
      { locals: { user: null }, url: new URL('https://x/admin/posts') },
      adapter,
    );
    expect(data.siteName).toBe('Test Site');
    expect(data.pathname).toBe('/admin/posts');
    expect(data.collections).toEqual([
      { type: 'posts', label: 'Posts' },
      { type: 'pages', label: 'Pages' },
    ]);
  });
});

describe('collectionListLoad', () => {
  it('throws 404 for an unknown collection', async () => {
    try {
      await collectionListLoad(listEvent('events'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isHttpError(err)).toBe(true);
      expect((err as { status: number }).status).toBe(404);
    }
  });

  it('lists entries with title, date, and draft from each frontmatter', async () => {
    mockFetch([
      {
        match: '/contents/src/content/posts?',
        body: JSON.stringify([
          { name: '2026-05-two.md', path: 'src/content/posts/2026-05-two.md', type: 'file' },
          { name: '2025-01-one.md', path: 'src/content/posts/2025-01-one.md', type: 'file' },
        ]),
      },
      {
        match: '2026-05-two.md',
        body: '---\ntitle: Second\ndate: 2026-05-10\ndraft: true\n---\nbody',
      },
      {
        match: '2025-01-one.md',
        body: '---\ntitle: First\ndate: 2025-01-02\n---\nbody',
      },
    ]);

    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.type).toBe('posts');
    expect(data.label).toBe('Posts');
    expect(data.error).toBeUndefined();
    // markdownFiles sorts newest id first, so 2026-05-two precedes 2025-01-one.
    expect(data.entries).toEqual([
      { id: '2026-05-two', path: 'src/content/posts/2026-05-two.md', title: 'Second', date: '2026-05-10', draft: true },
      { id: '2025-01-one', path: 'src/content/posts/2025-01-one.md', title: 'First', date: '2025-01-02', draft: false },
    ]);
  });

  it('degrades to the slug when an entry read fails', async () => {
    mockFetch([
      {
        match: '/contents/src/content/posts?',
        body: JSON.stringify([{ name: 'a.md', path: 'src/content/posts/a.md', type: 'file' }]),
      },
      { match: 'src/content/posts/a.md', body: 'boom', status: 500 },
    ]);
    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.entries).toEqual([
      { id: 'a', path: 'src/content/posts/a.md', title: 'a', date: null, draft: false },
    ]);
  });

  it('returns an inline error when the directory listing fails', async () => {
    mockFetch([{ match: '/contents/src/content/posts?', body: 'rate limited', status: 403 }]);
    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.entries).toEqual([]);
    expect(data.error).toMatch(/403/);
  });

  it('surfaces a create-flow error from the query string', async () => {
    mockFetch([{ match: '/contents/src/content/posts?', body: JSON.stringify([]) }]);
    const event = { params: { collection: 'posts' }, url: new URL('https://x/admin/posts?error=nope'), platform: { env: {} } };
    const data = await collectionListLoad(event, adapter);
    expect(data.formError).toBe('nope');
  });
});

function createEvent(collection: string, id: string) {
  const form = new FormData();
  form.set('id', id);
  return {
    params: { collection },
    locals: { user: { id: 'u1', name: 'Ed', email: 'ed@test', role: 'editor' as const } },
    platform: { env: {} },
    request: new Request('https://x/admin/posts?/create', { method: 'POST', body: form }),
  };
}

describe('createEntry', () => {
  it('rejects an invalid slug with a redirect back to the list', async () => {
    try {
      await createEntry(createEvent('posts', 'Not A Slug!'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      const loc = (err as { location: string }).location;
      expect(loc).toMatch(/^\/admin\/posts\?error=/);
    }
  });

  it('rejects a slug that already exists', async () => {
    mockFetch([{ match: 'src/content/posts/taken.md', body: '---\ntitle: Taken\n---\n' }]);
    try {
      await createEntry(createEvent('posts', 'taken'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect(decodeURIComponent((err as { location: string }).location)).toContain('already exists');
    }
  });

  it('redirects a valid new slug into the editor in create mode', async () => {
    // readRaw to 404 means the slug is free.
    mockFetch([{ match: 'src/content/posts/2026-05-fresh.md', body: 'not found', status: 404 }]);
    try {
      await createEntry(createEvent('posts', '2026-05-fresh'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).toBe('/admin/edit/posts/2026-05-fresh?new=1');
    }
  });
});
