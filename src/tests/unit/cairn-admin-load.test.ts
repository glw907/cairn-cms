import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createCairnAdmin } from '../../lib/sveltekit/cairn-admin.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'Test Site',
    concepts: [
      { id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts', routing: { routable: true, dated: true, inFeeds: true }, permalink: '/posts/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [], validate: ok },
      { id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages', routing: { routable: true, dated: false, inFeeds: false }, permalink: '/:slug', datePrefix: 'day', fields: [], schema: fieldset({}), summaryFields: [], validate: ok },
    ],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
  };
}

// The dev double rides event.locals.backend; createCairnAdmin no longer takes a backend dep.
const backend = makeGithubBackend(REPO, async () => 'tok');
const deps = {};

/** A D1 stand-in whose every statement lists the given editor rows; enough for editorsLoad. */
function fakeDb(rows: { email: string; display_name: string; role: string }[]) {
  return { prepare: () => ({ all: async () => ({ results: rows }) }) };
}

/** Build the catch-all event: only `params.path` exists on the real one, so none is synthesized here. */
function adminEvent(
  pathname: string,
  opts: { editor?: { email: string; displayName: string; scopes: string[]; tier: string } | null; search?: string; db?: unknown } = {},
) {
  const headers: Record<string, string> = {};
  return {
    url: new URL(`https://t.example${pathname}${opts.search ?? ''}`),
    request: new Request(`https://t.example${pathname}`),
    locals: { principal: opts.editor === undefined ? { email: 'e@t', displayName: 'E', scopes: ['admin:editor'], tier: 'admin' } : opts.editor, backend },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', AUTH_DB: opts.db } },
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
    setHeaders: (h: Record<string, string>) => Object.assign(headers, h),
    _headers: headers,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('createCairnAdmin load dispatch', () => {
  it('throws 404 for a path the parser does not recognize', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.load(adminEvent('/admin/bogus') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('redirects /admin to the first concept list', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.load(adminEvent('/admin') as never)).rejects.toMatchObject({
      status: 307,
      location: '/admin/posts',
    });
  });
});

describe('public views', () => {
  it('serves the login page bare, with branding derived from the runtime', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    const data = await admin.load(adminEvent('/admin/login', { editor: null }) as never);
    expect(data.view).toBe('login');
    if (data.view !== 'login') throw new Error('narrowing');
    expect(data.page).toMatchObject({ siteName: 'Test Site', error: null });
    expect(data.page.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
    expect('layout' in data).toBe(false);
  });

  it('serves the confirm page with the token and sets Referrer-Policy', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    const event = adminEvent('/admin/auth/confirm', { editor: null, search: '?token=abc' });
    const data = await admin.load(event as never);
    expect(data.view).toBe('confirm');
    if (data.view !== 'confirm') throw new Error('narrowing');
    expect(data.page).toMatchObject({ token: 'abc', siteName: 'Test Site' });
    expect(event._headers['Referrer-Policy']).toBe('no-referrer');
  });
});

describe('authed views', () => {
  it('serves the list view with layout and the concept synthesized from the URL', async () => {
    const gh = new GithubDouble({
      main: { 'src/content/posts/2026-05-hello.md': '---\ntitle: Hello\ndate: 2026-05-01\n---\nx' },
    });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const data = await admin.load(adminEvent('/admin/posts') as never);
    expect(data.view).toBe('list');
    if (data.view !== 'list') throw new Error('narrowing');
    expect(data.layout.siteName).toBe('Test Site');
    expect(data.layout.pathname).toBe('/admin/posts');
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
    const data = await admin.load(adminEvent('/admin/posts/2026-05-hello') as never);
    expect(data.view).toBe('edit');
    if (data.view !== 'edit') throw new Error('narrowing');
    expect(data.layout.pathname).toBe('/admin/posts/2026-05-hello');
    expect(data.page.conceptId).toBe('posts');
    expect(data.page.id).toBe('2026-05-hello');
    expect(data.page.title).toBe('Hello');
    expect(data.page.body).toBe('body');
  });

  it('delegates the editors view for an owner', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const admin = createCairnAdmin(runtime(), deps);
    const event = adminEvent('/admin/editors', {
      editor: { email: 'own@t', displayName: 'Own', scopes: ['admin:owner', 'admin:editor'], tier: 'admin' },
      db: fakeDb([
        { email: 'ed@t', display_name: 'Ed', role: 'editor' },
        { email: 'own@t', display_name: 'Own', role: 'owner' },
      ]),
    });
    const data = await admin.load(event as never);
    expect(data.view).toBe('editors');
    if (data.view !== 'editors') throw new Error('narrowing');
    expect(data.layout.canManageEditors).toBe(true);
    expect(data.page.self).toBe('own@t');
    expect(data.page.editors.map((e) => e.email)).toEqual(['ed@t', 'own@t']);
  });

  it('404s the nav view when the runtime configures no navMenu', async () => {
    const admin = createCairnAdmin(runtime(), deps);
    await expect(admin.load(adminEvent('/admin/nav') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('serves the nav view when a navMenu is configured', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const rt = runtime();
    rt.navMenu = { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const admin = createCairnAdmin(rt, deps);
    const data = await admin.load(adminEvent('/admin/nav') as never);
    expect(data.view).toBe('nav');
    if (data.view !== 'nav') throw new Error('narrowing');
    expect(data.layout.navLabel).toBe('Primary nav');
    expect(data.page.menu).toEqual({ name: 'primary', label: 'Primary nav', maxDepth: 2 });
    expect(data.page.tree).toEqual([]);
  });
});
