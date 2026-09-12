// cairn-cms: the media primitives every media cluster module shares
// (the slug and hash grammars, the human-field caps and sanitizer, the shared fail-closed messages,
// the R2 bucket resolver, and distinctEntryCount, called from both the library load and the delete
// action). Each function here is a plain function of its explicit arguments, not a closure over
// ContentRoutesContext, so this file stays a leaf: it imports no `content-routes-*` sibling.
import type { UsageEntry } from '../media/usage.js';
import type { ResolvedAssetConfig } from '../media/config.js';
import { formatMediaToken } from '../media/reference.js';
import type { CairnEvent } from './types.js';
// R2Bucket is named only to cast the raw binding for resolveMediaBucket. It is a type-only import
// that never appears in an exported signature, so it does not reach the public `.d.ts`.
import type { R2Bucket } from '@cloudflare/workers-types';

/** A media slug is the same lowercase-alphanumeric-with-hyphens grammar the reference token uses. */
export const MEDIA_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A 16-hex content-hash prefix, the immutable asset key. */
export const MEDIA_HASH_RE = /^[0-9a-f]{16}$/;

/**
 * The cap, in characters, on the stored alt text. The human fields are display copy, not content,
 *  so a generous cap rejects only abuse-scale input.
 */
export const MAX_ALT = 160;
/** The cap, in characters, on the stored display name. */
export const MAX_DISPLAY_NAME = 120;
/** The cap, in characters, on the stored original filename. */
export const MAX_ORIGINAL_FILENAME = 120;
/** The largest pixel dimension kept; anything larger is treated as bogus and clamped to null. */
export const MAX_DIMENSION = 60000;

/**
 * Decode a percent-encoded header value, yielding `''` on a malformed sequence or an absent header,
 *  so a hostile `X-Cairn-*` value cannot throw past the gate.
 */
export function safeDecode(value: string | null): string {
  if (value === null) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

/**
 * The basename of a decoded filename: the final path segment after any `/` or `\`. A client value
 *  of `../../evil.png` yields `evil.png`, so no path component reaches the stored record.
 */
export function basename(name: string): string {
  const parts = name.split(/[/\\]/);
  return parts[parts.length - 1];
}

/**
 * The distinct-entry count behind a where-used set: a published use and an edit-branch edit of the
 *  same entry are two rows but one distinct entry, so count by concept/id.
 */
export function distinctEntryCount(rows: UsageEntry[]): number {
  return new Set(rows.map((e) => `${e.concept}/${e.id}`)).size;
}

/**
 * Strip control characters from a human field and cap it at `max` characters. Control characters
 *  (C0 and DEL) never belong in display copy and could corrupt a log line or a committed JSON.
 */
export function sanitizeField(value: string, max: number): string {
  return value.replace(/[\x00-\x1f\x7f]/g, '').slice(0, max);
}

/**
 * Parse an advisory pixel dimension header. A valid integer in `[1, MAX_DIMENSION]` is kept; an
 *  absent, non-numeric, or out-of-range value becomes null (MediaEntry dimensions are `number | null`).
 */
export function clampDimension(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_DIMENSION) return null;
  return n;
}

/**
 * Build the canonical `media:` token for a replacement, treating a slug that fails the grammar (or
 *  an empty one) as absent so the bare-hash form is used. The slug is cosmetic: the resolver keys on
 *  the hash, so a missing slug still resolves. Shared by the preview and apply token construction.
 */
export function replacementToken(slug: string, hash: string): string {
  return formatMediaToken({ slug: MEDIA_SLUG_RE.test(slug) ? slug : null, hash });
}

/** The fail(503) message every media action returns when the site declares no assets block. */
export const MEDIA_DISABLED_MESSAGE = 'Media is not enabled for this site.';
/** The fail(409) message every action that read-modify-commits media.json answers a conflict with. */
export const MANIFEST_CONFLICT_MESSAGE = 'The media manifest changed since you opened it. Reload and try again.';
/**
 * The fail(409) message the two actions that rewrite entry bodies (replace-in-place, alt fill)
 *  answer a conflict with. Names the site rather than the manifest, since what moved under the
 *  editor is the content, not media.json.
 */
export const CONTENT_CONFLICT_MESSAGE = 'The site changed since you opened it. Reload and try again.';

/**
 * Resolve the R2 bucket for an action that reads or writes raw bytes, refusing before any write
 *  when media is disabled for the site or the platform has no binding under the site's configured
 *  name. Shared by every action that touches the bucket directly (delete, bulk delete, orphan scan,
 *  orphan purge); replace and alt-fill write no bytes, so they check `resolved.enabled` alone against
 *  MEDIA_DISABLED_MESSAGE and skip this step.
 */
export function resolveMediaBucket(
  event: CairnEvent,
  resolved: ResolvedAssetConfig,
): { bucket: R2Bucket } | { error: string } {
  if (!resolved.enabled) return { error: MEDIA_DISABLED_MESSAGE };
  const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
  const rawBucket = platformEnv[resolved.bucketBinding];
  if (!rawBucket) return { error: 'The media bucket is not bound.' };
  return { bucket: rawBucket as R2Bucket };
}
