// The editor's syntax colors and the directive machinery decorations. Colors reference the Warm
// Stone CSS variables so light and dark themes both resolve, and every token pair must hold WCAG
// AA against --color-base-100 (checked in the design pass).
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { directiveLineKind, fenceDepths, findInlineDirectives } from './markdown-directives.js';

/** Markdown token colors over the admin theme variables. */
export function cairnHighlightStyle(): HighlightStyle {
  return HighlightStyle.define([
    { tag: tags.heading, color: 'var(--color-primary)', fontWeight: '700' },
    { tag: tags.strong, fontWeight: '700' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    { tag: tags.link, color: 'var(--color-info)' },
    { tag: tags.url, color: 'var(--color-info)' },
    { tag: tags.quote, color: 'var(--color-muted)', fontStyle: 'italic' },
    { tag: tags.monospace, color: 'var(--color-accent)' },
    { tag: tags.processingInstruction, color: 'var(--color-muted)' },
    { tag: tags.list, color: 'var(--color-muted)' },
  ]);
}

// The machinery lines explain themselves on hover, so an editor who has never seen ::: syntax
// learns what the line is without leaving the page.
const MACHINERY_HINT = 'Layout marker. Edit the text between these lines and leave this line as it is.';

// Nesting deeper than three steps shares the third visual step; the depth model itself is unbounded.
const DEPTH_STEPS = [1, 2, 3];

const fenceLines = DEPTH_STEPS.map((d) =>
  Decoration.line({ class: `cm-cairn-directive-fence cm-cairn-depth-${d}`, attributes: { title: MACHINERY_HINT } }),
);
const contentLines = DEPTH_STEPS.map((d) => Decoration.line({ class: `cm-cairn-directive-content cm-cairn-depth-${d}` }));
const leafLine = Decoration.line({ class: 'cm-cairn-directive-leaf', attributes: { title: MACHINERY_HINT } });
const inlineMark = Decoration.mark({ class: 'cm-cairn-directive-inline' });

function buildDirectiveDecorations(view: EditorView): DecorationSet {
  // Depth needs the whole document, since a visible line's containers can open above the viewport.
  // The full scan is one regex pass per line, linear in the document; at admin entry sizes (tens of
  // kilobytes) that is well under a millisecond, so it runs on every change without batching.
  const doc = view.state.doc;
  const lines: string[] = [];
  for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
  const depths = fenceDepths(lines);

  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const kind = directiveLineKind(line.text);
      const depth = Math.min(depths[line.number - 1] ?? 0, DEPTH_STEPS.length);
      if (kind === 'fence') builder.add(line.from, line.from, fenceLines[depth - 1]);
      else if (kind === 'leaf') builder.add(line.from, line.from, leafLine);
      else {
        if (depth > 0) builder.add(line.from, line.from, contentLines[depth - 1]);
        for (const r of findInlineDirectives(line.text)) {
          builder.add(line.from + r.from, line.from + r.to, inlineMark);
        }
      }
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

/** Line and mark decorations flagging remark-directive machinery. */
export function cairnDirectivePlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildDirectiveDecorations(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) this.decorations = buildDirectiveDecorations(update.view);
      }
    },
    { decorations: (v) => v.decorations },
  );
}
