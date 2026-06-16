// cairn-cms: the Cloudflare Images transform URL. A delivery path names the original bytes; an
// on-demand variant is that path prefixed with `/cdn-cgi/image/<options>/`, where the options are a
// comma-joined list of resize and format directives Cloudflare reads at the edge. This module owns
// the option encoding and the stable option order, so the same spec always builds the same URL and
// a CDN cache keys on it cleanly. The delivery path is appended unaltered, since it already carries
// its own leading slash.

/** A single image variant: the resize and format directives Cloudflare Images applies to the
 *  original bytes. Every field is optional. width, height, quality, and fit are emitted only when
 *  set; format and gravity always appear, defaulting to auto. */
export interface VariantSpec {
  /** Target width in pixels. */
  width?: number;
  /** Target height in pixels. */
  height?: number;
  /** Output quality, 1 to 100. */
  quality?: number;
  /** How the image fits the target box. */
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  /** Crop focus, `auto` or `face` or a coordinate string. */
  gravity?: 'auto' | 'face' | string;
  /** Output format, `auto` to let Cloudflare negotiate, or a forced codec. */
  format?: 'auto' | 'webp' | 'avif' | string;
}

/** Build the on-demand Cloudflare Images transform URL for a delivery path. The options are
 *  comma-joined in the stable order width, height, quality, fit, format, gravity, with width through
 *  fit emitted only when the spec sets them and format and gravity always present (defaulting to
 *  auto). The publicPath is appended unaltered, so the result is `/cdn-cgi/image/<options><publicPath>`. */
export function variantUrl(publicPath: string, spec: VariantSpec): string {
  const options: string[] = [];
  if (spec.width !== undefined) options.push(`width=${spec.width}`);
  if (spec.height !== undefined) options.push(`height=${spec.height}`);
  if (spec.quality !== undefined) options.push(`quality=${spec.quality}`);
  if (spec.fit !== undefined) options.push(`fit=${spec.fit}`);
  options.push(`format=${spec.format ?? 'auto'}`);
  options.push(`gravity=${spec.gravity ?? 'auto'}`);
  return `/cdn-cgi/image/${options.join(',')}${publicPath}`;
}

/** Build a variant URL from a named preset. Looks up presetName in variants and builds its spec with
 *  variantUrl. Throws a cairn:-prefixed error naming the unknown preset when the name is absent, so a
 *  typo in a preset name fails loudly rather than silently rendering an unsized image. */
export function presetUrl(
  publicPath: string,
  presetName: string,
  variants: Record<string, VariantSpec>,
): string {
  const spec = variants[presetName];
  if (spec === undefined) {
    throw new Error(`cairn: unknown image variant preset "${presetName}"`);
  }
  return variantUrl(publicPath, spec);
}
