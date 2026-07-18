// The showcase's one date vocabulary. Every date-bearing surface (the archive's entries, the
// article meta line) formats through this single helper, so a reader never sees two different
// date shapes on the same site (the archive and the article disagreed before this module existed).
const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Render an ISO `YYYY-MM-DD` date as the site's short tabular label, e.g. "9 Jul 2026".
 * @param iso An ISO `YYYY-MM-DD` date string.
 */
export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}
