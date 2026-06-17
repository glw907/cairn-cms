import { describe, it, expect } from 'vitest';
import { mediaLibraryEntry } from '../../lib/media/library-entry.js';
import type { MediaEntry } from '../../lib/media/manifest.js';

const ENTRY: MediaEntry = {
  hash: 'a1b2c3d4e5f6a7b8',
  sha256: 'a1b2c3d4e5f6a7b8'.repeat(4),
  slug: 'blue-running-shoes',
  displayName: 'Blue running shoes',
  originalFilename: 'Blue Running Shoes.png',
  alt: 'A pair of blue running shoes',
  ext: 'webp',
  contentType: 'image/webp',
  bytes: 24680,
  width: 1200,
  height: 800,
  createdAt: '2026-06-15T10:00:00.000Z',
};

describe('mediaLibraryEntry', () => {
  it('projects every MediaLibraryEntry field including createdAt', () => {
    expect(mediaLibraryEntry(ENTRY)).toEqual({
      hash: 'a1b2c3d4e5f6a7b8',
      slug: 'blue-running-shoes',
      ext: 'webp',
      contentType: 'image/webp',
      displayName: 'Blue running shoes',
      alt: 'A pair of blue running shoes',
      width: 1200,
      height: 800,
      bytes: 24680,
      createdAt: '2026-06-15T10:00:00.000Z',
    });
  });

  it('does not leak the source-only sha256 and originalFilename fields', () => {
    const projected = mediaLibraryEntry(ENTRY) as unknown as Record<string, unknown>;
    expect('sha256' in projected).toBe(false);
    expect('originalFilename' in projected).toBe(false);
  });

  it('carries a null width and height through unchanged', () => {
    const dimensionless: MediaEntry = { ...ENTRY, width: null, height: null };
    const projected = mediaLibraryEntry(dimensionless);
    expect(projected.width).toBeNull();
    expect(projected.height).toBeNull();
  });
});
