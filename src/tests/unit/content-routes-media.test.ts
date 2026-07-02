// Task 4: mediaLibraryLoad, the admin Media Library's union loader. It unions media.json from main
// with every open cairn/* branch by hash (a branch-only asset shows; main wins a same-hash tie),
// projects each row through the shared mediaLibraryEntry helper, and attaches the cross-branch usage
// overlay (the where-used count and rows) keyed by content hash. The degrade paths mirror listLoad:
// a token-mint failure returns an error string with empty assets, and a read failure returns the
// assets it could gather with an empty usage overlay rather than a thrown 500.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type { ContentFormFailure, MediaBulkFailure } from '../../lib/sveltekit/content-routes.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import { parseMediaManifest, serializeMediaManifest, type MediaEntry, type MediaManifest } from '../../lib/media/manifest.js';
import { parseMediaToken } from '../../lib/media/reference.js';
import { r2Key } from '../../lib/media/naming.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import type { Backend } from '../../lib/github/backend.js';
import { runtime as baseRuntime, postsConcept, REPO, backend, contentEvent } from './_content-harness.js';

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
  return baseRuntime({
    concepts: [
      postsConcept({
        fields: [
          { type: 'text', name: 'title', label: 'Title', required: true },
          { type: 'image', name: 'image', label: 'Hero', seo: true },
        ],
        validate: () => ({ ok: true as const, data: { title: 'Hi' } }),
      }),
    ],
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: MEDIA_PATH,
    resolvedAssets: MEDIA_ON,
  });
}

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

function libraryEvent(search = '', eventBackend: Backend = backend) {
  return contentEvent({ url: `https://t.example/admin/media${search}`, eventBackend });
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
    const routes = createContentRoutes(runtime());
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
    const routes = createContentRoutes(runtime());
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
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    const row = data.assets.find((a) => a.hash === HASH_SHARED);
    expect(row?.slug).toBe('main-name');
  });

  it('lists assets even when no content manifest exists, with an empty usage overlay', async () => {
    const gh = new GithubDouble({
      main: { [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_ORPHAN, 'orphan')) },
    });
    gh.install();
    const routes = createContentRoutes(runtime());
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
    const routes = createContentRoutes(runtime());
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
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    // Two rows (published + branch), but one distinct concept/id, so count is 1.
    expect(data.usage[HASH_MAIN].entries).toHaveLength(2);
    expect(data.usage[HASH_MAIN].count).toBe(1);
  });
});

describe('mediaLibraryLoad degrade paths', () => {
  it('returns an error and empty assets on a token-mint failure', async () => {
    const routes = createContentRoutes(runtime());
    const failingBackend = makeGithubBackend(REPO, () => {
      throw new Error('no key');
    });
    const data = await routes.mediaLibraryLoad(libraryEvent('', failingBackend) as never);
    // The token mint is lazy inside the first read now, so a token failure lands in the one
    // could-not-load-media degrade rather than the old separate auth tier.
    expect(data).toEqual({ assets: [], usage: {}, error: 'Could not load media.', flash: null, flashError: null });
  });
});

describe('mediaLibraryLoad flash flags', () => {
  function gh() {
    const dbl = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'on-main')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    dbl.install();
    return dbl;
  }

  it('reads the deleted flash from ?deleted=1', async () => {
    gh();
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent('?deleted=1') as never);
    expect(data.flash).toBe('deleted');
    expect(data.flashError).toBeNull();
  });

  it('reads the updated flash from ?updated=1', async () => {
    gh();
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent('?updated=1') as never);
    expect(data.flash).toBe('updated');
    expect(data.flashError).toBeNull();
  });

  it('reads the replaced flash from ?replaced=1', async () => {
    gh();
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent('?replaced=1') as never);
    expect(data.flash).toBe('replaced');
    expect(data.flashError).toBeNull();
  });

  it('reads the altPropagated flash from ?altPropagated=1', async () => {
    gh();
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent('?altPropagated=1') as never);
    expect(data.flash).toBe('altPropagated');
    expect(data.flashError).toBeNull();
  });

  it('reads the bulkDeleted flash from ?bulkDeleted=1', async () => {
    gh();
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent('?bulkDeleted=1') as never);
    expect(data.flash).toBe('bulkDeleted');
    expect(data.flashError).toBeNull();
  });

  it('reads the orphansPurged flash from ?orphansPurged=1', async () => {
    gh();
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent('?orphansPurged=1') as never);
    expect(data.flash).toBe('orphansPurged');
    expect(data.flashError).toBeNull();
  });

  it('reads the uploaded flash from ?uploaded=1', async () => {
    gh();
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent('?uploaded=1') as never);
    expect(data.flash).toBe('uploaded');
    expect(data.flashError).toBeNull();
  });

  it('reads the conflict error from ?error= into flashError, not the load error slot', async () => {
    gh();
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent('?error=The%20media%20manifest%20changed.') as never);
    expect(data.flashError).toBe('The media manifest changed.');
    expect(data.flash).toBeNull();
    // The degraded-load error slot stays null on a successful load: the conflict error rides flashError.
    expect(data.error).toBeNull();
  });

  it('returns null flash and flashError when the URL carries no flag', async () => {
    gh();
    const routes = createContentRoutes(runtime());
    const data = await routes.mediaLibraryLoad(libraryEvent() as never);
    expect(data.flash).toBeNull();
    expect(data.flashError).toBeNull();
  });
});

describe('ContentFormFailure accepts the media replace and alt-propagate shapes', () => {
  it('accepts a MediaReplaceFailure and a MediaAltPropagateFailure shape', () => {
    // Type-level assertions: the union must carry the replace failure's full key set (hash, usage,
    // foundIn) and the alt-propagate failure's bare summary. A compile-only check; the runtime
    // assertion just keeps the const live.
    const replace: ContentFormFailure = { error: 'still in use', hash: 'a'.repeat(16), usage: [], foundIn: 1 };
    const altPropagate: ContentFormFailure = { error: 'could not verify usage' };
    expect(replace.error).toBe('still in use');
    expect(altPropagate.error).toBe('could not verify usage');
  });

  it('accepts a MediaBulkFailure shape', () => {
    // Type-level assertion: the union must accept the bulk failure's bare summary, and reading it back
    // as ContentFormFailure['error'] proves the merge. A compile-only check; the runtime assertion just
    // keeps the const live.
    const bulkFail: MediaBulkFailure = { error: 'could not verify usage' };
    const merged: ContentFormFailure = bulkFail;
    const message: ContentFormFailure['error'] = merged.error;
    expect(message).toBe('could not verify usage');
  });
});

// Task 5: the safe-delete and the rename/default-alt actions. The delete rechecks usage against a
// FRESH index read at delete time (never a client count), refuses an in-use asset unless the form
// carries the typed-slug override, and on confirm commits the media.json row removal BEFORE deleting
// the R2 object. The update edits the row (displayName/slug/default alt) with no reference rewrite,
// so a renamed asset still resolves by hash.

/** A fake R2 bucket: it records each delete into a shared call-order timeline so a test can assert
 *  the manifest commit landed before the object delete. `delete` of an absent key is a no-op. */
function fakeBucket(timeline: string[]): { delete: ReturnType<typeof vi.fn> } {
  return {
    delete: vi.fn(async (key: string) => {
      timeline.push(`r2-delete:${key}`);
    }),
  };
}

/** Build a media action event with a form body. The shared timeline records the manifest commit
 *  (the ref PATCH to main lands the row removal) so the delete order is assertable. */
function mediaActionEvent(
  fields: Record<string, string>,
  bucket: { delete: ReturnType<typeof vi.fn> },
  timeline: string[],
) {
  // Wrap the GithubDouble's stubbed fetch (already installed) so the landing PATCH records a
  // 'commit' marker on the same timeline as the R2 delete.
  const inner = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method === 'PATCH' && /\/git\/refs\/heads\/main$/.test(new URL(url).pathname)) {
      timeline.push('commit');
    }
    return inner(input, init);
  }));
  return contentEvent({
    url: 'https://t.example/admin/media',
    form: fields,
    env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', MEDIA_BUCKET: bucket },
  });
}

describe('mediaDeleteAction in-use refusal', () => {
  it('refuses a published-referenced asset against a fresh recheck and emits media.delete_blocked', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'in-use')),
        [MANIFEST_PATH]: contentManifest([HASH_MAIN]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    // The client passes no confirmSlug (the stale "no references" case); the gate still refuses.
    const result = await routes.mediaDeleteAction(mediaActionEvent({ hash: HASH_MAIN }, bucket, timeline) as never);
    expect(result).toMatchObject({ status: 409 });
    const data = (result as { data: { error: string; foundIn: number; usage: unknown[]; hash: string } }).data;
    expect(data.foundIn).toBe(1);
    expect(data.usage).toHaveLength(1);
    expect(data.hash).toBe(HASH_MAIN);
    // Neither the commit nor the R2 delete ran.
    expect(timeline).toEqual([]);
    expect(bucket.delete).not.toHaveBeenCalled();
    const blocked = warnSpy.mock.calls.map((c) => c[0] as { event?: string; foundIn?: number }).find((r) => r.event === 'media.delete_blocked');
    expect(blocked).toMatchObject({ event: 'media.delete_blocked', foundIn: 1 });
  });

  it('lists the breaking entries published-first then by branch', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'in-use')),
        [MANIFEST_PATH]: contentManifest([HASH_MAIN]),
      },
      // A different entry edits the same asset on its branch, so the union carries a branch row too.
      'cairn/posts/2026-05-draft': {
        'src/content/posts/2026-05-draft.md': '---\ntitle: Draft\n---\n\n![](media:in-use.' + HASH_MAIN + ')\n',
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    const result = await routes.mediaDeleteAction(mediaActionEvent({ hash: HASH_MAIN }, bucket, timeline) as never);
    const data = (result as { data: { usage: { origin: { kind: string } }[] } }).data;
    expect(data.usage).toHaveLength(2);
    expect(data.usage[0].origin.kind).toBe('published');
    expect(data.usage[1].origin.kind).toBe('branch');
  });

  it('forces the delete through when the typed confirmSlug matches the row slug', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'in-use')),
        [MANIFEST_PATH]: contentManifest([HASH_MAIN]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    await expect(
      routes.mediaDeleteAction(mediaActionEvent({ hash: HASH_MAIN, confirmSlug: 'in-use' }, bucket, timeline) as never),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?deleted=1' });
    // The forced delete committed the removal and deleted the object.
    expect(parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!))[HASH_MAIN]).toBeUndefined();
    expect(bucket.delete).toHaveBeenCalledWith(r2Key(HASH_MAIN, 'jpg'));
  });
});

describe('mediaDeleteAction strict-usage gate', () => {
  it('fails closed with 503 and deletes nothing when a branch read fails during the recheck', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'maybe-used')),
        [MANIFEST_PATH]: contentManifest([]),
      },
      // An open edit branch whose content read will be made to throw (a transient 403/5xx), so the
      // best-effort index would skip it and call the asset an orphan. Strict mode must refuse instead.
      'cairn/posts/2026-05-flaky': {
        'src/content/posts/2026-05-flaky.md': '---\ntitle: Flaky\n---\n\n![](media:maybe-used.' + HASH_MAIN + ')\n',
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    // Wrap fetch (after mediaActionEvent installs its own wrapper) so the flaky branch's content read
    // rejects. mediaActionEvent stubs fetch, so wrap once more on top.
    const event = mediaActionEvent({ hash: HASH_MAIN }, bucket, timeline);
    const wrapped = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('2026-05-flaky')) return Promise.reject(new Error('transient'));
      return wrapped(input, init);
    }));

    const result = await routes.mediaDeleteAction(event as never);
    expect(result).toMatchObject({ status: 503 });
    const data = (result as { data: { error: string } }).data;
    expect(data.error).toMatch(/could not verify/i);
    // Nothing was committed or deleted: the row survives.
    expect(parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!))[HASH_MAIN]).toBeDefined();
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(timeline).toEqual([]);
  });
});

describe('mediaDeleteAction confirm guards', () => {
  it('never confirms an in-use delete when the stored slug is empty (no empty-default bypass)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        // A pathological row with an empty slug.
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, '', { slug: '', displayName: 'blank' })),
        [MANIFEST_PATH]: contentManifest([HASH_MAIN]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    // The empty-default confirmSlug ('') would match an empty row.slug under a naive compare.
    const result = await routes.mediaDeleteAction(mediaActionEvent({ hash: HASH_MAIN, confirmSlug: '' }, bucket, timeline) as never);
    expect(result).toMatchObject({ status: 409 });
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(timeline).toEqual([]);
    expect(parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!))[HASH_MAIN]).toBeDefined();
  });

  it('throws on a corrupt ext before the commit, so the row is not removed nor the bytes orphaned', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        // A corrupt ext (not 1-5 lowercase alphanumerics): r2Key throws on it.
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_ORPHAN, 'bad-ext', { ext: 'BAD!' })),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    // The key derivation runs before the commit, so the corrupt ext throws before any write.
    await expect(routes.mediaDeleteAction(mediaActionEvent({ hash: HASH_ORPHAN }, bucket, timeline) as never)).rejects.toThrow();
    // The row survives and no object delete ran.
    expect(parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!))[HASH_ORPHAN]).toBeDefined();
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(timeline).toEqual([]);
  });
});

describe('mediaDeleteAction orphan delete', () => {
  it('commits the manifest delete then deletes the R2 object, in that order, and emits media.deleted', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_ORPHAN, 'orphan')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    await expect(
      routes.mediaDeleteAction(mediaActionEvent({ hash: HASH_ORPHAN }, bucket, timeline) as never),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?deleted=1' });

    // The row is gone from main's media.json.
    expect(parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!))[HASH_ORPHAN]).toBeUndefined();
    // Both calls ran, and the commit precedes the R2 delete.
    expect(bucket.delete).toHaveBeenCalledWith(r2Key(HASH_ORPHAN, 'jpg'));
    const commitAt = timeline.indexOf('commit');
    const deleteAt = timeline.findIndex((t) => t.startsWith('r2-delete:'));
    expect(commitAt).toBeGreaterThanOrEqual(0);
    expect(deleteAt).toBeGreaterThan(commitAt);
    const deleted = infoSpy.mock.calls.map((c) => c[0] as { event?: string; hash?: string }).find((r) => r.event === 'media.deleted');
    expect(deleted).toMatchObject({ event: 'media.deleted', hash: HASH_ORPHAN });
  });

  it('removes the row and redirects even when the R2 object is already gone (a dead row)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_ORPHAN, 'dead-row')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    // The fake delete no-ops regardless (the R2 contract for an absent key).
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    await expect(
      routes.mediaDeleteAction(mediaActionEvent({ hash: HASH_ORPHAN }, bucket, timeline) as never),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?deleted=1' });
    expect(parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!))[HASH_ORPHAN]).toBeUndefined();
    expect(bucket.delete).toHaveBeenCalledOnce();
  });

  it('returns fail(404) for an asset not committed on main, with the scope message', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'on-main')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    const result = await routes.mediaDeleteAction(mediaActionEvent({ hash: HASH_BRANCH }, bucket, timeline) as never);
    expect(result).toMatchObject({ status: 404 });
    const data = (result as { data: { error: string } }).data;
    expect(data.error).toMatch(/not committed/i);
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(timeline).toEqual([]);
  });
});

describe('mediaUpdateAction', () => {
  it('edits the row displayName, slug, and default alt and commits the new slug', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'old-slug', { alt: '', displayName: 'old-slug' })),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    await expect(
      routes.mediaUpdateAction(
        mediaActionEvent({ hash: HASH_MAIN, slug: 'new-slug', displayName: 'New name', alt: 'A photo' }, bucket, timeline) as never,
      ),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?updated=1' });
    const committed = parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!))[HASH_MAIN];
    expect(committed.slug).toBe('new-slug');
    expect(committed.displayName).toBe('New name');
    expect(committed.alt).toBe('A photo');
    // The hash key is unchanged, so an existing media: reference still resolves to the asset: the
    // resolver and route key on the hash, never the slug. An old-slug token parses to the same hash.
    const oldRef = parseMediaToken(`media:old-slug.${HASH_MAIN}`);
    expect(oldRef?.hash).toBe(HASH_MAIN);
    expect(committed.hash).toBe(oldRef?.hash);
  });

  it('falls back to the slug as displayName when the display name is blank', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'old-slug')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    await expect(
      routes.mediaUpdateAction(mediaActionEvent({ hash: HASH_MAIN, slug: 'kept-slug', displayName: '' }, bucket, timeline) as never),
    ).rejects.toMatchObject({ status: 303 });
    const committed = parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!))[HASH_MAIN];
    expect(committed.displayName).toBe('kept-slug');
  });

  it('refuses an invalid slug with fail(400)', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'old-slug')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    const result = await routes.mediaUpdateAction(
      mediaActionEvent({ hash: HASH_MAIN, slug: 'Not A Slug', displayName: 'x' }, bucket, timeline) as never,
    );
    expect(result).toMatchObject({ status: 400 });
  });

  it('returns fail(404) for an asset not committed on main', async () => {
    const gh = new GithubDouble({
      main: { [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_MAIN, 'on-main')), [MANIFEST_PATH]: contentManifest([]) },
    });
    gh.install();
    const timeline: string[] = [];
    const bucket = fakeBucket(timeline);
    const routes = createContentRoutes(runtime());
    const result = await routes.mediaUpdateAction(
      mediaActionEvent({ hash: HASH_BRANCH, slug: 'x', displayName: 'x' }, bucket, timeline) as never,
    );
    expect(result).toMatchObject({ status: 404 });
  });
});
