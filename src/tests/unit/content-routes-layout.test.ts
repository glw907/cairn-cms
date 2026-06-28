import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
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

function event(pathname: string, role: 'owner' | 'editor') {
  const scopes = role === 'owner' ? ['admin:owner', 'admin:editor'] : ['admin:editor'];
  return {
    url: new URL(`https://test.example${pathname}`),
    params: {},
    request: new Request('https://test.example'),
    locals: { principal: { email: 'e@test', displayName: 'Ed', scopes, tier: 'admin' as const } },
    platform: { env: {} },
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('layoutLoad', () => {
  it('returns nav concepts, the user, the active path, and owner capability', async () => {
    const routes = createContentRoutes(runtime());
    const data = await routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.siteName).toBe('Test Site');
    expect(data.user).toEqual({ displayName: 'Ed', email: 'e@test', role: 'owner' });
    expect(data.concepts).toEqual([
      { id: 'posts', label: 'Posts' },
      { id: 'pages', label: 'Pages' },
    ]);
    expect(data.pathname).toBe('/admin/posts');
    expect(data.canManageEditors).toBe(true);
    expect(data.navLabel).toBeNull();
  });

  it('issues a CSRF token in the layout data', async () => {
    const routes = createContentRoutes(runtime());
    const data = await routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('denies the manage-editors capability to an editor', async () => {
    const routes = createContentRoutes(runtime());
    const data = await routes.layoutLoad(event('/admin/pages', 'editor') as never);
    expect(data.canManageEditors).toBe(false);
  });

  it('exposes the nav label when a navMenu is configured', async () => {
    const rt = runtime();
    rt.navMenu = { configPath: 'x.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const data = await createContentRoutes(rt).layoutLoad(event('/admin/nav', 'editor') as never);
    expect(data.navLabel).toBe('Primary nav');
  });

  it('lists the pending entries parsed from the cairn refs', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/2026-05-hello', 'main');
    gh.createBranch('cairn/pages/about', 'main');
    gh.createBranch('cairn/oops', 'main'); // malformed: no entry id, dropped by the parser
    gh.install();
    const routes = createContentRoutes(runtime(), { backend: makeGithubBackend(REPO, async () => 'tok')});
    const data = await routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.pendingEntries).toEqual([
      { concept: 'pages', id: 'about' },
      { concept: 'posts', id: '2026-05-hello' },
    ]);
  });

  it('filters refs with an invalid id or an unconfigured concept out of pendingEntries', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/2026-05-hello', 'main');
    gh.createBranch('cairn/widgets/x', 'main'); // concept this site does not configure
    gh.createBranch('cairn/posts/a%2fb', 'main'); // percent-escaped id fails the slug rule
    gh.install();
    const routes = createContentRoutes(runtime(), { backend: makeGithubBackend(REPO, async () => 'tok')});
    const data = await routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.pendingEntries).toEqual([{ concept: 'posts', id: '2026-05-hello' }]);
  });

  it('degrades pendingEntries to null and logs github.unreachable when the token mint fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const routes = createContentRoutes(runtime(), {
      backend: makeGithubBackend(REPO, async () => {
        // The real missing-secret failure from appCredentials; the message names the env var
        // and never carries PEM material, which the redaction assertion below pins.
        throw new Error('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
      }),
    });
    const data = await routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.pendingEntries).toBeNull();
    expect(data.siteName).toBe('Test Site');
    expect(data.user.email).toBe('e@test');
    expect(data.concepts).toHaveLength(2);

    const records = warnSpy.mock.calls
      .map((c) => c[0] as { event?: string; scope?: string; error?: string })
      .filter((r) => r.event === 'github.unreachable');
    expect(records).toHaveLength(1);
    expect(records[0].scope).toBe('layout');
    expect(records[0].error).toContain('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
    expect(records[0].error).not.toContain('BEGIN');
    expect(records[0].error).not.toContain('PRIVATE KEY');
  });
});

describe('indexRedirect', () => {
  it('redirects /admin to the first concept', () => {
    const routes = createContentRoutes(runtime());
    expect(() => routes.indexRedirect()).toThrow();
    try {
      routes.indexRedirect();
    } catch (e) {
      expect((e as { status: number; location: string }).status).toBe(307);
      expect((e as { location: string }).location).toBe('/admin/posts');
    }
  });
});
