// cairn-cms: the SEO head fields read at the cross-concept boundary (schema-source-of-truth design,
// Plan 3). The catch-all route resolves any concept by request path, so the entry's frontmatter is
// typed Record<string, unknown>; this reads the known head fields by name and coerces. Kept apart
// from seo.ts (the head builder) so reading frontmatter and building the head stay distinct concerns.

/** The head fields a concept can carry in frontmatter. Each is optional and omitted when absent.
 *  `author` is article-scoped downstream: the head builder emits `article:author` only for a dated
 *  entry, so an `author` on an undated Page is read here but not rendered. */
export interface SeoFields {
  description?: string;
  image?: string;
  robots?: string;
  author?: string;
}

const KEYS = ['description', 'image', 'robots', 'author'] as const;

/** Read the known SEO head fields off an entry's normalized frontmatter. Keeps a present string,
 *  trimmed, and omits an absent, empty, or non-string value. Trimming the stored value keeps a stray
 *  `robots: "  noindex  "` from reaching the head tag with surrounding whitespace. The field must be
 *  declared in the concept's schema to survive the validate-once read; an undeclared key is not on the
 *  normalized frontmatter. */
export function readSeoFields(frontmatter: Record<string, unknown>): SeoFields {
  const fields: SeoFields = {};
  for (const key of KEYS) {
    const value = frontmatter[key];
    if (typeof value === 'string' && value.trim() !== '') fields[key] = value.trim();
  }
  return fields;
}

/** Resolve an author-supplied image path to an absolute URL against the site origin. An absolute or
 *  protocol-relative URL passes through; a root-relative path anchors to the origin; a malformed
 *  string returns undefined rather than throwing at build. The sites use a bare-domain origin, so a
 *  bare path also anchors to the origin root; against a sub-path origin it would resolve relative to
 *  that path, per the WHATWG URL rules. */
export function resolveImageUrl(image: string, origin: string): string | undefined {
  try {
    const url = new URL(image, origin);
    // Guard the unresolved-`media:`-token failure mode: `media:photo.<hash>` is a valid URL scheme,
    // so `new URL(...).href` returns the token verbatim and it would otherwise ship as the og:image.
    // Only an http or https result is a real social-card URL; anything else degrades to no image.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
