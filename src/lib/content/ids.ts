// cairn-cms: filename-based content ids (spec §7.2). An entry's id is its markdown filename
// without `.md`, so there is no slug codec. `slugify` derives a filename-safe stem from a
// title for the create-entry form.

/** Lowercase alphanumerics with single internal hyphens: the on-disk filename stem rule. */
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True when `id` is a valid filename stem: lowercase, no slashes, no leading or trailing hyphen. */
export function isValidId(id: string): boolean {
  return ID_RE.test(id);
}

/**
 * A content entry's id from its filename: the basename without the `.md` suffix. Pass a
 * basename, not a path; the caller strips any directory prefix first (Plan 03's Git Trees
 * listing yields basenames directly).
 */
export function idFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/** The on-disk filename for an id: the id plus `.md`. */
export function filenameFromId(id: string): string {
  return `${id}.md`;
}

/**
 * Lowercase a title into a filename-safe slug stem. Apostrophes are dropped so "Geoff's"
 * becomes "geoffs" (no spurious hyphen). All other non-alphanumeric runs collapse to a
 * single hyphen; leading and trailing hyphens are trimmed.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Filename date-prefix granularity for a dated concept: the leading `YYYY[-MM[-DD]]-` on the stem. */
export type DatePrefix = 'year' | 'month' | 'day';

/** The leading date-prefix shape for each granularity. */
const DATE_PREFIX_RE: Record<DatePrefix, RegExp> = {
  year: /^\d{4}-/,
  month: /^\d{4}-\d{2}-/,
  day: /^\d{4}-\d{2}-\d{2}-/,
};

/**
 * The URL slug for an id. A dated concept passes its `datePrefix` and the leading date prefix is
 * stripped when present; a non-dated concept passes `null` and the id is returned verbatim. Only
 * the leading prefix is removed, so a year-like tail (a post titled "2024 Recap") stays in the slug.
 */
export function slugFromId(id: string, datePrefix: DatePrefix | null): string {
  if (!datePrefix) return id;
  return id.replace(DATE_PREFIX_RE[datePrefix], '');
}

/**
 * Compose a dated entry's id from a `YYYY-MM-DD` date, a date-free slug, and the concept's
 * granularity: the date truncated to the granularity, a hyphen, then the slug. Throws on a
 * malformed date so a bad create fails before touching git.
 */
export function composeDatedId(date: string, slug: string, datePrefix: DatePrefix): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`cairn: date "${date}" is malformed, expected YYYY-MM-DD`);
  const [, year, month, day] = m;
  let prefix: string;
  switch (datePrefix) {
    case 'year':
      prefix = year;
      break;
    case 'month':
      prefix = `${year}-${month}`;
      break;
    case 'day':
      prefix = `${year}-${month}-${day}`;
      break;
  }
  return `${prefix}-${slug}`;
}

/**
 * Rename an id by swapping its slug, keeping any date prefix. slugFromId strips only the leading
 * date prefix, so the id is exactly its prefix followed by its slug; this replaces the slug suffix
 * with newSlug. A non-dated concept passes null, so the whole id is the slug and the id becomes
 * newSlug. The caller validates newSlug with isValidId first.
 */
export function renameId(oldId: string, newSlug: string, datePrefix: DatePrefix | null): string {
  const oldSlug = slugFromId(oldId, datePrefix);
  const prefix = oldId.slice(0, oldId.length - oldSlug.length);
  return prefix + newSlug;
}

/**
 * Split a `<concept>/<id>` token into its parts, or null when no concept precedes the slash. The
 * shared shape behind the cairn: link token (links.ts) and a pending-branch name (pending.ts),
 * each of which strips its own prefix and applies its own id validation around this split.
 */
export function splitConceptIdToken(token: string): { concept: string; id: string } | null {
  const slash = token.indexOf('/');
  if (slash <= 0) return null;
  return { concept: token.slice(0, slash), id: token.slice(slash + 1) };
}
