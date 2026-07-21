// cairn-cms: Pagination's pure windowing and range arithmetic, graduated from
// aksailingclub-org's `src/admin-club/toolkit/Pagination.svelte` module context. Kept in a plain
// module (rather than only inside Pagination.svelte's `<script module>`) so the unit test project,
// which runs in Node with no Svelte plugin, can exercise the arithmetic directly; Pagination.svelte
// re-exports both from its own module context, preserving the "exported from module context"
// contract a consumer imports against.

/** One entry in a windowed page list: a real page number, or a gap marker between two runs. */
export type PageWindowItem = number | 'ellipsis';

/** The inclusive item range a page covers, plus the total it is drawn from. */
export interface ItemRange {
  /** The 1-based index of the range's first item. */
  first: number;
  /** The 1-based index of the range's last item. */
  last: number;
  /** The underlying list's total item count. */
  total: number;
}

/**
 * Reduce `1..pageCount` to a bounded set of page buttons: every page when `pageCount` is small
 * (7 or fewer), otherwise the first page, the last page, and a run of up to three pages around
 * `page`, with an `'ellipsis'` marker standing in for each skipped gap. `page` is clamped into
 * `[1, pageCount]` before windowing, so an out-of-range current page never produces an
 * out-of-range window entry. Returns `[]` for `pageCount <= 0`.
 */
export function computePageWindow(page: number, pageCount: number): PageWindowItem[] {
  if (pageCount <= 0) return [];
  const current = Math.min(Math.max(page, 1), pageCount);
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const pages = new Set<number>([1, pageCount, current]);
  if (current - 1 >= 1) pages.add(current - 1);
  if (current + 1 <= pageCount) pages.add(current + 1);
  const sorted = [...pages].sort((a, b) => a - b);

  const result: PageWindowItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('ellipsis');
    result.push(sorted[i]);
  }
  return result;
}

/**
 * The inclusive 1-based item range `page` covers at `pageSize`, clamped to `totalItems`. Returns
 * `null` for a non-positive `pageSize`/`totalItems`, or a `page` past the last item (a stale page
 * after the underlying list shrank), so the caller renders no range line rather than a
 * nonsensical one.
 */
export function computeItemRange(page: number, pageSize: number, totalItems: number): ItemRange | null {
  if (pageSize <= 0 || totalItems <= 0) return null;
  const first = (Math.max(page, 1) - 1) * pageSize + 1;
  if (first > totalItems) return null;
  const last = Math.min(page * pageSize, totalItems);
  return { first, last, total: totalItems };
}
