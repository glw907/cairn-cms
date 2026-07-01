// src/tests/unit/codemirror-public-api.test.ts
import { describe, it, expect } from 'vitest';
import * as view from '@codemirror/view';
import * as lint from '@codemirror/lint';
import * as state from '@codemirror/state';

// The public CodeMirror surface the recipe popover binds to. A major that renames or drops one of these
// fails here deterministically, in-repo, rather than surfacing as a runtime break in the editor.
describe('CodeMirror public API the suggestion popover depends on', () => {
  it('exposes the tooltip facet and helpers we use', () => {
    expect(typeof view.showTooltip).toBe('object'); // a Facet
    expect(typeof view.getTooltip).toBe('function');
    expect(typeof view.keymap).toBe('object'); // a Facet
    expect(typeof view.ViewPlugin.fromClass).toBe('function');
    expect(typeof view.EditorView.theme).toBe('function');
  });
  it('exposes forEachDiagnostic and linter', () => {
    expect(typeof lint.forEachDiagnostic).toBe('function');
    expect(typeof lint.linter).toBe('function');
  });
  it('exposes StateField.define', () => {
    expect(typeof state.StateField.define).toBe('function');
  });
});

// The public CodeMirror surface the a11y hardening pass binds to. A major that renames or drops one
// of these fails here deterministically, in-repo, rather than surfacing as a runtime break in the
// diagnostics announcer, the F8/Shift-F8 traversal, or the .cm-content accessible name.
describe('CodeMirror public API the a11y hardening pass depends on', () => {
  it('exposes diagnostic traversal commands and forEachDiagnostic', () => {
    expect(typeof lint.nextDiagnostic).toBe('function');
    expect(typeof lint.previousDiagnostic).toBe('function');
    expect(typeof lint.forEachDiagnostic).toBe('function');
  });
  it('exposes the contentAttributes facet on EditorView', () => {
    expect(typeof view.EditorView.contentAttributes).toBe('object'); // a Facet
  });
});
