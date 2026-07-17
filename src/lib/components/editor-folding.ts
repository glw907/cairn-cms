// Container folding: CodeMirror's fold system driven by cairn's directive grammar, with a real
// gutter column as the affordance. Client-only like editor-highlight and editor-modes; MarkdownEditor
// reaches this module through a dynamic import, so the static @codemirror imports here never enter
// a server bundle (guarded by the editor-boundary test).
//
// The architecture (spec 2026-06-14): @codemirror/language's codeFolding plus foldEffect/
// unfoldEffect, never a custom fold store. Fold ranges come only from containerRanges, the pure
// pairing helper beside fenceScan. The safety invariant lives in one transactionExtender that
// appends unfold effects when a change or selection touches a folded range. The control is a custom
// gutter() whose GutterMarker is a focusable button on each paired-opener row; a lower-level
// gutter (not foldGutter) is what lets the caret-inside state stay live, since its lineMarkerChange
// recomputes on selection changes.
//
// The safety invariant: an author never edits, deletes, or fails to see hidden text.
import {
  Decoration,
  EditorView,
  GutterMarker,
  ViewPlugin,
  gutter,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import {
  EditorState,
  Prec,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Extension,
} from '@codemirror/state';
import { codeFolding, foldEffect, foldedRanges, unfoldEffect } from '@codemirror/language';
import {
  caretContainerRange,
  containerRanges,
  directiveOpenerName,
  fenceScan,
  openerTitleAttr,
  type ContainerRange,
} from './markdown-directives.js';

// One chevron glyph; CSS rotates it (down open, right folded) and reveals it on gutter hover. The
// gutter is the fixed-x home, so the chevron no longer encodes depth by position.
const CHEVRON_DOWN = 'm6 9 6 6 6-6';

function chevronSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', CHEVRON_DOWN);
  svg.appendChild(path);
  return svg;
}

/**
 * How the fold system resolves a directive name to the component's human identity. The site's
 * component registry carries a palette `label` and an optional `use` line per component; a site
 * passes both lookups through {@link cairnFolding} so the folded pill and the gutter control name
 * a block by what it is, not its raw directive slug. Both default to returning undefined (the raw
 * name stands in), so a caller that passes nothing keeps today's unlabeled behavior.
 */
export interface FoldLabelSource {
  /**
   * The registry label for a directive name, or undefined when it carries no registry entry
   *  (an engine-native directive like `include`, or a site directive the registry does not know).
   */
  labelFor?: (name: string) => string | undefined;
  /** The registry `use` line for a directive name, or undefined when it carries none. */
  useFor?: (name: string) => string | undefined;
}

// The display label for a directive name: the registry's label when one resolves, otherwise the
// raw directive name itself, so an engine-native or unregistered directive still reads as
// something rather than nothing.
function resolvedLabel(name: string, labelFor?: (name: string) => string | undefined): string {
  return labelFor?.(name) ?? name;
}

// The disclosure name for a fold control: the resolved label from its opener line, or the
// generic 'section' when the opener carries no directive name at all. State-neutral by
// construction, so aria-expanded stays the sole state signal rather than double-signaling
// against a verb label.
function blockName(openerLineText: string, labelFor?: (name: string) => string | undefined): string {
  const name = directiveOpenerName(openerLineText);
  return name ? `${resolvedLabel(name, labelFor)} section` : 'section';
}

// What preparePlaceholder derives once per fold so placeholderDOM renders it without
// re-deriving: the hidden line count, the resolved display label (null when the opener carries
// no directive name), the opener's title attribute (null when it carries none), and the registry
// `use` line for the pill's tooltip (undefined when the directive carries none).
interface PreparedFold {
  lines: number;
  label: string | null;
  title: string | null;
  use: string | undefined;
}

// The pill placeholder: a real focusable button counting the hidden lines, the screen-reader story
// for a fold. preparePlaceholder computes the count, the resolved label, the opener's title
// attribute, and the tooltip off the folded char range so placeholderDOM renders all four without
// re-deriving. Clicking unfolds through CodeMirror's own onclick handler.
function preparePlaceholder(
  state: EditorState,
  range: { from: number; to: number },
  labels: FoldLabelSource,
): PreparedFold {
  const lines = state.doc.lineAt(range.to).number - state.doc.lineAt(range.from).number;
  const openerText = state.doc.lineAt(range.from).text;
  const rawName = directiveOpenerName(openerText);
  const label = rawName ? resolvedLabel(rawName, labels.labelFor) : null;
  const title = rawName ? openerTitleAttr(openerText) : null;
  const use = rawName ? labels.useFor?.(rawName) : undefined;
  return { lines, label, title, use };
}

// The chip's combined text after the (truncatable) label span: the title segment only when the
// opener carries a title attribute, otherwise the plain hidden-line count, today's pill text.
// The middle dot is the pill grammar's one separator (the admin voice keeps the em dash out of
// UI strings), so the title joins the same way the count does.
function pillSuffix(prepared: PreparedFold): string {
  return prepared.title
    ? ` · “${prepared.title}” · ${prepared.lines} lines`
    : ` · ${prepared.lines} lines`;
}

function placeholderDOM(view: EditorView, onclick: (event: Event) => void, prepared: PreparedFold): HTMLElement {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'cm-cairn-fold-pill';
  if (prepared.label) {
    // The label carries its own truncating span (CSS ellipsis past ~24 characters, see
    // cairn-admin's fold-pill rule) so a long component label never crowds out the title or the
    // count; both sit outside the span, as a bare text node, so neither can ever truncate.
    const labelSpan = document.createElement('span');
    labelSpan.className = 'cm-cairn-fold-pill-label';
    labelSpan.textContent = prepared.label;
    pill.appendChild(labelSpan);
    pill.appendChild(document.createTextNode(pillSuffix(prepared)));
  } else {
    pill.textContent = `${prepared.lines} lines`;
  }
  // A folded row is only ever rendered while folded, so aria-expanded is always false here; the
  // redundancy with the gutter chevron's own aria-expanded is intended (spec 2026-06-30).
  pill.setAttribute('aria-expanded', 'false');
  const ariaName = prepared.label ? `${prepared.label} section` : 'section';
  // The title rides the aria-label too (not just the visible text), so the chip carries the same
  // information for assistive tech that it now carries for sighted authors: with the opener's
  // fence machinery absorbed into the chip, an author using a screen reader has no other way to
  // learn the container's title while it stays folded.
  const ariaTitle = prepared.title ? `, “${prepared.title}”` : '';
  pill.setAttribute('aria-label', `${ariaName}${ariaTitle}, ${prepared.lines} hidden lines`);
  // The registry's `use` line carries the pill's native tooltip; the opener's own {title="..."}
  // attribute now rides the visible chip text and the aria-label above instead.
  if (prepared.use) pill.title = prepared.use;
  pill.addEventListener('click', onclick);
  return pill;
}

// The char range a container folds: start-of-opener-line to end-of-closer-line, so the whole
// opener row (its fence machinery, name, and attrs) folds away with the body and the closer,
// absorbed into the one placeholder chip. Null when the opener and closer share a line (nothing
// to hide). The one place that turns a line range into the fold range, shared by the toggle, the
// keymap, and the gutter; widening it to the opener's line start (rather than its line end) is
// what lets the touched-range safety invariant below cover an edit landing on the now-hidden
// opener text too, with no separate mechanism.
function foldCharRange(state: EditorState, range: ContainerRange): { from: number; to: number } | null {
  const opener = state.doc.line(range.fromLine + 1);
  const closer = state.doc.line(range.toLine + 1);
  if (closer.to <= opener.to) return null;
  return { from: opener.from, to: closer.to };
}

// Fold one container, or unfold it if already folded. The range comes from containerRanges, so a
// half-typed fence can never fold. A no-op when the container has nothing to hide.
function toggleFold(view: EditorView, range: ContainerRange): void {
  const span = foldCharRange(view.state, range);
  if (!span) return;
  const effect = foldExists(view.state, span.from, span.to) ? unfoldEffect : foldEffect;
  view.dispatch({ effects: effect.of(span) });
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
  const { scan, ranges } = foldScanFor(view.state);
  const caretLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const inner = caretContainerRange(scan, caretLine);
  if (!inner) return null;
  return ranges.find((r) => r.fromLine === inner.fromLine && r.toLine === inner.toLine) ?? null;
}

function docLines(state: EditorState): string[] {
  const lines: string[] = [];
  for (let n = 1; n <= state.doc.lines; n++) lines.push(state.doc.line(n).text);
  return lines;
}

// The scan and its paired ranges, memoized per state so the gutter's per-line lookups stay linear
// rather than rescanning the whole document on every line.
const scanCache = new WeakMap<EditorState, { scan: ReturnType<typeof fenceScan>; ranges: ContainerRange[] }>();
function foldScanFor(state: EditorState): { scan: ReturnType<typeof fenceScan>; ranges: ContainerRange[] } {
  let cached = scanCache.get(state);
  if (!cached) {
    const scan = fenceScan(docLines(state));
    cached = { scan, ranges: containerRanges(scan) };
    scanCache.set(state, cached);
  }
  return cached;
}

// The paired container whose opener sits at this line start, or null (a closer, a prose line, or an
// unbalanced opener gets nothing). The sole source of which rows carry a fold control.
function openerRangeAt(state: EditorState, lineFrom: number): ContainerRange | null {
  const lineIndex = state.doc.lineAt(lineFrom).number - 1;
  return foldScanFor(state).ranges.find((r) => r.fromLine === lineIndex) ?? null;
}

// Whether the caret's innermost container is exactly this one, the caret-inside active state.
function caretInside(state: EditorState, range: ContainerRange): boolean {
  const { scan } = foldScanFor(state);
  const caretLine = state.doc.lineAt(state.selection.main.head).number - 1;
  const inner = caretContainerRange(scan, caretLine);
  return !!inner && inner.fromLine === range.fromLine && inner.toLine === range.toLine;
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
      const span = range && foldCharRange(view.state, range);
      if (!span || foldExists(view.state, span.from, span.to)) return false;
      view.dispatch({ effects: foldEffect.of(span) });
      return true;
    },
  },
  {
    key: 'Mod-Shift-]',
    run: (view) => {
      const range = caretFoldRange(view);
      const span = range && foldCharRange(view.state, range);
      if (!span || !foldExists(view.state, span.from, span.to)) return false;
      view.dispatch({ effects: unfoldEffect.of(span) });
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
// (not just its head) extending into hidden text. It walks the start state's folds, maps each
// boundary forward through the transaction's changes (the +1/-1 bias keeps a boundary insert on the
// fold's outside), and appends an unfold effect for any the change or new selection touches. A
// replace inside a fold leaves it open afterward, which falls out of the same rule.
//
// foldCharRange now starts the fold at the opener line's own start, so the opener's fence
// machinery folds away into the chip along with the body and the closer (the absorbed-opener
// chip). That widening is what makes this one invariant cover an edit landing on the (now-hidden)
// opener line too, with no separate mechanism: a rename dispatched while a container is folded
// reads as touching this same range and unfolds, revealing exact source, rather than silently
// refreshing a placeholder still on screen. An earlier version of this file also carried a
// placeholder-refresh extender that re-derived a folded opener's identity and forced a refold when
// it drifted, so a directive renamed in place could stay folded with an updated pill. That case can
// no longer occur: since the opener line now folds away with everything else, the only way a
// folded range's identity could change is by editing the opener text, which is now always a
// touched edit and always unfolds here first. A later manual refold calls preparePlaceholder fresh
// against the current text regardless.
function safetyExtender(): Extension {
  return EditorState.transactionExtender.of((tr) => {
    if (!tr.docChanged && !tr.selection) return null;
    const startFolds = foldedRanges(tr.startState);
    if (startFolds.size === 0) return null;
    const effects: StateEffect<unknown>[] = [];
    startFolds.between(0, tr.startState.doc.length, (from, to) => {
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

// The folded-row wash plugin: a line decoration on each folded opener row, square and full-row so
// folded spots read in a scan. Rebuilds on doc change (the container set moves), viewport change,
// and any fold change (a fold adds a wash, an unfold removes it). The chevron lives in the gutter
// now, not here; this plugin carries only the wash and the unfold flash scheduling.
function foldDecorations(view: EditorView, ranges: ContainerRange[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  // Sort by opener line so the builder receives ascending positions; equal openers cannot happen
  // (one open per line).
  const byOpener = [...ranges].sort((a, b) => a.fromLine - b.fromLine);
  for (const range of byOpener) {
    const span = foldCharRange(view.state, range);
    if (!span) continue;
    const opener = view.state.doc.line(range.fromLine + 1);
    // A line decoration so the rails (box-shadows on the same element) run through it unbroken.
    if (foldExists(view.state, span.from, span.to)) builder.add(opener.from, opener.from, washLine);
  }
  return builder.finish();
}

const washLine = Decoration.line({ class: 'cm-cairn-folded-row' });

function foldPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      ranges: ContainerRange[];
      constructor(view: EditorView) {
        this.ranges = foldScanFor(view.state).ranges;
        this.decorations = foldDecorations(view, this.ranges);
      }
      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.ranges = foldScanFor(update.view.state).ranges;
        }
        const foldChanged = update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(foldEffect) || e.is(unfoldEffect)),
        );
        if (update.docChanged || update.viewportChanged || foldChanged) {
          this.decorations = foldDecorations(update.view, this.ranges);
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

const FOLD_KEY_HINT = ' (Ctrl+Shift+[)';
const UNFOLD_KEY_HINT = ' (Ctrl+Shift+])';

// The gutter control: a real focusable button per paired-opener row, holding one chevron that CSS
// rotates (down open, right folded) and reveals on gutter hover. mousedown keeps the caret and
// focus where they are; click toggles, so one handler serves a mouse click and a keyboard
// activation (Enter/Space) with no double-toggle. The folded and caret-active classes carry the
// state the theme reads.
class FoldMarker extends GutterMarker {
  constructor(
    readonly container: ContainerRange,
    readonly folded: boolean,
    readonly active: boolean,
    // The resolved block name, computed once by the caller (lineMarker) from the opener line's
    // current text. Carried as its own identity field, not re-derived in toDOM, so a directive
    // renamed in place (same span, same fold state) is not mistaken for the same marker by eq
    // and does not reuse cached DOM carrying the old name.
    readonly name: string,
  ) {
    super();
  }
  eq(other: GutterMarker) {
    return (
      other instanceof FoldMarker &&
      other.container.fromLine === this.container.fromLine &&
      other.container.toLine === this.container.toLine &&
      other.folded === this.folded &&
      other.active === this.active &&
      other.name === this.name
    );
  }
  toDOM(view: EditorView) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const title = this.folded ? 'Unfold this section' : 'Fold this section';
    btn.className =
      'cm-cairn-fold-btn' +
      (this.folded ? ' cm-cairn-fold-folded' : '') +
      (this.active ? ' cm-cairn-fold-active' : '');
    // aria-expanded is the sole state signal; the label names the block instead of repeating it.
    btn.setAttribute('aria-expanded', this.folded ? 'false' : 'true');
    btn.setAttribute('aria-label', this.name);
    btn.title = title + (this.folded ? UNFOLD_KEY_HINT : FOLD_KEY_HINT);
    btn.appendChild(chevronSvg());
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFold(view, this.container);
    });
    return btn;
  }
}

// The fold gutter: a fixed-x column (width from the theme) carrying one FoldMarker per paired
// opener. lineMarker returns null for every other row, so the column is empty whitespace down the
// rest of the surface. lineMarkerChange recomputes the markers on a doc change, a selection change
// (the caret-inside state follows the cursor), and any fold effect (a fold flips the chevron).
function foldGutterColumn(labels: FoldLabelSource): Extension {
  return gutter({
    class: 'cm-cairn-fold-gutter',
    lineMarker(view, line) {
      const range = openerRangeAt(view.state, line.from);
      if (!range) return null;
      const span = foldCharRange(view.state, range);
      if (!span) return null;
      const folded = foldExists(view.state, span.from, span.to);
      const name = blockName(view.state.doc.line(range.fromLine + 1).text, labels.labelFor);
      return new FoldMarker(range, folded, caretInside(view.state, range), name);
    },
    lineMarkerChange(update) {
      return (
        update.docChanged ||
        update.selectionSet ||
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(foldEffect) || e.is(unfoldEffect)),
        )
      );
    },
  });
}

// The design notes' diagnostics rules (a deliberately refolded erroring container keeps its fold
// and tints the pill warning ink instead of re-springing on every lint) have no trigger today: the
// editor carries no lint source, so there is nothing to refold around or to tint. Deliberately not
// built; do not invent a lint system to satisfy a rule with no input.

/**
 * Folds every paired container in the view's current document, in one transaction. Called once,
 * right after the view mounts (MarkdownEditor's `foldOnMount`), so an entry opens with its
 * component blocks collapsed and only the prose reads at a glance. The safety invariant governs a
 * fold this creates exactly as it governs a manual one: a touch or an edit reaching it springs it
 * open again.
 */
export function foldContainersOnLoad(view: EditorView): void {
  const { ranges } = foldScanFor(view.state);
  const effects: StateEffect<unknown>[] = [];
  for (const range of ranges) {
    const span = foldCharRange(view.state, range);
    if (span) effects.push(foldEffect.of(span));
  }
  if (effects.length) view.dispatch({ effects });
}

/**
 * The cairn fold extension: the CodeMirror fold system with the pill placeholder, the gutter chevron
 * and folded-row wash affordance, the safety invariant, and the Ctrl+Shift+[ / ] keymap.
 * Session-local and never persisted: the fold state lives in CodeMirror's foldState field, which
 * this never serializes. `labels` resolves a folded block's directive name against the site's
 * component registry, so the pill and the gutter control read the component's human identity
 * rather than its raw directive slug; absent, both fall back to the raw name.
 */
export function cairnFolding(labels: FoldLabelSource = {}): Extension {
  return [
    codeFolding({
      preparePlaceholder: (state, range) => preparePlaceholder(state, range, labels),
      placeholderDOM,
    }),
    flashField,
    safetyExtender(),
    foldPlugin(),
    foldGutterColumn(labels),
    foldKeymap,
  ];
}
