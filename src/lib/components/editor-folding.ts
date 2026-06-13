// Container folding: CodeMirror's fold system driven by cairn's directive grammar, with the rail
// band as the affordance. Client-only like editor-highlight and editor-modes; MarkdownEditor
// reaches this module through a dynamic import, so the static @codemirror imports here never enter
// a server bundle (guarded by the editor-boundary test).
//
// The architecture (plan decision 4): @codemirror/language's codeFolding plus foldEffect/
// unfoldEffect, never a custom fold store. Fold ranges come only from containerRanges, the pure
// pairing helper beside fenceScan. The safety invariant lives in one transactionExtender that
// appends unfold effects when a change or selection touches a folded range. The chevrons are
// widget decorations from this module's own ViewPlugin (the rails are box-shadows, there is no CM
// gutter element to hang a foldGutter on).
//
// The safety invariant: an author never edits, deletes, or fails to see hidden text.
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { EditorState, Prec, RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state';
import { codeFolding, foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language';
import { caretContainerRange, containerRanges, fenceScan, type ContainerRange } from './markdown-directives.js';

// Deeper nesting shares the third visual step, matching the rail stepping in editor-highlight.
const DEPTH_STEPS = 3;
// The chevron sits over the container's own innermost bar: depth 1 at x0, depth 2 at x8, depth 3
// at x16, so indentation telegraphs the nesting and depth 3 never collides with depth 2.
const chevronX = (depth: number) => (Math.min(depth, DEPTH_STEPS) - 1) * 8;

// The two chevron glyphs from the gold-standard mockup: down (caret inside) and right (folded).
const CHEVRON_DOWN = 'm6 9 6 6 6-6';
const CHEVRON_RIGHT = 'm9 6 6 6-6 6';

function chevronSvg(direction: 'down' | 'right'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', direction === 'down' ? CHEVRON_DOWN : CHEVRON_RIGHT);
  svg.appendChild(path);
  return svg;
}

// The opener-row band: the whole 28px gutter is the click target (cursor pointer over the band
// only, the opener text never folds), and the chevron lives inside it at the container's bar x.
// The widget knows its own container and whether it is folded, so the click toggles the right
// range; the depth class lets the theme step the chevron ink.
class FoldBandWidget extends WidgetType {
  constructor(
    readonly range: ContainerRange,
    readonly folded: boolean,
    readonly caretInside: boolean,
  ) {
    super();
  }
  eq(other: FoldBandWidget) {
    return (
      other.range.fromLine === this.range.fromLine &&
      other.range.toLine === this.range.toLine &&
      other.range.depth === this.range.depth &&
      other.folded === this.folded &&
      other.caretInside === this.caretInside
    );
  }
  toDOM(view: EditorView): HTMLElement {
    const band = document.createElement('span');
    const depth = Math.min(this.range.depth, DEPTH_STEPS);
    // Folded rows always show the chevron (right); an open container shows it down while the caret
    // is inside; otherwise it fades in on rail-band hover (the band's own :hover, in the theme).
    // The depth class carries the stepped ink.
    const state = this.folded ? ' cm-cairn-fold-folded' : this.caretInside ? ' cm-cairn-fold-active' : '';
    band.className = `cm-cairn-fold-band cm-cairn-fold-depth-${depth}${state}`;
    const chevron = chevronSvg(this.folded ? 'right' : 'down');
    chevron.style.left = `${chevronX(this.range.depth)}px`;
    band.appendChild(chevron);
    band.addEventListener('mousedown', (e) => {
      // mousedown, not click: a click would first move the caret into the line. preventDefault
      // keeps the caret where it is and stops the band from stealing focus from the editor.
      e.preventDefault();
      e.stopPropagation();
      toggleFold(view, this.range);
    });
    return band;
  }
  ignoreEvent() {
    return false;
  }
}

// The pill placeholder: a real focusable button counting the hidden lines, the screen-reader story
// for a fold. preparePlaceholder computes the count off the folded char range so placeholderDOM
// renders it without re-deriving. Clicking unfolds through CodeMirror's own onclick handler.
function preparePlaceholder(state: EditorState, range: { from: number; to: number }): number {
  return state.doc.lineAt(range.to).number - state.doc.lineAt(range.from).number;
}

function placeholderDOM(view: EditorView, onclick: (event: Event) => void, lines: number): HTMLElement {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'cm-cairn-fold-pill';
  pill.textContent = `${lines} lines`;
  pill.setAttribute('aria-label', `Show ${lines} hidden lines`);
  pill.addEventListener('click', onclick);
  return pill;
}

// Fold one container end-of-opener-line to end-of-closer-line (the bare closer never dangles), or
// unfold it if already folded. The range comes from containerRanges, so a half-typed fence can
// never fold. A no-op when the opener and closer share a line (nothing to hide).
function toggleFold(view: EditorView, range: ContainerRange): void {
  const opener = view.state.doc.line(range.fromLine + 1);
  const closer = view.state.doc.line(range.toLine + 1);
  if (closer.to <= opener.to) return;
  const from = opener.to;
  const to = closer.to;
  const already = foldExists(view.state, from, to);
  view.dispatch({ effects: (already ? unfoldEffect : foldEffect).of({ from, to }) });
}

function foldExists(state: EditorState, from: number, to: number): boolean {
  let found = false;
  foldedRanges(state).between(from, from, (a, b) => {
    if (a === from && b === to) found = true;
  });
  return found;
}

// The innermost container at the caret, the unit the keymap folds and unfolds. caretContainerRange
// returns the nearest enclosing container, but a container that never closes (an unbalanced
// opener) must not fold, so the result is only honored when containerRanges actually pairs it.
function caretFoldRange(view: EditorView): ContainerRange | null {
  const scan = fenceScan(docLines(view));
  const caretLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const inner = caretContainerRange(scan, caretLine);
  if (!inner) return null;
  return (
    containerRanges(scan).find((r) => r.fromLine === inner.fromLine && r.toLine === inner.toLine) ?? null
  );
}

function docLines(view: EditorView): string[] {
  const doc = view.state.doc;
  const lines: string[] = [];
  for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
  return lines;
}

// The keymap: Ctrl+Shift+[ folds, Ctrl+Shift+] unfolds, the innermost container at the caret. No
// fold-all, no chords. (CodeMirror's own foldKeymap binds the same keys to its tree-folding
// commands; this module replaces them with the container-aware versions and never adds foldKeymap.)
// At Prec.high so it resolves the shifted bracket ahead of the default keymap's Ctrl-[ indentLess,
// which the same keystroke also matches on the non-shift lookup.
const foldKeymap = Prec.high(
  keymap.of([
  {
    key: 'Mod-Shift-[',
    run: (view) => {
      const range = caretFoldRange(view);
      if (!range) return false;
      const opener = view.state.doc.line(range.fromLine + 1);
      const closer = view.state.doc.line(range.toLine + 1);
      if (closer.to <= opener.to || foldExists(view.state, opener.to, closer.to)) return false;
      view.dispatch({ effects: foldEffect.of({ from: opener.to, to: closer.to }) });
      return true;
    },
  },
  {
    key: 'Mod-Shift-]',
    run: (view) => {
      const range = caretFoldRange(view);
      if (!range) return false;
      const opener = view.state.doc.line(range.fromLine + 1);
      const closer = view.state.doc.line(range.toLine + 1);
      if (!foldExists(view.state, opener.to, closer.to)) return false;
      view.dispatch({ effects: unfoldEffect.of({ from: opener.to, to: closer.to }) });
      return true;
    },
  },
  ]),
);

// The unfold flash: a one-time low-alpha accent line decoration on the revealed lines, faded out
// over ~400ms. A StateEffect carries the revealed char range; the field decorates those lines
// until a follow-up effect clears it. Driven by the plugin, which schedules the clear.
const flashEffect = StateEffect.define<{ from: number; to: number } | null>();
const flashLine = Decoration.line({ class: 'cm-cairn-fold-flash' });

const flashField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(flashEffect)) {
        if (!e.value) {
          deco = Decoration.none;
        } else {
          const builder = new RangeSetBuilder<Decoration>();
          const first = tr.state.doc.lineAt(e.value.from).number;
          const last = tr.state.doc.lineAt(e.value.to).number;
          for (let n = first; n <= last; n++) {
            const line = tr.state.doc.line(n);
            builder.add(line.from, line.from, flashLine);
          }
          deco = builder.finish();
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const FLASH_MS = 400;

// The safety invariant, in one transactionExtender. CodeMirror's own fold field already clears a
// fold the selection head sits inside and a fold a delete touches; this covers the rest: an insert
// touching a fold boundary, a paste across it, an undo/redo landing inside, and a selection range
// (not just its head) extending into hidden text. It reads the start state's folds, maps them
// forward, and appends an unfold effect for any the change or new selection touches. A replace
// inside a fold leaves it open afterward, which falls out of the same rule.
function safetyExtender(): Extension {
  return EditorState.transactionExtender.of((tr) => {
    if (!tr.docChanged && !tr.selection) return null;
    const startFolds = foldedRanges(tr.startState);
    if (startFolds.size === 0) return null;
    const effects: StateEffect<unknown>[] = [];
    startFolds.between(0, tr.startState.doc.length, (from, to) => {
      // The fold's position after the change, for the selection test.
      const mappedFrom = tr.changes.mapPos(from, 1);
      const mappedTo = tr.changes.mapPos(to, -1);
      let touched = false;
      if (tr.docChanged) {
        tr.changes.iterChangedRanges((fromA, toA) => {
          if (fromA <= to && toA >= from) touched = true;
        });
      }
      if (!touched && tr.selection) {
        for (const range of tr.selection.ranges) {
          if (range.from < mappedTo && range.to > mappedFrom) touched = true;
        }
      }
      if (touched) effects.push(unfoldEffect.of({ from, to }));
    });
    return effects.length ? { effects } : null;
  });
}

// The chevron-and-wash plugin: a widget on each opener row of a paired container (the band with
// the chevron) and the folded-row wash line decoration. Rebuilds on doc change (the container set
// moves), selection change (the caret-inside chevron state), viewport change, and any fold change
// (a fold flips a chevron and adds a wash). The hover reveal is the band's own CSS :hover in the
// theme, so it costs no rebuild.
function foldDecorations(view: EditorView, scan: ReturnType<typeof fenceScan>, ranges: ContainerRange[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const caretLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const inner = caretContainerRange(scan, caretLine);
  // One opener row may host several enclosing containers' bars, but only its OWN container opens
  // there, so a single band per opener row. Sort by opener line so the builder receives ascending
  // positions; equal openers cannot happen (one open per line).
  const byOpener = [...ranges].sort((a, b) => a.fromLine - b.fromLine);
  for (const range of byOpener) {
    const opener = view.state.doc.line(range.fromLine + 1);
    const closer = view.state.doc.line(range.toLine + 1);
    if (closer.to <= opener.to) continue;
    const folded = foldExists(view.state, opener.to, closer.to);
    // The folded opener row carries the wash; a line decoration so the rails (box-shadows on the
    // same element) run through it unbroken.
    if (folded) builder.add(opener.from, opener.from, washLine);
    const caretInside = !!inner && inner.fromLine === range.fromLine && inner.toLine === range.toLine;
    builder.add(
      opener.from,
      opener.from,
      Decoration.widget({ widget: new FoldBandWidget(range, folded, caretInside), side: -1 }),
    );
  }
  return builder.finish();
}

const washLine = Decoration.line({ class: 'cm-cairn-folded-row' });

function foldPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      scan: ReturnType<typeof fenceScan>;
      ranges: ContainerRange[];
      constructor(view: EditorView) {
        this.scan = fenceScan(docLines(view));
        this.ranges = containerRanges(this.scan);
        this.decorations = foldDecorations(view, this.scan, this.ranges);
      }
      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.scan = fenceScan(docLines(update.view));
          this.ranges = containerRanges(this.scan);
        }
        const foldChanged = update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(foldEffect) || e.is(unfoldEffect)),
        );
        if (update.docChanged || update.viewportChanged || update.selectionSet || foldChanged) {
          this.decorations = foldDecorations(update.view, this.scan, this.ranges);
        }
        // Flash the revealed lines on an unfold, then schedule the clear. Folding adds no flash.
        for (const tr of update.transactions) {
          for (const e of tr.effects) {
            if (e.is(unfoldEffect)) {
              const { from, to } = e.value;
              const view = update.view;
              queueMicrotask(() => {
                if (!view.dom.isConnected) return;
                view.dispatch({ effects: flashEffect.of({ from, to }) });
                setTimeout(() => {
                  if (view.dom.isConnected) view.dispatch({ effects: flashEffect.of(null) });
                }, FLASH_MS);
              });
            }
          }
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}

// The design notes' diagnostics rules (a deliberately refolded erroring container keeps its fold
// and tints the pill warning ink instead of re-springing on every lint) have no trigger today: the
// editor carries no lint source, so there is nothing to refold around or to tint. Deliberately not
// built; do not invent a lint system to satisfy a rule with no input.

/**
 * The cairn fold extension: the CodeMirror fold system with the pill placeholder, the chevron and
 * wash affordance, the safety invariant, and the Ctrl+Shift+[ / ] keymap. Session-local and never
 * persisted: the fold state lives in CodeMirror's foldState field, which this never serializes.
 */
export function cairnFolding(): Extension {
  return [
    codeFolding({ preparePlaceholder, placeholderDOM }),
    flashField,
    safetyExtender(),
    foldPlugin(),
    foldKeymap,
  ];
}
