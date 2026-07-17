// The showcase home's archive shape: year-grouped, paginated segments over the full post index.
// Both the home page (page one, alongside its featured lead) and the deeper /archive/[page] route
// build their page from this one module, so the slicing and grouping rule never drifts between the
// two routes.
import type { ContentSummary } from '@glw907/cairn-cms/delivery';

// Entries per archive page. Derived against the 220-post review fixture: at this size the home
// document's entry markup stays well under the audit's 100KB weight flag (measured well under half
// of it), while still reading as a substantial archive page rather than a token sliver.
export const ARCHIVE_PAGE_SIZE = 50;

/** One year's entries, newest first within the year. */
export interface ArchiveYearGroup {
  year: string;
  entries: ContentSummary[];
}

/** One paginated archive segment: the page number actually served, the total page count, and the
 *  year-grouped entries for that page alone. */
export interface ArchivePage {
  page: number;
  totalPages: number;
  years: ArchiveYearGroup[];
}

/** Sort entries newest first. An undated entry has no year marker to sort by, so it sorts last. */
export function sortNewestFirst(entries: ContentSummary[]): ContentSummary[] {
  return [...entries].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

/**
 * Slice one page out of an already newest-first list and group it by year. `page` is clamped into
 * `[1, totalPages]`, so an out-of-range request (page 0, or past the last page) still returns a
 * real page rather than an empty one.
 */
export function paginateArchive(entries: ContentSummary[], page: number, pageSize = ARCHIVE_PAGE_SIZE): ArchivePage {
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const clampedPage = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
  const start = (clampedPage - 1) * pageSize;
  const slice = entries.slice(start, start + pageSize);

  const years: ArchiveYearGroup[] = [];
  for (const entry of slice) {
    const year = entry.date ? entry.date.slice(0, 4) : 'Undated';
    const last = years[years.length - 1];
    if (last && last.year === year) last.entries.push(entry);
    else years.push({ year, entries: [entry] });
  }

  return { page: clampedPage, totalPages, years };
}
