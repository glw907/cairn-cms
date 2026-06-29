// cairn-cms: the one home for URL shaping (taxonomy Plan 2, the URL single-home consolidation).
// Entry permalink interpolation and the tag URL codec live here so a route's URL is assembled in one
// place. `permalink` resolves an entry's canonical path from its concept pattern; `tagSlug`,
// `tagArchivePath`, and `parseTagPath` are the lossy tag-value/URL-segment codec the tag routes use.
// The date is read straight from the YYYY-MM-DD string, so a permalink never shifts across a timezone.
import type { ConceptDescriptor } from './types.js';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateParts(date?: string): { year: string; month: string; day: string } | null {
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? { year: match[1], month: match[2], day: match[3] } : null;
}

/**
 * Resolve an entry's canonical path from its concept's permalink pattern. Throws when the
 * pattern uses a date token and the entry has no valid date, or when a token is unknown, so
 * a misconfiguration fails at build rather than emitting a broken path.
 */
export function permalink(
  descriptor: ConceptDescriptor,
  entry: { id: string; slug: string; date?: string },
): string {
  return descriptor.permalink.replace(/:(\w+)/g, (_match, token: string) => {
    if (token === 'slug') return entry.slug;
    if (token === 'year' || token === 'month' || token === 'day') {
      const parts = dateParts(entry.date);
      if (!parts) {
        throw new Error(
          `permalink: concept "${descriptor.id}" pattern uses :${token}, but entry "${entry.id}" has no valid date`,
        );
      }
      if (token === 'year') return parts.year;
      if (token === 'month') return pad(Number(parts.month));
      return pad(Number(parts.day));
    }
    throw new Error(`permalink: unknown token :${token} in pattern "${descriptor.permalink}"`);
  });
}

/**
 * Map an arbitrary tag value to a URL-safe segment: lowercase, runs of non-alphanumerics collapse
 * to a single hyphen, leading and trailing hyphens trimmed. The mapping is lossy (two distinct values
 * can share a slug), so the resolver builds a per-concept slug-to-value index and fails the build on a
 * collision. Unlike the filename `slugify`, this keeps an apostrophe as a hyphen boundary, since a tag
 * value is not a filename.
 */
export function tagSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The archive path for a tag value under a base: the base, a slash, and the slugified value. */
export function tagArchivePath(base: string, value: string): string {
  return `${base}/${tagSlug(value)}`;
}

/**
 * Interpret a path against a taxonomy base: `'index'` for an exact base match, `{ tag }` (the slug)
 * for exactly one segment under the base, `null` for anything else (a deeper path or a non-matching
 * base). The caller resolves the slug back to a canonical tag value.
 */
export function parseTagPath(base: string, path: string): { tag: string } | 'index' | null {
  if (path === base) return 'index';
  const prefix = `${base}/`;
  if (!path.startsWith(prefix)) return null;
  const remainder = path.slice(prefix.length);
  if (remainder === '' || remainder.includes('/')) return null;
  return { tag: remainder };
}
