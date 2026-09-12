// cairn-cms: the media destructive cluster, safe-delete, bulk delete, and the orphan scan and
// purge pair. createMediaDeleteActions closes over the shared ContentRoutesContext
// (content-routes-context.ts), built once per call by createContentRoutesInternal; the public
// createContentRoutes only forwards to that internal factory.
import { redirect, error, fail, type ActionFailure } from '@sveltejs/kit';
import { log } from '../log/index.js';
import { r2Key } from '../media/naming.js';
import { r2Store } from '../media/store.js';
import { parseMediaManifest, removeMediaEntry, serializeMediaManifest } from '../media/manifest.js';
import { buildUsageIndex } from '../media/usage.js';
import type { UsageEntry } from '../media/usage.js';
import { runReconcile, MEDIA_KEY_RE, type ReconcileBucket } from '../media/reconcile.js';
import { buildOrphanScan, type MediaOrphanScanResult } from '../media/orphan-scan.js';
import { planBulkDelete } from '../media/bulk-delete-plan.js';
import type { BulkDeleteSkip } from '../media/bulk-delete-plan.js';
import { requireEditor, requireEngineAccess } from './guard.js';
import type { ContentRoutesContext } from './content-routes-context.js';
import type { CairnEvent } from './types.js';
import { MEDIA_HASH_RE, resolveMediaBucket, MANIFEST_CONFLICT_MESSAGE, distinctEntryCount } from './content-routes-media-shared.js';

/**
 * A refused media delete: `fail(404)` for an asset not committed on the default branch, or
 *  `fail(409)` when a fresh usage read finds the asset still in use and the typed-slug override
 *  was not given. `fail(503)` covers media-off or a missing bucket binding. Retired from the
 *  public surface; the module-level export stays, since `mediaDeleteAction`'s return
 *  type composes into `createContentRoutesInternal` (`content-routes.ts`, a different module),
 *  which the `.d.ts` emitter must be able to name.
 */
export interface MediaDeleteFailure {
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
 * A refused media bulk delete or orphan purge: `fail(503)` for the fail-closed strict-usage refusal
 *  (the whole batch refuses) or media-off / a missing bucket binding. The per-item outcomes ride the
 *  returned summary, not a fail. Retired from the public surface; the module-level
 *  export stays, since `CairnMediaLibrary.svelte` imports it directly for its own typing.
 */
export interface MediaBulkFailure {
  error: string;
}

/**
 * The bulk-delete outcome the component renders: the deleted hashes, the skipped rows from the
 *  partition (with their reason and where-used), and any per-object R2 delete failure. Retired
 *  from the public surface; the module-level export stays, since
 *  `CairnMediaLibrary.svelte` imports it directly for its own typing.
 */
export interface MediaBulkDeleteResult {
  deleted: string[];
  skipped: BulkDeleteSkip[];
  failed: { hash: string; error: string }[];
}

/**
 * The orphan-purge outcome: the purged R2 keys, the keys skipped because their hash was claimed by a
 *  manifest row since the scan, and any per-object delete failure. Retired from the public
 *  surface; the module-level export stays, since `CairnMediaLibrary.svelte` imports
 *  it directly for its own typing.
 */
export interface MediaOrphanPurgeResult {
  purged: string[];
  skippedClaimed: string[];
  failed: { key: string; error: string }[];
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
 * Build the media destructive actions, closed over the shared content-routes context.
 */
export function createMediaDeleteActions(ctx: ContentRoutesContext) {
  const { runtime } = ctx;

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
  async function mediaDeleteAction(event: CairnEvent): Promise<ActionFailure<MediaDeleteFailure>> {
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
      } satisfies MediaDeleteFailure);
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
      } satisfies MediaDeleteFailure);
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
        } satisfies MediaDeleteFailure);
      }
    }

    // Resolve the R2 bucket before the commit, so a missing binding refuses before any write.
    const bucketResult = resolveMediaBucket(event, runtime.resolvedAssets);
    if ('error' in bucketResult) {
      return fail(503, { error: bucketResult.error, hash, usage: [], foundIn } satisfies MediaDeleteFailure);
    }
    const store = r2Store(bucketResult.bucket);
    // Derive the R2 key BEFORE the commit. A corrupt ext throws here, so a bad key refuses before
    // any write rather than after the row is already removed (which would orphan the bytes).
    const objectKey = r2Key(hash, row.ext);

    // Commit the manifest row removal FIRST. The order is load-bearing (see the docstring).
    const commitFields = { scope: 'media' as const, id: hash, editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(removeMediaEntry(manifest, hash)) }],
        { name: editor.displayName, email: editor.email },
        `Delete media: ${row.slug}`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      return ctx.commitFailure(commitFields, err, { error: MANIFEST_CONFLICT_MESSAGE, hash, usage: [], foundIn } satisfies MediaDeleteFailure);
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
  async function mediaBulkDeleteAction(event: CairnEvent): Promise<ActionFailure<MediaBulkFailure> | MediaBulkDeleteResult> {
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
    const commitFields = { scope: 'media' as const, id: 'bulk', editor: editor.email };
    try {
      await backend.commit(
        backend.defaultBranch,
        [{ path: runtime.mediaManifestPath, content: serializeMediaManifest(next) }],
        { name: editor.displayName, email: editor.email },
        `Delete ${plan.deletable.length} media assets`,
      );
      log.info('commit.succeeded', commitFields);
    } catch (err) {
      return ctx.commitFailure(commitFields, err, { error: MANIFEST_CONFLICT_MESSAGE } satisfies MediaBulkFailure);
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
   *  The result is the MediaOrphanScanResult projection: orphanedBytes (stored keys with no manifest
   *  row, the purge surface) and brokenRefs (manifest rows whose bytes are gone, read-only, shown
   *  with their where-used so an operator can re-ingest rather than purge a still-referenced record).
   */
  async function mediaOrphanScanAction(event: CairnEvent): Promise<ActionFailure<MediaBulkFailure> | MediaOrphanScanResult> {
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
  async function mediaOrphanPurgeAction(event: CairnEvent): Promise<ActionFailure<MediaBulkFailure> | MediaOrphanPurgeResult> {
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

  return {
    mediaDeleteAction,
    mediaBulkDeleteAction,
    mediaOrphanScanAction,
    mediaOrphanPurgeAction,
  };
}
