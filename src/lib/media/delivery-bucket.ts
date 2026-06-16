// A narrow structural seam over the R2 bucket, modelling only what the delivery route reads.
//
// The route needs conditional and ranged gets, which the narrow MediaStore seam cannot express, so
// it talks to the raw bucket. It must not name any `@cloudflare/workers-types` type (`R2Bucket`,
// `R2Object`, `R2ObjectBody`, `R2HTTPMetadata`): that package is a devDependency the engine builds
// against but a consumer does not have, so any such name in a public `.d.ts` would break a consumer
// build that lacks `skipLibCheck`. `Headers`, `ReadableStream`, and `Response` are web globals, not
// workers-types, so they are safe on the public surface. `requireBucket` casts the real R2 binding
// to `DeliveryBucket` through `unknown`; the shapes below are a structural subset of the real R2 API.

/** A stored object without its body: the shape an `If-None-Match` hit or a metadata read returns. */
export interface DeliveryObject {
  /** Writes the stored HTTP metadata (Content-Type, Cache-Control, and so on) onto `headers`. */
  writeHttpMetadata(headers: Headers): void;
  /** The strong validator R2 stored for the bytes, set as the response `ETag`. */
  httpEtag: string;
  /** The full object size in bytes, the denominator of a `Content-Range`. */
  size: number;
  /** Present only on a ranged read: the served window, used to build the `Content-Range`. R2 fills
   *  both fields for a `bytes=start-end` request; each is typed optional so the route derives the
   *  range bounds defensively against `size`. */
  range?: { offset?: number; length?: number };
}

/** A stored object with its readable body, the shape a full or ranged read returns. */
export interface DeliveryObjectBody extends DeliveryObject {
  body: ReadableStream;
}

/** The bucket surface the delivery route reads: a single conditional, optionally ranged, get. */
export interface DeliveryBucket {
  get(
    key: string,
    opts?: {
      /** R2 reads `If-None-Match`/`If-Match` from a passed `Headers`; the route forwards the request's. */
      onlyIf?: { etagDoesNotMatch?: string } | Headers;
      /** The byte window to serve; the route parses it from the request `Range` header. */
      range?: { offset?: number; length?: number } | Headers;
    },
  ): Promise<DeliveryObjectBody | DeliveryObject | null>;
}
