// cairn-cms: pagination helper (public-delivery design). Pure slice math; the template renders
// the controls. An out-of-range page clamps into bounds.

/** A page of items plus its navigation state. */
export interface Page<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/** Slice `items` into the 1-based `page` of size `perPage`, clamping the page into bounds. */
export function paginate<T>(items: T[], page: number, perPage: number): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: current,
    perPage,
    total,
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  };
}
