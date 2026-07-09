// The media delivery route: an engine-provided SvelteKit RequestHandler a site mounts at
// `/media/[...path]`. It streams content-addressed bytes from R2 with the security headers that are
// the load-bearing XSS control for served media. The route sits outside `/admin`, so the admin
// security headers never run on it; it owns its own.
//
// It lives on the `/sveltekit` barrel, not the node-safe `/media` subpath, because it reads
// `platform.env`, which pulls `@sveltejs/kit` into its graph. Its public signature names only kit
// (a peer dependency) and web globals, never an `@cloudflare/workers-types` type (decision 5).
import type { RequestHandler } from '@sveltejs/kit';
import { requireBucket } from '../env.js';
import { CairnError } from '../diagnostics/index.js';
import { r2Key } from '../media/naming.js';
import { log } from '../log/index.js';
import type { DeliveryObject, DeliveryObjectBody } from '../media/delivery-bucket.js';
import type { CairnRuntime } from '../content/types.js';
import { deriveOnlyIf, deriveRange } from './media-conditional.js';

/** A 16-character lowercase hex content-hash prefix, validated before any R2 lookup. */
const HASH_RE = /^[0-9a-f]{16}$/;

/**
 * The closed delivery extension allow-list. A filename ext outside this set is a 404 with no R2
 *  read, so the route can never serve a type it cannot vouch for.
 */
const DELIVERY_EXTS: ReadonlySet<string> = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);

/**
 * The load-bearing XSS control: set on every non-404 response, so a served object can never run as
 *  active content. `Content-Type` comes from the stored, server-validated metadata via
 *  `writeHttpMetadata`; these override or add to it.
 */
function applySecurityHeaders(headers: Headers, etag: string): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Disposition', 'inline');
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', etag);
  // An object stored outside the upload pipeline (a manual put, a future import) may carry no
  // content type, so writeHttpMetadata would set none. Pair `nosniff` with an explicit safe
  // default rather than serving a typeless response.
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/octet-stream');
}

/**
 * True when the returned object carries a body (a full or ranged read), narrowing it to the body
 *  variant. R2 returns a body-less object on an `If-None-Match` hit.
 */
function hasBody(obj: DeliveryObject | DeliveryObjectBody): obj is DeliveryObjectBody {
  return 'body' in obj && (obj as DeliveryObjectBody).body != null;
}

/**
 * Build the media delivery `RequestHandler` for a site's composed runtime.
 *
 * The handler reads the runtime's resolved media config itself, matching the convention every
 * other route factory follows, validates the hash and extension before any R2 call, derives the
 * object key from the validated values only (never trusting the URL's fan-out), guards the
 * Cloudflare Images self-loop, and sets the security headers on every served response.
 * @param runtime - the composed runtime; its `resolvedAssets` decides delivery, and a media-off
 * site's handler always 404s.
 */
export function createMediaRoute(runtime: CairnRuntime): RequestHandler {
  const resolved = runtime.resolvedAssets;
  return async (event) => {
    // Media off: the route is mounted but serves nothing.
    if (!resolved.enabled) return new Response(null, { status: 404 });

    // The catch-all param is conventionally `path` (route `/media/[...path]`). Decode each segment
    // on its own and reject a traversal or an embedded slash, so no undecoded or `..` path reaches
    // R2. params.path is `string | undefined` (kit's fallback ambient types), so guard the absence.
    const raw = event.params.path;
    if (typeof raw !== 'string' || raw === '') return new Response(null, { status: 404 });
    const segments: string[] = [];
    for (const part of raw.split('/')) {
      let decoded: string;
      try {
        decoded = decodeURIComponent(part);
      } catch {
        return new Response(null, { status: 404 });
      }
      if (decoded === '' || decoded.includes('/') || decoded === '..') {
        return new Response(null, { status: 404 });
      }
      segments.push(decoded);
    }

    // The filename is the last segment; its dot fields end with `<hash>.<ext>`. The slug, if any, is
    // attacker-controlled and ignored. parseMediaToken does not run here.
    const filename = segments[segments.length - 1];
    const fields = filename.split('.');
    if (fields.length < 2) return new Response(null, { status: 404 });
    const ext = fields[fields.length - 1].toLowerCase();
    const hash = fields[fields.length - 2];

    // Validate before any R2 call: a bad hash or ext is a 404 with no read.
    if (!HASH_RE.test(hash) || !DELIVERY_EXTS.has(ext)) {
      return new Response(null, { status: 404 });
    }

    // Derive the key from the validated values only; r2Key recomputes the fan-out from the hash.
    const key = r2Key(hash, ext);

    // Resolve the bucket. A missing binding is a drained 503 with a log, never a thrown 500.
    let bucket;
    try {
      // `event.platform` is `App.Platform`, which the engine does not declare (a site does, with an
      // `env`), so read it through a structural cast rather than naming the site's ambient type.
      const platform = event.platform as { env?: Record<string, unknown> } | undefined;
      bucket = requireBucket(platform?.env ?? {}, resolved.bucketBinding);
    } catch (err) {
      if (err instanceof CairnError && err.conditionId === 'config.bindings-missing') {
        log.warn('media.delivery_failed', {
          reason: 'binding-missing',
          binding: resolved.bucketBinding,
        });
        return new Response(null, { status: 503 });
      }
      throw err;
    }

    // Self-loop guard: the Cloudflare Images origin subrequest carries `Via: image-resizing`. Serve
    // it a clean full-body 200 with no conditional or range handling, so a transform cannot loop.
    const via = event.request.headers.get('Via') ?? '';
    const isImageResizing = via.includes('image-resizing');

    // Only forward `range` when the request actually carried a `Range` header. R2 populates the
    // returned object's `.range` whenever a `range` option is passed (even a header-less one), so
    // passing it unconditionally would turn every full GET into a 206.
    const hasRangeRequest = !isImageResizing && event.request.headers.has('Range');
    // Derive plain option objects rather than passing `event.request.headers` itself: miniflare's
    // `getPlatformProxy` magic proxy cannot serialize a `Headers` instance, so a consumer's `vite
    // dev` would 500 on every read.
    const onlyIf = isImageResizing ? undefined : deriveOnlyIf(event.request.headers);
    const range = hasRangeRequest
      ? deriveRange(event.request.headers.get('Range') as string)
      : undefined;
    const getOpts = isImageResizing
      ? undefined
      : { ...(onlyIf ? { onlyIf } : {}), ...(range ? { range } : {}) };
    const obj = await bucket.get(key, getOpts);

    if (obj === null) return new Response(null, { status: 404 });

    // A body-less object is R2's `If-None-Match` hit: 304, no body. Skipped for the self-loop path,
    // which always requested the full body.
    if (!isImageResizing && !hasBody(obj)) {
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      applySecurityHeaders(headers, obj.httpEtag);
      return new Response(null, { status: 304, headers });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    applySecurityHeaders(headers, obj.httpEtag);

    // A ranged read carries `obj.range`: respond 206 with a Content-Range. R2 fills the served
    // window; derive the bounds defensively against the full size.
    if (hasRangeRequest && obj.range) {
      const start = obj.range.offset ?? 0;
      const length = obj.range.length ?? obj.size - start;
      const end = start + length - 1;
      headers.set('Content-Range', `bytes ${start}-${end}/${obj.size}`);
      const body = hasBody(obj) ? obj.body : null;
      return new Response(body, { status: 206, headers });
    }

    const body = hasBody(obj) ? obj.body : null;
    return new Response(body, { status: 200, headers });
  };
}
