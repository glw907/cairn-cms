// cairn-cms: media naming. Media is content-addressed: the sha256 of the bytes names the object, so
// the same bytes always land at the same key no matter the original filename. This module owns the
// hash, the ingest slug transform, the R2 object key, and the public delivery path. The slug grammar
// here matches the one parseMediaToken validates in ./reference.ts, so an ingested filename round
// trips through the media: token unchanged.

// slugifyFilename output always satisfies parseMediaToken's grammar (lowercase alphanumerics joined
// by single internal hyphens, no leading or trailing hyphen), or is the literal `file`.

/** Combining marks (Unicode block U+0300 to U+036F), left over after an NFD decompose, stripped to
 *  fold an accented letter down to its ASCII base. Written as escapes because the literal marks are
 *  invisible in source. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Windows reserved device names. A bare match (case-insensitive) cannot survive as the slug, since
 *  it names a device rather than a file on that platform. */
const RESERVED = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

/** The maximum slug length, applied before the reserved-name and empty fallbacks. */
const MAX_SLUG = 80;

/** A 16-character lowercase hex content-hash prefix, the bare-hash reference form. A slug that
 *  matches this shape would collide with `media:<hash>`, so slugifyFilename screens it. */
const HASH_RE = /^[0-9a-f]{16}$/;

/** A short alphanumeric extension (no dot), the only shape r2Key accepts, for example `webp`. */
const R2_EXT_RE = /^[a-z0-9]{1,5}$/;

// A Uint8Array's generic buffer type no longer satisfies Web Crypto's BufferSource under strict lib
// types, since the backing buffer may be a SharedArrayBuffer; slice the bytes into a plain
// ArrayBuffer to hand digest. Mirrors the buf helper in ../github/signing.ts.
function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** The full lowercase hex sha256 of the bytes, via Web Crypto, hand-formatted to 64 hex chars. */
export async function hashBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', asArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** The first 16 characters of a full hex digest, the content-hash prefix media references commit to. */
export function shortHash(full: string): string {
  return full.slice(0, 16);
}

/** The strict ingest transform from a raw filename to a slug that satisfies the media: slug grammar,
 *  or the literal `file`. Drops the extension, lowercases, transliterates accents, collapses non-alphanumeric runs
 *  to a single hyphen, trims, caps at 80 chars, screens Windows reserved names, and falls back to
 *  `file` when nothing usable is left. */
export function slugifyFilename(name: string): string {
  const dot = name.lastIndexOf('.');
  const stem = dot === -1 ? name : name.slice(0, dot);

  let slug = stem
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug.length > MAX_SLUG) {
    slug = slug.slice(0, MAX_SLUG).replace(/-+$/, '');
  }

  if (RESERVED.has(slug)) return `${slug}-file`;
  if (slug === '') return 'file';
  // A slug shaped like a bare 16-hex hash would collide with the `media:<hash>` reference form, so
  // append -img (mirroring the reserved-name -file fallback) to keep the slug and bare-hash forms
  // disjoint.
  if (HASH_RE.test(slug)) return `${slug}-img`;
  return slug;
}

/** The content-addressed R2 object key `media/<aa>/<shortHash>.<ext>`, fanned out on the first two
 *  hex chars of the short hash. No leading slash: this is an object key, not a URL. `ext` is bare
 *  (no dot), for example `webp`. */
export function r2Key(shortHash: string, ext: string): string {
  if (!HASH_RE.test(shortHash)) {
    throw new Error(`r2Key: hash must be 16 lowercase hex chars, got "${shortHash}"`);
  }
  if (!R2_EXT_RE.test(ext)) {
    throw new Error(`r2Key: ext must be 1 to 5 lowercase alphanumerics, got "${ext}"`);
  }
  return `media/${shortHash.slice(0, 2)}/${shortHash}.${ext}`;
}

/** The public delivery URL path, with a leading slash, under the delivery base (`publicBase`,
 *  default `/media`). The `slug` form is human-readable (`<base>/<slug>.<shortHash>.<ext>`, or
 *  `<base>/<shortHash>.<ext>` when the slug is null); the `opaque` form mirrors the R2 fan-out
 *  (`<base>/<aa>/<shortHash>.<ext>`) and ignores the slug. */
export function publicPath(
  slug: string | null,
  shortHash: string,
  ext: string,
  urlForm: 'slug' | 'opaque',
  publicBase = '/media',
): string {
  if (urlForm === 'opaque') {
    return `${publicBase}/${shortHash.slice(0, 2)}/${shortHash}.${ext}`;
  }
  return slug === null
    ? `${publicBase}/${shortHash}.${ext}`
    : `${publicBase}/${slug}.${shortHash}.${ext}`;
}
