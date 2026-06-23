// cairn-cms: media config normalization. A site declares its media setup as an AssetConfig on the
// adapter; this module validates that block and resolves it into the engine-internal
// ResolvedAssetConfig the upload, storage, and delivery paths read. An absent block means media is
// off, so the resolved value carries an `enabled` discriminant rather than throwing. The named
// variants merge over the built-in presets, so a caller preset of the same name wins. This module
// is engine-internal; later phases call normalizeAssets, but the contract surface stays AssetConfig.
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
      variants: Record<string, VariantSpec>;
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
 * The built-in named transform presets. A site's `variants` merge over these, so a caller preset of
 *  the same name overrides the built-in.
 */
const BUILT_IN_PRESETS: Record<string, VariantSpec> = {
  thumb: { width: 320, height: 320, fit: 'cover' },
  inline: { width: 800 },
  card: { width: 640, height: 400, fit: 'cover' },
  hero: { width: 1600, height: 900, fit: 'cover' },
};

/** The fit values Cloudflare Images accepts. A variant whose fit is set to anything else is rejected. */
const FIT_VALUES: ReadonlySet<string> = new Set(['scale-down', 'contain', 'cover', 'crop', 'pad']);
/**
 * The named gravity keywords Cloudflare Images accepts. A gravity is also valid as a coordinate
 *  string; everything else is rejected.
 */
const GRAVITY_KEYWORDS: ReadonlySet<string> = new Set([
  'auto',
  'face',
  'left',
  'right',
  'top',
  'bottom',
  'center',
]);
/** A gravity coordinate string, e.g. "0.5x0.5". */
const GRAVITY_COORD_RE = /^\d+(\.\d+)?x\d+(\.\d+)?$/;

/**
 * Validate one variant's fit and gravity, throwing a cairn:-prefixed error naming the offending
 *  preset and value. The type system collapses VariantSpec.gravity to string, so the gravity check
 *  is the only guard against a bogus value reaching the transform URL.
 */
function validateVariant(name: string, spec: VariantSpec): void {
  if (spec.fit !== undefined && !FIT_VALUES.has(spec.fit)) {
    throw new Error(`cairn: media variant "${name}" has an unknown fit "${spec.fit}"`);
  }
  if (
    spec.gravity !== undefined &&
    !GRAVITY_KEYWORDS.has(spec.gravity) &&
    !GRAVITY_COORD_RE.test(spec.gravity)
  ) {
    throw new Error(`cairn: media variant "${name}" has an unknown gravity "${spec.gravity}"`);
  }
}

/**
 * Validate a site's AssetConfig and resolve it into a ResolvedAssetConfig. An undefined block leaves
 *  media off and returns `{ enabled: false }` rather than throwing. A declared block must name its R2
 *  bucket and carry a known urlForm and valid variant fit and gravity values; each failure throws a
 *  cairn:-prefixed error. The named variants merge over the built-in presets.
 */
export function normalizeAssets(assets: AssetConfig | undefined): ResolvedAssetConfig {
  if (assets === undefined) return { enabled: false };

  if (!assets.bucketBinding) {
    throw new Error('cairn: a media assets block must name its R2 bucket binding');
  }
  if (assets.urlForm !== undefined && assets.urlForm !== 'slug' && assets.urlForm !== 'opaque') {
    throw new Error(`cairn: media urlForm must be "slug" or "opaque", got "${assets.urlForm}"`);
  }
  for (const [name, spec] of Object.entries(assets.variants ?? {})) {
    validateVariant(name, spec);
  }

  return {
    enabled: true,
    bucketBinding: assets.bucketBinding,
    publicBase: assets.publicBase ?? DEFAULT_PUBLIC_BASE,
    urlForm: assets.urlForm ?? 'slug',
    maxUploadBytes: assets.maxUploadBytes ?? DEFAULT_MAX_UPLOAD_BYTES,
    allowedTypes: assets.allowedTypes ?? DEFAULT_ALLOWED_TYPES,
    variants: { ...BUILT_IN_PRESETS, ...(assets.variants ?? {}) },
    transformations: assets.transformations ?? false,
  };
}
