// cairn-cms: the picker's human layer for one stored asset, the projection EditData carries on
// `mediaLibrary`. It is the media manifest's display facts (no sha256, no original filename) keyed by
// the 16-hex content hash, the shape the insert popover, the combobox picker, the editor's source
// decoration, and the Library screen all read.
//
// It lives in its own node-safe module (no @codemirror, no DOM, no @sveltejs/kit) so the consumers
// share one declaration: editLoad and mediaLibraryLoad both project it through `mediaLibraryEntry`,
// MediaPicker and the insert popover type their library prop with it, and the editor-media
// decoration resolves a token against it. The editor-boundary test bars a static import from
// editor-media.ts (it pulls @codemirror), so the shared type cannot be sourced from there; this
// module is its neutral home. It is internal, exported from no package subpath, so it carries no
// reference page.
import type { MediaEntry } from './manifest.js';

/** One stored asset in the picker's projected library, keyed elsewhere by the 16-hex content hash. */
export interface MediaLibraryEntry {
  /** The 16-hex content-hash prefix that names the bytes. */
  hash: string;
  /** The cosmetic display slug in the media: token and the delivery path. */
  slug: string;
  /** The bare file extension (no dot), for example `webp`. */
  ext: string;
  /** The stored MIME type, for example `image/webp`; its top-level part drives the type facet. */
  contentType: string;
  /** The editable human name shown on the row. */
  displayName: string;
  /** The manifest alt, prefilled into a new placement; empty is the needs-alt signal. */
  alt: string;
  /** The pixel width, or null when the manifest carries none. */
  width: number | null;
  /** The pixel height, or null when the manifest carries none. */
  height: number | null;
  /** The stored byte size. */
  bytes: number;
  /** The ISO timestamp the bytes were first stored, the Library's sortable "Added" column. */
  createdAt: string;
}

/** The projected library keyed by the 16-hex content hash, exactly EditData's `mediaLibrary`. */
export type MediaLibrary = Record<string, MediaLibraryEntry>;

/**
 * Project a stored MediaEntry to the picker's MediaLibraryEntry, copying every display field and
 *  dropping the source-only sha256 and original filename. The single projection editLoad and
 *  mediaLibraryLoad both call, so the popover and the Library never diverge on the shared shape.
 */
export function mediaLibraryEntry(entry: MediaEntry): MediaLibraryEntry {
  return {
    hash: entry.hash,
    slug: entry.slug,
    ext: entry.ext,
    contentType: entry.contentType,
    displayName: entry.displayName,
    alt: entry.alt,
    width: entry.width,
    height: entry.height,
    bytes: entry.bytes,
    createdAt: entry.createdAt,
  };
}
