// cairn-cms: media config normalization. A site declares its media setup as an AssetConfig on the
// adapter; this module validates that block and resolves it into the engine-internal
// ResolvedAssetConfig the upload, storage, and delivery paths read. An absent block means media is
// off, so the resolved value carries an `enabled` discriminant rather than throwing. A site cannot
// declare its own transform presets (ruling 4, 2026-09-01: the `variants` field had zero reachable
// runtime consumers); BUILT_IN_PRESETS is the whole preset vocabulary. This module is
// engine-internal; later phases call normalizeAssets, but the contract surface stays AssetConfig.
import type { AssetConfig } from '../content/types.js';
import type { VariantSpec } from './transform-url.js';

/**
 * The resolved media config the engine serves from. When a site declares no assets block, media is
 *  off and the value is `{ enabled: false }`; otherwise every field is filled from the AssetConfig
 *  or its default.
 */
export type ResolvedAssetConfig =
  | { enabled: false }
  | {
      enabled: true;
      bucketBinding: string;
      publicBase: string;
      urlForm: 'slug' | 'opaque';
      maxUploadBytes: number;
      allowedTypes: string[];
      /**
       * Whether Cloudflare Image Transformations are enabled for the zone. With it false, the media
       *  resolver serves the bare full-size delivery path and ignores any preset.
       */
      transformations: boolean;
    };

/** The default delivery base path when the AssetConfig omits one. */
const DEFAULT_PUBLIC_BASE = '/media';
/** The default maximum upload size, 25 MB. */
const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** The default accepted upload MIME types: the common web image formats. */
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/**
 * The built-in named transform presets, the whole vocabulary `presetUrl` resolves against. A site
 *  cannot declare its own (ruling 4, 2026-09-01): a size beyond these four is built directly against
 *  Cloudflare's own `/cdn-cgi/image/<options>/` transform-URL format.
 */
export const BUILT_IN_PRESETS: Record<string, VariantSpec> = {
  thumb: { width: 320, height: 320, fit: 'cover' },
  inline: { width: 800 },
  card: { width: 640, height: 400, fit: 'cover' },
  hero: { width: 1600, height: 900, fit: 'cover' },
};

/**
 * Validate a site's AssetConfig and resolve it into a ResolvedAssetConfig. An undefined block leaves
 *  media off and returns `{ enabled: false }` rather than throwing. A declared block must name its R2
 *  bucket and carry a known urlForm; each failure throws a cairn:-prefixed error.
 */
export function normalizeAssets(assets: AssetConfig | undefined): ResolvedAssetConfig {
  if (assets === undefined) return { enabled: false };

  if (!assets.bucketBinding) {
    throw new Error('cairn: a media assets block must name its R2 bucket binding');
  }
  if (assets.urlForm !== undefined && assets.urlForm !== 'slug' && assets.urlForm !== 'opaque') {
    throw new Error(`cairn: media urlForm must be "slug" or "opaque", got "${assets.urlForm}"`);
  }

  return {
    enabled: true,
    bucketBinding: assets.bucketBinding,
    publicBase: assets.publicBase ?? DEFAULT_PUBLIC_BASE,
    urlForm: assets.urlForm ?? 'slug',
    maxUploadBytes: assets.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES,
    allowedTypes: assets.allowedTypes ?? DEFAULT_ALLOWED_TYPES,
    transformations: assets.transformations ?? false,
  };
}
