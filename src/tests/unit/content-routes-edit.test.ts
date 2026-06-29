import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes, type EditData } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import { serializeMarkdown, frontmatterFromForm } from '../../lib/content/frontmatter.js';
import { serializeMediaManifest, type MediaEntry } from '../../lib/media/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_PATH = 'src/content/.cairn/media.json';

function runtime(): CairnRuntime {
  const ok = () => ({ ok: true as const, data: {} });
  const postsSchema = fieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
  });
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
        schema: postsSchema,
        summaryFields: [],
        validate: ok,
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

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

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

  it('defaults the spellcheck dictionary to US English when the runtime omits it', async () => {
    editFetch('---\ntitle: Hello\n---\nThe body.');
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.spellcheckDictionary).toBe('dictionary-en-us.txt');
  });

  it('threads the runtime spellcheck dictionary onto the edit data', async () => {
    editFetch('---\ntitle: Hello\n---\nThe body.');
    // composeRuntime resolves this from the site config's dialect; the load hands it straight through.
    const withDialect = { ...runtime(), spellcheckDictionary: 'dictionary-en-gb.txt' };
    const routes = createContentRoutes(withDialect, deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.spellcheckDictionary).toBe('dictionary-en-gb.txt');
  });

  it('round-trips a nested image frontmatter object rather than stringifying it', async () => {
    // The default form-value arm stringifies an object to '[object Object]', corrupting a hero on
    // open. The image arm must hand the object back as-is so the editor reads .src/.alt/.caption.
    const withImage = runtime();
    withImage.concepts[0].fields = [
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'image', name: 'image', label: 'Hero' },
    ];
    editFetch(
      serializeMarkdown(
        { title: 'Hello', image: { src: 'media:a.0123456789abcdef', alt: 'A ridge', caption: 'High up.' } },
        'The body.',
      ),
    );
    const routes = createContentRoutes(withImage, deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    expect(data.frontmatter.image).toEqual({
      src: 'media:a.0123456789abcdef',
      alt: 'A ridge',
      caption: 'High up.',
    });

    // The form-value -> form -> decode loop is stable for the same object.
    const stored = data.frontmatter.image as { src: string; alt: string; caption?: string };
    const form = new FormData();
    form.set('image.src', stored.src);
    form.set('image.alt', stored.alt);
    if (stored.caption !== undefined) form.set('image.caption', stored.caption);
    const imageField = withImage.concepts[0].fields.filter((f) => f.type === 'image');
    expect(frontmatterFromForm(imageField, form)).toEqual({ image: stored });
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

  it('prefills a fresh entry from a date field default of "today"', async () => {
    const withDefault = runtime();
    withDefault.concepts[0].schema = fieldset({
      title: fields.text({ label: 'Title', required: true }),
      date: fields.date({ label: 'Date', default: 'today' }),
    });
    withDefault.concepts[0].fields = [
      { type: 'text', name: 'title', label: 'Title', required: true },
      { type: 'date', name: 'date', label: 'Date', default: 'today' },
    ];
    editFetch(null);
    const routes = createContentRoutes(withDefault, deps);
    const data = await routes.editLoad(editEvent('2026-05-fresh', '?new=1') as never);
    const today = new Date().toISOString().slice(0, 10);
    expect(data.frontmatter.date).toBe(today);
  });
});

describe('editLoad address-collision advisory', () => {
  // A pages concept with an undated permalink, so two entries can resolve to the same /about.
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
          schema: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
          summaryFields: [],
          validate: () => ({ ok: true as const, data: {} }),
        },
      ],
    };
  }

  function pagesEvent(id: string, search = '') {
    return {
      url: new URL(`https://t.example/admin/pages/${id}${search}`),
      params: { concept: 'pages', id },
      request: new Request('https://t.example'),
      locals: { editor: { email: 'e@t', displayName: 'E', role: 'editor' as const } },
      platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    };
  }

  it('warns when a different entry already resolves to the same address', async () => {
    // A published entry id "about" sits at /about in the manifest. A different published entry
    // "welcome" is manually configured to the same /about, so the edited "about" collides with it.
    const manifest = serializeManifest({
      version: 1,
      entries: [
        { id: 'about', concept: 'pages', title: 'About', permalink: '/about', draft: false, links: [] },
        { id: 'welcome', concept: 'pages', title: 'Welcome', permalink: '/about', draft: false, links: [] },
      ],
    });
    const gh = new GithubDouble({
      main: {
        'src/content/pages/about.md': '---\ntitle: About\n---\nLive.',
        'src/content/pages/welcome.md': '---\ntitle: Welcome\n---\nHi.',
        [MANIFEST_PATH]: manifest,
      },
    });
    gh.install();
    const routes = createContentRoutes(pagesRuntime(), deps);
    const data = await routes.editLoad(pagesEvent('about') as never);
    expect(data.advisories).toHaveLength(1);
    const notice = data.advisories[0];
    expect(notice.kind).toBe('address-collision');
    expect(notice.severity).toBe('warn');
    expect(notice.message).toContain('/about');
    expect(notice.actions?.[0].href).toBe('/admin/pages/welcome');
  });

  it('returns an empty advisory list when the address is free', async () => {
    const manifest = serializeManifest({
      version: 1,
      entries: [{ id: 'about', concept: 'pages', title: 'About', permalink: '/about', draft: false, links: [] }],
    });
    const gh = new GithubDouble({
      main: {
        'src/content/pages/about.md': '---\ntitle: About\n---\nLive.',
        'src/content/pages/contact.md': '---\ntitle: Contact\n---\nReach us.',
        [MANIFEST_PATH]: manifest,
      },
    });
    gh.install();
    const routes = createContentRoutes(pagesRuntime(), deps);
    const data = await routes.editLoad(pagesEvent('contact') as never);
    expect(data.advisories).toEqual([]);
  });

  it('does not warn at edit-load for a collision that lives only on a sibling branch', async () => {
    // The edit-load advisory checks the published corpus only. The edited post 2026-01-15-hello resolves
    // to /posts/hello. A sibling cairn/* branch holds 2026-02-20-hello, which resolves to the same
    // /posts/hello (the slug strips the YYYY-MM-DD- prefix), but it is absent from the manifest, so it is
    // a branch-only collision. Edit-load stays silent; the publish-time re-check still detects it.
    const manifest = serializeManifest({
      version: 1,
      entries: [
        { id: '2026-01-15-hello', concept: 'posts', title: 'Hello', permalink: '/posts/hello', draft: false, links: [] },
      ],
    });
    const gh = new GithubDouble({
      main: {
        'src/content/posts/2026-01-15-hello.md': '---\ntitle: Hello\ndate: 2026-01-15\n---\nLive.',
        [MANIFEST_PATH]: manifest,
      },
      'cairn/posts/2026-02-20-hello': {
        'src/content/posts/2026-02-20-hello.md': '---\ntitle: Hello again\ndate: 2026-02-20\n---\nPending.',
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.editLoad(editEvent('2026-01-15-hello') as never);
    expect(data.advisories).toEqual([]);
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
        createdAt: '2026-06-15T00:00:00.000Z',
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

describe('editLoad taxonomy enforcement', () => {
  const ENTRY_PATH = 'src/content/posts/2026-05-hello.md';

  /** A runtime whose `posts` concept marks a `topics` taxonomy multiselect, with the given
   *  vocabulary. The entry the test loads carries `topics: ['a', 'legacy']`, so `legacy` is the
   *  orphan (in the entry, not the vocabulary). */
  function taxonomyRuntime(vocabulary: { value: string; label: string }[]): CairnRuntime {
    return {
      ...runtime(),
      concepts: [
        {
          id: 'posts', label: 'Posts', singular: 'Posts', dir: 'src/content/posts',
          routing: { routable: true, dated: true, inFeeds: true },
          permalink: '/posts/:slug',
          datePrefix: 'day',
          fields: [
            { type: 'text', name: 'title', label: 'Title', required: true },
            { type: 'multiselect', name: 'topics', label: 'Topics', taxonomy: true, creatable: true },
          ],
          schema: fieldset({}),
          summaryFields: [],
          validate: (fm) => ({ ok: true as const, data: fm }),
        },
      ],
      vocabulary,
    };
  }

  function topicsField(data: EditData) {
    return data.fields.find((f) => f.name === 'topics') as
      | { type: string; name: string; options?: readonly string[]; creatable?: boolean }
      | undefined;
  }

  it('closes the taxonomy field and flags the orphan when the site configures a vocabulary', async () => {
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hello\ntopics:\n  - a\n  - legacy\n---\nThe body.' },
    });
    gh.install();
    const routes = createContentRoutes(taxonomyRuntime([{ value: 'a', label: 'A' }]), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    const topics = topicsField(data);
    // The closed picker: options = vocabulary union orphan, creatable false.
    expect(topics?.creatable).toBe(false);
    expect(topics?.options).toEqual(['a', 'legacy']);
    // The orphan set is the prior tag that is not in the vocabulary.
    expect(data.orphanTags).toEqual(['legacy']);
    // The closed field also drives the form values the picker checks against.
    expect(data.frontmatter.topics).toEqual(['a', 'legacy']);
  });

  it('keeps the bare open field and no orphans when the vocabulary is empty (opt-in fallback)', async () => {
    const gh = new GithubDouble({
      main: { [ENTRY_PATH]: '---\ntitle: Hello\ntopics:\n  - a\n  - legacy\n---\nThe body.' },
    });
    gh.install();
    const routes = createContentRoutes(taxonomyRuntime([]), deps);
    const data = await routes.editLoad(editEvent('2026-05-hello') as never);
    const topics = topicsField(data);
    // The open creatable multiselect is unchanged: no options injected, creatable stays true.
    expect(topics?.creatable).toBe(true);
    expect(topics?.options).toBeUndefined();
    expect(data.orphanTags).toEqual([]);
  });
});
