import { describe, it, expect } from 'vitest';
import { paginate } from '../../lib/delivery/paginate.js';

const items = [1, 2, 3, 4, 5];

describe('paginate', () => {
  it('slices the requested page and reports the totals', () => {
    const page = paginate(items, 1, 2);
    expect(page).toMatchObject({ items: [1, 2], page: 1, perPage: 2, total: 5, totalPages: 3, hasPrev: false, hasNext: true });
  });
  it('reports the last page with no next', () => {
    expect(paginate(items, 3, 2)).toMatchObject({ items: [5], page: 3, hasPrev: true, hasNext: false });
  });
  it('clamps an out-of-range page into bounds', () => {
    expect(paginate(items, 99, 2).page).toBe(3);
    expect(paginate(items, 0, 2).page).toBe(1);
  });
  it('handles an empty list', () => {
    expect(paginate([], 1, 2)).toMatchObject({ items: [], total: 0, totalPages: 1, hasPrev: false, hasNext: false });
  });
  it('clamps a non-positive perPage to one', () => {
    const page = paginate([1, 2, 3], 1, 0);
    expect(page.perPage).toBe(1);
    expect(page.totalPages).toBe(3);
    expect(Number.isFinite(page.totalPages)).toBe(true);
  });
});
