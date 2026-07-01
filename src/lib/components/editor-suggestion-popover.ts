// cairn-cms: the recipe suggestion popover. Renders cairn's own DOM through CodeMirror's public showTooltip
// facet for the diagnostic under the caret, instead of skinning @codemirror/lint's built-in tooltip. A pure
// StateField maps the caret onto the diagnostic (via the public forEachDiagnostic) and provides the Tooltip;
// the DOM is a generic renderer over Diagnostic.message + Diagnostic.actions, so it serves both the
// spellcheck and objective-error diagnostics. Alt-Enter moves focus into the popover, a native Escape
// listener returns it to the editor, and a polite live region announces availability, so the caret-in-range
// popover gains the keyboard and screen-reader path the built-in lint tooltip never had.
import type { Extension, EditorState } from '@codemirror/state';
import type { EditorView, Tooltip, ViewUpdate } from '@codemirror/view';
import type { Diagnostic } from '@codemirror/lint';

/** The already-loaded CodeMirror modules the editor hands in, so the popover never value-imports at module scope. */
export interface PopoverModules {
  view: typeof import('@codemirror/view');
  state: typeof import('@codemirror/state');
  lint: typeof import('@codemirror/lint');
}

/** The diagnostic under the caret with its live range, or null when the caret sits outside every diagnostic. */
export function diagnosticAtCaret(
  state: EditorState,
  forEachDiagnostic: typeof import('@codemirror/lint').forEachDiagnostic,
): { diagnostic: Diagnostic; from: number; to: number } | null {
  const head = state.selection.main.head;
  let hit: { diagnostic: Diagnostic; from: number; to: number } | null = null;
  forEachDiagnostic(state, (diagnostic, from, to) => {
    if (!hit && head >= from && head <= to) hit = { diagnostic, from, to };
  });
  return hit;
}

/**
 * Build the recipe popover DOM for one diagnostic. `role="group"` (non-modal, labeled): shown without
 * taking focus; Alt-Enter moves focus into these native buttons; Escape returns focus here.
 */
export function buildPopoverDom(view: EditorView, diagnostic: Diagnostic, from: number, to: number): HTMLElement {
  const dom = document.createElement('div');
  dom.className = 'cairn-cm-suggest';
  dom.setAttribute('role', 'group');
  dom.setAttribute('aria-label', diagnostic.message);

  const message = document.createElement('p');
  message.className = 'cairn-cm-suggest__msg';
  message.textContent = diagnostic.message;
  dom.appendChild(message);

  const actions = document.createElement('div');
  actions.className = 'cairn-cm-suggest__actions';
  for (const action of diagnostic.actions ?? []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm';
    button.textContent = action.name;
    button.addEventListener('click', () => {
      // CodeMirror's own actions take the diagnostic's live range; use the field's from/to so a suggestion
      // never overwrites the wrong span after an edit. Return focus to the editor after any action (add and
      // ignore close the popover, so the focused button would otherwise vanish and drop focus to <body>).
      action.apply(view, from, to);
      view.focus();
    });
    actions.appendChild(button);
  }
  dom.appendChild(actions);

  // Escape must be a NATIVE listener here, not a CodeMirror keymap: CM's keydown handler lives on
  // contentDOM, and this popover DOM is outside .cm-content, so a CM keymap would never see the Escape
  // pressed while focus is on a button.
  dom.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      view.focus();
    }
  });
  return dom;
}

/**
 * The suggestion-popover extension: a StateField that provides the caret diagnostic's Tooltip through the
 * public showTooltip facet, so cairn's recipe DOM replaces the built-in lint tooltip.
 */
export function cairnSuggestionPopover(modules: PopoverModules): Extension {
  const { showTooltip, keymap, getTooltip, ViewPlugin } = modules.view;
  const { StateField, StateEffect } = modules.state;
  const { forEachDiagnostic } = modules.lint;

  // The field value carries its Tooltip PLUS the target it renders, so an unchanged target can return the
  // SAME object across recomputes. CM's tooltip reconciler reuses a mounted tooltip view only when the new
  // Tooltip's `create` is reference-identical to the mounted one; a fresh object on every recompute would
  // let an unrelated lint effect (a late/stale setDiagnostics) rebuild the popover DOM and drop focus from
  // a focused button, the keyboard path this extension exists to add.
  interface PopoverTarget {
    tooltip: Tooltip;
    from: number;
    to: number;
    message: string;
  }

  // The field's full value: the rendered target (if any) plus which diagnostic, if any, Escape has
  // dismissed for the ambient (caret-in-range, focus-still-in-.cm-content) case. Keyed by the
  // diagnostic's own range, not a boolean, so the suppression clears the instant the caret lands on a
  // DIFFERENT diagnostic (or leaves every diagnostic) and never needs an explicit un-suppress.
  interface PopoverFieldValue {
    target: PopoverTarget | null;
    suppressedKey: string | null;
  }

  const dismissPopoverEffect = StateEffect.define<null>();

  function keyFor(hit: { from: number; to: number } | null): string | null {
    return hit ? `${hit.from}:${hit.to}` : null;
  }

  function targetFor(
    state: EditorState,
    prev: PopoverTarget | null,
    suppressedKey: string | null,
  ): PopoverTarget | null {
    const hit = diagnosticAtCaret(state, forEachDiagnostic);
    if (!hit) return null;
    if (keyFor(hit) === suppressedKey) return null; // Escape-dismissed for this exact diagnostic
    // Same caret diagnostic as before: return the prior target so its Tooltip (and its `create` closure)
    // stay reference-stable and CM keeps the mounted, focused DOM.
    if (prev && prev.from === hit.from && prev.to === hit.to && prev.message === hit.diagnostic.message) {
      return prev;
    }
    return {
      tooltip: {
        pos: hit.from,
        end: hit.to,
        above: true,
        create: (view) => ({ dom: buildPopoverDom(view, hit.diagnostic, hit.from, hit.to) }),
      },
      from: hit.from,
      to: hit.to,
      message: hit.diagnostic.message,
    };
  }

  const popoverField = StateField.define<PopoverFieldValue>({
    create: (state) => ({ target: targetFor(state, null, null), suppressedKey: null }),
    // Recompute on selection/doc changes AND on effect-bearing transactions: @codemirror/lint publishes
    // fresh diagnostics via a setDiagnostics EFFECT with no doc/selection change, so without `tr.effects`
    // the popover would go stale after add/ignore and miss first paint under a resting caret. A focus-loss
    // blur dispatches an empty update (no doc/selection/effects), so it returns the prior value unchanged.
    update: (value, tr) => {
      const currentKey = keyFor(diagnosticAtCaret(tr.state, forEachDiagnostic));
      // The suppression clears as soon as the caret's diagnostic changes, so the popover reappears on
      // the next relevant caret move without an explicit un-suppress step.
      let suppressedKey =
        value.suppressedKey !== null && value.suppressedKey !== currentKey ? null : value.suppressedKey;
      for (const effect of tr.effects) {
        if (effect.is(dismissPopoverEffect)) suppressedKey = currentKey;
      }
      if (!tr.docChanged && !tr.selection && !tr.effects.length) return { target: value.target, suppressedKey };
      return { target: targetFor(tr.state, value.target, suppressedKey), suppressedKey };
    },
    provide: (f) => showTooltip.from(f, (value) => value.target?.tooltip ?? null),
  });

  // Move focus into the popover shown for the caret's diagnostic. Returns false when none is shown, so the
  // binding is inert elsewhere. This is the ONLY focus move; caret-in-range never auto-focuses. Alt-Enter,
  // NOT Mod-. (Ctrl+. is the Details-panel shortcut and would double-fire).
  const focusPopover = (view: EditorView): boolean => {
    const target = view.state.field(popoverField, false)?.target;
    if (!target) return false;
    const button = getTooltip(view, target.tooltip)?.dom.querySelector<HTMLButtonElement>('button');
    if (!button) return false;
    button.focus();
    return true;
  };
  // The ambient dismiss: Escape with focus still in .cm-content (the popover shown for the caret's
  // diagnostic, never opened via Alt-Enter). The native Escape listener in buildPopoverDom handles the
  // focus-in-popover case, which this binding never sees (that keydown targets the popover's own DOM,
  // outside .cm-content, so CodeMirror's keymap facet does not fire for it). Runs only when a target is
  // currently shown, so Escape falls through to the default keymap's own handling (e.g. clearing a
  // selection) when there is nothing to dismiss. No Prec.high: this extension is mounted inside
  // spellcheckCompartment, already placed after the top-level completionKeymap in MarkdownEditor's
  // extensions array, so plain document order keeps Escape closing an open autocomplete popup first.
  const dismissPopover = (view: EditorView): boolean => {
    if (!view.state.field(popoverField, false)?.target) return false;
    view.dispatch({ effects: dismissPopoverEffect.of(null) });
    return true;
  };
  const popoverKeymap = keymap.of([
    { key: 'Alt-Enter', run: focusPopover },
    { key: 'Escape', run: dismissPopover },
  ]);

  // A single visually-hidden polite live region: when the caret enters a NEW diagnostic range, announce the
  // message and the key that opens the popover. Recompute on the same triggers as the field
  // (doc/selection/effects) so a diagnostic landing under a resting caret still announces.
  const liveRegion = ViewPlugin.fromClass(
    class {
      dom: HTMLElement;
      lastKey = '';
      constructor(view: EditorView) {
        this.dom = document.createElement('div');
        this.dom.className = 'cairn-cm-suggest-live';
        this.dom.setAttribute('aria-live', 'polite');
        this.dom.setAttribute('aria-atomic', 'true');
        this.dom.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);';
        view.dom.appendChild(this.dom);
        this.announce(view);
      }
      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet || update.transactions.some((tr) => tr.effects.length))
          this.announce(update.view);
      }
      announce(view: EditorView): void {
        const hit = diagnosticAtCaret(view.state, forEachDiagnostic);
        const key = hit ? `${hit.from}:${hit.to}` : '';
        if (key === this.lastKey) return;
        this.lastKey = key;
        if (!hit) return;
        // The message plus the key that opens the popover. No action count: the generic renderer cannot
        // tell a spelling suggestion from a management action, so a raw actions.length would announce the
        // "Add to dictionary" and "Ignore" buttons as suggestions.
        this.dom.textContent = `${hit.diagnostic.message} Press Alt+Enter to open suggestions.`;
      }
      destroy(): void {
        this.dom.remove();
      }
    },
  );

  return [popoverField, popoverKeymap, liveRegion];
}
