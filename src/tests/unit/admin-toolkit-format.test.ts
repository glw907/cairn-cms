import { describe, expect, it } from 'vitest';
import { formatCivilDate, formatTimestamp, itemNoun } from '../../lib/admin-toolkit/format.js';

describe('formatCivilDate', () => {
  it('reads the empty string for a null date with no fallback', () => {
    expect(formatCivilDate(null)).toBe('');
  });

  it('honors a caller-supplied fallback word', () => {
    expect(formatCivilDate(null, { fallback: 'TBD' })).toBe('TBD');
  });

  it('parses a bare YYYY-MM-DD date without shifting a day west of Greenwich', () => {
    expect(formatCivilDate('2026-01-01')).toBe('Jan 1, 2026');
  });

  it('reads the leading date portion of a full SQLite datetime', () => {
    expect(formatCivilDate('2026-06-14 19:22:57')).toBe('Jun 14, 2026');
  });

  it('holds the calendar day across the spring-forward DST boundary', () => {
    expect(formatCivilDate('2026-03-08')).toBe('Mar 8, 2026');
  });

  it('holds the calendar day across the fall-back DST boundary', () => {
    expect(formatCivilDate('2026-11-01')).toBe('Nov 1, 2026');
  });

  it('honors a caller-supplied Intl options passthrough', () => {
    expect(formatCivilDate('2026-06-14', { intlOptions: { year: 'numeric', month: 'long' } })).toBe('June 2026');
  });
});

describe('formatTimestamp', () => {
  it('defaults to UTC rather than a site-specific zone, a SQLite datetime with no zone option', () => {
    expect(formatTimestamp('2026-06-01 12:00:00')).toBe('Jun 1, 2026, 12:00 PM');
  });

  it('honors a caller-supplied time zone (Anchorage, before the spring-forward transition)', () => {
    expect(formatTimestamp('2026-03-08 09:00:00', { timeZone: 'America/Anchorage' })).toBe('Mar 8, 2026, 12:00 AM');
  });

  it('honors a caller-supplied time zone (Anchorage, after the spring-forward transition)', () => {
    expect(formatTimestamp('2026-03-08 12:00:00', { timeZone: 'America/Anchorage' })).toBe('Mar 8, 2026, 4:00 AM');
  });

  it('honors a caller-supplied time zone across the fall-back transition', () => {
    expect(formatTimestamp('2026-11-01 09:00:00', { timeZone: 'America/Anchorage' })).toBe('Nov 1, 2026, 1:00 AM');
  });

  it('honors a caller-supplied time zone after fall-back completes', () => {
    expect(formatTimestamp('2026-11-01 12:00:00', { timeZone: 'America/Anchorage' })).toBe('Nov 1, 2026, 3:00 AM');
  });

  it('reads the empty string for a null or undefined timestamp with no fallback', () => {
    expect(formatTimestamp(null)).toBe('');
    expect(formatTimestamp(undefined)).toBe('');
  });

  it('honors a caller-supplied fallback for a nullish timestamp', () => {
    expect(formatTimestamp(null, { fallback: 'n/a' })).toBe('n/a');
  });

  it('accepts an ISO string with a UTC offset, matching the equivalent SQLite-shaped moment', () => {
    expect(formatTimestamp('2026-06-01T14:00:00+02:00')).toBe(formatTimestamp('2026-06-01 12:00:00'));
  });

  it('accepts an ISO string with a Z suffix, matching the equivalent SQLite-shaped moment', () => {
    expect(formatTimestamp('2026-06-01T12:00:00Z')).toBe(formatTimestamp('2026-06-01 12:00:00'));
  });

  it('pins the caller-supplied time zone for an ISO-shaped input too, not only the SQLite shape', () => {
    expect(formatTimestamp('2026-03-08T09:00:00Z', { timeZone: 'America/Anchorage' })).toBe(
      formatTimestamp('2026-03-08 09:00:00', { timeZone: 'America/Anchorage' }),
    );
  });

  it('passes a zone-less near-ISO string through unchanged, rather than parsing it in the runtime local zone', () => {
    expect(formatTimestamp('2026-06-01T12:00:00')).toBe('2026-06-01T12:00:00');
  });

  it('passes a zone-less near-ISO string with fractional seconds through unchanged', () => {
    expect(formatTimestamp('2026-06-01T12:00:00.123')).toBe('2026-06-01T12:00:00.123');
  });

  it('passes a bare calendar day through unchanged, since it names neither a time nor a zone', () => {
    expect(formatTimestamp('2026-06-01')).toBe('2026-06-01');
  });

  it('passes an unrecognized non-date string through unchanged', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });
});

describe('itemNoun', () => {
  it('picks the singular form at exactly 1', () => {
    expect(itemNoun(1, { one: 'household', many: 'households' })).toBe('household');
  });

  it('picks the plural form for a count greater than 1', () => {
    expect(itemNoun(6, { one: 'household', many: 'households' })).toBe('households');
  });

  it('picks the plural form for a zero count', () => {
    expect(itemNoun(0, { one: 'household', many: 'households' })).toBe('households');
  });

  it('reads a plain string label back unchanged regardless of count, the original contract', () => {
    expect(itemNoun(1, 'items')).toBe('items');
    expect(itemNoun(0, 'items')).toBe('items');
    expect(itemNoun(6, 'items')).toBe('items');
  });
});
