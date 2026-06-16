import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import { serializeMediaManifest, type MediaEntry } from '../../lib/media/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_PATH = 'src/content/.cairn/media.json';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  return {
    siteName: 'T',
    concepts: [
      {
        id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts',
        routing: { routable: true, dated: true, inFeeds: true },
        permalink: '/posts/:slug',
        datePrefix: 'day',
        fields: [
          { type: 'text', name: 'title', label: 'Title', required: true },
          { type: 'date', name: 'date', label: 'Date' },
        ],
        summaryFields: [],
        validate: ok,
      },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets: { enabled: false },
  };
}

const MEDIA_ON: ResolvedAssetConfig = {
  enabled: true,
  bucketBinding: 'MEDIA_BUCKET',
  publicBase: '/media',
  urlForm: 'slug',
  maxUploadBytes: 25 * 1024 * 1024,
  allowedTypes: ['image/jpeg'],
  variants: {},
  transformations: false,
};

/** A runtime with media enabled (or off), for the media-targets projection cases. */
function mediaRuntime(assets: ResolvedAssetConfig): CairnRuntime {
  return { ...runtime(), mediaManifestPath: MEDIA_PATH, resolvedAssets: assets };
}

/** A stored-asset row, the media.json value shape; only slug/ext/contentType reach EditData. */
function mediaEntry(hash: string, slug: string): MediaEntry {
  return {
    hash,
    sha256: `${hash}-full-sha`,
    slug,
    displayName: slug,
    originalFilename: `${slug}.jpg`,
    alt: 'some alt',
    ext: 'jpg',
    contentType: 'image/jpeg',
    bytes: 1234,
    width: 800,
    height: 600,
    createdAt: '2026-06-15T00:00:00.000Z',
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

function editEvent(id: string, search = '') {
  return {
    url: new URL(`https://t.example/admin/posts/${id}${search}`),
    params: { concept: 'posts', id },
    request: new Request('https://t.example'),
    locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

/** Scripted editLoad fetch for the non-pending cases: 404 the pending-branch probe, then serve
 *  the entry and the manifest by path (null means a 404 for that read). */
function editFetch(entry: string | null, manifest: string | null = null) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/git/ref/')) return new Response('Not Found', { status: 404 });
    const body = url.includes('.cairn') ? manifest : entry;
    return body === null ? new Response('Not Found', { status: 404 }) : new Response(body, { status: 200 });
  }));
}

afterEach(() => vi.restoreAllMocks());

describe('editLoad', () => {
  it('loads an existing file with parsed, form-ready frontmatter and body', async () => {
    editFetch('---\ntitle: Hello\ndate: 2026-05-01\n---\nThe body.');
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data).toMatchObject({
      conceptId: 'posts', id: '2026-05-hello', label: 'Posts', title: 'Hello',
      body: 'The body.', isNew: false, saved: false, error: null,
    });
    expect(data.frontmatter.title).toBe('Hello');
    expect(data.frontmatter.date).toBe('2026-05-01');
    // No pending branch: the entry reads from main and is published by existence.
    expect(data.pending).toBe(false);
    expect(data.published).toBe(true);
  });

  it('returns a blank document for ?new=1 when the file is missing', async () => {
    editFetch(null);
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-fresh', '?new=1') as never);
    expect(data.isNew).toBe(true);
    expect(data.body).toBe('');
    expect(data.title).toBe('2026-05-fresh');
    expect(data.pending).toBe(false);
    expect(data.published).toBe(false);
  });

  it('404s an unknown existing file that is not new', async () => {
    editFetch(null);
    const routes = createContentRoutes(runtime(), deps);
    await expect(routes.editLoad(editEvent('missing') as never)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects an invalid id with a 400', async () => {
    const routes = createContentRoutes(runtime(), deps);
    await expect(routes.editLoad(editEvent('Bad Id!') as never)).rejects.toMatchObject({ status: 400 });
  });

  it('ships the runtime preview knob, and null when the adapter sets none', async () => {
    editFetch('---\ntitle: Hello\n---\nThe body.');
    const bare = createContentRoutes(runtime(), deps);
    const without = await bare.editLoad(editEvent('2026-05-hello') as never);
    expect(without.preview).toBeNull();

    editFetch('---\ntitle: Hello\n---\nThe body.');
    const preview = { stylesheets: ['/assets/site.css'], bodyClass: 'site', containerClass: 'prose' };
    const styled = createContentRoutes({ ...runtime(), preview }, deps);
    const data = await styled.editLoad(editEvent('2026-05-hello') as never);
    expect(data.preview).toEqual(preview);
  });

  it('resolves the concept byConcept preview override and never ships the byConcept map', async () => {
    editFetch('---\ntitle: Hello\n---\nThe body.');
    const preview = {
      stylesheets: ['/assets/site.css'],
      bodyClass: 'static-page',
      containerClass: 'page-measure',
      byConcept: { posts: { bodyClass: 'post-body', containerClass: 'post-module' } },
    };
    const routes = createContentRoutes({ ...runtime(), preview }, deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.preview).toEqual({
      stylesheets: ['/assets/site.css'],
      bodyClass: 'post-body',
      containerClass: 'post-module',
    });
    expect(data.preview).not.toHaveProperty('byConcept');
  });

  it('leaves a concept without a byConcept entry on the top-level preview values', async () => {
    editFetch('---\ntitle: Hello\n---\nThe body.');
    const preview = {
      stylesheets: ['/assets/site.css'],
      bodyClass: 'static-page',
      containerClass: 'page-measure',
      byConcept: { pages: { bodyClass: 'page-body' } },
    };
    const routes = createContentRoutes({ ...runtime(), preview }, deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.preview).toEqual({
      stylesheets: ['/assets/site.css'],
      bodyClass: 'static-page',
      containerClass: 'page-measure',
    });
  });

  it('merges a partial byConcept override over the top-level values', async () => {
    editFetch('---\ntitle: Hello\n---\nThe body.');
    const preview = {
      stylesheets: ['/assets/site.css'],
      bodyClass: 'static-page',
      containerClass: 'page-measure',
      byConcept: { posts: { containerClass: 'post-module' } },
    };
    const routes = createContentRoutes({ ...runtime(), preview }, deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.preview).toEqual({
      stylesheets: ['/assets/site.css'],
      bodyClass: 'static-page',
      containerClass: 'post-module',
    });
  });

  it('keeps the top-level value when an override key is present but undefined', async () => {
    editFetch('---\ntitle: Hello\n---\nThe body.');
    const preview = {
      stylesheets: ['/assets/site.css'],
      bodyClass: 'static-page',
      containerClass: 'page-measure',
      byConcept: { posts: { bodyClass: undefined, containerClass: 'post-module' } },
    };
    const routes = createContentRoutes({ ...runtime(), preview }, deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.preview?.bodyClass).toBe('static-page');
    expect(data.preview?.containerClass).toBe('post-module');
  });

  it('ships the manifest link targets, and an empty list when the manifest is missing', async () => {
    const manifest = serializeManifest({
      version: 1,
      entries: [{ id: 'about', concept: 'pages', title: 'About', permalink: '/about', draft: false, links: [] }],
    });
    editFetch('---\ntitle: Hello\n---\nThe body.', manifest);
    const routes = createContentRoutes(runtime(), deps);
    const withManifest = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(withManifest.linkTargets).toContainEqual({
      concept: 'pages', id: 'about', permalink: '/about', title: 'About', date: undefined, draft: false,
    });

    editFetch('---\ntitle: Hello\n---\nThe body.');
    const withoutManifest = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(withoutManifest.linkTargets).toEqual([]);
  });

  it('ships the entry inbound links for the delete guard', async () => {
    // A manifest where post 'b' links to the post '2026-05-hello' being edited.
    const manifest = serializeManifest({
      version: 1,
      entries: [
        { id: '2026-05-hello', concept: 'posts', title: 'Hello', permalink: '/posts/hello', draft: false, links: [] },
        { id: '2026-05-b', concept: 'posts', title: 'Post B', permalink: '/posts/b', draft: false, links: [{ concept: 'posts', id: '2026-05-hello' }] },
      ],
    });
    editFetch('---\ntitle: Hello\n---\nx', manifest);
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.inboundLinks).toEqual([{ concept: 'posts', id: '2026-05-b', title: 'Post B', permalink: '/posts/b' }]);
  });

  it('ships the current slug for the rename dialog', async () => {
    // The posts concept uses a day prefix, so 2026-05-01-hello strips to the slug hello.
    editFetch('---\ntitle: Hello\n---\nx');
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-01-hello') as never);
    expect(data.slug).toBe('hello');
  });

  it('reads saved and error flags from the query', async () => {
    editFetch('---\ntitle: Hi\n---\nx');
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('hi', '?saved=1&error=Nope') as never);
    expect(data.saved).toBe(true);
    expect(data.error).toBe('Nope');
  });

  it('reads the renamed flag from the query', async () => {
    editFetch('---\ntitle: Hi\n---\nx');
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('hi', '?renamed=1') as never);
    expect(data.renamed).toBe(true);
  });

  it('reads the published and discarded flashes from the query', async () => {
    editFetch('---\ntitle: Hi\n---\nx');
    const routes = createContentRoutes(runtime(), deps);
    const published = await routes.editLoad(editEvent('hi', '?published=1') as never);
    expect(published.publishedFlash).toBe(true);
    expect(published.discardedFlash).toBe(false);
    const discarded = await routes.editLoad(editEvent('hi', '?discarded=1') as never);
    expect(discarded.publishedFlash).toBe(false);
    expect(discarded.discardedFlash).toBe(true);
  });
});

describe('editLoad with a pending branch', () => {
  const ENTRY_PATH = 'src/content/posts/2026-05-hello.md';

  it('reads a published-and-edited entry from its branch and the manifest from main', async () => {
    const manifest = serializeManifest({
      version: 1,
      entries: [{ id: 'about', concept: 'pages', title: 'About', permalink: '/about', draft: false, links: [] }],
    });
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Live\n---\nLive body.', [MANIFEST_PATH]: manifest },
      'cairn/posts/2026-05-hello': { [ENTRY_PATH]: '---\ntitle: Edited\n---\nBranch body.' },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.pending).toBe(true);
    expect(data.published).toBe(true);
    expect(data.body).toBe('Branch body.');
    expect(data.title).toBe('Edited');
    // Link targets come from main's manifest even while the entry reads from its branch.
    expect(data.linkTargets.map((t) => t.id)).toEqual(['about']);
  });

  it('marks a never-published entry pending and unpublished, reading its branch', async () => {
    const gh = new GithubDouble({
      main: {},
      'cairn/posts/2026-05-fresh': { 'src/content/posts/2026-05-fresh.md': '---\ntitle: Fresh\n---\nNew body.' },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-fresh') as never);
    expect(data.pending).toBe(true);
    expect(data.published).toBe(false);
    expect(data.body).toBe('New body.');
    expect(data.title).toBe('Fresh');
  });
});

describe('editLoad media targets', () => {
  const ENTRY_PATH = 'src/content/posts/2026-05-hello.md';

  function readsOf(gh: GithubDouble, path: string): number {
    return gh.calls.filter((c) => c.method === 'GET' && c.url.includes(`/contents/${path}`)).length;
  }

  it('reads the media manifest and projects it to slug/ext/contentType per hash', async () => {
    const media = serializeMediaManifest({
      a1b2c3d4e5f60718: mediaEntry('a1b2c3d4e5f60718', 'sunset'),
    });
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hello\n---\nx', [MEDIA_PATH]: media },
    });
    gh.install();
    const routes = createContentRoutes(mediaRuntime(MEDIA_ON), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);

    // The default-branch media.json was read.
    expect(readsOf(gh, MEDIA_PATH)).toBe(1);
    // Only the three resolver fields ride; no other MediaEntry key leaks.
    expect(data.mediaTargets).toEqual({
      a1b2c3d4e5f60718: { slug: 'sunset', ext: 'jpg', contentType: 'image/jpeg' },
    });
    expect(data.mediaTargets.a1b2c3d4e5f60718).not.toHaveProperty('alt');
    expect(data.mediaTargets.a1b2c3d4e5f60718).not.toHaveProperty('hash');
  });

  it('projects the full human layer to mediaLibrary from the same read', async () => {
    const media = serializeMediaManifest({
      a1b2c3d4e5f60718: mediaEntry('a1b2c3d4e5f60718', 'sunset'),
    });
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hello\n---\nx', [MEDIA_PATH]: media },
    });
    gh.install();
    const routes = createContentRoutes(mediaRuntime(MEDIA_ON), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);

    // One read serves both projections.
    expect(readsOf(gh, MEDIA_PATH)).toBe(1);
    // The picker's human layer rides keyed by hash, the hash duplicated into the value.
    expect(data.mediaLibrary).toEqual({
      a1b2c3d4e5f60718: {
        hash: 'a1b2c3d4e5f60718',
        slug: 'sunset',
        ext: 'jpg',
        contentType: 'image/jpeg',
        displayName: 'sunset',
        alt: 'some alt',
        width: 800,
        height: 600,
        bytes: 1234,
      },
    });
  });

  it('carries the human layer in mediaLibrary, not just the resolver triple', async () => {
    const media = serializeMediaManifest({
      a1b2c3d4e5f60718: mediaEntry('a1b2c3d4e5f60718', 'sunset'),
    });
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hello\n---\nx', [MEDIA_PATH]: media },
    });
    gh.install();
    const routes = createContentRoutes(mediaRuntime(MEDIA_ON), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);

    const row = data.mediaLibrary.a1b2c3d4e5f60718;
    expect(row.displayName).toBe('sunset');
    expect(row.alt).toBe('some alt');
    expect(row.width).toBe(800);
    expect(row.height).toBe(600);
    expect(row.bytes).toBe(1234);
  });

  it('degrades a thrown media read to an empty projection without throwing the edit', async () => {
    const gh = new GithubDouble({ main: { [ENTRY_PATH]: '---\ntitle: Hello\n---\nx' } });
    gh.install();
    // Reject the media-path read; the other reads stay as the double serves them.
    const handle = globalThis.fetch as unknown as { getMockImplementation(): (i: string) => Promise<Response> };
    const inner = handle.getMockImplementation();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.includes(`/contents/${MEDIA_PATH}`)) return Promise.reject(new Error('media read boom'));
        return inner(url as never);
      }),
    );
    const routes = createContentRoutes(mediaRuntime(MEDIA_ON), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.mediaTargets).toEqual({});
    expect(data.mediaLibrary).toEqual({});
    expect(data.body).toBe('x');
  });

  it('issues no media read and projects empty when media is disabled', async () => {
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hello\n---\nx', [MEDIA_PATH]: serializeMediaManifest({}) },
    });
    gh.install();
    const routes = createContentRoutes(mediaRuntime({ enabled: false }), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(readsOf(gh, MEDIA_PATH)).toBe(0);
    expect(data.mediaTargets).toEqual({});
    expect(data.mediaLibrary).toEqual({});
  });
});
