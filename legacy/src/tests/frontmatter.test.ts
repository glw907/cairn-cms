import { describe, it, expect } from 'vitest';
import { dateInputValue } from '../lib/frontmatter';

describe('dateInputValue', () => {
  it('formats a Date as YYYY-MM-DD without a timezone shift', () => {
    expect(dateInputValue(new Date('2026-05-14T00:00:00.000Z'))).toBe('2026-05-14');
  });
  it('slices an ISO datetime string to the date', () => {
    expect(dateInputValue('2026-05-14T10:30:00Z')).toBe('2026-05-14');
  });
  it('passes a bare YYYY-MM-DD string through', () => {
    expect(dateInputValue('2026-05-14')).toBe('2026-05-14');
  });
  it('returns empty for a missing or non-date value', () => {
    expect(dateInputValue(undefined)).toBe('');
    expect(dateInputValue(null)).toBe('');
    expect(dateInputValue(42)).toBe('');
  });
  it('returns empty for an invalid Date', () => {
    expect(dateInputValue(new Date('nonsense'))).toBe('');
  });
  it('returns empty for a non-date string', () => {
    expect(dateInputValue('not a date')).toBe('');
  });
});
