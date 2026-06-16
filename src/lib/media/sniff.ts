// cairn-cms: content-type sniffing and the engine-level upload deny-list. The upload action trusts no
// client-declared type: it sniffs the real type from the leading bytes and screens the payload against a
// deny-list a site cannot override. Both functions are pure and Worker-clean (a plain Uint8Array, no
// Node Buffer and no stream), so they run unchanged on Cloudflare Workers and under vitest.
//
// The sniff is necessary but not sufficient. A polyglot can carry a valid image magic and an HTML tail,
// and this byte check sees only the magic. The delivery route's response headers (X-Content-Type-Options:
// nosniff, Content-Disposition: inline, a restrictive Content-Security-Policy) are the real XSS control
// for the served bytes; sniffing here is the ingest gate, not the served-bytes defense.

/** The leading ASCII whitespace bytes skipped before the deny-list's first-byte-is-`<` check:
 *  tab (0x09), newline (0x0A), carriage return (0x0D), and space (0x20). */
const WHITESPACE = new Set([0x09, 0x0a, 0x0d, 0x20]);

/** The single byte `<` (0x3C). A payload whose first non-whitespace byte is `<` is markup (SVG, HTML,
 *  XML) and is denied regardless of its declared type or any site `allowedTypes`. */
const LT = 0x3c;

/** Declared content types denied at the engine level, independent of any site `allowedTypes`. SVG and
 *  the markup types carry active content (script, foreignObject), so they never ingest as media. */
const DENIED_TYPES = new Set(['image/svg+xml', 'image/svg', 'text/html', 'application/xml']);

/** The ISO-BMFF major-brand codes (at bytes 8..11 of an `ftyp` box) that mean an AVIF image. */
const AVIF_BRANDS = new Set(['avif', 'avis']);

/** The ISO-BMFF major-brand codes that mean a HEIF/HEIC image. */
const HEIC_BRANDS = new Set(['heic', 'heix', 'heif', 'hevc', 'hevx', 'mif1', 'msf1']);

/** True when every byte of `magic` matches `bytes` starting at `offset`. False if `bytes` is too
 *  short to hold the whole magic. */
function matches(bytes: Uint8Array, offset: number, magic: number[]): boolean {
  if (bytes.length < offset + magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[offset + i] !== magic[i]) return false;
  }
  return true;
}

/** The four ASCII characters at bytes `offset..offset+3`, or null when the input is too short. Used to
 *  read an ISO-BMFF brand code as a string. */
function ascii4(bytes: Uint8Array, offset: number): string | null {
  if (bytes.length < offset + 4) return null;
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

/**
 * Detect the MIME type of an image from its leading magic bytes. Reads only the first ~32 bytes and
 * returns the recognized type, or null for an unrecognized magic or an input too short for a given
 * check. This is the server's source of truth for an upload's type; the client-declared type is
 * advisory. Recognizes JPEG, PNG, GIF, WebP, and the AVIF/HEIC ISO-BMFF brands.
 */
export function sniffMediaType(bytes: Uint8Array): string | null {
  // JPEG: starts FF D8 FF.
  if (matches(bytes, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';

  // PNG: the 8-byte signature 89 50 4E 47 0D 0A 1A 0A; the leading 89 50 4E 47 ('.PNG') is enough.
  if (matches(bytes, 0, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';

  // GIF: 'GIF8' (the 87a and 89a versions share this prefix).
  if (matches(bytes, 0, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';

  // WebP: a RIFF container ('RIFF' at 0..3) whose form type is 'WEBP' at 8..11.
  if (matches(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && matches(bytes, 8, [0x57, 0x45, 0x42, 0x50])) {
    return 'image/webp';
  }

  // AVIF and HEIC are ISO base media format files: an 'ftyp' box tag at bytes 4..7, then the 4-byte
  // major brand at bytes 8..11. A truncated box (no brand bytes) or an unknown brand returns null.
  if (matches(bytes, 4, [0x66, 0x74, 0x79, 0x70])) {
    const brand = ascii4(bytes, 8);
    if (brand !== null) {
      if (AVIF_BRANDS.has(brand)) return 'image/avif';
      if (HEIC_BRANDS.has(brand)) return 'image/heic';
    }
  }

  return null;
}

/** The bare file extension (no dot) for each sniffed media type the upload path stores. The ext is
 *  derived from the server-sniffed type, never the client filename, so the stored key and the
 *  delivery extension allow-list always agree. An unmappable type returns null (the upload 415s). */
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** The storage extension for a sniffed media type, or null for a type the upload path does not store
 *  (HEIC, an unknown type). Driven by the sniffed type, so the key's ext is server-owned. */
export function extForMediaType(type: string): string | null {
  return EXT_BY_TYPE[type] ?? null;
}

/**
 * The engine-level upload deny predicate. Returns true (reject) when the upload is markup a site can
 * never override: a declared type of image/svg+xml, image/svg, text/html, or application/xml, OR a
 * payload whose first non-whitespace byte is `<` (an 0x3C after skipping leading ASCII whitespace).
 * This runs ahead of and independent of any site `allowedTypes`, since SVG and HTML carry active
 * content. The byte check catches a markup payload sent under a permitted declared type.
 */
export function isDeniedUpload(bytes: Uint8Array, declaredType?: string): boolean {
  if (declaredType !== undefined && DENIED_TYPES.has(declaredType.toLowerCase())) return true;

  for (let i = 0; i < bytes.length; i++) {
    if (WHITESPACE.has(bytes[i])) continue;
    return bytes[i] === LT;
  }

  // An empty or all-whitespace payload has no opening byte to deny here; the type and size gates own it.
  return false;
}
