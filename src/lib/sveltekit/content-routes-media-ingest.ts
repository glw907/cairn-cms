// cairn-cms: the media upload actions (the editor upload endpoint and the Library's direct-upload
// commit), closed over the shared ContentRoutesContext (content-routes-context.ts), built once per
// call by createContentRoutesInternal.
import { fail, type ActionFailure } from '@sveltejs/kit';
import { isConflict } from '../github/types.js';
import { log } from '../log/index.js';
import { sniffMediaType, isDeniedUpload, extForMediaType } from '../media/sniff.js';
import { hashBytes, shortHash, slugifyFilename, r2Key } from '../media/naming.js';
import { formatMediaToken } from '../media/reference.js';
import { r2Store } from '../media/store.js';
import { parseMediaManifest, upsertMediaEntry, serializeMediaManifest } from '../media/manifest.js';
import type { MediaEntry } from '../media/manifest.js';
import { validateCsrfHeader } from './csrf.js';
import { requireCookieJar } from './guard.js';
import { canReach } from '../auth/access.js';
import { logCommitFailed } from './commit-log.js';
import {
  MAX_ALT,
  MAX_DISPLAY_NAME,
  MAX_ORIGINAL_FILENAME,
  MAX_DIMENSION,
  safeDecode,
  basename,
  sanitizeField,
  clampDimension,
  MANIFEST_CONFLICT_MESSAGE,
} from './content-routes-media-shared.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent } from './types.js';
// R2Bucket is named only to cast the raw binding for r2Store. It is a type-only import that never
// appears in an exported signature, so it does not reach the public `.d.ts`.
import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * A refused upload: the pre-store gates (session, media-off, missing bucket, oversized or
 *  disallowed content) and the mediaLibraryUploadAction commit's own `fail(409)` on a conflict.
 *  Just the one-line summary; a refusal here never stores bytes or commits a row. Retired from
 *  the public surface; the module-level export stays, since `uploadAction`'s and
 *  `mediaLibraryUploadAction`'s return type composes into `createContentRoutesInternal`
 *  (`content-routes.ts`, a different module), which the `.d.ts` emitter must be able to name.
 */
export interface MediaUploadFailure {
  error: string;
}

/**
 * The successful upload's response (`uploadAction`). The server-owned `record` rides the editor's
 *  optimistic client state and commits with the entry at Save (the upload itself commits nothing).
 *  `reused` is true when identical bytes were already stored, so the second upload did no second put;
 *  `mismatch` flags an existing object whose stored content type differs from this sniff. Retired
 *  from the public surface (the verify-wins resolution of the rank/verify divergence on
 *  `audit-sveltekit-uploadresult`, a flat retire rather than the ranked relocate to `/media`).
 *  The module-level export stays, since `media-upload-outcome.ts` imports it directly.
 */
export interface UploadResult {
  reference: string;
  record: MediaEntry;
  reused: boolean;
  mismatch: boolean;
}

/**
 * Build every media ingest action, closed over the shared content-routes context.
 */
export function createMediaIngestActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

  /**
   * Ingest an uploaded image: the shared store-and-derive body for the upload endpoint (spec piece
   * 2, decisions 1 to 3) and, later, the Media Library's direct-upload action. The body is the raw
   * file bytes, read once; the human metadata travels in percent-encoded `X-Cairn-*` request
   * headers. The server owns every committed field and trusts no client value: it sniffs the real
   * type, screens the engine deny-list, re-hashes, re-derives the ext and slug, caps and sanitizes
   * the human fields, and clamps the advisory dimensions. It stores put-first to R2 with
   * content-addressed dedup (no second put for identical bytes, no compensating delete) and commits
   * nothing to git; a caller that wants a git-committed row derives one from the returned record.
   *
   * Session authority: behind `createAuthGuard` the guard is the production session gate. An
   * unauthenticated admin POST is redirected 303 by the guard before this action runs (an opaque,
   * status-0 response under the client's `redirect: 'manual'`), so the `fail(401, 'session_expired')`
   * below is a belt-and-suspenders for a direct or un-guarded call, not the primary path.
   */
  async function ingestAndStore(event: CairnEvent): Promise<ActionFailure<MediaUploadFailure> | UploadResult> {
    // Read the editor up front for log attribution; the gate at step 4 enforces its presence. The
    // pre-session gates (1 to 3) may log with an undefined editor email, which is fine.
    const editor = event.locals.cairnEditor ?? null;
    const refuse = (status: number, reason: string): ActionFailure<MediaUploadFailure> => {
      log.warn('media.upload_failed', { editor: editor?.email, reason });
      return fail(status, { error: reason } satisfies MediaUploadFailure);
    };

    // 1. Media on.
    const resolved = runtime.resolvedAssets;
    if (!resolved.enabled) return refuse(503, 'media_disabled');

    // 2. Content-Length before the body is read: an absent or non-positive-integer length is a 411,
    //    an oversize length is a 413. Both refuse before the bytes are buffered. The header is
    //    client-advisory, so the real DoS bound is the Worker request-size limit, not maxUploadBytes:
    //    a lying client still buffers up to the platform ceiling before the post-read recheck (step 5).
    const lengthHeader = event.request.headers.get('content-length');
    const length = lengthHeader === null ? NaN : Number(lengthHeader);
    if (!Number.isInteger(length) || length <= 0) return refuse(411, 'length_required');
    if (length > resolved.maxUploadBytes) return refuse(413, 'too_large');

    // 3. CSRF from the X-Cairn-CSRF header (no body clone): the action is the CSRF authority for the
    //    raw-body upload, since the guard runs its form-CSRF only on form content types. An untyped
    //    caller with no cookie jar at all throws loudly instead (convention-auth-loud-postures).
    const cookies = requireCookieJar(event);
    if (!validateCsrfHeader({ url: event.url, request: event.request, cookies, platform: event.platform })) {
      return refuse(403, 'csrf');
    }

    // 4. JSON-aware session (belt-and-suspenders; see the docstring): behind the guard an
    //    unauthenticated POST is already 303'd before this runs. For a direct or un-guarded call,
    //    read the resolved editor directly and refuse with a 401 envelope rather than a 303 redirect.
    if (!editor) return refuse(401, 'session_expired');

    // 4.5. The access map's own admission gate for the media screen, the same one every other media
    //      action enforces. The concept editor's inline image picker calls this exact endpoint, so
    //      restricting `media` restricts it too (the documented media-picker landmine): a role edits
    //      an image-bearing concept only when it also reaches `media`.
    if (!canReach(runtime.access, editor, 'media')) {
      log.warn('auth.access.denied', { email: editor.email, role: editor.role, target: 'media' });
      return refuse(403, 'access_denied');
    }

    // 5. Read the body once. Content-Length is client-advisory, so a lying client could send more
    //    than it declared; recheck the real size against the cap after the read.
    const bytes = new Uint8Array(await event.request.arrayBuffer());
    if (bytes.length > resolved.maxUploadBytes) return refuse(413, 'too_large');

    // 6. Server re-derivation: trust nothing the client declared.
    const declaredType = event.request.headers.get('content-type') ?? undefined;
    const sniffed = sniffMediaType(bytes);
    if (isDeniedUpload(bytes, declaredType) || sniffed === null || !resolved.allowedTypes.includes(sniffed)) {
      return refuse(415, 'unsupported_type');
    }
    const ext = extForMediaType(sniffed);
    if (ext === null) return refuse(415, 'unsupported_type');

    const full = await hashBytes(bytes);
    const hash = shortHash(full);

    const decodedFilename = safeDecode(event.request.headers.get('x-cairn-filename'));
    const slug = slugifyFilename(decodedFilename);
    const originalFilename = sanitizeField(basename(decodedFilename), MAX_ORIGINAL_FILENAME);
    const alt = sanitizeField(safeDecode(event.request.headers.get('x-cairn-alt')), MAX_ALT);
    const displayNameRaw = sanitizeField(safeDecode(event.request.headers.get('x-cairn-display-name')), MAX_DISPLAY_NAME);
    const displayName = displayNameRaw || slug;
    const width = clampDimension(event.request.headers.get('x-cairn-width'));
    const height = clampDimension(event.request.headers.get('x-cairn-height'));

    // 7. Store put-first with R2-head dedup, commit nothing. The raw bucket binding lives on
    //    platform.env, which the engine reads through a structural cast (the engine does not declare
    //    App.Platform). r2Store wraps it as the narrow MediaStore seam; R2Bucket is named only for
    //    this cast and never in an exported signature.
    const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
    const rawBucket = platformEnv[resolved.bucketBinding];
    if (!rawBucket) return refuse(503, 'binding_missing');
    const store = r2Store(rawBucket as R2Bucket);

    const key = r2Key(hash, ext);
    const existing = await store.head(key);
    let reused: boolean;
    let mismatch = false;
    if (existing !== null) {
      // The key derives from the 16-hex short hash (64 bits), so a distinct file could in principle
      // collide on it. The put stores the full sha256 as custom metadata; verify it here. A stored
      // sha256 that differs from this upload's full hash is a genuine short-hash collision: refuse,
      // never serve the first file's bytes under the second's reference. A stored object with no
      // sha256 (a legacy or manually-put object we cannot verify) proceeds as a dedup hit, best effort.
      const storedSha = existing.customMetadata?.sha256;
      if (storedSha !== undefined && storedSha !== full) return refuse(409, 'hash_collision');
      // Identical bytes are already stored: skip the put. A second upload does no second put, so a
      // concurrent dedup-reuse is never clobbered. Flag a stored type that disagrees with this sniff.
      reused = true;
      mismatch = existing.httpMetadata?.contentType !== undefined && existing.httpMetadata.contentType !== sniffed;
    } else {
      await store.put(
        key,
        bytes,
        { contentType: sniffed, cacheControl: 'public, max-age=31536000, immutable' },
        { sha256: full },
      );
      reused = false;
    }

    const record: MediaEntry = {
      hash,
      sha256: full,
      slug,
      displayName,
      originalFilename,
      alt,
      ext,
      contentType: sniffed,
      bytes: bytes.length,
      width,
      height,
      createdAt: new Date().toISOString(),
    };
    const reference = formatMediaToken({ slug, hash });

    log.info('media.uploaded', { editor: editor.email, hash, bytes: bytes.length, contentType: sniffed, reused });
    return { reference, record, reused, mismatch };
  }

  /**
   * Wire contract: this is a SvelteKit form action, so for a JSON request SvelteKit serializes the
   * result into a 200 JSON envelope `{ type, status, data }`. A `fail(status, ...)` rides the
   * envelope's `status` field, NOT the HTTP response status (the HTTP status stays 200); a client
   * parses `type`/`status` from the body, never `Response.status`. Success returns a plain
   * `UploadResult` (also a 200 envelope). The action logs `media.upload_failed` on a refusal and
   * `media.uploaded` on success. Delegates to `ingestAndStore`, the shared store-and-derive body.
   */
  async function uploadAction(event: CairnEvent): Promise<ActionFailure<MediaUploadFailure> | UploadResult> {
    return ingestAndStore(event);
  }

  /**
   * Upload straight into the Library: store the bytes and derive the record via `ingestAndStore`
   *  (the editor upload's shared body), then commit the row to `main` in the same step, since a
   *  Library-direct upload has no entry and no Save to ride. The client posts only the file; the
   *  server derives and commits every field, trusting nothing client-posted (`ingestAndStore`'s
   *  contract). A hash already present in the manifest is an idempotent no-op: the asset (and its
   *  row) already exist, so the upload commits nothing and still returns the success envelope.
   *  Mirrors the safe-delete/rename commit shape: a conflict answers with a `fail(409)` envelope,
   *  which this action's client reads as JSON rather than following.
   */
  async function mediaLibraryUploadAction(event: CairnEvent): Promise<ActionFailure<MediaUploadFailure> | UploadResult> {
    const result = await ingestAndStore(event);
    if (!('record' in result)) return result;
    const editor = event.locals.cairnEditor!; // ingestAndStore already refused a missing session.
    const backend = ctx.resolveBackend(event);

    // Read the head BEFORE the manifest, so this expectedHead is at-or-before the bytes the commit
    // sends; media.json has no regenerate-from-files backstop, so a concurrent upload fails closed
    // rather than last-writer-wins dropping a row.
    const head = await backend.branchHead(backend.defaultBranch);
    const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    if (manifest[result.record.hash]) return result; // Bytes and row already committed: nothing to do.

    const commitFields = { scope: 'media' as const, id: result.record.hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(upsertMediaEntry(manifest, result.record)) }],
        { name: editor.displayName, email: editor.email },
        `Upload media: ${result.record.slug}`,
        head ?? undefined,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      logCommitFailed(commitFields, err);
      if (!isConflict(err)) throw err;
      return fail(409, { error: MANIFEST_CONFLICT_MESSAGE } satisfies MediaUploadFailure);
    }
    return result;
  }

  return { uploadAction, mediaLibraryUploadAction };
}
