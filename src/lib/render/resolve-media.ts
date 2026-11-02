// cairn-cms: the media: reference resolver, an mdast step in the render pipeline. It mirrors the
// cairn: link resolver in ./resolve-links.ts: it runs before remark-rehype, so the rewritten src
// passes through the sanitize floor exactly as any other image. The per-call resolver is read off
// the VFile (set by render), so the processor is still built once. A miss either marks the
// image broken (preview) or throws (build), decided by the injected resolver.
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { parseMediaToken, type MediaRef } from '../media/reference.js';
import { findByHash, type MediaManifest } from '../media/manifest.js';
import { publicPath } from '../media/naming.js';
import { normalizeMedia } from '../media/config.js';
import type { MediaConfig } from '../content/types.js';
import { log } from '../log/index.js';
import { DEFAULT_MEDIA_BASE } from '../media/naming.js';
import { markNodeBroken, type ResolvableNode } from './resolve-shared.js';

/** The VFile data key the renderer sets the per-call media resolver under. */
export const MEDIA_RESOLVE = 'mediaResolve';

/**
 * The per-image layout detail beyond the plain delivery URL: known intrinsic dimensions, omitted
 *  when unknowable, never guessed.
 */
export interface MediaImageDetail {
  /** The asset's stored pixel width, when the manifest entry recorded one. */
  width?: number;
  /** The asset's stored pixel height, when the manifest entry recorded one. */
  height?: number;
}

/**
 * A `MediaResolve` enriched with the optional per-image detail side channel `createMediaResolver`
 *  attaches to its returned function. `remarkResolveMedia` reads it when present to emit
 *  width/height on the rendered `<img>`; a hand-rolled `resolveMedia` carries no such
 *  property and the image keeps resolving to its bare src exactly as before this detail existed. The
 *  `MediaResolve` calling contract itself, `(ref) => string | undefined`, never changes: this is a
 *  same-object side channel, not a widened return type, so an existing custom resolver and every
 *  existing caller of the plain string result (the frontmatter hero projection, for one) are
 *  unaffected.
 */
type MediaResolveWithDetail = MediaResolve & {
  imageDetail?: (ref: MediaRef) => MediaImageDetail | undefined;
};

/**
 * Resolve a media reference to its delivery URL. `undefined` is a preview miss (the plugin marks
 *  the image broken); a resolver that throws is the build backstop (the error propagates out of
 *  render and fails the build), exactly like LinkResolve.
 * @public
 */
export type MediaResolve = (ref: MediaRef) => string | undefined;

/**
 * Build the per-call media resolver, closing over the manifest and the site's media config. The
 *  returned resolver looks a ref's content hash up in the manifest and builds the canonical delivery
 *  path from the manifest entry's slug and ext, not the token's, so a rename never breaks the
 *  reference. It returns the bare full-size path. It returns undefined when
 *  media is off or no entry carries the hash (the preview-miss backstop), unless `opts.strict` makes
 *  a miss with media on throw.
 * @remarks
 * Pass the same `media` object the adapter receives, so the two normalizations agree. The resolved
 * `<img>` also gains intrinsic `width` and `height` when the entry recorded them; an unknown
 * dimension is left off, never guessed. A raw external image is untouched.
 * @public
 */
export function createMediaResolver(
  media: MediaConfig | undefined,
  manifest: MediaManifest,
  opts: {
    /**
     * Throw a `cairn:`-prefixed error on a hash with no manifest row while media is on, so a
     *  prerender or request-time render fails on a broken reference instead of shipping
     *  `src="#"`. Media off stays silent, and a preview passes its own resolver, so previews keep
     *  marking misses broken. Defaults to false.
     */
    strict?: boolean;
  } = {},
): MediaResolve {
  const resolved = normalizeMedia(media);
  const resolve: MediaResolveWithDetail = (ref: MediaRef): string | undefined => {
    if (!resolved.enabled) return undefined;
    const entry = findByHash(manifest, ref.hash);
    if (!entry) {
      if (opts.strict) throw new Error(`cairn: media asset "${ref.hash}" not found in the manifest`);
      // A real miss: media is on but the hash has no manifest row, the broken-reference case. The
      // media-off path above stays silent, since an unresolved token there is expected, not a fault.
      log.warn('media.resolve_missing', { hash: ref.hash });
      return undefined;
    }
    return publicPath(entry.slug, entry.hash, entry.ext);
  };
  // The side channel remarkResolveMedia reads for the rendered <img>'s width/height. Kept
  // separate from the resolve function's return so the MediaResolve contract stays exactly
  // `(ref) => string | undefined`.
  resolve.imageDetail = (ref: MediaRef): MediaImageDetail | undefined => {
    if (!resolved.enabled) return undefined;
    const entry = findByHash(manifest, ref.hash);
    if (!entry) return undefined;
    const detail: MediaImageDetail = {};
    if (entry.width !== null) detail.width = entry.width;
    if (entry.height !== null) detail.height = entry.height;
    return Object.keys(detail).length > 0 ? detail : undefined;
  };
  return resolve;
}

/**
 * A resolver backed by the lean `mediaTargets` projection, for the admin preview. It mirrors
 *  manifestLinkResolver: a hash present in the projection builds the slug delivery path
 *  (`<base>/<slug>.<hash>.<ext>`); a miss returns undefined, so the render step marks the image
 *  broken rather than throwing. Pure over the projection, with no manifest and no config, so the
 *  edit page reaches it with the data it actually has. The base defaults to the engine's
 *  `/media`, and only the reproductions context changes it.
 */
export function manifestMediaResolver(
  targets: Record<string, { slug: string; ext: string; contentType: string }>,
  base: string = DEFAULT_MEDIA_BASE,
): MediaResolve {
  return (ref: MediaRef): string | undefined => {
    const entry = targets[ref.hash];
    if (!entry) return undefined;
    return publicPath(entry.slug, ref.hash, entry.ext, base);
  };
}

// Merge a resolved MediaImageDetail onto the image node's hProperties: width/height whenever known.
// A no-op for an undefined or empty detail, the common case for a hand-rolled resolveMedia.
function applyImageDetail(node: ResolvableNode, detail: MediaImageDetail | undefined): void {
  if (!detail) return;
  const props: Record<string, unknown> = {};
  if (detail.width !== undefined) props.width = detail.width;
  if (detail.height !== undefined) props.height = detail.height;
  if (Object.keys(props).length === 0) return;
  node.data = node.data ?? {};
  node.data.hProperties = { ...node.data.hProperties, ...props };
}

/**
 * Resolve media: image nodes against the VFile's resolver. A non-media src and a malformed token
 *  pass through. A missing target is marked with the cairn-broken-media class (the resolver returns
 *  undefined) or, when the resolver throws, the error propagates and fails the build. When the
 *  resolver carries the imageDetail side channel (built-in createMediaResolver), the resolved image
 *  also gains intrinsic width/height when the manifest recorded them.
 */
export function remarkResolveMedia() {
  return (tree: unknown, file: VFile): void => {
    const resolve = file.data[MEDIA_RESOLVE] as MediaResolveWithDetail | undefined;
    if (!resolve) return;
    visit(tree as Parameters<typeof visit>[0], 'image', (node: ResolvableNode) => {
      const ref = parseMediaToken(node.url);
      if (!ref) return;
      const url = resolve(ref); // may throw (build backstop); propagates out of render
      if (url) {
        node.url = url;
        applyImageDetail(node, resolve.imageDetail?.(ref));
        return;
      }
      // Missing asset in the preview: mark it broken and neutralize the src, keeping the alt.
      markNodeBroken(node, 'cairn-broken-media', 'Missing media asset');
    });
  };
}
