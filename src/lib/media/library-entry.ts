// cairn-cms: the picker's human layer for one stored asset, the projection EditData carries on
// `mediaLibrary`. It is the media manifest's display facts (no sha256, no original filename) keyed by
// the 16-hex content hash, the shape the insert popover, the combobox picker, the editor's source
// decoration, and the Library screen all read.
//
// It lives in its own node-safe module (no @codemirror, no DOM, no @sveltejs/kit) so the consumers
// share one declaration: editLoad and mediaLibraryLoad both project it through `mediaLibraryEntry`,
// MediaPicker types its entries prop with it, the insert popover its library prop, and the
// editor-media decoration resolves a token against it. The editor-boundary test bars a static import from
// editor-media.ts (it pulls @codemirror), so the shared type cannot be sourced from there; this
// module is its neutral home.
//
// The two halves have different visibility. The `MediaLibraryEntry` TYPE is public: its canonical
// home is `/admin-toolkit`, beside MediaPicker, whose prop signature names it, and `/sveltekit`
// re-exports it as R4 closure over `MediaLibraryData.assets`. Both entries are documented on those
// subpaths' reference pages. The `mediaLibraryEntry` FUNCTION and the `MediaLibrary` alias stay
// internal, exported from no package subpath: a site holds the loader's array and projects it
// inline where it needs a hash lookup.
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
 *
 *  This is also the one place the manifest's `alt` is normalized. `parseMediaManifest` trusts a
 *  committed or branch manifest file wholesale (unlike `parseMediaEntries`, which validates a
 *  client-posted row field by field), so a hand-edited or older-schema `media.json` can carry a
 *  null or missing `alt` even though `MediaEntry` types it as `string`. Coercing here, the sole
 *  construction site for `MediaLibraryEntry`, guarantees every consumer (the Library screen, the
 *  picker, the insert popover) sees a real string and never has to guard against the impossible
 *  type again.
 */
export function mediaLibraryEntry(entry: MediaEntry): MediaLibraryEntry {
  return {
    hash: entry.hash,
    slug: entry.slug,
    ext: entry.ext,
    contentType: entry.contentType,
    displayName: entry.displayName,
    alt: (entry.alt as string | null | undefined) ?? '',
    width: entry.width,
    height: entry.height,
    bytes: entry.bytes,
    createdAt: entry.createdAt,
  };
}
