import { describe, it, expect } from 'vitest';
import type {
  R2Bucket,
  R2Conditional,
  R2HTTPMetadata,
  R2ObjectBody,
  R2Range,
} from '@cloudflare/workers-types';
import { r2Store } from '../../lib/media/store.js';

// An in-memory R2 bucket double: just the four methods r2Store delegates to, over a Map. Cast to
// R2Bucket so r2Store accepts it, the way the auth tests cast a minimal D1 double. get honors the
// onlyIf and range conditional options so the delivery 304 and 206 shapes can be exercised through
// the seam: an etag-matched onlyIf returns a body-less R2Object, and a range returns a partial body.
function fakeBucket(): R2Bucket {
  const objects = new Map<string, { bytes: ArrayBuffer; etag: string; httpMetadata?: R2HTTPMetadata }>();
  return {
    async put(key: string, value: ArrayBuffer, options?: { httpMetadata?: R2HTTPMetadata }) {
      objects.set(key, { bytes: value, etag: 'etag-of-' + key, httpMetadata: options?.httpMetadata });
      return { key, size: value.byteLength };
    },
    async head(key: string) {
      const e = objects.get(key);
      return e ? { key, size: e.bytes.byteLength, httpMetadata: e.httpMetadata } : null;
    },
    async get(key: string, options?: { onlyIf?: R2Conditional; range?: R2Range }) {
      const e = objects.get(key);
      if (!e) return null;
      // An onlyIf etagMatches hit returns a body-less R2Object (the 304 shape): no arrayBuffer.
      if (options?.onlyIf && 'etagMatches' in options.onlyIf && options.onlyIf.etagMatches === e.etag) {
        return { key, size: e.bytes.byteLength, etag: e.etag };
      }
      // A range request returns a partial body (the 206 shape).
      if (options?.range && 'offset' in options.range) {
        const off = options.range.offset ?? 0;
        const len = 'length' in options.range && options.range.length != null
          ? options.range.length
          : e.bytes.byteLength - off;
        const slice = e.bytes.slice(off, off + len);
        return { key, size: e.bytes.byteLength, etag: e.etag, range: options.range, arrayBuffer: async () => slice };
      }
      return { key, size: e.bytes.byteLength, etag: e.etag, arrayBuffer: async () => e.bytes };
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

    // The body reads back the exact bytes. A plain get (no onlyIf) always returns a body, but the
    // widened union does not know that, so narrow to the body shape here.
    const body = (await store.get(KEY)) as R2ObjectBody | null;
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

  it('passes an onlyIf etag match through, yielding the body-less 304 shape', async () => {
    const store = r2Store(fakeBucket());
    await store.put(KEY, new TextEncoder().encode('the bytes').buffer, { contentType: 'image/webp' });

    // An etag that matches the stored object: R2 returns a body-less R2Object (no arrayBuffer).
    const result = await store.get(KEY, { onlyIf: { etagMatches: 'etag-of-' + KEY } });
    expect(result).not.toBeNull();
    expect((result as { arrayBuffer?: unknown }).arrayBuffer).toBeUndefined();
    expect((result as { size: number }).size).toBe('the bytes'.length);
  });

  it('passes a range through, yielding the partial-body 206 shape', async () => {
    const store = r2Store(fakeBucket());
    const bytes = new TextEncoder().encode('the bytes').buffer;
    await store.put(KEY, bytes, { contentType: 'image/webp' });

    // A range read returns a body whose bytes are the requested slice.
    const result = await store.get(KEY, { range: { offset: 4, length: 5 } });
    expect(result).not.toBeNull();
    const body = result as { arrayBuffer: () => Promise<ArrayBuffer> };
    const read = new Uint8Array(await body.arrayBuffer());
    expect(new TextDecoder().decode(read)).toBe('bytes');
  });
});
