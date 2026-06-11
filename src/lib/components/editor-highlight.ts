// The editor's syntax colors and the directive machinery decorations. Colors reference the Warm
// Stone CSS variables so light and dark themes both resolve, and every token pair must hold WCAG
// AA against --color-base-100 (checked in the design pass).
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { directiveLineKind, findInlineDirectives } from './markdown-directives.js';

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

const fenceLine = Decoration.line({ class: 'cm-cairn-directive-fence' });
const leafLine = Decoration.line({ class: 'cm-cairn-directive-leaf' });
const inlineMark = Decoration.mark({ class: 'cm-cairn-directive-inline' });

function buildDirectiveDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const kind = directiveLineKind(line.text);
      if (kind === 'fence') builder.add(line.from, line.from, fenceLine);
      else if (kind === 'leaf') builder.add(line.from, line.from, leafLine);
      else {
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
