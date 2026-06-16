// cairn-cms: the picker's human layer for one stored asset, the projection EditData carries on
// `mediaLibrary`. It is the media manifest's display facts (no sha256, no original filename, no
// createdAt) keyed by the 16-hex content hash, the shape the insert popover, the combobox picker,
// and the editor's source decoration all read.
//
// It lives in its own node-safe module (no @codemirror, no DOM, no @sveltejs/kit) so the three
// consumers share one declaration: editLoad projects it on EditData, MediaPicker and the insert
// popover type their library prop with it, and the editor-media decoration resolves a token against
// it. The editor-boundary test bars a static import from editor-media.ts (it pulls @codemirror), so
// the shared type cannot be sourced from there; this module is its neutral home. It is internal,
// exported from no package subpath, so it carries no reference page.

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
}

/** The projected library keyed by the 16-hex content hash, exactly EditData's `mediaLibrary`. */
export type MediaLibrary = Record<string, MediaLibraryEntry>;
