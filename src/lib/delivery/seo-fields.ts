// cairn-cms: the SEO head fields read at the cross-concept boundary (schema-source-of-truth design,
// Plan 3). The catch-all route resolves any concept by request path, so the entry's frontmatter is
// typed Record<string, unknown>; this reads the known head fields by name and coerces. Kept apart
// from seo.ts (the head builder) so reading frontmatter and building the head stay distinct concerns.

/** The head fields a concept can carry in frontmatter. Each is optional and omitted when absent. */
export interface SeoFields {
  description?: string;
  image?: string;
  robots?: string;
  author?: string;
}

const KEYS = ['description', 'image', 'robots', 'author'] as const;

/** Read the known SEO head fields off an entry's normalized frontmatter. Keeps a non-empty string and
 *  omits an absent, empty, or non-string value. The field must be declared in the concept's schema to
 *  survive the validate-once read; an undeclared key is not on the normalized frontmatter. */
export function readSeoFields(frontmatter: Record<string, unknown>): SeoFields {
  const fields: SeoFields = {};
  for (const key of KEYS) {
    const value = frontmatter[key];
    if (typeof value === 'string' && value.trim() !== '') fields[key] = value;
  }
  return fields;
}

/** Resolve an author-supplied image path to an absolute URL against the site origin. An absolute or
 *  protocol-relative URL passes through; a root-relative or bare path anchors to the origin; a
 *  malformed string returns undefined rather than throwing at build. */
export function resolveImageUrl(image: string, origin: string): string | undefined {
  try {
    return new URL(image, origin).href;
  } catch {
    return undefined;
  }
}
