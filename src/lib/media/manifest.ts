// cairn-cms: the media manifest, a small git-committed record with one row per stored asset. It
// carries the human layer that the bytes cannot (display name, alt text, original filename) and is
// the dedup lookup: an ingest checks the content-hash prefix here before storing, so the same bytes
// are never stored twice. It mirrors the content manifest in ../content/manifest.ts, keyed by the
// 16-hex content-hash prefix rather than concept and id.

/** One stored asset's row: its content hash, its human layer, and its byte and pixel facts. The
 *  `contentType` is the stored MIME type, so the delivery route serves it verbatim rather than
 *  guessing from the extension. `width` and `height` are null when no dimensions are known (the
 *  client is the only dimension source and a Worker cannot re-derive them). */
export interface MediaEntry {
  hash: string;
  sha256: string;
  slug: string;
  displayName: string;
  originalFilename: string;
  alt: string;
  ext: string;
  contentType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

/** The whole stored-asset record, keyed by the 16-hex content-hash prefix. */
export type MediaManifest = Record<string, MediaEntry>;

/** Parse a committed media manifest. Tolerant: an empty, missing, null, or non-object input yields
 *  an empty manifest, so a first ingest into a site with no manifest file reads a clean {}. A valid
 *  object is returned as the manifest. */
export function parseMediaManifest(json: unknown): MediaManifest {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  return json as MediaManifest;
}

/** Validate one posted value as a MediaEntry, returning it narrowed or undefined. The trust boundary
 *  for an optimistic record the client re-posts: the upload action server-owned each field at
 *  creation, but a re-post is untrusted, so every field is re-checked. A `hash` must be the 16-hex
 *  content-hash prefix; the string fields must be strings; `bytes` must be finite; `width`/`height`
 *  must each be a number or null; `createdAt` must be a string. */
function validateMediaEntry(value: unknown): MediaEntry | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const e = value as Record<string, unknown>;
  const isString = (v: unknown): v is string => typeof v === 'string';
  const isNumOrNull = (v: unknown): v is number | null => v === null || typeof v === 'number';
  if (typeof e.hash !== 'string' || !/^[0-9a-f]{16}$/.test(e.hash)) return undefined;
  if (!isString(e.sha256)) return undefined;
  if (!isString(e.slug) || !isString(e.displayName) || !isString(e.originalFilename)) return undefined;
  if (!isString(e.alt) || !isString(e.ext) || !isString(e.contentType)) return undefined;
  if (typeof e.bytes !== 'number' || !Number.isFinite(e.bytes)) return undefined;
  if (!isNumOrNull(e.width) || !isNumOrNull(e.height)) return undefined;
  if (!isString(e.createdAt)) return undefined;
  return {
    hash: e.hash,
    sha256: e.sha256,
    slug: e.slug,
    displayName: e.displayName,
    originalFilename: e.originalFilename,
    alt: e.alt,
    ext: e.ext,
    contentType: e.contentType,
    bytes: e.bytes,
    width: e.width,
    height: e.height,
    createdAt: e.createdAt,
  };
}

/** Parse the posted `media` field into a validated list of MediaEntry rows. The field arrives as a
 *  JSON string (the usual form-post shape), an already-parsed array, or junk. A string is JSON-parsed
 *  inside a try/catch that yields `[]` on a parse failure; a non-string array is taken directly;
 *  anything else yields `[]`. Each element is validated and a failing element is dropped, so a partly
 *  malformed post still lands its good rows. This is the trust boundary for the client's optimistic
 *  records. */
export function parseMediaEntries(value: unknown): MediaEntry[] {
  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const entries: MediaEntry[] = [];
  for (const item of raw) {
    const entry = validateMediaEntry(item);
    if (entry) entries.push(entry);
  }
  return entries;
}

/** The dedup lookup: the entry stored under the content-hash prefix, or undefined when no bytes with
 *  that hash are stored yet. */
export function findByHash(manifest: MediaManifest, hash: string): MediaEntry | undefined {
  return manifest[hash];
}

/** Set the entry under its own hash, replacing any same-hash row. Returns a new manifest and leaves
 *  the input untouched, so a caller's prior manifest reference stays valid. The ingest path's patch. */
export function upsertMediaEntry(manifest: MediaManifest, entry: MediaEntry): MediaManifest {
  return { ...manifest, [entry.hash]: entry };
}

/** Serialize canonically: the top-level hash keys sorted ascending, two-space pretty, and a trailing
 *  newline, so the committed file diffs cleanly in a PR and a re-serialization is byte-identical. */
export function serializeMediaManifest(manifest: MediaManifest): string {
  const sorted: MediaManifest = {};
  for (const hash of Object.keys(manifest).sort()) {
    sorted[hash] = manifest[hash];
  }
  return `${JSON.stringify(sorted, null, 2)}\n`;
}
