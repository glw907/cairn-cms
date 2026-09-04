<!--
@component
The Media Library's Push-alt review dialog (the rev.2 mockup Push-alt flow): a native modal
`<dialog>` (native focus trap + Escape), NO light dismiss. Alt fill is reversible and frequent
(never the alertdialog register) with no typed-slug gate; apply is always enabled. It relies on
the native `<dialog>` role and `aria-labelledby`, with no redundant role or `aria-modal` (the
Replace dialog's `role="alertdialog"` is the deliberate outlier). The review step lists three
buckets (will-fill always applied, customized behind one opt-in, decorative-skipped reported);
the blocked step is the fail-closed surface (no apply form) for when usage cannot be verified.

The host opens it through the exported `open(asset, origin)`, pinning the asset at that moment so
a background re-render never swaps it mid-review, and the click origin so focus restores there on
close. `close()` is exposed for a host-driven dismissal. `onapplied` fires just before the apply
form's full-page POST to `?/mediaAltPropagate` navigates away.
-->
<script lang="ts">
  import { getContext, tick } from 'svelte';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type { MediaAltPreviewPlan, MediaAltPropagateFailure } from '../sveltekit/content-routes-media.js';
  import type { AltPlacement } from '../content/media-rewrite.js';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import { resolveDialogOrigin, refocusDialogOrigin } from './dialog-origin.js';
  import { postFormAction, createRequestGuard } from './client-action.js';
  import CsrfField from './CsrfField.svelte';
  import {
    CheckIcon,
    TriangleAlertIcon,
    ImageOffIcon,
    XIcon,
    FileTextIcon,
    ClockIcon,
    RefreshCwIcon,
    GitBranchIcon,
    ArrowRightIcon,
    MegaphoneIcon,
  } from './admin-icons.js';

  interface Props {
    /** Called just before the apply form's full-page POST navigates away. */
    onapplied?: () => void;
  }

  let { onapplied }: Props = $props();

  // The CSRF token getter comes from the admin context, re-fetched independently of the host.
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

  // --- the Push-alt flow: a one-step review dialog (the everyday register) over the pinned asset ---
  // Alt propagation pushes the asset's default alt into published placements that lack it, with one
  // bucket-level opt-in to also overwrite placements that carry a custom alt. It is reversible and
  // frequent, so the dialog carries no alertdialog role and no typed-slug gate; apply is always
  // enabled. The preview fetch reuses the 2a transport (a text/plain body, the CSRF token in the
  // X-Cairn-CSRF header) and fails closed to a blocked surface when usage cannot be verified.
  type AltStep = 'review' | 'blocked';
  const ALT_PREVIEW_URL = '?/mediaAltPreview';

  let altDialog = $state<HTMLDialogElement | null>(null);
  // The entry-point button that opened the dialog, so focus restores to it on close.
  let altOrigin: HTMLElement | null = null;
  // The Cancel control, the initial focus on open.
  let altCancelButton = $state<HTMLButtonElement | null>(null);
  let altStep = $state<AltStep>('review');
  // The resolved preview plan (the review step) or the fail-closed failure (the blocked step).
  let altPlan = $state<MediaAltPreviewPlan | null>(null);
  let altFailure = $state<MediaAltPropagateFailure | null>(null);
  // The bucket-level opt-in to also overwrite customized alts. Bound to the one native checkbox.
  let altOverwrite = $state(false);
  // The asset the dialog acts on, pinned at open so a background re-render never swaps it. The alt it
  // pushes is this asset's default alt.
  let altAsset = $state<MediaLibraryEntry | null>(null);

  /** Open over the pinned asset, and the click origin to refocus on close. */
  export function open(asset: MediaLibraryEntry, origin?: HTMLElement | null) {
    altOrigin = resolveDialogOrigin(origin);
    altAsset = asset;
    altStep = 'review';
    altPlan = null;
    altFailure = null;
    altOverwrite = false;
    void tick().then(() => {
      altDialog?.showModal();
      altCancelButton?.focus();
    });
    void runAltPreview();
  }
  function closeAltDialog() {
    altDialog?.close();
    altAsset = null;
    altPlan = null;
    altFailure = null;
    altOverwrite = false;
    altOrigin = refocusDialogOrigin(altOrigin);
  }
  /** Close the dialog exactly as Cancel or Escape would. */
  export function close() {
    closeAltDialog();
  }

  // The per-call request guard for the alt preview, mirroring the Replace guard: a stale response
  // from a closed or reopened dialog (or a "Check usage again" double-click) is dropped after the await.
  const altPreviewGuard = createRequestGuard();

  // The preview fetch: POST the hash in the 2a transport, parse the ActionResult envelope, and route to
  // the review step (a plan) or the fail-closed blocked step (a failure). Re-runnable from the blocked
  // step's "Check usage again".
  async function runAltPreview() {
    if (!altAsset) return;
    const token = altPreviewGuard.next();
    const outcome = await postFormAction<MediaAltPreviewPlan>(ALT_PREVIEW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': csrf?.() ?? '' },
      body: JSON.stringify({ hash: altAsset.hash }),
    });
    // Stale-response guard: a reopen or a re-run superseded this fetch while it was in flight.
    if (altPreviewGuard.isStale(token)) return;
    if (outcome.ok) {
      altPlan = outcome.data;
      altFailure = null;
      altStep = 'review';
    } else {
      altFailure = (outcome.data as MediaAltPropagateFailure | undefined) ?? { error: '' };
      altPlan = null;
      altStep = 'blocked';
    }
  }

  // The default alt the dialog propagates: the pinned asset's stored alt. Empty is guarded by the
  // entry point (an asset with no default alt cannot push one), but the dialog reads it defensively.
  const altPushed = $derived(altAsset?.alt.trim() ?? '');

  // The three buckets, flattened from the plan's entries: each row carries its entry title, the
  // placement kind (the pill), and the placement's before/after. Grouping by bucket keeps each well
  // self-contained, the way the mockup lays them out.
  type AltRow = { title: string; kind: AltPlacement['kind']; before: string; after: string; key: string };
  function altRows(bucket: AltPlacement['bucket']): AltRow[] {
    const rows: AltRow[] = [];
    for (const entry of altPlan?.entries ?? []) {
      entry.placements.forEach((p, i) => {
        if (p.bucket !== bucket) return;
        rows.push({ title: entry.title, kind: p.kind, before: p.before, after: p.after, key: `${entry.concept}/${entry.id}/${i}` });
      });
    }
    return rows;
  }
  const altFillRows = $derived(altRows('will-fill'));
  const altCustomRows = $derived(altRows('customized'));
  const altSkipRows = $derived(altRows('decorative-skipped'));

  // The committed total: the will-fill placements always, plus the customized placements only on the
  // opt-in. The footer button and the live region read this; the count moves when the opt-in toggles.
  const altCounts = $derived(altPlan?.counts ?? { willFill: 0, customized: 0, decorativeSkipped: 0 });
  const altTotal = $derived(altCounts.willFill + (altOverwrite ? altCounts.customized : 0));

  // The will-fill bucket caps past this many rows; "Show all N" reveals the rest (aria-expanded +
  // aria-controls). The customized bucket lists in full (it is the consequential one).
  const ALT_ROW_CAP = 8;
  let altShowAll = $state(false);
  // The will-fill list element, so "Show all" can move focus to its first newly revealed row.
  let altFillList = $state<HTMLElement | null>(null);
  $effect(() => {
    void altPlan;
    altShowAll = false;
  });
  const altFillVisible = $derived(altShowAll ? altFillRows : altFillRows.slice(0, ALT_ROW_CAP));
  const altFillHidden = $derived(Math.max(0, altFillRows.length - ALT_ROW_CAP));
  // Reveal the capped will-fill rows, then move focus to the first newly revealed row (the rev.2
  // contract: the expander unmounts on the flag flip, so focus would otherwise fall to <body>).
  function showAllAltFill() {
    altShowAll = true;
    void tick().then(() => (altFillList?.children[ALT_ROW_CAP] as HTMLElement | undefined)?.focus());
  }
</script>

<!-- The Push-alt review dialog: a native modal <dialog> (native focus trap + Escape), NO light dismiss.
     Alt fill is reversible and frequent (never the alertdialog register) with NO typed-slug gate;
     apply is always enabled. It relies on the native <dialog> role and aria-labelledby, with no
     redundant role or aria-modal (the Replace dialog's role="alertdialog" is the deliberate outlier,
     stated explicitly because it changes the semantics). The review step lists three buckets
     (will-fill always applied, customized behind one opt-in, decorative-skipped reported); the blocked
     step is the fail-closed surface (no apply form). -->
<dialog
  bind:this={altDialog}
  data-testid="cairn-alt-dialog"
  class="modal"
  aria-labelledby="cairn-ml-alt-title"
  aria-describedby="cairn-ml-alt-sub"
  oncancel={closeAltDialog}
>
  {#if altAsset}
    {@const asset = altAsset}
    <div class="modal-box max-w-xl">
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-primary/10 text-primary" aria-hidden="true">
          <MegaphoneIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-alt-title" class="type-heading font-bold font-[family-name:var(--font-display)]">
            {#if altStep === 'blocked'}
              Push alt is on hold
            {:else}
              Fill alt on {altCounts.willFill} {altCounts.willFill === 1 ? 'placement' : 'placements'}
            {/if}
          </h2>
          <p id="cairn-ml-alt-sub" class="mt-1 type-meta leading-relaxed text-muted">
            {#if altStep === 'blocked'}
              cairn could not read every place this image is used, so it will not write alt where it cannot see. Nothing was changed.
            {:else}
              This writes the default alt for {asset.displayName} into the published placements that have none. One commit to main. Placements that already have their own alt stay as they are, unless you choose to overwrite them below.
            {/if}
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Cancel" onclick={closeAltDialog}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {#if altStep === 'review'}
        <div class="flex flex-col gap-group">
          <!-- The alt being pushed, shown once so the author confirms the text before applying. -->
          <div class="flex items-start gap-2.5 rounded-box border border-primary/25 bg-primary/[0.05] p-3 type-meta leading-relaxed">
            <MegaphoneIcon class="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
            <span>The alt being pushed: <strong class="font-semibold">{altPushed ? `“${altPushed}”` : '(no default alt set)'}</strong>. Edit it in the panel first if it is not right.</span>
          </div>

          <div class="flex flex-col gap-3">
            <!-- WILL FILL: every row's honest (no alt) -> default alt, always applied. -->
            {#if altFillRows.length > 0}
              <div class="overflow-hidden card-shell">
                <div class="flex items-center gap-2.5 p-3">
                  <span class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
                    <CheckIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="type-meta font-semibold">Will fill the gap</div>
                    <div class="mt-px type-label leading-snug text-muted">These placements have no alt today. The default alt is written in.</div>
                  </div>
                  <span class="flex-none type-meta font-bold tabular-nums text-primary">{altFillRows.length}</span>
                </div>
                <ul role="list" bind:this={altFillList} id="cairn-ml-alt-fill" class="flex max-h-44 list-none flex-col overflow-y-auto border-t border-[var(--cairn-card-border)] p-0">
                  {#each altFillVisible as row, i (row.key)}
                    <!-- The first row past the cap is the script-only focus target for "Show all"
                         (tabindex -1). svelte-ignore: as above, the conditional hides the literal -1. -->
                    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                    <li class="flex items-start gap-2.5 border-t border-[var(--cairn-card-border)]/70 px-3 py-2.5 first:border-t-0" tabindex={i === ALT_ROW_CAP ? -1 : undefined}>
                      <FileTextIcon class="mt-0.5 h-3.5 w-3.5 flex-none text-muted" aria-hidden="true" />
                      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div class="flex items-center gap-1.5">
                          <span class="truncate type-meta font-semibold">{row.title}</span>
                          <span class="flex-none rounded-full bg-base-content/[0.06] px-1.5 py-px type-chip font-semibold uppercase tracking-wide text-muted">{row.kind}</span>
                        </div>
                        <div class="flex flex-wrap items-baseline gap-1.5 type-meta leading-snug">
                          <span class="text-muted">(no alt)</span>
                          <ArrowRightIcon class="h-3 w-3 flex-none text-muted opacity-65" aria-hidden="true" />
                          <span class="font-medium text-primary">{row.after}</span>
                        </div>
                      </div>
                    </li>
                  {/each}
                </ul>
                {#if altFillHidden > 0 && !altShowAll}
                  <div class="border-t border-[var(--cairn-card-border)] p-1.5">
                    <button
                      type="button"
                      class="flex w-full items-center justify-center gap-1.5 rounded px-2 py-1 type-meta font-medium text-primary hover:bg-primary/[0.08]"
                      aria-expanded={altShowAll}
                      aria-controls="cairn-ml-alt-fill"
                      onclick={showAllAltFill}
                    >
                      Show the other {altFillHidden} {altFillHidden === 1 ? 'placement' : 'placements'}, all gaining the same alt
                    </button>
                  </div>
                {/if}
              </div>

              <!-- The body-vs-hero caveat, anchored beside will-fill where the surprised author looks. -->
              <div class="flex items-start gap-2 px-0.5 type-meta leading-relaxed">
                <TriangleAlertIcon class="mt-0.5 h-3.5 w-3.5 flex-none cairn-text-warning" aria-hidden="true" />
                <span>A body image has no place to record decorative, so an empty body image always reads as a gap to fill. Only a hero can be skipped as decorative.</span>
              </div>
            {/if}

            <!-- HAS CUSTOM ALT: one bucket-level opt-in (a real native checkbox). Before it is checked,
                 each row shows its existing alt plain and "kept"; checking flips to was -> default. -->
            {#if altCustomRows.length > 0}
              <div data-cairn-alt-custom class="overflow-hidden card-shell">
                <div class="flex items-center gap-2.5 p-3">
                  <span class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md bg-[var(--cairn-warning-ink)]/10 cairn-text-warning" aria-hidden="true">
                    <MegaphoneIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="type-meta font-semibold">Already has custom alt</div>
                    <div class="mt-px type-label leading-snug text-muted">
                      {altOverwrite ? 'You chose to overwrite these.' : 'Left alone by default. You can overwrite these too.'}
                    </div>
                  </div>
                  <span class="flex-none type-meta font-bold tabular-nums cairn-text-warning">{altCustomRows.length}</span>
                </div>
                <!-- The opt-in band, styled in the danger family: overwriting an editor's words is the
                     destructive choice. The checkbox is a REAL native input in the a11y tree. -->
                <div class="border-t border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3">
                  <label class="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      data-cairn-alt-optin
                      class="checkbox checkbox-sm mt-px border-[var(--cairn-error-border)] checked:border-[var(--cairn-error-ink)] checked:bg-[var(--cairn-error-ink)]"
                      aria-describedby="cairn-ml-alt-optin-hint"
                      bind:checked={altOverwrite}
                    />
                    <span class="type-meta leading-snug text-[var(--cairn-error-ink)]">
                      <span class="font-semibold">Also overwrite {altCustomRows.length === 1 ? 'this 1 placement' : `these ${altCustomRows.length} placements`} with the default alt.</span>
                      <span id="cairn-ml-alt-optin-hint" class="mt-0.5 block">Overwrites the alt these entries already have. Git keeps the old version.</span>
                    </span>
                  </label>
                </div>
                <ul role="list" class="flex max-h-44 list-none flex-col overflow-y-auto p-0">
                  {#each altCustomRows as row (row.key)}
                    <li class="flex items-start gap-2.5 border-t border-[var(--cairn-card-border)]/70 px-3 py-2.5 first:border-t-0">
                      <FileTextIcon class="mt-0.5 h-3.5 w-3.5 flex-none text-muted" aria-hidden="true" />
                      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div class="flex items-center gap-1.5">
                          <span class="truncate type-meta font-semibold">{row.title}</span>
                          <span class="flex-none rounded-full bg-base-content/[0.06] px-1.5 py-px type-chip font-semibold uppercase tracking-wide text-muted">{row.kind}</span>
                        </div>
                        <div class="flex flex-wrap items-baseline gap-1.5 type-meta leading-snug">
                          {#if altOverwrite}
                            <span data-cairn-alt-was class="text-base-content line-through decoration-[color-mix(in_oklab,currentColor_55%,transparent)]">{`“${row.before}”`}</span>
                            <ArrowRightIcon class="h-3 w-3 flex-none text-muted opacity-65" aria-hidden="true" />
                            <span class="font-medium text-primary">{altPushed}</span>
                          {:else}
                            <span class="text-base-content">{`“${row.before}”`}</span>
                            <span class="text-muted opacity-65" aria-hidden="true">&middot;</span>
                            <span class="text-muted">kept</span>
                          {/if}
                        </div>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}

            <!-- DECORATIVE HERO, SKIPPED: listed, muted, never an input. -->
            {#if altSkipRows.length > 0}
              <div data-cairn-alt-skip class="overflow-hidden card-shell opacity-90">
                <div class="flex items-center gap-2.5 p-3">
                  <span class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md bg-base-content/[0.07] text-muted" aria-hidden="true">
                    <ImageOffIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="type-meta font-semibold">Marked decorative, skipped</div>
                    <div class="mt-px type-label leading-snug text-muted">A hero set as decorative on purpose. It is left without alt.</div>
                  </div>
                  <span class="flex-none type-meta font-bold tabular-nums text-muted">{altSkipRows.length}</span>
                </div>
                <ul role="list" class="flex list-none flex-col border-t border-[var(--cairn-card-border)] p-0">
                  {#each altSkipRows as row (row.key)}
                    <li class="flex items-center gap-2.5 border-t border-[var(--cairn-card-border)]/70 px-3 py-2 type-meta text-muted first:border-t-0">
                      <span class="truncate">{row.title}</span>
                      <span class="flex-none rounded-full bg-base-content/[0.06] px-1.5 py-px type-chip font-semibold uppercase tracking-wide">{row.kind}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>

          {#if (altPlan?.branchDelta?.length ?? 0) > 0}
            <!-- The report-only branch delta: open cairn/* edits keep their own alt until they publish. -->
            <div class="rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-200/40 p-3">
              <div class="mb-1.5 flex items-center gap-2">
                <GitBranchIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" />
                <span class="type-meta font-semibold">Open edits not touched</span>
                <span class="type-meta tabular-nums text-muted">{altPlan?.branchDelta.length ?? 0}</span>
              </div>
              <p class="mb-2 type-meta leading-relaxed text-muted">These edits are on their own branches and are not changed. Each keeps its alt as the author has it there.</p>
              <ul role="list" class="flex list-none flex-col gap-1 p-0">
                {#each altPlan?.branchDelta ?? [] as delta (delta.branch)}
                  <li class="font-[family-name:var(--font-editor)] type-label cairn-text-warning">{delta.branch}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <span>Every version stays in git history, so any overwrite can be undone.</span>
          </div>
        </div>

        <!-- The polite live region announces the moving committed total when the opt-in toggles. -->
        <div class="sr-only" role="status" aria-live="polite">
          Now writing alt to {altTotal} {altTotal === 1 ? 'placement' : 'placements'}.{altOverwrite && altCounts.customized > 0 ? ` ${altCounts.willFill} filled, ${altCounts.customized} overwritten.` : ''}
        </div>

        <form method="POST" action="?/mediaAltPropagate" onsubmit={() => onapplied?.()} class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <CsrfField />
          <input type="hidden" name="hash" value={asset.hash} />
          <!-- The opt-in checkbox lives beside the customized rows (outside the form), so its bound
               state is mirrored here as the posted flag. The server reads form.get('overwrite') === 'on'. -->
          <input type="hidden" name="overwrite" value={altOverwrite ? 'on' : ''} />
          <span class="mr-auto inline-flex items-center gap-1.5 type-meta text-muted">
            <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> One commit to main
          </span>
          <button type="button" class="btn btn-sm" onclick={closeAltDialog}>Cancel</button>
          <button type="submit" class="btn btn-sm btn-primary">
            <CheckIcon class="h-4 w-4" aria-hidden="true" />
            {#if altOverwrite && altCounts.customized > 0}
              Update {altTotal} {altTotal === 1 ? 'placement' : 'placements'}
            {:else}
              Fill {altTotal} {altTotal === 1 ? 'placement' : 'placements'}
            {/if}
          </button>
        </form>
      {:else}
        <!-- The fail-closed surface: usage could not be fully verified, so the push refuses rather than
             guess. NO apply form. A quiet "Check usage again" re-runs the scan. The banner on open is
             role="status" (not alert): no action was attempted yet. MediaAltPropagateFailure carries
             only `error`, so the generic honest line stands in. -->
        <div class="flex flex-col gap-3">
          <div role="status" class="flex flex-col gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3.5">
            <span class="inline-flex items-center gap-2 type-meta font-semibold text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Usage could not be fully verified
            </span>
            <p class="type-meta leading-relaxed">
              cairn could not read every place this image is used, so it cannot tell which placements need alt. Writing now could miss a placement or write over one with no record of it.
            </p>
            <button type="button" class="btn btn-sm self-start border-[var(--cairn-error-border)] text-[var(--cairn-error-ink)]" onclick={runAltPreview}>
              <RefreshCwIcon class="h-4 w-4" aria-hidden="true" /> Check usage again
            </button>
          </div>
          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <span>Nothing was changed. Once the scan completes, the review opens with every placement.</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto type-meta text-muted">No alt was changed.</span>
          <button type="button" class="btn btn-sm" onclick={closeAltDialog}>Cancel</button>
        </div>
      {/if}
    </div>
  {/if}
</dialog>
