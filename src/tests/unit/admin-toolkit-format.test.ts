import { describe, expect, it } from 'vitest';
import { ageFromBirthdate, formatCivilDate, formatMoney, formatTimestamp } from '../../lib/admin-toolkit/format.js';

describe('formatMoney', () => {
  it('formats zero cents as a zeroed currency string', () => {
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('adds thousands separators, ending the raw-cents artifact', () => {
    expect(formatMoney(30044)).toBe('$300.44');
  });

  it('signs a negative amount (a refund or credit) with a leading minus', () => {
    expect(formatMoney(-4500)).toBe('-$45.00');
  });

  it('honors a non-USD currency option', () => {
    expect(formatMoney(1000, { currency: 'CAD', locale: 'en-CA' })).toContain('10.00');
  });
});

describe('formatCivilDate', () => {
  it('reads the fallback word for a null date', () => {
    expect(formatCivilDate(null)).toBe('Not yet');
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
});

describe('ageFromBirthdate', () => {
  it('reads null for a missing birthdate', () => {
    expect(ageFromBirthdate(null)).toBeNull();
  });

  it('reads null for an unparseable birthdate', () => {
    expect(ageFromBirthdate('not-a-date')).toBeNull();
  });

  // `asOf` is built with the local-time Date constructor (year, monthIndex, day), the same way
  // ageFromBirthdate builds birth internally, so these stay exact regardless of the runner's own
  // time zone -- an ISO Z string would drift a calendar day depending on where the test runs.
  it('computes a whole-years age before the birthday this year', () => {
    expect(ageFromBirthdate('2015-08-20', new Date(2026, 7, 19, 12))).toBe(10);
  });

  it('turns over on the birthday itself, not the day after', () => {
    expect(ageFromBirthdate('2015-08-20', new Date(2026, 7, 20, 12))).toBe(11);
  });

  it('computes a whole-years age after the birthday this year', () => {
    expect(ageFromBirthdate('2015-08-20', new Date(2026, 7, 21, 12))).toBe(11);
  });
});
