import { describe, expect, it } from 'vitest';
import { computeItemRange, computePageWindow } from '../../lib/admin-toolkit/pagination-window.js';

describe('computePageWindow', () => {
  it('returns every page when the count is small', () => {
    expect(computePageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns nothing for a zero or negative page count', () => {
    expect(computePageWindow(1, 0)).toEqual([]);
    expect(computePageWindow(1, -3)).toEqual([]);
  });

  it('windows down to first, last, and a run around the current page', () => {
    expect(computePageWindow(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20]);
  });

  it('never puts an ellipsis where the run is already adjacent', () => {
    expect(computePageWindow(1, 20)).toEqual([1, 2, 'ellipsis', 20]);
    expect(computePageWindow(20, 20)).toEqual([1, 'ellipsis', 19, 20]);
  });

  it('clamps an out-of-range current page into the window instead of overflowing it', () => {
    expect(computePageWindow(999, 20)).toEqual([1, 'ellipsis', 19, 20]);
    expect(computePageWindow(0, 20)).toEqual([1, 2, 'ellipsis', 20]);
  });
});

describe('computeItemRange', () => {
  it('computes the first page of a range', () => {
    expect(computeItemRange(1, 20, 149)).toEqual({ first: 1, last: 20, total: 149 });
  });

  it('clamps the last page to the total, not a full page size', () => {
    expect(computeItemRange(8, 20, 149)).toEqual({ first: 141, last: 149, total: 149 });
  });

  it('reads null for a non-positive page size or total', () => {
    expect(computeItemRange(1, 0, 149)).toBeNull();
    expect(computeItemRange(1, 20, 0)).toBeNull();
  });

  it('reads null for a page past the last item (a stale page after the list shrank)', () => {
    expect(computeItemRange(99, 20, 149)).toBeNull();
  });
});
