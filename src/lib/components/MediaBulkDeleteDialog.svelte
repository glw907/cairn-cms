<!--
@component
The Media Library's bulk-delete alertdialog (the skip-and-report dry-run, the reversible
register, the announced progress, and the itemized summary; the rev.2 mockup, panels 3 and 4). A
native modal `<dialog>` (native focus trap + Escape), no light dismiss. The confirm IS the dry-run
(the skip-and-report split), so there is no separate preview step. A git-tracked removal is
reversible, so the register is danger-OUTLINE with a plain confirm and no typed gate, carrying
the git-revert reassurance. Apply posts every selected hash to `?/mediaBulkDelete`; the server
re-checks each one strictly and the itemized summary reports the outcome (succeeded /
skipped-with-reason / failed-with-reason). The recheck runs at execution, so there is no
review-time tick implying the gate passed.

The host opens it through the exported `open(hashes, origin)`, pinning the selection at that
moment so a background re-render never shifts the dry-run.
-->
<script lang="ts">
  import { getContext, tick } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type { MediaUsageInfo, MediaBulkDeleteResult, MediaBulkFailure } from '../sveltekit/content-routes-media.js';
  import type { BulkDeleteSkip } from '../media/bulk-delete-plan.js';
  import { usageCount as usageCountOf } from './media-library-helpers.js';
  import { resolveDialogOrigin, refocusDialogOrigin } from './dialog-origin.js';
  import { postFormAction } from './client-action.js';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import { Trash2Icon, XIcon, CheckIcon, ClockIcon, GitBranchIcon, RefreshCwIcon, TriangleAlertIcon } from './admin-icons.js';

  interface Props {
    /** The full loaded asset list, to resolve each pinned hash's display facts. */
    assets: MediaLibraryEntry[];
    /** The per-hash usage overlay, to split the pinned selection into will-delete/will-skip. */
    usage: Record<string, MediaUsageInfo>;
    /** Called after a delete completes and the summary's Done is pressed, so the host can clear
     *  its own selection. Not called on a plain Cancel or a post-action-failure Close. */
    onfinished: () => void;
  }

  let { assets, usage, onfinished }: Props = $props();

  // The CSRF token getter comes from the admin context, the same seam the insert popover reads.
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

  /** The distinct-entry usage count for an asset, read against the prop usage overlay. */
  function usageCount(hash: string): number {
    return usageCountOf(usage, hash);
  }

  type BulkPhase = 'review' | 'deleting' | 'done' | 'error';
  let bulkDialog = $state<HTMLDialogElement | null>(null);
  // The entry-point (the bar's Delete button), so focus restores to it on close.
  let bulkOrigin: HTMLElement | null = null;
  // The Cancel control, the destructive-confirm initial focus.
  let bulkCancelButton = $state<HTMLButtonElement | null>(null);
  // The summary title, focused when the result lands so a screen reader is carried to the outcome.
  let bulkSummaryTitle = $state<HTMLElement | null>(null);
  let bulkPhase = $state<BulkPhase>('review');
  let bulkResult = $state<MediaBulkDeleteResult | null>(null);
  let bulkError = $state<string | null>(null);
  // The hashes the dialog acts on, pinned at open so a background re-render never shifts the dry-run.
  let bulkHashes = $state<string[]>([]);

  // The dry-run split over the DISPLAY index: the no-reference selection is what will be deleted, the
  // still-referenced selection is what the server will skip. Both keep the asset row for the screen.
  // The selected assets in pick order, dropping any hash absent from the loaded set (the type
  // predicate keeps the element type non-nullable so the markup reads asset.slug without a guard).
  const bulkSelectedAssets = $derived(
    bulkHashes
      .map((h) => assets.find((a) => a.hash === h))
      .filter((a): a is MediaLibraryEntry => a != null),
  );
  const bulkWillDelete = $derived(bulkSelectedAssets.filter((a) => usageCount(a.hash) === 0));
  const bulkWillSkip = $derived(bulkSelectedAssets.filter((a) => usageCount(a.hash) > 0));
  // The apply button names the outcome from the split: "Delete N" with no skips, else "Delete N, skip M".
  const bulkApplyLabel = $derived(
    bulkWillSkip.length === 0
      ? `Delete ${bulkWillDelete.length}`
      : `Delete ${bulkWillDelete.length}, skip ${bulkWillSkip.length}`,
  );

  // The skipped summary row reads its display name from the loaded assets; a hash absent from the load
  // (deleted out from under the index) falls back to the bare hash so the row is never blank.
  function bulkAssetName(hash: string): string {
    return assets.find((a) => a.hash === hash)?.displayName ?? hash;
  }
  // The skip reason line: a still-referenced skip names its fresh where-used count; an uncommitted skip
  // says it was not committed (the timing-honest reason the recheck turned up).
  function bulkSkipReason(skip: BulkDeleteSkip): string {
    if (skip.reason === 'still-referenced') {
      const n = skip.usage.length;
      return `now found in ${n} ${n === 1 ? 'entry' : 'entries'} on the recheck`;
    }
    return 'was not committed';
  }

  const BULK_DELETE_URL = '?/mediaBulkDelete';

  /** Open over the given hashes, pinned for the whole review, and the click origin to refocus on close. */
  export function open(hashes: string[], origin?: HTMLElement | null) {
    if (hashes.length === 0) return;
    bulkOrigin = resolveDialogOrigin(origin);
    bulkHashes = [...hashes];
    bulkPhase = 'review';
    bulkResult = null;
    bulkError = null;
    void tick().then(() => {
      bulkDialog?.showModal();
      bulkCancelButton?.focus();
    });
  }
  function closeBulkDialog() {
    bulkDialog?.close();
    bulkPhase = 'review';
    bulkResult = null;
    bulkError = null;
    bulkHashes = [];
    bulkOrigin = refocusDialogOrigin(bulkOrigin);
  }
  // Escape (the dialog's cancel event) must not abandon an in-flight delete: while the request is
  // running the close is suppressed; in every other phase Escape closes normally.
  function onBulkCancel(e: Event) {
    if (bulkPhase === 'deleting') {
      e.preventDefault();
      return;
    }
    closeBulkDialog();
  }
  // The Done action after a summary: re-read the load so the deleted rows leave the list, tell the
  // host to clear its selection, then close and reset. invalidateAll re-runs the media load behind
  // the dialog.
  async function finishBulkDelete() {
    await invalidateAll();
    onfinished();
    closeBulkDialog();
  }

  // Apply: send every SELECTED hash (repeated `hash` fields) so the server is the gate; it re-checks
  // each one strictly and skips the in-use ones authoritatively. The CSRF token rides the X-Cairn-CSRF
  // header (the guard accepts it for any unsafe POST), and the ActionResult envelope is read through
  // deserialize. A success carries the MediaBulkDeleteResult; a fail-closed 503 or a network throw
  // routes to the error phase and a role="alert".
  async function applyBulkDelete() {
    bulkPhase = 'deleting';
    bulkError = null;
    const formData = new FormData();
    for (const h of bulkHashes) formData.append('hash', h);
    const outcome = await postFormAction<MediaBulkDeleteResult>(BULK_DELETE_URL, {
      method: 'POST',
      headers: { 'X-Cairn-CSRF': csrf?.() ?? '' },
      body: formData,
    });
    if (outcome.ok) {
      bulkResult = outcome.data;
      bulkPhase = 'done';
      void tick().then(() => bulkSummaryTitle?.focus());
    } else {
      const failure = outcome.data as { error?: string } | undefined;
      bulkError = failure?.error ?? 'The delete could not be completed. Please try again.';
      bulkPhase = 'error';
    }
  }
</script>

<!-- The bulk-delete alertdialog: a native modal <dialog> (native focus trap + Escape), NO light
     dismiss. The confirm IS the dry-run (the skip-and-report split), so there is no separate preview
     step. A git-tracked removal is reversible, so the register is danger-OUTLINE with a plain confirm
     and no typed gate, carrying the git-revert reassurance. Apply posts every selected hash to
     ?/mediaBulkDelete; the server re-checks each one strictly and the itemized summary reports the
     outcome (succeeded / skipped-with-reason / failed-with-reason). The recheck runs at execution, so
     there is no review-time tick implying the gate passed. -->
<dialog
  bind:this={bulkDialog}
  data-testid="cairn-bulk-dialog"
  class="modal"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="cairn-ml-bulk-title"
  aria-describedby="cairn-ml-bulk-desc"
  oncancel={onBulkCancel}
>
  <div class="modal-box max-w-xl">
    {#if bulkPhase === 'review'}
      <!-- THE CENTRAL SAFETY SCREEN: the selection split into what will be deleted and what is held
           back, careful about timing (the usage shown rode a quick read; each item is re-checked when
           it deletes, not now). -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]" aria-hidden="true">
          <Trash2Icon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-bulk-title" class="type-heading font-bold font-[family-name:var(--font-display)]">Delete {bulkHashes.length} selected {bulkHashes.length === 1 ? 'image' : 'images'}?</h2>
          <p id="cairn-ml-bulk-desc" class="mt-1 type-meta leading-relaxed text-muted">
            {bulkWillDelete.length} {bulkWillDelete.length === 1 ? 'has' : 'have'} no references and will be deleted.
            {#if bulkWillSkip.length > 0}{bulkWillSkip.length} {bulkWillSkip.length === 1 ? 'is' : 'are'} still used and will be skipped. {/if}Each one is checked again at delete time, so nothing in use is removed.
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Cancel" onclick={closeBulkDialog}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <!-- The scope strip: the explicit count plus the safety-floor disclosure, timed at execution. -->
        <div class="flex flex-col gap-2 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
          <span class="inline-flex items-start gap-2">
            <CheckIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <span><b class="font-semibold">{bulkHashes.length} {bulkHashes.length === 1 ? 'image' : 'images'} selected</b> in the current view.</span>
          </span>
          <span class="inline-flex items-start gap-2 text-muted">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>The usage shown here came from a quick read. cairn checks each image again the moment it deletes it, and skips any that turns out to be in use.</span>
          </span>
        </div>

        {#if bulkWillDelete.length > 0}
          <!-- WILL BE DELETED: the no-reference items, each with its slug and the "no references" tag. -->
          <div>
            <span class="mb-2 inline-flex items-center gap-2 type-label font-semibold uppercase tracking-wide text-muted">
              Will be deleted <span class="rounded-full bg-base-content/[0.07] px-1.5 py-0.5 tabular-nums">{bulkWillDelete.length}</span>
            </span>
            <ul role="list" class="flex max-h-44 list-none flex-col gap-1 overflow-y-auto rounded-box border border-[var(--cairn-card-border)] p-2">
              {#each bulkWillDelete as asset (asset.hash)}
                <li class="flex items-center gap-2.5 rounded px-1.5 py-1">
                  <div class="min-w-0 flex-1">
                    <div class="truncate type-meta font-semibold">{asset.displayName}</div>
                    <div class="truncate font-[family-name:var(--font-editor)] type-label text-muted">{asset.slug}.{asset.hash}</div>
                  </div>
                  <span class="flex-none type-label font-semibold text-muted">no references found</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if bulkWillSkip.length > 0}
          <!-- WILL BE SKIPPED: the still-used items, reported with their where-used. A bulk delete never
               force-removes an in-use asset; it points to the single-item typed-confirm path. The
               warning register on plain base-100 (a skip is not a failure), text-only. -->
          <div class="overflow-hidden rounded-box border border-[var(--cairn-card-border)]">
            <div class="flex items-start gap-2.5 bg-[color-mix(in_oklab,var(--cairn-warning-ink)_8%,var(--color-base-100))] p-3">
              <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none cairn-text-warning" aria-hidden="true" />
              <div class="type-meta leading-relaxed">
                <b class="font-semibold cairn-text-warning">{bulkWillSkip.length} will be skipped, still in use</b>
                <span class="mt-0.5 block type-meta text-muted">A bulk delete never removes an image that is still referenced. To delete one of these, open it and use Delete with the typed confirm, where you can see and confirm what breaks.</span>
              </div>
            </div>
            <ul role="list" class="flex max-h-36 list-none flex-col overflow-y-auto">
              {#each bulkWillSkip as asset (asset.hash)}
                {@const where = usageCount(asset.hash)}
                <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                  <span class="min-w-0 flex-1 truncate type-meta font-semibold">{asset.slug}</span>
                  <span class="flex-none type-label font-semibold cairn-text-warning">found in {where} {where === 1 ? 'entry' : 'entries'}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- The recoverability reassurance: a git-tracked removal is reversible. -->
        <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
          <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
          <span><b class="font-semibold">Every removal is one revertible commit you can undo.</b> The deletes are one commit to <code class="rounded bg-[var(--cairn-code-chip)] px-1 py-0.5 font-[family-name:var(--font-editor)] type-meta">main</code>, so a developer can revert it and the images come back.</span>
        </div>

        <div class="flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto inline-flex items-center gap-1.5 type-meta text-muted">
            <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> One commit to main
          </span>
          <button bind:this={bulkCancelButton} type="button" class="btn btn-sm" onclick={closeBulkDialog}>Cancel</button>
          <!-- The danger-OUTLINE apply (not the solid fill the irreversible purge reserves), naming the
               outcome from the split. Disabled only when nothing in the selection is deletable. -->
          <button type="button" class="btn btn-sm border-[var(--cairn-error-border)] bg-base-100 text-[var(--cairn-error-ink)] hover:bg-[var(--cairn-error-tint)]" disabled={bulkWillDelete.length === 0} onclick={applyBulkDelete}>
            <Trash2Icon class="h-3.5 w-3.5" aria-hidden="true" /> {bulkApplyLabel}
          </button>
        </div>
      </div>
    {:else if bulkPhase === 'deleting'}
      <!-- ANNOUNCED PROGRESS: the per-item recheck against the fresh strict index runs here. The live
           region is role=status (role=alert is reserved for a post-action failure). No review-time tick. -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]" aria-hidden="true">
          <Trash2Icon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-bulk-title" class="type-heading font-bold font-[family-name:var(--font-display)]">Deleting images</h2>
          <p id="cairn-ml-bulk-desc" class="mt-1 type-meta leading-relaxed text-muted">Checking each one against a fresh read and removing the ones with no references. This can take a moment across branches.</p>
        </div>
      </div>
      <div class="flex flex-col items-center gap-3 py-4">
        <RefreshCwIcon class="h-6 w-6 animate-spin text-muted" aria-hidden="true" />
        <span class="type-meta text-muted">Checking and deleting {bulkWillDelete.length} {bulkWillDelete.length === 1 ? 'image' : 'images'}…</span>
      </div>
      <div class="mt-2 border-t border-[var(--cairn-card-border)] pt-3.5 type-meta text-muted">Please keep this open until it finishes.</div>
      <div class="sr-only" role="status" aria-live="polite">Deleting {bulkWillDelete.length} {bulkWillDelete.length === 1 ? 'asset' : 'assets'}…</div>
    {:else if bulkPhase === 'done' && bulkResult}
      {@const res = bulkResult}
      <!-- THE ITEMIZED SUMMARY (the 207-Multi-Status shape): succeeded / skipped-with-reason /
           failed-with-reason. The skipped reason is timing-honest (a reference turned up on the
           recheck). The Done action re-reads the load behind the dialog. -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-base-content/[0.07] text-muted" aria-hidden="true">
          <CheckIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={bulkSummaryTitle} tabindex="-1" id="cairn-ml-bulk-title" class="type-heading font-bold font-[family-name:var(--font-display)] outline-hidden">Done. {res.deleted.length} deleted{res.skipped.length > 0 ? `, ${res.skipped.length} skipped` : ''}</h2>
          <p id="cairn-ml-bulk-desc" class="mt-1 type-meta leading-relaxed text-muted">
            The {res.deleted.length} {res.deleted.length === 1 ? 'delete is' : 'deletes are'} one commit to <code class="rounded bg-[var(--cairn-code-chip)] px-1 py-0.5 font-[family-name:var(--font-editor)] type-meta">main</code>.{#if res.skipped.length > 0} The {res.skipped.length} skipped had a reference turn up on the recheck and {res.skipped.length === 1 ? 'was' : 'were'} left as {res.skipped.length === 1 ? 'it is' : 'they are'}.{/if}
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Close" onclick={() => void finishBulkDelete()}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-box border border-[var(--cairn-card-border)] p-2.5">
            <div class="type-heading font-bold tabular-nums text-base-content">{res.deleted.length}</div>
            <div class="type-label uppercase tracking-wide text-muted">Deleted</div>
          </div>
          <div class="rounded-box border border-[var(--cairn-card-border)] p-2.5">
            <div class="type-heading font-bold tabular-nums cairn-text-warning">{res.skipped.length}</div>
            <div class="type-label uppercase tracking-wide text-muted">Skipped</div>
          </div>
          <div class="rounded-box border border-[var(--cairn-card-border)] p-2.5">
            <div class="type-heading font-bold tabular-nums text-[var(--cairn-error-ink)]">{res.failed.length}</div>
            <div class="type-label uppercase tracking-wide text-muted">Failed</div>
          </div>
        </div>

        {#if res.skipped.length > 0}
          <div class="overflow-hidden rounded-box border border-[var(--cairn-card-border)]">
            <div class="inline-flex w-full items-center gap-2 bg-[color-mix(in_oklab,var(--cairn-warning-ink)_8%,var(--color-base-100))] p-2.5 type-meta font-semibold cairn-text-warning">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Skipped, a reference turned up on the recheck
            </div>
            <ul role="list" class="flex max-h-36 list-none flex-col overflow-y-auto">
              {#each res.skipped as skip (skip.hash)}
                <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                  <span class="min-w-0 flex-1 truncate type-meta font-semibold">{bulkAssetName(skip.hash)}</span>
                  <span class="flex-none type-label text-muted">{bulkSkipReason(skip)}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if res.failed.length > 0}
          <div class="overflow-hidden rounded-box border border-[var(--cairn-error-border)]">
            <div class="inline-flex w-full items-center gap-2 bg-[var(--cairn-error-tint)] p-2.5 type-label font-semibold text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Failed
            </div>
            <ul role="list" class="flex max-h-36 list-none flex-col overflow-y-auto">
              {#each res.failed as fail (fail.hash)}
                <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-error-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                  <span class="min-w-0 flex-1 truncate type-meta font-semibold">{bulkAssetName(fail.hash)}</span>
                  <span class="flex-none type-label text-[var(--cairn-error-ink)]">{fail.error}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto inline-flex items-center gap-1.5 type-meta text-muted">
            <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> One commit to main
          </span>
          <button type="button" class="btn btn-sm btn-primary" onclick={() => void finishBulkDelete()}>Done</button>
        </div>
      </div>
      <div class="sr-only" role="status" aria-live="polite">Done. {res.deleted.length} deleted, {res.skipped.length} skipped, {res.failed.length} failed.</div>
    {:else}
      <!-- POST-ACTION FAILURE: the fail-closed 503 (the whole batch refused) or a network throw. This
           is the one place role="alert" belongs (an action was attempted and failed). -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]" aria-hidden="true">
          <TriangleAlertIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-bulk-title" class="type-heading font-bold font-[family-name:var(--font-display)]">The delete did not run</h2>
          <p id="cairn-ml-bulk-desc" class="mt-1 type-meta leading-relaxed text-muted">Nothing was deleted. You can close this and try again.</p>
        </div>
      </div>
      <div role="alert" class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3 type-meta leading-relaxed text-[var(--cairn-error-ink)]">
        <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <span>{bulkError}</span>
      </div>
      <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
        <button type="button" class="btn btn-sm" onclick={closeBulkDialog}>Close</button>
        <button type="button" class="btn btn-sm border-[var(--cairn-error-border)] bg-base-100 text-[var(--cairn-error-ink)]" onclick={() => (bulkPhase = 'review')}>Back to the selection</button>
      </div>
    {/if}
  </div>
</dialog>
