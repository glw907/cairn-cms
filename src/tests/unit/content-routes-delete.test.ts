import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseManifest } from '../../lib/content/manifest.js';
import type { CairnRuntime, ValidationResult } from '../../lib/content/types.js';

function runtime(validate: (fm: Record<string, unknown>, body: string) => ValidationResult): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', dir: 'src/content/posts',
        routing: { routable: true, dated: true, inFeeds: true },
        permalink: '/posts/:slug',
        datePrefix: 'day',
        fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
        summaryFields: [],
        validate,
      },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: 'src/content/.cairn/index.json',
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function deleteEvent(id: string) {
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST' }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** A fetch double for the delete path: one manifest read, then the commitFiles sequence
 *  (GET ref, GET commit, POST trees, POST commits, PATCH ref). `manifestRaw` is the body the
 *  manifest read returns, or null for a 404 (the empty-manifest case). */
function commitFetch(manifestRaw: string | null) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const method = init?.method ?? 'GET';
    if (method === 'GET' && url.includes('/contents/')) {
      return manifestRaw === null ? new Response('Not Found', { status: 404 }) : new Response(manifestRaw, { status: 200 });
    }
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

afterEach(() => vi.restoreAllMocks());

describe('deleteAction', () => {
  it('refuses to delete an entry that has inbound links, with no commit', async () => {
    const manifest = JSON.stringify({
      version: 1,
      entries: [
        { id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] },
        { id: 'b', concept: 'posts', title: 'B', permalink: '/p/b', draft: false, links: [{ concept: 'posts', id: '2026-05-hi' }] },
      ],
    });
    const calls = commitFetch(manifest);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    const result = (await routes.deleteAction(deleteEvent('2026-05-hi') as never)) as unknown as {
      status: number; data: { inboundLinks: { id: string }[] };
    };
    expect(result.status).toBe(409);
    expect(result.data.inboundLinks.map((l) => l.id)).toEqual(['b']);
    expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
  });

  it('deletes the file and removes the manifest entry in one commit', async () => {
    const manifest = JSON.stringify({
      version: 1,
      entries: [{ id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] }],
    });
    const calls = commitFetch(manifest);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    try {
      await routes.deleteAction(deleteEvent('2026-05-hi') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts');
    }
    const treeReq = calls.find((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))!;
    const treeBody = JSON.parse(String(treeReq.init!.body)) as { tree: { path: string; sha: string | null; content?: string }[] };
    const fileEntry = treeBody.tree.find((t) => t.path === 'src/content/posts/2026-05-hi.md')!;
    expect(fileEntry.sha).toBeNull(); // a delete is encoded as sha:null
    const manifestEntry = treeBody.tree.find((t) => t.path === 'src/content/.cairn/index.json')!;
    const committed = parseManifest(manifestEntry.content!);
    expect(committed.entries.find((e) => e.id === '2026-05-hi')).toBeUndefined();
  });
});
