// The publish-workflow save path against the stateful GitHub double: a save lands on the
// entry's pending branch (cut lazily from main), never on main, and carries no manifest
// change; createAction refuses a slug whose pending branch already exists.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

const MANIFEST_PATH = 'src/content/.cairn/index.json';

function runtime(): CairnRuntime {
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
        validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
      },
    ],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
  };
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

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

function createEvent(form: Record<string, string>) {
  const body = new URLSearchParams(form);
  return {
    url: new URL('https://t.example/admin/posts'),
    params: { concept: 'posts' },
    request: new Request('https://t.example/admin/posts', { method: 'POST', body }),
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

afterEach(() => vi.restoreAllMocks());

describe('saveAction on the pending branch', () => {
  it('creates the pending branch from main on first save and commits only the entry file there', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'hello' }) as never));
    expect(location).toBe('/admin/posts/2026-05-hi?saved=1');

    // The entry file lives on the branch, not on main.
    const onBranch = gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md');
    expect(onBranch).toContain('title: Hi');
    expect(onBranch).toContain('hello');
    expect(gh.read('main', 'src/content/posts/2026-05-hi.md')).toBeNull();

    // No manifest rides the commit: main never had one, so the branch must not gain one.
    expect(gh.read('cairn/posts/2026-05-hi', MANIFEST_PATH)).toBeNull();
    expect(gh.read('main', MANIFEST_PATH)).toBeNull();
  });

  it('reuses the existing branch on a second save', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    await redirectedTo(routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'first' }) as never));
    await redirectedTo(routes.saveAction(saveEvent('2026-05-hi', { title: 'Hi', body: 'second' }) as never));

    const refCreates = gh.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/git/refs'));
    expect(refCreates).toHaveLength(1);
    expect(gh.read('cairn/posts/2026-05-hi', 'src/content/posts/2026-05-hi.md')).toContain('second');
  });

  it('still blocks a link to a target absent from main, before touching any branch', async () => {
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const result = (await routes.saveAction(
      saveEvent('2026-05-hi', { title: 'Hi', body: 'see [gone](cairn:pages/gone)' }) as never,
    )) as unknown as { status: number; data: { error: string; brokenLinks: string[] } };
    expect(result.status).toBe(400);
    expect(result.data.error).toMatch(/1 missing page/i);
    expect(result.data.brokenLinks).toContain('cairn:pages/gone');

    // The guard fires before the branch ensure: no ref was created.
    expect(gh.calls.some((c) => c.method === 'POST' && c.url.endsWith('/git/refs'))).toBe(false);
    expect([...gh.branches.keys()]).toEqual(['main']);
  });
});

describe('createAction with a pending branch', () => {
  it('bounces when a pending branch already exists for the composed id', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/2026-05-01-hello', 'main');
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(
      routes.createAction(createEvent({ slug: 'hello', date: '2026-05-01' }) as never),
    );
    expect(location).toMatch(/^\/admin\/posts\?error=/);
    expect(decodeURIComponent(location)).toMatch(/already exists/i);
  });
});
