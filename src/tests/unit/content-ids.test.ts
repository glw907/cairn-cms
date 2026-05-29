import { describe, it, expect } from 'vitest';
import { isValidId, idFromFilename, filenameFromId, slugify } from '../../lib/content/ids.js';

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
