import { describe, it, expect } from 'vitest';
import {
  parseMediaManifest,
  parseMediaEntries,
  findByHash,
  upsertMediaEntry,
  removeMediaEntry,
  serializeMediaManifest,
  type MediaEntry,
  type MediaManifest,
} from '../../lib/media/manifest.js';

const ENTRY_A: MediaEntry = {
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

const ENTRY_B: MediaEntry = {
  hash: 'f0e1d2c3b4a59687',
  sha256: 'f0e1d2c3b4a59687'.repeat(4),
  slug: 'studio-portrait',
  displayName: 'Studio portrait',
  originalFilename: 'studio-portrait.jpg',
  alt: '',
  ext: 'webp',
  contentType: 'image/webp',
  bytes: 51200,
  width: 900,
  height: 1350,
  createdAt: '2026-06-15T11:30:00.000Z',
};

describe('parseMediaManifest', () => {
  it('parses a valid manifest object', () => {
    const manifest = { [ENTRY_A.hash]: ENTRY_A, [ENTRY_B.hash]: ENTRY_B };
    expect(parseMediaManifest(manifest)).toEqual(manifest);
  });
  it('returns {} for an empty object', () => {
    expect(parseMediaManifest({})).toEqual({});
  });
  it('returns {} for undefined, null, a non-object, and an array', () => {
    expect(parseMediaManifest(undefined)).toEqual({});
    expect(parseMediaManifest(null)).toEqual({});
    expect(parseMediaManifest('not an object')).toEqual({});
    expect(parseMediaManifest(42)).toEqual({});
    expect(parseMediaManifest([ENTRY_A, ENTRY_B])).toEqual({});
  });
});

describe('parseMediaEntries', () => {
  it('parses a JSON-string array of valid entries', () => {
    const list = parseMediaEntries(JSON.stringify([ENTRY_A, ENTRY_B]));
    expect(list).toEqual([ENTRY_A, ENTRY_B]);
  });
  it('accepts an already-parsed array directly', () => {
    expect(parseMediaEntries([ENTRY_A])).toEqual([ENTRY_A]);
  });
  it('returns [] for malformed JSON', () => {
    expect(parseMediaEntries('not json {{{')).toEqual([]);
  });
  it('returns [] for a non-array, null, undefined, or a bare object', () => {
    expect(parseMediaEntries(undefined)).toEqual([]);
    expect(parseMediaEntries(null)).toEqual([]);
    expect(parseMediaEntries(42)).toEqual([]);
    expect(parseMediaEntries(JSON.stringify({ ...ENTRY_A }))).toEqual([]);
  });
  it('drops elements that fail validation, keeping the valid ones', () => {
    const list = parseMediaEntries([
      ENTRY_A,
      { ...ENTRY_B, hash: 'TOOSHORT' }, // bad hash
      { ...ENTRY_A, bytes: 'lots' }, // non-number bytes
      { ...ENTRY_B, width: undefined }, // width not number|null
      ENTRY_B,
    ]);
    expect(list).toEqual([ENTRY_A, ENTRY_B]);
  });
  it('keeps a null width and height (a dimensionless entry is valid)', () => {
    const dimensionless: MediaEntry = { ...ENTRY_A, width: null, height: null };
    expect(parseMediaEntries([dimensionless])).toEqual([dimensionless]);
  });
  it('rejects a non-finite bytes value', () => {
    expect(parseMediaEntries([{ ...ENTRY_A, bytes: Infinity }])).toEqual([]);
  });
});

describe('findByHash', () => {
  it('returns the entry on a hit', () => {
    const manifest: MediaManifest = { [ENTRY_A.hash]: ENTRY_A };
    expect(findByHash(manifest, ENTRY_A.hash)).toBe(ENTRY_A);
  });
  it('returns undefined on a miss', () => {
    const manifest: MediaManifest = { [ENTRY_A.hash]: ENTRY_A };
    expect(findByHash(manifest, ENTRY_B.hash)).toBeUndefined();
  });
});

describe('upsertMediaEntry', () => {
  it('adds a new entry without mutating the input', () => {
    const manifest: MediaManifest = { [ENTRY_A.hash]: ENTRY_A };
    const before = structuredClone(manifest);
    const next = upsertMediaEntry(manifest, ENTRY_B);

    expect(next).not.toBe(manifest);
    expect(next[ENTRY_B.hash]).toBe(ENTRY_B);
    expect(next[ENTRY_A.hash]).toBe(ENTRY_A);
    // The input manifest is untouched: same reference contents, no new key.
    expect(manifest).toEqual(before);
    expect(ENTRY_B.hash in manifest).toBe(false);
  });
  it('replaces a same-hash entry with new field values, leaving the input unchanged', () => {
    const manifest: MediaManifest = { [ENTRY_A.hash]: ENTRY_A };
    const before = structuredClone(manifest);
    const replacement: MediaEntry = { ...ENTRY_A, alt: 'Updated alt text', bytes: 99999 };

    const next = upsertMediaEntry(manifest, replacement);

    expect(next).not.toBe(manifest);
    expect(next[ENTRY_A.hash]).toBe(replacement);
    expect(next[ENTRY_A.hash].alt).toBe('Updated alt text');
    expect(next[ENTRY_A.hash].bytes).toBe(99999);
    // The original manifest still holds the original entry's values.
    expect(manifest).toEqual(before);
    expect(manifest[ENTRY_A.hash].alt).toBe('A pair of blue running shoes');
  });
});

describe('removeMediaEntry', () => {
  it('drops the named hash and leaves the other rows untouched', () => {
    const manifest: MediaManifest = { [ENTRY_A.hash]: ENTRY_A, [ENTRY_B.hash]: ENTRY_B };
    const next = removeMediaEntry(manifest, ENTRY_A.hash);

    expect(next).not.toBe(manifest);
    expect(ENTRY_A.hash in next).toBe(false);
    expect(next[ENTRY_B.hash]).toBe(ENTRY_B);
  });
  it('is a no-op for an absent hash, returning an equivalent new manifest', () => {
    const manifest: MediaManifest = { [ENTRY_A.hash]: ENTRY_A };
    const next = removeMediaEntry(manifest, ENTRY_B.hash);

    expect(next).not.toBe(manifest);
    expect(next).toEqual(manifest);
  });
  it('does not mutate the input manifest', () => {
    const manifest: MediaManifest = { [ENTRY_A.hash]: ENTRY_A, [ENTRY_B.hash]: ENTRY_B };
    const before = structuredClone(manifest);

    removeMediaEntry(manifest, ENTRY_A.hash);

    expect(manifest).toEqual(before);
    expect(ENTRY_A.hash in manifest).toBe(true);
  });
});

describe('serializeMediaManifest', () => {
  it('emits the hash keys in sorted ascending order', () => {
    // Build with keys deliberately out of order (B before A).
    const manifest: MediaManifest = { [ENTRY_B.hash]: ENTRY_B, [ENTRY_A.hash]: ENTRY_A };
    const json = serializeMediaManifest(manifest);
    expect(json.indexOf(ENTRY_A.hash)).toBeLessThan(json.indexOf(ENTRY_B.hash));
  });
  it('is idempotent through a parse and re-serialize round trip', () => {
    const manifest: MediaManifest = { [ENTRY_B.hash]: ENTRY_B, [ENTRY_A.hash]: ENTRY_A };
    const once = serializeMediaManifest(manifest);
    const twice = serializeMediaManifest(
      parseMediaManifest(JSON.parse(serializeMediaManifest(manifest))),
    );
    expect(twice).toBe(once);
  });
  it('round-trips the contentType field through serialize and parse', () => {
    const manifest: MediaManifest = { [ENTRY_A.hash]: ENTRY_A };
    const parsed = parseMediaManifest(JSON.parse(serializeMediaManifest(manifest)));
    expect(parsed[ENTRY_A.hash].contentType).toBe('image/webp');
  });
  it('serializes a null width and height, round-tripping them', () => {
    const dimensionless: MediaEntry = { ...ENTRY_A, width: null, height: null };
    const manifest: MediaManifest = { [dimensionless.hash]: dimensionless };
    const json = serializeMediaManifest(manifest);
    expect(json).toContain('"width": null');
    expect(json).toContain('"height": null');
    const parsed = parseMediaManifest(JSON.parse(json));
    expect(parsed[dimensionless.hash].width).toBeNull();
    expect(parsed[dimensionless.hash].height).toBeNull();
  });
});
