// A dev-only MEDIA_BUCKET double for the showcase, the R2 sibling of fake-auth-db.ts and
// fake-github.ts. It models the slice of the R2 bucket API the engine reads: the upload action's
// put/head (through the narrow MediaStore seam) and the delivery route's conditional, optionally
// ranged get (through the DeliveryBucket seam). Bytes live in an in-memory Map keyed by the object
// key, one instance per server lifetime, so an asset uploaded through /admin streams back from
// /media in the same dev session. Installed from hooks.server.ts as platform.env.MEDIA_BUCKET;
// never part of the published engine.
//
// The shapes here are a structural subset of the real R2 surface, the same way the engine's
// DeliveryBucket and MediaStore seams are. The engine reads platform.env structurally, so this
// double needs no @cloudflare/workers-types name.

/** One stored object: the bytes plus the HTTP metadata a put recorded. */
interface StoredObject {
  bytes: Uint8Array;
  contentType?: string;
  cacheControl?: string;
}

/** The put options the upload action passes (R2's { httpMetadata } shape). */
interface PutOptions {
  httpMetadata?: { contentType?: string; cacheControl?: string };
}

/** The get options the delivery route passes: a conditional read and an optional byte range, each a
 *  Headers the engine forwards from the request. */
interface GetOptions {
  onlyIf?: Headers | { etagDoesNotMatch?: string };
  range?: Headers | { offset?: number; length?: number };
}

/** A returned R2-like object. Carries the metadata the delivery route reads and, on a full or ranged
 *  read, the body stream. A body-less object is the If-None-Match hit (the 304 shape). */
interface FakeR2Object {
  size: number;
  httpEtag: string;
  etag: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  range?: { offset?: number; length?: number };
  body?: ReadableStream<Uint8Array>;
  writeHttpMetadata(headers: Headers): void;
}

export interface FakeR2Bucket {
  put(key: string, bytes: ArrayBuffer | Uint8Array, opts?: PutOptions): Promise<FakeR2Object>;
  head(key: string): Promise<FakeR2Object | null>;
  get(key: string, opts?: GetOptions): Promise<FakeR2Object | null>;
  list(opts?: { prefix?: string }): Promise<{ objects: { key: string }[]; truncated: false; cursor: undefined }>;
  delete(key: string): Promise<void>;
  /** Dev-only: seed an object's bytes under an R2 object key, so the Media Library lists a committed
   *  asset whose thumbnail resolves and whose orphan delete removes real bytes. Not part of the real
   *  R2 surface; the showcase calls it once at startup from hooks.server.ts. */
  seedObject(key: string): void;
}

/** Stable, content-shaped etag: a quoted hash of the key and size, enough for an If-None-Match round
 *  trip in dev. R2's real etag is the md5 of the bytes, which the dev double does not need. */
function makeEtag(key: string, size: number): string {
  let h = 0;
  for (const ch of `${key}:${size}`) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `"${(h >>> 0).toString(16)}"`;
}

/** A one-chunk readable stream over the bytes, the body shape a Response streams. */
function streamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function toBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

/** A tiny but real PNG (the 8-byte signature plus four zero bytes), enough for the delivery route to
 *  stream a 200 with image bytes. The Media Library E2E seeds one per asset hash so a thumbnail
 *  resolves and an orphan delete removes real bytes. */
const SEED_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

export function createFakeR2(): FakeR2Bucket {
  const store = new Map<string, StoredObject>();

  /** Seed one object's bytes under an R2 object key, so the Media Library lists a committed asset
   *  whose thumbnail resolves through the /media route. The bytes are a tiny real PNG; the content
   *  type matches the seeded media.json row. */
  function seed(key: string): void {
    store.set(key, { bytes: SEED_PNG, contentType: 'image/png' });
  }

  /** Build the returned object for a stored entry, optionally with its body and a served range. */
  function objectFor(key: string, obj: StoredObject, withBody: boolean, range?: { offset?: number; length?: number }): FakeR2Object {
    const etag = makeEtag(key, obj.bytes.length);
    const httpMetadata = obj.contentType || obj.cacheControl
      ? { contentType: obj.contentType, cacheControl: obj.cacheControl }
      : undefined;
    const out: FakeR2Object = {
      size: obj.bytes.length,
      httpEtag: etag,
      etag,
      httpMetadata,
      writeHttpMetadata(headers: Headers) {
        if (obj.contentType) headers.set('Content-Type', obj.contentType);
        if (obj.cacheControl) headers.set('Cache-Control', obj.cacheControl);
      },
    };
    if (range) out.range = range;
    if (withBody) {
      const offset = range?.offset ?? 0;
      const length = range?.length ?? obj.bytes.length - offset;
      const slice = range ? obj.bytes.subarray(offset, offset + length) : obj.bytes;
      out.body = streamOf(slice);
    }
    return out;
  }

  return {
    async put(key, bytes, opts) {
      store.set(key, {
        bytes: toBytes(bytes),
        contentType: opts?.httpMetadata?.contentType,
        cacheControl: opts?.httpMetadata?.cacheControl,
      });
      return objectFor(key, store.get(key)!, false);
    },

    async head(key) {
      const obj = store.get(key);
      return obj ? objectFor(key, obj, false) : null;
    },

    async get(key, opts) {
      const obj = store.get(key);
      if (!obj) return null;
      const etag = makeEtag(key, obj.bytes.length);

      // Conditional read: an If-None-Match that matches the stored etag returns the body-less object
      // (the route turns that into a 304). The route forwards the request Headers as onlyIf.
      if (opts?.onlyIf instanceof Headers) {
        const inm = opts.onlyIf.get('If-None-Match');
        if (inm && inm === etag) return objectFor(key, obj, false);
      }

      // Ranged read: parse a single `bytes=start-end` from the forwarded Range header.
      if (opts?.range instanceof Headers) {
        const header = opts.range.get('Range');
        const m = header ? /^bytes=(\d+)-(\d*)$/.exec(header) : null;
        if (m) {
          const start = Number(m[1]);
          const end = m[2] === '' ? obj.bytes.length - 1 : Number(m[2]);
          return objectFor(key, obj, true, { offset: start, length: end - start + 1 });
        }
      }

      return objectFor(key, obj, true);
    },

    async list(opts) {
      const prefix = opts?.prefix ?? '';
      const objects = [...store.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key }));
      return { objects, truncated: false, cursor: undefined };
    },

    async delete(key) {
      store.delete(key);
    },

    seedObject(key) {
      seed(key);
    },
  };
}
