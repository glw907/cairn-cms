// Task 5: the upload action's untrusted-input contract. The server owns every committed field and
// trusts no client value. These tests drive the action directly through createContentRoutes against
// the miniflare R2 bucket, with a constructed ContentEvent carrying the raw-body POST, the
// X-Cairn-* headers, locals.editor, platform.env, and a fake cookie jar that returns the csrf cookie.
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createContentRoutes, type ContentEvent } from '../../lib/sveltekit/content-routes.js';
import { r2Key, hashBytes, shortHash } from '../../lib/media/naming.js';
import { log } from '../../lib/log/index.js';
import type { CairnRuntime } from '../../lib/content/types.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';
import type { Editor } from '../../lib/auth/types.js';

const bucket = env.MEDIA_BUCKET;

const editor: Editor = { email: 'a@b.test', displayName: 'A Tester', role: 'owner' };

const CSRF = 'csrf-token-value-0123456789abcdef';

/** A minimal runtime with media enabled, pointing at the miniflare R2 binding. Only the fields the
 *  upload action reads are load-bearing; the rest satisfy the CairnRuntime contract. */
function runtime(overrides: Partial<CairnRuntime> = {}): CairnRuntime {
  return {
    siteName: 'Test Site',
    sender: { from: 'noreply@test', replyTo: 'noreply@test' },
    concepts: [],
    backend: { owner: 'o', repo: 'r', branch: 'main', apiBase: 'https://api.github.com' },
    manifestPath: 'src/content/.cairn/manifest.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
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
    ...overrides,
  } as CairnRuntime;
}

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
  contentType?: string;
  filename?: string;
  alt?: string;
  displayName?: string;
  width?: string;
  height?: string;
  csrf?: string | undefined;
  cookieCsrf?: string | undefined;
  contentLength?: string | null;
  hasEditor?: boolean;
  platformEnv?: Record<string, unknown>;
}

/** Build the ContentEvent for an upload POST. The raw body is the bytes; the metadata travels in
 *  percent-encoded request headers. */
function uploadEvent(opts: UploadOpts): ContentEvent {
  const headers = new Headers();
  headers.set('content-type', opts.contentType ?? 'image/png');
  const length = opts.contentLength === undefined ? String(opts.bytes.length) : opts.contentLength;
  if (length !== null) headers.set('content-length', length);
  if ('csrf' in opts ? opts.csrf !== undefined : true) headers.set('x-cairn-csrf', opts.csrf ?? CSRF);
  if (opts.filename !== undefined) headers.set('x-cairn-filename', encodeURIComponent(opts.filename));
  if (opts.alt !== undefined) headers.set('x-cairn-alt', encodeURIComponent(opts.alt));
  if (opts.displayName !== undefined) headers.set('x-cairn-display-name', encodeURIComponent(opts.displayName));
  if (opts.width !== undefined) headers.set('x-cairn-width', opts.width);
  if (opts.height !== undefined) headers.set('x-cairn-height', opts.height);

  const url = new URL('https://site.example/admin/posts/my-entry');
  return {
    url,
    params: { concept: 'posts', id: 'my-entry' },
    // A Uint8Array is a valid fetch body at runtime; the DOM lib's BodyInit predates the typed-array
    // overload, so cast through BodyInit to satisfy the constructor type.
    request: new Request(url, { method: 'POST', body: opts.bytes as unknown as BodyInit, headers }),
    locals: { editor: opts.hasEditor === false ? null : editor },
    platform: { env: opts.platformEnv ?? { MEDIA_BUCKET: bucket } },
    cookies: cookieJar(opts.cookieCsrf === undefined ? CSRF : opts.cookieCsrf),
  };
}

/** A minimal valid PNG: the 8-byte signature plus padding (the sniff reads only the magic). */
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
/** A minimal valid JPEG. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
/** An SVG payload: a leading `<`, denied at the engine level. */
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
/** A leading `<` payload that sniffs as nothing. */
const LT_PAYLOAD = new TextEncoder().encode('<!doctype html><script>alert(1)</script>');

/** The action returns the held data on a fail (fail returns { status, data }) or the plain success
 *  object. Narrow the union to read either side. */
type ActionResult = { status?: number; data?: { error?: string } } & { reference?: string; reused?: boolean; record?: { hash: string } };

describe('upload action: the untrusted-input contract (Task 5)', () => {
  beforeEach(async () => {
    // Clear the keys these tests write so dedup tests start clean.
    for (const obj of (await bucket.list()).objects) await bucket.delete(obj.key);
    vi.restoreAllMocks();
  });

  it('stores a valid PNG under the content-addressed key, returns the media: reference, and commits nothing', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(uploadEvent({ bytes: PNG, filename: 'photo.png' }))) as ActionResult;

    const full = await hashBytes(PNG);
    const hash = shortHash(full);
    const stored = await bucket.head(r2Key(hash, 'png'));
    expect(stored).not.toBeNull();
    expect(res.reference).toBe(`media:photo.${hash}`);
    expect(res.record?.hash).toBe(hash);
    // Commits nothing: the action has no commitFiles path. Nothing to assert beyond the success shape.
    expect(res.reused).toBe(false);
  });

  it('a second identical upload reuses the stored object and does not put again', async () => {
    const routes = createContentRoutes(runtime());
    // Count puts by wrapping the bucket binding the action receives.
    let puts = 0;
    const counting = new Proxy(bucket, {
      get(target, prop) {
        if (prop === 'put') {
          return (...args: Parameters<typeof bucket.put>) => {
            puts += 1;
            return target.put(...args);
          };
        }
        // Bind every other method to the real binding: an R2 method called with the Proxy as `this`
        // throws an illegal-invocation in workerd.
        const value = Reflect.get(target, prop) as unknown;
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const platformEnv = { MEDIA_BUCKET: counting };
    const first = (await routes.uploadAction(uploadEvent({ bytes: PNG, platformEnv }))) as ActionResult;
    const second = (await routes.uploadAction(uploadEvent({ bytes: PNG, platformEnv }))) as ActionResult;

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(puts).toBe(1);
  });

  it('refuses a short-hash collision: a stored object whose full sha256 differs gives fail(409)', async () => {
    const routes = createContentRoutes(runtime());
    const hash = shortHash(await hashBytes(PNG));
    // Pre-put an object at the PNG's content-addressed key carrying a different full sha256, the way
    // a genuine 16-hex short-hash collision between two distinct files would look on the dedup probe.
    await bucket.put(r2Key(hash, 'png'), new Uint8Array([1, 2, 3]), {
      customMetadata: { sha256: '0'.repeat(64) },
    });
    const res = (await routes.uploadAction(uploadEvent({ bytes: PNG }))) as ActionResult;
    expect(res.status).toBe(409);
    expect(res.data?.error).toBe('hash-collision');
  });

  it('rejects an oversize Content-Length with fail(413) before reading the body', async () => {
    const routes = createContentRoutes(
      runtime({
        resolvedAssets: {
          enabled: true,
          bucketBinding: 'MEDIA_BUCKET',
          publicBase: '/media',
          urlForm: 'slug',
          maxUploadBytes: 10,
          allowedTypes: ['image/png'],
          variants: {},
          transformations: false,
        },
      }),
    );
    const res = (await routes.uploadAction(
      uploadEvent({ bytes: PNG, contentLength: String(11) }),
    )) as ActionResult;
    expect(res.status).toBe(413);
    expect(res.data?.error).toBe('too-large');
  });

  it('rejects a missing Content-Length with fail(411)', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(uploadEvent({ bytes: PNG, contentLength: null }))) as ActionResult;
    expect(res.status).toBe(411);
    expect(res.data?.error).toBe('length-required');
  });

  it('rejects a missing X-Cairn-CSRF with fail(403)', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(uploadEvent({ bytes: PNG, csrf: undefined }))) as ActionResult;
    expect(res.status).toBe(403);
    expect(res.data?.error).toBe('csrf');
  });

  it('rejects a wrong X-Cairn-CSRF with fail(403)', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(uploadEvent({ bytes: PNG, csrf: 'wrong-token' }))) as ActionResult;
    expect(res.status).toBe(403);
    expect(res.data?.error).toBe('csrf');
  });

  it('returns fail(401) JSON, not a 303, when locals.editor is absent', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(uploadEvent({ bytes: PNG, hasEditor: false }))) as ActionResult;
    expect(res.status).toBe(401);
    expect(res.data?.error).toBe('session-expired');
  });

  it('rejects an SVG payload with fail(415) even when allowedTypes includes image/svg+xml', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(
      uploadEvent({ bytes: SVG, contentType: 'image/svg+xml', filename: 'logo.svg' }),
    )) as ActionResult;
    expect(res.status).toBe(415);
    expect(res.data?.error).toBe('unsupported-type');
  });

  it('rejects a leading-< payload with fail(415)', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(
      uploadEvent({ bytes: LT_PAYLOAD, contentType: 'image/png', filename: 'x.png' }),
    )) as ActionResult;
    expect(res.status).toBe(415);
    expect(res.data?.error).toBe('unsupported-type');
  });

  it('stores JPEG bytes under the jpg ext even when the client declares image/webp (sniff wins)', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(
      uploadEvent({ bytes: JPEG, contentType: 'image/webp', filename: 'shot.heic' }),
    )) as ActionResult;
    const hash = shortHash(await hashBytes(JPEG));
    expect(res.record?.hash).toBe(hash);
    expect(await bucket.head(r2Key(hash, 'jpg'))).not.toBeNull();
    expect(await bucket.head(r2Key(hash, 'webp'))).toBeNull();
  });

  it('caps a 200-char X-Cairn-Alt to the documented maximum', async () => {
    const routes = createContentRoutes(runtime());
    const longAlt = 'x'.repeat(200);
    const res = (await routes.uploadAction(
      uploadEvent({ bytes: PNG, filename: 'photo.png', alt: longAlt }),
    )) as ActionResult & { record?: { alt: string } };
    expect(res.record?.alt.length).toBe(160);
  });

  it('replaces a path-traversal X-Cairn-Filename with the slugifyFilename output', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(
      uploadEvent({ bytes: PNG, filename: '../../evil.png' }),
    )) as ActionResult & { record?: { slug: string; originalFilename: string } };
    expect(res.record?.slug).toBe('evil');
    expect(res.reference).toMatch(/^media:evil\./);
    // The original filename is the basename, never the raw path.
    expect(res.record?.originalFilename).not.toContain('/');
  });

  it('emits media.upload_failed with the reason on a rejected upload', async () => {
    const routes = createContentRoutes(runtime());
    const warn = vi.spyOn(log, 'warn');
    await routes.uploadAction(uploadEvent({ bytes: SVG, contentType: 'image/svg+xml' }));
    expect(warn).toHaveBeenCalledWith(
      'media.upload_failed',
      expect.objectContaining({ reason: 'unsupported-type' }),
    );
  });

  it('emits media.uploaded with the editor, hash, bytes, and reused on success', async () => {
    const routes = createContentRoutes(runtime());
    const info = vi.spyOn(log, 'info');
    await routes.uploadAction(uploadEvent({ bytes: PNG, filename: 'photo.png' }));
    const hash = shortHash(await hashBytes(PNG));
    expect(info).toHaveBeenCalledWith(
      'media.uploaded',
      expect.objectContaining({ editor: editor.email, hash, bytes: PNG.length, reused: false }),
    );
  });

  it('clamps an out-of-range X-Cairn-Width to null', async () => {
    const routes = createContentRoutes(runtime());
    const res = (await routes.uploadAction(
      uploadEvent({ bytes: PNG, filename: 'photo.png', width: '999999', height: '600' }),
    )) as ActionResult & { record?: { width: number | null; height: number | null } };
    expect(res.record?.width).toBeNull();
    expect(res.record?.height).toBe(600);
  });
});
