// Derive plain R2 option objects from a request's conditional and range headers.
//
// The delivery route used to pass the request's `Headers` instance straight through as both
// `onlyIf` and `range`. Production Workers accept that, but miniflare's `getPlatformProxy` magic
// proxy cannot serialize a `Headers` instance across its RPC boundary, so every `/media` read
// 500s under a consumer's `vite dev`. These functions derive the plain, structured-clone-safe
// shapes R2 also accepts, so the route never hands R2 a `Headers` instance.

/** A plain, structured-clone-safe form of R2's conditional-get options. */
export interface DerivedConditional {
  /** From `If-Match`: serve only when the stored etag matches. */
  etagMatches?: string;
  /** From `If-None-Match`: serve only when the stored etag does not match (the 304 path). */
  etagDoesNotMatch?: string;
  /** From `If-Modified-Since`. */
  uploadedAfter?: Date;
  /** From `If-Unmodified-Since`. */
  uploadedBefore?: Date;
  /** Set whenever a date field is present: HTTP dates carry only seconds granularity. */
  secondsGranularity?: boolean;
}

/** A plain, structured-clone-safe form of R2's ranged-get options: a single byte range. */
export interface DerivedRange {
  /** The starting byte offset, present for `bytes=a-b` and `bytes=a-`. */
  offset?: number;
  /** The window length in bytes, present only for `bytes=a-b`. */
  length?: number;
  /** The trailing byte count, present only for a suffix range `bytes=-n`. */
  suffix?: number;
}

/**
 * Strip a weak `W/` prefix and surrounding double quotes from a single etag, R2's `obj.etag`
 *  form (no quotes, no weak marker).
 */
function bareEtag(value: string): string {
  const trimmed = value.trim().replace(/^W\//, '');
  return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
}

/**
 * Derive a single bare etag from an `If-Match`/`If-None-Match` header value, or undefined when
 *  the value names several etags or `*`. A list or wildcard is safe to drop: R2 simply serves
 *  unconditionally, which only loses the 304/412 optimization, never correctness.
 */
function singleEtag(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === '*' || trimmed.includes(',')) return undefined;
  return bareEtag(trimmed);
}

/** Parse an HTTP date header into a `Date`, or undefined when it fails to parse. */
function parseHttpDate(value: string): Date | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Derive R2's `onlyIf` conditional-get option from a request's conditional headers, or undefined
 *  when none are present. The route passes the result straight to `bucket.get`, so every field is
 *  a plain value R2 also accepts, never a `Headers` instance.
 * @param headers - the incoming request's headers.
 */
export function deriveOnlyIf(headers: Headers): DerivedConditional | undefined {
  const conditional: DerivedConditional = {};

  const ifMatch = headers.get('If-Match');
  if (ifMatch !== null) {
    const etag = singleEtag(ifMatch);
    if (etag !== undefined) conditional.etagMatches = etag;
  }

  const ifNoneMatch = headers.get('If-None-Match');
  if (ifNoneMatch !== null) {
    const etag = singleEtag(ifNoneMatch);
    if (etag !== undefined) conditional.etagDoesNotMatch = etag;
  }

  const ifModifiedSince = headers.get('If-Modified-Since');
  if (ifModifiedSince !== null) {
    const date = parseHttpDate(ifModifiedSince);
    if (date !== undefined) conditional.uploadedAfter = date;
  }

  const ifUnmodifiedSince = headers.get('If-Unmodified-Since');
  if (ifUnmodifiedSince !== null) {
    const date = parseHttpDate(ifUnmodifiedSince);
    if (date !== undefined) conditional.uploadedBefore = date;
  }

  if (conditional.uploadedAfter !== undefined || conditional.uploadedBefore !== undefined) {
    conditional.secondsGranularity = true;
  }

  return Object.keys(conditional).length > 0 ? conditional : undefined;
}

/**
 * Derive R2's `range` ranged-get option from a request's `Range` header, or undefined for a
 *  multi-range or malformed value (both fall back to a full 200 response). Only a single
 *  `bytes=` range is supported, matching what the route ever asks the caller to parse.
 * @param value - the `Range` header's value (the caller checks presence with `headers.has`).
 */
export function deriveRange(value: string): DerivedRange | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return undefined;
  const [, startStr, endStr] = match;

  if (startStr === '' && endStr === '') return undefined;

  if (startStr === '') {
    // `bytes=-n`: a suffix range, the trailing n bytes.
    return { suffix: Number(endStr) };
  }

  const offset = Number(startStr);
  if (endStr === '') {
    // `bytes=a-`: from offset to the end.
    return { offset };
  }

  // `bytes=a-b`: an inclusive window. An end before the start is malformed, not a valid range.
  const end = Number(endStr);
  if (end < offset) return undefined;
  return { offset, length: end - offset + 1 };
}
