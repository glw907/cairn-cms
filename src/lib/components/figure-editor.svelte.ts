// cairn-cms: the figure-at-caret editing surface's own state, out of EditPage.svelte (Task 12).

import { untrack } from 'svelte';
import { unwrapFigure, updateFigure, wrapImageInFigure, type FigureAtImage, type FigureRole } from './markdown-format.js';
import type { EditorApi } from './MarkdownEditor.svelte';

/**
 * The host-supplied reads `createFigureEditor` needs. Every value is a getter, never a captured
 * snapshot: `caretComponent`/`mediaAtCaret` are written by the shell from `MarkdownEditor`'s
 * `onComponentAtCaret`/`onMediaImageAtCaret` callbacks and stay shell-owned; the shell resets both
 * to null in its own entry-key `RESET_BLOCK` (rather than this module owning a reset for them),
 * since those callbacks fire only when the caret's reported identity changes from the last one
 * seen and an incoming entry whose caret lands off any component or image never fires either one.
 * The `EditorApi` grant is `$state.raw`, which loses reactivity when passed by value into a
 * `.svelte.ts` module.
 */
export interface FigureEditorParams {
  /** The live `EditorApi` grant, null before mount and after an identity-guarded revocation. */
  getEditor: () => EditorApi | null;
  /** The media image at the editor caret, or null off any media image. */
  getMediaAtCaret: () => FigureAtImage | null;
  /** The shell's current buffer body, for the decorative-alt read and the figure transforms. */
  getBody: () => string;
  /** Whether the insert controls are disabled (Preview, or a tidy review open). */
  getInsertDisabled: () => boolean;
  /** The entry-scoping key (`conceptId/id`); a change resets the open dialog's prefill. */
  getEntryKey: () => string;
}

/**
 * Owns the Figure control's availability, label, and open-dialog prefill (spec: figures), plus the
 * apply/unwrap transforms. Every write reaches the buffer through `EditorApi.replaceRange`/
 * `selectRange`, read fresh off `getEditor()` at each call so a mid-flow revocation or remount is
 * never observed as a stale reference. Never touches the host's `<dialog>` element: the host still
 * owns `figureDialog` (`showModal()`/`close()`), since a native ref cannot cross the getter seam;
 * this module only prepares and clears the prefill the dialog renders from.
 */
export function createFigureEditor(params: FigureEditorParams) {
  // The figure dialog's pre-fill, snapshotted when the control opens so the form never mixes a newer
  // caret with the values it opened on. Captured from mediaAtCaret at open time: edit mode with the
  // figure's caption/role when a figure wraps the image, else wrap mode with empty caption and the
  // measure default. decorative rides the snapshot too. Null while the dialog is closed.
  let prefill = $state<{
    mode: 'wrap' | 'edit';
    caption: string;
    role: FigureRole | null;
    decorative: boolean;
    image: { from: number; to: number };
    figureRange: { from: number; to: number } | null;
  } | null>(null);

  // The entry-key-scoped reset: an entry hop reuses this component instance, so a still-open figure
  // dialog's prefill for the outgoing entry must not survive onto the incoming one. seededKey starts
  // undefined so the first effect run (the initial mount) only adopts the key, never resets against it.
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
      prefill = null;
    });
  });

  // Whether the Figure control is available: a media image sits at the caret and Preview is not
  // showing (the insert controls disable together with the Write surface). The control is always
  // rendered (it never mounts on caret move); only its enabled state changes.
  const available = $derived(params.getMediaAtCaret() != null && !params.getInsertDisabled());
  // mediaAtCaret survives the tab switch the same way editable does (the Write pane stays mounted
  // under Preview), so when the caret already sits on an image and Preview is the reason the
  // control is unavailable, the fallback reason must say so rather than claim no image is there.
  const label = $derived.by(() => {
    const at = params.getMediaAtCaret();
    if (!at) return 'Place the cursor on an image to add a figure';
    if (!available) {
      return at.figure ? 'Switch to Write to edit this figure' : 'Switch to Write to wrap this image in a figure';
    }
    return at.figure ? 'Edit the figure at the cursor' : 'Wrap the image at the cursor in a figure';
  });
  // Whether the image at the caret is decorative (empty or whitespace-only alt). The token came from
  // a parsed image node, so the alt is the source between `![` and the closing `]` before `](`. An
  // empty alt is the needs-alt signal; the figure control surfaces it and the decorative-plus-caption
  // warning. Derived from the reported token so it tracks the caret.
  const decorative = $derived.by(() => {
    const at = params.getMediaAtCaret();
    if (!at) return false;
    const token = params.getBody().slice(at.imageFrom, at.imageTo);
    const match = /^!\[([\s\S]*?)\]\(/.exec(token);
    return (match?.[1] ?? '').trim() === '';
  });

  /**
   * Open the figure control over the media image at the caret. Inert unless a media image sits
   *  there and the Write surface is up, the same gate the toolbar control shows. The snapshot is the
   *  source of truth for the apply handlers, so a caret move while the dialog is open never
   *  re-targets it. The host shows the dialog after calling this.
   */
  function openFigure() {
    const at = params.getMediaAtCaret();
    if (!available || !at) return;
    prefill = {
      mode: at.figure ? 'edit' : 'wrap',
      caption: at.figure?.caption ?? '',
      role: at.figure?.role ?? null,
      decorative,
      image: { from: at.imageFrom, to: at.imageTo },
      figureRange: at.figure ? { from: at.figure.from, to: at.figure.to } : null,
    };
  }

  /**
   * Write a figure transform's result back to the editor: overwrite the whole doc through the
   *  replaceRange seam, then place the selection the transform chose (the seam alone drops the caret
   *  at the end). replaceRange dispatches the doc change and focuses the surface; selectRange then
   *  dispatches a selection-only transaction, which CodeMirror's history does not record as its own
   *  undoable event, so one undo reverts the whole figure write.
   */
  function writeFigureResult(result: { doc: string; from: number; to: number }) {
    params.getEditor()?.replaceRange(0, params.getBody().length, result.doc);
    params.getEditor()?.selectRange(result.from, result.to);
  }

  /**
   * Apply the control's choice through the replaceRange seam. Wrap a bare image or update an
   *  existing figure, off the snapshot the dialog opened on. The pure transform owns the source
   *  shape and keeps the media token byte-intact; the preview stays read-only. The host closes the
   *  dialog after calling this.
   */
  function applyFigure(choice: { caption: string; role: FigureRole | null }) {
    const pre = prefill;
    if (!pre) return;
    const body = params.getBody();
    const result =
      pre.mode === 'edit' && pre.figureRange
        ? updateFigure(body, pre.figureRange, choice.caption, choice.role)
        : wrapImageInFigure(body, pre.image.from, pre.image.to, choice.caption, choice.role);
    writeFigureResult(result);
  }

  /**
   * Unwrap the figure back to its bare image. Edit mode only (the snapshot carries the figure
   *  range). The bare image token is restored verbatim by the pure transform. The host closes the
   *  dialog after calling this.
   */
  function unwrapFigureAction() {
    const pre = prefill;
    if (!pre || !pre.figureRange) return;
    writeFigureResult(unwrapFigure(params.getBody(), pre.figureRange));
  }

  return {
    /** Whether the Figure control is available. */
    get figureAvailable() {
      return available;
    },
    /** The Figure control's accessible label and tooltip. */
    get figureLabel() {
      return label;
    },
    /** The open dialog's snapshot, or null while the dialog is closed. */
    get figurePrefill() {
      return prefill;
    },
    openFigure,
    applyFigure,
    unwrapFigureAction,
    /**
     * Clear the prefill; the host calls this from the dialog's native `close` event (the X, the
     *  backdrop, Escape, and the apply/unwrap path all fire it), so the host state matches the
     *  closed dialog.
     */
    closePrefill() {
      prefill = null;
    },
  };
}

/** The controller `createFigureEditor` returns. */
export type FigureEditor = ReturnType<typeof createFigureEditor>;
