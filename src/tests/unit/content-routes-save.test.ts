import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { CommitConflictError } from '../../lib/github/types.js';
import { emptyManifest, manifestEntryFromFile, parseManifest, serializeManifest, upsertEntry } from '../../lib/content/manifest.js';
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

function saveEvent(id: string, form: Record<string, string>) {
  const body = new URLSearchParams(form);
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

/** A fetch double for the new save path: one manifest read, then the commitFiles sequence
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

describe('saveAction', () => {
  it('commits the content file and the refreshed manifest in one commit', async () => {
    const calls = commitFetch(null); // empty manifest: first save on a fresh repo
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'See [about](cairn:pages/about) for more.' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }

    const treeReq = calls.find((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))!;
    const treeBody = JSON.parse(String(treeReq.init!.body)) as { tree: { path: string; content?: string }[] };
    const paths = treeBody.tree.map((t) => t.path);
    expect(paths).toContain('src/content/posts/2026-05-hi.md');
    expect(paths).toContain('src/content/.cairn/index.json');

    const manifestEntry = treeBody.tree.find((t) => t.path === 'src/content/.cairn/index.json')!;
    const committed = parseManifest(manifestEntry.content!);
    const saved = committed.entries.find((e) => e.concept === 'posts' && e.id === '2026-05-hi')!;
    expect(saved).toBeTruthy();
    expect(saved.links).toEqual([{ concept: 'pages', id: 'about' }]);

    const commitReq = calls.find((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/commits'))!;
    const commitBody = JSON.parse(String(commitReq.init!.body)) as { author: unknown; committer?: unknown };
    expect(commitBody.author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    expect(commitBody.committer).toBeUndefined();
  });

  it('upserts the saved entry into an existing committed manifest', async () => {
    const concept = runtime(() => ({ ok: true, data: {} })).concepts[0];
    const existingEntry = manifestEntryFromFile(concept, {
      path: 'src/content/posts/2026-05-hi.md',
      raw: '---\ntitle: Old\n---\nold body',
    });
    const incoming = serializeManifest(upsertEntry(emptyManifest(), existingEntry));
    const calls = commitFetch(incoming);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'New' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'New', body: 'links [about](cairn:pages/about) now' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }
    const treeReq = calls.find((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))!;
    const treeBody = JSON.parse(String(treeReq.init!.body)) as { tree: { path: string; content?: string }[] };
    const manifestEntry = treeBody.tree.find((t) => t.path === 'src/content/.cairn/index.json')!;
    const committed = parseManifest(manifestEntry.content!);
    const saved = committed.entries.filter((e) => e.concept === 'posts' && e.id === '2026-05-hi');
    expect(saved).toHaveLength(1); // upsert replaced, did not duplicate
    expect(saved[0].title).toBe('New');
    expect(saved[0].links).toEqual([{ concept: 'pages', id: 'about' }]);
  });

  it('bounces invalid frontmatter back to the form and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(() => ({ ok: false, errors: { title: 'Title is required' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-x', { title: '', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/error=.*Title/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid id before any commit', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })), deps);
    await expect(routes.saveAction(saveEvent('Bad Id!', { title: 'x', body: 'b' }) as never)).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a conflict as a reload prompt without overwriting', async () => {
    // The manifest read succeeds (404, empty), then the commitFiles ref update repeatedly fails
    // non-fast-forward, so commitFiles throws CommitConflictError.
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.includes('/contents/')) return new Response('Not Found', { status: 404 });
      if (method === 'GET' && url.includes('/git/ref/')) return json({ object: { sha: 'head1' } });
      if (method === 'GET' && url.includes('/git/commits/')) return json({ tree: { sha: 'basetree' } });
      if (method === 'POST' && url.endsWith('/git/trees')) return json({ sha: 'newtree' });
      if (method === 'POST' && url.endsWith('/git/commits')) return json({ sha: 'commit1' });
      if (method === 'PATCH' && url.includes('/git/refs/')) return new Response('{"message":"Update is not a fast forward"}', { status: 422 });
      return new Response('unexpected', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), deps);
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });

  it('matches a conflict by name even if the class identity differs', async () => {
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })), {
      mintToken: () => Promise.resolve('t'),
    });
    // Manifest read returns 404 (empty), then the ref update throws a look-alike error carrying
    // the class name, to exercise the name-based branch.
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.includes('/contents/')) return new Response('Not Found', { status: 404 });
      if (method === 'GET' && url.includes('/git/ref/')) return json({ object: { sha: 'head1' } });
      if (method === 'GET' && url.includes('/git/commits/')) return json({ tree: { sha: 'basetree' } });
      if (method === 'POST' && url.endsWith('/git/trees')) return json({ sha: 'newtree' });
      if (method === 'POST' && url.endsWith('/git/commits')) return json({ sha: 'commit1' });
      const e = new Error('x') as Error & { name: string };
      e.name = 'CommitConflictError';
      throw e;
    }));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location?: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });
});

it('CommitConflictError is importable for the instanceof branch', () => {
  expect(new CommitConflictError('p')).toBeInstanceOf(Error);
});
