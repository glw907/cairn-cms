// cairn-cms: the tidy flow's own state and action driver, out of EditPage.svelte.

import { untrack } from 'svelte';
import { postFormAction } from './client-action.js';
import { validateTidy, TIDY_REJECTION_MESSAGE } from './tidy-validate.js';
import type { Change } from './tidy-diff.js';
import type { EditorApi } from './MarkdownEditor.svelte';

// The client-side tidy deadline (spec 2.1): a slow call becomes a cancel/retry rather than a
// hung review. Set above the action's own 30s Worker deadline so the server's retryable fail lands
// first when the model is merely slow; this catches a stalled connection past that.
const TIDY_CLIENT_TIMEOUT_MS = 45_000;

/**
 * The host-supplied reads and identifiers `createTidyController` needs. Every value is a getter,
 * never a captured snapshot: `$state.raw` values (the editor grant) lose reactivity when passed by
 * value into a `.svelte.ts` module, and `data` itself is replaced on a same-route entry hop, so a
 * captured `tidy`/`conceptId`/`id` would go stale under the reused page component.
 */
export interface TidyControllerParams {
  /** The live `EditorApi` grant, null before mount and after an identity-guarded revocation. */
  getEditor: () => EditorApi | null;
  /**
   * The shell's current buffer body, for the selection fallback match and the review's captured
   *  original.
   */
  getBody: () => string;
  /** The entry-scoping key (`conceptId/id`); a change resets this controller's state. */
  getEntryKey: () => string;
  /** The entry's concept id, for the tidy action's URL. */
  getConceptId: () => string;
  /** The entry's id, for the tidy action's URL. */
  getId: () => string;
  /**
   * The site's tidy config for this entry (spec 2.5): whether tidy is on and which model runs.
   *  Undefined degrades to disabled, the same tolerance the shell's own read carried.
   */
  getTidy: () => { enabled: boolean; model: string } | undefined;
  /** The CSRF token reader from the admin layout context. */
  getCsrf: () => string | undefined;
}

/**
 * Owns the tidy request/review/undo flow (spec 2.1, 2.5): running tidy over the document or the
 * current selection, the working/no-op/message states the host's dialogs render, the open review's
 * data, and the session-level "Undo tidy" affordance. Every write reaches the buffer through
 * `EditorApi.tidy`/`undo`, read fresh off `getEditor()` at each call so a mid-flow revocation or
 * remount is never observed as a stale reference.
 */
export function createTidyController(params: TidyControllerParams) {
  let mode = $state(false);
  let busy = $state(false);
  let review = $state.raw<{ changes: Change[]; original: string; model: string } | null>(null);
  let message = $state<string | null>(null);
  let noop = $state(false);
  let applied = $state(false);
  let appliedBody = $state<string | null>(null);
  // The in-flight controller, for Cancel and the bounded client timeout.
  let controller: AbortController | null = null;

  // The entry-key-scoped reset: an entry hop reuses this component instance, so a pending or applied
  // tidy for the outgoing entry must not survive onto the incoming one. seededKey starts undefined so
  // the first effect run (the initial mount) only adopts the key, never resets against it; `getEntryKey`
  // is not safe to call eagerly at construction time since the host declares `entryKey` itself as a
  // reactive value read lazily by effects, not a plain value available before the host script finishes.
  let seededKey: string | undefined;
  $effect.pre(() => {
    const key = params.getEntryKey();
    if (seededKey === undefined) {
      seededKey = key;
      return;
    }
    if (key === seededKey) return;
    seededKey = key;
    untrack(() => {
      // RESET_BLOCK_START (src/tests/unit/edit-page-state-reset-coverage.test.ts parses this
      // span's assignment targets against the RESET_EXEMPT list below; every $state / $state.raw
      // name this module declares must appear in one list or the other). `controller` is a plain
      // `let`, not `$state` (see its own declaration above), so its abort/null here is outside
      // the gate's scope, not a name the enumeration test tracks.
      mode = false;
      busy = false;
      review = null;
      message = null;
      noop = false;
      applied = false;
      appliedBody = null;
      // RESET_BLOCK_END
      controller?.abort();
      controller = null;
    });
  });

  // No name is exempt here: every $state/$state.raw this module declares (mode, busy, review,
  // message, noop, applied, appliedBody) is reset above.
  // RESET_EXEMPT:

  // The applied-tidy dismissal: the Undo-tidy chip clears itself once the body diverges from the
  // snapshot Apply produced (any further edit).
  $effect(() => {
    const current = params.getBody();
    if (applied && appliedBody !== null && current !== appliedBody) {
      applied = false;
      appliedBody = null;
    }
  });

  /**
   * Run tidy (spec 2.1) over the whole document or the current selection. The action receives only
   *  the selected text plus a scope flag; the diff is computed against that text and the changes'
   *  ranges are offset back into the full document before they reach the apply seam. On success the
   *  result is validated as a proofread; a rejection shows the honest message and writes
   *  nothing; a clean result shows "Nothing to fix"; otherwise the review opens.
   */
  async function runTidy() {
    const tidy = params.getTidy();
    if (!tidy?.enabled || busy || mode) return;
    message = null;
    noop = false;
    applied = false;
    // Scope: a non-empty selection tidies that range; otherwise the whole body. The offset is where
    // the selected text begins in the full document, so the diff positions map back. The range seam
    // carries the exact selection offsets, so a passage that repeats earlier in the body still maps
    // the corrections onto the actually-selected occurrence. Fall back to the first textual match
    // only when no range is available (offset 0 keeps document-scope tidy unchanged).
    //
    // The `?? null` on the range read is load-bearing, not cosmetic: a bare
    // `getEditor()?.getSelectionRange()` yields `undefined` while no editor is live, a second absent
    // value the seam's declared `{ from, to } | null` contract does not carry. The truthiness check
    // below treats both alike; a later `=== null` reader would not, and would then reach
    // `range.from` on an undefined.
    const selected = params.getEditor()?.getSelection() ?? '';
    const range = params.getEditor()?.getSelectionRange() ?? null;
    const bodyNow = params.getBody();
    const useSelection = selected.length > 0;
    let offset = 0;
    if (range) {
      offset = range.from;
    } else if (useSelection) {
      offset = Math.max(bodyNow.indexOf(selected), 0);
    }
    const text = useSelection ? selected : bodyNow;

    busy = true;
    // Captured locally: the entry-hop reset (the effect above) nulls the module-level `controller`
    // on an entry hop, but this run must keep reading its OWN signal and must only clear the shared
    // flags in `finally` if it is still the current run (a reset already tore down a superseded one).
    const ac = new AbortController();
    controller = ac;
    // The bounded client timeout: a slow call becomes a cancel/retry rather than hanging the review.
    const timer = setTimeout(() => ac.abort(), TIDY_CLIENT_TIMEOUT_MS);
    try {
      const outcome = await postFormAction<{ corrected?: unknown; model?: unknown }>(
        `/admin/${params.getConceptId()}/${params.getId()}?/tidy`,
        {
          method: 'POST',
          redirect: 'manual',
          headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': params.getCsrf() ?? '' },
          body: JSON.stringify({ text, scope: useSelection ? 'selection' : 'document' }),
          signal: ac.signal,
        },
      );
      // Supersession guard, before any state write: an entry-hop reset can null the shared
      // `controller` while this call is still in flight (the reset's own abort() does not
      // guarantee the awaited fetch actually rejects; a stub or a race can still resolve it as a
      // success). Once superseded, this run must never write review/mode/noop/message for an
      // entry the host has already navigated away from, nor hand its offsets to the new editor.
      if (controller !== ac) return;
      if (!outcome.ok) {
        // An abort (Cancel or the client timeout) resolves through the round-trip helper's own
        // fail-closed catch with no way to tell it apart from a genuine network failure; read the
        // signal directly so Cancel stays silent instead of showing the generic retry message
        // below. A response that was actually received (outcome.ok) is processed on its own merits
        // below regardless of the flag, so a late-arriving success is never discarded.
        if (ac.signal.aborted) {
          message = null;
          return;
        }
        if (outcome.sessionExpired) {
          message = 'Your session expired. Sign in again to tidy.';
          return;
        }
        const failure = outcome.data as { error?: unknown } | undefined;
        message =
          typeof failure?.error === 'string' && failure.error !== 'csrf'
            ? failure.error
            : 'Tidy could not finish. Try again.';
        return;
      }
      const corrected = typeof outcome.data.corrected === 'string' ? outcome.data.corrected : '';
      const model = typeof outcome.data.model === 'string' ? outcome.data.model : tidy.model;
      if (corrected.length === 0 || corrected === text) {
        // A clean result: tidy found nothing to fix. Never open an empty review.
        noop = true;
        return;
      }
      // Validate the result as a proofread. A rejection writes nothing and shows the message.
      const validation = validateTidy(text, corrected);
      if (!validation.ok) {
        message = TIDY_REJECTION_MESSAGE;
        return;
      }
      if (validation.changes.length === 0) {
        noop = true;
        return;
      }
      // Offset the changes back into the full document (a selection tidy diffs the selected text).
      // The captured original handed to the review is the full body, so every line label and context
      // row is computed against the real document.
      const changes: Change[] = validation.changes.map((c) => ({
        ...c,
        from: c.from + offset,
        to: c.to + offset,
      }));
      review = { changes, original: bodyNow, model };
      mode = true;
      params.getEditor()?.tidy.enter(changes);
    } catch {
      // A throw anywhere in the round trip or the success processing above (a parse failure
      // unrelated to the network) must not escape as an unhandled rejection out of the untracked
      // onclick call; fold it into the same retryable message a fetch failure shows.
      message = 'Tidy could not finish. Try again.';
    } finally {
      clearTimeout(timer);
      // Supersession-safe: only clear the shared flags if this run is still the current one. An
      // entry-hop reset that already nulled `controller` (or started a new run) owns those flags now.
      if (controller === ac) {
        controller = null;
        busy = false;
      }
    }
  }

  /** Cancel an in-flight tidy: abort the request and clear the working state. The buffer is untouched. */
  function cancelTidy() {
    controller?.abort();
    busy = false;
    message = null;
  }

  /**
   * Close the review: clear tidy mode and the review data. On apply the "Undo tidy" affordance shows
   *  until the next edit; on cancel nothing changed.
   */
  function closeTidyReview(wasApplied: boolean) {
    mode = false;
    review = null;
    applied = wasApplied;
    // Record the body the apply produced, so the next edit (a different body) dismisses the Undo chip.
    appliedBody = wasApplied ? params.getBody() : null;
  }

  /**
   * Undo the whole applied tidy in one move (ordinary editor Undo of the one batched transaction).
   *  The chip names it so the author knows the whole tidy is one move back.
   */
  function undoTidy() {
    params.getEditor()?.undo();
    applied = false;
    appliedBody = null;
  }

  return {
    /** Whether a tidy review is open; the host derives `insertDisabled` from this. */
    get tidyMode() {
      return mode;
    },
    /** Whether a tidy request is in flight, for the Tidy control and the working dialog. */
    get tidyBusy() {
      return busy;
    },
    /** The open review's data, or null when no review is open. */
    get tidyReview() {
      return review;
    },
    /** The error message a refused or failed tidy surfaces, or null. */
    get tidyMessage() {
      return message;
    },
    /** Whether the last tidy found nothing to fix. */
    get tidyNoop() {
      return noop;
    },
    /** The session-level "Undo tidy" affordance flag. */
    get tidyApplied() {
      return applied;
    },
    /**
     * The tidy apply api off the live editor grant, for the review surface's `api` prop. Null
     *  until the editor mounts.
     */
    get tidyApi() {
      return params.getEditor()?.tidy ?? null;
    },
    runTidy,
    cancelTidy,
    closeTidyReview,
    undoTidy,
    /** Dismiss the no-op confirmation dialog. */
    dismissNoop() {
      noop = false;
    },
    /** Dismiss the tidy-refused/failed message dialog. */
    dismissMessage() {
      message = null;
    },
  };
}

/** The controller `createTidyController` returns. */
export type TidyController = ReturnType<typeof createTidyController>;
