// Task 5: mediaOrphanScan and mediaPurgeOrphans. The scan is an on-demand read (R2 list + reconcile +
// one strict cross-branch usage index) that fails closed at detection: any throw during the reconcile
// or the strict usage build refuses with fail(503) and returns no scan, because a partial listing or
// an unread branch would mistake a still-stored or still-referenced asset for an orphan. The purge is
// the one IRREVERSIBLE media action: it re-derives fresh against the current manifest (a key whose
// hash was claimed since the scan is skipped), is gated by a typed count confirm, and deletes the R2
// objects directly with NO commit (an orphan has no manifest row, and raw bytes have no git history).
// These tests use the same GithubDouble harness as the bulk-delete suite, with a fake R2 bucket that
// supports both .list (for the reconcile) and .delete (for the purge).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { MediaOrphanPurgeResult } from '../../lib/sveltekit/content-routes.js';
import type { OrphanScan } from '../../lib/media/orphan-scan.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import { serializeMediaManifest, type MediaEntry, type MediaManifest } from '../../lib/media/manifest.js';
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
    mediaManifestPath: MEDIA_PATH,
    resolvedAssets: MEDIA_ON,
  };
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

// 16-hex content hashes. ORPHAN has no manifest row; REFERENCED is used by a post; MISSING is a
// manifest row whose bytes are absent from the R2 listing (a broken reference).
const HASH_ORPHAN = '0000000000000aaa';
const HASH_REFERENCED = '0000000000000bbb';
const HASH_MISSING = '0000000000000ccc';

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

/** A fake R2 bucket supporting both list (the reconcile read, one un-truncated page) and delete (the
 *  purge), recording each delete into a shared timeline so order and which-key are assertable. */
function fakeBucket(storedKeys: string[], timeline: string[]): {
  list: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
} {
  return {
    list: vi.fn(async (_opts?: { prefix?: string; cursor?: string }) => ({
      objects: storedKeys.map((key) => ({ key })),
      truncated: false,
    })),
    delete: vi.fn(async (key: string) => {
      timeline.push(`r2-delete:${key}`);
    }),
  };
}

/** A GET event for the on-demand scan (no body). */
function scanEvent(bucket: object) {
  return {
    url: new URL('https://t.example/admin/media'),
    params: {},
    request: new Request('https://t.example/admin/media', { method: 'GET' }),
    locals: { principal: { email: 'ed@t', displayName: 'Ed Editor', scopes: ['admin:editor'], tier: 'admin' } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', MEDIA_BUCKET: bucket } },
  };
}

/** A POST event for the purge: the selected `key` fields plus the typed `confirm` value. */
function purgeEvent(keys: string[], confirm: string, bucket: object) {
  const params = new URLSearchParams();
  for (const k of keys) params.append('key', k);
  params.set('confirm', confirm);
  return {
    url: new URL('https://t.example/admin/media'),
    params: {},
    request: new Request('https://t.example/admin/media', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }),
    locals: { principal: { email: 'ed@t', displayName: 'Ed Editor', scopes: ['admin:editor'], tier: 'admin' } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', MEDIA_BUCKET: bucket } },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('mediaOrphanScan', () => {
  it('reports orphanedBytes for a stored key with no row and brokenRefs (with where-used) for a missing row', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        // The referenced row's bytes are stored; the missing row's bytes are NOT in the listing.
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_REFERENCED, 'in-use'), mediaEntry(HASH_MISSING, 'gone')),
        [MANIFEST_PATH]: contentManifest([HASH_MISSING]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    // R2 holds the referenced bytes and one orphan whose hash has no manifest row.
    const stored = [r2Key(HASH_REFERENCED, 'jpg'), r2Key(HASH_ORPHAN, 'jpg')];
    const bucket = fakeBucket(stored, timeline);
    const routes = createContentRoutes(runtime(), deps);

    const scan = (await routes.mediaOrphanScan(scanEvent(bucket) as never)) as OrphanScan;

    // The orphan key (stored, no row) is purgeable.
    expect(scan.orphanedBytes).toHaveLength(1);
    expect(scan.orphanedBytes[0].key).toBe(r2Key(HASH_ORPHAN, 'jpg'));
    expect(scan.orphanedBytes[0].hash).toBe(HASH_ORPHAN);

    // The referenced asset's bytes are present, so it is NOT an orphan.
    expect(scan.orphanedBytes.some((r) => r.hash === HASH_REFERENCED)).toBe(false);

    // The missing row is a broken reference, with its where-used populated from the usage index.
    const broken = scan.brokenRefs.find((r) => r.hash === HASH_MISSING);
    expect(broken).toBeDefined();
    expect(broken!.slug).toBe('gone');
    expect(broken!.usage.length).toBeGreaterThan(0);
    expect(broken!.usage[0].id).toBe('2026-05-hi');
  });

  it('fails closed (503) and returns no scan when a branch read throws during the strict usage build', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_REFERENCED, 'in-use')),
        [MANIFEST_PATH]: contentManifest([]),
      },
      // An open edit branch whose content read will throw. A non-strict build would skip it and call a
      // branch-referenced asset an orphan; strict mode must refuse the whole scan instead.
      'cairn/posts/2026-05-flaky': {
        'src/content/posts/2026-05-flaky.md': '---\ntitle: Flaky\n---\n\nbody\n',
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket([r2Key(HASH_REFERENCED, 'jpg')], timeline);
    const routes = createContentRoutes(runtime(), deps);

    const event = scanEvent(bucket);
    const wrapped = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('2026-05-flaky')) return Promise.reject(new Error('transient'));
      return wrapped(input, init);
    }));

    const result = await routes.mediaOrphanScan(event as never);

    expect(result).toMatchObject({ status: 503 });
    // No scan shape leaked through (a fail() has no orphanedBytes).
    expect((result as { orphanedBytes?: unknown }).orphanedBytes).toBeUndefined();
  });
});

describe('mediaPurgeOrphans', () => {
  it('purges only still-orphaned keys; a key whose hash now has a manifest row is skipped claimed', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // The manifest now HAS a row for HASH_REFERENCED (it was claimed since the scan listed it as an
    // orphan key) but still has NO row for HASH_ORPHAN.
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_REFERENCED, 'claimed-since-scan')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket([], timeline);
    const routes = createContentRoutes(runtime(), deps);

    const orphanKey = r2Key(HASH_ORPHAN, 'jpg');
    const claimedKey = r2Key(HASH_REFERENCED, 'jpg');
    // Two selected, so the typed confirm is the count "2".
    const result = (await routes.mediaPurgeOrphans(
      purgeEvent([orphanKey, claimedKey], '2', bucket) as never,
    )) as MediaOrphanPurgeResult;

    // The still-orphaned key is purged; the claimed key is skipped.
    expect(result.purged).toEqual([orphanKey]);
    expect(result.skippedClaimed).toEqual([claimedKey]);
    expect(result.failed).toEqual([]);
    // The orphan's object was deleted; the claimed asset's object SURVIVES.
    expect(bucket.delete).toHaveBeenCalledWith(orphanKey);
    expect(bucket.delete).not.toHaveBeenCalledWith(claimedKey);
    expect(timeline).toEqual([`r2-delete:${orphanKey}`]);
  });

  it('refuses (400) and deletes NOTHING when the typed confirm does not match the count', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket([], timeline);
    const routes = createContentRoutes(runtime(), deps);

    const orphanKey = r2Key(HASH_ORPHAN, 'jpg');
    // One key selected but confirm is empty: the count gate fails.
    const result = await routes.mediaPurgeOrphans(purgeEvent([orphanKey], '', bucket) as never);

    expect(result).toMatchObject({ status: 400 });
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(timeline).toEqual([]);
  });

  it('skips claimed (does NOT delete) a key whose hash is referenced only on an open cairn/* branch', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // The orphan key's hash has NO manifest row on main, so a manifest-only re-derive would purge it.
    // But an open edit branch references that hash in its markdown body, so the strict cross-branch
    // usage index must catch it and skip it claimed: those bytes back a colleague's in-progress draft.
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(),
        [MANIFEST_PATH]: contentManifest([]),
      },
      // A draft on a branch that places the orphan byte's hash via a media: token.
      'cairn/posts/2026-05-draft': {
        'src/content/posts/2026-05-draft.md': `---\ntitle: Draft\n---\n\n![](media:pic.${HASH_ORPHAN})\n`,
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket([], timeline);
    const routes = createContentRoutes(runtime(), deps);

    const orphanKey = r2Key(HASH_ORPHAN, 'jpg');
    // One selected, so the typed confirm is the count "1".
    const result = (await routes.mediaPurgeOrphans(
      purgeEvent([orphanKey], '1', bucket) as never,
    )) as MediaOrphanPurgeResult;

    // The branch reference keeps the bytes alive: skipped claimed, never deleted.
    expect(result.purged).toEqual([]);
    expect(result.skippedClaimed).toEqual([orphanKey]);
    expect(result.failed).toEqual([]);
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(timeline).toEqual([]);
  });

  it('fails closed (503) and deletes NOTHING when a branch read throws during the strict index build', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(),
        [MANIFEST_PATH]: contentManifest([]),
      },
      // An open edit branch whose content read will throw. A non-strict build would skip it and let
      // the purge treat a possibly-referenced byte as a true orphan; strict mode must refuse instead.
      'cairn/posts/2026-05-flaky': {
        'src/content/posts/2026-05-flaky.md': '---\ntitle: Flaky\n---\n\nbody\n',
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket([], timeline);
    const routes = createContentRoutes(runtime(), deps);

    const orphanKey = r2Key(HASH_ORPHAN, 'jpg');
    const event = purgeEvent([orphanKey], '1', bucket);
    const wrapped = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('2026-05-flaky')) return Promise.reject(new Error('transient'));
      return wrapped(input, init);
    }));

    const result = await routes.mediaPurgeOrphans(event as never);

    expect(result).toMatchObject({ status: 503 });
    // No delete happened: the irreversible purge fails closed when usage cannot be verified.
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(timeline).toEqual([]);
  });

  it('refuses (400) when the confirm is a wrong number (a mistyped count)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket([], timeline);
    const routes = createContentRoutes(runtime(), deps);

    const orphanKey = r2Key(HASH_ORPHAN, 'jpg');
    // One key selected, confirm "2": does not match the count of 1.
    const result = await routes.mediaPurgeOrphans(purgeEvent([orphanKey], '2', bucket) as never);

    expect(result).toMatchObject({ status: 400 });
    expect(bucket.delete).not.toHaveBeenCalled();
  });
});
