// cairn-cms: Task 3b (preview pass, spec part 3, "Public preview for a non-editor"): previewLoad,
// the load a site wires into `/preview/[token]/+page.server.ts`. Driven against the real
// GithubDouble the content-routes cluster already uses, plus the real D1 AUTH_DB the workerd
// integration project provides, since the verification chain reads real rows.
import { env } from 'cloudflare:test';
import { describe, it, expect, expectTypeOf, vi, afterEach, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { GithubDouble } from '../unit/_github-double.js';
import { previewLoad, type PreviewData } from '../../lib/sveltekit/preview.js';
import { mintPreviewToken } from '../../lib/sveltekit/preview.js';
import { insertPreviewToken } from '../../lib/auth/preview-store.js';
import { generateToken, hashToken } from '../../lib/auth/crypto.js';
import { serializeManifest } from '../../lib/content/manifest.js';
import type { ManifestEntry } from '../../lib/content/manifest.js';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import type { EntryData, PublicRoutesConfig } from '../../lib/delivery/public-routes.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import type { MediaEntry } from '../../lib/media/manifest.js';
import { serializeMediaManifest } from '../../lib/media/manifest.js';
import { runtime as baseRuntime, postsConcept as basePostsConcept, contentEvent } from '../unit/_content-harness.js';
import type { CairnRuntime, ConceptDescriptor } from '../../lib/content/types.js';
import { __setBuilding } from '../_app-environment.js';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';

const db = env.AUTH_DB;

const MANIFEST_PATH = 'src/content/.cairn/index.json';
const MEDIA_PATH = 'src/content/.cairn/media.json';
const ID = '2026-08-06-hello';
const ENTRY_PATH = `src/content/posts/${ID}.md`;
const BRANCH = `cairn/posts/${ID}`;
const ORIGIN = 'https://site.example';
const EXPECTED_HEADERS = {
  'x-robots-tag': 'noindex, nofollow',
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};

/** A real (not the harness's always-true) validate: `title` is required, everything else passes through. */
function postsConcept(overrides: Partial<ConceptDescriptor> = {}): ConceptDescriptor {
  return basePostsConcept({
    fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
    validate: (fm) =>
      typeof fm.title === 'string' && fm.title.trim() !== ''
        ? { ok: true, data: fm }
        : { ok: false, errors: { title: 'Title is required' } },
    ...overrides,
  });
}

function runtime(overrides: Partial<CairnRuntime> = {}): CairnRuntime {
  return baseRuntime({
    concepts: [postsConcept()],
    manifestPath: MANIFEST_PATH,
    mediaManifestPath: MEDIA_PATH,
    ...overrides,
  });
}

function publicConfig(overrides: Partial<PublicRoutesConfig> = {}): PublicRoutesConfig {
  return {
    site: createSiteResolver([]),
    // Resolves every `cairn:<concept>/<id>` token in the body against the injected resolver,
    // marking a miss rather than throwing, so the test proves previewLoad wired a non-throwing
    // resolver in without exercising the real markdown pipeline (covered elsewhere).
    render: async ({ body, resolve }) =>
      body.replace(/cairn:([a-z0-9-]+)\/([a-z0-9-]+)/g, (_m, concept: string, id: string) => {
        // previewLoad always substitutes a resolveLink override, so `resolve` is always defined here.
        const url = resolve?.({ concept, id });
        return url ? `[link:${url}]` : '[broken]';
      }),
    origin: ORIGIN,
    siteName: 'Test',
    description: 'Test description.',
    ...overrides,
  };
}

/** The real render pipeline, so a body `media:` token's resolution (or its broken marker) reflects
 *  what composeEntryData actually threads into `render`, not a hand-rolled stand-in. */
function mediaRenderPublicConfig(overrides: Partial<PublicRoutesConfig> = {}): PublicRoutesConfig {
  const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
  return {
    site: createSiteResolver([]),
    render: ({ body, resolve, resolveMedia, resolveFragment }) =>
      renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),
    origin: ORIGIN,
    siteName: 'Test',
    description: 'Test description.',
    ...overrides,
  };
}

function manifestWith(entries: ManifestEntry[]): string {
  return serializeManifest({ version: 1, entries });
}

function row(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return { id: 'sibling', concept: 'posts', title: 'Sibling', permalink: '/posts/sibling', draft: true, links: [], ...overrides };
}

/** Every `preview.rejected` (or any) console record captured while `run` executes. */
async function records(run: () => Promise<unknown>): Promise<Record<string, unknown>[]> {
  const captured: Record<string, unknown>[] = [];
  const grab = (c: unknown[]) => captured.push(c[0] as Record<string, unknown>);
  vi.spyOn(console, 'log').mockImplementation((...c) => grab(c));
  vi.spyOn(console, 'warn').mockImplementation((...c) => grab(c));
  vi.spyOn(console, 'error').mockImplementation((...c) => grab(c));
  try {
    await run();
  } catch {
    // The caller inspects `captured`; a thrown refusal is the expected outcome for most callers.
  }
  return captured;
}

/** Run a handler expected to throw a SvelteKit HTTP error; return its status and body message. */
async function expectNotFound(fn: () => Promise<unknown>): Promise<{ status: number; message: string }> {
  try {
    await fn();
  } catch (e) {
    if (isHttpError(e)) return { status: e.status, message: (e.body as { message: string }).message };
    throw e;
  }
  throw new Error('expected an HTTP error, none thrown');
}

/** A D1Database wrapper counting `.prepare()` calls, to prove the malformed-shape gate reads nothing. */
function countingDb(real: D1Database): { db: D1Database; count(): number } {
  let n = 0;
  const wrapped = new Proxy(real, {
    get(target, prop, receiver) {
      if (prop === 'prepare') n++;
      return Reflect.get(target, prop, receiver);
    },
  });
  return { db: wrapped, count: () => n };
}

/** A driven `/preview/[token]` load event, capturing every `setHeaders` call. */
function loadEvent(token: string, opts: { env?: Record<string, unknown> } = {}) {
  const headers: Record<string, string>[] = [];
  const event = {
    ...contentEvent({
      url: `${ORIGIN}/preview/${token}`,
      params: { token },
      route: '/preview/[token]',
      env: opts.env ?? { AUTH_DB: db },
    }),
    setHeaders: (h: Record<string, string>) => headers.push(h),
  };
  return { event, headers };
}

/** Mint a real, valid token (default TTL) and return its plaintext for the request param. */
async function mintValidToken(concept = 'posts', entryId = ID, editor = 'ed@t'): Promise<string> {
  const { token } = await mintPreviewToken(db, {}, { concept, entryId, editor });
  return token;
}

/** Seed a token row directly, bypassing mintPreviewToken's TTL floor, for an already-expired row. */
async function seedExpiredToken(concept = 'posts', entryId = ID): Promise<string> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  await insertPreviewToken(db, { concept, entryId, editor: 'ed@t', tokenHash, expiresAt: Date.now() - 1000 });
  return token;
}

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM preview_tokens')]);
});

afterEach(() => {
  vi.restoreAllMocks();
  __setBuilding(false);
});

function freshGithub(opts: { branch?: Record<string, string>; main?: Record<string, string> } = {}): GithubDouble {
  const tree: Record<string, Record<string, string>> = { main: { [MANIFEST_PATH]: manifestWith([]), ...opts.main } };
  if (opts.branch) tree[BRANCH] = opts.branch;
  return new GithubDouble(tree);
}

describe('previewLoad: the build-time guard', () => {
  it('throws a descriptive error naming the fix when building is true', async () => {
    __setBuilding(true);
    const { event } = loadEvent('x'.repeat(43));
    await expect(previewLoad(runtime(), publicConfig(), event as never)).rejects.toThrow(/prerender = false/);
  });

  // The build-time guard's dynamic `import('$app/environment')` is wrapped in try/catch so a
  // consumer bundling the /sveltekit barrel with a plain, non-Vite esbuild pass (no SvelteKit
  // plugin to resolve the virtual module) gets a bundle-time-clean build rather than a resolve
  // error. This models that absence directly, rather than only through the esbuild reproduction
  // in dist-sveltekit-app-import-boundary.test.ts, by making the aliased `$app/environment` throw
  // on its next import: previewLoad must fall back to `building = false` and proceed to its
  // ordinary token gate instead of surfacing the "not building" branch's own error.
  it('falls back to building = false and proceeds when $app/environment cannot be imported', async () => {
    vi.doMock('$app/environment', () => {
      throw new Error("Cannot find module '$app/environment'");
    });
    try {
      const { event } = loadEvent('too-short');
      // A malformed token still answers its own ordinary 404, proving the fallback did not
      // short-circuit as "building" and did not itself throw.
      const result = await expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never));
      expect(result.status).toBe(404);
    } finally {
      vi.doUnmock('$app/environment');
    }
  });
});

describe('previewLoad: the malformed-token gate', () => {
  it('answers 404 with no D1 read and no log for a badly-shaped token', async () => {
    const { db: spiedDb, count } = countingDb(db);
    const gh = freshGithub();
    gh.install();
    const { event } = loadEvent('too-short', { env: { AUTH_DB: spiedDb } });
    const captured = await records(async () => {
      await expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never));
    });
    expect(count()).toBe(0);
    expect(captured).toEqual([]);
  });
});

describe('previewLoad: the missing AUTH_DB binding', () => {
  it('answers 503 after a binding-named log, headers still set', async () => {
    const gh = freshGithub();
    gh.install();
    const { event, headers } = loadEvent('x'.repeat(43), { env: {} });
    const captured = await records(async () => {
      try {
        await previewLoad(runtime(), publicConfig(), event as never);
        throw new Error('expected an error');
      } catch (e) {
        expect(isHttpError(e) && e.status).toBe(503);
      }
    });
    const record = captured.find((r) => r.event === 'preview.rejected');
    expect(record).toMatchObject({ reason: 'bindings_missing', binding: 'AUTH_DB' });
    expect(headers).toContainEqual(EXPECTED_HEADERS);
  });
});

describe('previewLoad: the row-verification chain', () => {
  it('answers 404 with reason unknown for a well-shaped but unminted token', async () => {
    const gh = freshGithub();
    gh.install();
    const { event } = loadEvent('y'.repeat(43));
    const captured = await records(() => expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
    expect(captured.find((r) => r.event === 'preview.rejected')).toMatchObject({ reason: 'unknown' });
  });

  it('answers 404 with reason expired for a lapsed token, distinctly from unknown', async () => {
    const gh = freshGithub({ branch: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody' } });
    gh.install();
    const token = await seedExpiredToken();
    const { event } = loadEvent(token);
    const captured = await records(() => expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
    expect(captured.find((r) => r.event === 'preview.rejected')).toMatchObject({ reason: 'expired' });
  });

  it('answers 404 with reason row_invalid for a row naming a concept the runtime no longer declares', async () => {
    const gh = freshGithub();
    gh.install();
    const token = await mintValidToken('ghost-concept');
    const { event } = loadEvent(token);
    const captured = await records(() => expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
    expect(captured.find((r) => r.event === 'preview.rejected')).toMatchObject({ reason: 'row_invalid', concept: 'ghost-concept' });
  });

  it('answers 404 with reason table_missing when the table is absent, and restores it after', async () => {
    const gh = freshGithub();
    gh.install();
    const token = await mintValidToken();
    await db.exec('DROP TABLE preview_tokens');
    try {
      const { event } = loadEvent(token);
      const captured = await records(() => expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
      expect(captured.find((r) => r.event === 'preview.rejected')).toMatchObject({ reason: 'table_missing' });
    } finally {
      await db.exec(
        'CREATE TABLE preview_tokens (token_hash TEXT PRIMARY KEY, concept TEXT NOT NULL, entry_id TEXT NOT NULL, editor TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)',
      );
    }
  });

  it('answers 404 with reason draft_invalid for a draft that fails its concept validator', async () => {
    const gh = freshGithub({ branch: { [ENTRY_PATH]: '---\ndraft: true\n---\nno title here' } });
    gh.install();
    const token = await mintValidToken();
    const { event } = loadEvent(token);
    const captured = await records(() => expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
    expect(captured.find((r) => r.event === 'preview.rejected')).toMatchObject({ reason: 'draft_invalid' });
  });

  it('answers 404 with reason branch_gone when neither the branch nor the main file exists (a discarded new entry)', async () => {
    const gh = freshGithub();
    gh.install();
    const token = await mintValidToken();
    const { event } = loadEvent(token);
    const captured = await records(() => expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
    expect(captured.find((r) => r.event === 'preview.rejected')).toMatchObject({ reason: 'branch_gone' });
  });
});

describe('previewLoad: identical outward refusals', () => {
  it('answers the same status and message across every refusal class', async () => {
    const results: { status: number; message: string }[] = [];

    // malformed shape
    {
      const gh = freshGithub();
      gh.install();
      const { event } = loadEvent('nope');
      results.push(await expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
      vi.restoreAllMocks();
    }
    // unknown
    {
      const gh = freshGithub();
      gh.install();
      const { event } = loadEvent('z'.repeat(43));
      results.push(await expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
      vi.restoreAllMocks();
    }
    // row_invalid
    {
      const gh = freshGithub();
      gh.install();
      const token = await mintValidToken('ghost');
      const { event } = loadEvent(token);
      results.push(await expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
      vi.restoreAllMocks();
    }
    // branch_gone
    {
      const gh = freshGithub();
      gh.install();
      const token = await mintValidToken();
      const { event } = loadEvent(token);
      results.push(await expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never)));
      vi.restoreAllMocks();
    }

    expect(results.every((r) => r.status === 404)).toBe(true);
    const messages = new Set(results.map((r) => r.message));
    expect(messages.size).toBe(1);
  });
});

describe('previewLoad: the draft render', () => {
  it('returns the public shape, headers included, with a dangling link marked and a resolvable one resolved, never throwing', async () => {
    const gh = freshGithub({
      branch: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nSee cairn:posts/sibling and cairn:posts/nowhere.' },
      main: { [MANIFEST_PATH]: manifestWith([row()]) },
    });
    gh.install();
    const token = await mintValidToken();
    const { event, headers } = loadEvent(token);
    const data = (await previewLoad(runtime(), publicConfig(), event as never)) as PreviewData;

    expect(data.preview).toEqual({ state: 'draft', expiresAt: expect.any(String), published: null });
    expect(data.entry.id).toBe(ID);
    expect(data.html).toContain('[link:/posts/sibling]');
    expect(data.html).toContain('[broken]');
    expect(headers).toContainEqual(EXPECTED_HEADERS);
  });

  it('strips canonical, og:url, and jsonLd.url from seo, since a preview must not self-canonicalize onto a not-yet-live URL', async () => {
    const gh = freshGithub({
      branch: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nbody' },
      main: { [MANIFEST_PATH]: manifestWith([]) },
    });
    gh.install();
    const token = await mintValidToken();
    const { event } = loadEvent(token);
    const data = (await previewLoad(runtime(), publicConfig(), event as never)) as PreviewData;

    expect(data.seo.links.find((l) => l.rel === 'canonical')).toBeUndefined();
    expect(data.seo.meta.find((m) => m.property === 'og:url')).toBeUndefined();
    expect(data.seo.jsonLd).not.toHaveProperty('url');
    // The rest of the head survives the strip untouched: this is a targeted removal, not a
    // stand-in for a whole different (impoverished) preview head.
    expect(data.seo.title).toBeTruthy();
    expect(data.seo.meta.find((m) => m.property === 'og:title')).toBeDefined();
  });

  it('resolves media from the branch media.json, not the (stale) default branch copy', async () => {
    const hash = '0123456789abcdef';
    const mediaEntry: MediaEntry = {
      hash,
      sha256: 'x'.repeat(64),
      slug: 'photo',
      displayName: 'Photo',
      originalFilename: 'photo.png',
      alt: 'Alt',
      ext: 'webp',
      contentType: 'image/webp',
      bytes: 10,
      width: 100,
      height: 100,
      createdAt: new Date().toISOString(),
    };
    const gh = freshGithub({
      branch: {
        [ENTRY_PATH]: `---\ntitle: Hi\nimage:\n  src: "media:a.${hash}"\n  alt: pic\n---\nbody`,
        [MEDIA_PATH]: serializeMediaManifest({ [hash]: mediaEntry }),
      },
      main: { [MEDIA_PATH]: serializeMediaManifest({}) },
    });
    gh.install();
    const resolvedAssets: ResolvedAssetConfig = {
      enabled: true,
      bucketBinding: 'BUCKET',
      publicBase: '/media',
      urlForm: 'slug',
      maxUploadBytes: 1,
      allowedTypes: [],
      variants: {},
      transformations: false,
    };
    const token = await mintValidToken();
    const { event } = loadEvent(token);
    const data = (await previewLoad(runtime({ resolvedAssets }), publicConfig(), event as never)) as PreviewData;
    expect(data.heroImage?.url).toBe(`/media/photo.${hash}.webp`);
  });

  it('resolves a body media: token through the branch-first resolver, an upload absent from the build-time snapshot', async () => {
    const hash = '0123456789abcdef';
    const mediaEntry: MediaEntry = {
      hash,
      sha256: 'x'.repeat(64),
      slug: 'photo',
      displayName: 'Photo',
      originalFilename: 'photo.png',
      alt: 'Alt',
      ext: 'webp',
      contentType: 'image/webp',
      bytes: 10,
      width: 100,
      height: 100,
      createdAt: new Date().toISOString(),
    };
    const gh = freshGithub({
      branch: {
        [ENTRY_PATH]: `---\ntitle: Hi\n---\n![pic](media:a.${hash})`,
        [MEDIA_PATH]: serializeMediaManifest({ [hash]: mediaEntry }),
      },
      // The build-time snapshot (the committed manifest a site's public render would fall back
      // to) never carries this hash: it exists only in the branch's own media.json, so a body
      // render that skips composeEntryData's resolveMedia thread would mark the image broken.
      main: { [MEDIA_PATH]: serializeMediaManifest({}) },
    });
    gh.install();
    const resolvedAssets: ResolvedAssetConfig = {
      enabled: true,
      bucketBinding: 'BUCKET',
      publicBase: '/media',
      urlForm: 'slug',
      maxUploadBytes: 1,
      allowedTypes: [],
      variants: {},
      transformations: false,
    };
    const token = await mintValidToken();
    const { event } = loadEvent(token);
    const data = (await previewLoad(
      runtime({ resolvedAssets }),
      mediaRenderPublicConfig(),
      event as never,
    )) as PreviewData;
    expect(data.html).toContain(`/media/photo.${hash}.webp`);
    expect(data.html).not.toContain('cairn-broken-media');
  });
});

describe('previewLoad: the ended page', () => {
  it('answers the published state once the branch is gone and the file still exists on main', async () => {
    const gh = freshGithub({ main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nLive body.' } });
    gh.install();
    const token = await mintValidToken();
    const { event, headers } = loadEvent(token);
    const data = (await previewLoad(runtime(), publicConfig(), event as never)) as PreviewData;

    expect(data.preview.state).toBe('published');
    expect(data.preview.published).toEqual({ permalink: '/posts/hello' });
    expect(data.entry.id).toBe(ID);
    expect(headers).toContainEqual(EXPECTED_HEADERS);
  });

  it('an expired token against a published entry still answers 404, never the ended page', async () => {
    const gh = freshGithub({ main: { [ENTRY_PATH]: '---\ntitle: Hi\n---\nLive body.' } });
    gh.install();
    const token = await seedExpiredToken();
    const { event } = loadEvent(token);
    const result = await expectNotFound(() => previewLoad(runtime(), publicConfig(), event as never));
    expect(result.status).toBe(404);
  });
});

describe('PreviewData: the type and runtime shape contract', () => {
  it('adds exactly the `preview` key over EntryData', () => {
    expectTypeOf<Omit<PreviewData, 'preview'>>().toEqualTypeOf<EntryData>();
    expectTypeOf<Exclude<keyof PreviewData, keyof EntryData>>().toEqualTypeOf<'preview'>();
  });

  it('the runtime key set matches EntryData plus preview, with every optional EntryData key populated', async () => {
    const hash = '0123456789abcdef';
    const mediaEntry: MediaEntry = {
      hash,
      sha256: 'x'.repeat(64),
      slug: 'photo',
      displayName: 'Photo',
      originalFilename: 'photo.png',
      alt: 'Alt',
      ext: 'webp',
      contentType: 'image/webp',
      bytes: 10,
      width: 100,
      height: 100,
      createdAt: new Date().toISOString(),
    };
    const gh = freshGithub({
      branch: {
        [ENTRY_PATH]: `---\ntitle: Hi\nimage:\n  src: "media:a.${hash}"\n  alt: pic\n---\nbody`,
        [MEDIA_PATH]: serializeMediaManifest({ [hash]: mediaEntry }),
      },
    });
    gh.install();
    const resolvedAssets: ResolvedAssetConfig = {
      enabled: true,
      bucketBinding: 'BUCKET',
      publicBase: '/media',
      urlForm: 'slug',
      maxUploadBytes: 1,
      allowedTypes: [],
      variants: {},
      transformations: false,
    };
    const token = await mintValidToken();
    const { event } = loadEvent(token);
    const data = await previewLoad(runtime({ resolvedAssets }), publicConfig(), event as never);

    // newer/older are unconditional keys on EntryData (always assigned, possibly undefined);
    // heroImage is the one truly optional (conditionally spread) key, populated above.
    expect(Object.keys(data).sort()).toEqual(
      ['concept', 'entry', 'html', 'canonicalUrl', 'seo', 'newer', 'older', 'heroImage', 'preview'].sort(),
    );
  });
});
