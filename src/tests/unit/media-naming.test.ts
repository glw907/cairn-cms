import { describe, it, expect } from 'vitest';
import {
  hashBytes,
  shortHash,
  slugifyFilename,
  r2Key,
  publicPath,
} from '../../lib/media/naming.js';

/** The slug grammar parseMediaToken validates: lowercase alphanumerics joined by single hyphens. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The sha256 of the ASCII bytes 'abc', a published NIST test vector. */
const ABC_DIGEST = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('hashBytes', () => {
  it('is deterministic for the same input', async () => {
    const bytes = new TextEncoder().encode('abc');
    const first = await hashBytes(bytes);
    const second = await hashBytes(bytes);
    expect(first).toBe(second);
  });
  it('matches the known sha256 vector for abc', async () => {
    expect(await hashBytes(new TextEncoder().encode('abc'))).toBe(ABC_DIGEST);
  });
});

describe('shortHash', () => {
  it('takes the first 16 hex characters of the digest', () => {
    expect(shortHash(ABC_DIGEST)).toBe('ba7816bf8f01cfea');
  });
});

describe('slugifyFilename', () => {
  it('drops the extension, lowercases, and hyphenates spaces', () => {
    expect(slugifyFilename('My Photo.JPG')).toBe('my-photo');
  });
  it('transliterates accents to ASCII', () => {
    expect(slugifyFilename('Frédéric.png')).toBe('frederic');
  });
  it('screens a Windows reserved name so the bare word does not survive', () => {
    const slug = slugifyFilename('con.txt');
    expect(slug).not.toBe('con');
    expect(slug).toMatch(SLUG_RE);
  });
  it('caps an over-long stem at 80 characters', () => {
    const slug = slugifyFilename('a'.repeat(200) + '.png');
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toMatch(SLUG_RE);
  });
  it('falls back to the literal file for a punctuation-only name', () => {
    expect(slugifyFilename('!!!.png')).toBe('file');
  });
});

describe('r2Key', () => {
  it('fans out on the first two hex chars with no leading slash', () => {
    expect(r2Key('a1b2c3d4e5f6a7b8', 'webp')).toBe('media/a1/a1b2c3d4e5f6a7b8.webp');
  });
});

describe('publicPath', () => {
  it('writes the slug form with a leading slash', () => {
    expect(publicPath('blue-running-shoes', 'a1b2c3d4e5f6a7b8', 'webp', 'slug')).toBe(
      '/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp',
    );
  });
  it('writes the slug-null form', () => {
    expect(publicPath(null, 'a1b2c3d4e5f6a7b8', 'webp', 'slug')).toBe(
      '/media/a1b2c3d4e5f6a7b8.webp',
    );
  });
  it('writes the opaque form, ignoring the slug', () => {
    expect(publicPath('blue-running-shoes', 'a1b2c3d4e5f6a7b8', 'webp', 'opaque')).toBe(
      '/media/a1/a1b2c3d4e5f6a7b8.webp',
    );
  });
  it('uses a custom publicBase in both forms when given', () => {
    expect(publicPath('blue-running-shoes', 'a1b2c3d4e5f6a7b8', 'webp', 'slug', '/assets')).toBe(
      '/assets/blue-running-shoes.a1b2c3d4e5f6a7b8.webp',
    );
    expect(publicPath('blue-running-shoes', 'a1b2c3d4e5f6a7b8', 'webp', 'opaque', '/assets')).toBe(
      '/assets/a1/a1b2c3d4e5f6a7b8.webp',
    );
  });
});
