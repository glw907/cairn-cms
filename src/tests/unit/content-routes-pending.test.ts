// The publish-workflow save path against the stateful GitHub double: a save lands on the
// entry's pending branch (cut lazily from main), never on main, and carries no manifest
// change; createAction refuses a slug whose pending branch already exists.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import { runtime as baseRuntime, postsConcept, contentEvent } from './_content-harness.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';

function runtime() {
  return baseRuntime({
    concepts: [postsConcept({ fields: [{ type: 'text', name: 'title', label: 'Title', required: true }], validate: () => ({ ok: true as const, data: { title: 'Hi' } }) })],
    manifestPath: MANIFEST_PATH,
  });
}

function saveEvent(id: string, form: Record<string, string>) {
  return contentEvent({ url: `https://t.example/admin/posts/${id}`, params: { concept: 'posts', id }, form });
}

function createEvent(form: Record<string, string>) {
  return contentEvent({ url: 'https://t.example/admin/posts', params: { concept: 'posts' }, form });
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
    const routes = createContentRoutes(runtime());

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
    const routes = createContentRoutes(runtime());

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
    const routes = createContentRoutes(runtime());

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
    const routes = createContentRoutes(runtime());

    const location = await redirectedTo(
      routes.createAction(createEvent({ slug: 'hello', date: '2026-05-01' }) as never),
    );
    expect(location).toMatch(/^\/admin\/posts\?error=/);
    expect(decodeURIComponent(location)).toMatch(/already exists/i);
  });
});
