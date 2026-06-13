import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseManifest } from '../../lib/content/manifest.js';
import type { CairnRuntime, ValidationResult } from '../../lib/content/types.js';

// The posts concept uses a day prefix, so a fixture id is 2026-05-01-<slug> and its slug strips to
// <slug>. The pages concept is non-dated, so its id is its whole slug and a linker page can point at
// the renamed post. renameId('2026-05-01-hi', 'new', 'day') yields 2026-05-01-new.
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
      {
        id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages',
        routing: { routable: true, dated: false, inFeeds: false },
        permalink: '/:slug',
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

function renameEvent(id: string, slug: string) {
  const body = new URLSearchParams({ slug });
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

interface TreeChange {
  path: string;
  sha: string | null;
  content?: string;
}

/** A fetch double for the rename path: a contents GET answers from `files` (a `null` value or an
 *  absent key is a 404), then the commitFiles sequence (GET ref, GET commit, POST trees, POST
 *  commits, PATCH ref). It records every call so a test can assert the captured tree or that no
 *  commit happened. Generalizes the delete test's `commitFetch` to serve several content paths. */
function renameFetch(files: Map<string, string | null>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const method = init?.method ?? 'GET';
    if (method === 'GET' && url.includes('/contents/')) {
      const path = decodeURIComponent(url.split('/contents/')[1].split('?')[0]);
      const raw = files.get(path);
      return raw == null ? new Response('Not Found', { status: 404 }) : new Response(raw, { status: 200 });
    }
    // The pending-branch probe (a slashed name arrives percent-encoded) answers 404: no branch.
    if (method === 'GET' && url.includes('/git/ref/heads/cairn%2F')) return new Response('Not Found', { status: 404 });
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

/** The parsed `tree` array from the captured `/git/trees` POST body. */
function treeOf(calls: { url: string; init?: RequestInit }[]): TreeChange[] {
  const treeReq = calls.find((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))!;
  return (JSON.parse(String(treeReq.init!.body)) as { tree: TreeChange[] }).tree;
}

afterEach(() => vi.restoreAllMocks());

describe('renameAction', () => {
  it('renames the file and the manifest with no inbound links', async () => {
    const manifest = JSON.stringify({
      version: 1,
      entries: [{ id: '2026-05-01-hi', concept: 'posts', title: 'Hi', permalink: '/posts/hi', draft: false, links: [] }],
    });
    const files = new Map<string, string | null>([
      ['src/content/posts/2026-05-01-new.md', null],
      ['src/content/posts/2026-05-01-hi.md', '---\ntitle: Hi\n---\nbody'],
      ['src/content/.cairn/index.json', manifest],
    ]);
    const calls = renameFetch(files);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    try {
      await routes.renameAction(renameEvent('2026-05-01-hi', 'new') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-01-new?renamed=1');
    }
    const tree = treeOf(calls);
    expect(tree.find((t) => t.path === 'src/content/posts/2026-05-01-hi.md')!.sha).toBeNull();
    expect(tree.find((t) => t.path === 'src/content/posts/2026-05-01-new.md')!.content).toContain('title: Hi');
    const committed = parseManifest(tree.find((t) => t.path === 'src/content/.cairn/index.json')!.content!);
    expect(committed.entries.map((e) => e.id)).toEqual(['2026-05-01-new']);
  });

  it('rewrites an inbound linker body and its manifest edge', async () => {
    const manifest = JSON.stringify({
      version: 1,
      entries: [
        { id: '2026-05-01-hi', concept: 'posts', title: 'Hi', permalink: '/posts/hi', draft: false, links: [] },
        { id: 'home', concept: 'pages', title: 'Home', permalink: '/', draft: false, links: [{ concept: 'posts', id: '2026-05-01-hi' }] },
      ],
    });
    const files = new Map<string, string | null>([
      ['src/content/posts/2026-05-01-new.md', null],
      ['src/content/posts/2026-05-01-hi.md', '---\ntitle: Hi\n---\nbody'],
      ['src/content/.cairn/index.json', manifest],
      ['src/content/pages/home.md', '---\ntitle: Home\n---\nsee [hi](cairn:posts/2026-05-01-hi)'],
    ]);
    const calls = renameFetch(files);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    try {
      await routes.renameAction(renameEvent('2026-05-01-hi', 'new') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-01-new?renamed=1');
    }
    const tree = treeOf(calls);
    const home = tree.find((t) => t.path === 'src/content/pages/home.md')!;
    expect(home.content).toContain('cairn:posts/2026-05-01-new');
    expect(home.content).not.toContain('cairn:posts/2026-05-01-hi');
    const committed = parseManifest(tree.find((t) => t.path === 'src/content/.cairn/index.json')!.content!);
    const homeRow = committed.entries.find((e) => e.id === 'home')!;
    expect(homeRow.links).toEqual([{ concept: 'posts', id: '2026-05-01-new' }]);
  });

  it('rewrites a self-token in the renamed body', async () => {
    const manifest = JSON.stringify({
      version: 1,
      entries: [{ id: '2026-05-01-hi', concept: 'posts', title: 'Hi', permalink: '/posts/hi', draft: false, links: [{ concept: 'posts', id: '2026-05-01-hi' }] }],
    });
    const files = new Map<string, string | null>([
      ['src/content/posts/2026-05-01-new.md', null],
      ['src/content/posts/2026-05-01-hi.md', '---\ntitle: Hi\n---\nsee [self](cairn:posts/2026-05-01-hi)'],
      ['src/content/.cairn/index.json', manifest],
    ]);
    const calls = renameFetch(files);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    try {
      await routes.renameAction(renameEvent('2026-05-01-hi', 'new') as never);
      throw new Error('should have redirected');
    } catch { /* redirected */ }
    const tree = treeOf(calls);
    const moved = tree.find((t) => t.path === 'src/content/posts/2026-05-01-new.md')!;
    expect(moved.content).toContain('cairn:posts/2026-05-01-new');
  });

  it('refuses a collision with no commit', async () => {
    const files = new Map<string, string | null>([
      ['src/content/posts/2026-05-01-new.md', '---\ntitle: Taken\n---\nx'], // exists -> collision
      ['src/content/posts/2026-05-01-hi.md', '---\ntitle: Hi\n---\nbody'],
      ['src/content/.cairn/index.json', JSON.stringify({ version: 1, entries: [] })],
    ]);
    const calls = renameFetch(files);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    const result = (await routes.renameAction(renameEvent('2026-05-01-hi', 'new') as never)) as unknown as {
      status: number; data: { error: string };
    };
    expect(result.status).toBe(409);
    expect(result.data.error).toMatch(/already exists/i);
    expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
  });

  it('rejects a no-op slug with no commit', async () => {
    const files = new Map<string, string | null>([['src/content/.cairn/index.json', JSON.stringify({ version: 1, entries: [] })]]);
    const calls = renameFetch(files);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    const result = (await routes.renameAction(renameEvent('2026-05-01-hi', 'hi') as never)) as unknown as {
      status: number; data: { error: string };
    };
    expect(result.status).toBe(400);
    expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
  });
});

describe('renameAction with a pending branch', () => {
  const ENTRY_PATH = 'src/content/posts/2026-05-01-hi.md';
  const MANIFEST_PATH = 'src/content/.cairn/index.json';
  const manifest = JSON.stringify({
    version: 1,
    entries: [{ id: '2026-05-01-hi', concept: 'posts', title: 'Hi', permalink: '/posts/hi', draft: false, links: [] }],
  });

  it('refuses with a 409 while the entry has unpublished edits, with no commit', async () => {
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody', [MANIFEST_PATH]: manifest },
    });
    gh.createBranch('cairn/posts/2026-05-01-hi', 'main');
    gh.install();
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    const result = (await routes.renameAction(renameEvent('2026-05-01-hi', 'new') as never)) as unknown as {
      status: number; data: { error: string };
    };
    expect(result.status).toBe(409);
    expect(result.data.error).toMatch(/unpublished edits/i);
    expect(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
  });

  it('proceeds when no pending branch exists', async () => {
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody', [MANIFEST_PATH]: manifest },
    });
    gh.install();
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    try {
      await routes.renameAction(renameEvent('2026-05-01-hi', 'new') as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-01-new?renamed=1');
    }
    expect(gh.read('main', 'src/content/posts/2026-05-01-new.md')).toContain('title: Hi');
    expect(gh.read('main', ENTRY_PATH)).toBeNull();
  });
});
