import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createCairnAdmin } from '../../lib/sveltekit/cairn-admin.js';
import { testEvent } from '../helpers/test-event.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { Backend } from '../../lib/github/backend.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'Test Site',
    concepts: [
      { id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], schema: defineFieldset({}), summaryFields: [], validate: ok },
      { id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, permalink: '/:slug', datePrefix: 'day', fields: [], schema: defineFieldset({}), summaryFields: [], validate: ok },
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

// The dev double rides event.locals.cairnBackend; createCairnAdmin no longer takes a backend dep.
const backend = makeGithubBackend(REPO, async () => 'tok');
const deps = {};

/** A D1 stand-in whose every statement lists the given editor rows; enough for editorsLoad. */
function fakeDb(rows: { email: string; display_name: string; role: string }[]) {
  return { prepare: () => ({ all: async () => ({ results: rows }) }) };
}

/** Build the catch-all event: only `params.path` exists on the real one, so none is synthesized here. */
function adminEvent(
  pathname: string,
  opts: {
    editor?: { email: string; displayName: string; role: 'owner' | 'editor'; capability: 'owner' | 'editor' } | null;
    search?: string;
    db?: unknown;
    backend?: Backend;
  } = {},
) {
  const headers: Record<string, string> = {};
  return {
    ...testEvent({
      url: `https://t.example${pathname}${opts.search ?? ''}`,
      request: new Request(`https://t.example${pathname}`),
      locals: {
        cairnEditor:
          opts.editor === undefined
            ? { email: 'e@t', displayName: 'E', role: 'editor' as const, capability: 'editor' as const }
            : opts.editor,
        cairnBackend: opts.backend ?? backend,
      },
      env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', AUTH_DB: opts.db },
    }),
    setHeaders: (h: Record<string, string>) => Object.assign(headers, h),
    _headers: headers,
  };
}

/**
 * A minimal `Backend` fake for the history facade test: `historyLoad`'s whole contract with the
 * backend is `listCommits`/`branchHead` call shapes, which a hand-built fake asserts directly
 * without needing the fetch-level `GithubDouble` (which carries no commits-API endpoint).
 */
function fakeHistoryBackend(): Backend {
  const boom = (): never => {
    throw new Error('fakeHistoryBackend: unexpected call');
  };
  return {
    defaultBranch: 'main',
    // The existence probe: the entry is present on main, so history renders instead of 404ing.
    readFile: async (path, ref) => (ref === 'main' ? '# published' : boom()),
    readEntries: async () => boom(),
    branchHead: async () => null,
    listBranches: async () => boom(),
    commit: async () => boom(),
    listCommits: async (path, ref, limit) => {
      if (path !== 'src/content/posts/2026-05-hello.md' || ref !== 'main') return [];
      return [{ ref: 'sha-0', author: { name: 'Jamie Rivera', email: 'jamie@t' }, date: '2026-05-01T00:00:00Z' }].slice(0, limit + 1);
    },
    createBranch: async () => boom(),
    deleteBranch: async () => boom(),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('createCairnAdmin load dispatch', () => {
  it('throws 404 for a path the parser does not recognize', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.load(adminEvent('/admin/bogus'))).rejects.toMatchObject({ status: 404 });
  });

  it('redirects /admin to the first concept list', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.load(adminEvent('/admin'))).rejects.toMatchObject({
      status: 307,
      location: '/admin/posts',
    });
  });
});

describe('public views', () => {
  it('serves the login page bare, with branding derived from the runtime', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    const data = await admin.load(adminEvent('/admin/login', { editor: null }));
    expect(data.view).toBe('login');
    if (data.view !== 'login') throw new Error('narrowing');
    expect(data.page).toMatchObject({ siteName: 'Test Site', error: null });
    expect(data.page.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
    expect('layout' in data).toBe(false);
  });

  it('applies deps.auth.branding to the login page, overriding the runtime-derived default', async () => {
    const admin = createCairnAdmin(runtime(), { auth: { branding: { siteName: 'Overridden Site', from: 'x@test' } } });
    const data = await admin.load(adminEvent('/admin/login', { editor: null }));
    expect(data.view).toBe('login');
    if (data.view !== 'login') throw new Error('narrowing');
    expect(data.page.siteName).toBe('Overridden Site');
  });

  it('serves the confirm page with the token and sets Referrer-Policy', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    const event = adminEvent('/admin/auth/confirm', { editor: null, search: '?token=abc' });
    const data = await admin.load(event);
    expect(data.view).toBe('confirm');
    if (data.view !== 'confirm') throw new Error('narrowing');
    expect(data.page).toMatchObject({ token: 'abc', siteName: 'Test Site' });
    expect(event._headers['Referrer-Policy']).toBe('no-referrer');
  });
});

describe('authed views', () => {
  it('serves the list view with the concept synthesized from the URL', async () => {
    const gh = new GithubDouble({
      main: { 'src/content/posts/2026-05-hello.md': '---\ntitle: Hello\ndate: 2026-05-01\n---\nx' },
    });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const data = await admin.load(adminEvent('/admin/posts'));
    expect(data.view).toBe('list');
    if (data.view !== 'list') throw new Error('narrowing');
    // The chrome rides the separate shell load; this per-view load carries only the page data.
    expect('layout' in data).toBe(false);
    // The synthesized `concept` param reached the wrapped listLoad.
    expect(data.page.conceptId).toBe('posts');
    expect(data.page.entries).toEqual([
      { id: '2026-05-hello', title: 'Hello', date: '2026-05-01', draft: false, status: 'published', summary: 'x' },
    ]);
  });

  it('serves the edit view with the concept and id synthesized from the URL', async () => {
    const gh = new GithubDouble({
      main: { 'src/content/posts/2026-05-hello.md': '---\ntitle: Hello\ndate: 2026-05-01\n---\nbody' },
    });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const data = await admin.load(adminEvent('/admin/posts/2026-05-hello'));
    expect(data.view).toBe('edit');
    if (data.view !== 'edit') throw new Error('narrowing');
    expect('layout' in data).toBe(false);
    expect(data.page.conceptId).toBe('posts');
    expect(data.page.id).toBe('2026-05-hello');
    expect(data.page.title).toBe('Hello');
    expect(data.page.body).toBe('body');
  });

  it('delegates the history view with the concept and id synthesized from the URL', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    const event = adminEvent('/admin/posts/2026-05-hello/history', { backend: fakeHistoryBackend() });
    const data = await admin.load(event);
    expect(data.view).toBe('history');
    if (data.view !== 'history') throw new Error('narrowing');
    expect('layout' in data).toBe(false);
    // The page carries historyLoad's HistoryData shape: entries, draft, truncated.
    expect(data.page.entries).toEqual([{ ref: 'sha-0', editor: 'Jamie Rivera', date: '2026-05-01T00:00:00Z' }]);
    expect(data.page.draft).toBeNull();
    expect(data.page.truncated).toBe(false);
  });

  it('404s the history view for an unknown concept', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.load(adminEvent('/admin/unknown/2026-05-hello/history'))).rejects.toMatchObject({
      status: 404,
    });
  });

  it('404s the history view for a malformed id', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.load(adminEvent('/admin/posts/Hello/history'))).rejects.toMatchObject({
      status: 404,
    });
  });

  it('delegates the editors view for an owner', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = adminEvent('/admin/editors', {
      editor: { email: 'own@t', displayName: 'Own', role: 'owner', capability: 'owner' },
      db: fakeDb([
        { email: 'ed@t', display_name: 'Ed', role: 'editor' },
        { email: 'own@t', display_name: 'Own', role: 'owner' },
      ]),
    });
    const data = await admin.load(event);
    expect(data.view).toBe('editors');
    if (data.view !== 'editors') throw new Error('narrowing');
    expect('layout' in data).toBe(false);
    expect(data.page.self).toBe('own@t');
    expect(data.page.editors.map((e) => e.email)).toEqual(['ed@t', 'own@t']);
  });

  it('404s the nav view when the runtime configures no navMenu', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.load(adminEvent('/admin/nav'))).rejects.toMatchObject({ status: 404 });
  });

  it('serves the nav view when a navMenu is configured', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const rt = runtime();
    rt.navMenu = { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const admin = createCairnAdmin(rt, deps);
    const data = await admin.load(adminEvent('/admin/nav'));
    expect(data.view).toBe('nav');
    if (data.view !== 'nav') throw new Error('narrowing');
    expect('layout' in data).toBe(false);
    expect(data.page.menu).toEqual({ name: 'primary', label: 'Primary nav', maxDepth: 2 });
    expect(data.page.tree).toEqual([]);
  });
});
