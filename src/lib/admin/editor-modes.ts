// The iA writing modes: focus mode dims every line outside the caret's paragraph, and typewriter
// scroll holds the cursor line at vertical center while typing. Client-only, like editor-highlight:
// MarkdownEditor reaches this module through a dynamic import, so the static @codemirror imports
// here never enter a server bundle (guarded by the editor-boundary test).
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder, type Extension } from '@codemirror/state';
import { docLines } from './editor-doc-lines.js';

/** An inclusive 0-based line range. */
export interface LineRange {
  fromLine: number;
  toLine: number;
}

const isBlank = (line: string | undefined) => !line || /^\s*$/.test(line);

/**
 * The contiguous non-blank block around the caret line, the unit focus mode keeps at full ink.
 * On a blank line the caret stands alone; the walk clamps at the document edges, and an
 * out-of-range caret clamps into the document first.
 */
export function paragraphRange(lines: string[], caretLine: number): LineRange {
  const last = Math.max(lines.length - 1, 0);
  const caret = Math.min(Math.max(caretLine, 0), last);
  if (isBlank(lines[caret])) return { fromLine: caret, toLine: caret };
  let fromLine = caret;
  while (fromLine > 0 && !isBlank(lines[fromLine - 1])) fromLine--;
  let toLine = caret;
  while (toLine < last && !isBlank(lines[toLine + 1])) toLine++;
  return { fromLine, toLine };
}

const dimLine = Decoration.line({ class: 'cm-cairn-focus-dim' });

// The line cache mirrors editor-highlight's: one full-document read per doc change, so a caret
// move or scroll rebuilds the viewport decorations from the cached array. docLines itself is the
// shared editor-doc-lines helper.

function buildFocusDecorations(view: EditorView, lines: string[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const caretLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const paragraph = paragraphRange(lines, caretLine);
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const n = line.number - 1;
      if (n < paragraph.fromLine || n > paragraph.toLine) builder.add(line.from, line.from, dimLine);
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

/**
 * Focus mode: a line class (`cm-cairn-focus-dim`) on every line outside the caret's paragraph.
 * The class only marks the lines; the dim ink itself lives in the editor theme so the per-theme
 * `--cairn-focus-dim-ink` variable resolves it.
 */
export function focusMode(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      lines: string[];
      constructor(view: EditorView) {
        this.lines = docLines(view);
        this.decorations = buildFocusDecorations(view, this.lines);
      }
      update(update: ViewUpdate) {
        if (update.docChanged) this.lines = docLines(update.view);
        if (update.docChanged || update.viewportChanged || update.selectionSet)
          this.decorations = buildFocusDecorations(update.view, this.lines);
      }
    },
    { decorations: (v) => v.decorations },
  );
}

/**
 * Typewriter scroll: on every doc change, recenter the selection head vertically. An update
 * listener may not dispatch while its update runs, so the recenter is queued as a microtask:
 * it fires as soon as the update finishes, still ahead of the next paint, where an animation
 * frame would trail the edit by a frame. The isConnected guard skips a view destroyed in the
 * queue window.
 */
export function typewriterScroll(): Extension {
  return EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    const view = update.view;
    queueMicrotask(() => {
      if (!view.dom.isConnected) return;
      view.dispatch({
        effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: 'center' }),
      });
    });
  });
}
