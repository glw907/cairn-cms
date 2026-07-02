import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { Backend } from '../../lib/github/backend.js';
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
    vocabulary: [],
  };
}

// The default read backend every event's `locals.backend` rides.
const backend = makeGithubBackend(REPO, async () => 'tok');

function event(pathname: string, role: 'owner' | 'editor' | null, eventBackend: Backend = backend) {
  return {
    url: new URL(`https://test.example${pathname}`),
    params: {},
    request: new Request('https://test.example'),
    locals: { editor: role === null ? null : { email: 'e@test', displayName: 'Ed', role }, backend: eventBackend },
    platform: { env: {} },
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('shellPayload', () => {
  it('returns nav concepts, the user, the active path, and owner capability for an authed path', () => {
    const routes = createContentRoutes(runtime());
    const { shell } = routes.shellPayload(event('/admin/posts', 'owner') as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.siteName).toBe('Test Site');
    expect(shell.user).toEqual({ displayName: 'Ed', email: 'e@test', role: 'owner' });
    expect(shell.concepts).toEqual([
      { id: 'posts', label: 'Posts' },
      { id: 'pages', label: 'Pages' },
    ]);
    expect(shell.pathname).toBe('/admin/posts');
    expect(shell.canManageEditors).toBe(true);
    expect(shell.navLabel).toBeNull();
    // Task 3 fills customNav; until then it is always empty.
    expect(shell.customNav).toEqual([]);
  });

  it('issues a CSRF token in the shell data', () => {
    const routes = createContentRoutes(runtime());
    const { shell } = routes.shellPayload(event('/admin/posts', 'owner') as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('denies the manage-editors capability to an editor', () => {
    const routes = createContentRoutes(runtime());
    const { shell } = routes.shellPayload(event('/admin/pages', 'editor') as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.canManageEditors).toBe(false);
  });

  it('exposes the nav label when a navMenu is configured', () => {
    const rt = runtime();
    rt.navMenu = { configPath: 'x.yaml', menuName: 'primary', label: 'Primary nav', maxDepth: 2 };
    const { shell } = createContentRoutes(rt).shellPayload(event('/admin/nav', 'editor') as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.navLabel).toBe('Primary nav');
  });

  it('returns a bare public payload for a login path and never resolves the backend', async () => {
    const spy = vi.spyOn(backend, 'listBranches');
    const routes = createContentRoutes(runtime());
    const { shell } = routes.shellPayload(event('/admin/login', null) as never);
    expect(shell.public).toBe(true);
    if (!shell.public) throw new Error('expected public shell');
    expect(shell.siteName).toBe('Test Site');
    // The login page pays no GitHub round-trip.
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });

  it('streams the pending entries parsed from the cairn refs (not awaited up front)', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/2026-05-hello', 'main');
    gh.createBranch('cairn/pages/about', 'main');
    gh.createBranch('cairn/oops', 'main'); // malformed: no entry id, dropped by the parser
    gh.install();
    const routes = createContentRoutes(runtime());
    const { shell } = routes.shellPayload(event('/admin/posts', 'owner') as never);
    if (shell.public) throw new Error('expected authed shell');
    // pendingEntries is a streamed promise, resolved here for the assertion.
    expect(typeof shell.pendingEntries.then).toBe('function');
    expect(await shell.pendingEntries).toEqual([
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
    const routes = createContentRoutes(runtime());
    const { shell } = routes.shellPayload(event('/admin/posts', 'owner') as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(await shell.pendingEntries).toEqual([{ concept: 'posts', id: '2026-05-hello' }]);
  });

  it('degrades pendingEntries to null and logs github.unreachable when the token mint throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const routes = createContentRoutes(runtime());
    const failingBackend = makeGithubBackend(REPO, async () => {
      // The real missing-secret failure from appCredentials; the message names the env var
      // and never carries PEM material, which the redaction assertion below pins.
      throw new Error('GITHUB_APP_PRIVATE_KEY_B64 is not configured');
    });
    const { shell } = routes.shellPayload(event('/admin/posts', 'owner', failingBackend) as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.siteName).toBe('Test Site');
    expect(shell.user.email).toBe('e@test');
    expect(shell.concepts).toHaveLength(2);
    // A sync token-mint throw becomes a caught rejection that degrades to null.
    expect(await shell.pendingEntries).toBeNull();

    const records = warnSpy.mock.calls
      .map((c) => c[0] as { event?: string; scope?: string; error?: string })
      .filter((r) => r.event === 'github.unreachable');
    expect(records).toHaveLength(1);
    expect(records[0].scope).toBe('shell');
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
