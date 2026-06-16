// cairn-cms: the client-side ingest helper. Browser-only, behind the editor seam: the orchestration
// touches createImageBitmap, a <canvas>, and a lazy-loaded heic-to WASM decoder, so this module lives
// beside the other dynamically-imported editor modules (editor-folding, editor-highlight, editor-modes)
// and is never re-exported from a node-safe subpath. The heic-to import is dynamic, so its WASM only
// downloads when an author actually drops a HEIC; the static imports here are the pure node-safe
// sniff/slug helpers, which keep this module loadable in a unit test.
//
// The split: the pure parts (HEIC magic detection, GIF header parse, the slug-versus-proposed-name
// call, the DataTransfer normalizer, the canvas budget, the failure taxonomy, the upload request
// shape) are exported and unit-tested. The browser-coupled orchestration (ingestFile, the drop guard)
// is thin glue over them, wired here but proven live at Phase 2b and on a site, not in this suite.
//
// The client is untrusted. The server re-derives the type, the slug, the hash, and the size on every
// upload (the Task 5 uploadAction), so this helper exists for UX (a correct preview, no dead wait),
// never for security.
import { sniffMediaType } from '../media/sniff.js';

// ---------------------------------------------------------------------------
// Pure exports (unit-tested below the seam)
// ---------------------------------------------------------------------------

/**
 * True when the leading bytes are a HEIC/HEIF `ftyp` box (the sniff returns `image/heic`). Driven by
 * the magic bytes alone, never the filename extension or the browser-supplied MIME, since both lie on
 * an iPhone share-sheet drop.
 */
export function detectHeic(bytes: Uint8Array): boolean {
  return sniffMediaType(bytes) === 'image/heic';
}

/**
 * Read a GIF's pixel dimensions from its logical-screen-descriptor header (the 16-bit little-endian
 * width and height at bytes 6..9), or null when the input is not a `GIF8` file or is too short to hold
 * the descriptor. GIF passes through ingest untouched (never a canvas), so the animation survives, and
 * its dimensions come from this header rather than a decode.
 */
export function gifDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  // 'GIF8' is the shared prefix of the 87a and 89a versions; the descriptor needs at least 10 bytes.
  if (bytes.length < 10) return null;
  if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x38) return null;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  return { width, height };
}

/** A bare run of digits, the camera-counter stem of `1234.png` and friends. */
const BARE_NUMBER = /^\d+$/;

/** The fixed generic stems a phone or OS hands a file: the capture card treats these as no name. */
const GENERIC_STEMS = new Set(['image', 'photo', 'untitled', 'unnamed', 'download']);

/**
 * The camera and OS counter patterns. `IMG_1234`, `DSC_0001`, `DSCN0001`, `P1010001`, the iPhone
 * `IMG_E1234` edited form, a `Screenshot ...` stem, and a Windows/Android `Screenshot_...` stem are all
 * machine-assigned and carry no authorial meaning, so they yield no proposed name.
 */
const GENERIC_PATTERNS: RegExp[] = [
  /^img[_-]?e?\d+$/i,
  /^dsc[fn]?[_-]?\d+$/i,
  /^p\d{7}$/i,
  /^screenshot[ _-]/i,
  /^screen shot /i,
];

/**
 * The slug-versus-proposed-name split. A real, specific filename stem yields a proposed display name
 * (the stem, extension dropped) that the capture card pre-fills and tags Suggested. A generic
 * machine-assigned stem (`IMG_1234`, `DSC_0001`, `image`, `photo`, `untitled`, a bare number, a HEIC
 * counter, a screenshot pattern) yields null, and the card leaves the name field empty and required
 * with no Suggested tag, since pre-filling `IMG_4821` would only train the author to accept noise.
 */
export function proposedNameFor(filename: string): string | null {
  const dot = filename.lastIndexOf('.');
  const stem = (dot === -1 ? filename : filename.slice(0, dot)).trim();
  if (stem === '') return null;

  const lower = stem.toLowerCase();
  if (GENERIC_STEMS.has(lower)) return null;
  if (BARE_NUMBER.test(stem)) return null;
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(stem)) return null;
  }
  return stem;
}

/**
 * The image files in a drag-and-drop payload, in order, dropping every non-image. Filters by
 * `type.startsWith('image/')`, so a `text/uri-list` or `text/html` item dragged in from a browser tab
 * is ignored (those arrive as `items`, never as image `files`). Testable with a plain object mock, so
 * it never requires a real `DataTransfer`.
 */
export function normalizeDataTransfer(dt: {
  files?: ArrayLike<File>;
  items?: ArrayLike<DataTransferItem>;
}): File[] {
  const files = dt.files;
  if (!files) return [];
  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file && typeof file.type === 'string' && file.type.startsWith('image/')) out.push(file);
  }
  return out;
}

/** The conservative canvas area budget, about 16.7M px (4096 x 4096). A source over this is scaled
 *  down before any `drawImage`, never clipped. */
export const MAX_AREA = 16_777_216;

/** The conservative short-side budget. A source whose smaller dimension exceeds this is scaled down so
 *  the short side lands at the cap, even when its area is within MAX_AREA. */
export const MAX_SHORT_SIDE = 4096;

/**
 * The canvas budget for a source of the given dimensions. When the source area exceeds MAX_AREA or its
 * short side exceeds MAX_SHORT_SIDE, scale the whole image down proportionally so both bounds hold
 * (aspect ratio preserved, never clipped, never upscaled); otherwise return the input unchanged. Pure
 * math, so the budget is testable without a canvas.
 */
export function budgetForDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  const area = width * height;
  const shortSide = Math.min(width, height);
  if (area <= MAX_AREA && shortSide <= MAX_SHORT_SIDE) return { width, height };

  // One scale factor satisfies both bounds: the smaller of the area-fit and short-side-fit factors,
  // capped at 1 so an already-small dimension is never upscaled.
  const areaScale = Math.sqrt(MAX_AREA / area);
  const shortScale = MAX_SHORT_SIDE / shortSide;
  const scale = Math.min(areaScale, shortScale, 1);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

/** The ingest failure taxonomy. `decode-unsupported` is a format the browser and the HEIC decoder both
 *  refuse; `transcode-failed` is a HEIC decode or a canvas re-encode that threw; `too-large` is a
 *  source still over budget after a transcode; `network` is the upload fetch rejecting. */
export type IngestFailureKind =
  | 'decode-unsupported'
  | 'transcode-failed'
  | 'too-large'
  | 'network';

/** A failed ingest card: a stable discriminant plus a human message the capture card renders. */
export interface IngestFailureCard {
  status: 'failed';
  kind: IngestFailureKind;
  message: string;
}

/** A pending ingest card, shown while the bytes are decoded, transcoded, and uploaded. */
export interface IngestPendingCard {
  status: 'pending';
}

/** A ready ingest card: the upload succeeded and the server returned a reference. */
export interface IngestReadyCard {
  status: 'ready';
  reference: string;
  width: number | null;
  height: number | null;
}

/** The card states the capture UI moves through for a single ingested file. */
export type IngestCard = IngestPendingCard | IngestReadyCard | IngestFailureCard;

/** The human message per failure kind, plain and specific so an author knows whether to retry. */
const FAILURE_MESSAGE: Record<IngestFailureKind, string> = {
  'decode-unsupported': 'This image format is not supported. Try a JPEG, PNG, WebP, or GIF.',
  'transcode-failed': 'This image could not be converted. Try exporting it as a JPEG first.',
  'too-large': 'This image is too large to add, even after shrinking it.',
  network: 'The upload could not reach the server. Check your connection and try again.',
};

/** Map a failure kind to its typed card state. */
export function failureCard(kind: IngestFailureKind): IngestFailureCard {
  return { status: 'failed', kind, message: FAILURE_MESSAGE[kind] };
}

/** The fields the upload request carries, mirroring exactly what the Task 5 uploadAction reads back. */
export interface UploadRequestOpts {
  conceptId: string;
  id: string;
  bytes: Uint8Array | Blob;
  contentType: string;
  csrf: string;
  filename: string;
  alt?: string;
  displayName?: string;
  width?: number | null;
  height?: number | null;
}

/**
 * Construct the upload request the helper will `fetch`: a `POST` to the named SvelteKit form action
 * `/admin/<conceptId>/<id>?/upload`, the raw bytes as the body, `redirect: 'manual'` so an expired
 * session's 303 surfaces instead of being silently followed, and the `X-Cairn-*` headers the
 * uploadAction reads. The filename, alt, and display name are percent-encoded so a unicode value
 * survives header transport; width and height ride only when present. Pure: it returns the request
 * shape and never calls `fetch`, so a test can assert the URL, method, and headers.
 */
export function buildUploadRequest(opts: UploadRequestOpts): { url: string; init: RequestInit } {
  const url = `/admin/${opts.conceptId}/${opts.id}?/upload`;
  const headers: Record<string, string> = {
    'X-Cairn-CSRF': opts.csrf,
    'Content-Type': opts.contentType,
    'X-Cairn-Filename': encodeURIComponent(opts.filename),
  };
  if (opts.alt !== undefined && opts.alt !== '') headers['X-Cairn-Alt'] = encodeURIComponent(opts.alt);
  if (opts.displayName !== undefined && opts.displayName !== '') {
    headers['X-Cairn-Display-Name'] = encodeURIComponent(opts.displayName);
  }
  if (opts.width !== undefined && opts.width !== null) headers['X-Cairn-Width'] = String(opts.width);
  if (opts.height !== undefined && opts.height !== null) headers['X-Cairn-Height'] = String(opts.height);

  // BodyInit accepts a Blob or a BufferSource; a Uint8Array is a BufferSource. The cast keeps the
  // public BodyInit type while letting either input through.
  const init: RequestInit = {
    method: 'POST',
    redirect: 'manual',
    headers,
    body: opts.bytes as BodyInit,
  };
  return { url, init };
}

// ---------------------------------------------------------------------------
// Browser-coupled glue (wired, proven live at 2b/site, not unit-tested here)
// ---------------------------------------------------------------------------

/** The structural shape of the heic-to module's `heicTo`, typed here so the dynamic import stays
 *  lazy. A HEIC blob in, a decoded image blob out (PNG, with the HEIF orientation already applied). */
type HeicTo = (args: { blob: Blob; type: 'image/png' }) => Promise<Blob>;

/** A decoded source plus its dimensions, the input to the upload step. */
interface IngestResult {
  blob: Blob;
  contentType: string;
  width: number | null;
  height: number | null;
}

/** Thrown inside the orchestration so a kind maps cleanly to a failure card at the boundary. */
class IngestError extends Error {
  constructor(readonly kind: IngestFailureKind) {
    super(kind);
  }
}

/**
 * The three-tier ingest route for one file. Web-native types (JPEG, PNG, WebP) pass through with
 * dimensions from `createImageBitmap`; GIF passes through with dimensions from `gifDimensions` (no
 * canvas, so the animation survives); HEIC routes through the lazy-loaded heic-to decoder, is decoded
 * to a PNG, then re-encoded to WebP through the canvas budget. Any forced re-encode targets WebP. This
 * is thin glue over the pure helpers above and is proven live, not in this suite.
 */
export async function ingestFile(file: File): Promise<IngestResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffMediaType(bytes);

  if (sniffed === 'image/gif') {
    // GIF passes through untouched: dimensions from the header, never a canvas.
    const dims = gifDimensions(bytes);
    return { blob: file, contentType: 'image/gif', width: dims?.width ?? null, height: dims?.height ?? null };
  }

  if (sniffed === 'image/jpeg' || sniffed === 'image/png' || sniffed === 'image/webp') {
    // Web-native passthrough: read the real pixel dimensions with the embedded orientation applied.
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      throw new IngestError('decode-unsupported');
    }
    const out = { blob: file, contentType: sniffed, width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return out;
  }

  if (detectHeic(bytes)) {
    // HEIC: lazy-load the decoder so its WASM downloads only on a real HEIC drop. heicTo applies the
    // HEIF orientation when it produces the PNG.
    let png: Blob;
    try {
      const mod = (await import('heic-to')) as { heicTo: HeicTo };
      png = await mod.heicTo({ blob: file, type: 'image/png' });
    } catch {
      throw new IngestError('transcode-failed');
    }
    return reencodeToWebp(png);
  }

  throw new IngestError('decode-unsupported');
}

/**
 * Re-encode a decoded blob to WebP through the conservative canvas budget: read its dimensions, size a
 * canvas to `budgetForDimensions` (scaling down, never clipping), draw the bitmap into it, and export
 * WebP. A source still over budget after the transcode is a `too-large` failure rather than a clip.
 */
async function reencodeToWebp(source: Blob): Promise<IngestResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    throw new IngestError('transcode-failed');
  }

  const budget = budgetForDimensions(bitmap.width, bitmap.height);
  if (budget.width * budget.height > MAX_AREA) {
    bitmap.close();
    throw new IngestError('too-large');
  }

  const canvas = document.createElement('canvas');
  canvas.width = budget.width;
  canvas.height = budget.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new IngestError('transcode-failed');
  }
  ctx.drawImage(bitmap, 0, 0, budget.width, budget.height);
  bitmap.close();

  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp'));
  if (!webp) throw new IngestError('transcode-failed');
  return { blob: webp, contentType: 'image/webp', width: budget.width, height: budget.height };
}

/** The failure kind for a thrown ingest error, defaulting an unknown throw to a decode failure. */
export function ingestFailureKind(error: unknown): IngestFailureKind {
  return error instanceof IngestError ? error.kind : 'decode-unsupported';
}

/**
 * Send a built upload request and return its raw `Response`, mapping a fetch rejection (the network
 * down, the request aborted) to a `network` IngestError. The caller reads the SvelteKit action result
 * from the response; this thin wrapper exists only so the tests can build a request without invoking
 * `fetch`.
 */
export async function sendUpload(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new IngestError('network');
  }
}

/** Guard a drop target: cancel the browser's default open-the-file behavior on `dragover` and `drop`
 *  so a dropped image stays inside the editor rather than navigating the page to the file. */
export function guardDropTarget(event: DragEvent): void {
  event.preventDefault();
}
