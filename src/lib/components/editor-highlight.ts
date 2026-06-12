// The editor's syntax colors and the directive machinery decorations. Colors reference the Warm
// Stone CSS variables so light and dark themes both resolve, and every token pair must hold WCAG
// AA against --color-base-100 (checked in the design pass).
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { directiveLineKind, fenceDepths, fenceTokens, findInlineDirectives } from './markdown-directives.js';

/** Markdown token colors over the admin theme variables. */
export function cairnHighlightStyle(): HighlightStyle {
  // Rule order is load-bearing. HighlightStyle emits its CSS in spec order, so on a span that
  // carries several classes (a marker inherits its heading's or link's class on top of its own
  // processingInstruction one) the later rule wins the tie. The url and processingInstruction
  // rules sit last so the URL part of a link and every syntax marker stay muted under the
  // heading, emphasis, and link inks.
  return HighlightStyle.define([
    { tag: tags.heading1, fontSize: '1.5em', fontWeight: '700', color: 'var(--color-base-content)' },
    { tag: tags.heading2, fontSize: '1.3em', fontWeight: '700', color: 'var(--color-base-content)' },
    { tag: tags.heading3, fontSize: '1.12em', fontWeight: '700', color: 'var(--color-base-content)' },
    // h4 and deeper share the weight only; body size keeps the low levels from outranking h3.
    { tag: tags.heading, fontWeight: '700', color: 'var(--color-base-content)' },
    { tag: tags.strong, fontWeight: '700' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    { tag: tags.quote, color: 'var(--color-muted)', fontStyle: 'italic' },
    { tag: tags.list, color: 'var(--color-muted)' },
    { tag: tags.link, color: 'var(--color-accent)' },
    { tag: tags.url, color: 'var(--color-muted)' },
    {
      tag: tags.monospace,
      color: 'var(--color-base-content)',
      backgroundColor: 'var(--cairn-code-chip)',
      borderRadius: '0.25rem',
      padding: '0.05em 0.3em',
    },
    { tag: tags.processingInstruction, color: 'var(--color-muted)', fontWeight: '400' },
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
// Within a fence line, machinery (colons, brackets, braces) dims to the marker tone while the
// directive name and label keep a depth-stepped ink: meaning over machinery.
const fenceMark = Decoration.mark({ class: 'cm-cairn-directive-mark' });
const fenceLabels = DEPTH_STEPS.map((d) => Decoration.mark({ class: `cm-cairn-directive-label cm-cairn-depth-${d}` }));

// Depth needs the whole document, since a visible line's containers can open above the viewport.
// One regex pass per line, linear in the document; at admin entry sizes (tens of kilobytes) that
// is well under a millisecond. The plugin caches the result, so the scan reruns only when the
// document changes and a scroll rebuilds the viewport decorations from the cached array.
function docDepths(view: EditorView): (number | null)[] {
  const doc = view.state.doc;
  const lines: string[] = [];
  for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
  return fenceDepths(lines);
}

function buildDirectiveDecorations(view: EditorView, depths: (number | null)[]): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const kind = directiveLineKind(line.text);
      const depth = Math.min(depths[line.number - 1] ?? 0, DEPTH_STEPS.length);
      // A fence-shaped line at depth 0 is one the depth scan disowned (a documented example
      // inside a code block, outside any container); it gets no machinery treatment.
      if (kind === 'fence' && depth > 0) {
        builder.add(line.from, line.from, fenceLines[depth - 1]);
        for (const token of fenceTokens(line.text)) {
          builder.add(
            line.from + token.from,
            line.from + token.to,
            token.kind === 'mark' ? fenceMark : fenceLabels[depth - 1],
          );
        }
      } else if (kind === 'leaf') builder.add(line.from, line.from, leafLine);
      else if (kind === null) {
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
      depths: (number | null)[];
      constructor(view: EditorView) {
        this.depths = docDepths(view);
        this.decorations = buildDirectiveDecorations(view, this.depths);
      }
      update(update: ViewUpdate) {
        if (update.docChanged) this.depths = docDepths(update.view);
        if (update.docChanged || update.viewportChanged)
          this.decorations = buildDirectiveDecorations(update.view, this.depths);
      }
    },
    { decorations: (v) => v.decorations },
  );
}
