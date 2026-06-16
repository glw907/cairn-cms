import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseManifest, serializeManifest } from '../../lib/content/manifest.js';
import type { CairnRuntime, ValidationResult } from '../../lib/content/types.js';

function runtime(validate: (fm: Record<string, unknown>, body: string) => ValidationResult): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts',
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
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
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
      status: number; data: { error: string; inboundLinks: { id: string }[]; id: string };
    };
    expect(result.status).toBe(409);
    expect(result.data.error).toContain('2026-05-hi');
    expect(result.data.id).toBe('2026-05-hi');
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

  it('logs commit.succeeded after a delete lands', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manifest = JSON.stringify({
      version: 1,
      entries: [{ id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] }],
    });
    commitFetch(manifest);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    try {
      await routes.deleteAction(deleteEvent('2026-05-hi') as never);
    } catch {
      // swallow the success redirect
    }
    const record = infoSpy.mock.calls.map((c) => c[0] as { event?: string; editor?: string }).find((r) => r.event === 'commit.succeeded');
    expect(record).toBeTruthy();
    expect(record?.editor).toBe('ed@t');
    vi.restoreAllMocks();
  });
});

describe('deleteAction with a pending branch', () => {
  const ENTRY_PATH = 'src/content/posts/2026-05-hi.md';
  const MANIFEST_PATH = 'src/content/.cairn/index.json';

  it('cascades: the branch goes and the main commit removes the file and the manifest row', async () => {
    const manifest = serializeManifest({
      version: 1,
      entries: [{ id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] }],
    });
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nlive', [MANIFEST_PATH]: manifest },
    });
    gh.createBranch('cairn/posts/2026-05-hi', 'main');
    gh.install();
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    try {
      await routes.deleteAction(deleteEvent('2026-05-hi') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts');
    }
    expect(gh.branches.has('cairn/posts/2026-05-hi')).toBe(false);
    expect(gh.read('main', ENTRY_PATH)).toBeNull();
    const committed = parseManifest(gh.read('main', MANIFEST_PATH)!);
    expect(committed.entries.find((e) => e.id === '2026-05-hi')).toBeUndefined();
  });

  it('keeps the pending branch when the main removal conflicts, so the edits survive', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manifest = serializeManifest({
      version: 1,
      entries: [{ id: '2026-05-hi', concept: 'posts', title: 'Hi', permalink: '/p/hi', draft: false, links: [] }],
    });
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nlive', [MANIFEST_PATH]: manifest },
    });
    gh.createBranch('cairn/posts/2026-05-hi', 'main');
    gh.install();
    // Main's ref update fails the way GitHub signals a stale head; everything else stays on the
    // double, so the branch cascade (which runs only after the main commit) never fires.
    const double = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if ((init?.method ?? 'GET').toUpperCase() === 'PATCH' && url.includes('/git/refs/heads/main')) {
        return new Response('{"message":"Update is not a fast forward"}', { status: 422 });
      }
      return double(input, init);
    });
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    try {
      await routes.deleteAction(deleteEvent('2026-05-hi') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*changed%20since/i);
    }
    // The entry survives on main and the pending edits survive on their branch.
    expect(gh.branches.has('cairn/posts/2026-05-hi')).toBe(true);
    expect(gh.read('main', ENTRY_PATH)).toContain('live');
  });

  it('deletes a never-published entry by removing only its branch, with no main commit', async () => {
    const empty = serializeManifest({ version: 1, entries: [] });
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: empty },
      'cairn/posts/2026-05-hi': { [MANIFEST_PATH]: empty, [ENTRY_PATH]: '---\ntitle: Hi\n---\npending only' },
    });
    gh.install();
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    try {
      await routes.deleteAction(deleteEvent('2026-05-hi') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts');
    }
    expect(gh.branches.has('cairn/posts/2026-05-hi')).toBe(false);
    expect(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
    expect(gh.read('main', MANIFEST_PATH)).toBe(empty);
  });
});
