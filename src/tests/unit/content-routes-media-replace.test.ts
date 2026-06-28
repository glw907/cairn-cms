// Task 5: the media-replace preview and apply actions. The preview is the display-only fetch action
// (the 2a transport: CSRF via the X-Cairn-CSRF header, a JSON request body, a plain return that
// becomes a 200 ActionResult, committing nothing). The apply is the atomic form action: it
// re-derives the plan from a FRESH read (never a client-passed plan), gates EVERY replace behind a
// typed-slug confirm (unlike delete, which only gates an in-use asset), fails closed on a strict
// usage failure, and commits the rewritten entries plus the new media.json row in ONE commit. The
// old asset's row stays (decision 4: the old bytes are kept), and apply never touches R2 (the new
// bytes were already stored put-first by uploadAction).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type {
  MediaReplacePreviewPlan,
  MediaReplaceFailure,
} from '../../lib/sveltekit/content-routes.js';
import { serializeManifest, type ManifestEntry } from '../../lib/content/manifest.js';
import { serializeMediaManifest, parseMediaManifest, type MediaEntry, type MediaManifest } from '../../lib/media/manifest.js';
import { mediaToken } from '../../lib/media/reference.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';
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

function runtime(over: Partial<CairnRuntime> = {}): CairnRuntime {
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
    ...over,
  };
}

const deps = { backend: makeGithubBackend(REPO, () => Promise.resolve('test-token'))};

const OLD_HASH = '0000000000000aaa';
const NEW_HASH = '0000000000000bbb';
const OTHER_HASH = '0000000000000ccc';
const CSRF = 'csrf-token-value-0123456789abcdef';

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

/** A content manifest with the given entries (each carries its mediaRefs, title, and permalink). */
function contentManifest(entries: ManifestEntry[]): string {
  return serializeManifest({ version: 1, entries });
}

function postEntry(id: string, title: string, mediaRefs: string[]): ManifestEntry {
  return { concept: 'posts', id, permalink: `/posts/${id}`, title, date: '2026-05-01', draft: false, links: [], mediaRefs };
}

/** The body markdown referencing a hash through a `media:slug.hash` body image. */
function bodyWith(slug: string, hash: string, title: string): string {
  return `---\ntitle: ${title}\n---\n\n![a photo](media:${slug}.${hash})\n`;
}

/** A fake cookie jar that returns the csrf cookie under the https `__Host-` name. */
function cookieJar(csrf: string | undefined): CookieJar {
  return {
    get: (name) => (name === '__Host-cairn_csrf' ? csrf : undefined),
    set: () => {},
    delete: () => {},
  };
}

/** The preview event: a JSON request body, the X-Cairn-CSRF header, and a matching cookie jar. */
function previewEvent(
  payload: unknown,
  opts: { csrf?: string; cookieCsrf?: string | undefined } = {},
) {
  const url = new URL('https://t.example/admin/media');
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.set('x-cairn-csrf', opts.csrf ?? CSRF);
  return {
    url,
    params: {},
    request: new Request(url, { method: 'POST', headers, body: JSON.stringify(payload) }),
    locals: { principal: { email: 'ed@t', displayName: 'Ed Editor', scopes: ['admin:editor'], tier: 'admin' } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    cookies: cookieJar('cookieCsrf' in opts ? opts.cookieCsrf : CSRF),
  };
}

/** The apply event: a FormData POST. The `media` field carries the new asset's optimistic record as
 *  JSON (the untrusted-record validator parses it). requireSession reads locals.editor. */
function applyEvent(fields: { oldHash?: string; newHash?: string; confirmSlug?: string; media?: MediaEntry[] | string }) {
  const url = new URL('https://t.example/admin/media');
  const form = new FormData();
  if (fields.oldHash !== undefined) form.set('oldHash', fields.oldHash);
  if (fields.newHash !== undefined) form.set('newHash', fields.newHash);
  if (fields.confirmSlug !== undefined) form.set('confirmSlug', fields.confirmSlug);
  if (fields.media !== undefined) {
    form.set('media', typeof fields.media === 'string' ? fields.media : JSON.stringify(fields.media));
  }
  return {
    url,
    params: {},
    request: new Request(url, { method: 'POST', body: form }),
    locals: { principal: { email: 'ed@t', displayName: 'Ed Editor', scopes: ['admin:editor'], tier: 'admin' } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x', MEDIA_BUCKET: {} } },
  };
}

/** Count the ref-PATCH-to-main calls a GithubDouble recorded: the landing commits. */
function commitCount(gh: GithubDouble): number {
  return gh.calls.filter(
    (c) => c.method === 'PATCH' && /\/git\/refs\/heads\/main$/.test(new URL(c.url).pathname),
  ).length;
}

afterEach(() => vi.restoreAllMocks());

describe('mediaReplacePreview', () => {
  it('returns the plan with the affected entries, titles, placements, and the branch delta', async () => {
    const newToken = mediaToken({ slug: 'old-photo', hash: NEW_HASH });
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(OLD_HASH, 'old-photo')),
        [MANIFEST_PATH]: contentManifest([
          postEntry('2026-05-one', 'Entry One', [OLD_HASH]),
          postEntry('2026-05-two', 'Entry Two', [OLD_HASH]),
          postEntry('2026-05-three', 'Entry Three', [OTHER_HASH]),
        ]),
        'src/content/posts/2026-05-one.md': bodyWith('old-photo', OLD_HASH, 'Entry One'),
        'src/content/posts/2026-05-two.md': bodyWith('old-photo', OLD_HASH, 'Entry Two'),
        'src/content/posts/2026-05-three.md': bodyWith('other', OTHER_HASH, 'Entry Three'),
      },
      // An open edit branch that also references the old asset: the report-only branch delta.
      'cairn/posts/2026-05-draft': {
        'src/content/posts/2026-05-draft.md': bodyWith('old-photo', OLD_HASH, 'Draft'),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = (await routes.mediaReplacePreview(
      previewEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, slug: 'old-photo' }) as never,
    )) as MediaReplacePreviewPlan;

    expect(result.affectedCount).toBe(2);
    const byId = Object.fromEntries(result.entries.map((e) => [e.id, e]));
    expect(Object.keys(byId).sort()).toEqual(['2026-05-one', '2026-05-two']);
    expect(byId['2026-05-one'].title).toBe('Entry One');
    expect(byId['2026-05-one'].permalink).toBe('/posts/2026-05-one');
    expect(byId['2026-05-one'].placements).toHaveLength(1);
    expect(byId['2026-05-one'].placements[0]).toMatchObject({ kind: 'body', after: newToken });
    // The OTHER_HASH entry is excluded; only the two referencing the old hash are planned.
    expect(byId['2026-05-three']).toBeUndefined();
    // The branch delta lists the open branch that references the same bytes.
    expect(result.branchDelta).toHaveLength(1);
    expect(result.branchDelta[0].branch).toBe('cairn/posts/2026-05-draft');
    expect(result.branchDelta[0].entries).toEqual([{ concept: 'posts', id: '2026-05-draft' }]);
    // The preview commits nothing.
    expect(commitCount(gh)).toBe(0);
  });

  it('refuses a missing or mismatched CSRF header with fail(403)', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(OLD_HASH, 'old-photo')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaReplacePreview(
      previewEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, slug: 'old-photo' }, { csrf: 'wrong' }) as never,
    );
    expect(result).toMatchObject({ status: 403 });
    const data = (result as { data: MediaReplaceFailure }).data;
    expect(data.error).toBe('csrf');
    expect(commitCount(gh)).toBe(0);
  });

  it('refuses a malformed hash with fail(400)', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(OLD_HASH, 'old-photo')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaReplacePreview(
      previewEvent({ oldHash: 'not-a-hash', newHash: NEW_HASH, slug: 'x' }) as never,
    );
    expect(result).toMatchObject({ status: 400 });
  });

  it('refuses an unparseable JSON body with fail(400)', async () => {
    const gh = new GithubDouble({
      main: { [MEDIA_PATH]: mediaManifest(mediaEntry(OLD_HASH, 'old-photo')), [MANIFEST_PATH]: contentManifest([]) },
    });
    gh.install();
    const url = new URL('https://t.example/admin/media');
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.set('x-cairn-csrf', CSRF);
    const event = {
      url,
      params: {},
      request: new Request(url, { method: 'POST', headers, body: '{ not json' }),
      locals: { principal: { email: 'ed@t', displayName: 'Ed', scopes: ['admin:editor'], tier: 'admin' } },
      platform: { env: {} },
      cookies: cookieJar(CSRF),
    };
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaReplacePreview(event as never);
    expect(result).toMatchObject({ status: 400 });
  });

  it('fails closed with 503 when a strict usage read throws', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(OLD_HASH, 'old-photo')),
        [MANIFEST_PATH]: contentManifest([postEntry('2026-05-one', 'Entry One', [OLD_HASH])]),
        'src/content/posts/2026-05-one.md': bodyWith('old-photo', OLD_HASH, 'Entry One'),
      },
      // A flaky branch whose content read will be made to reject, so the strict index throws.
      'cairn/posts/2026-05-flaky': {
        'src/content/posts/2026-05-flaky.md': bodyWith('old-photo', OLD_HASH, 'Flaky'),
      },
    });
    gh.install();
    const inner = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('2026-05-flaky')) return Promise.reject(new Error('transient'));
      return inner(input, init);
    }));
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaReplacePreview(
      previewEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, slug: 'old-photo' }) as never,
    );
    expect(result).toMatchObject({ status: 503 });
    const data = (result as { data: MediaReplaceFailure }).data;
    expect(data.error).toMatch(/could not verify/i);
    expect(data.hash).toBe(OLD_HASH);
  });
});

describe('mediaReplaceApply', () => {
  function freshRepo() {
    return new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(OLD_HASH, 'old-photo')),
        [MANIFEST_PATH]: contentManifest([
          postEntry('2026-05-one', 'Entry One', [OLD_HASH]),
          postEntry('2026-05-two', 'Entry Two', [OLD_HASH]),
        ]),
        'src/content/posts/2026-05-one.md': bodyWith('old-photo', OLD_HASH, 'Entry One'),
        'src/content/posts/2026-05-two.md': bodyWith('old-photo', OLD_HASH, 'Entry Two'),
      },
    });
  }

  it('commits one multi-file change repointing every entry plus the new row, and keeps the old row', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = freshRepo();
    gh.install();
    const newToken = mediaToken({ slug: 'old-photo', hash: NEW_HASH });
    const record = mediaEntry(NEW_HASH, 'new-photo');
    const routes = createContentRoutes(runtime(), deps);
    await expect(
      routes.mediaReplaceApply(
        applyEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, confirmSlug: 'old-photo', media: [record] }) as never,
      ),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?replaced=1' });

    // Exactly one commit landed on main.
    expect(commitCount(gh)).toBe(1);
    // Both entries' bodies now carry the new token.
    expect(gh.read('main', 'src/content/posts/2026-05-one.md')).toContain(newToken);
    expect(gh.read('main', 'src/content/posts/2026-05-two.md')).toContain(newToken);
    expect(gh.read('main', 'src/content/posts/2026-05-one.md')).not.toContain(`media:old-photo.${OLD_HASH}`);
    // media.json now carries BOTH rows: the new one added and the old one kept (the old bytes survive).
    const manifest = parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!));
    expect(manifest[NEW_HASH]).toBeDefined();
    expect(manifest[NEW_HASH].slug).toBe('new-photo');
    expect(manifest[OLD_HASH]).toBeDefined();
  });

  it('refuses without the typed slug (fail 409) and lands no commit', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = freshRepo();
    gh.install();
    const record = mediaEntry(NEW_HASH, 'new-photo');
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaReplaceApply(
      applyEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, confirmSlug: 'wrong', media: [record] }) as never,
    );
    expect(result).toMatchObject({ status: 409 });
    const data = (result as { data: MediaReplaceFailure }).data;
    expect(data.foundIn).toBe(2);
    expect(data.error).toMatch(/type old-photo to confirm/i);
    // Nothing committed: the bodies and media.json are unchanged.
    expect(commitCount(gh)).toBe(0);
    expect(gh.read('main', 'src/content/posts/2026-05-one.md')).toContain(`media:old-photo.${OLD_HASH}`);
    expect(parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!))[NEW_HASH]).toBeUndefined();
  });

  it('refuses an empty typed slug (fail 409), the same as a wrong slug', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gh = freshRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaReplaceApply(
      applyEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, confirmSlug: '', media: [mediaEntry(NEW_HASH, 'new-photo')] }) as never,
    );
    expect(result).toMatchObject({ status: 409 });
    expect(commitCount(gh)).toBe(0);
  });

  it('gates a replace even when the asset is referenced nowhere (always-required confirm)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // The old asset is committed but referenced by no entry, so affectedCount is 0. Replace still
    // demands the typed slug (unlike delete, which only gates an in-use asset).
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(OLD_HASH, 'old-photo')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaReplaceApply(
      applyEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, confirmSlug: 'wrong', media: [mediaEntry(NEW_HASH, 'new-photo')] }) as never,
    );
    expect(result).toMatchObject({ status: 409 });
    const data = (result as { data: MediaReplaceFailure }).data;
    expect(data.foundIn).toBe(0);
    expect(commitCount(gh)).toBe(0);
  });

  it('fails closed with 503 and commits nothing when a strict usage read throws', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(OLD_HASH, 'old-photo')),
        [MANIFEST_PATH]: contentManifest([postEntry('2026-05-one', 'Entry One', [OLD_HASH])]),
        'src/content/posts/2026-05-one.md': bodyWith('old-photo', OLD_HASH, 'Entry One'),
      },
      'cairn/posts/2026-05-flaky': {
        'src/content/posts/2026-05-flaky.md': bodyWith('old-photo', OLD_HASH, 'Flaky'),
      },
    });
    gh.install();
    const inner = globalThis.fetch;
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('2026-05-flaky')) return Promise.reject(new Error('transient'));
      return inner(input, init);
    }));
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaReplaceApply(
      applyEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, confirmSlug: 'old-photo', media: [mediaEntry(NEW_HASH, 'new-photo')] }) as never,
    );
    expect(result).toMatchObject({ status: 503 });
    const data = (result as { data: MediaReplaceFailure }).data;
    expect(data.error).toMatch(/could not verify/i);
    // Nothing committed: the row survives and the bodies are untouched.
    expect(commitCount(gh)).toBe(0);
    expect(gh.read('main', 'src/content/posts/2026-05-one.md')).toContain(`media:old-photo.${OLD_HASH}`);
  });

  it('returns fail(404) for an asset not committed on main', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(OLD_HASH, 'old-photo')),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaReplaceApply(
      // OTHER_HASH is not in media.json: the asset is not committed.
      applyEvent({ oldHash: OTHER_HASH, newHash: NEW_HASH, confirmSlug: 'x', media: [mediaEntry(NEW_HASH, 'new-photo')] }) as never,
    );
    expect(result).toMatchObject({ status: 404 });
    const data = (result as { data: MediaReplaceFailure }).data;
    expect(data.error).toMatch(/not committed/i);
    expect(commitCount(gh)).toBe(0);
  });

  it('returns fail(400) when the posted replacement record is missing', async () => {
    const gh = freshRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    // The media field carries a record for a DIFFERENT hash, so no row matches newHash.
    const result = await routes.mediaReplaceApply(
      applyEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, confirmSlug: 'old-photo', media: [mediaEntry(OTHER_HASH, 'other')] }) as never,
    );
    expect(result).toMatchObject({ status: 400 });
    const data = (result as { data: MediaReplaceFailure }).data;
    expect(data.error).toMatch(/missing or invalid/i);
    expect(commitCount(gh)).toBe(0);
  });

  it('throws error(400) on a malformed hash', async () => {
    const gh = freshRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    await expect(
      routes.mediaReplaceApply(
        applyEvent({ oldHash: 'bad', newHash: NEW_HASH, confirmSlug: 'old-photo', media: [mediaEntry(NEW_HASH, 'new-photo')] }) as never,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(commitCount(gh)).toBe(0);
  });

  it('returns fail(503) when media is disabled, committing nothing', async () => {
    const gh = freshRepo();
    gh.install();
    const routes = createContentRoutes(runtime({ resolvedAssets: { ...MEDIA_ON, enabled: false } }), deps);
    const result = await routes.mediaReplaceApply(
      applyEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, confirmSlug: 'old-photo', media: [mediaEntry(NEW_HASH, 'new-photo')] }) as never,
    );
    expect(result).toMatchObject({ status: 503 });
    const data = (result as { data: MediaReplaceFailure }).data;
    expect(data.error).toMatch(/not enabled/i);
    expect(commitCount(gh)).toBe(0);
  });

  it('re-derives the plan from a FRESH read, not the stale preview state', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = freshRepo();
    gh.install();
    const newToken = mediaToken({ slug: 'old-photo', hash: NEW_HASH });
    const record = mediaEntry(NEW_HASH, 'new-photo');
    const routes = createContentRoutes(runtime(), deps);

    // Compute a preview to mirror the real flow (the client previews, then applies).
    await routes.mediaReplacePreview(
      previewEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, slug: 'old-photo' }) as never,
    );

    // Now mutate main out of band: entry one's body gains a second reference to the old asset, and a
    // wholly new line. A stale-plan apply (one that reused the preview's markdown) would miss this.
    gh.commit(
      'main',
      'src/content/posts/2026-05-one.md',
      `---\ntitle: Entry One\n---\n\nFresh paragraph.\n\n![a photo](media:old-photo.${OLD_HASH})\n\n![again](media:old-photo.${OLD_HASH})\n`,
    );

    await expect(
      routes.mediaReplaceApply(
        applyEvent({ oldHash: OLD_HASH, newHash: NEW_HASH, confirmSlug: 'old-photo', media: [record] }) as never,
      ),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?replaced=1' });

    const committed = gh.read('main', 'src/content/posts/2026-05-one.md')!;
    // The fresh content (the new paragraph) is preserved and BOTH references are repointed.
    expect(committed).toContain('Fresh paragraph.');
    expect(committed).not.toContain(`media:old-photo.${OLD_HASH}`);
    // Two repointed references, so the new token appears twice.
    expect(committed.split(newToken).length - 1).toBe(2);
  });
});
