import { describe, expect, it } from 'vitest';
import { formatDate } from './date.js';

describe('formatDate', () => {
  it.each([
    { iso: '2026-07-09', expected: '9 Jul 2026' },
    { iso: '2026-01-01', expected: '1 Jan 2026' },
    { iso: '2026-12-31', expected: '31 Dec 2026' },
  ])('renders $iso as $expected', ({ iso, expected }) => {
    expect(formatDate(iso)).toBe(expected);
  });
});
