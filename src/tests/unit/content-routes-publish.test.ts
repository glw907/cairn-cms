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
