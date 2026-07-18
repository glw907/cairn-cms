// cairn-cms: the media: reference resolver, an mdast step in the render pipeline. It mirrors the
// cairn: link resolver in ./resolve-links.ts: it runs before remark-rehype, so the rewritten src
// passes through the sanitize floor exactly as any other image. The per-call resolver is read off
// the VFile (set by renderMarkdown), so the processor is still built once. A miss either marks the
// image broken (preview) or throws (build), decided by the injected resolver.
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';
import { parseMediaToken, type MediaRef } from '../media/reference.js';
import { findByHash, type MediaManifest } from '../media/manifest.js';
import { publicPath } from '../media/naming.js';
import { presetUrl, variantUrl } from '../media/transform-url.js';
import type { ResolvedAssetConfig } from '../media/config.js';
import { log } from '../log/index.js';
import { markNodeBroken, type ResolvableNode } from './resolve-shared.js';

/** The VFile data key the renderer sets the per-call media resolver under. */
export const MEDIA_RESOLVE = 'mediaResolve';

/**
 * The fixed width ladder a managed image's srcset offers once zone transformations are on and the
 *  asset's own width is known. Small and fixed rather than derived per-asset, so the delivered
 *  variant set stays predictable and cache-friendly across a site; a rung wider than the asset's
 *  recorded width is dropped, since Cloudflare Images would otherwise upscale past the source.
 */
const SRCSET_WIDTHS = [400, 800, 1200, 1600];

/**
 * The generic `sizes` hint per figure placement role, in the engine's own placement vocabulary
 *  (remarkFigure's closed `center`/`wide`/`full` role set), not any one theme's exact breakpoints:
 *  cairn's public render stays design-agnostic, so this is a reasonable general convention rather
 *  than a value tuned to a specific site's CSS. A role outside this map (a bare `:::figure` with no
 *  class, or an image with no figure at all) falls back to the safe worst-case assumption that the
 *  image may render the full viewport width.
 */
const SIZES_BY_ROLE: Record<string, string> = {
  center: '(min-width: 800px) 800px, 100vw',
  wide: '(min-width: 1200px) 1200px, 100vw',
  full: '100vw',
};

/**
 * The per-image layout and responsive-delivery detail beyond the plain delivery URL: known intrinsic
 *  dimensions and, with zone transformations on and a known width, a width-ladder srcset. Both are
 *  omitted when unknowable, never guessed.
 */
export interface MediaImageDetail {
  /** The asset's stored pixel width, when the manifest entry recorded one. */
  width?: number;
  /** The asset's stored pixel height, when the manifest entry recorded one. */
  height?: number;
  /**
   * The `srcset` candidate list, built from `SRCSET_WIDTHS` through the existing variant-URL
   *  mechanism. Present only when transformations are on and the asset's width is known and wide
   *  enough to offer more than one honest candidate.
   */
  srcSet?: string;
}

/**
 * A `MediaResolve` enriched with the optional per-image detail side channel `makeMediaResolver`
 *  attaches to its returned function. `remarkResolveMedia` reads it when present to emit
 *  width/height/srcset/sizes on the rendered `<img>`; a hand-rolled `resolveMedia` carries no such
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
 */
export type MediaResolve = (ref: MediaRef) => string | undefined;

/**
 * Build the per-call media resolver, closing over the manifest and the resolved config. The
 *  returned resolver looks a ref's content hash up in the manifest and builds the canonical delivery
 *  path from the manifest entry's slug and ext, not the token's, so a rename never breaks the
 *  reference. With a preset and zone transformations on it returns the variant URL; without a preset,
 *  or when transformations are off, it returns the bare full-size path so a fresh zone with Image
 *  Transformations disabled serves correct thumbnails rather than dead /cdn-cgi/image URLs. It returns
 *  undefined when media is off or no entry carries the hash (the preview-miss backstop).
 */
export function makeMediaResolver(
  manifest: MediaManifest,
  resolved: ResolvedAssetConfig,
  opts?: { preset?: string },
): MediaResolve {
  const resolve: MediaResolveWithDetail = (ref: MediaRef): string | undefined => {
    if (!resolved.enabled) return undefined;
    const entry = findByHash(manifest, ref.hash);
    if (!entry) {
      // A real miss: media is on but the hash has no manifest row, the broken-reference case. The
      // media-off path above stays silent, since an unresolved token there is expected, not a fault.
      log.warn('media.resolve_missing', { hash: ref.hash });
      return undefined;
    }
    const path = publicPath(entry.slug, entry.hash, entry.ext, resolved.urlForm, resolved.publicBase);
    if (opts?.preset && resolved.transformations) {
      return presetUrl(path, opts.preset, resolved.variants);
    }
    return path;
  };
  // The side channel remarkResolveMedia reads for the rendered <img>'s width/height/srcset. Kept
  // separate from the resolve function's own return so the MediaResolve contract stays exactly
  // `(ref) => string | undefined`.
  resolve.imageDetail = (ref: MediaRef): MediaImageDetail | undefined => {
    if (!resolved.enabled) return undefined;
    const entry = findByHash(manifest, ref.hash);
    if (!entry) return undefined;
    const detail: MediaImageDetail = {};
    if (entry.width !== null) detail.width = entry.width;
    if (entry.height !== null) detail.height = entry.height;
    if (resolved.transformations && entry.width !== null) {
      const width = entry.width;
      const path = publicPath(entry.slug, entry.hash, entry.ext, resolved.urlForm, resolved.publicBase);
      const widths = SRCSET_WIDTHS.filter((w) => w <= width);
      // Fewer than two candidates is a single-source srcset, no more honest than no srcset at all.
      if (widths.length > 1) {
        detail.srcSet = widths.map((w) => `${variantUrl(path, { width: w })} ${w}w`).join(', ');
      }
    }
    return Object.keys(detail).length > 0 ? detail : undefined;
  };
  return resolve;
}

/**
 * A resolver backed by the lean `mediaTargets` projection, for the admin preview. It mirrors
 *  manifestLinkResolver: a hash present in the projection builds the slug delivery path
 *  (`/media/<slug>.<hash>.<ext>`); a miss returns undefined, so the render step marks the image
 *  broken rather than throwing. Pure over the projection, with no manifest and no config, so the
 *  edit page reaches it with the data it actually has.
 */
export function manifestMediaResolver(
  targets: Record<string, { slug: string; ext: string; contentType: string }>,
): MediaResolve {
  return (ref: MediaRef): string | undefined => {
    const entry = targets[ref.hash];
    if (!entry) return undefined;
    return publicPath(entry.slug, ref.hash, entry.ext, 'slug');
  };
}

// The figure placement role a media image's parent carries, read off the hProperties className
// remarkFigure already stamped on the containing figure (`cairn-place-<role>`), since remarkFigure
// runs before this step and unwraps the image to a direct child of that figure node. undefined for
// a bare inline image or an unplaced (classless) figure.
function roleFromParent(parent: unknown): string | undefined {
  if (!parent || typeof parent !== 'object') return undefined;
  const className = (parent as { data?: { hProperties?: { className?: unknown } } }).data?.hProperties
    ?.className;
  if (!Array.isArray(className)) return undefined;
  const marker = className.find((c) => typeof c === 'string' && c.startsWith('cairn-place-'));
  return typeof marker === 'string' ? marker.slice('cairn-place-'.length) : undefined;
}

// Merge a resolved MediaImageDetail onto the image node's hProperties: width/height whenever known,
// plus srcset and its role-derived sizes whenever a srcset was built. A no-op for an undefined or
// empty detail (no dimensions, no srcset), the common case for a hand-rolled resolveMedia.
function applyImageDetail(node: ResolvableNode, detail: MediaImageDetail | undefined, role: string | undefined): void {
  if (!detail) return;
  const props: Record<string, unknown> = {};
  if (detail.width !== undefined) props.width = detail.width;
  if (detail.height !== undefined) props.height = detail.height;
  if (detail.srcSet) {
    props.srcSet = detail.srcSet;
    props.sizes = (role && SIZES_BY_ROLE[role]) || '100vw';
  }
  if (Object.keys(props).length === 0) return;
  node.data = node.data ?? {};
  node.data.hProperties = { ...node.data.hProperties, ...props };
}

/**
 * Resolve media: image nodes against the VFile's resolver. A non-media src and a malformed token
 *  pass through. A missing target is marked with the cairn-broken-media class (the resolver returns
 *  undefined) or, when the resolver throws, the error propagates and fails the build. When the
 *  resolver carries the imageDetail side channel (built-in makeMediaResolver), the resolved image
 *  also gains intrinsic width/height and, with zone transformations on and the asset's width known,
 *  a responsive srcset with a sizes hint derived from the enclosing figure's placement role.
 */
export function remarkResolveMedia() {
  return (tree: unknown, file: VFile): void => {
    const resolve = file.data[MEDIA_RESOLVE] as MediaResolveWithDetail | undefined;
    if (!resolve) return;
    visit(tree as Parameters<typeof visit>[0], 'image', (node: ResolvableNode, _index: unknown, parent: unknown) => {
      const ref = parseMediaToken(node.url);
      if (!ref) return;
      const url = resolve(ref); // may throw (build backstop); propagates out of render
      if (url) {
        node.url = url;
        applyImageDetail(node, resolve.imageDetail?.(ref), roleFromParent(parent));
        return;
      }
      // Missing asset in the preview: mark it broken and neutralize the src, keeping the alt.
      markNodeBroken(node, 'cairn-broken-media', 'Missing media asset');
    });
  };
}
