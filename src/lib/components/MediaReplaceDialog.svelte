<!--
@component
The Media Library's Replace dialog (the rev.2 mockup Replace flow): a native modal `<dialog>`
(native focus trap + Escape), role="alertdialog", the danger register, and a typed-slug gate,
since a replace repoints a content hash and can break a draft. Step one is the quiet upload of a
new file; cairn is content-addressed, so the upload gets a new hash and every published entry
that uses the old one is repointed to it in one commit to main. Step two is the impact review,
gated behind typing the asset's slug; the blocked step is the fail-closed surface (no apply
button) for when usage cannot be fully verified.

The host opens it through the exported `open(asset, origin)`, pinning the asset at that moment so
a background re-render never swaps it mid-review, and the click origin so focus restores there on
close. `close()` is exposed for a host-driven dismissal; the dialog also closes itself on Cancel
and on the native `cancel` event (Escape). `onapplied` fires just before the apply form's
full-page POST to `?/mediaReplace` navigates away.
-->
<script lang="ts">
  import { getContext, tick } from 'svelte';
  import { deserialize } from '$app/forms';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type {
    MediaReplacePreviewPlan,
    MediaReplaceFailure,
    MediaReplacePreviewEntry,
  } from '../sveltekit/content-routes-media.js';
  import type { MediaEntry } from '../media/manifest.js';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import {
    ingestFile,
    buildUploadRequest,
    sendUpload,
    ingestFailureKind,
    failureCard,
    type IngestFailureCard,
  } from './client-ingest.js';
  import { uploadOutcome, type UploadEnvelope } from './media-upload-outcome.js';
  import { confirmGateMatches } from './typed-confirm.js';
  import { resolveDialogOrigin, refocusDialogOrigin } from './dialog-origin.js';
  import { postFormAction, createRequestGuard } from './client-action.js';
  import CsrfField from './CsrfField.svelte';
  import {
    UploadIcon,
    TriangleAlertIcon,
    ImageOffIcon,
    XIcon,
    CheckIcon,
    FileTextIcon,
    ClockIcon,
    RefreshCwIcon,
    GitBranchIcon,
    ArrowRightIcon,
  } from './admin-icons.js';

  interface Props {
    /** The set of hashes whose thumbnail has 404'd, shared with the rest of the screen so a
     *  broken image reads consistently in the upload step's preview. */
    brokenHashes: Set<string>;
    /** Marks a hash's thumbnail broken in the host's shared set. */
    markBroken: (hash: string) => void;
    /** Resolves an asset's thumbnail URL under the site's configured delivery base. */
    thumbSrc: (asset: MediaLibraryEntry) => string;
    /** Formats an asset's width x height, or the empty string when either is unknown. */
    dimensions: (asset: MediaLibraryEntry) => string;
    /** Formats a byte count for display. */
    formatBytes: (bytes: number) => string;
    /** The shared section-heading class, the same token the host's own headings use. */
    headerLabel: string;
    /** Called just before the apply form's full-page POST navigates away. */
    onapplied?: () => void;
  }

  let { brokenHashes, markBroken, thumbSrc, dimensions, formatBytes, headerLabel, onapplied }: Props = $props();

  // The CSRF token getter comes from the admin context, re-fetched independently of the host.
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

  // --- the Replace flow: a two-step alertdialog (upload, then impact review) over the pinned asset ---
  // Replace uploads a new file for the pinned asset; cairn is content-addressed, so the new file has a
  // new hash and every published reference is repointed to it in one commit to main. The dialog opens on
  // the quiet upload step, holds the server-owned record on a successful upload, fetches the preview
  // (fail-closed), and renders the impact review behind a typed-slug gate.
  type ReplaceStep = 'upload' | 'review' | 'blocked';
  // The transient upload status under the upload step: idle, an in-flight ingest/upload, or a typed
  // ingest failure card with a retry. Mirrors the insert popover's failed-card grammar.
  type ReplaceUpload =
    | { kind: 'idle' }
    | { kind: 'working' }
    | { kind: 'failed'; card: IngestFailureCard | { status: 'failed'; message: string }; retry: () => void };

  let replaceDialog = $state<HTMLDialogElement | null>(null);
  // The entry-point button that opened the dialog, so focus restores to it on close (the alertdialog
  // recipe, like the delete dialog's slide-over Delete button).
  let replaceOrigin: HTMLElement | null = null;
  // The Cancel control, the destructive-confirm initial focus.
  let replaceCancelButton = $state<HTMLButtonElement | null>(null);
  let replaceFileInput = $state<HTMLInputElement | null>(null);
  let replaceStep = $state<ReplaceStep>('upload');
  let replaceUpload = $state<ReplaceUpload>({ kind: 'idle' });
  // The server-owned record the upload returned (the new asset), held for the preview and the apply.
  let replaceRecord = $state<MediaEntry | null>(null);
  // The resolved preview plan (the review step) or the fail-closed failure (the blocked step).
  let replacePlan = $state<MediaReplacePreviewPlan | null>(null);
  let replaceFailure = $state<MediaReplaceFailure | null>(null);
  // The typed-slug confirm gate, echoing the delete dialog's type-to-confirm.
  let replaceConfirmInput = $state('');
  // The asset the Replace dialog acts on, pinned at open so a background re-render never swaps it.
  let replaceAsset = $state<MediaLibraryEntry | null>(null);
  const replaceConfirmMatches = $derived(replaceAsset !== null && confirmGateMatches(replaceConfirmInput, replaceAsset.slug));

  /** Open over the pinned asset, and the click origin to refocus on close. */
  export function open(asset: MediaLibraryEntry, origin?: HTMLElement | null) {
    // The entry-point button passed from the click (focus restores here on close), falling back to the
    // active element. A programmatic .click() does not focus its target, so the explicit origin is the
    // reliable restore point.
    replaceOrigin = resolveDialogOrigin(origin);
    replaceAsset = asset;
    replaceStep = 'upload';
    replaceUpload = { kind: 'idle' };
    replaceRecord = null;
    replacePlan = null;
    replaceFailure = null;
    replaceConfirmInput = '';
    // Show the dialog after the step state flushes, then move focus to Cancel.
    void tick().then(() => {
      replaceDialog?.showModal();
      replaceCancelButton?.focus();
    });
  }
  function closeReplaceDialog() {
    replaceDialog?.close();
    replaceAsset = null;
    replaceRecord = null;
    replacePlan = null;
    replaceFailure = null;
    replaceConfirmInput = '';
    replaceUpload = { kind: 'idle' };
    // Restore focus to the entry-point button (the alertdialog focus-restore recipe).
    replaceOrigin = refocusDialogOrigin(replaceOrigin);
  }
  /** Close the dialog exactly as Cancel or Escape would. */
  export function close() {
    closeReplaceDialog();
  }

  // The chosen-file handler: route the file through the ingest-and-upload loop, exactly as the insert
  // popover does, then fetch the preview. A file is the only path (Pass B is upload-new-only).
  function onReplaceFileChosen(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void runReplaceUpload(file);
  }

  // The upload loop for the new file. It ingests (decode/transcode), uploads through the shared
  // transport, and on the success envelope holds the new record and runs the preview. A typed ingest or
  // upload failure surfaces a retry card on the upload step; an expired session reads as a generic card.
  // The upload posts to the media-scoped ?/mediaUpload action: the Library is not entry-scoped, so it
  // overrides buildUploadRequest's entry URL while reusing its header-and-body transport verbatim.
  async function runReplaceUpload(file: File) {
    if (!replaceAsset) return;
    replaceUpload = { kind: 'working' };
    const genericFail = () =>
      (replaceUpload = {
        kind: 'failed',
        card: { status: 'failed', message: GENERIC_UPLOAD_MESSAGE },
        retry: () => void runReplaceUpload(file),
      });

    let ingested: Awaited<ReturnType<typeof ingestFile>>;
    try {
      ingested = await ingestFile(file);
    } catch (err) {
      replaceUpload = { kind: 'failed', card: failureCard(ingestFailureKind(err)), retry: () => void runReplaceUpload(file) };
      return;
    }

    const built = buildUploadRequest({
      conceptId: '',
      id: '',
      bytes: ingested.blob,
      contentType: ingested.contentType,
      csrf: csrf?.() ?? '',
      filename: file.name,
      width: ingested.width,
      height: ingested.height,
    });
    let res: Response;
    try {
      res = await sendUpload(REPLACE_UPLOAD_URL, built.init);
    } catch (err) {
      replaceUpload = { kind: 'failed', card: failureCard(ingestFailureKind(err)), retry: () => void runReplaceUpload(file) };
      return;
    }
    // The guard's expired-session 303 under redirect:'manual' surfaces as an opaque, status-0 response.
    if (res.type === 'opaqueredirect' || res.status === 0) {
      genericFail();
      return;
    }
    let outcome: ReturnType<typeof uploadOutcome>;
    try {
      outcome = uploadOutcome(deserialize(await res.text()) as UploadEnvelope);
    } catch {
      genericFail();
      return;
    }
    if (outcome.kind !== 'inserted') {
      genericFail();
      return;
    }
    // Hold the server-owned record, then fetch the impact preview for (oldHash -> newHash).
    replaceRecord = outcome.record;
    replaceUpload = { kind: 'idle' };
    await runReplacePreview();
  }

  // A per-call request guard drops the preview fetch's response if it lands on a closed or reopened
  // dialog. Svelte reactivity does not track reads below the first `await`, so each call pins its own
  // token at entry and bails after the await if a newer call (a reopen, or a "Check usage again"
  // double-click) has since superseded it.
  const replacePreviewGuard = createRequestGuard();

  // The preview fetch: POST the (oldHash, newHash, slug) tuple in the 2a transport (a text/plain
  // body, the CSRF token in the X-Cairn-CSRF header), parse the SvelteKit ActionResult envelope, and
  // route to the review step (a plan) or the fail-closed blocked step (a failure). Re-runnable from the
  // blocked step's "Check usage again". The slug is the OLD asset's: a replace keeps the name and
  // changes only the content hash, so the repointed token carries the existing slug, not the new file's.
  async function runReplacePreview() {
    if (!replaceAsset || !replaceRecord) return;
    const hash = replaceAsset.hash;
    const token = replacePreviewGuard.next();
    const body = JSON.stringify({ oldHash: hash, newHash: replaceRecord.hash, slug: replaceAsset.slug });
    const outcome = await postFormAction<MediaReplacePreviewPlan>(REPLACE_PREVIEW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': csrf?.() ?? '' },
      body,
    });
    // The dialog was closed or reopened (for another asset, or via a re-run) while this fetch was in
    // flight, so a stale response is ignored rather than clobbering the live state.
    if (replacePreviewGuard.isStale(token)) return;
    if (outcome.ok) {
      replacePlan = outcome.data;
      replaceFailure = null;
      replaceConfirmInput = '';
      replaceStep = 'review';
    } else {
      // The fail-closed landing: an unverifiable usage read, an unreachable preview, or an unparseable
      // body all route to the blocked step. A parsed failure carries the branch-naming error when the
      // server returned one; a transport miss carries the empty error (the generic honest line stands in).
      const failure = outcome.data as MediaReplaceFailure | undefined;
      replaceFailure = failure ?? { error: '', hash, usage: [], foundIn: 0 };
      replacePlan = null;
      replaceStep = 'blocked';
    }
  }

  const GENERIC_UPLOAD_MESSAGE = 'The upload could not be completed. Please try again.';
  // The media-scoped upload and preview action URLs, relative to /admin/media. The upload reuses the
  // shared ingest transport but the Library has no entry, so it targets ?/mediaUpload rather than the
  // entry-scoped ?/upload. The apply form below posts ?/mediaReplace.
  const REPLACE_UPLOAD_URL = '?/mediaUpload';
  const REPLACE_PREVIEW_URL = '?/mediaReplacePreview';

  // The affected-entry well caps past this many rows; "Show all N" reveals the rest into the same
  // scroll container (the a11y contract: aria-expanded + aria-controls).
  const REPLACE_ROW_CAP = 8;
  let replaceShowAll = $state(false);
  // The affected-entry list element, so "Show all" can move focus to the first newly revealed row (the
  // one just past the cap) instead of dropping to <body> when the expander button unmounts.
  let replaceEntriesList = $state<HTMLElement | null>(null);
  $effect(() => {
    // Reset the reveal whenever a fresh plan arrives, so a second preview never opens pre-expanded.
    void replacePlan;
    replaceShowAll = false;
  });
  // Reveal the capped rows, then move focus to the first newly revealed row (the rev.2 contract). The
  // expander unmounts on the flag flip, so without this focus falls to <body>.
  function showAllReplaceEntries() {
    replaceShowAll = true;
    void tick().then(() => (replaceEntriesList?.children[REPLACE_ROW_CAP] as HTMLElement | undefined)?.focus());
  }
  const replaceEntries = $derived(replacePlan?.entries ?? []);
  const replaceVisibleEntries = $derived(
    replaceShowAll ? replaceEntries : replaceEntries.slice(0, REPLACE_ROW_CAP),
  );
  const replaceHiddenCount = $derived(Math.max(0, replaceEntries.length - REPLACE_ROW_CAP));
  // The server's distinct affected-entry count, read in several places across the review markup and
  // the apply button. Coalesced once here so each read stays a plain number.
  const replaceAffected = $derived(replacePlan?.affectedCount ?? 0);
  // The open cairn/* edits the replace leaves on the old file, report-only. Coalesced here for the
  // same reason: the delta well, its count, and the live region below all read it.
  const replaceBranchCount = $derived(replacePlan?.branchDelta?.length ?? 0);
  // The live region's trailing branch-delta clause, empty when no open edit is affected. Built here
  // rather than inline so the announced sentence stays one readable interpolation.
  const replaceBranchNote = $derived(
    replaceBranchCount > 0
      ? ` ${replaceBranchCount} open ${replaceBranchCount === 1 ? 'edit is' : 'edits are'} not touched.`
      : '',
  );

  // The where-used summary line for one affected entry, derived from its repointed placements: a hero
  // count and a body count, folded into a plain phrase ("Hero and 2 in the body", "1 in the body").
  function replaceWhereUsed(entry: MediaReplacePreviewEntry): string {
    let hero = 0;
    let body = 0;
    for (const p of entry.placements) {
      if (p.kind === 'hero') hero += 1;
      else body += 1;
    }
    const parts: string[] = [];
    if (hero > 0) parts.push(hero === 1 ? 'Hero' : `${hero} heroes`);
    if (body > 0) parts.push(`${body} in the body`);
    return parts.length > 0 ? parts.join(' and ') : 'Used in this entry';
  }

  // The specific unreadable branch named by a fail-closed failure, or null for the generic honest line.
  // The current MediaReplaceFailure carries only an error string, so a cairn/* branch name is pulled
  // from the message when the strict read named one; otherwise the generic variant stands in.
  const replaceBlockedBranch = $derived.by(() => {
    const match = replaceFailure?.error.match(/cairn\/[^\s.]+/);
    return match ? match[0] : null;
  });
</script>

<!-- The Replace alertdialog: a native modal <dialog> (native focus trap + Escape), NO light dismiss.
     A replace repoints a content hash and can break a draft, so it carries role="alertdialog", the
     danger register, and a typed-slug gate. Step one is the quiet upload; step two is the impact review
     gated behind the typed slug; the blocked step is the fail-closed surface (no apply button). -->
<dialog
  bind:this={replaceDialog}
  data-testid="cairn-replace-dialog"
  class="modal"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="cairn-ml-replace-title"
  aria-describedby="cairn-ml-replace-sub"
  oncancel={closeReplaceDialog}
>
  {#if replaceAsset}
    {@const asset = replaceAsset}
    <div class="modal-box max-w-xl">
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]" aria-hidden="true">
          {#if replaceStep === 'blocked'}<TriangleAlertIcon class="h-5 w-5" />{:else}<RefreshCwIcon class="h-5 w-5" />{/if}
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-replace-title" class="type-heading font-bold font-[family-name:var(--font-display)]">
            {#if replaceStep === 'review'}
              Replace {asset.slug} in {replaceAffected} published {replaceAffected === 1 ? 'entry' : 'entries'}
            {:else if replaceStep === 'blocked'}
              Replace is on hold
            {:else}
              Replace {asset.displayName}
            {/if}
          </h2>
          <p id="cairn-ml-replace-sub" class="mt-1 type-meta leading-relaxed text-muted">
            {#if replaceStep === 'review'}
              The new file replaces the stored image. Every published entry that uses it is repointed in one commit to main, and readers see the change once the build finishes.
            {:else if replaceStep === 'blocked'}
              cairn could not read every place this image is used, so it will not repoint references it cannot see. No file was changed.
            {:else}
              Upload a new file. Every published entry that uses this image points to the new one, in one commit to main.
            {/if}
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Cancel" onclick={closeReplaceDialog}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {#if replaceStep === 'upload'}
        <!-- Step one: upload a new file (upload-new-only). The asset being replaced stays named above
             the dropzone, so the author never loses it. Cancel is the initial focus; no apply yet. -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3 rounded-box border border-[var(--cairn-card-border)] bg-base-200/60 p-3">
            <span class="flex h-12 w-12 flex-none items-center justify-center overflow-hidden card-shell">
              {#if brokenHashes.has(asset.hash)}
                <ImageOffIcon class="h-5 w-5 text-subtle" aria-hidden="true" />
              {:else}
                <img src={thumbSrc(asset)} alt="" aria-hidden="true" class="h-full w-full object-cover" onerror={() => markBroken(asset.hash)} />
              {/if}
            </span>
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="type-chip font-semibold uppercase tracking-[0.06em] text-muted">Replacing</span>
              <span class="type-body font-semibold">{asset.displayName}</span>
              <span class="font-[family-name:var(--font-editor)] type-meta text-muted tabular-nums">
                {#if dimensions(asset)}{dimensions(asset)}<span class="px-1" aria-hidden="true">&middot;</span>{/if}{formatBytes(asset.bytes)}
              </span>
            </span>
          </div>

          {#if replaceUpload.kind === 'failed'}
            <!-- A typed ingest/upload failure: an assertive alert with the message and a Retry. -->
            <div role="alert" class="flex flex-col items-center gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-4 text-center">
              <TriangleAlertIcon class="h-6 w-6 text-[var(--cairn-error-ink)]" aria-hidden="true" />
              <span class="type-meta text-[var(--cairn-error-ink)]">{replaceUpload.card.message}</span>
              <button type="button" class="btn btn-sm" onclick={replaceUpload.retry}>Try another file</button>
            </div>
          {:else if replaceUpload.kind === 'working'}
            <div role="status" class="flex flex-col items-center gap-2 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-100 p-5 text-center text-muted">
              <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
              <span class="type-meta">Preparing the new file…</span>
            </div>
          {:else}
            <div class="flex flex-col items-center gap-1.5 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-100 p-5 text-center text-muted">
              <UploadIcon class="h-6 w-6 text-primary" aria-hidden="true" />
              <span class="type-body font-medium text-base-content">Drop the new image, or upload</span>
              <span class="type-meta">PNG, JPEG, WebP, or HEIC. We convert HEIC for you.</span>
              <button type="button" class="btn btn-sm btn-primary mt-1.5" onclick={() => replaceFileInput?.click()}>Choose a file</button>
              <input
                bind:this={replaceFileInput}
                type="file"
                accept="image/*"
                class="sr-only"
                aria-label="Choose a new image to replace this asset"
                onchange={onReplaceFileChosen}
              />
            </div>
          {/if}
        </div>
        <div class="mt-4 flex justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <button bind:this={replaceCancelButton} type="button" class="btn btn-sm" onclick={closeReplaceDialog}>Cancel</button>
        </div>
      {:else if replaceStep === 'review'}
        {@const newRec = replaceRecord}
        <!-- Step two: the impact review. The from/to strip carries the CORRECTED content-addressed copy
             (the name stays, only the hash changes); the affected-entry well is expanded by default and
             scroll-capped; the branch-delta is a calm report-only aside; the typed-slug gates apply. -->
        <div class="flex flex-col gap-group">
          {#if newRec}
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-box border border-[var(--cairn-card-border)] bg-base-200/60 p-3">
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="type-chip font-semibold uppercase tracking-[0.06em] text-muted">Current</span>
                <span class="font-[family-name:var(--font-editor)] type-meta text-muted tabular-nums line-through">.{asset.hash}</span>
              </div>
              <ArrowRightIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" />
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="type-chip font-semibold uppercase tracking-[0.06em] text-muted">New file</span>
                <span class="font-[family-name:var(--font-editor)] type-meta text-primary tabular-nums">.{newRec.hash}</span>
              </div>
              <div class="col-span-3 flex items-start gap-2 border-t border-[var(--cairn-card-border)] pt-2.5">
                <CheckIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
                <span class="type-meta leading-relaxed">The name <code class="rounded bg-[var(--cairn-code-chip)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] type-meta">{asset.slug}</code> stays the same. Only the content hash changes, so every published entry is repointed to the new file in one commit.</span>
              </div>
            </div>
          {/if}

          <div>
            <div class="mb-2 flex items-baseline justify-between">
              <span class={headerLabel}>Published entries that will be repointed</span>
              <span class="type-meta tabular-nums text-muted">{replaceEntries.length}</span>
            </div>
            <div class="card-shell">
              <ul role="list" bind:this={replaceEntriesList} id="cairn-ml-replace-entries" class="flex max-h-56 list-none flex-col gap-1 overflow-y-auto p-2">
                {#each replaceVisibleEntries as entry, i (entry.concept + '/' + entry.id)}
                  <!-- The first row past the cap is a script-only focus target for "Show all" (tabindex
                       -1 keeps it out of the tab order). svelte-ignore: the rule allows a literal -1 but
                       does not see through the per-row conditional that selects which row carries it. -->
                  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                  <li class="flex items-start gap-2.5 rounded px-1.5 py-1.5" tabindex={i === REPLACE_ROW_CAP ? -1 : undefined}>
                    <FileTextIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
                    <span class="flex min-w-0 flex-col">
                      <span class="truncate type-meta font-medium">{entry.title}</span>
                      <span class="truncate type-label text-muted">{replaceWhereUsed(entry)}</span>
                    </span>
                  </li>
                {/each}
              </ul>
              {#if replaceHiddenCount > 0 && !replaceShowAll}
                <div class="border-t border-[var(--cairn-card-border)] p-1.5">
                  <button
                    type="button"
                    class="flex w-full items-center justify-center gap-1.5 rounded px-2 py-1 type-meta font-medium text-primary hover:bg-primary/[0.08]"
                    aria-expanded={replaceShowAll}
                    aria-controls="cairn-ml-replace-entries"
                    onclick={showAllReplaceEntries}
                  >
                    Show the other {replaceHiddenCount} {replaceHiddenCount === 1 ? 'entry' : 'entries'}
                  </button>
                </div>
              {/if}
            </div>
          </div>

          {#if replaceBranchCount > 0}
            <!-- The report-only branch delta: open cairn/* edits keep the old file until they publish.
                 Calm dashed base-200, never the danger register. -->
            <div class="rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-200/40 p-3">
              <div class="mb-1.5 flex items-center gap-2">
                <GitBranchIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" />
                <span class="type-meta font-semibold">Open edits still on the old file</span>
                <span class="type-meta tabular-nums text-muted">{replaceBranchCount}</span>
              </div>
              <p class="mb-2 type-meta leading-relaxed text-muted">These edits are on their own branches and are not touched. Each keeps the old file until it is published again.</p>
              <ul role="list" class="flex list-none flex-col gap-1 p-0">
                {#each replacePlan?.branchDelta ?? [] as delta (delta.branch)}
                  <li class="font-[family-name:var(--font-editor)] type-label cairn-text-warning">{delta.branch}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <span>The old file stays in git history. A developer can bring it back. The alt text on each placement is left exactly as it is.</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="type-body" for="cairn-ml-replace-confirm">Type <code class="rounded bg-[var(--cairn-code-chip)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] type-meta font-bold">{asset.slug}</code> to replace the file in all {replaceAffected} {replaceAffected === 1 ? 'entry' : 'entries'}.</label>
            <input id="cairn-ml-replace-confirm" data-cairn-replace-confirm class="input input-sm border-[var(--cairn-error-border)] font-[family-name:var(--font-editor)]" autocomplete="off" placeholder="Type the asset's address" bind:value={replaceConfirmInput} />
          </div>
        </div>

        <!-- A polite live region mirrors the footer impact for a screen reader on the review step. The
             role="status" matches the Push-alt live region: the stronger, more portable form. -->
        <div class="sr-only" role="status" aria-live="polite">
          Replace {asset.slug} in {replaceAffected} published {replaceAffected === 1 ? 'entry' : 'entries'}.{replaceBranchNote}
        </div>

        <form method="POST" action="?/mediaReplace" onsubmit={() => onapplied?.()} class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <CsrfField />
          <input type="hidden" name="oldHash" value={asset.hash} />
          <input type="hidden" name="newHash" value={replaceRecord?.hash ?? ''} />
          <input type="hidden" name="confirmSlug" value={replaceConfirmInput} />
          <input type="hidden" name="media" value={replaceRecord ? JSON.stringify([replaceRecord]) : '[]'} />
          <span class="mr-auto inline-flex items-center gap-1.5 type-meta text-muted">
            <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> One commit to main
          </span>
          <button type="button" class="btn btn-sm" onclick={closeReplaceDialog}>Cancel</button>
          <button type="submit" class="btn btn-sm btn-error" disabled={!replaceConfirmMatches}>
            <RefreshCwIcon class="h-4 w-4" aria-hidden="true" /> Replace in {replaceAffected} {replaceAffected === 1 ? 'entry' : 'entries'}
          </button>
        </form>
      {:else}
        <!-- The fail-closed surface: usage could not be fully verified, so the replace refuses rather
             than guess. NO apply button (not even disabled), and no typed gate. A quiet "Check usage
             again" re-runs the scan; the held upload stays ready. -->
        <div class="flex flex-col gap-3">
          <div role="status" class="flex flex-col gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3.5">
            <span class="inline-flex items-center gap-2 type-meta font-semibold text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Usage could not be fully verified
            </span>
            <p class="type-meta leading-relaxed">
              {#if replaceBlockedBranch}
                The published site read cleanly. One edit branch would not load, so cairn cannot tell whether it uses the image too. Replacing now could leave that branch pointing at the old file with no record of it.
              {:else}
                The published site could not be fully read, so cairn cannot tell every place this image is used. Replacing now could leave a reference pointing at the old file with no record of it.
              {/if}
            </p>
            {#if replaceBlockedBranch}
              <p class="inline-flex items-center gap-1.5 type-meta">
                <XIcon class="h-3.5 w-3.5 flex-none text-[var(--cairn-error-ink)]" aria-hidden="true" />
                Could not read <code class="font-[family-name:var(--font-editor)] type-meta">{replaceBlockedBranch}</code>
              </p>
            {:else}
              <p class="inline-flex items-center gap-1.5 type-meta">
                <XIcon class="h-3.5 w-3.5 flex-none text-[var(--cairn-error-ink)]" aria-hidden="true" />
                An edit branch would not load.
              </p>
            {/if}
            <button type="button" class="btn btn-sm self-start border-[var(--cairn-error-border)] text-[var(--cairn-error-ink)]" onclick={runReplacePreview}>
              <RefreshCwIcon class="h-4 w-4" aria-hidden="true" /> Check usage again
            </button>
          </div>
          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <span>Your uploaded file is held and ready. Once the scan completes, the review opens with the full impact.</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto type-meta text-muted">No file was changed.</span>
          <button type="button" class="btn btn-sm" onclick={closeReplaceDialog}>Cancel</button>
        </div>
      {/if}
    </div>
  {/if}
</dialog>
