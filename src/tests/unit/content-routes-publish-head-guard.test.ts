// The head guard on publish and publish-all: each reads branchHead(defaultBranch) before its first
// read of the media.json or index.json snapshot it commits, and commits with it as expectedHead.
// Each race test injects a concurrent commit after the first read of the snapshot and before the
// action's own commit, so a head read taken after that read would see the injected commit and let
// the stale snapshot commit cleanly. A conflict answers calmly and the entry stays held on its
// branch; the concurrent commit's bytes stay on main.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { injectAfterFirstRead } from './_inject-after-read.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import { formatManifest, type ManifestEntry } from '../../lib/content/manifest.js';
import { parseMediaManifest, serializeMediaManifest, type MediaEntry, type MediaManifest } from '../../lib/media/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import type { Backend } from '../../lib/github/backend.js';
import { runtime as baseRuntime, postsConcept, contentEvent, backend } from './_content-harness.js';

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_PATH = 'src/content/.cairn/media.json';
const ID = '2026-05-hi';
const ENTRY_PATH = `src/content/posts/${ID}.md`;
const BRANCH = `cairn/posts/${ID}`;
const OTHER_ID = '2026-05-other';
const OTHER_PATH = `src/content/posts/${OTHER_ID}.md`;
const OTHER_BRANCH = `cairn/posts/${OTHER_ID}`;
const PENDING_MD = '---\ntitle: Hi\ndate: 2026-05-01\n---\npending body';
const CALM_CONFLICT = 'Your edits are saved. Publish again.';

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
    concepts: [postsConcept({ fields: [{ type: 'text', name: 'title', label: 'Title', required: true }], validate: () => ({ ok: true as const, data: { title: 'Hi' } }) })],
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: MEDIA_PATH,
    resolvedAssets: MEDIA_ON,
  });
}

const HASH_A = '0000000000000aaa';
const HASH_B = '0000000000000bbb';
const HASH_NEW = '0000000000000ddd';

function mediaEntry(hash: string, slug: string): MediaEntry {
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
  };
}

function mediaManifest(...entries: MediaEntry[]): string {
  const manifest: MediaManifest = {};
  for (const e of entries) manifest[e.hash] = e;
  return serializeMediaManifest(manifest);
}

function row(id: string): ManifestEntry {
  return { concept: 'posts', id, permalink: `/posts/${id}`, title: id, date: '2026-05-01', draft: false, links: [], mediaRefs: [] };
}

/** Main holds two library assets and an index with no rows; the entry is held on its branch. */
function repo(extraBranches: Record<string, Record<string, string>> = {}): GithubDouble {
  return new GithubDouble({
    main: {
      [MEDIA_PATH]: mediaManifest(mediaEntry(HASH_A, 'photo'), mediaEntry(HASH_B, 'other')),
      [MANIFEST_PATH]: formatManifest({ version: 1, entries: [] }),
    },
    [BRANCH]: { [ENTRY_PATH]: PENDING_MD },
    ...extraBranches,
  });
}

function publishEvent(form: Record<string, string> = {}) {
  return contentEvent({ url: `https://t.example/admin/posts/${ID}`, params: { concept: 'posts', id: ID }, form: { title: 'Hi', body: 'typed text', ...form }, env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } });
}

function listEvent(eventBackend?: Backend) {
  return contentEvent({ url: 'https://t.example/admin/posts', params: { concept: 'posts' }, form: {}, eventBackend });
}

async function redirectedTo(action: Promise<unknown>): Promise<string> {
  try {
    await action;
  } catch (e) {
    return (e as { location: string }).location;
  }
  throw new Error('expected a redirect');
}

function mediaOnMain(gh: GithubDouble): MediaManifest {
  return parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!));
}

/** A backend whose default branch has no readable head and which records every commit target. */
function headless(): { backend: Backend; commits: string[] } {
  const commits: string[] = [];
  return {
    commits,
    backend: {
      ...backend,
      branchHead: (branch) => (branch === 'main' ? Promise.resolve(null) : backend.branchHead(branch)),
      commit: (branch, ...rest) => {
        commits.push(branch);
        return backend.commit(branch, ...rest);
      },
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('publish head guard', () => {
  it('keeps a Library delete that lands after the media.json read, and answers the calm conflict', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    const fired = injectAfterFirstRead(MEDIA_PATH, () => gh.commit('main', MEDIA_PATH, mediaManifest(mediaEntry(HASH_A, 'photo'))));

    const result = (await createContentRoutes({ runtime: runtime() }).publishAction(
      publishEvent({ media: JSON.stringify([mediaEntry(HASH_NEW, 'fresh')]) }),
    )) as unknown as { status: number; data: { error: string; body: string } };

    expect(fired()).toBe(true);
    expect(result.status).toBe(409);
    expect(result.data.error).toBe(CALM_CONFLICT);
    expect(result.data.body).toBe('typed text');
    // The delete stays deleted and the stale snapshot never landed.
    expect(mediaOnMain(gh)[HASH_B]).toBeUndefined();
    expect(mediaOnMain(gh)[HASH_NEW]).toBeUndefined();
    expect(gh.read('main', ENTRY_PATH)).toBeNull();
    // The entry stays held, with the posted text, so a retry is one click.
    expect(gh.branches.has(BRANCH)).toBe(true);
    expect(gh.read(BRANCH, ENTRY_PATH)).toContain('typed text');
  });

  it('keeps a commit that lands after the index.json read when no media is posted', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    const concurrent = formatManifest({ version: 1, entries: [row('2026-05-concurrent')] });
    const fired = injectAfterFirstRead(MANIFEST_PATH, () => gh.commit('main', MANIFEST_PATH, concurrent));

    const result = (await createContentRoutes({ runtime: runtime() }).publishAction(publishEvent())) as unknown as { status: number; data: { error: string } };

    expect(fired()).toBe(true);
    expect(result.status).toBe(409);
    expect(result.data.error).toBe(CALM_CONFLICT);
    expect(gh.read('main', MANIFEST_PATH)).toBe(concurrent);
    expect(gh.read('main', ENTRY_PATH)).toBeNull();
    expect(gh.branches.has(BRANCH)).toBe(true);
  });

  it('refuses with the calm conflict and commits nothing to main when the default branch has no head', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    const headlessBackend = headless();

    const result = (await createContentRoutes({ runtime: runtime() }).publishAction(
      contentEvent({
        url: `https://t.example/admin/posts/${ID}`,
        params: { concept: 'posts', id: ID },
        form: { title: 'Hi', body: 'typed text' },
        env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' },
        eventBackend: headlessBackend.backend,
      }),
    )) as unknown as { status: number; data: { error: string } };

    expect(result.status).toBe(409);
    expect(result.data.error).toBe(CALM_CONFLICT);
    // The branch holds the edits (the message is true); nothing reached the default branch.
    expect(headlessBackend.commits).not.toContain('main');
    expect(gh.read('main', ENTRY_PATH)).toBeNull();
    expect(gh.read(BRANCH, ENTRY_PATH)).toContain('typed text');
  });

  it('reads no default-branch head for a save, which commits nothing to main', async () => {
    const gh = repo();
    gh.install();
    const reads: string[] = [];
    const spy: Backend = {
      ...backend,
      branchHead: (branch) => {
        reads.push(branch);
        return backend.branchHead(branch);
      },
    };

    await redirectedTo(
      createContentRoutes({ runtime: runtime() }).saveAction(
        contentEvent({
          url: `https://t.example/admin/posts/${ID}`,
          params: { concept: 'posts', id: ID },
          form: { title: 'Hi', body: 'b' },
          env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' },
          eventBackend: spy,
        }),
      ),
    );

    expect(reads).not.toContain('main');
  });
});

describe('publish-all head guard', () => {
  it('keeps a commit that lands after the index.json read and bounces to the list with the conflict code', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo({ [OTHER_BRANCH]: { [OTHER_PATH]: PENDING_MD } });
    gh.install();
    const concurrent = formatManifest({ version: 1, entries: [row('2026-05-concurrent')] });
    const fired = injectAfterFirstRead(MANIFEST_PATH, () => gh.commit('main', MANIFEST_PATH, concurrent));

    const location = await redirectedTo(createContentRoutes({ runtime: runtime() }).publishAllAction(listEvent()));

    expect(fired()).toBe(true);
    expect(location).toBe('/admin/posts?error=publish_conflict');
    expect(gh.read('main', MANIFEST_PATH)).toBe(concurrent);
    expect(gh.read('main', ENTRY_PATH)).toBeNull();
    expect(gh.read('main', OTHER_PATH)).toBeNull();
    // Every entry stays held on its branch, so the retry is one click.
    expect(gh.branches.has(BRANCH)).toBe(true);
    expect(gh.branches.has(OTHER_BRANCH)).toBe(true);
  });

  it('refuses with the conflict code and commits nothing when the default branch has no head', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = repo();
    gh.install();
    const headlessBackend = headless();

    const location = await redirectedTo(createContentRoutes({ runtime: runtime() }).publishAllAction(listEvent(headlessBackend.backend)));

    expect(location).toBe('/admin/posts?error=publish_conflict');
    expect(headlessBackend.commits).toEqual([]);
    expect(gh.read('main', ENTRY_PATH)).toBeNull();
    expect(gh.branches.has(BRANCH)).toBe(true);
  });
});
