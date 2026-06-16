import { describe, it, expect } from 'vitest';
import { sniffMediaType, isDeniedUpload } from '../../lib/media/sniff.js';

/** A minimal byte fixture: the magic header padded out to 32 bytes of zeros, the window the sniffer
 *  reads. The padding stands in for the rest of a real file's body. */
function fixture(...head: number[]): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(head);
  return bytes;
}

/** An ISO-BMFF ftyp box: a 4-byte size, the `ftyp` tag, then the 4-byte major brand. */
function ftyp(brand: string): Uint8Array {
  const tag = [0x66, 0x74, 0x79, 0x70]; // 'ftyp'
  const brandBytes = Array.from(brand, (c) => c.charCodeAt(0));
  return fixture(0x00, 0x00, 0x00, 0x18, ...tag, ...brandBytes);
}

describe('sniffMediaType', () => {
  it('recognizes a JPEG magic', () => {
    expect(sniffMediaType(fixture(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
  });

  it('recognizes a PNG magic', () => {
    expect(sniffMediaType(fixture(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      'image/png',
    );
  });

  it('recognizes a GIF magic', () => {
    expect(sniffMediaType(fixture(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe('image/gif');
  });

  it('recognizes a WebP RIFF/WEBP container', () => {
    const bytes = fixture(
      0x52, 0x49, 0x46, 0x46, // 'RIFF'
      0x00, 0x00, 0x00, 0x00, // chunk size (ignored)
      0x57, 0x45, 0x42, 0x50, // 'WEBP'
    );
    expect(sniffMediaType(bytes)).toBe('image/webp');
  });

  it('recognizes an AVIF ftyp brand', () => {
    expect(sniffMediaType(ftyp('avif'))).toBe('image/avif');
    expect(sniffMediaType(ftyp('avis'))).toBe('image/avif');
  });

  it('recognizes the HEIC ftyp brands', () => {
    for (const brand of ['heic', 'heix', 'heif', 'hevc', 'hevx', 'mif1', 'msf1']) {
      expect(sniffMediaType(ftyp(brand))).toBe('image/heic');
    }
  });

  it('still sniffs image/jpeg for a polyglot with a JPEG head and an HTML tail', () => {
    // The sniff reads only the magic, so a polyglot (valid JPEG magic, HTML appended) sniffs as a
    // JPEG. This is exactly why the sniff is necessary but not sufficient: the delivery route's
    // response headers (nosniff, inline disposition, restrictive CSP), not this byte check, are the
    // real XSS control for the served bytes.
    const html = Array.from('<script>alert(1)</script>', (c) => c.charCodeAt(0));
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...html]);
    expect(sniffMediaType(bytes)).toBe('image/jpeg');
  });

  it('returns null for an unknown magic', () => {
    expect(sniffMediaType(fixture(0x00, 0x01, 0x02, 0x03))).toBeNull();
  });

  it('returns null for a 2-byte truncated input', () => {
    expect(sniffMediaType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });

  it('returns null for a truncated ftyp box with no brand bytes', () => {
    // The ftyp tag is present but the major-brand bytes (8..11) are missing.
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
    expect(sniffMediaType(bytes)).toBeNull();
  });

  it('returns null for an ftyp box with an unknown brand', () => {
    expect(sniffMediaType(ftyp('qt  '))).toBeNull();
  });
});

describe('isDeniedUpload', () => {
  it('rejects an svg+xml declared type', () => {
    expect(isDeniedUpload(fixture(0xff, 0xd8, 0xff), 'image/svg+xml')).toBe(true);
  });

  it('rejects the other denied declared types', () => {
    for (const declared of ['image/svg', 'text/html', 'application/xml']) {
      expect(isDeniedUpload(fixture(0xff, 0xd8, 0xff), declared)).toBe(true);
    }
  });

  it('rejects an SVG payload whose first non-whitespace byte is < even with an image declared type', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    // The declared type is a permitted image type, but the leading `<` triggers the engine deny.
    expect(isDeniedUpload(svg, 'image/png')).toBe(true);
  });

  it('rejects a leading-< payload with leading ASCII whitespace before the <', () => {
    const payload = new TextEncoder().encode('  \t\r\n<html></html>');
    expect(isDeniedUpload(payload)).toBe(true);
  });

  it('does not reject a real image whose declared type is permitted', () => {
    const png = fixture(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    expect(isDeniedUpload(png, 'image/png')).toBe(false);
  });
});
