// cairn-core: derive a filename-safe slug stem from a human title, for the create-entry form.
// The admin is filename-based (Pass E): this produces the editable stem an author can adjust,
// matching the server-side SLUG_RE (lowercase alphanumerics and internal hyphens). Pure.

/**
 * Lowercase a title into a filename-safe slug stem.
 * Apostrophes are dropped so "Geoff's" becomes "geoffs" (no spurious hyphen).
 * All other non-alphanumeric runs become a single hyphen; leading/trailing hyphens are trimmed.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
