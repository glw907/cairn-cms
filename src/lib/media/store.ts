// cairn-cms: the media object store, a thin wrapper over the per-site R2 bucket binding. The media
// pipeline codes against the narrow MediaStore seam rather than the full R2Bucket API, so the four
// operations it needs (store, probe, read, remove a content-addressed object) are typed and testable
// against an in-memory double, and a later storage-backend swap touches this one factory. The bytes
// are content-addressed, so a put under an existing key is a harmless rewrite of identical bytes.
import type { R2Bucket, R2Object, R2ObjectBody, R2HTTPMetadata } from '@cloudflare/workers-types';

/** The narrow R2 surface the media pipeline uses. The engine depends on this, not on R2Bucket, so the
 *  multipart, list, and conditional-read surface R2 also carries never leaks into the media code. */
export interface MediaStore {
  /** Store bytes under a content-addressed key, with the response HTTP metadata (the content type). */
  put(key: string, bytes: ArrayBuffer | Uint8Array, httpMetadata?: R2HTTPMetadata): Promise<void>;
  /** The object's metadata, or null when no object lives at the key (the dedup probe). */
  head(key: string): Promise<R2Object | null>;
  /** The object body for streaming to a delivery response, or null when the key is absent. */
  get(key: string): Promise<R2ObjectBody | null>;
  /** Remove the object at the key. A delete of an absent key is a no-op, the R2 contract. */
  delete(key: string): Promise<void>;
}

/** Wrap an R2 bucket binding as a MediaStore. Each method delegates to the binding; put folds the
 *  HTTP metadata into R2's options shape and drops the returned R2Object the pipeline does not read. */
export function r2Store(bucket: R2Bucket): MediaStore {
  return {
    async put(key, bytes, httpMetadata) {
      await bucket.put(key, bytes, httpMetadata ? { httpMetadata } : undefined);
    },
    head: (key) => bucket.head(key),
    get: (key) => bucket.get(key),
    delete: (key) => bucket.delete(key),
  };
}
