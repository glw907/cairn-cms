import { describe, it, expect } from 'vitest';
import * as view from '@codemirror/view';
import * as state from '@codemirror/state';
import * as lint from '@codemirror/lint';
import { cairnSuggestionPopover } from '../../lib/components/editor-suggestion-popover.js';

// Regression guard for the focus-loss hole the a11y review caught: CodeMirror's tooltip reconciler reuses
// a mounted tooltip view only when the new Tooltip's `create` is reference-identical to the mounted one
// (@codemirror/view: `other.create == tip.create`). If the field built a fresh Tooltip on every recompute,
// an unrelated lint effect (a late/stale setDiagnostics) would rebuild the popover DOM and drop focus from
// a focused button. The field memoizes the target so the SAME Tooltip object (hence the same `create`) is
// provided while the caret diagnostic is unchanged. This asserts that stability at the public showTooltip
// facet, without a browser: an effect-bearing transaction that leaves the caret diagnostic alone must not
// swap the Tooltip object.
describe('suggestion popover tooltip stability', () => {
  const popoverTooltip = (s: state.EditorState) =>
    s.facet(view.showTooltip).find((tip) => tip !== null) ?? null;

  const withDiagnostic = () => {
    let s = state.EditorState.create({
      doc: 'teh cat',
      selection: { anchor: 1 }, // caret inside the [0, 3] diagnostic range
      extensions: [cairnSuggestionPopover({ view, state, lint }), lint.linter(() => [])],
    });
    s = s.update(
      lint.setDiagnostics(s, [
        { from: 0, to: 3, severity: 'info', message: '`teh` may be misspelled.', actions: [] },
      ]),
    ).state;
    return s;
  };

  it('provides a tooltip when the caret sits inside a diagnostic', () => {
    expect(popoverTooltip(withDiagnostic())).not.toBeNull();
  });

  it('keeps the same Tooltip object across an effect that leaves the caret diagnostic unchanged', () => {
    const s1 = withDiagnostic();
    const before = popoverTooltip(s1);
    // An effect-bearing transaction with no doc/selection change and the same diagnostic: the naive field
    // rebuilt the tooltip here (new `create`), dropping a focused button; the memoized field must not.
    const noop = state.StateEffect.define<null>();
    const s2 = s1.update({ effects: noop.of(null) }).state;
    expect(popoverTooltip(s2)).toBe(before);
  });

  it('builds a new tooltip when the caret leaves the diagnostic', () => {
    const s1 = withDiagnostic();
    const before = popoverTooltip(s1);
    const s2 = s1.update({ selection: { anchor: 6 } }).state; // caret now outside [0, 3]
    expect(popoverTooltip(s2)).not.toBe(before);
    expect(popoverTooltip(s2)).toBeNull();
  });
});
