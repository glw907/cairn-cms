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
    vocabulary: [],
  };
}

// The dev double rides event.locals.backend; createCairnAdmin no longer takes a backend dep.
const backend = makeGithubBackend(REPO, async () => 'tok');
const deps = {};

/** Build the catch-all event the shell load reads; only `params.path` exists on the real one. */
function eventFor(
  pathname: string,
  opts: { editor?: { email: string; displayName: string; role: 'owner' | 'editor' } | null } = {},
) {
  const headers: Record<string, string> = {};
  return {
    url: new URL(`https://t.example${pathname}`),
    request: new Request(`https://t.example${pathname}`),
    locals: { editor: opts.editor === undefined ? { email: 'e@t', displayName: 'E', role: 'editor' as const } : opts.editor, backend },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
    setHeaders: (h: Record<string, string>) => Object.assign(headers, h),
    _headers: headers,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('createCairnAdmin shellLoad', () => {
  it('returns the lean shell payload for an authed admin path, with pending streamed', async () => {
    new GithubDouble({ main: {} }).install();
    const { shellLoad } = createCairnAdmin(runtime(), deps);
    const { shell } = await shellLoad(eventFor('/admin/posts') as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.user.email).toBe('e@t');
    expect(shell.concepts.map((c) => c.id)).toContain('posts');
    // pendingEntries is a streamed promise, not an awaited array.
    expect(typeof shell.pendingEntries.then).toBe('function');
  });

  it('returns a public payload for /admin/login and never calls listBranches', async () => {
    const spy = vi.spyOn(backend, 'listBranches');
    const { shellLoad } = createCairnAdmin(runtime(), deps);
    const { shell } = await shellLoad(eventFor('/admin/login', { editor: null }) as never);
    expect(shell.public).toBe(true);
    if (!shell.public) throw new Error('expected public shell');
    expect(shell.siteName).toBe('Test Site');
    expect(spy).not.toHaveBeenCalled();
  });

  it('forwards CairnAdminDeps.navFilter to the content routes, so a dropped section is absent from the shell', async () => {
    new GithubDouble({ main: {} }).install();
    const rt = runtime();
    rt.adminNav = [
      { label: 'Standalone', icon: 'wrench', href: '/admin/tools' },
      { label: 'Club', children: [{ label: 'Members', icon: 'users', href: '/admin/club/members' }] },
    ];
    const { shellLoad } = createCairnAdmin(rt, {
      navFilter: (items) => items.filter((item) => item.label !== 'Club'),
    });
    const { shell } = await shellLoad(eventFor('/admin/posts') as never);
    if (shell.public) throw new Error('expected authed shell');
    expect(shell.customNav.map((item) => item.label)).toEqual(['Standalone']);
  });
});
