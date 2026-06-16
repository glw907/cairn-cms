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
