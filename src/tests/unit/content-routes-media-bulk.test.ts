// Task 4: mediaBulkDelete, the destructive bulk action. One strict cross-branch usage index is built
// per batch (fail closed for the whole batch), the pure planBulkDelete partitions the selection, ONE
// atomic commit removes every deletable row, then their R2 objects are deleted (commit-row-then-
// delete-R2). The summary is itemized: an in-use item is skipped and reported, never force-deleted.
// These tests use the same GithubDouble harness as the single-delete suite, with a multi-hash event
// builder that repeats the `hash` field.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { MediaBulkDeleteResult } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import { parseMediaManifest, serializeMediaManifest, type MediaEntry, type MediaManifest } from '../../lib/media/manifest.js';
import { r2Key } from '../../lib/media/naming.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import { fieldset } from '../../lib/content/fieldset.js';
const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };

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
        schema: fieldset({}),
        summaryFields: [],
        validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
      },
    ],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: MEDIA_PATH,
    resolvedAssets: MEDIA_ON,
  };
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

const HASH_A = '0000000000000aaa';
const HASH_B = '0000000000000bbb';
const HASH_USED = '0000000000000ccc';
const HASH_UNCOMMITTED = '0000000000000ddd';

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

/** A fake R2 bucket recording each delete into a shared timeline so order is assertable. */
function fakeBucket(timeline: string[]): { delete: ReturnType<typeof vi.fn> } {
  return {
    delete: vi.fn(async (key: string) => {
      timeline.push(`r2-delete:${key}`);
    }),
  };
}

/** Build a bulk-delete event whose body repeats the `hash` field once per selected hash. The shared
 *  timeline records the manifest commit (the ref PATCH to main) so a 'commit' marker per batch is
 *  countable. Mirrors the single-delete suite's mediaActionEvent, extended to a multi-value field. */
function bulkEvent(hashes: string[], bucket: { delete: ReturnType<typeof vi.fn> }, timeline: string[]) {
  const inner = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method === 'PATCH' && /\/git\/refs\/heads\/main$/.test(new URL(url).pathname)) {
      timeline.push('commit');
    }
    return inner(input, init);
  }));
  const params = new URLSearchParams();
  for (const h of hashes) params.append('hash', h);
  return {
    url: new URL('https://t.example/admin/media'),
    params: {},
    request: new Request('https://t.example/admin/media', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', MEDIA_BUCKET: bucket } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('mediaBulkDelete deletes a clean selection', () => {
  it('commits ONE media.json removal of both rows and deletes both R2 objects', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_A, 'clean-a'), mediaEntry(HASH_B, 'clean-b')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime(), deps);

    const result = (await routes.mediaBulkDelete(bulkEvent([HASH_A, HASH_B], bucket, timeline) as never)) as MediaBulkDeleteResult;

    expect(result.deleted.sort()).toEqual([HASH_A, HASH_B].sort());
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);
    // The committed manifest holds neither row.
    const committed = parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!));
    expect(committed[HASH_A]).toBeUndefined();
    expect(committed[HASH_B]).toBeUndefined();
    // Both objects were deleted.
    expect(bucket.delete).toHaveBeenCalledWith(r2Key(HASH_A, 'jpg'));
    expect(bucket.delete).toHaveBeenCalledWith(r2Key(HASH_B, 'jpg'));
    // Exactly one commit landed for the whole batch.
    expect(timeline.filter((m) => m === 'commit')).toHaveLength(1);
  });

  it('lands EXACTLY ONE commit for a batch with two or more deletable assets', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_A, 'clean-a'), mediaEntry(HASH_B, 'clean-b')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime(), deps);

    await routes.mediaBulkDelete(bulkEvent([HASH_A, HASH_B], bucket, timeline) as never);

    expect(timeline.filter((m) => m === 'commit')).toHaveLength(1);
  });
});

describe('mediaBulkDelete skip-and-report', () => {
  it('skips an in-use asset (still-referenced, with usage) and deletes the clean ones', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_A, 'clean-a'), mediaEntry(HASH_USED, 'in-use')),
        [MANIFEST_PATH]: contentManifest([HASH_USED]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime(), deps);

    const result = (await routes.mediaBulkDelete(bulkEvent([HASH_A, HASH_USED], bucket, timeline) as never)) as MediaBulkDeleteResult;

    expect(result.deleted).toEqual([HASH_A]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].hash).toBe(HASH_USED);
    expect(result.skipped[0].reason).toBe('still-referenced');
    expect(result.skipped[0].usage.length).toBeGreaterThan(0);
    // The in-use row survives the commit; the clean one is gone.
    const committed = parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!));
    expect(committed[HASH_USED]).toBeDefined();
    expect(committed[HASH_A]).toBeUndefined();
    // Only the clean object was deleted from R2.
    expect(bucket.delete).toHaveBeenCalledWith(r2Key(HASH_A, 'jpg'));
    expect(bucket.delete).not.toHaveBeenCalledWith(r2Key(HASH_USED, 'jpg'));
    expect(timeline.filter((m) => m === 'commit')).toHaveLength(1);
  });

  it('skips an uncommitted hash (selected but absent from the manifest)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_A, 'clean-a')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime(), deps);

    const result = (await routes.mediaBulkDelete(bulkEvent([HASH_A, HASH_UNCOMMITTED], bucket, timeline) as never)) as MediaBulkDeleteResult;

    expect(result.deleted).toEqual([HASH_A]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({ hash: HASH_UNCOMMITTED, reason: 'uncommitted', usage: [] });
  });

  it('is a no-op success when every selected asset is skipped', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_USED, 'in-use')),
        [MANIFEST_PATH]: contentManifest([HASH_USED]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime(), deps);

    const result = (await routes.mediaBulkDelete(bulkEvent([HASH_USED], bucket, timeline) as never)) as MediaBulkDeleteResult;

    expect(result.deleted).toEqual([]);
    expect(result.skipped.map((s) => s.hash)).toEqual([HASH_USED]);
    // Nothing committed, nothing deleted.
    expect(timeline.filter((m) => m === 'commit')).toEqual([]);
    expect(bucket.delete).not.toHaveBeenCalled();
  });

  it('drops a malformed hash silently and still deletes the valid clean one', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_A, 'clean-a')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime(), deps);

    const result = (await routes.mediaBulkDelete(bulkEvent([HASH_A, 'NOT-A-HASH'], bucket, timeline) as never)) as MediaBulkDeleteResult;

    expect(result.deleted).toEqual([HASH_A]);
    // The malformed value never reaches the plan, so it is not even a skip.
    expect(result.skipped).toEqual([]);
  });
});

describe('mediaBulkDelete fails closed', () => {
  it('returns fail(503) and commits NOTHING when a branch read fails during the strict index build', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_A, 'clean-a'), mediaEntry(HASH_B, 'clean-b')),
        [MANIFEST_PATH]: contentManifest([]),
      },
      // An open edit branch whose content read will throw, so a non-strict index would skip it and
      // call these assets orphans. Strict mode must refuse the whole batch instead.
      'cairn/posts/2026-05-flaky': {
        'src/content/posts/2026-05-flaky.md': '---\ntitle: Flaky\n---\n\nbody\n',
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime(), deps);

    const event = bulkEvent([HASH_A, HASH_B], bucket, timeline);
    const wrapped = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('2026-05-flaky')) return Promise.reject(new Error('transient'));
      return wrapped(input, init);
    }));

    const result = await routes.mediaBulkDelete(event as never);
    expect(result).toMatchObject({ status: 503 });
    const data = (result as { data: { error: string } }).data;
    expect(data.error).toMatch(/could not verify/i);
    // No commit landed and no object was deleted: the rows survive.
    expect(timeline.filter((m) => m === 'commit')).toEqual([]);
    expect(bucket.delete).not.toHaveBeenCalled();
    const committed = parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!));
    expect(committed[HASH_A]).toBeDefined();
    expect(committed[HASH_B]).toBeDefined();
  });
});
