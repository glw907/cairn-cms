// The getPlatformProxy media-delivery smoke (ROADMAP "Now" item, born 2026-07-08). The
// vitest-pool-workers integration project binds R2 natively (no RPC boundary), and `vite preview`
// carries no bindings at all, so neither one drives the media route through the same magic-proxy
// RPC boundary a consumer's `vite dev` does. Two miniflare serialization bugs (a live Headers
// object passed into a bucket method, and into `bucket.get`'s options) shipped past a green suite
// this way. `getPlatformProxy` reproduces that exact boundary: it starts a real Miniflare instance
// from Node and returns bindings as RPC stubs, the same shape `platform.env` has under `vite dev`.
// It runs in this file's own Node process, never inside workerd, so it belongs in the `unit`
// project (environment: 'node'), not `integration` (which itself already runs inside workerd).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { RequestHandler } from '@sveltejs/kit';
import { createMediaRoute } from '../../lib/sveltekit/media-route.js';
import { githubApp } from '../../lib/index.js';
import { r2Key } from '../../lib/media/naming.js';
import type { ResolvedAssetConfig } from '../../lib/media/config.js';
import type { CairnRuntime } from '../../lib/content/types.js';

const HASH = 'f1e2d3c4b5a69788';
const EXT = 'png';
const KEY = r2Key(HASH, EXT);
const SLUG_PATH = `smoke.${HASH}.${EXT}`;
const BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

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

/** A minimal composed runtime; createMediaRoute reads only `resolvedAssets` off it. */
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

let platformEnv: Record<string, unknown>;
let dispose: () => Promise<void>;

beforeAll(async () => {
  // `persist: false` keeps the seeded object in memory for this process only, so the smoke needs
  // no on-disk fixture and cannot collide with the workerd-pool integration project's own bucket.
  const proxy = await getPlatformProxy({ configPath: './wrangler.test.jsonc', persist: false });
  platformEnv = proxy.env as Record<string, unknown>;
  dispose = proxy.dispose;
  const bucket = platformEnv.MEDIA_BUCKET as {
    put: (key: string, body: Uint8Array, opts?: unknown) => Promise<unknown>;
  };
  await bucket.put(KEY, BYTES, { httpMetadata: { contentType: 'image/png' } });
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe('media route under getPlatformProxy (Task T3)', () => {
  it('serves the seeded object 200 with the stored Content-Type through the RPC-proxy binding', async () => {
    const handler: RequestHandler = createMediaRoute(runtime(resolvedOn));
    const request = new Request(`https://site.example/media/${SLUG_PATH}`);
    const event = { params: { path: SLUG_PATH }, platform: { env: platformEnv }, request };

    const res = await handler(event as unknown as Parameters<RequestHandler>[0]);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });
});
