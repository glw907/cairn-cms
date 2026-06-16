import { describe, it, expect } from 'vitest';
import {
  detectHeic,
  gifDimensions,
  proposedNameFor,
  firstImageFile,
  normalizeDataTransfer,
  budgetForDimensions,
  failureCard,
  buildUploadRequest,
  MAX_AREA,
  MAX_SHORT_SIDE,
} from '../../lib/components/client-ingest.js';

// The leading bytes of each fixture mirror the sniff test's magics: the helper detects HEIC by the
// ftyp box and brand, never the filename or a browser-supplied MIME string.

/** A minimal HEIC: 4 size bytes, the `ftyp` tag, then the `heic` major brand. */
function heicFixture(): Uint8Array {
  return new Uint8Array([
    0x00, 0x00, 0x00, 0x18, // box size (advisory, unread)
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x68, 0x65, 0x69, 0x63, // 'heic'
    0x00, 0x00, 0x00, 0x00,
  ]);
}

/** A minimal JPEG: the FF D8 FF SOI magic. */
function jpegFixture(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
}

/** A GIF89a header with a 200 x 150 logical screen (little-endian at bytes 6..9). */
function gifFixture(): Uint8Array {
  return new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // 'GIF89a'
    0xc8, 0x00, // width 200 LE
    0x96, 0x00, // height 150 LE
    0xf0, 0x00, 0x00, // packed fields, etc.
  ]);
}

/** A plain object that stands in for a File: only `type` is read by the normalizer. */
function fakeFile(name: string, type: string): File {
  return { name, type } as unknown as File;
}

describe('detectHeic', () => {
  it('is true on a HEIC ftyp fixture', () => {
    expect(detectHeic(heicFixture())).toBe(true);
  });

  it('is false on a JPEG', () => {
    expect(detectHeic(jpegFixture())).toBe(false);
  });

  it('is false on a JPEG named .heic (magic wins over the name)', () => {
    // The byte content is JPEG; only the (irrelevant) filename claims HEIC. detectHeic sees bytes.
    expect(detectHeic(jpegFixture())).toBe(false);
  });
});

describe('gifDimensions', () => {
  it('reads width and height from a GIF header', () => {
    expect(gifDimensions(gifFixture())).toEqual({ width: 200, height: 150 });
  });

  it('is null for a non-GIF', () => {
    expect(gifDimensions(jpegFixture())).toBeNull();
  });

  it('is null for a 6-byte truncation', () => {
    expect(gifDimensions(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBeNull();
  });
});

describe('proposedNameFor', () => {
  it('is null for a generic camera stem', () => {
    expect(proposedNameFor('IMG_4821.HEIC')).toBeNull();
  });

  it('is a real proposed name for a specific filename', () => {
    expect(proposedNameFor('our-trip-to-banff.jpg')).toBe('our-trip-to-banff');
  });

  it('is null for the other generic patterns', () => {
    expect(proposedNameFor('DSC_0001.jpg')).toBeNull();
    expect(proposedNameFor('image.png')).toBeNull();
    expect(proposedNameFor('photo.jpeg')).toBeNull();
    expect(proposedNameFor('untitled.webp')).toBeNull();
    expect(proposedNameFor('1234.png')).toBeNull();
    expect(proposedNameFor('Screenshot 2026-06-15 at 10.30.00.png')).toBeNull();
  });
});

describe('normalizeDataTransfer', () => {
  it('keeps only image files and preserves order', () => {
    const files = [
      fakeFile('a.png', 'image/png'),
      fakeFile('notes.txt', 'text/plain'),
      fakeFile('b.jpg', 'image/jpeg'),
    ];
    const out = normalizeDataTransfer({ files });
    expect(out.map((f) => f.name)).toEqual(['a.png', 'b.jpg']);
  });

  it('ignores a uri-list / text item carried alongside the files', () => {
    const files = [fakeFile('drop.png', 'image/png')];
    const items = [{ kind: 'string', type: 'text/uri-list' }] as unknown as DataTransferItem[];
    const out = normalizeDataTransfer({ files, items });
    expect(out.map((f) => f.name)).toEqual(['drop.png']);
  });

  it('is empty when no image file is present', () => {
    const files = [fakeFile('notes.txt', 'text/plain')];
    expect(normalizeDataTransfer({ files })).toEqual([]);
  });
});

describe('firstImageFile', () => {
  it('routes an image-bearing transfer to the first image file', () => {
    const files = [
      fakeFile('notes.txt', 'text/plain'),
      fakeFile('shot.png', 'image/png'),
      fakeFile('also.jpg', 'image/jpeg'),
    ];
    // The 2b ingest is single-file per gesture (open risk 3): the routing decision yields the first
    // image and never the rest.
    expect(firstImageFile({ files })?.name).toBe('shot.png');
  });

  it('falls through (null) for a text-only paste so CodeMirror handles it', () => {
    const files = [fakeFile('notes.txt', 'text/plain')];
    expect(firstImageFile({ files })).toBeNull();
  });

  it('is null when the transfer carries no files at all', () => {
    expect(firstImageFile({})).toBeNull();
  });
});

describe('budgetForDimensions', () => {
  it('downscales an over-budget source proportionally without clipping', () => {
    const out = budgetForDimensions(8000, 6000);
    // Aspect ratio preserved (4:3); integer flooring leaves sub-pixel drift, so 2 places is the
    // honest tolerance for "proportional, not clipped".
    expect(out.width / out.height).toBeCloseTo(8000 / 6000, 2);
    // Area is within budget.
    expect(out.width * out.height).toBeLessThanOrEqual(MAX_AREA);
    // Never upscales.
    expect(out.width).toBeLessThan(8000);
    expect(out.height).toBeLessThan(6000);
  });

  it('caps the short side at the limit when it dominates', () => {
    // A tall strip whose area is small but whose short side exceeds the cap.
    const out = budgetForDimensions(5000, 2000);
    expect(Math.min(out.width, out.height)).toBeLessThanOrEqual(MAX_SHORT_SIDE);
    expect(out.width / out.height).toBeCloseTo(5000 / 2000, 2);
  });

  it('returns a within-budget source unchanged', () => {
    expect(budgetForDimensions(1600, 1200)).toEqual({ width: 1600, height: 1200 });
  });
});

describe('failureCard', () => {
  it('returns the right card state per kind', () => {
    expect(failureCard('decode-unsupported').kind).toBe('decode-unsupported');
    expect(failureCard('transcode-failed').kind).toBe('transcode-failed');
    expect(failureCard('too-large').kind).toBe('too-large');
    expect(failureCard('network').kind).toBe('network');
    for (const kind of ['decode-unsupported', 'transcode-failed', 'too-large', 'network'] as const) {
      expect(typeof failureCard(kind).message).toBe('string');
      expect(failureCard(kind).message.length).toBeGreaterThan(0);
    }
  });
});

describe('buildUploadRequest', () => {
  it('builds the POST upload request with the CSRF header and a manual redirect', () => {
    const { url, init } = buildUploadRequest({
      conceptId: 'posts',
      id: 'my-entry',
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'image/webp',
      csrf: 'tok-123',
      filename: 'our-trip.webp',
      alt: 'café au lait',
      displayName: 'Our trip',
      width: 1600,
      height: 1200,
    });
    expect(url).toBe('/admin/posts/my-entry?/upload');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('manual');
    const headers = new Headers(init.headers);
    expect(headers.get('x-cairn-csrf')).toBe('tok-123');
    // The body rides as text/plain so the SvelteKit form action accepts it; the server sniffs the
    // real type from the bytes, not this label.
    expect(headers.get('content-type')).toBe('text/plain');
    // The alt is percent-encoded so a unicode value survives a header transport.
    expect(headers.get('x-cairn-alt')).toBe(encodeURIComponent('café au lait'));
    expect(headers.get('x-cairn-filename')).toBe(encodeURIComponent('our-trip.webp'));
    expect(headers.get('x-cairn-display-name')).toBe(encodeURIComponent('Our trip'));
    expect(headers.get('x-cairn-width')).toBe('1600');
    expect(headers.get('x-cairn-height')).toBe('1200');
  });

  it('omits the width and height headers when no dimensions are given', () => {
    const { init } = buildUploadRequest({
      conceptId: 'pages',
      id: 'about',
      bytes: new Uint8Array([0]),
      contentType: 'image/gif',
      csrf: 'tok',
      filename: 'anim.gif',
    });
    const headers = new Headers(init.headers);
    expect(headers.has('x-cairn-width')).toBe(false);
    expect(headers.has('x-cairn-height')).toBe(false);
    expect(headers.has('x-cairn-alt')).toBe(false);
  });
});
