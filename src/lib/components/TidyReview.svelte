<!--
@component
The tidy review surface (spec 2.5, the approved rev.2 mockup). A native `<dialog>` opened with
`showModal()`, so the focus trap, Escape, and inert background come from the platform. It shows the
proposed copy-edit as a git-style diff, one hunk per change, ranked by safety: objective hunks
(spelling, doubled word, whitespace, punctuation) read quiet and come pre-kept; judgment hunks (a
declared normalization, or a grammar reword) carry the review-this treatment, default to undecided,
and are NEVER swept by Accept fixes until the author confirms each. That safety property is the spine.

The author's original stays in the editor buffer the whole time; the apply seam (registerTidy) shows
the proposed edits as decorations and writes nothing until Apply. Apply lands the kept hunks in ONE
batched transaction (one undoable step), so the whole tidy is one move back. Cancel and Reject all
leave the document byte-identical.

The category of each hunk is inferred LOCALLY from the diff shape and the enabled config, never a claim
the model made and never a count of the author's own usage. A normalization names ONLY the config
setting that authorized it; counting the author's own habit is the harmonize-to-author judgment cairn
must never make, so no such count exists.
-->
<script lang="ts">
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
  import EyeIcon from '@lucide/svelte/icons/eye';
  import type { Change } from './tidy-diff.js';
  import { lineLabel } from './tidy-diff.js';
  import {
    categorize,
    isObjective,
    buildBecause,
    categoryLabel,
    type TidyCategory,
  } from './tidy-categorize.js';
  import type { TidyConventions } from '../nav/site-config.js';

  interface Props {
    /** The validated change set (Task 13 output), the unit the surface accepts and rejects. */
    changes: Change[];
    /** The captured original the diff was computed against; the source of every line label and the
     *  before/after rows. Positions index this string. */
    original: string;
    /** The resolved tidy conventions, the ONLY data source for a normalization's because-line and the
     *  category inference. Never the buffer's usage. */
    conventions: TidyConventions;
    /** The model that produced the result, for the head pill (e.g. "claude-sonnet-4-6"). */
    model: string;
    /** The document's display title, for the head. */
    title: string;
    /** The apply seam from MarkdownEditor: the surface drives the in-buffer decorations and the batched
     *  apply through it. Typed with an inline `import(...)` so no static editor-module edge sits in this
     *  component (the editor-boundary test bars that edge by a textual scan). */
    api: import('./editor-tidy.js').TidyApi;
    /** Called when the review closes (apply or cancel), so the host clears tidy mode and re-enables the
     *  editor. `applied` is true when the author applied changes, false on cancel/reject-all. */
    onclose: (applied: boolean) => void;
    /** Called to scroll the editor underneath to a hunk's source line; the host drives the editor's
     *  selectRange seam. */
    onshow: (from: number, to: number) => void;
  }

  let { changes, original, conventions, model, title, api, onclose, onshow }: Props = $props();

  // One hunk per change, with its locally-inferred category, line label, diff rows, and because-line.
  // Computed once from the immutable inputs; the disposition lives in its own reactive array so the
  // rows do not recompute on every toggle.
  interface Hunk {
    index: number;
    category: TidyCategory;
    objective: boolean;
    line: number;
    contextBefore: string;
    contextAfter: string;
    delText: string;
    addText: string;
    delRun: { pre: string; mid: string; post: string };
    addRun: { pre: string; mid: string; post: string };
    because: ReturnType<typeof buildBecause>;
    label: string;
  }

  const hunks: Hunk[] = $derived(changes.map((c) => {
    const category = categorize(c, original, conventions);
    const objective = isObjective(category);
    const removed = original.slice(c.from, c.to);
    const added = c.replacement;
    // The line containing the change, and the one line of context above and below it (graft 4).
    const line = lineLabel(original, c.from);
    const lines = original.split('\n');
    const contextBefore = line >= 2 ? lines[line - 2] ?? '' : '';
    const contextAfter = line < lines.length ? lines[line] ?? '' : '';
    // The changed line, split around the changed run so the diff can underline/strike just the run.
    const lineStart = original.lastIndexOf('\n', c.from - 1) + 1;
    const nextNewline = original.indexOf('\n', c.from);
    const lineEnd = nextNewline === -1 ? original.length : nextNewline;
    const fullLine = original.slice(lineStart, lineEnd);
    const pre = original.slice(lineStart, c.from);
    const post = original.slice(c.to, lineEnd);
    const because =
      category.kind === 'normalization' ? buildBecause(category.convention, conventions) : null;
    return {
      index: c.index,
      category,
      objective,
      line,
      contextBefore,
      contextAfter,
      delText: fullLine,
      addText: pre + added + post,
      delRun: { pre, mid: removed, post },
      addRun: { pre, mid: added, post },
      because,
      label: categoryLabel(category),
    };
  }));

  // The per-hunk disposition. Objective hunks open pre-kept; judgment hunks open undecided. The defaults
  // come from the hunks (their safety rank); the author's per-hunk and bulk choices land in `overrides`,
  // and `dispositions` is the merged effective map keyed by the stable change index. Splitting the two
  // keeps the default reactive to the derived hunks without capturing only their initial value.
  type Disposition = 'kept' | 'rejected' | 'undecided';
  let overrides = $state<Record<number, Disposition>>({});

  // The disposition a hunk takes under a given override map: the author's choice if present, else the
  // safety-rank default (objective hunks pre-kept, judgment hunks undecided). One source for the default.
  function effectiveDisposition(h: Hunk, map: Record<number, Disposition>): Disposition {
    return map[h.index] ?? (h.objective ? 'kept' : 'undecided');
  }

  const dispositions = $derived<Record<number, Disposition>>(
    Object.fromEntries(hunks.map((h) => [h.index, effectiveDisposition(h, overrides)] as const)),
  );

  // The keyboard step-through cursor: the focused hunk's array position. j/k move; a/r act on it.
  let focusedPos = $state(0);

  // The two live regions (the MediaPicker discipline). The tally region (role=status) speaks only on a
  // bulk action; the action region (aria-live=polite) narrates the single per-hunk action and each
  // cursor move. A live region re-announces only when its text changes, so a deterministic message
  // (the same hunk, the same verb) would go silent on a repeat. Each writer appends an invisible
  // incrementing nonce so the region text always mutates and the screen reader always speaks it.
  let tallyMessage = $state('');
  let actionMessage = $state('');
  let announceNonce = 0;

  // An invisible suffix that flips on every call, so a repeated identical announcement still changes
  // the region text and re-fires the live region. It is a zero-width space, never voiced, so the heard
  // sentence is unchanged. Each region keeps its own parity through the shared counter.
  function nonce(): string {
    return announceNonce++ % 2 === 0 ? '' : '​';
  }

  const keptCount = $derived(hunks.filter((h) => dispositions[h.index] === 'kept').length);
  const reviewCount = $derived(hunks.filter((h) => dispositions[h.index] === 'undecided').length);
  const skipCount = $derived(hunks.filter((h) => dispositions[h.index] === 'rejected').length);

  let dialog = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    // Open the dialog once on mount; showModal supplies the focus trap and Escape.
    dialog?.showModal();
  });

  function setDisposition(index: number, next: Disposition) {
    overrides = { ...overrides, [index]: next };
  }

  // Narrate one hunk in the polite region. The verb says what just happened to it ("Kept", "Skipped",
  // or "Focused" as the cursor lands on it). The sentence carries the kind and the before/after text,
  // and for a normalization appends the config-named rationale (never a usage count). The trailing
  // nonce keeps a repeated identical action audible.
  function narrate(h: Hunk, verb: string) {
    const where = `Hunk ${hunks.indexOf(h) + 1} of ${hunks.length}`;
    const what = h.delRun.mid && h.addRun.mid ? `${h.delRun.mid.trim()} becomes ${h.addRun.mid.trim()}` : h.label;
    const why = h.because ? `, your ${h.because.label} setting is ${h.because.variant}` : '';
    actionMessage = `${where}. ${h.label}. ${what}${why}. ${verb}.${nonce()}`;
  }

  function acceptHunk(h: Hunk) {
    setDisposition(h.index, 'kept');
    narrate(h, 'Kept');
  }
  function rejectHunk(h: Hunk) {
    setDisposition(h.index, 'rejected');
    narrate(h, 'Skipped');
  }

  // Accept fixes (the bulk action): mark EVERY OBJECTIVE hunk kept and nothing else. A judgment hunk is
  // never touched here, so it stays undecided and is never swept. The tally region announces the result.
  function acceptFixes() {
    const next = { ...overrides };
    for (const h of hunks) if (h.objective) next[h.index] = 'kept';
    overrides = next;
    const n = hunks.filter((h) => h.objective).length;
    const stillReview = hunks.filter((h) => effectiveDisposition(h, next) === 'undecided').length;
    tallyMessage = `${n} fixes kept. ${stillReview} still to review.${nonce()}`;
  }

  // Reject all: mark every hunk rejected; no text is written. The tally region announces it.
  function rejectAll() {
    overrides = Object.fromEntries(hunks.map((h) => [h.index, 'rejected'] as const));
    tallyMessage = `All ${hunks.length} changes skipping.${nonce()}`;
  }

  // Apply: write the kept hunks in ONE batched transaction through the apply seam, then close. The
  // seam's acceptMany dispatches a single view.dispatch({ changes }), so the whole tidy is one undoable
  // step. ONLY the kept indexes are passed, so an undecided judgment hunk is never written.
  function apply() {
    const keptIndexes = hunks.filter((h) => dispositions[h.index] === 'kept').map((h) => h.index);
    api.acceptMany(keptIndexes);
    api.exit();
    dialog?.close();
    onclose(true);
  }

  // Cancel: write nothing, clear the decorations, leave the document byte-identical.
  function cancel() {
    api.exit();
    dialog?.close();
    onclose(false);
  }

  function showInText(h: Hunk) {
    const c = changes.find((ch) => ch.index === h.index);
    if (c) onshow(c.from, c.to);
  }

  // Move the step-through cursor and announce the hunk it lands on. A screen-reader user pressing j/k
  // hears the newly-focused hunk (kind plus before/after text, plus the because-line for a judgment
  // hunk), the same spec invariant the per-hunk action narration holds. Without this a move was silent.
  function moveFocus(next: number) {
    focusedPos = next;
    const h = hunks[focusedPos];
    if (h) narrate(h, 'Focused');
  }

  // Keyboard step-through on the hunk list (graft 3): j/k or n/p move; a/r accept/reject the focused
  // hunk; A accepts all objective; Escape cancels (the native dialog supplies Escape, handled below).
  function onListKeydown(e: KeyboardEvent) {
    const h = hunks[focusedPos];
    if (e.key === 'j' || e.key === 'n') {
      moveFocus(Math.min(focusedPos + 1, hunks.length - 1));
      e.preventDefault();
    } else if (e.key === 'k' || e.key === 'p') {
      moveFocus(Math.max(focusedPos - 1, 0));
      e.preventDefault();
    } else if (e.key === 'a' && !e.shiftKey) {
      if (h) acceptHunk(h);
      e.preventDefault();
    } else if (e.key === 'r' && !e.shiftKey) {
      if (h) rejectHunk(h);
      e.preventDefault();
    } else if (e.key === 'A' || (e.key === 'a' && e.shiftKey)) {
      acceptFixes();
      e.preventDefault();
    }
  }

  // The native dialog raises a cancel event on Escape; map it to the surface's cancel so the buffer is
  // left untouched and the host clears tidy mode.
  function onDialogCancel(e: Event) {
    e.preventDefault();
    cancel();
  }

  function actsLabel(h: Hunk): string {
    return h.objective ? 'Accept or reject this fix' : 'Accept or reject this change';
  }
</script>

<dialog
  bind:this={dialog}
  class="modal"
  aria-labelledby="cairn-tidy-title"
  oncancel={onDialogCancel}
  onkeydown={onListKeydown}
  data-testid="tidy-review"
>
  <div class="modal-box flex max-h-[85vh] w-[54rem] max-w-full flex-col overflow-hidden p-0">
    <!-- the review head -->
    <div class="flex items-center gap-3 border-b border-[var(--cairn-card-border)] px-4 py-3">
      <span class="flex size-9 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
        <SparklesIcon class="size-5" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1">
        <div id="cairn-tidy-title" class="text-lg font-bold leading-tight">Review tidy</div>
        <div class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span><b class="text-base-content">{hunks.length} {hunks.length === 1 ? 'change' : 'changes'}</b> to <b class="text-base-content">{title}</b></span>
          <span class="rounded-full border border-[var(--cairn-card-border)] px-2 py-0.5 text-[0.6875rem] font-semibold">{model}</span>
        </div>
      </div>
      <span class="hidden flex-none items-center gap-1.5 text-[0.6875rem] text-muted sm:inline-flex" aria-hidden="true">
        <kbd class="kbd kbd-xs">j</kbd><kbd class="kbd kbd-xs">k</kbd> move
        <kbd class="kbd kbd-xs">a</kbd><kbd class="kbd kbd-xs">r</kbd> accept / reject
      </span>
      <button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="Cancel review" onclick={cancel}>
        <XIcon class="size-4" aria-hidden="true" />
      </button>
    </div>

    <!-- the bulk bar: the live tally (role=status, bulk-only) + Accept fixes / Reject all -->
    <div class="flex items-center gap-3 border-b border-[var(--cairn-card-border)] bg-base-200 px-4 py-2.5">
      <span class="inline-flex flex-wrap items-center gap-2 text-sm text-muted" data-testid="tidy-tally">
        <span class="inline-flex items-center gap-1 font-semibold text-base-content">
          <CheckIcon class="size-3" aria-hidden="true" /><span class="tabular-nums">{keptCount}</span> kept
        </span>
        <span class="opacity-40" aria-hidden="true">&middot;</span>
        <span class="inline-flex items-center gap-1 font-semibold text-[var(--cairn-warning-ink)]">
          <TriangleAlertIcon class="size-3" aria-hidden="true" /><span class="tabular-nums">{reviewCount}</span> to review
        </span>
        <span class="opacity-40" aria-hidden="true">&middot;</span>
        <span class="inline-flex items-center gap-1 font-semibold text-muted">
          <XIcon class="size-3" aria-hidden="true" /><span class="tabular-nums">{skipCount}</span> skipping
        </span>
      </span>
      <span class="flex-1"></span>
      <button type="button" class="btn btn-sm btn-outline" onclick={acceptFixes}>
        <CheckIcon class="size-3" aria-hidden="true" />Accept fixes
      </button>
      <button type="button" class="btn btn-sm btn-outline" onclick={rejectAll}>
        <XIcon class="size-3" aria-hidden="true" />Reject all
      </button>
    </div>

    <!-- the hunk list: the scroll container -->
    <div class="flex flex-col gap-3 overflow-y-auto px-4 py-3.5">
      {#each hunks as h, i (h.index)}
        {@const decided = dispositions[h.index]}
        {@const isJudgment = !h.objective}
        {@const undecided = decided === 'undecided'}
        <div
          class="relative overflow-hidden rounded-xl border bg-base-100 {isJudgment && undecided
            ? 'border-[color-mix(in_oklab,var(--cairn-warning-ink)_30%,var(--cairn-card-border))] shadow-[inset_3px_0_0_0_color-mix(in_oklab,var(--cairn-warning-ink)_55%,transparent)]'
            : 'border-[var(--cairn-card-border)]'} {decided === 'rejected' ? 'opacity-70' : ''} {i ===
          focusedPos
            ? 'outline outline-2 outline-offset-1 outline-[var(--color-primary)]'
            : ''}"
          data-testid="tidy-hunk"
          data-objective={h.objective}
          data-disposition={decided}
        >
          <!-- the hunk head -->
          <div
            class="flex items-center gap-2 border-b border-[var(--cairn-card-border)] px-3 py-2 {isJudgment
              ? 'bg-[color-mix(in_oklab,var(--cairn-warning-ink)_7%,transparent)]'
              : 'bg-[color-mix(in_oklab,var(--color-base-content)_1.5%,transparent)]'}"
          >
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold {isJudgment
                ? 'bg-[color-mix(in_oklab,var(--cairn-warning-ink)_11%,transparent)] text-[var(--cairn-warning-ink)]'
                : 'bg-[color-mix(in_oklab,var(--color-base-content)_6%,transparent)] text-muted'}"
            >
              {h.label}
            </span>
            {#if isJudgment}
              <span class="inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--cairn-warning-ink)]">
                <EyeIcon class="size-3" aria-hidden="true" />Review this
              </span>
            {/if}
            <button
              type="button"
              class="inline-flex min-h-6 items-center gap-1 rounded px-1.5 py-1.5 font-mono text-[0.6875rem] text-muted underline decoration-[color-mix(in_oklab,currentColor_35%,transparent)] underline-offset-2 hover:bg-primary/[0.08] hover:text-primary"
              title="Show this line in the editor"
              onclick={() => showInText(h)}
            >
              <EyeIcon class="size-3" aria-hidden="true" />line {h.line}
            </button>
            <span class="flex-1"></span>
            <span class="inline-flex flex-none items-center overflow-hidden rounded-md border border-[var(--cairn-card-border)]" role="group" aria-label={actsLabel(h)}>
              <button
                type="button"
                class="inline-flex min-h-6 items-center gap-1 px-2.5 py-1.5 text-[0.6875rem] font-medium {decided ===
                'kept'
                  ? 'bg-base-content/[0.07] text-base-content font-semibold'
                  : 'text-muted'}"
                aria-pressed={decided === 'kept'}
                onclick={() => acceptHunk(h)}
              >
                <CheckIcon class="size-3" aria-hidden="true" />Accept
              </button>
              <button
                type="button"
                class="inline-flex min-h-6 items-center gap-1 border-l border-[var(--cairn-card-border)] px-2.5 py-1.5 text-[0.6875rem] font-medium {decided ===
                'rejected'
                  ? 'bg-base-content/[0.07] text-base-content font-semibold'
                  : 'text-muted'}"
                aria-pressed={decided === 'rejected'}
                onclick={() => rejectHunk(h)}
              >
                <XIcon class="size-3" aria-hidden="true" />Reject
              </button>
            </span>
          </div>

          <!-- the unified diff body: context, deletion, insertion, optional because-line -->
          <div class="font-mono text-[0.8125rem] leading-relaxed">
            {#if h.contextBefore}
              <div class="flex items-baseline">
                <span class="w-6 flex-none select-none text-center text-muted opacity-60" aria-hidden="true">&nbsp;</span>
                <span class="flex-1 whitespace-pre-wrap break-words px-1 py-0.5 text-muted">{h.contextBefore}</span>
              </div>
            {/if}
            <div class="flex items-baseline bg-[var(--cairn-tidy-del-row)]">
              <span class="w-6 flex-none select-none text-center font-semibold text-muted" aria-hidden="true">&minus;</span>
              <span class="flex-1 whitespace-pre-wrap break-words px-1 py-0.5">{h.delRun.pre}<span
                  class="rounded-sm bg-[var(--cairn-tidy-del-run)] px-px text-muted line-through decoration-1"
                  data-testid="tidy-del"
                >{h.delRun.mid}</span>{h.delRun.post}</span>
            </div>
            <div class="flex items-baseline bg-[var(--cairn-tidy-add-row)] {decided === 'rejected' ? 'opacity-70' : ''}">
              <span class="w-6 flex-none select-none text-center font-semibold text-base-content" aria-hidden="true">+</span>
              <span class="flex-1 whitespace-pre-wrap break-words px-1 py-0.5">{h.addRun.pre}<span
                  class="rounded-sm bg-[var(--cairn-tidy-add-run)] px-px font-semibold text-base-content {decided ===
                  'rejected'
                    ? 'line-through opacity-70'
                    : ''}"
                  data-testid="tidy-add"
                >{h.addRun.mid}</span>{h.addRun.post}</span>
            </div>
            {#if h.contextAfter}
              <div class="flex items-baseline">
                <span class="w-6 flex-none select-none text-center text-muted opacity-60" aria-hidden="true">&nbsp;</span>
                <span class="flex-1 whitespace-pre-wrap break-words px-1 py-0.5 text-muted">{h.contextAfter}</span>
              </div>
            {/if}
          </div>

          {#if h.because}
            <!-- the mandatory because-line: names ONLY the config setting that authorized this hunk -->
            <div
              class="flex items-start gap-2 border-t border-dashed border-[var(--cairn-card-border)] bg-[color-mix(in_oklab,var(--cairn-warning-ink)_5%,transparent)] px-3 py-2 text-xs leading-snug text-subtle"
              data-testid="tidy-because"
            >
              <LightbulbIcon class="mt-px size-3 flex-none text-[var(--cairn-warning-ink)]" aria-hidden="true" />
              <span>Your <b class="text-base-content">{h.because.label} setting</b> is <b class="text-base-content">{h.because.variant}</b>, so {h.because.effect}.</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- the review footer: the commit note + Cancel + the one-transaction Apply -->
    <div class="flex items-center gap-2.5 border-t border-[var(--cairn-card-border)] px-4 py-3.5">
      <span class="flex flex-1 items-center gap-1.5 text-[0.6875rem] leading-snug text-muted">
        <CheckIcon class="size-3 flex-none text-muted" aria-hidden="true" />
        Applies to the editor only. Your next Save commits it like any edit, and Undo takes the whole tidy back.
      </span>
      <button type="button" class="btn btn-sm" onclick={cancel}>Cancel</button>
      <button type="button" class="btn btn-sm btn-primary" onclick={apply} disabled={keptCount === 0}>
        <CheckIcon class="size-3.5" aria-hidden="true" />Apply {keptCount} {keptCount === 1 ? 'change' : 'changes'}
      </button>
    </div>

    <!-- the two live regions (the MediaPicker discipline), both visually hidden. The tally (role=status)
         speaks only on a bulk action; the polite region narrates the single last per-hunk action. -->
    <span class="sr-only" role="status" data-testid="tidy-tally-live">{tallyMessage}</span>
    <span class="sr-only" aria-live="polite" data-testid="tidy-action-live">{actionMessage}</span>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button type="button" tabindex="-1" aria-label="Close" onclick={cancel}>close</button>
  </form>
</dialog>
