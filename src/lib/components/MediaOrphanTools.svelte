<!--
@component
The Media Library's on-demand orphan scan surface: the entry point, the loading/blocked phases,
the two-section result, and the IRREVERSIBLE byte purge (the rev.2 mockup, panels 6, 7, and
8-right). Raw R2 bytes have no git history, so this is the one irreversible media action and it
is kept structurally apart from the reversible bulk delete: a separate dialog, a separate
selection Set of R2 KEYS (never the asset-hash Set), a solid-danger Purge (not the danger-OUTLINE
bulk apply), and a typed-count confirm reserved for this path. The scan fails CLOSED at
detection: a 503 routes to the blocked surface (no dry-run, no collect action), because
under-reporting orphans could feed an unrecoverable purge.

Self-contained: it fetches its own CSRF token from the admin context and owns every scan/purge
state. The host opens it through the exported `open(origin)`, passing the click origin so focus
restores there on close.
-->
<script lang="ts">
  import { getContext, tick } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import type { MediaOrphanScanResult } from '../media/orphan-scan.js';
  import type { MediaOrphanPurgeResult, MediaBulkFailure } from '../sveltekit/content-routes-media.js';
  import { confirmGateMatches } from './typed-confirm.js';
  import { resolveDialogOrigin, refocusDialogOrigin } from './dialog-origin.js';
  import { postFormAction } from './client-action.js';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import { DatabaseIcon, RefreshCwIcon, TriangleAlertIcon, XIcon, CheckIcon, Trash2Icon, GitBranchIcon, ImageOffIcon } from './admin-icons.js';

  interface Props {
    /** Formats a broken-reference row's where-used count into its display line ("used in N
     *  entries" / "no references found"); owned by the host so its wording stays the single
     *  small helper the rest of the screen also reads. */
    brokenWhereUsed: (count: number) => string;
  }

  let { brokenWhereUsed }: Props = $props();

  // The CSRF token getter comes from the admin context, the same seam the insert popover reads.
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

  type OrphanPhase = 'idle' | 'scanning' | 'result' | 'blocked';
  const ORPHAN_SCAN_URL = '?/mediaOrphanScan';
  const ORPHAN_PURGE_URL = '?/mediaOrphanPurge';

  let orphanDialog = $state<HTMLDialogElement | null>(null);
  // The entry-point control (the toolbar's "Find orphaned files" button), so focus restores to it on close.
  let orphanOrigin: HTMLElement | null = null;
  // The dialog title, focused on open so a screen reader is carried to the surface.
  let orphanTitle = $state<HTMLElement | null>(null);
  let orphanPhase = $state<OrphanPhase>('idle');
  // The scan result (the result phase) or the fail-closed error message (the blocked phase).
  let orphanScan = $state<MediaOrphanScanResult | null>(null);
  let orphanBlockedError = $state('');
  // The orphaned-byte selection: a Set of R2 KEYS, distinct from the asset-hash Set the shell owns.
  // Never mutated in place; every change reassigns (the reactive-Set rule the rest of the screen follows).
  let orphanKeys = $state(new Set<string>());
  // The section-level select-all checkbox, set to indeterminate in an effect when some-but-not-all rows
  // are selected (a property, not an attribute, so it is driven imperatively).
  let orphanSelectAll = $state<HTMLInputElement | null>(null);
  // The purge confirm: a nested phase inside the result surface, gated by typing the selected count.
  let orphanPurging = $state(false);
  let orphanConfirmInput = $state('');
  // The purge outcome (the summary) or, on a post-action failure, the error for a role="alert".
  let orphanPurgeResult = $state<MediaOrphanPurgeResult | null>(null);
  let orphanPurgeError = $state('');
  let orphanPurgeBusy = $state(false);

  const orphanBytes = $derived(orphanScan?.orphanedBytes ?? []);
  const orphanBroken = $derived(orphanScan?.brokenRefs ?? []);
  const orphanSelectedCount = $derived(orphanKeys.size);
  // The typed-count gate: the submit is enabled only when the typed value equals the selected count and
  // at least one byte is selected. The one legitimate disable, a visible typed destructive confirm.
  const orphanConfirmMatches = $derived(orphanSelectedCount > 0 && confirmGateMatches(orphanConfirmInput, orphanSelectedCount));
  // The select-all is checked when every byte is selected, indeterminate on a strict subset. Driven
  // imperatively because `indeterminate` is a DOM property with no HTML attribute.
  $effect(() => {
    if (!orphanSelectAll) return;
    const n = orphanSelectedCount;
    const total = orphanBytes.length;
    orphanSelectAll.checked = total > 0 && n === total;
    orphanSelectAll.indeterminate = n > 0 && n < total;
  });

  /** Open the scan, over the given click origin so focus restores there on close. */
  export function open(origin?: HTMLElement | null) {
    orphanOrigin = resolveDialogOrigin(origin);
    orphanPhase = 'scanning';
    orphanScan = null;
    orphanBlockedError = '';
    orphanKeys = new Set<string>();
    orphanPurging = false;
    orphanConfirmInput = '';
    orphanPurgeResult = null;
    orphanPurgeError = '';
    orphanPurgeBusy = false;
    void tick().then(() => {
      orphanDialog?.showModal();
      orphanTitle?.focus();
    });
    void runOrphanScan();
  }
  function closeOrphanScan() {
    orphanDialog?.close();
    orphanPhase = 'idle';
    orphanScan = null;
    orphanKeys = new Set<string>();
    orphanPurging = false;
    orphanConfirmInput = '';
    orphanPurgeResult = null;
    orphanPurgeError = '';
    orphanOrigin = refocusDialogOrigin(orphanOrigin);
  }
  // Escape (the dialog's cancel event) must not abandon an in-flight purge: while the irreversible
  // delete is running the close is suppressed; in every other phase Escape closes normally.
  function onOrphanCancel(e: Event) {
    if (orphanPurgeBusy) {
      e.preventDefault();
      return;
    }
    closeOrphanScan();
  }
  // The Done action after a purge: the bytes are gone, so re-read the load (the broken-refs readout is
  // untouched), then close. invalidateAll re-runs the media load behind the dialog.
  async function finishOrphanPurge() {
    await invalidateAll();
    closeOrphanScan();
  }

  // Run the scan: POST ?/mediaOrphanScan, parse the ActionResult envelope, and route to the result
  // phase (a MediaOrphanScanResult) or the fail-closed blocked phase (a 503 MediaBulkFailure or a
  // network throw). The action reads no fields, but a SvelteKit form action rejects a body-less POST
  // with a 415, so send an empty FormData to carry the form content-type. The CSRF token rides the
  // header. Nothing is pre-selected: this feeds an irreversible purge, so the operator picks each
  // byte (or the select-all) deliberately.
  async function runOrphanScan() {
    orphanPhase = 'scanning';
    orphanBlockedError = '';
    const outcome = await postFormAction<MediaOrphanScanResult>(ORPHAN_SCAN_URL, {
      method: 'POST',
      headers: { 'X-Cairn-CSRF': csrf?.() ?? '' },
      body: new FormData(),
    });
    if (outcome.ok) {
      orphanScan = outcome.data;
      orphanKeys = new Set<string>();
      orphanPhase = 'result';
      // Each phase renders its own h2, so the prior one's focus does not carry over; move focus
      // explicitly so a screen reader is carried to the new surface (the delete summary's own recipe).
      void tick().then(() => orphanTitle?.focus());
    } else {
      // A network throw and a parsed failure both block the scan; a network throw carries no data, so
      // orphanBlockedError falls back to '' and the surface shows its own framing with no server message.
      const failure = outcome.data as MediaBulkFailure | undefined;
      orphanBlockedError = failure?.error ?? '';
      orphanPhase = 'blocked';
      void tick().then(() => orphanTitle?.focus());
    }
  }

  /** Toggle one orphaned-byte key in the selection (reassign-only). */
  function toggleOrphanKey(key: string) {
    const next = new Set(orphanKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    orphanKeys = next;
  }
  /** Select all or clear all orphaned bytes from the section header checkbox. */
  function toggleOrphanAll() {
    orphanKeys = orphanKeys.size === orphanBytes.length ? new Set<string>() : new Set(orphanBytes.map((b) => b.key));
  }
  function clearOrphanSelection() {
    orphanKeys = new Set<string>();
  }

  // Open the typed-count purge confirm over the current selection.
  function openOrphanPurge() {
    if (orphanSelectedCount === 0) return;
    orphanConfirmInput = '';
    orphanPurgeError = '';
    orphanPurging = true;
    void tick().then(() => orphanTitle?.focus());
  }
  function cancelOrphanPurge() {
    orphanPurging = false;
    orphanConfirmInput = '';
    orphanPurgeError = '';
    void tick().then(() => orphanTitle?.focus());
  }

  // The purge: POST ?/mediaOrphanPurge with each selected key as a repeated `key` field plus `confirm` set to
  // the typed count. The server re-derives fresh and skips any key claimed since the scan, so the
  // selection here is advisory. The CSRF token rides the X-Cairn-CSRF header; the ActionResult envelope
  // is read through deserialize. A success carries the MediaOrphanPurgeResult; a fail or a network throw
  // surfaces a role="alert".
  async function applyOrphanPurge() {
    if (!orphanConfirmMatches) return;
    orphanPurgeBusy = true;
    orphanPurgeError = '';
    const formData = new FormData();
    for (const key of orphanKeys) formData.append('key', key);
    formData.append('confirm', orphanConfirmInput);
    const outcome = await postFormAction<MediaOrphanPurgeResult>(ORPHAN_PURGE_URL, {
      method: 'POST',
      headers: { 'X-Cairn-CSRF': csrf?.() ?? '' },
      body: formData,
    });
    orphanPurgeBusy = false;
    if (outcome.ok) {
      orphanPurgeResult = outcome.data;
      orphanPurging = false;
      void tick().then(() => orphanTitle?.focus());
    } else {
      const failure = outcome.data as MediaBulkFailure | undefined;
      orphanPurgeError = failure?.error ?? 'The purge could not be completed. Please try again.';
    }
  }
</script>

<dialog
  bind:this={orphanDialog}
  data-testid="cairn-orphan-dialog"
  class="modal"
  aria-labelledby="cairn-ml-orphan-title"
  aria-describedby="cairn-ml-orphan-desc"
  oncancel={onOrphanCancel}
>
  <div class="modal-box max-w-2xl">
    <!-- The polite live region renders unconditionally (present and empty from mount), so the purge
         confirm's warning sentence is announced when it first appears; a region conditionally mounted
         WITH its first content is not reliably observed by assistive tech (WCAG 4.1.3). -->
    <div class="sr-only" role="status" aria-live="polite">
      {#if orphanPhase === 'result' && orphanPurging}
        Purge {orphanSelectedCount} orphaned {orphanSelectedCount === 1 ? 'file' : 'files'}. This cannot be undone.
      {/if}
    </div>
    {#if orphanPhase === 'scanning'}
      <!-- LOADING: a polite live region announces the scan is running. The scan is far heavier than the
           loaded index (an R2 list plus a cross-branch reconcile), so it is on demand, never instant. -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-base-200 text-muted" aria-hidden="true">
          <DatabaseIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="type-heading font-bold font-[family-name:var(--font-display)] outline-hidden">Scanning storage</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 type-meta leading-relaxed text-muted">Listing every stored file and checking it against the library across the site and every open edit. This can take a moment.</p>
        </div>
      </div>
      <div class="flex flex-col items-center gap-3 py-6">
        <RefreshCwIcon class="h-6 w-6 animate-spin text-muted" aria-hidden="true" />
        <span class="type-meta text-muted">Scanning storage for orphaned files…</span>
      </div>
      <div class="sr-only" role="status" aria-live="polite">Scanning storage for orphaned files…</div>
    {:else if orphanPhase === 'blocked'}
      <!-- DETECTION-TIME FAIL CLOSED: the scan did not run because an open edit branch could not be
           read, so cairn cannot be sure which files are truly orphaned. There is NO collect or purge
           action, not even disabled. The banner is role="status" (no action was attempted). The server
           returns a generic message, so the framing names an unreadable open edit without naming the
           specific branch (naming it is a known carry-forward). -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-base-200 text-muted" aria-hidden="true">
          <DatabaseIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="type-heading font-bold font-[family-name:var(--font-display)] outline-hidden">The scan could not finish</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 type-meta leading-relaxed text-muted">cairn could not read one of your open edits, so it cannot tell which files are truly orphaned. No file was changed.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Close" onclick={closeOrphanScan}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div role="status" class="flex flex-col gap-3 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3.5 type-meta leading-relaxed">
        <span class="inline-flex items-center gap-2 font-semibold">
          <TriangleAlertIcon class="h-4 w-4 flex-none cairn-text-warning" aria-hidden="true" /> Could not read every branch
        </span>
        <p class="text-base-content">
          A file looks orphaned only if no record on any branch points to it. One open edit would not load, so cairn cannot be sure. It will not show a list of files to purge that it might be wrong about.
        </p>
        {#if orphanBlockedError}
          <p class="text-muted">{orphanBlockedError}</p>
        {/if}
      </div>
      <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
        <span class="mr-auto inline-flex items-center gap-1.5 type-meta text-muted">No file was changed.</span>
        <button type="button" class="btn btn-sm" onclick={closeOrphanScan}>Close</button>
        <button type="button" class="btn btn-sm border-[var(--cairn-card-border)] bg-base-100" onclick={() => void runOrphanScan()}>
          <RefreshCwIcon class="h-3.5 w-3.5" aria-hidden="true" /> Check again
        </button>
      </div>
    {:else if orphanPhase === 'result' && orphanPurgeResult}
      {@const res = orphanPurgeResult}
      <!-- THE PURGE SUMMARY: the purged count, the keys skipped because their hash was claimed since the
           scan, and any per-object failure. The Done action re-reads the load (the bytes are gone). -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-base-content/[0.07] text-muted" aria-hidden="true">
          <CheckIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="type-heading font-bold font-[family-name:var(--font-display)] outline-hidden">Done. {res.purged.length} purged{res.skippedClaimed.length > 0 ? `, ${res.skippedClaimed.length} kept` : ''}</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 type-meta leading-relaxed text-muted">
            The {res.purged.length} {res.purged.length === 1 ? 'file is' : 'files are'} gone for good.{#if res.skippedClaimed.length > 0} {res.skippedClaimed.length} {res.skippedClaimed.length === 1 ? 'was' : 'were'} kept because the file was claimed by a record since the scan.{/if}
          </p>
        </div>
      </div>
      {#if res.skippedClaimed.length > 0}
        <div class="overflow-hidden rounded-box border border-[var(--cairn-card-border)]">
          <div class="bg-base-200/60 p-2.5 type-meta font-semibold text-muted">Kept, the file was claimed since the scan</div>
          <ul role="list" class="flex max-h-36 list-none flex-col overflow-y-auto">
            {#each res.skippedClaimed as key (key)}
              <li class="border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 font-[family-name:var(--font-editor)] type-meta first:border-t-0">{key}</li>
            {/each}
          </ul>
        </div>
      {/if}
      {#if res.failed.length > 0}
        <div class="mt-3 overflow-hidden rounded-box border border-[var(--cairn-error-border)]">
          <div class="bg-[var(--cairn-error-tint)] p-2.5 type-label font-semibold text-[var(--cairn-error-ink)]">Failed</div>
          <ul role="list" class="flex max-h-36 list-none flex-col overflow-y-auto">
            {#each res.failed as fail (fail.key)}
              <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-error-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                <span class="min-w-0 flex-1 truncate font-[family-name:var(--font-editor)] type-meta">{fail.key}</span>
                <span class="flex-none type-label text-[var(--cairn-error-ink)]">{fail.error}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
        <button type="button" class="btn btn-sm btn-primary" onclick={() => void finishOrphanPurge()}>Done</button>
      </div>
      <div class="sr-only" role="status" aria-live="polite">Done. {res.purged.length} purged, {res.skippedClaimed.length} kept, {res.failed.length} failed.</div>
    {:else if orphanPhase === 'result' && orphanPurging}
      <!-- THE IRREVERSIBLE PURGE CONFIRM: the typed-count gate, reserved for THIS path only. The badge
           and the submit carry the SOLID danger fill (--color-error), the one fill the destructive
           register owns. The verb is Purge, never Delete, and the callout states that there is no git
           history for raw bytes. The submit is disabled until the typed value equals the selected
           count. role="alert" is reserved for a post-action failure below. -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--color-error)] text-[var(--color-error-content)]" aria-hidden="true">
          <TriangleAlertIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="type-heading font-bold font-[family-name:var(--font-display)] outline-hidden">Purge {orphanSelectedCount} orphaned {orphanSelectedCount === 1 ? 'file' : 'files'}?</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 type-meta leading-relaxed text-muted">This removes the stored bytes for good. It is not a library delete, and it cannot be undone.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Cancel" onclick={cancelOrphanPurge}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div class="flex flex-col gap-3">
        <!-- The dry-run: the keys to remove, each with a checkerboard mat (record-not-picture). -->
        <ul role="list" class="flex max-h-40 list-none flex-col gap-1 overflow-y-auto rounded-box border border-[var(--cairn-card-border)] p-2">
          {#each orphanBytes.filter((b) => orphanKeys.has(b.key)) as byte (byte.key)}
            <li class="flex items-center gap-2.5 rounded px-1.5 py-1">
              <span class="h-6 w-8 flex-none rounded border border-[var(--cairn-card-border)] bg-base-200 [background-image:linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_25%,transparent_25%,transparent_75%,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_75%),linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_25%,transparent_25%,transparent_75%,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_75%)] [background-position:0_0,4px_4px] [background-size:8px_8px]" aria-hidden="true"></span>
              <span class="min-w-0 flex-1 truncate font-[family-name:var(--font-editor)] type-meta">{byte.key}</span>
            </li>
          {/each}
        </ul>
        <!-- The IRREVERSIBLE callout, distinct from the bulk delete's git-revert reassurance. -->
        <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3 type-meta leading-relaxed text-[var(--cairn-error-ink)]">
          <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span><b class="font-semibold">This cannot be undone.</b> A library delete lives in git history and a developer can bring it back. There is no git history for raw bytes, so once these are purged they are gone.</span>
        </div>
        <!-- The typed-count gate, reserved for the irreversible path. -->
        <div class="flex flex-col gap-1.5">
          <label class="type-meta" for="cairn-ml-purge-confirm">Type <code class="rounded bg-[var(--cairn-code-chip)] px-1 py-0.5 font-[family-name:var(--font-editor)] type-meta">{orphanSelectedCount}</code> to purge these files for good.</label>
          <input
            id="cairn-ml-purge-confirm"
            class="input input-sm"
            type="text"
            autocomplete="off"
            placeholder="Type the number of files"
            aria-label="Type the file count to confirm the purge"
            bind:value={orphanConfirmInput}
          />
        </div>
        {#if orphanPurgeError}
          <div role="alert" class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3 type-meta leading-relaxed text-[var(--cairn-error-ink)]">
            <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>{orphanPurgeError}</span>
          </div>
        {/if}
        <div class="flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <button type="button" class="btn btn-sm" onclick={cancelOrphanPurge}>Cancel</button>
          <button
            type="button"
            class="btn btn-sm border-0 bg-[var(--color-error)] text-[var(--color-error-content)] hover:bg-[var(--color-error)]/90"
            disabled={!orphanConfirmMatches || orphanPurgeBusy}
            onclick={() => void applyOrphanPurge()}
          >
            <Trash2Icon class="h-3.5 w-3.5" aria-hidden="true" /> Purge {orphanSelectedCount} {orphanSelectedCount === 1 ? 'file' : 'files'}
          </button>
        </div>
      </div>
    {:else if orphanPhase === 'result' && orphanScan}
      <!-- THE TWO-SECTION RESULT: an "Orphaned files" purge surface and a read-only "Broken references"
           data-integrity readout. -->
      <div class="mb-4 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-base-200 text-muted" aria-hidden="true">
          <DatabaseIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="type-heading font-bold font-[family-name:var(--font-display)] outline-hidden">Orphaned files and broken references</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 type-meta leading-relaxed text-muted">
            A scan of stored files against the library across every tracked branch. It found {orphanBytes.length} stored {orphanBytes.length === 1 ? 'file' : 'files'} with no record, and {orphanBroken.length} {orphanBroken.length === 1 ? 'record whose file is' : 'records whose files are'} gone.
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Close" onclick={closeOrphanScan}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-col gap-5">
        <!-- SECTION 1: orphaned BYTES, the irreversible purge surface. -->
        <section>
          <div class="mb-2 flex items-baseline justify-between gap-2">
            <span class="inline-flex items-center gap-2 type-meta font-semibold">Orphaned files <span class="rounded-full bg-base-content/[0.07] px-1.5 py-0.5 type-label tabular-nums">{orphanBytes.length}</span></span>
          </div>
          <p class="mb-2 type-meta leading-relaxed text-muted">Stored files with no record in the library. No <code class="rounded bg-[var(--cairn-code-chip)] px-1 py-0.5 font-[family-name:var(--font-editor)] type-label">media:</code> reference can point to these, so nothing on the site uses them through cairn.</p>
          {#if orphanBytes.length === 0}
            <!-- The calm empty state: a clean scan, no purge control. -->
            <div class="flex items-center gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta text-muted">
              <CheckIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" /> No orphaned files found. Every stored file has a record.
            </div>
          {:else}
            <!-- The residual-risk note, named at the point of action. -->
            <div class="mb-2 flex items-start gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3 type-meta leading-relaxed text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <span><b class="font-semibold">Purging a file removes the bytes for good.</b> There is no git history for raw storage, so this cannot be undone. The one thing cairn cannot check: a page that hardcodes a file's web address in raw HTML would still load these.</span>
            </div>
            <div class="overflow-hidden rounded-box border border-[var(--cairn-card-border)]">
              <div class="flex items-center gap-2.5 border-b border-[var(--cairn-card-border)] bg-base-200/60 px-3 py-2">
                <input
                  bind:this={orphanSelectAll}
                  type="checkbox"
                  class="checkbox checkbox-sm border-[var(--cairn-error-border)]"
                  aria-label="Select all orphaned files"
                  onchange={toggleOrphanAll}
                />
                <span class="type-meta font-semibold text-muted">{orphanBytes.length} {orphanBytes.length === 1 ? 'file' : 'files'} in storage with no record</span>
              </div>
              <!-- A plain list of labelled native checkboxes, NOT a listbox. The rows carry no roving
                   tabindex or key handler, so the listbox role would have been decorative and would
                   have fought the Tab-to-checkbox model. Each checkbox is the selection signal; the
                   header select-all conveys group state. -->
              <ul role="list" aria-label="Orphaned files" class="flex max-h-52 list-none flex-col overflow-y-auto p-0">
                {#each orphanBytes as byte (byte.key)}
                  {@const picked = orphanKeys.has(byte.key)}
                  <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm border-[var(--cairn-error-border)]"
                      checked={picked}
                      aria-label={`Select ${byte.key}`}
                      onchange={() => toggleOrphanKey(byte.key)}
                    />
                    <span class="h-6 w-8 flex-none rounded border border-[var(--cairn-card-border)] bg-base-200 [background-image:linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_25%,transparent_25%,transparent_75%,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_75%),linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_25%,transparent_25%,transparent_75%,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_75%)] [background-position:0_0,4px_4px] [background-size:8px_8px]" aria-hidden="true"></span>
                    <div class="min-w-0 flex-1">
                      <div class="truncate font-[family-name:var(--font-editor)] type-meta">{byte.key}</div>
                      <div class="type-label text-muted">No library record</div>
                    </div>
                  </li>
                {/each}
              </ul>
            </div>
            <!-- The per-section action: a selection note plus the SOLID-danger Purge (never a warning fill). -->
            <div class="mt-3 flex items-center gap-2.5">
              <span class="inline-flex items-center gap-1.5 type-meta text-muted">
                {orphanSelectedCount} of {orphanBytes.length} selected
                {#if orphanSelectedCount > 0}<button type="button" class="link text-muted" onclick={clearOrphanSelection}>Clear</button>{/if}
              </span>
              <span class="flex-1"></span>
              <button
                type="button"
                class="btn btn-sm border-0 bg-[var(--color-error)] text-[var(--color-error-content)] hover:bg-[var(--color-error)]/90"
                aria-haspopup="dialog"
                disabled={orphanSelectedCount === 0}
                onclick={openOrphanPurge}
              >
                <Trash2Icon class="h-3.5 w-3.5" aria-hidden="true" /> Purge {orphanSelectedCount} {orphanSelectedCount === 1 ? 'file' : 'files'}
              </button>
            </div>
          {/if}
        </section>

        <!-- SECTION 2: BROKEN references, a READ-ONLY data-integrity readout. No checkbox, no action. -->
        {#if orphanBroken.length > 0}
          <section data-testid="cairn-broken-refs">
            <div class="mb-2 flex items-baseline justify-between gap-2">
              <span class="inline-flex items-center gap-2 type-meta font-semibold">Broken references <span class="rounded-full bg-base-content/[0.07] px-1.5 py-0.5 type-label tabular-nums">{orphanBroken.length}</span></span>
            </div>
            <p class="mb-2 type-meta leading-relaxed text-muted">A record points at a file that is no longer in storage. This is not something to delete here. Re-upload or remove the reference from the entries below.</p>
            <ul role="list" class="flex list-none flex-col overflow-hidden rounded-box border border-[var(--cairn-card-border)] p-0">
              {#each orphanBroken as ref (ref.hash)}
                <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                  <span class="flex h-7 w-9 flex-none items-center justify-center rounded border border-[var(--cairn-card-border)] bg-base-200 text-muted" aria-hidden="true">
                    <ImageOffIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="truncate type-meta font-semibold">{ref.slug || ref.hash}</div>
                    <div class="truncate font-[family-name:var(--font-editor)] type-label text-muted">file missing in storage</div>
                  </div>
                  <span class="flex-none type-label font-semibold text-muted">{brokenWhereUsed(ref.usage.length)}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </div>

      <div class="mt-5 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
        <span class="mr-auto inline-flex items-center gap-1.5 type-meta text-muted">
          <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> Scanned across the site and every open edit
        </span>
        <button type="button" class="btn btn-sm" onclick={closeOrphanScan}>Close</button>
      </div>
    {/if}
  </div>
</dialog>
