// Task 4: mediaLibraryLoad, the admin Media Library's union loader. It unions media.json from main
// with every open cairn/* branch by hash (a branch-only asset shows; main wins a same-hash tie),
// projects each row through the shared mediaLibraryEntry helper, and attaches the cross-branch usage
// overlay (the where-used count and rows) keyed by content hash. The degrade paths mirror listLoad:
// a token-mint failure returns an error string with empty assets, and a read failure returns the
// assets it could gather with an empty usage overlay rather than a thrown 500.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import { serializeMediaManifest, type MediaEntry, type MediaManifest } from '../../lib/media/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_PATH = 'src/content/.cairn/media.json';

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

function runtime(): CairnRuntime {
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
          { type: 'image', name: 'image', label: 'Hero', seo: true },
        ],
        summaryFields: [],
        validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
      },
    ],
    backend: { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' },
    sender: { from: 'cms@test' },
    render: (md) => md,
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: MEDIA_PATH,
    resolvedAssets: MEDIA_ON,
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

const HASH_MAIN = '0000000000000aaa';
const HASH_BRANCH = '0000000000000bbb';
const HASH_SHARED = '0000000000000ccc';
const HASH_ORPHAN = '0000000000000ddd';

function mediaEntry(hash: string, slug: string, over: Partial<MediaEntry> = {}): MediaEntry {
  return {
    hash,
    sha256: `${hash}-full-sha`,
    slug,
    displayName: slug,
    originalFilename: `${slug}.jpg`,
    alt: '',
    ext: 'jpg',
    contentType: 'image/jpeg',
    bytes: 1234,
    width: 800,
    height: 600,
    createdAt: '2026-06-15T00:00:00.000Z',
    ...over,
  };
}

function mediaManifest(...entries: MediaEntry[]): string {
  const manifest: MediaManifest = {};
  for (const e of entries) manifest[e.hash] = e;
  return serializeMediaManifest(manifest);
}

function contentManifest(mediaRefs: string[]): string {
  return serializeManifest({
    version: 1,
    entries: [
      { concept: 'posts', id: '2026-05-hi', permalink: '/posts/hi', title: 'Hi', date: '2026-05-01', draft: false, links: [], mediaRefs },
    ],
  });
}

function libraryEvent() {
  return {
    url: new URL('https://t.example/admin/media'),
    params: {},
    request: new Request('https://t.example/admin/media'),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('mediaLibraryLoad assets union', () => {
  it('returns rows from main media.json', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'on-main')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    expect(data.error).toBeNull();
    expect(data.assets.map((a) => a.hash)).toEqual([HASH_MAIN]);
    expect(data.assets[0].slug).toBe('on-main');
    expect(data.assets[0].createdAt).toBe('2026-06-15T00:00:00.000Z');
  });

  it('unions a branch-only asset absent from main', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'on-main')),
        [MANIFEST_PATH]: contentManifest([]),
      },
      'cairn/posts/2026-05-draft': {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_BRANCH, 'on-branch')),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    expect(data.assets.map((a) => a.hash).sort()).toEqual([HASH_MAIN, HASH_BRANCH].sort());
  });

  it("prefers main's row on a same-hash conflict", async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_SHARED, 'main-name')),
        [MANIFEST_PATH]: contentManifest([]),
      },
      'cairn/posts/2026-05-draft': {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_SHARED, 'branch-name')),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    const row = data.assets.find((a) => a.hash === HASH_SHARED);
    expect(row?.slug).toBe('main-name');
  });

  it('lists assets even when no content manifest exists, with an empty usage overlay', async () => {
    const gh = new GithubDouble({
      main: { [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_ORPHAN, 'orphan')) },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    expect(data.assets.map((a) => a.hash)).toEqual([HASH_ORPHAN]);
    expect(data.usage).toEqual({});
    expect(data.error).toBeNull();
  });
});

describe('mediaLibraryLoad usage overlay', () => {
  it('attaches the usage overlay keyed by hash with a distinct concept/id count', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'used'), mediaEntry(HASH_ORPHAN, 'orphan')),
        [MANIFEST_PATH]: contentManifest([HASH_MAIN]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    expect(data.usage[HASH_MAIN].count).toBe(1);
    expect(data.usage[HASH_MAIN].entries).toHaveLength(1);
    expect(data.usage[HASH_MAIN].entries[0]).toMatchObject({ concept: 'posts', id: '2026-05-hi' });
    // An orphan asset gets no usage key, so the screen renders "no references found".
    expect(data.usage[HASH_ORPHAN]).toBeUndefined();
  });

  it('counts a published use and a branch edit of the same entry as one distinct entry', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'used')),
        [MANIFEST_PATH]: contentManifest([HASH_MAIN]),
      },
      // The same entry id, edited on its branch, also references the same asset.
      'cairn/posts/2026-05-hi': {
        'src/content/posts/2026-05-hi.md': '---\ntitle: Hi\n---\n\n![](media:photo.' + HASH_MAIN + ')\n',
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    // Two rows (published + branch), but one distinct concept/id, so count is 1.
    expect(data.usage[HASH_MAIN].entries).toHaveLength(2);
    expect(data.usage[HASH_MAIN].count).toBe(1);
  });
});

describe('mediaLibraryLoad degrade paths', () => {
  it('returns an error and empty assets on a token-mint failure', async () => {
    const routes = createContentRoutes(runtime(), {
      mintToken: () => {
        throw new Error('no key');
      },
    });
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    expect(data).toEqual({ assets: [], usage: {}, error: 'Could not authenticate with GitHub.' });
  });
});
