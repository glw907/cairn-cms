import { describe, it, expect } from 'vitest';
import type { R2Bucket, R2HTTPMetadata } from '@cloudflare/workers-types';
import { r2Store } from '../../lib/media/store.js';

// An in-memory R2 bucket double: just the four methods r2Store delegates to, over a Map. Cast to
// R2Bucket so r2Store accepts it, the way the auth tests cast a minimal D1 double.
function fakeBucket(): R2Bucket {
  const objects = new Map<string, { bytes: ArrayBuffer; httpMetadata?: R2HTTPMetadata }>();
  return {
    async put(key: string, value: ArrayBuffer, options?: { httpMetadata?: R2HTTPMetadata }) {
      objects.set(key, { bytes: value, httpMetadata: options?.httpMetadata });
      return { key, size: value.byteLength };
    },
    async head(key: string) {
      const e = objects.get(key);
      return e ? { key, size: e.bytes.byteLength, httpMetadata: e.httpMetadata } : null;
    },
    async get(key: string) {
      const e = objects.get(key);
      return e ? { key, arrayBuffer: async () => e.bytes } : null;
    },
    async delete(key: string) {
      objects.delete(key);
    },
  } as unknown as R2Bucket;
}

describe('r2Store', () => {
  const KEY = 'media/a1/a1b2c3d4e5f6a7b8.webp';

  it('round-trips put, head, get, and delete without a network', async () => {
    const store = r2Store(fakeBucket());
    const bytes = new TextEncoder().encode('the bytes').buffer;

    // Absent before the put.
    expect(await store.head(KEY)).toBeNull();
    expect(await store.get(KEY)).toBeNull();

    await store.put(KEY, bytes, { contentType: 'image/webp' });

    // Present after the put, with the byte size carried.
    const head = await store.head(KEY);
    expect(head).not.toBeNull();
    expect(head?.size).toBe(bytes.byteLength);

    // The body reads back the exact bytes.
    const body = await store.get(KEY);
    expect(body).not.toBeNull();
    const read = await body!.arrayBuffer();
    expect(new Uint8Array(read)).toEqual(new Uint8Array(bytes));

    // Gone after the delete.
    await store.delete(KEY);
    expect(await store.head(KEY)).toBeNull();
    expect(await store.get(KEY)).toBeNull();
  });

  it('carries the HTTP metadata through put to head', async () => {
    const store = r2Store(fakeBucket());
    await store.put(KEY, new TextEncoder().encode('x').buffer, { contentType: 'image/avif' });
    const head = await store.head(KEY);
    expect(head?.httpMetadata?.contentType).toBe('image/avif');
  });

  it('treats a delete of an absent key as a no-op', async () => {
    const store = r2Store(fakeBucket());
    await expect(store.delete('media/zz/missing.webp')).resolves.toBeUndefined();
  });
});
