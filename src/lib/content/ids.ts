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
