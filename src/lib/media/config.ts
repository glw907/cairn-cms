// cairn-cms: media config normalization. A site declares its media setup as a MediaConfig on the
// adapter; this module validates that block and resolves it into the engine-internal
// ResolvedMediaConfig the upload, storage, and delivery paths read. An absent block means media is
// off, so the resolved value carries an `enabled` discriminant rather than throwing. The one site
// setting is the R2 binding; the size cap, the stored types, and the `/media` base are fixed.
import type { MediaConfig } from '../content/types.js';

/**
 * The resolved media config the engine serves from. When a site declares no media block, media is
 *  off and the value is `{ enabled: false }`; otherwise it carries the R2 binding name.
 * @public
 */
export type ResolvedMediaConfig = { enabled: false } | { enabled: true; bucketBinding: string };

/** The maximum accepted upload size, 25 MB. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** The upload MIME types the engine stores: the common web image formats. */
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/**
 * Validate a site's MediaConfig and resolve it into a ResolvedMediaConfig. An undefined block leaves
 *  media off and returns `{ enabled: false }` rather than throwing. A declared block must name its R2
 *  bucket; the failure throws a cairn:-prefixed error.
 * @remarks
 * The engine normalizes the adapter's block once at compose time into `CairnRuntime.media`, and
 * `createMediaResolver` normalizes the block it is handed the same way.
 */
export function normalizeMedia(media: MediaConfig | undefined): ResolvedMediaConfig {
  if (media === undefined) return { enabled: false };

  if (!media.bucketBinding) {
    throw new Error('cairn: a media block must name its R2 bucket binding');
  }

  return { enabled: true, bucketBinding: media.bucketBinding };
}
