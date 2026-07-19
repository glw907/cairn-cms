// cairn-cms: the Media Library's load and every media action (upload, safe-delete, bulk delete,
// the orphan scan and purge, metadata edit, and the replace-in-place / alt-propagation preview and
// apply pairs). createMediaActions closes over the shared ContentRoutesContext
// (content-routes-context.ts) built once by createContentRoutes.
import { redirect, error, fail } from '@sveltejs/kit';
import { isConflict } from '../github/types.js';
import { log } from '../log/index.js';
import { sniffMediaType, isDeniedUpload, extForMediaType } from '../media/sniff.js';
import { hashBytes, shortHash, slugifyFilename, r2Key } from '../media/naming.js';
import { mediaToken } from '../media/reference.js';
import { r2Store } from '../media/store.js';
import { parseMediaEntries, parseMediaManifest, upsertMediaEntry, removeMediaEntry, serializeMediaManifest } from '../media/manifest.js';
import type { MediaEntry } from '../media/manifest.js';
import { mediaLibraryEntry } from '../media/library-entry.js';
import type { MediaLibraryEntry } from '../media/library-entry.js';
import { buildUsageIndex } from '../media/usage.js';
import type { UsageEntry } from '../media/usage.js';
import { runReconcile, MEDIA_KEY_RE, type ReconcileBucket } from '../media/reconcile.js';
import type { ResolvedAssetConfig } from '../media/config.js';
import { buildOrphanScan, type OrphanScan } from '../media/orphan-scan.js';
import { repointMediaRef, fillAltForHash } from '../content/media-rewrite.js';
import type { RepointPlacement, AltPlacement } from '../content/media-rewrite.js';
import { planMediaRewrite } from '../media/rewrite-plan.js';
import type { BranchRef } from '../media/rewrite-plan.js';
import { planBulkDelete } from '../media/bulk-delete-plan.js';
import type { BulkDeleteSkip } from '../media/bulk-delete-plan.js';
import type { FileChange } from '../github/repo.js';
import { PENDING_PREFIX } from '../content/pending.js';
import { emptyManifest, parseManifest } from '../content/manifest.js';
import { validateCsrfHeader } from './csrf.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import { canReach } from '../auth/access.js';
import type { ContentRoutesContext, ContentEvent } from './content-routes-context.js';
// R2Bucket is named only to cast the raw binding for r2Store. It is a type-only import that never
// appears in an exported signature, so it does not reach the public `.d.ts`.
import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * One asset's where-used overlay, kept separate from MediaLibraryEntry so the picker's shared
 *  projection stays decoupled from the Library-only usage facts.
 */
export interface MediaUsageInfo {
  /** Distinct content entries that reference the asset (count by distinct concept+id). */
  count: number;
  /** Every where-used row (published and edit-branch origins), for the detail's grouped list. */
  entries: UsageEntry[];
}

/**
 * The Media Library screen's data: the unioned assets, the per-hash usage overlay, and the
 *  degraded-load error. The usage overlay is keyed by content hash; an asset with no references
 *  simply has no key, which the screen renders as "no references found".
 */
export interface MediaLibraryData {
  assets: MediaLibraryEntry[];
  /** Per-hash usage overlay, kept separate from MediaLibraryEntry so the popover stays decoupled. */
  usage: Record<string, MediaUsageInfo>;
  /**
   * The degraded-load error: a failed token mint or media read. This slot is the failure of THIS
   *  load, distinct from a prior action's conflict error (see `flashError`), so a read failure and a
   *  redirected commit conflict never overwrite each other.
   */
  error: string | null;
  /**
   * The success flash a redirected action carries: `deleted` from `?deleted=1`, `updated` from
   *  `?updated=1`, `replaced` from `?replaced=1`, `altPropagated` from `?altPropagated=1`,
   *  `bulkDeleted` from `?bulkDeleted=1`, `orphansPurged` from `?orphansPurged=1`, `uploaded` from
   *  `?uploaded=1`, null otherwise. The component renders a polite success strip for each.
   */
  flash: 'deleted' | 'updated' | 'replaced' | 'altPropagated' | 'bulkDeleted' | 'orphansPurged' | 'uploaded' | null;
  /**
   * A redirected action's conflict error read from `?error=` (a commit-conflict bounce). Kept in
   *  its own slot rather than the degraded-load `error` above, so the two never collide.
   */
  flashError: string | null;
}

/**
 * A refused media delete: `fail(404)` for an asset not committed on the default branch, or
 *  `fail(409)` when a fresh usage read finds the asset still in use and the typed-slug override
 *  was not given. `fail(503)` covers media-off or a missing bucket binding.
 */
export interface MediaDeleteRefusal {
  /** The one-line human summary every action failure carries. */
  error: string;
  /** The refused asset's content hash, so the dialog marks the right asset. */
  hash: string;
  /** The where-used rows (published first, then by branch) the in-use face lists; empty otherwise. */
  usage: UsageEntry[];
  /** The distinct-entry count behind the refusal; zero when the asset is uncommitted. */
  foundIn: number;
}

/**
 * A refused media metadata edit: `fail(404)` for an asset not committed on the default branch, or
 *  `fail(400)` for an invalid slug.
 */
export interface MediaUpdateFailure {
  /** The one-line human summary every action failure carries. */
  error: string;
}

/**
 * A refused media replace: `fail(409)` when a fresh usage read finds the asset still in use and the
 *  typed-slug override was not given, or `fail(503)` when usage cannot be verified (fail closed) or the
 *  bucket is unbound. Mirrors MediaDeleteRefusal: the asset hash, the where-used rows, and the count.
 */
export interface MediaReplaceFailure {
  error: string;
  hash: string;
  usage: UsageEntry[];
  foundIn: number;
}

/**
 * A refused media alt-propagation: `fail(503)` when usage cannot be verified across main and every
 *  open branch (fail closed), or the bucket is unbound. Just the one-line summary; alt fill has no
 *  typed-slug gate.
 */
export interface MediaAltPropagateFailure {
  error: string;
}

/**
 * A refused media bulk delete or orphan purge: `fail(503)` for the fail-closed strict-usage refusal
 *  (the whole batch refuses) or media-off / a missing bucket binding. The per-item outcomes ride the
 *  returned summary, not a fail.
 */
export interface MediaBulkFailure {
  error: string;
}

/**
 * A refused upload: the pre-store gates (session, media-off, missing bucket, oversized or
 *  disallowed content) and the mediaLibraryUploadAction commit's own conflict bounce. Just the one-line
 *  summary; a refusal here never stores bytes or commits a row. Module-internal: the client reads
 *  the envelope's `error` string loosely, so no other module names this type.
 */
interface MediaUploadFailure {
  error: string;
}

/**
 * The bulk-delete outcome the component renders: the deleted hashes, the skipped rows from the
 *  partition (with their reason and where-used), and any per-object R2 delete failure. Admin-internal,
 *  not on the package subpath, so no reference page.
 */
export interface MediaBulkDeleteResult {
  deleted: string[];
  skipped: BulkDeleteSkip[];
  failed: { hash: string; error: string }[];
}

/**
 * The orphan-purge outcome: the purged R2 keys, the keys skipped because their hash was claimed by a
 *  manifest row since the scan, and any per-object delete failure. Admin-internal, no reference page.
 */
export interface MediaOrphanPurgeResult {
  purged: string[];
  skippedClaimed: string[];
  failed: { key: string; error: string }[];
}

/**
 * One entry the replace preview will rewrite, enriched with its display title and permalink from the
 *  content manifest (the planner's PlannedEntry carries neither). The screen lists these as the
 *  confirm dialog's where-touched preview, and the apply re-derives its own plan rather than trusting
 *  this. Admin-internal: exported from content-routes for the bundled Media Library component, not
 *  added to the package's sveltekit subpath, so it carries no reference page.
 */
export interface MediaReplacePreviewEntry {
  /** The concept id, e.g. "posts". */
  concept: string;
  /** The entry id (its filename stem). */
  id: string;
  /** The entry's display title, from the content manifest. */
  title: string;
  /** The entry's public permalink, from the content manifest. */
  permalink?: string;
  /** The per-reference diff for this entry: one placement per repointed `media:` token. */
  placements: RepointPlacement[];
}

/**
 * The replace preview plan: the affected main entries (enriched), the distinct affected count, and
 *  the report-only cross-branch delta (open cairn/* branches that reference the same bytes; an apply
 *  rewrites main only). Display-only: the apply re-derives a fresh plan and never trusts this.
 */
export interface MediaReplacePreviewPlan {
  affectedCount: number;
  entries: MediaReplacePreviewEntry[];
  branchDelta: BranchRef[];
}

/**
 * One entry the alt-propagation preview reports, enriched with its display title and permalink from
 *  the content manifest. Its placements carry every reference of the asset on this entry, each tagged
 *  with the bucket it falls in (a will-fill, a customized alt left as-is, or a decorative hero), so
 *  the screen can show what would change. Module-internal: only MediaAltPreviewPlan's `entries` field
 *  names it, so the bundled Media Library component consumes it structurally through that field.
 */
interface MediaAltPreviewEntry {
  /** The concept id, e.g. "posts". */
  concept: string;
  /** The entry id (its filename stem). */
  id: string;
  /** The entry's display title, from the content manifest. */
  title: string;
  /** The entry's public permalink, from the content manifest. */
  permalink?: string;
  /** The per-reference diff for this entry: one placement per reference of the asset. */
  placements: AltPlacement[];
}

/**
 * The alt-propagation preview plan: every entry that references the asset (enriched), the report-only
 *  cross-branch delta, and the bucket counts aggregated across every placement. Display-only: the
 *  apply re-derives a fresh plan and never trusts this. The preview reports an entry even when its
 *  only placements are reported-but-unchanged (a kept custom alt, a decorative hero), so the screen
 *  can show every bucket; the apply commits only the entries it actually changes.
 */
export interface MediaAltPreviewPlan {
  entries: MediaAltPreviewEntry[];
  branchDelta: BranchRef[];
  /** The placement counts by bucket, summed across all entries. */
  counts: { willFill: number; customized: number; decorativeSkipped: number };
}

/**
 * The successful upload's response (`uploadAction`). The server-owned `record` rides the editor's
 *  optimistic client state and commits with the entry at Save (the upload itself commits nothing).
 *  `reused` is true when identical bytes were already stored, so the second upload did no second put;
 *  `mismatch` flags an existing object whose stored content type differs from this sniff.
 */
export interface UploadResult {
  reference: string;
  record: MediaEntry;
  reused: boolean;
  mismatch: boolean;
}

/** A media slug is the same lowercase-alphanumeric-with-hyphens grammar the reference token uses. */
const MEDIA_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A 16-hex content-hash prefix, the immutable asset key. */
const MEDIA_HASH_RE = /^[0-9a-f]{16}$/;

/**
 * The cap, in characters, on the stored alt text. The human fields are display copy, not content,
 *  so a generous cap rejects only abuse-scale input.
 */
const MAX_ALT = 160;
/** The cap, in characters, on the stored display name. */
const MAX_DISPLAY_NAME = 120;
/** The cap, in characters, on the stored original filename. */
const MAX_ORIGINAL_FILENAME = 120;
/** The largest pixel dimension kept; anything larger is treated as bogus and clamped to null. */
const MAX_DIMENSION = 60000;

/**
 * Decode a percent-encoded header value, yielding `''` on a malformed sequence or an absent header,
 *  so a hostile `X-Cairn-*` value cannot throw past the gate.
 */
function safeDecode(value: string | null): string {
  if (value === null) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

/**
 * The basename of a decoded filename: the final path segment after any `/` or `\`. A client value
 *  of `../../evil.png` yields `evil.png`, so no path component reaches the stored record.
 */
function basename(name: string): string {
  const parts = name.split(/[/\\]/);
  return parts[parts.length - 1];
}

/**
 * Sort key for a where-used row's origin: published rows rank before branch rows, so the in-use
 *  refusal lists "Published on the site" first, then the edit-branch references.
 */
function originRank(entry: UsageEntry): number {
  return entry.origin.kind === 'published' ? 0 : 1;
}

/**
 * A where-used row's branch name for the secondary sort (the empty string for a published row,
 *  which sorts ahead of any branch by `originRank` already).
 */
function branchKey(entry: UsageEntry): string {
  return entry.origin.kind === 'branch' ? entry.origin.branch : '';
}

/**
 * The distinct-entry count behind a where-used set: a published use and an edit-branch edit of the
 *  same entry are two rows but one distinct entry, so count by concept/id.
 */
function distinctEntryCount(rows: UsageEntry[]): number {
  return new Set(rows.map((e) => `${e.concept}/${e.id}`)).size;
}

/**
 * Strip control characters from a human field and cap it at `max` characters. Control characters
 *  (C0 and DEL) never belong in display copy and could corrupt a log line or a committed JSON.
 */
function sanitizeField(value: string, max: number): string {

  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

/**
 * Parse an advisory pixel dimension header. A valid integer in `[1, MAX_DIMENSION]` is kept; an
 *  absent, non-numeric, or out-of-range value becomes null (MediaEntry dimensions are `number | null`).
 */
function clampDimension(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_DIMENSION) return null;
  return n;
}

/**
 * Build the canonical `media:` token for a replacement, treating a slug that fails the grammar (or
 *  an empty one) as absent so the bare-hash form is used. The slug is cosmetic: the resolver keys on
 *  the hash, so a missing slug still resolves. Shared by the preview and apply token construction.
 */
function replacementToken(slug: string, hash: string): string {
  return mediaToken({ slug: MEDIA_SLUG_RE.test(slug) ? slug : null, hash });
}

/** The fail(503) message every media action returns when the site declares no assets block. */
const MEDIA_DISABLED_MESSAGE = 'Media is not enabled for this site.';

/**
 * Resolve the R2 bucket for an action that reads or writes raw bytes, refusing before any write
 *  when media is disabled for the site or the platform has no binding under the site's configured
 *  name. Shared by every action that touches the bucket directly (delete, bulk delete, orphan scan,
 *  orphan purge); replace and alt-fill write no bytes, so they check `resolved.enabled` alone against
 *  MEDIA_DISABLED_MESSAGE and skip this step.
 */
function resolveMediaBucket(
  event: ContentEvent,
  resolved: ResolvedAssetConfig,
): { bucket: R2Bucket } | { error: string } {
  if (!resolved.enabled) return { error: MEDIA_DISABLED_MESSAGE };
  const platformEnv = (event.platform as { env?: Record<string, unknown> } | undefined)?.env ?? {};
  const rawBucket = platformEnv[resolved.bucketBinding];
  if (!rawBucket) return { error: 'The media bucket is not bound.' };
  return { bucket: rawBucket as R2Bucket };
}

/**
 * Build every media load and action, closed over the shared content-routes context.
 */
export function createMediaActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

  /**
   * The admin Media Library load: union the media manifest across main and every open cairn/*
   *  branch (so a not-yet-published asset shows), project each row through the shared
   *  mediaLibraryEntry helper, and attach the cross-branch where-used overlay keyed by content
   *  hash. The assets union and the usage overlay degrade independently: a usage-build failure
   *  still lists the assets with an empty overlay, and a wholesale read failure degrades to the
   *  assets gathered so far rather than a thrown 500, mirroring listLoad's posture.
   */
  async function mediaLibraryLoad(event: ContentEvent): Promise<MediaLibraryData> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    // Read the flash flags a redirected action carried back, mirroring listLoad's `?error`/
    // `?publishedAll` grammar: a deleted/updated success flag and a commit-conflict error. The
    // conflict error rides its own slot so it never collides with the degraded-load `error` below.
    let flash: MediaLibraryData['flash'] = null;
    if (event.url.searchParams.get('deleted') === '1') flash = 'deleted';
    else if (event.url.searchParams.get('updated') === '1') flash = 'updated';
    else if (event.url.searchParams.get('replaced') === '1') flash = 'replaced';
    else if (event.url.searchParams.get('altPropagated') === '1') flash = 'altPropagated';
    else if (event.url.searchParams.get('bulkDeleted') === '1') flash = 'bulkDeleted';
    else if (event.url.searchParams.get('orphansPurged') === '1') flash = 'orphansPurged';
    else if (event.url.searchParams.get('uploaded') === '1') flash = 'uploaded';
    const flashError = event.url.searchParams.get('error');
    const backend = ctx.resolveBackend(event);

    // Union the media manifest by hash: main's rows first, then any branch hash not already present.
    // Identical bytes share one row, so a hash on both branches prefers main's row. A failed or
    // absent branch read degrades to no rows for that branch (the tolerant parse yields {} on null).
    // The branch list is taken ONCE here and handed to buildUsageIndex below, so the load path does
    // not enumerate the open branches twice (the per-page subrequest budget is tight at ~25+ branches).
    // The token mint is now lazy inside the first read, so a token or a network failure both land in
    // this one degrade rather than the old separate could-not-authenticate tier.
    const union = new Map<string, MediaEntry>();
    let branchNames: string[] = [];
    try {
      const mediaRaw = await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch);
      for (const [hash, e] of Object.entries(parseMediaManifest(ctx.parseMediaJson(mediaRaw)))) {
        union.set(hash, e);
      }
      const names = await backend.listBranches(PENDING_PREFIX);
      branchNames = names;
      const branchManifests = await Promise.all(
        names.map((name) =>
          backend.readFile(runtime.mediaManifestPath, name)
            .then((raw) => parseMediaManifest(ctx.parseMediaJson(raw)))
            .catch(() => ({}) as Record<string, MediaEntry>),
        ),
      );
      for (const manifest of branchManifests) {
        for (const [hash, e] of Object.entries(manifest)) {
          if (!union.has(hash)) union.set(hash, e);
        }
      }
    } catch {
      // A wholesale read failure leaves whatever rows were already unioned; the screen lists them
      // with no usage overlay rather than failing.
      return { assets: [...union.values()].map(mediaLibraryEntry), usage: {}, error: 'Could not load media.', flash, flashError };
    }
    const assets = [...union.values()].map(mediaLibraryEntry);

    // Build the where-used overlay from main's content manifest plus the open branches. A failure
    // here keeps the asset list intact with an empty overlay, since the screen still lists assets.
    let usage: Record<string, MediaUsageInfo> = {};
    try {
      const manifestRaw = await backend.readFile(runtime.manifestPath, backend.defaultBranch);
      const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
      // Reuse the branch list from the media-union above; the Library DISPLAY keeps the default
      // best-effort behavior (a failed branch read degrades that one branch, not the screen).
      const index = await buildUsageIndex(backend, runtime.concepts, manifest, { branches: branchNames });
      for (const [hash, entries] of index) {
        usage[hash] = { count: distinctEntryCount(entries), entries };
      }
    } catch {
      usage = {};
    }

    return { assets, usage, error: null, flash, flashError };
  }

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
   * status-0 response under the client's `redirect: 'manual'`), so the `fail(401, 'session-expired')`
   * below is a belt-and-suspenders for a direct or un-guarded call, not the primary path.
   */
  async function ingestAndStore(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult> {
    // Read the editor up front for log attribution; the gate at step 4 enforces its presence. The
    // pre-session gates (1 to 3) may log with an undefined editor email, which is fine.
    const editor = event.locals.editor ?? null;
    const refuse = (status: number, reason: string): ReturnType<typeof fail> => {
      log.warn('media.upload_failed', { editor: editor?.email, reason });
      return fail(status, { error: reason } satisfies MediaUploadFailure);
    };

    // 1. Media on.
    const resolved = runtime.resolvedAssets;
    if (!resolved.enabled) return refuse(503, 'media-disabled');

    // 2. Content-Length before the body is read: an absent or non-positive-integer length is a 411,
    //    an oversize length is a 413. Both refuse before the bytes are buffered. The header is
    //    client-advisory, so the real DoS bound is the Worker request-size limit, not maxUploadBytes:
    //    a lying client still buffers up to the platform ceiling before the post-read recheck (step 5).
    const lengthHeader = event.request.headers.get('content-length');
    const length = lengthHeader === null ? NaN : Number(lengthHeader);
    if (!Number.isInteger(length) || length <= 0) return refuse(411, 'length-required');
    if (length > resolved.maxUploadBytes) return refuse(413, 'too-large');

    // 3. CSRF from the X-Cairn-CSRF header (no body clone): the action is the CSRF authority for the
    //    raw-body upload, since the guard runs its form-CSRF only on form content types.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return refuse(403, 'csrf');
    }

    // 4. JSON-aware session (belt-and-suspenders; see the docstring): behind the guard an
    //    unauthenticated POST is already 303'd before this runs. For a direct or un-guarded call,
    //    read the resolved editor directly and refuse with a 401 envelope rather than a 303 redirect.
    if (!editor) return refuse(401, 'session-expired');

    // 4.5. The access map's own admission gate for the media screen, the same one every other media
    //      action enforces. The concept editor's inline image picker calls this exact endpoint, so
    //      restricting `media` restricts it too (the documented media-picker landmine): a role edits
    //      an image-bearing concept only when it also reaches `media`.
    if (!canReach(runtime.access, editor, 'media')) {
      log.warn('auth.access.denied', { email: editor.email, role: editor.role, target: 'media' });
      return refuse(403, 'access-denied');
    }

    // 5. Read the body once. Content-Length is client-advisory, so a lying client could send more
    //    than it declared; recheck the real size against the cap after the read.
    const bytes = new Uint8Array(await event.request.arrayBuffer());
    if (bytes.length > resolved.maxUploadBytes) return refuse(413, 'too-large');

    // 6. Server re-derivation: trust nothing the client declared.
    const declaredType = event.request.headers.get('content-type') ?? undefined;
    const sniffed = sniffMediaType(bytes);
    if (isDeniedUpload(bytes, declaredType) || sniffed === null || !resolved.allowedTypes.includes(sniffed)) {
      return refuse(415, 'unsupported-type');
    }
    const ext = extForMediaType(sniffed);
    if (ext === null) return refuse(415, 'unsupported-type');

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
    if (!rawBucket) return refuse(503, 'binding-missing');
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
      if (storedSha !== undefined && storedSha !== full) return refuse(409, 'hash-collision');
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
    const reference = mediaToken({ slug, hash });

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
  async function uploadAction(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult> {
    return ingestAndStore(event);
  }

  /**
   * Upload straight into the Library: store the bytes and derive the record via `ingestAndStore`
   *  (the editor upload's shared body), then commit the row to `main` in the same step, since a
   *  Library-direct upload has no entry and no Save to ride. The client posts only the file; the
   *  server derives and commits every field, trusting nothing client-posted (`ingestAndStore`'s
   *  contract). A hash already present in the manifest is an idempotent no-op: the asset (and its
   *  row) already exist, so the upload commits nothing and still returns the success envelope.
   *  Mirrors the safe-delete/rename commit shape, but returns a `fail(409)` envelope on a conflict
   *  rather than a redirect, since this action's client reads a JSON envelope, not a bounce.
   */
  async function mediaLibraryUploadAction(event: ContentEvent): Promise<ReturnType<typeof fail> | UploadResult> {
    const result = await ingestAndStore(event);
    if (!('record' in result)) return result;
    const editor = event.locals.editor!; // ingestAndStore already refused a missing session.
    const backend = ctx.resolveBackend(event);

    // Read the head BEFORE the manifest, so this expectedHead is at-or-before the bytes the commit
    // sends; media.json has no regenerate-from-files backstop, so a concurrent upload fails closed
    // rather than last-writer-wins dropping a row.
    const head = await backend.branchHead(backend.defaultBranch);
    const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    if (manifest[result.record.hash]) return result; // Bytes and row already committed: nothing to do.

    const commitFields = { concept: 'media', id: result.record.hash, editor: editor.email };
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
      ctx.logCommitFailed(commitFields, err);
      if (!isConflict(err)) throw err;
      return fail(409, {
        error: 'The media manifest changed since you opened it. Reload and try again.',
      } satisfies MediaUploadFailure);
    }
    return result;
  }

  /**
   * Safe-delete a committed media asset. The gate rechecks usage server-side against a FRESH index
   *  read at delete time (never a client-passed count), mirroring deleteEntry's authoritative inbound
   *  recheck. An in-use asset refuses unless the form carries the typed-slug override (the in-use
   *  alertdialog's type-to-confirm). When confirmed, the order is load-bearing: commit the manifest
   *  row removal FIRST, then delete the R2 object, so a failure after the commit leaves bytes with no
   *  row (a benign orphan) rather than a row pointing at deleted bytes (a broken delivery). Scope:
   *  3c deletes assets committed on the default branch; a branch-only upload is removed by discarding
   *  its draft, not here.
   *
   *  The published-usage side of the gate trusts the content manifest's mediaRefs (kept fresh by
   *  save/publish via manifestEntryFromFile), the same manifest-trust model the entry-delete gate
   *  uses; a raw git edit that adds a media reference without a save/publish or a manifest regenerate
   *  is not seen, matching the documented "regenerate after a raw edit" contract. The recheck reads
   *  in STRICT mode, so a transient branch-read failure fails the delete closed rather than mistaking
   *  a referenced asset for an orphan. There is an inherent stale-read window between the recheck and
   *  the commit (no sha-guard ties them); it is bounded because the resolver and the route key on the
   *  hash, so a reference added in that window still resolves to bytes that may be gone, the same
   *  delete-races-an-edit window every safe delete carries.
   */
  async function mediaDeleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    const backend = ctx.resolveBackend(event);

    const form = await event.request.formData();
    const hash = String(form.get('hash') ?? '');
    if (!MEDIA_HASH_RE.test(hash)) throw error(400, 'Invalid media hash');

    // The asset must be committed on the default branch to be deletable here. A branch-only upload
    // (the common 2b case before publish) has no main row; removing it is a discard of the draft.
    const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = manifest[hash];
    if (!row) {
      return fail(404, {
        error: 'That asset is not committed. Discard its draft to remove an unpublished upload.',
        hash,
        usage: [],
        foundIn: 0,
      } satisfies MediaDeleteRefusal);
    }

    // The authoritative gate: a fresh usage read, never a client count. The index spans main's
    // content manifest and every open cairn/* branch. STRICT mode rethrows a branch-read failure
    // (rather than the display path's degrade-and-skip), so a transient branch read failing does not
    // make a still-referenced asset look orphaned and skip the typed-slug confirm.
    let index: Awaited<ReturnType<typeof buildUsageIndex>>;
    try {
      index = await buildUsageIndex(backend, runtime.concepts, await ctx.readManifest(backend), { strict: true });
    } catch {
      // Fail closed: we could not verify every place the asset is used, so refuse rather than risk
      // deleting bytes a branch still references.
      return fail(503, {
        error: 'Could not verify where this asset is used. Try again.',
        hash,
        usage: [],
        foundIn: 0,
      } satisfies MediaDeleteRefusal);
    }
    const rows = index.get(hash) ?? [];
    const foundIn = distinctEntryCount(rows);

    if (rows.length > 0) {
      // In use: refuse unless the editor typed the slug to force it (the in-use face's confirmation).
      // An empty stored slug must never be satisfiable by the empty default, so a blank row.slug is
      // treated as never-confirmed: the typed confirm cannot be bypassed.
      const confirmSlug = String(form.get('confirmSlug') ?? '');
      if (row.slug === '' || confirmSlug !== row.slug) {
        log.warn('media.delete_blocked', { editor: editor.email, hash, foundIn });
        // Group published-first, then branch entries by branch name, so the list reads stably.
        const usage = [...rows].sort((a, b) => originRank(a) - originRank(b) || branchKey(a).localeCompare(branchKey(b)));
        return fail(409, {
          error: `Cannot delete ${row.slug}: found in ${foundIn} ${foundIn === 1 ? 'entry' : 'entries'}.`,
          hash,
          usage,
          foundIn,
        } satisfies MediaDeleteRefusal);
      }
    }

    // Resolve the R2 bucket before the commit, so a missing binding refuses before any write.
    const bucketResult = resolveMediaBucket(event, runtime.resolvedAssets);
    if ('error' in bucketResult) {
      return fail(503, { error: bucketResult.error, hash, usage: [], foundIn } satisfies MediaDeleteRefusal);
    }
    const store = r2Store(bucketResult.bucket);
    // Derive the R2 key BEFORE the commit. A corrupt ext throws here, so a bad key refuses before
    // any write rather than after the row is already removed (which would orphan the bytes).
    const objectKey = r2Key(hash, row.ext);

    // Commit the manifest row removal FIRST. The order is load-bearing (see the docstring).
    const commitFields = { concept: 'media', id: hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(removeMediaEntry(manifest, hash)) }],
        { name: editor.displayName, email: editor.email },
        `Delete media: ${row.slug}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      ctx.commitFailure(commitFields, err, '/admin/media',
        'The media manifest changed since you opened it. Reload and try again.');
    }
    // THEN delete the object. An absent object is a no-op (the R2 contract), so a dead row clears.
    await store.delete(objectKey);
    log.info('media.deleted', { editor: editor.email, hash });
    throw redirect(303, '/admin/media?deleted=1');
  }

  /**
   * Bulk safe-delete a multi-select of committed media assets. This is mediaDeleteAction extended to
   *  many items, with the same safety primitives and one rule that defines the batch: the gate is ONE
   *  shared strict cross-branch usage index built per batch, never N per-item reads (N strict reads
   *  would blow the workerd connection budget at many open branches). The fail-closed posture is for
   *  the WHOLE batch: if that single strict index cannot complete, the action refuses everything and
   *  commits nothing, rather than risk deleting bytes a branch still references.
   *
   *  Skip-and-report, never force: the pure planBulkDelete partitions the selection against the strict
   *  index into deletable (no usage row, a committed manifest row exists), skipped-still-referenced (a
   *  usage row, carried for the where-used), and skipped-uncommitted (no manifest row). An in-use item
   *  is skipped and reported, never bulk-force-deleted; forced in-use deletion stays the single-item
   *  typed-slug path.
   *
   *  The order is load-bearing, mirroring single delete: ONE atomic commit removes every deletable row
   *  FIRST, then the R2 objects are deleted (commit-row-then-delete-R2). A failure after the commit
   *  leaves bytes with no row (a benign orphan) rather than a row pointing at deleted bytes. Each R2
   *  delete is best-effort and batch-resilient: a per-object error is reported in `failed` and never
   *  aborts the rest of the batch. The result is an itemized 207-style summary the component renders
   *  (deleted / skipped with reasons / failed); there is no success redirect.
   */
  async function mediaBulkDeleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | MediaBulkDeleteResult> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    const backend = ctx.resolveBackend(event);

    // Read the selected hashes from the form. Accept the repeated `hash` field, falling back to a JSON
    // `hashes` array. Each value must match the 16-hex content-hash grammar; a malformed value is
    // dropped silently rather than surfaced as a skip (it was never a real selection).
    const form = await event.request.formData();
    let raw = form.getAll('hash').map(String);
    if (raw.length === 0) {
      const json = form.get('hashes');
      if (typeof json === 'string') {
        try {
          const parsed: unknown = JSON.parse(json);
          if (Array.isArray(parsed)) raw = parsed.map(String);
        } catch {
          raw = [];
        }
      }
    }
    const selected = raw.filter((h) => MEDIA_HASH_RE.test(h));

    // Read the fresh media manifest (the deletable rows come from here, by hash).
    const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));

    // Resolve the R2 bucket before any write, so a media-off site or a missing binding refuses before
    // the commit, exactly like single delete.
    const bucketResult = resolveMediaBucket(event, runtime.resolvedAssets);
    if ('error' in bucketResult) {
      return fail(503, { error: bucketResult.error } satisfies MediaBulkFailure);
    }
    const store = r2Store(bucketResult.bucket);

    // THE fail-closed gate for the whole batch: one shared strict usage index. STRICT mode rethrows a
    // branch-read failure, so a transient branch read failing refuses the whole batch rather than
    // mistaking a still-referenced asset for an orphan. Build exactly one index, never one per item.
    let index: Awaited<ReturnType<typeof buildUsageIndex>>;
    try {
      index = await buildUsageIndex(backend, runtime.concepts, await ctx.readManifest(backend), { strict: true });
    } catch {
      return fail(503, { error: 'Could not verify where these assets are used. Try again.' } satisfies MediaBulkFailure);
    }

    // The pure partition: membership in the fresh strict index is the gate, never the display count.
    const plan = planBulkDelete(selected, index, manifest);
    // An all-skipped or empty batch is a no-op success: nothing committed, nothing deleted.
    if (plan.deletable.length === 0) {
      return { deleted: [], skipped: plan.skipped, failed: [] } satisfies MediaBulkDeleteResult;
    }

    // ONE atomic commit removing EVERY deletable row, folded over removeMediaEntry.
    let next = manifest;
    for (const hash of plan.deletable) next = removeMediaEntry(next, hash);
    const commitFields = { concept: 'media', id: 'bulk', editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(next) }],
        { name: editor.displayName, email: editor.email },
        `Delete ${plan.deletable.length} media assets`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      ctx.commitFailure(commitFields, err, '/admin/media',
        'The media manifest changed since you opened it. Reload and try again.');
    }

    // THEN delete each deletable hash's R2 object (the load-bearing order, see the docstring). Best
    // effort and batch-resilient: a thrown key derivation or a delete error is reported in `failed`
    // and the loop continues. An absent object is a no-op (the R2 contract).
    const deleted: string[] = [];
    const failed: { hash: string; error: string }[] = [];
    for (const hash of plan.deletable) {
      try {
        const row = manifest[hash];
        await store.delete(r2Key(row.hash, row.ext));
        deleted.push(hash);
      } catch (err) {
        failed.push({ hash, error: err instanceof Error ? err.message : String(err) });
      }
    }

    log.info('media.bulk_deleted', { editor: editor.email, deleted: deleted.length, skipped: plan.skipped.length });
    return { deleted, skipped: plan.skipped, failed } satisfies MediaBulkDeleteResult;
  }

  /**
   * The on-demand orphan scan: a read-only reconcile of stored R2 bytes against the manifest, joined
   *  with one strict cross-branch usage index for the broken-reference where-used. It runs only when
   *  requested, never on the loaded index, because it is heavier than the load path: a full R2 list
   *  plus a reconcile pass on top of the strict usage build.
   *
   *  Detection-time fail-closed: BOTH the reconcile and the strict usage build run inside one
   *  try/catch, and any throw refuses the whole scan with fail(503) rather than returning a partial
   *  result. The reconcile must not run on a half-listed bucket: a truncated R2 list would call
   *  still-stored bytes orphaned. The strict usage build must not run on a half-read branch set: an
   *  unread branch would make a branch-referenced asset look orphaned. A wrong orphan verdict here
   *  feeds the irreversible purge, so the scan refuses rather than risk it.
   *
   *  The result is the OrphanScan projection: orphanedBytes (stored keys with no manifest row, the
   *  purge surface) and brokenRefs (manifest rows whose bytes are gone, read-only, shown with their
   *  where-used so an operator can re-ingest rather than purge a still-referenced record).
   */
  async function mediaOrphanScanAction(event: ContentEvent): Promise<ReturnType<typeof fail> | OrphanScan> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    const backend = ctx.resolveBackend(event);

    // Resolve the R2 binding. The reconcile lists the raw bucket directly, so keep the raw binding;
    // the MediaStore seam carries no list. A media-off site or a missing binding refuses the scan.
    const bucketResult = resolveMediaBucket(event, runtime.resolvedAssets);
    if ('error' in bucketResult) {
      return fail(503, { error: bucketResult.error } satisfies MediaBulkFailure);
    }

    // Read the fresh media manifest for the reconcile's manifest side.
    const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));

    // THE detection-time fail-closed surface. The reconcile (an R2 list that must complete in full)
    // and the strict usage build (a branch read that must complete in full) are both unsafe to use
    // partially, so either throwing refuses the scan. A wrong orphan verdict from a partial read here
    // would feed the irreversible purge.
    let reconcile: Awaited<ReturnType<typeof runReconcile>>;
    let index: Awaited<ReturnType<typeof buildUsageIndex>>;
    try {
      reconcile = await runReconcile(bucketResult.bucket as unknown as ReconcileBucket, manifest);
      index = await buildUsageIndex(backend, runtime.concepts, await ctx.readManifest(backend), { strict: true });
    } catch {
      return fail(503, { error: 'Could not check where files are used, so the scan was not run. Try again.' } satisfies MediaBulkFailure);
    }

    return buildOrphanScan(reconcile, manifest, index);
  }

  /**
   * Purge orphaned R2 bytes: the one IRREVERSIBLE media action. Raw object bytes live only in R2, not
   *  in git, so a purged orphan cannot be recovered the way a deleted manifest row can be reverted in
   *  history. The whole action is built around that fact.
   *
   *  The typed-count confirm is the never-bypassable gate, the analogue of single delete's typed-slug
   *  check. The form's `confirm` must equal the count of selected keys (the approved rev.2 mockup's
   *  "Type N to purge these files for good"); an empty selection or a mismatched count deletes nothing.
   *
   *  Re-derive fresh is the safety crux. The selection came from an earlier scan, so the action does
   *  NOT trust it: the purge keys are client-posted, so the server cannot assume they came from a fresh
   *  scan. It reads the current media manifest AND rebuilds ONE strict cross-branch usage index, then
   *  for each selected key parses the hash from the key grammar. A key that does not match the grammar
   *  was never a real orphan key and is dropped silently. A key whose hash now has a manifest row OR is
   *  referenced on any open cairn/* branch survived the scan window (it was claimed by a row, or a
   *  draft started referencing those bytes), so it is skipped into skippedClaimed and its bytes survive.
   *  Only a key whose hash is STILL absent from both is purged. This closes the TOCTOU between scan and
   *  purge that could otherwise irreversibly delete a live draft's bytes.
   *
   *  Like the scan and the bulk delete, the strict index build is the fail-closed gate: a branch read
   *  that throws refuses the whole batch with fail(503) rather than mistaking an unverifiable reference
   *  for an absent one. The index is built exactly once for the batch, never once per key.
   *
   *  There is no commit. An orphan by definition has no manifest row to remove, so the purge deletes
   *  the R2 object directly. Each delete is best-effort and batch-resilient: a per-object error is
   *  reported in `failed` and the loop continues; an absent object is a no-op (the R2 contract).
   */
  async function mediaPurgeOrphansAction(event: ContentEvent): Promise<ReturnType<typeof fail> | MediaOrphanPurgeResult> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    const backend = ctx.resolveBackend(event);

    // Resolve the R2 binding, the same media-off / missing-binding refusals as the scan. The purge
    // deletes through the MediaStore seam, so wrap the raw binding.
    const bucketResult = resolveMediaBucket(event, runtime.resolvedAssets);
    if ('error' in bucketResult) {
      return fail(503, { error: bucketResult.error } satisfies MediaBulkFailure);
    }
    const store = r2Store(bucketResult.bucket);

    // Read the selected R2 keys and the typed confirm.
    const form = await event.request.formData();
    const keys = form.getAll('key').map(String);
    const confirm = String(form.get('confirm') ?? '');

    // The irreversible gate: the confirm must equal the selected count, and the set must be non-empty.
    // A mismatch or an empty set refuses and deletes NOTHING.
    if (keys.length === 0 || confirm !== String(keys.length)) {
      return fail(400, { error: 'Type the number of files to confirm the purge.' } satisfies MediaBulkFailure);
    }

    // Re-derive fresh against the current manifest, so a key claimed since the scan is never purged.
    const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));

    // THE fail-closed gate for the whole batch: one shared strict cross-branch usage index, symmetric
    // with the scan and the bulk delete. STRICT mode rethrows a branch-read failure, so a transient
    // branch read refuses the irreversible purge rather than letting a possibly-referenced byte be
    // treated as a true orphan. Build exactly one index, never one per key.
    let index: Awaited<ReturnType<typeof buildUsageIndex>>;
    try {
      index = await buildUsageIndex(backend, runtime.concepts, await ctx.readManifest(backend), { strict: true });
    } catch {
      return fail(503, { error: 'Could not verify where these files are used. Try again.' } satisfies MediaBulkFailure);
    }

    const purged: string[] = [];
    const skippedClaimed: string[] = [];
    const failed: { key: string; error: string }[] = [];
    for (const key of keys) {
      const hash = MEDIA_KEY_RE.exec(key)?.[1];
      // A key that does not match the grammar was never a real orphan key: drop it silently.
      if (hash === undefined) continue;
      // A hash that now has a manifest row was claimed since the scan: its bytes are a live asset now.
      if (manifest[hash]) {
        skippedClaimed.push(key);
        continue;
      }
      // A hash referenced on any open cairn/* branch backs an in-progress draft: skip it claimed too.
      if (index.has(hash)) {
        skippedClaimed.push(key);
        continue;
      }
      // Still orphaned: delete the object directly. No commit, there is no manifest row.
      try {
        await store.delete(key);
        purged.push(key);
      } catch (err) {
        failed.push({ key, error: err instanceof Error ? err.message : String(err) });
      }
    }

    log.info('media.orphans_purged', { editor: editor.email, purged: purged.length });
    return { purged, skippedClaimed, failed } satisfies MediaOrphanPurgeResult;
  }

  /**
   * Edit a committed asset's metadata: its display name, slug, and default alt. A single media.json
   *  row commit, with NO reference rewrite: the resolver and the delivery route key on the hash, so a
   *  rename never breaks an existing `media:` reference. The default alt is the asset's value for the
   *  next placement, never a propagating edit of the alt already committed in existing placements.
   */
  async function mediaUpdateAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    const backend = ctx.resolveBackend(event);

    const form = await event.request.formData();
    const hash = String(form.get('hash') ?? '');
    if (!MEDIA_HASH_RE.test(hash)) throw error(400, 'Invalid media hash');

    const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = manifest[hash];
    if (!row) {
      return fail(404, { error: 'That asset is not committed.' } satisfies MediaUpdateFailure);
    }

    const displayName = sanitizeField(String(form.get('displayName') ?? ''), MAX_DISPLAY_NAME);
    const slug = String(form.get('slug') ?? '').trim();
    const alt = sanitizeField(String(form.get('alt') ?? ''), MAX_ALT);
    if (!MEDIA_SLUG_RE.test(slug)) {
      return fail(400, { error: 'Enter a valid address: lowercase letters, numbers, and hyphens.' } satisfies MediaUpdateFailure);
    }

    const edited: MediaEntry = { ...row, displayName: displayName || slug, slug, alt };
    const commitFields = { concept: 'media', id: hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(upsertMediaEntry(manifest, edited)) }],
        { name: editor.displayName, email: editor.email },
        `Update media: ${edited.slug}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      ctx.commitFailure(commitFields, err, '/admin/media',
        'The media manifest changed since you opened it. Reload and try again.');
    }
    throw redirect(303, '/admin/media?updated=1');
  }

  /**
   * Preview a replace-in-place: the display-only fetch action (the 2a transport). It plans the rewrite
   *  of every published main entry that references `oldHash` to the new asset's `media:` token, enriches
   *  each with its title and permalink, and returns the plan plus the report-only cross-branch delta.
   *  It commits nothing. The plan runs strict (fail-closed): an unverifiable usage read returns a 503
   *  rather than a partial plan, so the confirm dialog never shows a count it cannot stand behind.
   *
   *  Wire contract: a fetch POST with the JSON body `{ oldHash, newHash, slug }`, the CSRF token in
   *  the `X-Cairn-CSRF` header (the raw-body transport, no form-CSRF), and a `MediaReplacePreviewPlan`
   *  returned as the 200 ActionResult the client reads. A refusal rides a `fail(status, ...)` envelope
   *  with the MediaReplaceFailure shape (the same fail shape the apply uses), so the client reads
   *  `type`/`status` from the body, never the HTTP status.
   */
  async function mediaReplacePreviewAction(event: ContentEvent): Promise<ReturnType<typeof fail> | MediaReplacePreviewPlan> {
    // CSRF first: this is a raw-body (JSON) POST, so the header witness is the authority, like the
    // upload action. A failed check refuses before the session read or any GitHub call.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return fail(403, { error: 'csrf', hash: '', usage: [], foundIn: 0 } satisfies MediaReplaceFailure);
    }
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');

    // Parse the JSON body. A malformed body or a hash that fails the 16-hex grammar refuses with a 400
    // before any GitHub read. The slug is the OLD asset's: a replace keeps the name and changes only the
    // content hash, so the repointed token carries the existing slug (an invalid slug falls back to a
    // bare-hash token below). It is cosmetic for the preview display; the apply re-derives it server-side.
    let payload: { oldHash?: unknown; newHash?: unknown; slug?: unknown };
    try {
      payload = JSON.parse(await event.request.text());
    } catch {
      return fail(400, { error: 'Could not read the replace request.', hash: '', usage: [], foundIn: 0 } satisfies MediaReplaceFailure);
    }
    const oldHash = String(payload.oldHash ?? '');
    const newHash = String(payload.newHash ?? '');
    const slug = String(payload.slug ?? '');
    if (!MEDIA_HASH_RE.test(oldHash) || !MEDIA_HASH_RE.test(newHash)) {
      return fail(400, { error: 'Invalid media hash.', hash: oldHash, usage: [], foundIn: 0 } satisfies MediaReplaceFailure);
    }

    const backend = ctx.resolveBackend(event);
    const contentManifest = await ctx.readManifest(backend);
    const newToken = replacementToken(slug, newHash);

    // Plan the rewrite. The planner runs buildUsageIndex in STRICT mode, so an unverifiable branch read
    // throws out of here rather than degrading to an absent reference; catch it and fail closed, the
    // same posture the delete gate takes.
    let plan: Awaited<ReturnType<typeof planMediaRewrite<RepointPlacement>>>;
    try {
      plan = await planMediaRewrite<RepointPlacement>({
        backend,
        concepts: runtime.concepts,
        contentManifest,
        hash: oldHash,
        transform: (md) => repointMediaRef(md, oldHash, newToken),
      });
    } catch {
      return fail(503, {
        error: 'Could not verify where this asset is used. Try again.',
        hash: oldHash,
        usage: [],
        foundIn: 0,
      } satisfies MediaReplaceFailure);
    }

    // Enrich each planned entry with its title and permalink from the content manifest (the planner
    // carries neither). A planned entry always has a manifest row (the usage index is built from the
    // manifest), so the lookup hits; an id-only fallback keeps the type total if a row is ever absent.
    const byKey = new Map(contentManifest.entries.map((e) => [`${e.concept}/${e.id}`, e]));
    const entries: MediaReplacePreviewEntry[] = plan.entries.map((e) => {
      const row = byKey.get(`${e.concept}/${e.id}`);
      return {
        concept: e.concept,
        id: e.id,
        title: row?.title ?? e.id,
        permalink: row?.permalink,
        placements: e.placements,
      };
    });

    return { affectedCount: plan.affectedCount, entries, branchDelta: plan.branchDelta };
  }

  /**
   * Apply a replace-in-place: rewrite every published main entry that references the old asset to the
   *  new asset's `media:` token, and add the new media.json row, in ONE atomic commit. The plan is
   *  re-derived here from a FRESH read (never a client-passed plan), so a concurrent edit between the
   *  preview and the apply is rewritten too. EVERY replace is gated behind the typed-slug confirm
   *  (unlike delete, which only gates an in-use asset): a replace silently repoints published content,
   *  so it always demands the type-to-confirm. An empty stored slug is never satisfiable, exactly like
   *  delete. The plan runs strict, so an unverifiable usage read fails the replace closed (commits
   *  nothing) rather than rewriting some references and leaving others.
   *
   *  No R2 operation: the new bytes were already stored put-first by the upload action, and the old
   *  bytes are KEPT (the old row stays in media.json), so this action writes only to git and never
   *  resolves the bucket binding. It guards `resolvedAssets.enabled` for the media-off case only.
   */
  async function mediaReplaceApplyAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    const backend = ctx.resolveBackend(event);

    const form = await event.request.formData();
    const oldHash = String(form.get('oldHash') ?? '');
    const newHash = String(form.get('newHash') ?? '');
    if (!MEDIA_HASH_RE.test(oldHash) || !MEDIA_HASH_RE.test(newHash)) throw error(400, 'Invalid media hash');
    const confirmSlug = String(form.get('confirmSlug') ?? '');

    // The new asset's optimistic record rides the post (the same untrusted-record contract as save).
    // Find the row for newHash; its absence is a malformed or missing replacement, a 400.
    const record = parseMediaEntries(form.get('media')).find((r) => r.hash === newHash);
    if (!record) {
      return fail(400, {
        error: 'The replacement upload is missing or invalid.',
        hash: oldHash,
        usage: [],
        foundIn: 0,
      } satisfies MediaReplaceFailure);
    }

    // The old asset must be committed on main to be replaceable here. A branch-only upload has no main
    // row; it is replaced by editing its draft, not here.
    const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = manifest[oldHash];
    if (!row) {
      return fail(404, {
        error: 'That asset is not committed. Discard its draft to remove an unpublished upload.',
        hash: oldHash,
        usage: [],
        foundIn: 0,
      } satisfies MediaReplaceFailure);
    }

    // Media-enabled guard only: replace does no R2 write (the new bytes are already stored, the old
    // bytes are kept), so there is no bucket binding to resolve. Media-off still refuses before any
    // git write.
    if (!runtime.resolvedAssets.enabled) {
      return fail(503, { error: MEDIA_DISABLED_MESSAGE, hash: oldHash, usage: [], foundIn: 0 } satisfies MediaReplaceFailure);
    }

    // Re-derive the plan from a FRESH content-manifest read (never trust a client plan). The planner
    // runs strict, so an unverifiable branch read throws; catch it and fail the replace closed (commit
    // nothing) rather than rewriting a partial set of references. The repointed token keeps the OLD
    // asset's slug (server-authoritative `row.slug`): a replace changes only the content hash, so the
    // name in every reference stays the same (the new bytes resolve by hash regardless of the slug).
    const newToken = replacementToken(row.slug, record.hash);
    let plan: Awaited<ReturnType<typeof planMediaRewrite<RepointPlacement>>>;
    try {
      plan = await planMediaRewrite<RepointPlacement>({
        backend,
        concepts: runtime.concepts,
        contentManifest: await ctx.readManifest(backend),
        hash: oldHash,
        transform: (md) => repointMediaRef(md, oldHash, newToken),
      });
    } catch {
      return fail(503, {
        error: 'Could not verify where this asset is used. Try again.',
        hash: oldHash,
        usage: [],
        foundIn: 0,
      } satisfies MediaReplaceFailure);
    }

    // The typed-slug gate, ALWAYS required for replace. A blank stored slug can never be satisfied by
    // the empty default, so it is treated as never-confirmed (the confirm cannot be bypassed).
    if (row.slug === '' || confirmSlug !== row.slug) {
      log.warn('media.replace_blocked', { editor: editor.email, hash: oldHash, foundIn: plan.affectedCount });
      return fail(409, {
        error: `Type ${row.slug} to confirm replacing it in ${plan.affectedCount} ${plan.affectedCount === 1 ? 'entry' : 'entries'}.`,
        hash: oldHash,
        usage: [],
        foundIn: plan.affectedCount,
      } satisfies MediaReplaceFailure);
    }

    // Commit atomically: every rewritten entry plus the new media.json row (the OLD row stays, so the
    // old bytes keep a row). One commit, the same conflict handling as delete.
    const changes: FileChange[] = plan.entries.map((e) => ({ path: e.path, content: e.newMarkdown }));
    changes.push({ path: runtime.mediaManifestPath, content: serializeMediaManifest(upsertMediaEntry(manifest, record)) });

    const commitFields = { concept: 'media', id: oldHash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Replace media: ${row.slug}`,
      );
      log.info('media.replaced', { editor: editor.email, oldHash, newHash, affected: plan.affectedCount });
    } catch (err) {
      ctx.commitFailure(commitFields, err, '/admin/media',
        'The site changed since you opened it. Reload and try again.');
    }
    throw redirect(303, '/admin/media?replaced=1');
  }

  /**
   * Preview an alt-propagation: the display-only fetch action (the 2a transport). It plans filling the
   *  asset's default alt across every published main entry that references it, bucketing each placement
   *  (a will-fill empty alt, a customized alt left as-is, a decorative hero skipped), and returns the
   *  enriched entries, the report-only cross-branch delta, and the bucket counts. It commits nothing.
   *  The plan runs strict (fail-closed): an unverifiable usage read returns a 503 rather than a partial
   *  plan, so the dialog never shows a count it cannot stand behind.
   *
   *  Wire contract: a fetch POST with the JSON body `{ hash }`, the CSRF token in the `X-Cairn-CSRF`
   *  header (the raw-body transport, no form-CSRF), and a `MediaAltPreviewPlan` returned as the 200
   *  ActionResult the client reads. A refusal rides a `fail(status, ...)` envelope with the
   *  MediaAltPropagateFailure shape, so the client reads `type`/`status` from the body.
   */
  async function mediaAltPreviewAction(event: ContentEvent): Promise<ReturnType<typeof fail> | MediaAltPreviewPlan> {
    // CSRF first: a raw-body (JSON) POST, so the header witness is the authority, like the upload and
    // replace-preview actions. A failed check refuses before the session read or any GitHub call.
    if (!event.cookies || !validateCsrfHeader({ url: event.url, request: event.request, cookies: event.cookies })) {
      return fail(403, { error: 'csrf' } satisfies MediaAltPropagateFailure);
    }
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');

    let payload: { hash?: unknown };
    try {
      payload = JSON.parse(await event.request.text());
    } catch {
      return fail(400, { error: 'Could not read the request.' } satisfies MediaAltPropagateFailure);
    }
    const hash = String(payload.hash ?? '');
    if (!MEDIA_HASH_RE.test(hash)) {
      return fail(400, { error: 'Invalid media hash.' } satisfies MediaAltPropagateFailure);
    }

    const backend = ctx.resolveBackend(event);
    // The default alt to propagate is the asset's manifest row value (set via mediaUpdateAction). An
    // asset with no committed row has no default alt to push, so refuse.
    const mediaManifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = mediaManifest[hash];
    if (!row) {
      return fail(404, { error: 'That asset is not committed.' } satisfies MediaAltPropagateFailure);
    }

    // Plan the fill. The planner runs strict, so an unverifiable branch read throws out of here; catch
    // it and fail closed, the same posture replace and delete take.
    const contentManifest = await ctx.readManifest(backend);
    let plan: Awaited<ReturnType<typeof planMediaRewrite<AltPlacement>>>;
    try {
      plan = await planMediaRewrite<AltPlacement>({
        backend,
        concepts: runtime.concepts,
        contentManifest,
        hash,
        transform: (md) => fillAltForHash(md, hash, row.alt, { overwrite: false }),
      });
    } catch {
      return fail(503, { error: 'Could not verify where this asset is used. Try again.' } satisfies MediaAltPropagateFailure);
    }

    // Enrich each planned entry with its title and permalink from the content manifest (the planner
    // carries neither), and aggregate the bucket counts across every placement.
    const byKey = new Map(contentManifest.entries.map((e) => [`${e.concept}/${e.id}`, e]));
    const counts = { willFill: 0, customized: 0, decorativeSkipped: 0 };
    const entries: MediaAltPreviewEntry[] = plan.entries.map((e) => {
      for (const p of e.placements) {
        if (p.bucket === 'will-fill') counts.willFill += 1;
        else if (p.bucket === 'customized') counts.customized += 1;
        else counts.decorativeSkipped += 1;
      }
      const manifestRow = byKey.get(`${e.concept}/${e.id}`);
      return {
        concept: e.concept,
        id: e.id,
        title: manifestRow?.title ?? e.id,
        permalink: manifestRow?.permalink,
        placements: e.placements,
      };
    });

    return { entries, branchDelta: plan.branchDelta, counts };
  }

  /**
   * Apply an alt-propagation: fill the asset's default alt into every empty placement across the
   *  published corpus (and, on the `overwrite` opt-in, customized placements too), in ONE atomic
   *  commit. The plan is re-derived from a FRESH read (never a client plan). Three deliberate
   *  differences from replace: there is NO typed-slug gate (alt fill is reversible and frequent), there
   *  is NO media.json change (the default alt is READ from the row, never rewritten there), and a
   *  decorative hero is never written regardless of `overwrite` (enforced inside fillAltForHash). A run
   *  that changes nothing commits nothing and still redirects (a no-op success). It fails the operation
   *  closed on an unverifiable usage read, and writes only entry files in git (no R2 op).
   */
  async function mediaAltApplyAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    const backend = ctx.resolveBackend(event);

    const form = await event.request.formData();
    const hash = String(form.get('hash') ?? '');
    if (!MEDIA_HASH_RE.test(hash)) throw error(400, 'Invalid media hash');
    // The opt-in to also overwrite customized alts; absent (the default) leaves custom alts alone.
    const overwrite = form.get('overwrite') === 'on' || form.get('overwrite') === 'true';

    const mediaManifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = mediaManifest[hash];
    if (!row) {
      return fail(404, { error: 'That asset is not committed.' } satisfies MediaAltPropagateFailure);
    }

    // Media-enabled guard only: alt fill does no R2 write, so there is no bucket binding to resolve.
    if (!runtime.resolvedAssets.enabled) {
      return fail(503, { error: MEDIA_DISABLED_MESSAGE } satisfies MediaAltPropagateFailure);
    }

    // Re-derive from a FRESH content-manifest read with the actual overwrite choice. Strict, so an
    // unverifiable branch read throws; catch it and fail closed (commit nothing).
    let plan: Awaited<ReturnType<typeof planMediaRewrite<AltPlacement>>>;
    try {
      plan = await planMediaRewrite<AltPlacement>({
        backend,
        concepts: runtime.concepts,
        contentManifest: await ctx.readManifest(backend),
        hash,
        transform: (md) => fillAltForHash(md, hash, row.alt, { overwrite }),
      });
    } catch {
      return fail(503, { error: 'Could not verify where this asset is used. Try again.' } satisfies MediaAltPropagateFailure);
    }

    // Commit only the entries the transform actually changed. A reported-but-unchanged placement (a
    // kept custom alt, a decorative hero) has after === before, so an entry with only those is a no-op
    // and is excluded. Nothing changed at all is a successful no-op: skip the commit, still redirect.
    const changed = plan.entries.filter((e) => e.placements.some((p) => p.after !== p.before));
    if (changed.length === 0) throw redirect(303, '/admin/media?altPropagated=1');

    const changes: FileChange[] = changed.map((e) => ({ path: e.path, content: e.newMarkdown }));
    const commitFields = { concept: 'media', id: hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Propagate alt: ${row.slug}`,
      );
      log.info('media.alt_propagated', { editor: editor.email, hash, overwrite, written: changed.length });
    } catch (err) {
      ctx.commitFailure(commitFields, err, '/admin/media',
        'The site changed since you opened it. Reload and try again.');
    }
    throw redirect(303, '/admin/media?altPropagated=1');
  }

  return {
    mediaLibraryLoad,
    uploadAction,
    mediaLibraryUploadAction,
    mediaDeleteAction,
    mediaBulkDeleteAction,
    mediaOrphanScanAction,
    mediaPurgeOrphansAction,
    mediaUpdateAction,
    mediaReplacePreviewAction,
    mediaReplaceApplyAction,
    mediaAltPreviewAction,
    mediaAltApplyAction,
  };
}

