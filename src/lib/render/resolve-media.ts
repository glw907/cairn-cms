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
import { presetUrl } from '../media/transform-url.js';
import type { ResolvedAssetConfig } from '../media/config.js';

/** The VFile data key the renderer sets the per-call media resolver under. */
export const MEDIA_RESOLVE = 'mediaResolve';

/** Resolve a media reference to its delivery URL. `undefined` is a preview miss (the plugin marks
 *  the image broken); a resolver that throws is the build backstop (the error propagates out of
 *  render and fails the build), exactly like LinkResolve. */
export type MediaResolve = (ref: MediaRef) => string | undefined;

/** Build the per-call media resolver, closing over the manifest and the resolved config. The
 *  returned resolver looks a ref's content hash up in the manifest and builds the canonical delivery
 *  path from the manifest entry's slug and ext, not the token's, so a rename never breaks the
 *  reference. With a preset and zone transformations on it returns the variant URL; without a preset,
 *  or when transformations are off, it returns the bare full-size path so a fresh zone with Image
 *  Transformations disabled serves correct thumbnails rather than dead /cdn-cgi/image URLs. It returns
 *  undefined when media is off or no entry carries the hash (the preview-miss backstop). */
export function makeMediaResolver(
  manifest: MediaManifest,
  resolved: ResolvedAssetConfig,
  opts?: { preset?: string },
): MediaResolve {
  return (ref: MediaRef): string | undefined => {
    if (!resolved.enabled) return undefined;
    const entry = findByHash(manifest, ref.hash);
    if (!entry) return undefined;
    const path = publicPath(entry.slug, entry.hash, entry.ext, resolved.urlForm, resolved.publicBase);
    if (opts?.preset && resolved.transformations) {
      return presetUrl(path, opts.preset, resolved.variants);
    }
    return path;
  };
}

interface ImageNode {
  url: string;
  data?: { hProperties?: Record<string, unknown> };
}

/** Resolve media: image nodes against the VFile's resolver. A non-media src and a malformed token
 *  pass through. A missing target is marked with the cairn-broken-media class (the resolver returns
 *  undefined) or, when the resolver throws, the error propagates and fails the build. */
export function remarkResolveMedia() {
  return (tree: unknown, file: VFile): void => {
    const resolve = file.data[MEDIA_RESOLVE] as MediaResolve | undefined;
    if (!resolve) return;
    visit(tree as Parameters<typeof visit>[0], 'image', (node: ImageNode) => {
      const ref = parseMediaToken(node.url);
      if (!ref) return;
      const url = resolve(ref); // may throw (build backstop); propagates out of render
      if (url) {
        node.url = url;
        return;
      }
      // Missing asset in the preview: mark it broken and neutralize the src, keeping the alt.
      node.url = '#';
      node.data = node.data ?? {};
      const props = (node.data.hProperties = node.data.hProperties ?? {});
      const existing = Array.isArray(props.className) ? (props.className as string[]) : [];
      props.className = [...existing, 'cairn-broken-media'];
      props.title = 'Missing media asset';
    });
  };
}
