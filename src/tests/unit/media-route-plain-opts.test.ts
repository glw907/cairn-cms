import { describe, it, expect } from 'vitest';
import type { RequestHandler } from '@sveltejs/kit';
import { createMediaRoute } from '../../lib/sveltekit/media-route.js';
import { githubApp } from '../../lib/index.js';
import { r2Key } from '../../lib/media/naming.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import type { CairnRuntime } from '../../lib/content/types.js';

/** A resolved media config; only `resolvedAssets` matters to the route factory. */
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

function runtime(resolvedAssets: ResolvedAssetConfig): CairnRuntime {
  return {
    siteName: 'T',
    concepts: [],
    backend: githubApp({ owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' }),
    sender: { from: 'cms@test' },
    render: ({ body }) => Promise.resolve(body),
    manifestPath: 'src/content/.cairn/index.json',
    mediaManifestPath: 'src/content/.cairn/media.json',
    resolvedAssets,
    vocabulary: [],
  };
}

const HASH = 'a1b2c3d4e5f60718';
const EXT = 'png';
const KEY = r2Key(HASH, EXT);
const SLUG_PATH = `photo.${HASH}.${EXT}`;

async function invoke(
  handler: RequestHandler,
  path: string,
  init: RequestInit,
  bucket: { get(key: string, opts?: unknown): Promise<unknown> },
): Promise<unknown> {
  const request = new Request(`https://site.example/media/${path}`, init);
  const event = { params: { path }, platform: { env: { MEDIA_BUCKET: bucket } }, request };
  await handler(event as unknown as Parameters<RequestHandler>[0]);
  return undefined;
}

describe('media delivery route: plain option objects (media-route local-dev-safe onlyIf)', () => {
  it('never hands bucket.get a Headers instance, and the options survive structuredClone', async () => {
    let capturedOpts: unknown;
    const bucket = {
      async get(key: string, opts?: unknown) {
        expect(key).toBe(KEY);
        capturedOpts = opts;
        return null;
      },
    };

    await invoke(
      createMediaRoute(runtime(resolvedOn)),
      SLUG_PATH,
      {
        headers: {
          'If-None-Match': '"abc123"',
          Range: 'bytes=2-5',
        },
      },
      bucket,
    );

    expect(capturedOpts).toBeDefined();
    expect(capturedOpts).not.toBeInstanceOf(Headers);
    const opts = capturedOpts as { onlyIf?: unknown; range?: unknown };
    expect(opts.onlyIf).not.toBeInstanceOf(Headers);
    expect(opts.range).not.toBeInstanceOf(Headers);
    expect(() => structuredClone(capturedOpts)).not.toThrow();
    expect(opts.onlyIf).toEqual({ etagDoesNotMatch: 'abc123' });
    expect(opts.range).toEqual({ offset: 2, length: 4 });
  });

  it('shapes Content-Range correctly when R2 echoes a suffix range, clamping past the object size', async () => {
    const handler = createMediaRoute(runtime(resolvedOn));
    const cases = [
      { suffix: 10, header: 'bytes=-10', contentRange: 'bytes 90-99/100' },
      { suffix: 200, header: 'bytes=-200', contentRange: 'bytes 0-99/100' },
    ];
    for (const { suffix, header, contentRange } of cases) {
      const bucket = {
        async get() {
          return {
            writeHttpMetadata() {},
            httpEtag: '"abc"',
            size: 100,
            range: { suffix },
            body: new ReadableStream(),
          };
        },
      };
      const request = new Request(`https://site.example/media/${SLUG_PATH}`, {
        headers: { Range: header },
      });
      const event = { params: { path: SLUG_PATH }, platform: { env: { MEDIA_BUCKET: bucket } }, request };
      const res = (await handler(event as unknown as Parameters<RequestHandler>[0])) as Response;
      expect(res.status).toBe(206);
      expect(res.headers.get('Content-Range')).toBe(contentRange);
    }
  });

  it('omits onlyIf and range from the options when no conditional or range header is present', async () => {
    let capturedOpts: unknown;
    const bucket = {
      async get(key: string, opts?: unknown) {
        capturedOpts = opts;
        return null;
      },
    };

    await invoke(createMediaRoute(runtime(resolvedOn)), SLUG_PATH, {}, bucket);

    const opts = capturedOpts as { onlyIf?: unknown; range?: unknown };
    expect(opts.onlyIf).toBeUndefined();
    expect(opts.range).toBeUndefined();
  });
});
