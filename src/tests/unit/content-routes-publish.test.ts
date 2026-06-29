// The publish and discard actions against the stateful GitHub double: publish validates and
// holds the posted form like save (a branch commit), copies that same markdown to main with
// the manifest row upserted in one commit, and deletes the branch only when its head still
// matches the commit the action made; discard deletes the branch and routes by main existence.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { parseManifest, serializeManifest } from '../../lib/content/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import { fieldset } from '../../lib/content/fieldset.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const ENTRY_PATH = 'src/content/posts/2026-05-01-hi.md';
const BRANCH = 'cairn/posts/2026-05-01-hi';
const PENDING_MD = '---\ntitle: Hi\ndate: 2026-05-01\n---\npending body';

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
    render: ({ body }) => Promise.resolve(body),
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
    vocabulary: [],
  };
}

/** The posts runtime with a non-dated pages concept added, for the multi-concept batch. */
function multiRuntime(): CairnRuntime {
  const r = runtime();
  r.concepts.push({
    id: 'pages', label: 'Pages', singular: 'Pages', dir: 'src/content/pages',
    routing: { routable: true, dated: false, inFeeds: false },
    permalink: '/:slug',
    datePrefix: 'day',
    fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
    schema: fieldset({}),
    summaryFields: [],
    validate: () => ({ ok: true as const, data: { title: 'About' } }),
  });
  return r;
}

/** A single undated pages concept, so an entry's address is its own path-derived permalink. */
function pagesRuntime(): CairnRuntime {
  return {
    ...runtime(),
    concepts: [
      {
        id: 'pages', label: 'Page', singular: 'Page', dir: 'src/content/pages',
        routing: { routable: true, dated: false, inFeeds: false },
        permalink: '/:slug',
        datePrefix: 'day',
        fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
        schema: fieldset({}),
        summaryFields: [],
        validate: () => ({ ok: true as const, data: {} }),
      },
    ],
  };
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

function actionEvent(id: string, form: Record<string, string> = {}) {
  return {
    url: new URL(`https://t.example/admin/posts/${id}`),
    params: { concept: 'posts', id },
    request: new Request(`https://t.example/admin/posts/${id}`, { method: 'POST', body: new URLSearchParams(form) }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

function pagesActionEvent(id: string, form: Record<string, string> = {}) {
  return {
    url: new URL(`https://t.example/admin/pages/${id}`),
    params: { concept: 'pages', id },
    request: new Request(`https://t.example/admin/pages/${id}`, { method: 'POST', body: new URLSearchParams(form) }),
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

/** Wrap the installed double so main's ref update fails the way GitHub signals a stale head,
 *  leaving every other route on the double, so commitFiles raises its CommitConflictError. */
function failMainRefPatch(): void {
  const double = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method === 'PATCH' && url.includes('/git/refs/heads/main')) {
      return new Response('{"message":"Update is not a fast forward"}', { status: 422 });
    }
    return double(input, init);
  });
}

/** Wrap the installed double so the first main ref PATCH (the publish commit landing) first
 *  injects a concurrent save onto `branch`, moving its head after publish captured its sha. */
function injectSaveDuringMainPatch(gh: GithubDouble, branch: string, path: string, content: string): void {
  const double = globalThis.fetch;
  let injected = false;
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (!injected && method === 'PATCH' && url.includes('/git/refs/heads/main')) {
      injected = true;
      gh.commit(branch, path, content);
    }
    return double(input, init);
  });
}

afterEach(() => vi.restoreAllMocks());

describe('publishAction', () => {
  it('publishes the posted form, not the stale branch copy, in one main commit, and deletes the branch', async () => {
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

    // The form carries text typed after the last save: publish-what-you-see.
    const location = await redirectedTo(
      routes.publishAction(actionEvent('2026-05-01-hi', { title: 'Hi', body: 'typed after the save' }) as never),
    );
    expect(location).toBe('/admin/posts/2026-05-01-hi?published=1');

    // Main carries the posted content (never the branch's last-saved copy) and the upserted
    // row, applied by exactly one main commit; the branch got the same content first.
    expect(gh.read('main', ENTRY_PATH)).toContain('typed after the save');
    expect(gh.read('main', ENTRY_PATH)).not.toContain('pending body');
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

    await redirectedTo(routes.publishAction(actionEvent('2026-05-01-hi', { title: 'Hi', body: 'pending body' }) as never));

    expect(gh.read('main', ENTRY_PATH)).toContain('pending body');
    const manifest = parseManifest(gh.read('main', MANIFEST_PATH) ?? '');
    expect(manifest.entries.map((e) => e.id)).toEqual(['2026-05-01-hi']);
  });

  it('saves then publishes when no pending branch exists yet', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(
      routes.publishAction(actionEvent('2026-05-01-hi', { title: 'Hi', body: 'straight to publish' }) as never),
    );
    expect(location).toBe('/admin/posts/2026-05-01-hi?published=1');
    expect(gh.read('main', ENTRY_PATH)).toContain('straight to publish');
    const manifest = parseManifest(gh.read('main', MANIFEST_PATH) ?? '');
    expect(manifest.entries.map((e) => e.id)).toEqual(['2026-05-01-hi']);
    // The lazily cut branch is consumed by the publish.
    expect([...gh.branches.keys()]).toEqual(['main']);
  });

  it('bounces invalid frontmatter like save, touching nothing', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.install();
    const rt = runtime();
    rt.concepts[0].validate = () => ({ ok: false as const, errors: { title: 'Title is required' } });
    const routes = createContentRoutes(rt, deps);

    const location = await redirectedTo(routes.publishAction(actionEvent('2026-05-01-hi', { body: 'b' }) as never));
    expect(location).toMatch(/error=.*Title/);
    expect(gh.calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
  });

  it('returns the broken-link fail like save, with no commit anywhere', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const result = (await routes.publishAction(
      actionEvent('2026-05-01-hi', { title: 'Hi', body: 'see [gone](cairn:pages/gone)' }) as never,
    )) as unknown as { status: number; data: { error: string; brokenLinks: string[] } };
    expect(result.status).toBe(400);
    expect(result.data.error).toMatch(/1 missing page/i);
    expect(result.data.brokenLinks).toContain('cairn:pages/gone');
    expect(gh.calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
    expect([...gh.branches.keys()]).toEqual(['main']);
  });

  it('leaves the branch alone when a concurrent save moves its head mid-publish', async () => {
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    injectSaveDuringMainPatch(gh, BRANCH, ENTRY_PATH, '---\ntitle: Newer\n---\nsecond-tab save');
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(
      routes.publishAction(actionEvent('2026-05-01-hi', { title: 'Hi', body: 'first-tab text' }) as never),
    );
    expect(location).toBe('/admin/posts/2026-05-01-hi?published=1');

    // Main carries the publish; the branch survives with the concurrent save, still pending.
    expect(gh.read('main', ENTRY_PATH)).toContain('first-tab text');
    expect(gh.branches.has(BRANCH)).toBe(true);
    expect(gh.read(BRANCH, ENTRY_PATH)).toContain('second-tab save');
  });

  it('logs entry.published with batch: false on success', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    await redirectedTo(routes.publishAction(actionEvent('2026-05-01-hi', { title: 'Hi', body: 'b' }) as never));

    const record = infoSpy.mock.calls
      .map((c) => c[0] as { event?: string; concept?: string; id?: string; editor?: string; batch?: boolean })
      .find((r) => r.event === 'entry.published');
    expect(record).toBeTruthy();
    expect(record?.concept).toBe('posts');
    expect(record?.id).toBe('2026-05-01-hi');
    expect(record?.editor).toBe('ed@t');
    expect(record?.batch).toBe(false);
  });

  it('logs publish.address_collision but still publishes when another entry holds the address', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // A pages concept with an undated permalink, so the address is the entry's own path-derived
    // permalink. Publishing pages/about-copy resolves to /about-copy; a different published entry
    // "about" is manually pinned to that same /about-copy in the manifest, so the publish overrides it.
    const rt = pagesRuntime();
    const gh = new GithubDouble({
      main: {
        'src/content/pages/about.md': '---\ntitle: About\n---\nLive.',
        [MANIFEST_PATH]: serializeManifest({
          version: 1,
          entries: [{ id: 'about', concept: 'pages', title: 'About', permalink: '/about-copy', draft: false, links: [] }],
        }),
      },
      'cairn/pages/about-copy': { 'src/content/pages/about-copy.md': '---\ntitle: About copy\n---\npending body' },
    });
    gh.install();
    const routes = createContentRoutes(rt, deps);

    const location = await redirectedTo(
      routes.publishAction(pagesActionEvent('about-copy', { title: 'About copy', body: 'about copy text' }) as never),
    );
    // The publish still commits: it redirects to the published page and the entry lands on main.
    expect(location).toBe('/admin/pages/about-copy?published=1');
    expect(gh.read('main', 'src/content/pages/about-copy.md')).toContain('about copy text');
    const published = infoSpy.mock.calls
      .map((c) => c[0] as { event?: string })
      .find((r) => r.event === 'entry.published');
    expect(published).toBeTruthy();

    // A publish.address_collision warning is emitted naming the displaced entry.
    const collision = warnSpy.mock.calls
      .map((c) => c[0] as { event?: string; editor?: string; address?: string; displacedConcept?: string; displacedId?: string })
      .find((r) => r.event === 'publish.address_collision');
    expect(collision).toBeTruthy();
    expect(collision?.address).toBe('/about-copy');
    expect(collision?.displacedConcept).toBe('pages');
    expect(collision?.displacedId).toBe('about');
    expect(collision?.editor).toBe('ed@t');
  });

  it('emits no publish.address_collision when the address is free', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rt = pagesRuntime();
    const gh = new GithubDouble({
      main: {
        [MANIFEST_PATH]: serializeManifest({
          version: 1,
          entries: [{ id: 'about', concept: 'pages', title: 'About', permalink: '/about', draft: false, links: [] }],
        }),
      },
      'cairn/pages/contact': { 'src/content/pages/contact.md': '---\ntitle: Contact\n---\nReach us.' },
    });
    gh.install();
    const routes = createContentRoutes(rt, deps);

    await redirectedTo(routes.publishAction(pagesActionEvent('contact', { title: 'Contact', body: 'reach us' }) as never));

    const collision = warnSpy.mock.calls
      .map((c) => c[0] as { event?: string })
      .find((r) => r.event === 'publish.address_collision');
    expect(collision).toBeUndefined();
  });

  it('logs publish.failed on a main-commit conflict, keeps the just-saved branch, and bounces', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    failMainRefPatch();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(
      routes.publishAction(actionEvent('2026-05-01-hi', { title: 'Hi', body: 'typed text' }) as never),
    );
    expect(location).toMatch(/^\/admin\/posts\/2026-05-01-hi\?error=/);
    expect(decodeURIComponent(location)).toContain('Your edits are saved. Reload and publish again.');

    const record = warnSpy.mock.calls
      .map((c) => c[0] as { event?: string; reason?: string; editor?: string })
      .find((r) => r.event === 'publish.failed');
    expect(record?.reason).toBe('conflict');
    expect(record?.editor).toBe('ed@t');

    // The branch deletes only after the main commit lands, and the save phase already committed
    // the posted text there, so a conflict loses nothing.
    expect(gh.branches.has(BRANCH)).toBe(true);
    expect(gh.read(BRANCH, ENTRY_PATH)).toContain('typed text');
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

    // A one-entry batch reads as one entry, not "1 entries".
    const commitCall = gh.calls.find((c) => c.method === 'POST' && c.url.endsWith('/git/commits'));
    expect((commitCall?.body as { message?: string })?.message).toBe('Publish 1 entry');
  });

  it('publishes the batch but leaves a branch whose head moved mid-publish', async () => {
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
      [PAGE_BRANCH]: { [PAGE_PATH]: PAGE_MD },
    });
    gh.install();
    injectSaveDuringMainPatch(gh, PAGE_BRANCH, PAGE_PATH, '---\ntitle: Mid-publish\n---\nnewer save');
    const routes = createContentRoutes(multiRuntime(), deps);

    const location = await redirectedTo(routes.publishAllAction(listActionEvent() as never));
    expect(location).toBe('/admin/posts?publishedAll=2');

    // Both entries went live with the content read at publish time.
    expect(gh.read('main', ENTRY_PATH)).toBe(PENDING_MD);
    expect(gh.read('main', PAGE_PATH)).toBe(PAGE_MD);

    // The unmoved branch is consumed; the moved one stays pending with the newer save.
    expect(gh.branches.has(BRANCH)).toBe(false);
    expect(gh.branches.has(PAGE_BRANCH)).toBe(true);
    expect(gh.read(PAGE_BRANCH, PAGE_PATH)).toContain('newer save');
  });

  it('redirects back with a flash and no commit when nothing is pending', async () => {
    const gh = new GithubDouble({ main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) } });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    const location = await redirectedTo(routes.publishAllAction(listActionEvent() as never));
    expect(location).toMatch(/^\/admin\/posts\?error=/);
    expect(decodeURIComponent(location)).toContain('Nothing to publish. Every entry is already live.');
    expect(gh.calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);
  });

  it('logs publish.failed on a commit conflict and bounces to the list page', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: { [MANIFEST_PATH]: serializeManifest({ version: 1, entries: [] }) },
      [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    });
    gh.install();
    failMainRefPatch();
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
