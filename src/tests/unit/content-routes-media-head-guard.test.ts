// The head guard on the media paths that read-modify-commit on the default branch: each reads
// branchHead(defaultBranch) before its first read of media.json, the content manifest, or an entry
// file, and commits with it as expectedHead. Each race test injects a concurrent commit after the
// path's first read of the file it is stale on and before its own commit, so a head read taken
// after that read would see the injected commit and let the stale file commit cleanly. A conflict
// answers with the path's own message and leaves the concurrent commit's bytes on main.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { injectAfterFirstRead } from './_inject-after-read.js';
import { createContentRoutesInternal } from '../../lib/sveltekit/content-routes.js';
import { formatManifest, type ManifestEntry } from '../../lib/content/manifest.js';
import { parseMediaManifest, serializeMediaManifest, type MediaEntry, type MediaManifest } from '../../lib/media/manifest.js';
import { r2Key } from '../../lib/media/naming.js';
import { MANIFEST_CONFLICT_MESSAGE, CONTENT_CONFLICT_MESSAGE } from '../../lib/sveltekit/content-routes-media-shared.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import type { Backend } from '../../lib/github/backend.js';
import { runtime as baseRuntime, postsConcept, backend, contentEvent } from './_content-harness.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_PATH = 'src/content/.cairn/media.json';
const ENTRY_PATH = 'src/content/posts/2026-05-one.md';

const MEDIA_ON: ResolvedAssetConfig = {
  enabled: true,
  bucketBinding: 'MEDIA_BUCKET',
  publicBase: '/media',
  urlForm: 'slug',
  maxUploadBytes: 25 * 1024 * 1024,
  allowedTypes: ['image/jpeg'],
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

const HASH_A = '0000000000000aaa';
const HASH_B = '0000000000000bbb';
const HASH_C = '0000000000000ccc';
const HASH_NEW = '0000000000000ddd';

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

function postEntry(id: string, mediaRefs: string[]): ManifestEntry {
  return { concept: 'posts', id, permalink: `/posts/${id}`, title: 'One', date: '2026-05-01', draft: false, links: [], mediaRefs };
}

function contentManifest(mediaRefs: string[]): string {
  return formatManifest({ version: 1, entries: [postEntry('2026-05-one', mediaRefs)] });
}

/** An entry body whose one image has an empty alt and references `hash`, plus a prose line. */
function entryBody(hash: string, prose: string): string {
  return `---\ntitle: One\n---\n\n${prose}\n\n![](media:photo.${hash})\n`;
}

/** The repo every scenario starts from: two committed assets, one entry referencing HASH_A. */
function repo(): GithubDouble {
  return new GithubDouble({
    main: {
      [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_A, 'photo', { alt: 'Old default' }), mediaEntry(HASH_B, 'other')),
      [MANIFEST_PATH]: contentManifest([HASH_A]),
      [ENTRY_PATH]: entryBody(HASH_A, 'Original prose.'),
    },
  });
}

/** A concurrent upload lands: media.json gains a row the stale read never saw. */
function uploadLands(gh: GithubDouble): void {
  gh.commit('main', MEDIA_PATH, mediaManifest(mediaEntry(HASH_A, 'photo', { alt: 'Old default' }), mediaEntry(HASH_B, 'other'), mediaEntry(HASH_C, 'concurrent')));
}

/** A concurrent publish lands: the entry's prose changes on main. */
function publishLands(gh: GithubDouble): void {
  gh.commit('main', ENTRY_PATH, entryBody(HASH_A, 'Prose a concurrent publish just wrote.'));
}

/** A fake R2 bucket recording each delete. */
function fakeBucket(): { delete: ReturnType<typeof vi.fn> } {
  return { delete: vi.fn(async () => {}) };
}

type Bucket = ReturnType<typeof fakeBucket>;
type Outcome = { status: number; data: { error: string } } | { redirect: string };

interface Scenario {
  name: string;
  message: string;
  /** Run the action against `eventBackend` and fold a thrown redirect into the outcome. */
  run(bucket: Bucket, eventBackend?: Backend): Promise<Outcome>;
  /** The file the concurrent commit lands after the first read of. */
  raceAfter: string;
  /** The concurrent commit. */
  race(gh: GithubDouble): void;
  /** What must still hold on main after the refused action. */
  survives(gh: GithubDouble): void;
}

async function fold(action: () => Promise<unknown>): Promise<Outcome> {
  try {
    return (await action()) as Outcome;
  } catch (thrown) {
    if (thrown && typeof thrown === 'object' && 'location' in thrown) return { redirect: String((thrown as { location: string }).location) };
    throw thrown;
  }
}

function formEvent(fields: Record<string, string>, bucket: Bucket, eventBackend?: Backend) {
  return contentEvent({ url: 'https://t.example/admin/media', form: fields, env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', MEDIA_BUCKET: bucket }, eventBackend });
}

function bodyEvent(fields: Record<string, string>, bucket: Bucket, eventBackend?: Backend) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return contentEvent({ url: 'https://t.example/admin/media', body: form, env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', MEDIA_BUCKET: bucket }, eventBackend });
}

function mediaOnMain(gh: GithubDouble): MediaManifest {
  return parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!));
}

const routes = () => createContentRoutesInternal({ runtime: runtime() });

const SCENARIOS: Scenario[] = [
  {
    name: 'metadata update',
    message: MANIFEST_CONFLICT_MESSAGE,
    run: (bucket, eb) => fold(() => routes().mediaUpdateAction(formEvent({ hash: HASH_A, displayName: 'Renamed', slug: 'renamed', alt: '' }, bucket, eb))),
    raceAfter: MEDIA_PATH,
    race: uploadLands,
    survives(gh) {
      // The upload's row survives and the stale rename never landed.
      expect(mediaOnMain(gh)[HASH_C]).toBeDefined();
      expect(mediaOnMain(gh)[HASH_A].slug).toBe('photo');
    },
  },
  {
    name: 'single delete',
    message: MANIFEST_CONFLICT_MESSAGE,
    run: (bucket, eb) => fold(() => routes().mediaDeleteAction(formEvent({ hash: HASH_B }, bucket, eb))),
    raceAfter: MEDIA_PATH,
    race: uploadLands,
    survives(gh) {
      expect(mediaOnMain(gh)[HASH_B]).toBeDefined();
      expect(mediaOnMain(gh)[HASH_C]).toBeDefined();
    },
  },
  {
    name: 'bulk delete',
    message: MANIFEST_CONFLICT_MESSAGE,
    run: (bucket, eb) => {
      const params = new URLSearchParams();
      params.append('hash', HASH_B);
      return fold(() => routes().mediaBulkDeleteAction(contentEvent({ url: 'https://t.example/admin/media', form: params, env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', MEDIA_BUCKET: bucket }, eventBackend: eb })));
    },
    raceAfter: MEDIA_PATH,
    race: uploadLands,
    survives(gh) {
      expect(mediaOnMain(gh)[HASH_B]).toBeDefined();
      expect(mediaOnMain(gh)[HASH_C]).toBeDefined();
    },
  },
  {
    name: 'replace',
    message: CONTENT_CONFLICT_MESSAGE,
    run: (bucket, eb) =>
      fold(() =>
        routes().mediaReplaceAction(
          bodyEvent({ oldHash: HASH_A, newHash: HASH_NEW, confirmSlug: 'photo', media: JSON.stringify([mediaEntry(HASH_NEW, 'fresh')]) }, bucket, eb),
        ),
      ),
    raceAfter: MEDIA_PATH,
    race: uploadLands,
    survives(gh) {
      expect(mediaOnMain(gh)[HASH_C]).toBeDefined();
      expect(mediaOnMain(gh)[HASH_NEW]).toBeUndefined();
      expect(gh.read('main', ENTRY_PATH)).toContain(`media:photo.${HASH_A}`);
    },
  },
  {
    name: 'alt propagation',
    message: CONTENT_CONFLICT_MESSAGE,
    run: (bucket, eb) => fold(() => routes().mediaAltPropagateAction(bodyEvent({ hash: HASH_A }, bucket, eb))),
    raceAfter: MEDIA_PATH,
    // A concurrent metadata edit changes the default alt the stale read would have filled in.
    race: (gh) => gh.commit('main', MEDIA_PATH, mediaManifest(mediaEntry(HASH_A, 'photo', { alt: 'Concurrent default' }), mediaEntry(HASH_B, 'other'))),
    survives(gh) {
      expect(mediaOnMain(gh)[HASH_A].alt).toBe('Concurrent default');
      expect(gh.read('main', ENTRY_PATH)).toBe(entryBody(HASH_A, 'Original prose.'));
    },
  },
];

afterEach(() => vi.restoreAllMocks());

describe('media head guard: a concurrent commit after the first read is a conflict', () => {
  it.each(SCENARIOS)('$name answers its own conflict message and keeps the concurrent bytes', async (scenario) => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    const fired = injectAfterFirstRead(scenario.raceAfter, () => scenario.race(gh));
    const bucket = fakeBucket();

    const outcome = await scenario.run(bucket);

    expect(fired()).toBe(true);
    expect(outcome).toMatchObject({ status: 409, data: { error: scenario.message } });
    scenario.survives(gh);
    expect(bucket.delete).not.toHaveBeenCalled();
  });
});

describe('media head guard: deletes', () => {
  it('logs no media.deleted when a single delete conflicts', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    injectAfterFirstRead(MEDIA_PATH, () => uploadLands(gh));
    const outcome = await SCENARIOS[1].run(fakeBucket());
    expect(outcome).toMatchObject({ status: 409 });
    const events = logSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).not.toContain('media.deleted');
  });

  it('logs no media.bulk_deleted when a bulk delete conflicts', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    injectAfterFirstRead(MEDIA_PATH, () => uploadLands(gh));
    const outcome = await SCENARIOS[2].run(fakeBucket());
    expect(outcome).toMatchObject({ status: 409 });
    const events = logSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).not.toContain('media.bulk_deleted');
  });

  it('conflicts a single delete when a publish referencing the asset lands after the usage read, keeping the bytes', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // HASH_B is unreferenced when the delete reads the content manifest; the publish that lands
    // right after adds the reference.
    const gh = repo();
    gh.install();
    const fired = injectAfterFirstRead(MANIFEST_PATH, () => {
      gh.commit('main', ENTRY_PATH, entryBody(HASH_B, 'Now showing the other photo.'));
      gh.commit('main', MANIFEST_PATH, contentManifest([HASH_A, HASH_B]));
    });
    const bucket = fakeBucket();

    const outcome = await SCENARIOS[1].run(bucket);

    expect(fired()).toBe(true);
    expect(outcome).toMatchObject({ status: 409, data: { error: MANIFEST_CONFLICT_MESSAGE } });
    expect(mediaOnMain(gh)[HASH_B]).toBeDefined();
    expect(bucket.delete).not.toHaveBeenCalledWith(r2Key(HASH_B, 'jpg'));
    expect(bucket.delete).not.toHaveBeenCalled();
  });
});

describe('media head guard: a publish landing after the entry read', () => {
  it('keeps the publish prose when a replace conflicts', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    const fired = injectAfterFirstRead(ENTRY_PATH, () => publishLands(gh));

    const outcome = await SCENARIOS[3].run(fakeBucket());

    expect(fired()).toBe(true);
    expect(outcome).toMatchObject({ status: 409, data: { error: CONTENT_CONFLICT_MESSAGE } });
    expect(gh.read('main', ENTRY_PATH)).toContain('Prose a concurrent publish just wrote.');
    expect(mediaOnMain(gh)[HASH_NEW]).toBeUndefined();
  });

  it('keeps the publish prose when an alt propagation conflicts', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    const fired = injectAfterFirstRead(ENTRY_PATH, () => publishLands(gh));

    const outcome = await SCENARIOS[4].run(fakeBucket());

    expect(fired()).toBe(true);
    expect(outcome).toMatchObject({ status: 409, data: { error: CONTENT_CONFLICT_MESSAGE } });
    expect(gh.read('main', ENTRY_PATH)).toContain('Prose a concurrent publish just wrote.');
  });
});

describe('media head guard: a default branch with no head', () => {
  it.each(SCENARIOS)('$name refuses with its conflict message and commits nothing', async (scenario) => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    const commit = vi.fn(async () => 'sha');
    const headless: Backend = { ...backend, branchHead: async () => null, commit };
    const bucket = fakeBucket();

    const outcome = await scenario.run(bucket, headless);

    expect(outcome).toMatchObject({ status: 409, data: { error: scenario.message } });
    expect(commit).not.toHaveBeenCalled();
    expect(bucket.delete).not.toHaveBeenCalled();
  });
});
