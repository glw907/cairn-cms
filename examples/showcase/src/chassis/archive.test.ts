import { describe, expect, it } from 'vitest';
import type { ContentSummary } from '@glw907/cairn-cms/delivery';
import { paginateArchive } from './archive.js';

function entry(date: string | undefined, id: string): ContentSummary {
  return {
    concept: 'posts',
    id,
    slug: id,
    permalink: `/${id}`,
    title: id,
    date,
    tags: [],
    excerpt: '',
    wordCount: 0,
    draft: false,
    fields: {},
  };
}

describe('paginateArchive', () => {
  it('returns one empty page for an empty corpus', () => {
    const result = paginateArchive([], 1, 2);
    expect(result).toEqual({ page: 1, totalPages: 1, years: [] });
  });

  it.each([
    { page: 0, expectedPage: 1 },
    { page: 1, expectedPage: 1 },
    { page: 2, expectedPage: 2 },
    { page: 3, expectedPage: 2 },
    { page: -5, expectedPage: 1 },
  ])('clamps page $page to $expectedPage', ({ page, expectedPage }) => {
    const entries = [entry('2026-01-01', 'a'), entry('2026-02-01', 'b'), entry('2026-03-01', 'c')];
    const result = paginateArchive(entries, page, 2);
    expect(result.page).toBe(expectedPage);
    expect(result.totalPages).toBe(2);
  });

  it('groups a page of entries by year, newest-first input preserved', () => {
    const entries = [entry('2026-03-01', 'c'), entry('2026-01-01', 'a'), entry('2025-12-01', 'z')];
    const result = paginateArchive(entries, 1, 2);
    expect(result.years).toEqual([{ year: '2026', entries: [entries[0], entries[1]] }]);
  });

  it('groups an undated entry under "Undated"', () => {
    const entries = [entry(undefined, 'a')];
    const result = paginateArchive(entries, 1);
    expect(result.years).toEqual([{ year: 'Undated', entries: [entries[0]] }]);
  });
});
