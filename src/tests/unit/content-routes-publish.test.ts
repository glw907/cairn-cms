// The publish and discard actions against the stateful GitHub double: publish copies the
// pending branch's entry file to main with the manifest row upserted in one commit and then
// deletes the branch; discard deletes the branch and routes by the entry's main existence.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseManifest, serializeManifest } from '../../lib/content/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const ENTRY_PATH = 'src/content/posts/2026-05-01-hi.md';
const BRANCH = 'cairn/posts/2026-05-01-hi';
const PENDING_MD = '---\ntitle: Hi\ndate: 2026-05-01\n---\npending body';

function runtime(): CairnRuntime {
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
        validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
      },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: MANIFEST_PATH,
  };
}

/** The posts runtime with a non-dated pages concept added, for the multi-concept batch. */
function multiRuntime(): CairnRuntime {
  const r = runtime();
  r.concepts.push({
    id: 'pages', label: 'Pages', dir: 'src/content/pages',
    routing: { routable: true, dated: false, inFeeds: false },
    permalink: '/:slug',
    datePrefix: 'day',
    fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
    summaryFields: [],
    validate: () => ({ ok: true as const, data: { title: 'About' } }),
  });
  return r;
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function actionEvent(id: string) {
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST', body: new URLSearchParams() }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

/** Run an action expected to throw a SvelteKit redirect, returning its location. */
async function redirectedTo(action: Promise<unknown>): Promise<string> {
  try {
    await action;
  } catch (e) {
    return (e as { location: string }).location;
  }
  throw new Error('expected a redirect');
}

function mainRefPatches(gh: GithubDouble) {
  return gh.calls.filter((c) => c.method === 'PATCH' && c.url.includes('/git/refs/heads/main'));
}

afterEach(() => vi.restoreAllMocks());

describe('publishAction', () => {
  it('lands the entry file and the upserted manifest row on main in one commit and deletes the branch', async () => {
    const gh = new GithubDouble({
      main: {
        [ENTRY_PATH]: '---\ntitle: Old\ndate: 2026-05-01\n---\nlive body',
        [MANIFEST_PATH]: serializeManifest({
          version: 1,
          entries: [{ concept: 'posts', id: '2026-05-01-hi', permalink: '/posts/hi', title: 'Old', date: '2026-05-01', draft: false, links: [] }],
        }),
      },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.publishAction(actionEvent('2026-05-01-hi') as never));
    expect(location).toBe('/admin/posts/2026-05-01-hi?published=1');

    // Main carries the branch's content and the upserted row, applied by exactly one commit.
    expect(gh.read('main', ENTRY_PATH)).toBe(PENDING_MD);
    const manifest = parseManifest(gh.read('main', MANIFEST_PATH) ?? '');
    const row = manifest.entries.find((e) => e.concept === 'posts' && e.id === '2026-05-01-hi');
    expect(row?.title).toBe('Hi');
    expect(mainRefPatches(gh)).toHaveLength(1);

    // The pending branch is consumed.
    expect([...gh.branches.keys()]).toEqual(['main']);
  });

  it('adds the manifest row for a never-published entry', async () => {
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    await redirectedTo(routes.publishAction(actionEvent('2026-05-01-hi') as never));

    expect(gh.read('main', ENTRY_PATH)).toBe(PENDING_MD);
    const manifest = parseManifest(gh.read('main', MANIFEST_PATH) ?? '');
    expect(manifest.entries.map((e) => e.id)).toEqual(['2026-05-01-hi']);
  });

  it('redirects back with an error and commits nothing when no pending branch exists', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.publishAction(actionEvent('2026-05-01-hi') as never));
    expect(location).toMatch(/^\/admin\/posts\/2026-05-01-hi\?error=/);
    expect(gh.calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
  });

  it('logs entry.published with batch: false on success', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    await redirectedTo(routes.publishAction(actionEvent('2026-05-01-hi') as never));

    const record = infoSpy.mock.calls
      .map((c) => c[0] as { event?: string; concept?: string; id?: string; editor?: string; batch?: boolean })
      .find((r) => r.event === 'entry.published');
    expect(record).toBeTruthy();
    expect(record?.concept).toBe('posts');
    expect(record?.id).toBe('2026-05-01-hi');
    expect(record?.editor).toBe('ed@t');
    expect(record?.batch).toBe(false);
  });

  it('logs publish.failed on a commit conflict, keeps the branch, and redirects with an error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    // Fail main's ref update the way GitHub signals a stale head, leaving every other route on
    // the double, so commitFiles raises its CommitConflictError.
    const double = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'PATCH' && url.includes('/git/refs/heads/main')) {
        return new Response('{"message":"Update is not a fast forward"}', { status: 422 });
      }
      return double(input, init);
    });
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.publishAction(actionEvent('2026-05-01-hi') as never));
    expect(location).toMatch(/^\/admin\/posts\/2026-05-01-hi\?error=/);

    const record = warnSpy.mock.calls
      .map((c) => c[0] as { event?: string; reason?: string; editor?: string })
      .find((r) => r.event === 'publish.failed');
    expect(record?.reason).toBe('conflict');
    expect(record?.editor).toBe('ed@t');

    // The branch deletes only after the main commit lands, so a failure keeps the edits.
    expect(gh.branches.has(BRANCH)).toBe(true);
  });
});

describe('publishAllAction', () => {
  const PAGE_PATH = 'src/content/pages/about.md';
  const PAGE_BRANCH = 'cairn/pages/about';
  const PAGE_MD = '---\ntitle: About\n---\nabout body';
  const NEW_PATH = 'src/content/posts/2026-06-02-new.md';
  const NEW_BRANCH = 'cairn/posts/2026-06-02-new';
  const NEW_MD = '---\ntitle: New\ndate: 2026-06-02\n---\nnew body';

  function listActionEvent(concept = 'posts') {
    return {
      url: new URL(`https://t.example/admin/${concept}`),
      params: { concept },
      request: new Request(`https://t.example/admin/${concept}`, { method: 'POST', body: new URLSearchParams() }),
      locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
      platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    };
  }

  it('lands a multi-concept batch atomically and consumes every branch', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [ENTRY_PATH]: '---\ntitle: Old\ndate: 2026-05-01\n---\nlive body',
        [MANIFEST_PATH]: serializeManifest({
          version: 1,
          entries: [{ concept: 'posts', id: '2026-05-01-hi', permalink: '/posts/hi', title: 'Old', date: '2026-05-01', draft: false, links: [] }],
        }),
      },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
      [PAGE_BRANCH]: { [PAGE_PATH]: PAGE_MD },
      [NEW_BRANCH]: { [NEW_PATH]: NEW_MD },
    });
    gh.install();
    const routes = createContentRoutes(multiRuntime(), deps);

    // The form posts from the pages list, but the redirect lands on the first concept.
    const location = await redirectedTo(routes.publishAllAction(listActionEvent('pages') as never));
    expect(location).toBe('/admin/posts?publishedAll=3');

    // One commit (one main ref PATCH) lands every entry file plus the manifest.
    expect(mainRefPatches(gh)).toHaveLength(1);
    expect(gh.read('main', ENTRY_PATH)).toBe(PENDING_MD);
    expect(gh.read('main', PAGE_PATH)).toBe(PAGE_MD);
    expect(gh.read('main', NEW_PATH)).toBe(NEW_MD);
    const manifest = parseManifest(gh.read('main', MANIFEST_PATH) ?? '');
    expect(manifest.entries.map((e) => `${e.concept}/${e.id}`).sort()).toEqual([
      'pages/about', 'posts/2026-05-01-hi', 'posts/2026-06-02-new',
    ]);
    expect(manifest.entries.find((e) => e.id === '2026-05-01-hi')?.title).toBe('Hi');

    const commitCall = gh.calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/commits'));
    expect((commitCall?.body as { message?: string })?.message).toBe('Publish 3 entries');

    // Every consumed branch is gone.
    expect([...gh.branches.keys()]).toEqual(['main']);

    // One entry.published record per entry, all batch: true.
    const records = infoSpy.mock.calls
      .map((c) => c[0] as { event?: string; concept?: string; id?: string; editor?: string; batch?: boolean })
      .filter((r) => r.event === 'entry.published');
    expect(records.map((r) => `${r.concept}/${r.id}`).sort()).toEqual([
      'pages/about', 'posts/2026-05-01-hi', 'posts/2026-06-02-new',
    ]);
    expect(records.every((r) => r.batch === true && r.editor === 'ed@t')).toBe(true);
  });

  it('skips a ref whose concept is not configured instead of failing the batch', async () => {
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
      'cairn/widgets/x': { 'src/content/widgets/x.md': '---\ntitle: W\n---\nw' },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.publishAllAction(listActionEvent() as never));
    expect(location).toBe('/admin/posts?publishedAll=1');

    expect(gh.read('main', ENTRY_PATH)).toBe(PENDING_MD);
    expect(gh.read('main', 'src/content/widgets/x.md')).toBeNull();
    // The unconfigured ref is left alone for a future discard, not consumed.
    expect(gh.branches.has('cairn/widgets/x')).toBe(true);
    expect(gh.branches.has(BRANCH)).toBe(false);
  });

  it('redirects back with no commit when nothing is pending', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.publishAllAction(listActionEvent() as never));
    expect(location).toBe('/admin/posts');
    expect(gh.calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
  });

  it('logs publish.failed on a commit conflict and bounces to the list page', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    const double = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'PATCH' && url.includes('/git/refs/heads/main')) {
        return new Response('{"message":"Update is not a fast forward"}', { status: 422 });
      }
      return double(input, init);
    });
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.publishAllAction(listActionEvent() as never));
    expect(location).toMatch(/^\/admin\/posts\?error=/);

    const record = warnSpy.mock.calls
      .map((c) => c[0] as { event?: string; reason?: string })
      .find((r) => r.event === 'publish.failed');
    expect(record?.reason).toBe('conflict');

    // The branch survives a failed commit, so the edits are not lost.
    expect(gh.branches.has(BRANCH)).toBe(true);
  });
});

describe('discardAction', () => {
  it('deletes the branch and redirects to the edit page when the entry exists on main', async () => {
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Old\ndate: 2026-05-01\n---\nlive body' },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.discardAction(actionEvent('2026-05-01-hi') as never));
    expect(location).toBe('/admin/posts/2026-05-01-hi?discarded=1');
    expect([...gh.branches.keys()]).toEqual(['main']);
  });

  it('redirects to the concept list for a branch-only entry', async () => {
    const gh = new GithubDouble({
      main: {},
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.discardAction(actionEvent('2026-05-01-hi') as never));
    expect(location).toBe('/admin/posts');
    expect(gh.branches.has(BRANCH)).toBe(false);
  });

  it('logs entry.discarded with the entry fields', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {},
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    await redirectedTo(routes.discardAction(actionEvent('2026-05-01-hi') as never));

    const record = infoSpy.mock.calls
      .map((c) => c[0] as { event?: string; concept?: string; id?: string; editor?: string })
      .find((r) => r.event === 'entry.discarded');
    expect(record).toBeTruthy();
    expect(record?.concept).toBe('posts');
    expect(record?.id).toBe('2026-05-01-hi');
    expect(record?.editor).toBe('ed@t');
  });
});
