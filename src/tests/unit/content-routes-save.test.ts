import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { CommitConflictError } from '../../lib/github/types.js';
import { manifestEntryFromFile, serializeManifest } from '../../lib/content/manifest.js';
import type { CairnRuntime, ValidationResult } from '../../lib/content/types.js';
import type { Backend } from '../../lib/github/backend.js';
import { fieldset } from '../../lib/content/fieldset.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

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
        schema: fieldset({}),
        summaryFields: [],
        validate,
      },
    ],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
  };
}

// The default read/commit backend every event's `locals.backend` rides.
const backend = makeGithubBackend(REPO, () => Promise.resolve('test-token'));

function saveEvent(id: string, form: Record<string, string>, eventBackend: Backend = backend) {
  const body = new URLSearchParams(form);
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST', body }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const }, backend: eventBackend },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** A scripted fetch double for the save path: one manifest read, the pending-branch ref probe
 *  (any GET /git/ref/ answers with a head, so the branch reads as existing), then the
 *  commitFiles sequence (GET ref, GET commit, POST trees, POST commits, PATCH ref).
 *  `manifestRaw` is the body the manifest read returns, or null for a 404 (the
 *  empty-manifest case). */
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
  it('commits only the entry file to the pending branch, authored by the editor', async () => {
    // A manifest on main holding the published pages/about the body links to, so the guard passes.
    const aboutRow = manifestEntryFromFile(runtime(() => ({ ok: true, data: {} })).concepts[0], {
      path: 'src/content/pages/about.md',
      raw: '---\ntitle: About\n---\nx',
    });
    const manifest = serializeManifest({ version: 1, entries: [{ ...aboutRow, concept: 'pages', id: 'about', draft: false }] });
    const gh = new GithubDouble({ main: { 'src/content/.cairn/index.json': manifest } });
    gh.install();
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'See [about](cairn:pages/about) for more.' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }

    // The saved content lands on the pending branch; main is untouched.
    expect(gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md')).toContain('title: Hi');
    expect(gh.read('main', 'src/content/posts/2026-05-hi.md')).toBeNull();

    // No manifest change rides the commit: both copies still hold the seeded bytes.
    expect(gh.read('main', 'src/content/.cairn/index.json')).toBe(manifest);
    expect(gh.read('cairn/posts/2026-05-hi', 'src/content/.cairn/index.json')).toBe(manifest);

    const commitReq = gh.calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/commits'))!;
    const commitBody = commitReq.body as { author: unknown; committer?: unknown };
    expect(commitBody.author).toEqual({ name: 'Ed Editor', email: 'ed@t' });
    expect(commitBody.committer).toBeUndefined();
  });

  it('leaves the committed manifest untouched when the entry already has a row', async () => {
    const concept = runtime(() => ({ ok: true, data: {} })).concepts[0];
    const existingEntry = manifestEntryFromFile(concept, {
      path: 'src/content/posts/2026-05-hi.md',
      raw: '---\ntitle: Old\n---\nold body',
    });
    const manifest = serializeManifest({ version: 1, entries: [existingEntry] });
    const gh = new GithubDouble({
      main: {
        'src/content/.cairn/index.json': manifest,
        'src/content/posts/2026-05-hi.md': '---\ntitle: Old\n---\nold body',
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'New' } })));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'New', body: 'fresh body' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }
    // The branch carries the new content; main still serves the old file and the old manifest row.
    expect(gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md')).toContain('title: New');
    expect(gh.read('main', 'src/content/posts/2026-05-hi.md')).toContain('title: Old');
    expect(gh.read('main', 'src/content/.cairn/index.json')).toBe(manifest);
  });

  it('bounces invalid frontmatter back to the form and never commits', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = createContentRoutes(runtime(() => ({ ok: false, errors: { title: 'Title is required' } })));
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
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: {} })));
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
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toMatch(/error=.*changed%20since/i);
    }
  });

  it('blocks a save that links to an absent target, with no commit', async () => {
    const calls = commitFetch(null); // empty manifest: nothing to resolve against
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })));
    const result = (await routes.saveAction(
      saveEvent('2026-05-hi', { title: 'Hi', body: 'see [gone](cairn:pages/gone)' }) as never,
    )) as unknown as { status: number; data: { error: string; brokenLinks: string[] } };
    expect(result.status).toBe(400);
    expect(result.data.error).toMatch(/1 missing page/i);
    expect(result.data.brokenLinks).toContain('cairn:pages/gone');
    // No commit: the only fetch is the manifest read, no POST to /git/trees.
    expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(false);
  });

  it('accepts a mintToken that returns a bare string', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })));
    const syncBackend = makeGithubBackend(REPO, () => 'sync-token');
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'plain body' }, syncBackend) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }
    expect(gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md')).toContain('title: Hi');
  });

  it('allows a save that links to a draft target, with a warning', async () => {
    // A manifest holding one draft page 'wip'. The saved post links to it.
    const concept = runtime(() => ({ ok: true, data: {} })).concepts[0];
    const draftRow = manifestEntryFromFile(concept, { path: 'src/content/posts/wip.md', raw: '---\ntitle: WIP\ndraft: true\n---\nx' });
    // Force the draft row's concept/id to a pages target the body links to.
    const manifest = serializeManifest({ version: 1, entries: [{ ...draftRow, concept: 'pages', id: 'wip', draft: true }] });
    commitFetch(manifest);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'see [wip](cairn:pages/wip)' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      const loc = (e as { location: string }).location;
      expect(loc).toMatch(/saved=1/);
      expect(loc).toMatch(/draft/i);
    }
  });

  it('does not draft-warn a draft entry that links to itself', async () => {
    // A draft post that links to its own token. The self-link is valid by construction (the
    // upserted manifest holds this very entry), so the save commits with no drafts= warning.
    const concept = runtime(() => ({ ok: true, data: {} })).concepts[0];
    const selfRow = manifestEntryFromFile(concept, { path: 'src/content/posts/2026-05-hi.md', raw: '---\ntitle: Hi\ndraft: true\n---\nx' });
    const manifest = serializeManifest({ version: 1, entries: [{ ...selfRow, concept: 'posts', id: '2026-05-hi', draft: true }] });
    commitFetch(manifest);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi', draft: true } })));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'see [self](cairn:posts/2026-05-hi)' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      const loc = (e as { location: string }).location;
      expect(loc).toBe('/admin/posts/2026-05-hi?saved=1');
      expect(loc).not.toMatch(/drafts=/);
    }
  });

  it('commits cleanly when every link resolves to a published target', async () => {
    const concept = runtime(() => ({ ok: true, data: {} })).concepts[0];
    const liveRow = manifestEntryFromFile(concept, { path: 'src/content/pages/home.md', raw: '---\ntitle: Home\n---\nx' });
    const manifest = serializeManifest({ version: 1, entries: [{ ...liveRow, concept: 'pages', id: 'home', draft: false }] });
    const calls = commitFetch(manifest);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'see [home](cairn:pages/home)' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }
    expect(calls.some((c) => (c.init?.method ?? 'GET') === 'POST' && c.url.endsWith('/git/trees'))).toBe(true);
  });

  it('logs commit.succeeded after a save lands', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const aboutRow = manifestEntryFromFile(runtime(() => ({ ok: true, data: {} })).concepts[0], {
      path: 'src/content/pages/about.md',
      raw: '---\ntitle: About\n---\nx',
    });
    const manifest = serializeManifest({ version: 1, entries: [{ ...aboutRow, concept: 'pages', id: 'about', draft: false }] });
    commitFetch(manifest);
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'See [about](cairn:pages/about) for more.' }) as never);
    } catch {
      // swallow the success redirect
    }
    const record = infoSpy.mock.calls.map((c) => c[0] as { event?: string; editor?: string }).find((r) => r.event === 'commit.succeeded');
    expect(record).toBeTruthy();
    expect(record?.editor).toBe('ed@t');
    vi.restoreAllMocks();
  });

  it('logs commit.failed reason=conflict on a 409', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
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
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'b' }) as never);
    } catch {
      // swallow the conflict redirect
    }
    const reasons = warnSpy.mock.calls.map((c) => (c[0] as { event?: string; reason?: string }));
    expect(reasons.some((r) => r.event === 'commit.failed' && r.reason === 'conflict')).toBe(true);
    vi.restoreAllMocks();
  });

  it('matches a conflict by name even if the class identity differs', async () => {
    const routes = createContentRoutes(runtime(() => ({ ok: true, data: { title: 'Hi' } })));
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

describe('saveAction taxonomy enforcement', () => {
  /** A runtime whose `posts` concept marks a `topics` taxonomy multiselect, with the given
   *  vocabulary. The validate echoes the decoded frontmatter back as `data`, so the committed
   *  file carries the posted `topics` (the orphan-survival assertion reads it). */
  function taxonomyRuntime(vocabulary: { value: string; label: string }[]): CairnRuntime {
    return {
      siteName: 'T',
      concepts: [
        {
          id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts',
          routing: { routable: true, dated: true, inFeeds: true },
          permalink: '/posts/:slug',
          datePrefix: 'day',
          fields: [
            { type: 'text', name: 'title', label: 'Title', required: true },
            { type: 'multiselect', name: 'topics', label: 'Topics', taxonomy: true, creatable: true },
          ],
          schema: fieldset({}),
          summaryFields: [],
          validate: (fm) => ({ ok: true, data: fm }),
        },
      ],
      backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
      sender: { from: 'cms@test' },
      render: ({ body }) => Promise.resolve(body),
      manifestPath: 'src/content/.cairn/index.json',
      mediaManifestPath: 'src/content/.cairn/media.json',
      resolvedAssets: { enabled: false },
      vocabulary,
    };
  }

  it('commits a posted tag that is in the vocabulary', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(taxonomyRuntime([{ value: 'a', label: 'A' }]));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', topics: 'a', body: 'plain', new: '1' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }
    const saved = gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md');
    expect(saved).toContain('title: Hi');
    expect(saved).toContain('a');
  });

  it('rejects a brand-new tag not in the vocabulary and never commits', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(taxonomyRuntime([{ value: 'a', label: 'A' }]));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', topics: 'brandnew', body: 'plain', new: '1' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { status: number }).status).toBe(303);
      expect((e as { location: string }).location).toMatch(/error=.*brandnew/i);
      expect((e as { location: string }).location).toMatch(/new=1/);
    }
    // No commit landed: the branch was never written.
    expect(gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md')).toBeNull();
  });

  it('preserves a prior orphan tag re-posted via getAll', async () => {
    // The committed file on main already carries an orphan `legacy` alongside the in-vocab `a`.
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-05-hi.md': "---\ntitle: Old\ntopics:\n  - a\n  - legacy\n---\nold body",
      },
    });
    gh.install();
    const routes = createContentRoutes(taxonomyRuntime([{ value: 'a', label: 'A' }]));
    const form = new URLSearchParams();
    form.append('title', 'Hi');
    form.append('topics', 'a');
    form.append('topics', 'legacy');
    form.append('body', 'fresh body');
    const event = {
      url: new URL('https://t.example/admin/posts/2026-05-hi'),
      params: { concept: 'posts', id: '2026-05-hi' },
      request: new Request('https://t.example/admin/posts/2026-05-hi', { method: 'POST', body: form }),
      locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const }, backend },
      platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    };
    try {
      await routes.saveAction(event as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }
    const saved = gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md');
    expect(saved).toContain('legacy');
    expect(saved).toContain('title: Hi');
  });

  it('commits a free-form tag with no vocabulary (the opt-in fallback)', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(taxonomyRuntime([]));
    try {
      await routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', topics: 'anything', body: 'plain', new: '1' }) as never);
      throw new Error('should have redirected');
    } catch (e) {
      expect((e as { location: string }).location).toBe('/admin/posts/2026-05-hi?saved=1');
    }
    const saved = gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md');
    expect(saved).toContain('anything');
  });
});

it('CommitConflictError is importable for the instanceof branch', () => {
  expect(new CommitConflictError('p')).toBeInstanceOf(Error);
});
