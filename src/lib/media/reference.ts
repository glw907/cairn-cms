// cairn-cms: the media: reference token. A media reference is the logical handle that content
// commits to git, keyed to a content-hash prefix so the same bytes resolve no matter where they
// are stored or what they are named. The canonical form is `media:<slug>.<hash>`: the hash is a
// 16-character lowercase hex content-hash prefix that identifies the bytes, and the slug is a
// cosmetic display name. The bare `media:<hash>` form (no slug) is also valid. This module owns
// the grammar; it mirrors the cairn: link codec in ../content/links.ts.

/** A resolved reference to a media asset by its content-hash prefix, with an optional display slug. */
export interface MediaRef {
  slug: string | null;
  hash: string;
}

/** A 16-character lowercase hex content-hash prefix. */
const HASH_RE = /^[0-9a-f]{16}$/;

/** The slug grammar from the Task 2 slugify transform: lowercase alphanumerics joined by single
 *  internal hyphens, with no leading or trailing hyphen and no dot (the dot is the slug/hash
 *  separator). */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Parse a `media:<slug>.<hash>` href (or the bare `media:<hash>` form), or null for any other
 *  href or a malformed token. Splits on the last dot, so a slug that illegally contains a dot fails
 *  the slug grammar and returns null. */
export function parseMediaToken(href: string): MediaRef | null {
  if (!href.startsWith('media:')) return null;
  const rest = href.slice('media:'.length);
  const dot = rest.lastIndexOf('.');
  if (dot === -1) return HASH_RE.test(rest) ? { slug: null, hash: rest } : null;
  const slug = rest.slice(0, dot);
  const hash = rest.slice(dot + 1);
  if (!HASH_RE.test(hash) || !SLUG_RE.test(slug)) return null;
  return { slug, hash };
}

/** Write the canonical media: token for a ref. The inverse of parseMediaToken, so a parse then
 *  write round trip is stable: `media:<slug>.<hash>` when the slug is present, else `media:<hash>`. */
export function mediaToken(ref: MediaRef): string {
  return ref.slug === null ? `media:${ref.hash}` : `media:${ref.slug}.${ref.hash}`;
}
