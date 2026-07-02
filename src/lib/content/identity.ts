// cairn-cms: a content entry's URL identity in one place (engine-hardening pass 3). The id, the
// slug, the date, and the permalink are computed here, so the content index and the manifest cannot
// drift on what an entry's URL is. A cairn: link resolves through the manifest in the admin preview
// and through the content index in the public build, so the two must agree by construction.
import { idFromFilename, slugFromId } from './ids.js';
import { resolvePermalink } from './url-policy.js';
import type { ConceptDescriptor } from './types.js';

/** A content entry's resolved URL identity. */
export interface EntryIdentity {
  id: string;
  slug: string;
  date?: string;
  permalink: string;
}

/** The basename of a glob path: the segment after the last slash, or the whole path. */
function basename(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

/** A present, non-empty string, else undefined. The read-model string coercion. */
export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** A YYYY-MM-DD date. An unquoted YAML date parses as a JS Date; a string is sliced to its date head. */
export function asDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return undefined;
}

/** Tags as an array, empty when the file declares none. */
export function asTags(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/** A content entry's id: its filename stem (the date prefix is part of a dated id). */
export function entryId(path: string): string {
  return idFromFilename(basename(path));
}

/**
 * Resolve a content entry's URL identity from its concept descriptor, its file path, and its parsed
 * frontmatter. The slug strips the leading date prefix for a dated concept and is the id verbatim for
 * an undated one. The permalink is the one resolver every reader shares. The caller parses the markdown
 * once and passes the frontmatter, so there is no second parse here.
 */
export function entryIdentity(
  descriptor: ConceptDescriptor,
  path: string,
  frontmatter: Record<string, unknown>,
): EntryIdentity {
  const id = entryId(path);
  const slug = slugFromId(id, descriptor.routing.dated ? descriptor.datePrefix : null);
  const date = asDate(frontmatter.date);
  return { id, slug, date, permalink: resolvePermalink(descriptor, { id, slug, date }) };
}
