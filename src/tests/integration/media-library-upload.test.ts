// Task 2: mediaLibraryUpload, the Library-direct upload action. It calls ingestAndStore (the shared
// store-and-derive body the editor upload also uses) to put the bytes to R2 and derive the
// MediaEntry, then commits the row straight to main: read media.json, upsert the row, one
// backend.commit. A hash already present in the manifest short-circuits to a no-op success (the
// idempotent-reupload contract). The action inherits ingestAndStore's gates (media-on,
// Content-Length, CSRF, session) unchanged, so those refusals commit nothing.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { githubApp } from '../../lib/index.js';
import { GithubDouble } from '../unit/_github-double.js';
import { createContentRoutes, type ContentEvent } from '../../lib/sveltekit/content-routes.js';
import { parseMediaManifest, serializeMediaManifest, type MediaEntry, type MediaManifest } from '../../lib/media/manifest.js';
import { hashBytes, shortHash } from '../../lib/media/naming.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';
import type { Editor } from '../../lib/auth/types.js';
import type { Backend } from '../../lib/github/backend.js';

const REPO = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };
const MEDIA_PATH = 'src/content/.cairn/media.json';

const bucket = env.MEDIA_BUCKET;

const editor: Editor = { email: 'a@b.test', displayName: 'A Tester', role: 'owner' };

const CSRF = 'csrf-token-value-0123456789abcdef';

/** A minimal runtime with media enabled, pointing at the miniflare R2 binding. Only the fields the
 *  action reads are load-bearing; the rest satisfy the CairnRuntime contract. */
function runtime(): CairnRuntime {
  return {
    siteName: 'Test Site',
    sender: { from: 'noreply@test', replyTo: 'noreply@test' },
    concepts: [],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/manifest.json',
    mediaManifestPath: MEDIA_PATH,
    vocabulary: [],
    resolvedAssets: {
      enabled: true,
      bucketBinding: 'MEDIA_BUCKET',
      publicBase: '/media',
      urlForm: 'slug',
      maxUploadBytes: 25 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
      variants: {},
      transformations: false,
    },
  } as CairnRuntime;
}

// The default read/commit backend every event's `locals.backend` rides.
const backend = makeGithubBackend(REPO, () => Promise.resolve('test-token'));

/** A fake cookie jar that returns the csrf cookie under the https `__Host-` name. */
function cookieJar(csrf: string | undefined): CookieJar {
  return {
    get: (name) => (name === '__Host-cairn_csrf' ? csrf : undefined),
    set: () => {},
    delete: () => {},
  };
}

interface UploadOpts {
  bytes: Uint8Array;
  filename?: string;
  csrf?: string | undefined;
  cookieCsrf?: string | undefined;
  hasEditor?: boolean;
  platformEnv?: Record<string, unknown>;
}

/** Build the ContentEvent for an upload POST. The raw body is the bytes; the filename travels in a
 *  percent-encoded request header, exactly as the editor upload does. */
function uploadEvent(opts: UploadOpts & { backend?: Backend }): ContentEvent {
  const headers = new Headers();
  headers.set('content-type', 'image/png');
  headers.set('content-length', String(opts.bytes.length));
  if ('csrf' in opts ? opts.csrf !== undefined : true) headers.set('x-cairn-csrf', opts.csrf ?? CSRF);
  if (opts.filename !== undefined) headers.set('x-cairn-filename', encodeURIComponent(opts.filename));

  const url = new URL('https://site.example/admin/media');
  return {
    url,
    params: {},
    request: new Request(url, { method: 'POST', body: opts.bytes as unknown as BodyInit, headers }),
    locals: { editor: opts.hasEditor === false ? null : editor, backend: opts.backend ?? backend },
    platform: { env: opts.platformEnv ?? { MEDIA_BUCKET: bucket } },
    cookies: cookieJar(opts.cookieCsrf === undefined ? CSRF : opts.cookieCsrf),
  };
}

/** A minimal valid PNG: the 8-byte signature plus padding (the sniff reads only the magic). */
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
/** A second, distinct minimal PNG (differs in the padding bytes, so it hashes differently). */
const PNG_2 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

function mediaManifest(...entries: MediaEntry[]): string {
  const manifest: MediaManifest = {};
  for (const e of entries) manifest[e.hash] = e;
  return serializeMediaManifest(manifest);
}

/** The action returns the held data on a fail (fail returns { status, data }) or the plain success
 *  object. Narrow the union to read either side. */
type ActionResult = { status?: number; data?: { error?: string } } & { record?: { hash: string; slug: string } };

describe('mediaLibraryUpload (Task 2)', () => {
  beforeEach(async () => {
    for (const obj of (await bucket.list()).objects) await bucket.delete(obj.key);
    vi.restoreAllMocks();
  });

  it('commits a new media.json row to main on upload', async () => {
    const gh = new GithubDouble({ main: { [MEDIA_PATH]: mediaManifest() } });
    gh.install();
    const routes = createContentRoutes(runtime());

    const res = (await routes.mediaLibraryUpload(uploadEvent({ bytes: PNG, filename: 'first.png' }))) as ActionResult;

    expect(res.status).toBeUndefined();
    expect(res.record).toBeDefined();
    const hash = shortHash(await hashBytes(PNG));
    expect(res.record?.hash).toBe(hash);

    const committed = parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!));
    expect(Object.keys(committed)).toEqual([hash]);
    expect(committed[hash].slug).toBe('first');
  });

  it('commits nothing when the hash already exists (idempotent)', async () => {
    const hash = shortHash(await hashBytes(PNG_2));
    const existingRow: MediaEntry = {
      hash,
      sha256: await hashBytes(PNG_2),
      slug: 'already-there',
      displayName: 'already-there',
      originalFilename: 'already-there.png',
      alt: '',
      ext: 'png',
      contentType: 'image/png',
      bytes: PNG_2.length,
      width: null,
      height: null,
      createdAt: '2026-06-01T00:00:00.000Z',
    };
    const gh = new GithubDouble({ main: { [MEDIA_PATH]: mediaManifest(existingRow) } });
    gh.install();
    // Pre-put the bytes too, so ingestAndStore's dedup reuses rather than puts (irrelevant to the
    // commit assertion, but keeps the scenario realistic).
    const routes = createContentRoutes(runtime());
    const before = gh.read('main', MEDIA_PATH);

    const res = (await routes.mediaLibraryUpload(uploadEvent({ bytes: PNG_2, filename: 'dupe.png' }))) as ActionResult;

    expect(res.status).toBeUndefined();
    expect(res.record?.hash).toBe(hash);
    // No new commit landed: the manifest is byte-unchanged, still carrying the original row's slug.
    expect(gh.read('main', MEDIA_PATH)).toBe(before);
    expect(gh.calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/git/refs/heads/main'))).toBe(false);
  });

  it('refuses without a session, and commits nothing', async () => {
    const gh = new GithubDouble({ main: { [MEDIA_PATH]: mediaManifest() } });
    gh.install();
    const routes = createContentRoutes(runtime());

    const res = (await routes.mediaLibraryUpload(uploadEvent({ bytes: PNG, hasEditor: false }))) as ActionResult;

    expect(res.status).toBe(401);
    expect(res.data?.error).toBe('session-expired');
    expect(gh.calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/git/refs/heads/main'))).toBe(false);
  });

  it('refuses with a bad CSRF, and commits nothing', async () => {
    const gh = new GithubDouble({ main: { [MEDIA_PATH]: mediaManifest() } });
    gh.install();
    const routes = createContentRoutes(runtime());

    const res = (await routes.mediaLibraryUpload(uploadEvent({ bytes: PNG, csrf: 'wrong-token' }))) as ActionResult;

    expect(res.status).toBe(403);
    expect(res.data?.error).toBe('csrf');
    expect(gh.calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/git/refs/heads/main'))).toBe(false);
  });

  it('threads the head read before the manifest into commit as expectedHead', async () => {
    // media.json has no regenerate-from-files backstop, so the commit must be fail-closed on the
    // head read BEFORE the manifest read, mirroring settingsSave/vocabularySave. Spy on a fresh
    // backend so the guarded commit's 5th argument is directly observable.
    const gh = new GithubDouble({ main: { [MEDIA_PATH]: mediaManifest() } });
    gh.install();
    const spiedBackend = makeGithubBackend(REPO, () => Promise.resolve('test-token'));
    const commitSpy = vi.spyOn(spiedBackend, 'commit');
    const routes = createContentRoutes(runtime());
    const head = gh.headSha('main');

    await routes.mediaLibraryUpload(uploadEvent({ bytes: PNG, filename: 'first.png', backend: spiedBackend }));

    expect(commitSpy).toHaveBeenCalledWith(
      'main',
      expect.any(Array),
      expect.any(Object),
      expect.any(String),
      head,
    );
  });

  it('returns fail(409) and commits nothing when the manifest head moves before the guarded commit (a concurrent uploader)', async () => {
    const raceHash = shortHash(await hashBytes(PNG_2));
    const raceRow: MediaEntry = {
      hash: raceHash,
      sha256: await hashBytes(PNG_2),
      slug: 'racer',
      displayName: 'racer',
      originalFilename: 'racer.png',
      alt: '',
      ext: 'png',
      contentType: 'image/png',
      bytes: PNG_2.length,
      width: null,
      height: null,
      createdAt: '2026-06-01T00:00:00.000Z',
    };
    const gh = new GithubDouble({ main: { [MEDIA_PATH]: mediaManifest() } });
    gh.install();
    // Wrap the double's fetch: on the FIRST ref-heads GET (the action's own head read, mirroring the
    // settingsSave conflict test's pattern), land a concurrent uploader's commit out of band, moving
    // the head off the sha the action just read. The SECOND ref-heads GET is commitFiles' own
    // expectedHead check inside the guarded commit, which then sees the moved head and conflicts.
    const doubleFetch = globalThis.fetch as typeof fetch;
    let refReads = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input);
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
        if (method === 'GET' && /\/git\/ref\/heads\//.test(url)) {
          refReads += 1;
          // Resolve THIS read with the head as it stood when the request was made, then move the
          // head, so the read after it (commitFiles' own expectedHead check) sees the new value.
          const res = await doubleFetch(input, init);
          if (refReads === 1) gh.commit('main', MEDIA_PATH, mediaManifest(raceRow));
          return res;
        }
        return doubleFetch(input, init);
      }),
    );
    const routes = createContentRoutes(runtime());

    const res = (await routes.mediaLibraryUpload(uploadEvent({ bytes: PNG, filename: 'first.png' }))) as ActionResult;

    expect(res.status).toBe(409);
    expect(res.data?.error).toMatch(/changed since you opened/i);
    // The concurrent uploader's row survived untouched: this upload's row never landed.
    const committed = parseMediaManifest(JSON.parse(gh.read('main', MEDIA_PATH)!));
    expect(Object.keys(committed)).toEqual([raceHash]);
  });
});
