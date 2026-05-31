import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
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
    vi.stubGlobal('fetch', vi.fn(async () => new Response('---\ntitle: Hello\ndate: 2026-05-01\n---\nThe body.', { status: 200 })));
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

  it('reads saved and error flags from the query', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('---\ntitle: Hi\n---\nx', { status: 200 })));
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('hi', '?saved=1&error=Nope') as never);
    expect(data.saved).toBe(true);
    expect(data.error).toBe('Nope');
  });
});
