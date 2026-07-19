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

/** The put options the upload action passes (R2's httpMetadata shape). */
interface PutOptions {
  httpMetadata?: { contentType?: string; cacheControl?: string };
}

/**
 * The get options the delivery route passes: a conditional read and an optional byte range, each a
 * Headers the engine forwards from the request.
 */
interface GetOptions {
  onlyIf?: Headers | { etagDoesNotMatch?: string };
  range?: Headers | { offset?: number; length?: number };
}

/**
 * A returned R2-like object. Carries the metadata the delivery route reads and, on a full or ranged
 * read, the body stream. A body-less object is the If-None-Match hit (the 304 shape).
 */
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
  /**
   * Dev-only: seed an object's bytes under an R2 object key, so the Media Library lists a committed
   * asset whose thumbnail resolves and whose orphan delete removes real bytes. Not part of the real
   * R2 surface; the showcase calls it once at startup from hooks.server.ts.
   */
  seedObject(key: string): void;
}

/**
 * Stable, content-shaped etag: a quoted hash of the key and size, enough for an If-None-Match round
 * trip in dev. R2's real etag is the md5 of the bytes, which the dev double does not need.
 */
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

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const SEED_PNG_SIZE = 8;

/** CRC-32 of a byte range, the checksum every PNG chunk trailer carries. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Adler-32 of a byte range, the checksum a zlib stream trails its compressed data with. */
function adler32(bytes: Uint8Array): number {
  const MOD_ADLER = 65521;
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }
  return ((b << 16) | a) >>> 0;
}

/** Build one length-prefixed, CRC-trailed PNG chunk from its four-letter type and data payload. */
function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);

  const out = new Uint8Array(4 + body.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length, false);
  out.set(body, 4);
  view.setUint32(4 + body.length, crc32(body), false);
  return out;
}

/**
 * Wrap raw bytes as a zlib stream using a single uncompressed (stored) DEFLATE block: the
 * two-byte zlib header, the stored-block header plus its length pair, the raw bytes, then the
 * Adler-32 trailer. Valid input to any zlib inflater without a compression library.
 */
function zlibStore(raw: Uint8Array): Uint8Array {
  const out = new Uint8Array(2 + 1 + 4 + raw.length + 4);
  const view = new DataView(out.buffer);
  out[0] = 0x78; // CMF: deflate, 32k window
  out[1] = 0x01; // FLG: fastest, no preset dictionary (0x7801 % 31 === 0)
  out[2] = 0x01; // DEFLATE stored-block header: BFINAL=1, BTYPE=00 (stored)
  view.setUint16(3, raw.length, true);
  view.setUint16(5, (~raw.length) & 0xffff, true);
  out.set(raw, 7);
  view.setUint32(7 + raw.length, adler32(raw), false);
  return out;
}

/**
 * Deterministically derive a solid RGB fill from an object key, the same string-hash shape as
 * makeEtag, so distinct seeded assets read as distinct colors in the Media Library grid.
 */
function colorForKey(key: string): [number, number, number] {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const u = h >>> 0;
  return [(u >> 16) & 0xff, (u >> 8) & 0xff, u & 0xff];
}

/**
 * Build a small, valid, solid-color PNG for a seeded object key (signature, IHDR, IDAT, IEND),
 * enough for a browser to decode a real thumbnail. No compression library: the IDAT payload is an
 * uncompressed zlib stream, which every PNG decoder accepts.
 */
function makeSeedPng(key: string): Uint8Array {
  const [r, g, b] = colorForKey(key);
  const bytesPerRow = 1 + SEED_PNG_SIZE * 3; // filter byte + RGB per pixel
  const raw = new Uint8Array(bytesPerRow * SEED_PNG_SIZE);
  for (let row = 0; row < SEED_PNG_SIZE; row++) {
    const rowStart = row * bytesPerRow;
    raw[rowStart] = 0; // filter type: none
    for (let col = 0; col < SEED_PNG_SIZE; col++) {
      const pixelStart = rowStart + 1 + col * 3;
      raw[pixelStart] = r;
      raw[pixelStart + 1] = g;
      raw[pixelStart + 2] = b;
    }
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, SEED_PNG_SIZE, false); // width
  ihdrView.setUint32(4, SEED_PNG_SIZE, false); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  const signature = new Uint8Array(PNG_SIGNATURE);
  const ihdrChunk = pngChunk('IHDR', ihdr);
  const idatChunk = pngChunk('IDAT', zlibStore(raw));
  const iendChunk = pngChunk('IEND', new Uint8Array(0));

  const out = new Uint8Array(signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let offset = 0;
  for (const part of [signature, ihdrChunk, idatChunk, iendChunk]) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Build the in-memory R2 stand-in the showcase binds as the media bucket in dev. */
export function createFakeR2(): FakeR2Bucket {
  const store = new Map<string, StoredObject>();

  /**
   * Seed one object's bytes under an R2 object key, so the Media Library lists a committed asset
   * whose thumbnail resolves through the /media route. The bytes are a small, valid, solid-color
   * PNG a browser can decode, colored deterministically from the key so distinct assets read as
   * distinct tiles; the content type matches the seeded media.json row.
   */
  function seed(key: string): void {
    store.set(key, { bytes: makeSeedPng(key), contentType: 'image/png' });
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
