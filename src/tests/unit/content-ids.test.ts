import { describe, it, expect } from 'vitest';
import {
  isValidId,
  idFromFilename,
  filenameFromId,
  slugify,
  slugFromId,
  composeDatedId,
  renameId,
} from '../../lib/content/ids.js';

describe('id and filename', () => {
  it('strips the .md suffix to get an id', () => {
    expect(idFromFilename('first-snow.md')).toBe('first-snow');
    expect(idFromFilename('about.md')).toBe('about');
  });

  it('appends .md to get a filename', () => {
    expect(filenameFromId('first-snow')).toBe('first-snow.md');
  });

  it('accepts a lowercase hyphenated id', () => {
    expect(isValidId('first-snow')).toBe(true);
    expect(isValidId('about')).toBe(true);
  });

  it('rejects uppercase, slashes, and edge hyphens', () => {
    expect(isValidId('First-Snow')).toBe(false);
    expect(isValidId('a/b')).toBe(false);
    expect(isValidId('-lead')).toBe(false);
    expect(isValidId('trail-')).toBe(false);
    expect(isValidId('')).toBe(false);
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates a title', () => {
    expect(slugify('First Snow')).toBe('first-snow');
  });
  it('drops apostrophes without a spurious hyphen', () => {
    expect(slugify("Geoff's Notes")).toBe('geoffs-notes');
  });
  it('collapses non-alphanumeric runs and trims edges', () => {
    expect(slugify('  Hello, World!  ')).toBe('hello-world');
  });
});

describe('slugFromId', () => {
  it('strips a full-date prefix for a day concept', () => {
    expect(slugFromId('2026-05-31-snowball-race-report', 'day')).toBe('snowball-race-report');
  });
  it('strips a year-month prefix for a month concept', () => {
    expect(slugFromId('2026-05-welcome', 'month')).toBe('welcome');
  });
  it('strips a year prefix for a year concept', () => {
    expect(slugFromId('2026-recap', 'year')).toBe('recap');
  });
  it('leaves an id with no prefix unchanged', () => {
    expect(slugFromId('about-us', 'day')).toBe('about-us');
  });
  it('returns the id verbatim when the concept is not dated (null)', () => {
    expect(slugFromId('2026-05-31-x', null)).toBe('2026-05-31-x');
  });
  it('strips only the leading prefix, keeping a year-like tail in the slug', () => {
    expect(slugFromId('2026-05-31-2024-recap', 'day')).toBe('2024-recap');
  });
});

describe('composeDatedId', () => {
  it('prepends a full date for a day concept', () => {
    expect(composeDatedId('2026-06-15', 'summer', 'day')).toBe('2026-06-15-summer');
  });
  it('prepends a year-month for a month concept', () => {
    expect(composeDatedId('2026-06-15', 'summer-camp', 'month')).toBe('2026-06-summer-camp');
  });
  it('prepends a year for a year concept', () => {
    expect(composeDatedId('2026-06-15', 'recap', 'year')).toBe('2026-recap');
  });
  it('throws on a malformed date', () => {
    expect(() => composeDatedId('nope', 'x', 'day')).toThrow();
  });
});

describe('renameId', () => {
  it('renames an undated id to the new slug', () => {
    expect(renameId('about', 'about-us', null)).toBe('about-us');
  });
  it('keeps a dated post date prefix and swaps the slug', () => {
    expect(renameId('2026-05-28-ski-tips', 'nordic-ski-tips', 'day')).toBe('2026-05-28-nordic-ski-tips');
  });
  it('keeps a year-granularity prefix', () => {
    expect(renameId('2026-recap', 'year-in-review', 'year')).toBe('2026-year-in-review');
  });
  it('leaves a year-like slug tail intact', () => {
    expect(renameId('2026-05-28-2024-recap', 'the-2024-recap', 'day')).toBe('2026-05-28-the-2024-recap');
  });
});
