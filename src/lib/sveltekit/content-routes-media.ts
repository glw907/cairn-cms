// cairn-cms: the remaining media actions after the delete cluster split, metadata edit, and the
// replace-in-place / alt-propagation preview and apply pairs. createMediaActions closes over the
// shared ContentRoutesContext (content-routes-context.ts), built once per call by
// createContentRoutesInternal; the public createContentRoutes only forwards to that internal
// factory.
import { redirect, error, fail, type ActionFailure } from '@sveltejs/kit';
import { isConflict } from '../github/types.js';
import { log } from '../log/index.js';
import { parseMediaEntries, parseMediaManifest, upsertMediaEntry, serializeMediaManifest } from '../media/manifest.js';
import type { MediaEntry } from '../media/manifest.js';
import type { UsageEntry } from '../media/usage.js';
import { repointMediaRef, fillAltForHash } from '../content/media-rewrite.js';
import type { RepointPlacement, AltPlacement } from '../content/media-rewrite.js';
import { planMediaRewrite } from '../media/rewrite-plan.js';
import type { BranchRef } from '../media/rewrite-plan.js';
import type { FileChange } from '../github/repo.js';
import { validateCsrfHeader } from './csrf.js';
import { requireEditor, requireEngineAccess, requireCookieJar } from './guard.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent } from './types.js';
import {
  MEDIA_SLUG_RE,
  MEDIA_HASH_RE,
  MAX_ALT,
  MAX_DISPLAY_NAME,
  sanitizeField,
  replacementToken,
  MEDIA_DISABLED_MESSAGE,
  MANIFEST_CONFLICT_MESSAGE,
  CONTENT_CONFLICT_MESSAGE,
} from './content-routes-media-shared.js';

/**
 * A refused media metadata edit: `fail(404)` for an asset not committed on the default branch, or
 *  `fail(400)` for an invalid slug, or `fail(409)` when the manifest changed since the editor
 *  opened it. `hash` carries the posted asset's hash on every branch, so the Library can re-open
 *  the right slide-over and render `error` against it. Retired from the public surface; the
 *  module-level export stays, since `mediaUpdateAction`'s return type composes
 *  into `createContentRoutesInternal` (`content-routes.ts`, a different module), which the
 *  `.d.ts` emitter must be able to name.
 */
export interface MediaUpdateFailure {
  /** The one-line human summary every action failure carries. */
  error: string;
  /** The edited asset's content hash, when known at the point of refusal. */
  hash?: string;
}

/**
 * A refused media replace: `fail(409)` when a fresh usage read finds the asset still in use and the
 *  typed-slug override was not given, or `fail(503)` when usage cannot be verified (fail closed) or the
 *  bucket is unbound. Mirrors MediaDeleteFailure: the asset hash, the where-used rows, and the count.
 *  Retired from the public surface; the module-level export stays, since
 *  `CairnMediaLibrary.svelte` imports it directly for its own typing.
 */
export interface MediaReplaceFailure {
  error: string;
  hash: string;
  usage: UsageEntry[];
  foundIn: number;
}

/**
 * A refused media alt-propagation: `fail(503)` when usage cannot be verified across main and every
 *  open branch (fail closed), or the bucket is unbound, or `fail(409)` on a commit conflict. Alt
 *  fill has no typed-slug gate, so this carries just the summary and the asset hash (so the
 *  Library can re-open the right slide-over). Retired from the public surface; the
 *  module-level export stays, since `CairnMediaLibrary.svelte` imports it directly for its own
 *  typing.
 */
export interface MediaAltPropagateFailure {
  error: string;
  /**
   * The asset's content hash, when known at the point of refusal (mediaAltPreviewAction's
   *  pre-hash failures, a malformed request or an invalid hash string, carry none).
   */
  hash?: string;
}

/**
 * One entry the replace preview will rewrite, enriched with its display title and permalink from the
 *  content manifest (the planner's PlannedEntry carries neither). The screen lists these as the
 *  confirm dialog's where-touched preview, and the apply re-derives its own plan rather than trusting
 *  this. Retired from the public surface; the module-level export stays, since
 *  `CairnMediaLibrary.svelte` imports it directly for its own typing.
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
 *  Retired from the public surface; the module-level export stays, since
 *  `CairnMediaLibrary.svelte` imports it directly for its own typing.
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
 *  the screen can show what would change. Retired from the public surface; survives
 *  structurally inside `MediaAltPreviewPlan.entries`, the sanctioned leak.
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
 *  can show every bucket; the apply commits only the entries it actually changes. Retired from
 *  the public surface; the module-level export stays, since
 *  `CairnMediaLibrary.svelte` imports it directly for its own typing.
 */
export interface MediaAltPreviewPlan {
  entries: MediaAltPreviewEntry[];
  branchDelta: BranchRef[];
  /** The placement counts by bucket, summed across all entries. */
  counts: { willFill: number; customized: number; decorativeSkipped: number };
}

/**
 * Build the remaining media actions (metadata edit, replace-in-place, and alt-propagation), closed
 *  over the shared content-routes context.
 */
export function createMediaActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

  /**
   * Edit a committed asset's metadata: its display name, slug, and default alt. A single media.json
   *  row commit, with NO reference rewrite: the resolver and the delivery route key on the hash, so a
   *  rename never breaks an existing `media:` reference. The default alt is the asset's value for the
   *  next placement, never a propagating edit of the alt already committed in existing placements.
   */
  async function mediaUpdateAction(event: CairnEvent): Promise<ActionFailure<MediaUpdateFailure>> {
    const editor = requireEditor(event);
    requireEngineAccess(runtime.access, editor, 'media');
    const backend = ctx.resolveBackend(event);

    const form = await event.request.formData();
    const hash = String(form.get('hash') ?? '');
    if (!MEDIA_HASH_RE.test(hash)) throw error(400, 'Invalid media hash');

    const manifest = parseMediaManifest(ctx.parseMediaJson(await backend.readFile(runtime.mediaManifestPath, backend.defaultBranch)));
    const row = manifest[hash];
    if (!row) {
      return fail(404, { error: 'That asset is not committed.', hash } satisfies MediaUpdateFailure);
    }

    const displayName = sanitizeField(String(form.get('displayName') ?? ''), MAX_DISPLAY_NAME);
    const slug = String(form.get('slug') ?? '').trim();
    const alt = sanitizeField(String(form.get('alt') ?? ''), MAX_ALT);
    if (!MEDIA_SLUG_RE.test(slug)) {
      return fail(400, { error: 'Enter a valid address: lowercase letters, numbers, and hyphens.', hash } satisfies MediaUpdateFailure);
    }

    const edited: MediaEntry = { ...row, displayName: displayName || slug, slug, alt };
    const commitFields = { scope: 'media' as const, id: hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(upsertMediaEntry(manifest, edited)) }],
        { name: editor.displayName, email: editor.email },
        `Update media: ${edited.slug}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      return ctx.commitFailure(commitFields, err, { error: MANIFEST_CONFLICT_MESSAGE, hash } satisfies MediaUpdateFailure);
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
  async function mediaReplacePreviewAction(event: CairnEvent): Promise<ActionFailure<MediaReplaceFailure> | MediaReplacePreviewPlan> {
    // CSRF first: this is a raw-body (JSON) POST, so the header witness is the authority, like the
    // upload action. A failed check refuses before the session read or any GitHub call. An untyped
    // caller with no cookie jar at all throws loudly instead (convention-auth-loud-postures).
    const cookies = requireCookieJar(event);
    if (!validateCsrfHeader({ url: event.url, request: event.request, cookies, platform: event.platform })) {
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
  async function mediaReplaceAction(event: CairnEvent): Promise<ActionFailure<MediaReplaceFailure>> {
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

    const commitFields = { scope: 'media' as const, id: oldHash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Replace media: ${row.slug}`,
      );
      log.info('media.replaced', { editor: editor.email, oldHash, newHash, affected: plan.affectedCount });
    } catch (err) {
      return ctx.commitFailure(commitFields, err, {
        error: CONTENT_CONFLICT_MESSAGE,
        hash: oldHash,
        usage: [],
        foundIn: plan.affectedCount,
      } satisfies MediaReplaceFailure);
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
  async function mediaAltPreviewAction(event: CairnEvent): Promise<ActionFailure<MediaAltPropagateFailure> | MediaAltPreviewPlan> {
    // CSRF first: a raw-body (JSON) POST, so the header witness is the authority, like the upload and
    // replace-preview actions. A failed check refuses before the session read or any GitHub call. An
    // untyped caller with no cookie jar at all throws loudly instead (convention-auth-loud-postures).
    const cookies = requireCookieJar(event);
    if (!validateCsrfHeader({ url: event.url, request: event.request, cookies, platform: event.platform })) {
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
  async function mediaAltPropagateAction(event: CairnEvent): Promise<ActionFailure<MediaAltPropagateFailure>> {
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
      return fail(404, { error: 'That asset is not committed.', hash } satisfies MediaAltPropagateFailure);
    }

    // Media-enabled guard only: alt fill does no R2 write, so there is no bucket binding to resolve.
    if (!runtime.resolvedAssets.enabled) {
      return fail(503, { error: MEDIA_DISABLED_MESSAGE, hash } satisfies MediaAltPropagateFailure);
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
      return fail(503, { error: 'Could not verify where this asset is used. Try again.', hash } satisfies MediaAltPropagateFailure);
    }

    // Commit only the entries the transform actually changed. A reported-but-unchanged placement (a
    // kept custom alt, a decorative hero) has after === before, so an entry with only those is a no-op
    // and is excluded. Nothing changed at all is a successful no-op: skip the commit, still redirect.
    const changed = plan.entries.filter((e) => e.placements.some((p) => p.after !== p.before));
    if (changed.length === 0) throw redirect(303, '/admin/media?altPropagated=1');

    const changes: FileChange[] = changed.map((e) => ({ path: e.path, content: e.newMarkdown }));
    const commitFields = { scope: 'media' as const, id: hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        changes,
        { name: editor.displayName, email: editor.email },
        `Propagate alt: ${row.slug}`,
      );
      log.info('media.alt_propagated', { editor: editor.email, hash, overwrite, written: changed.length });
    } catch (err) {
      return ctx.commitFailure(commitFields, err, { error: CONTENT_CONFLICT_MESSAGE, hash } satisfies MediaAltPropagateFailure);
    }
    throw redirect(303, '/admin/media?altPropagated=1');
  }

  return {
    mediaUpdateAction,
    mediaReplacePreviewAction,
    mediaReplaceAction,
    mediaAltPreviewAction,
    mediaAltPropagateAction,
  };
}

