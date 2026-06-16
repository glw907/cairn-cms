import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import type { RequestHandler } from '@sveltejs/kit';
import { createMediaRoute } from '../../lib/sveltekit/media-route.js';
import { r2Key } from '../../lib/media/naming.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';

const bucket = env.MEDIA_BUCKET;

/** A resolved media config that points the route at the miniflare R2 bucket. */
const resolvedOn: ResolvedAssetConfig = {
  enabled: true,
  bucketBinding: 'MEDIA_BUCKET',
  publicBase: '/media',
  urlForm: 'slug',
  maxUploadBytes: 25 * 1024 * 1024,
  allowedTypes: ['image/png'],
  variants: {},
  transformations: false,
};

/** Drive the handler with a constructed Request and a fake event carrying params and platform.env.
 *  The handler is typed against kit's RequestEvent; the test supplies the structural subset it reads
 *  (params.path, platform.env, request), cast through the handler signature. */
async function invoke(
  handler: RequestHandler,
  path: string,
  init?: RequestInit,
  platformEnv: Record<string, unknown> = { MEDIA_BUCKET: bucket },
): Promise<Response> {
  const request = new Request(`https://site.example/media/${path}`, init);
  const event = { params: { path }, platform: { env: platformEnv }, request };
  return handler(event as unknown as Parameters<RequestHandler>[0]);
}

/** A short hex hash whose bytes we control, and the matching R2 key. */
const HASH = 'a1b2c3d4e5f60718';
const EXT = 'png';
const KEY = r2Key(HASH, EXT);
const SLUG_PATH = `photo.${HASH}.${EXT}`;
const BYTES = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

beforeEach(async () => {
  await bucket.delete(KEY);
});

describe('media delivery route (Task 4)', () => {
  it('serves a stored object 200 with the security headers and the immutable cache', async () => {
    await bucket.put(KEY, BYTES, {
      httpMetadata: { contentType: 'image/png', cacheControl: 'no-store' },
    });
    const handler = createMediaRoute(resolvedOn);
    const res = await invoke(handler, SLUG_PATH);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Content-Disposition')).toBe('inline');
    expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'none'; sandbox");
    // The route's own immutable cache overrides the stored cacheControl.
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('ETag')).toBeTruthy();
    const body = new Uint8Array(await res.arrayBuffer());
    expect(body).toEqual(BYTES);
  });

  it('returns 304 with no body when If-None-Match matches the stored etag', async () => {
    await bucket.put(KEY, BYTES, { httpMetadata: { contentType: 'image/png' } });
    const handler = createMediaRoute(resolvedOn);
    const first = await invoke(handler, SLUG_PATH);
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();

    const res = await invoke(handler, SLUG_PATH, {
      headers: { 'If-None-Match': etag as string },
    });
    expect(res.status).toBe(304);
    expect(res.body).toBeNull();
  });

  it('returns 206 with a Content-Range for a Range request', async () => {
    await bucket.put(KEY, BYTES, { httpMetadata: { contentType: 'image/png' } });
    const handler = createMediaRoute(resolvedOn);
    const res = await invoke(handler, SLUG_PATH, { headers: { Range: 'bytes=2-5' } });

    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe(`bytes 2-5/${BYTES.length}`);
    const body = new Uint8Array(await res.arrayBuffer());
    expect(body).toEqual(BYTES.slice(2, 6));
  });

  it('serves a full 200 for a Via: image-resizing subrequest even with conditional headers', async () => {
    await bucket.put(KEY, BYTES, { httpMetadata: { contentType: 'image/png' } });
    const handler = createMediaRoute(resolvedOn);
    const first = await invoke(handler, SLUG_PATH);
    const etag = first.headers.get('ETag') as string;

    const res = await invoke(handler, SLUG_PATH, {
      headers: { Via: '1.1 image-resizing', 'If-None-Match': etag, Range: 'bytes=2-5' },
    });
    expect(res.status).toBe(200);
    const body = new Uint8Array(await res.arrayBuffer());
    expect(body).toEqual(BYTES);
  });

  it('404s a path-traversal slug with no R2 read', async () => {
    const handler = createMediaRoute(resolvedOn);
    const res = await invoke(handler, `..%2F${SLUG_PATH}`, undefined, throwingEnv());
    expect(res.status).toBe(404);
  });

  it('404s a bare `..` segment with no R2 read', async () => {
    const handler = createMediaRoute(resolvedOn);
    const res = await invoke(handler, `../${SLUG_PATH}`, undefined, throwingEnv());
    expect(res.status).toBe(404);
  });

  it('404s an over-long, non-hex hash with no R2 read', async () => {
    const handler = createMediaRoute(resolvedOn);
    // 17 chars and a non-hex `g`: fails HASH_RE before any read.
    const res = await invoke(handler, `photo.a1b2c3d4e5f6071g8.${EXT}`, undefined, throwingEnv());
    expect(res.status).toBe(404);
  });

  it('404s a bad extension with no R2 read', async () => {
    const handler = createMediaRoute(resolvedOn);
    const res = await invoke(handler, `photo.${HASH}.svg`, undefined, throwingEnv());
    expect(res.status).toBe(404);
  });

  it('returns 503 (not a thrown 500) when the bucket binding is missing', async () => {
    const handler = createMediaRoute(resolvedOn);
    const res = await invoke(handler, SLUG_PATH, undefined, {});
    expect(res.status).toBe(503);
  });

  it('404s when media is off', async () => {
    const handler = createMediaRoute({ enabled: false });
    const res = await invoke(handler, SLUG_PATH);
    expect(res.status).toBe(404);
  });
});

/** A platform env whose MEDIA_BUCKET.get throws, so a test asserting "no R2 read" fails loudly if the
 *  route reaches R2 for a path it should have rejected during validation. */
function throwingEnv(): Record<string, unknown> {
  return {
    MEDIA_BUCKET: {
      get() {
        throw new Error('R2 was read for a path that should have been rejected before any read');
      },
    },
  };
}
