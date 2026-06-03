import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', dir: 'src/content/posts',
        routing: { routable: true, dated: true, inFeeds: true },
        permalink: '/posts/:slug',
        datePrefix: 'day',
        fields: [
          { type: 'text', name: 'title', label: 'Title', required: true },
          { type: 'date', name: 'date', label: 'Date' },
        ],
        validate: ok,
      },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: 'src/content/.cairn/index.json',
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function editEvent(id: string, search = '') {
  return {
    url: new URL(`https://t.example/admin/posts/${id}${search}`),
    params: { concept: 'posts', id },
    request: new Request('https://t.example'),
    locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('editLoad', () => {
  it('loads an existing file with parsed, form-ready frontmatter and body', async () => {
    // The entry read returns the markdown; the trailing manifest read 404s (empty list).
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce(new Response('---\ntitle: Hello\ndate: 2026-05-01\n---\nThe body.', { status: 200 }))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data).toMatchObject({
      conceptId: 'posts', id: '2026-05-hello', label: 'Posts', title: 'Hello',
      body: 'The body.', isNew: false, saved: false, error: null,
    });
    expect(data.frontmatter.title).toBe('Hello');
    expect(data.frontmatter.date).toBe('2026-05-01');
  });

  it('returns a blank document for ?new=1 when the file is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-fresh', '?new=1') as never);
    expect(data.isNew).toBe(true);
    expect(data.body).toBe('');
    expect(data.title).toBe('2026-05-fresh');
  });

  it('404s an unknown existing file that is not new', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    await expect(routes.editLoad(editEvent('missing') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects an invalid id with a 400', async () => {
    const routes = createContentRoutes(runtime(), deps);
    await expect(routes.editLoad(editEvent('Bad Id!') as never)).rejects.toMatchObject({ status: 400 });
  });

  it('ships the manifest link targets, and an empty list when the manifest is missing', async () => {
    const manifest = serializeManifest({
      version: 1,
      entries: [{ id: 'about', concept: 'pages', title: 'About', permalink: '/about', draft: false, links: [] }],
    });
    // editLoad reads the entry first, then the manifest, so the stub returns the entry on the
    // first fetch and the manifest on the second.
    const caseA = vi
      .fn()
      .mockResolvedValueOnce(new Response('---\ntitle: Hello\n---\nThe body.', { status: 200 }))
      .mockResolvedValueOnce(new Response(manifest, { status: 200 }));
    vi.stubGlobal('fetch', caseA);
    const routes = createContentRoutes(runtime(), deps);
    const withManifest = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(withManifest.linkTargets).toContainEqual({
      concept: 'pages', id: 'about', permalink: '/about', title: 'About', date: undefined, draft: false,
    });

    const caseB = vi
      .fn()
      .mockResolvedValueOnce(new Response('---\ntitle: Hello\n---\nThe body.', { status: 200 }))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }));
    vi.stubGlobal('fetch', caseB);
    const withoutManifest = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(withoutManifest.linkTargets).toEqual([]);
  });

  it('ships the entry inbound links for the delete guard', async () => {
    // A manifest where post 'b' links to the post '2026-05-hello' being edited.
    const manifest = serializeManifest({
      version: 1,
      entries: [
        { id: '2026-05-hello', concept: 'posts', title: 'Hello', permalink: '/posts/hello', draft: false, links: [] },
        { id: '2026-05-b', concept: 'posts', title: 'Post B', permalink: '/posts/b', draft: false, links: [{ concept: 'posts', id: '2026-05-hello' }] },
      ],
    });
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce(new Response('---\ntitle: Hello\n---\nx', { status: 200 }))
      .mockResolvedValueOnce(new Response(manifest, { status: 200 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.inboundLinks).toEqual([{ concept: 'posts', id: '2026-05-b', title: 'Post B', permalink: '/posts/b' }]);
  });

  it('ships the current slug for the rename dialog', async () => {
    // The posts concept uses a day prefix, so 2026-05-01-hello strips to the slug hello.
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce(new Response('---\ntitle: Hello\n---\nx', { status: 200 }))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-01-hello') as never);
    expect(data.slug).toBe('hello');
  });

  it('reads saved and error flags from the query', async () => {
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce(new Response('---\ntitle: Hi\n---\nx', { status: 200 }))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('hi', '?saved=1&error=Nope') as never);
    expect(data.saved).toBe(true);
    expect(data.error).toBe('Nope');
  });

  it('reads the renamed flag from the query', async () => {
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce(new Response('---\ntitle: Hi\n---\nx', { status: 200 }))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('hi', '?renamed=1') as never);
    expect(data.renamed).toBe(true);
  });
});
