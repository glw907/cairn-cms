// Task 6: the media alt-propagation preview and apply actions. The preview is the display-only fetch
// action (the 2a transport: CSRF via the X-Cairn-CSRF header, a JSON request body, a plain return
// that becomes a 200 ActionResult, committing nothing). It reports every placement of the asset hash
// bucketed three ways: an empty alt that will be filled, a customized alt left as-is unless the
// editor opts in, and a decorative hero that is never touched. The apply is the atomic form action:
// it re-derives the plan from a FRESH read, fills empty alts (and, on the `overwrite` opt-in,
// customized alts too) with the asset's default alt, and commits ONLY the entries that actually
// changed in ONE commit. Unlike replace, alt fill has NO typed-slug gate (it is reversible and
// frequent), it never writes the media manifest (the default alt is read from media.json, not changed
// there), it never touches a decorative hero, and a run that changes nothing is a no-op success that
// commits nothing and still redirects.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { createContentRoutes } from '../../lib/sveltekit/content-routes.js';
import type {
  MediaAltPreviewPlan,
  MediaAltPropagateFailure,
} from '../../lib/sveltekit/content-routes.js';
import { serializeManifest, type ManifestEntry } from '../../lib/content/manifest.js';
import { serializeMediaManifest, type MediaEntry, type MediaManifest } from '../../lib/media/manifest.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';

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
    ...over,
  };
}

const deps = { mintToken: () => Promise.resolve('test-token') };

const HASH = '0000000000000aaa';
const OTHER_HASH = '0000000000000ccc';
const DEFAULT_ALT = 'A sunset over the bay';
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

/** A body image with an EMPTY alt referencing the hash. */
function emptyAltBody(slug: string, hash: string, title: string): string {
  return `---\ntitle: ${title}\n---\n\n![](media:${slug}.${hash})\n`;
}

/** A body image with a CUSTOM (non-empty) alt referencing the hash. */
function customAltBody(slug: string, hash: string, title: string, alt: string): string {
  return `---\ntitle: ${title}\n---\n\n![${alt}](media:${slug}.${hash})\n`;
}

/** A decorative hero in the frontmatter (block-style mapping), referencing the hash. */
function decorativeHeroBody(slug: string, hash: string, title: string): string {
  return `---\ntitle: ${title}\nimage:\n  src: media:${slug}.${hash}\n  alt: ''\n  decorative: true\n---\n\nBody text.\n`;
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
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    cookies: cookieJar('cookieCsrf' in opts ? opts.cookieCsrf : CSRF),
  };
}

/** The apply event: a FormData POST. `overwrite` is the opt-in flag; alt fill has no confirmSlug. */
function applyEvent(fields: { hash?: string; overwrite?: string; confirmSlug?: string }) {
  const url = new URL('https://t.example/admin/media');
  const form = new FormData();
  if (fields.hash !== undefined) form.set('hash', fields.hash);
  if (fields.overwrite !== undefined) form.set('overwrite', fields.overwrite);
  if (fields.confirmSlug !== undefined) form.set('confirmSlug', fields.confirmSlug);
  return {
    url,
    params: {},
    request: new Request(url, { method: 'POST', body: form }),
    locals: { editor: { email: 'ed@t', displayName: 'Ed Editor', role: 'editor' as const } },
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

/** A repo whose main references the asset three ways (empty-alt body, custom-alt body, decorative
 *  hero), plus an open branch that also references it (the report-only delta). */
function mixedRepo() {
  return new GithubDouble({
    main: {
      [MEDIA_PATH]: mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })),
      [MANIFEST_PATH]: contentManifest([
        postEntry('2026-05-empty', 'Empty Alt', [HASH]),
        postEntry('2026-05-custom', 'Custom Alt', [HASH]),
        postEntry('2026-05-hero', 'Decorative Hero', [HASH]),
        postEntry('2026-05-other', 'Other Asset', [OTHER_HASH]),
      ]),
      'src/content/posts/2026-05-empty.md': emptyAltBody('sunset', HASH, 'Empty Alt'),
      'src/content/posts/2026-05-custom.md': customAltBody('sunset', HASH, 'Custom Alt', 'A hand alt'),
      'src/content/posts/2026-05-hero.md': decorativeHeroBody('sunset', HASH, 'Decorative Hero'),
      'src/content/posts/2026-05-other.md': emptyAltBody('other', OTHER_HASH, 'Other Asset'),
    },
    'cairn/posts/2026-05-draft': {
      'src/content/posts/2026-05-draft.md': emptyAltBody('sunset', HASH, 'Draft'),
    },
  });
}

describe('mediaAltPreview', () => {
  it('returns the three buckets, their counts, and the per-entry placements and titles', async () => {
    const gh = mixedRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = (await routes.mediaAltPreview(
      previewEvent({ hash: HASH }) as never,
    )) as MediaAltPreviewPlan;

    // One empty-alt body (will-fill), one custom-alt body (customized), one decorative hero (skipped).
    expect(result.counts).toEqual({ willFill: 1, customized: 1, decorativeSkipped: 1 });

    const byId = Object.fromEntries(result.entries.map((e) => [e.id, e]));
    // The OTHER_HASH entry is excluded; the three referencing the target hash are planned.
    expect(Object.keys(byId).sort()).toEqual(['2026-05-custom', '2026-05-empty', '2026-05-hero']);
    expect(byId['2026-05-other']).toBeUndefined();

    // The empty-alt body: a will-fill placement whose `after` is the default alt.
    expect(byId['2026-05-empty'].title).toBe('Empty Alt');
    expect(byId['2026-05-empty'].permalink).toBe('/posts/2026-05-empty');
    expect(byId['2026-05-empty'].placements).toHaveLength(1);
    expect(byId['2026-05-empty'].placements[0]).toMatchObject({
      kind: 'body', bucket: 'will-fill', before: '', after: DEFAULT_ALT,
    });

    // The custom-alt body: a customized placement left unchanged in the preview (after === before).
    expect(byId['2026-05-custom'].placements[0]).toMatchObject({
      kind: 'body', bucket: 'customized', before: 'A hand alt', after: 'A hand alt',
    });

    // The decorative hero: a decorative-skipped placement, never changed (after === before).
    expect(byId['2026-05-hero'].placements[0]).toMatchObject({
      kind: 'hero', bucket: 'decorative-skipped', before: '', after: '',
    });

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
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaAltPreview(
      previewEvent({ hash: HASH }, { csrf: 'wrong' }) as never,
    );
    expect(result).toMatchObject({ status: 403 });
    const data = (result as { data: MediaAltPropagateFailure }).data;
    expect(data.error).toBe('csrf');
    expect(commitCount(gh)).toBe(0);
  });

  it('refuses a malformed hash with fail(400)', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaAltPreview(
      previewEvent({ hash: 'not-a-hash' }) as never,
    );
    expect(result).toMatchObject({ status: 400 });
    const data = (result as { data: MediaAltPropagateFailure }).data;
    expect(data.error).toMatch(/invalid media hash/i);
  });

  it('refuses an unparseable JSON body with fail(400)', async () => {
    const gh = new GithubDouble({
      main: { [MEDIA_PATH]: mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })), [MANIFEST_PATH]: contentManifest([]) },
    });
    gh.install();
    const url = new URL('https://t.example/admin/media');
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.set('x-cairn-csrf', CSRF);
    const event = {
      url,
      params: {},
      request: new Request(url, { method: 'POST', headers, body: '{ not json' }),
      locals: { editor: { email: 'ed@t', displayName: 'Ed', role: 'editor' as const } },
      platform: { env: {} },
      cookies: cookieJar(CSRF),
    };
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaAltPreview(event as never);
    expect(result).toMatchObject({ status: 400 });
  });

  it('returns fail(404) for an asset not committed on main', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaAltPreview(
      // OTHER_HASH is not in media.json: the asset is not committed.
      previewEvent({ hash: OTHER_HASH }) as never,
    );
    expect(result).toMatchObject({ status: 404 });
    const data = (result as { data: MediaAltPropagateFailure }).data;
    expect(data.error).toMatch(/not committed/i);
  });

  it('fails closed with 503 when a strict usage read throws', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })),
        [MANIFEST_PATH]: contentManifest([postEntry('2026-05-empty', 'Empty Alt', [HASH])]),
        'src/content/posts/2026-05-empty.md': emptyAltBody('sunset', HASH, 'Empty Alt'),
      },
      // A flaky branch whose content read will be made to reject, so the strict index throws.
      'cairn/posts/2026-05-flaky': {
        'src/content/posts/2026-05-flaky.md': emptyAltBody('sunset', HASH, 'Flaky'),
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
    const result = await routes.mediaAltPreview(
      previewEvent({ hash: HASH }) as never,
    );
    expect(result).toMatchObject({ status: 503 });
    const data = (result as { data: MediaAltPropagateFailure }).data;
    expect(data.error).toMatch(/could not verify/i);
  });
});

describe('mediaAltApply', () => {
  it('with overwrite:false fills only empty alts in one commit, leaving custom and decorative untouched', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = mixedRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    await expect(
      routes.mediaAltApply(applyEvent({ hash: HASH }) as never),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?altPropagated=1' });

    // Exactly one commit landed on main.
    expect(commitCount(gh)).toBe(1);
    // The empty-alt body now carries the default alt.
    expect(gh.read('main', 'src/content/posts/2026-05-empty.md')).toBe(
      emptyAltBody('sunset', HASH, 'Empty Alt').replace('![]', `![${DEFAULT_ALT}]`),
    );
    // The custom-alt body is byte-unchanged.
    expect(gh.read('main', 'src/content/posts/2026-05-custom.md')).toBe(
      customAltBody('sunset', HASH, 'Custom Alt', 'A hand alt'),
    );
    // The decorative hero is byte-unchanged.
    expect(gh.read('main', 'src/content/posts/2026-05-hero.md')).toBe(
      decorativeHeroBody('sunset', HASH, 'Decorative Hero'),
    );
    // media.json is NOT rewritten: the default alt is read from it, never changed there.
    expect(gh.read('main', MEDIA_PATH)).toBe(mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })));
  });

  it('with overwrite:true also overwrites the custom alt but still never touches the decorative hero', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = mixedRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    await expect(
      routes.mediaAltApply(applyEvent({ hash: HASH, overwrite: 'on' }) as never),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?altPropagated=1' });

    expect(commitCount(gh)).toBe(1);
    // Both the empty-alt and the custom-alt bodies now carry the default alt.
    expect(gh.read('main', 'src/content/posts/2026-05-empty.md')).toBe(
      emptyAltBody('sunset', HASH, 'Empty Alt').replace('![]', `![${DEFAULT_ALT}]`),
    );
    expect(gh.read('main', 'src/content/posts/2026-05-custom.md')).toBe(
      customAltBody('sunset', HASH, 'Custom Alt', DEFAULT_ALT),
    );
    // The decorative hero is STILL byte-unchanged, regardless of overwrite.
    expect(gh.read('main', 'src/content/posts/2026-05-hero.md')).toBe(
      decorativeHeroBody('sunset', HASH, 'Decorative Hero'),
    );
  });

  it('accepts overwrite:true as the literal string "true" as well as "on"', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = mixedRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    await expect(
      routes.mediaAltApply(applyEvent({ hash: HASH, overwrite: 'true' }) as never),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?altPropagated=1' });
    // The custom alt is overwritten, proving "true" toggled the opt-in.
    expect(gh.read('main', 'src/content/posts/2026-05-custom.md')).toBe(
      customAltBody('sunset', HASH, 'Custom Alt', DEFAULT_ALT),
    );
  });

  it('applies with no confirmSlug field (no typed-slug gate, unlike replace)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = mixedRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    // No confirmSlug at all: the apply still fills the empty alt and commits.
    await expect(
      routes.mediaAltApply(applyEvent({ hash: HASH }) as never),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?altPropagated=1' });
    expect(commitCount(gh)).toBe(1);
    expect(gh.read('main', 'src/content/posts/2026-05-empty.md')).toContain(`![${DEFAULT_ALT}]`);
  });

  it('is a no-op success when nothing changes: no commit, still redirects', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Every referencing alt is already non-empty (a custom-alt body) plus a decorative hero, with
    // overwrite:false. Nothing changes, so no commit lands and the apply still redirects.
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })),
        [MANIFEST_PATH]: contentManifest([
          postEntry('2026-05-custom', 'Custom Alt', [HASH]),
          postEntry('2026-05-hero', 'Decorative Hero', [HASH]),
        ]),
        'src/content/posts/2026-05-custom.md': customAltBody('sunset', HASH, 'Custom Alt', 'A hand alt'),
        'src/content/posts/2026-05-hero.md': decorativeHeroBody('sunset', HASH, 'Decorative Hero'),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    await expect(
      routes.mediaAltApply(applyEvent({ hash: HASH }) as never),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?altPropagated=1' });
    // NO commit landed.
    expect(commitCount(gh)).toBe(0);
    // The bodies are untouched.
    expect(gh.read('main', 'src/content/posts/2026-05-custom.md')).toBe(
      customAltBody('sunset', HASH, 'Custom Alt', 'A hand alt'),
    );
  });

  it('fails closed with 503 and commits nothing when a strict usage read throws', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })),
        [MANIFEST_PATH]: contentManifest([postEntry('2026-05-empty', 'Empty Alt', [HASH])]),
        'src/content/posts/2026-05-empty.md': emptyAltBody('sunset', HASH, 'Empty Alt'),
      },
      'cairn/posts/2026-05-flaky': {
        'src/content/posts/2026-05-flaky.md': emptyAltBody('sunset', HASH, 'Flaky'),
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
    const result = await routes.mediaAltApply(
      applyEvent({ hash: HASH }) as never,
    );
    expect(result).toMatchObject({ status: 503 });
    const data = (result as { data: MediaAltPropagateFailure }).data;
    expect(data.error).toMatch(/could not verify/i);
    // Nothing committed: the body is untouched.
    expect(commitCount(gh)).toBe(0);
    expect(gh.read('main', 'src/content/posts/2026-05-empty.md')).toBe(emptyAltBody('sunset', HASH, 'Empty Alt'));
  });

  it('returns fail(404) for an asset not committed on main, committing nothing', async () => {
    const gh = new GithubDouble({
      main: {
        [MEDIA_PATH]: mediaManifest(mediaEntry(HASH, 'sunset', { alt: DEFAULT_ALT })),
        [MANIFEST_PATH]: contentManifest([]),
      },
    });
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    const result = await routes.mediaAltApply(
      applyEvent({ hash: OTHER_HASH }) as never,
    );
    expect(result).toMatchObject({ status: 404 });
    const data = (result as { data: MediaAltPropagateFailure }).data;
    expect(data.error).toMatch(/not committed/i);
    expect(commitCount(gh)).toBe(0);
  });

  it('throws error(400) on a malformed hash', async () => {
    const gh = mixedRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);
    await expect(
      routes.mediaAltApply(applyEvent({ hash: 'bad' }) as never),
    ).rejects.toMatchObject({ status: 400 });
    expect(commitCount(gh)).toBe(0);
  });

  it('returns fail(503) when media is disabled, committing nothing', async () => {
    const gh = mixedRepo();
    gh.install();
    const routes = createContentRoutes(runtime({ resolvedAssets: { ...MEDIA_ON, enabled: false } }), deps);
    const result = await routes.mediaAltApply(
      applyEvent({ hash: HASH }) as never,
    );
    expect(result).toMatchObject({ status: 503 });
    const data = (result as { data: MediaAltPropagateFailure }).data;
    expect(data.error).toMatch(/not enabled/i);
    expect(commitCount(gh)).toBe(0);
  });

  it('re-derives the plan from a FRESH read, not the stale preview state', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const gh = mixedRepo();
    gh.install();
    const routes = createContentRoutes(runtime(), deps);

    // Compute a preview to mirror the real flow (the client previews, then applies).
    await routes.mediaAltPreview(previewEvent({ hash: HASH }) as never);

    // Now mutate main out of band: the custom-alt entry's body gains a second, EMPTY-alt reference to
    // the asset. A stale-plan apply (one that reused the preview's markdown) would miss this fill.
    gh.commit(
      'main',
      'src/content/posts/2026-05-custom.md',
      `---\ntitle: Custom Alt\n---\n\n![A hand alt](media:sunset.${HASH})\n\n![](media:sunset.${HASH})\n`,
    );

    await expect(
      routes.mediaAltApply(applyEvent({ hash: HASH }) as never),
    ).rejects.toMatchObject({ status: 303, location: '/admin/media?altPropagated=1' });

    const committed = gh.read('main', 'src/content/posts/2026-05-custom.md')!;
    // The custom alt is kept (overwrite:false) and the fresh empty alt is filled.
    expect(committed).toBe(
      `---\ntitle: Custom Alt\n---\n\n![A hand alt](media:sunset.${HASH})\n\n![${DEFAULT_ALT}](media:sunset.${HASH})\n`,
    );
  });
});
