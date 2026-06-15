// The editor's syntax colors and the directive machinery decorations. Colors reference the Warm
// Stone CSS variables so light and dark themes both resolve, and every token pair must hold WCAG
// AA against --color-base-100 (checked in the design pass).
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import {
  caretContainerRange,
  directiveLineKind,
  fenceScan,
  fenceTokens,
  findInlineDirectives,
  markerPrefix,
  type FenceScan,
} from './markdown-directives.js';

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
    { tag: tags.heading3, fontSize: '1.17em', fontWeight: '700', color: 'var(--color-base-content)' },
    // A real step for h4, between h3 and body, so a hand-typed #### reads as a heading.
    { tag: tags.heading4, fontSize: '1.05em', fontWeight: '700', color: 'var(--color-base-content)' },
    // h5 and deeper share the weight only; body size keeps the low levels from outranking h4.
    { tag: tags.heading, fontWeight: '700', color: 'var(--color-base-content)' },
    { tag: tags.strong, fontWeight: '700' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    // Quote TEXT is content, so it keeps the full ink; muted means machinery, and only the >
    // marker (QuoteMark, under processingInstruction below) recedes to it.
    { tag: tags.quote, color: 'var(--color-base-content)', fontStyle: 'italic' },
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
// Cursor-aware emphasis: every row of the container the caret sits inside, fence and content
// alike, carries this class on top of its depth classes; the theme steps that block's rail and
// label ink up one notch while the other containers sit quieter.
const caretBlockLine = Decoration.line({ class: 'cm-cairn-caret-block' });

// The hanging-indent line decoration for a quote or list line, keyed by the marker's character
// width. The width rides a --cairn-hang custom property so the theme's padding-left rule adds it
// to the directive gutter rather than replacing it (an inline padding-left would win the cascade
// and erase the gutter). The equal negative text-indent pulls the first line back by the marker
// width, so the marker sits in the indent and a wrapped continuation resumes under the content
// (the Obsidian/HyperMD idiom). The surface is iA Writer Mono, fixed pitch, so n chars is exactly
// n ch. Built lazily and memoized; marker widths repeat.
const hangLines = new Map<number, Decoration>();
function hangLine(width: number): Decoration {
  let deco = hangLines.get(width);
  if (!deco) {
    deco = Decoration.line({
      class: 'cm-cairn-hang',
      attributes: { style: `--cairn-hang:${width}ch;text-indent:-${width}ch` },
    });
    hangLines.set(width, deco);
  }
  return deco;
}

// Depth needs the whole document, since a visible line's containers can open above the viewport.
// One regex pass per line, linear in the document; at admin entry sizes (tens of kilobytes) that
// is well under a millisecond. The plugin caches the fence scan, so it reruns only when the
// document changes; a scroll or a caret move rebuilds the viewport decorations from the cached
// scan.
function docLines(view: EditorView): string[] {
  const doc = view.state.doc;
  const lines: string[] = [];
  for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
  return lines;
}

function buildDirectiveDecorations(view: EditorView, scan: FenceScan): DecorationSet {
  const { depths } = scan;
  const builder = new RangeSetBuilder<Decoration>();
  // The caret's container, one helper call over the cached scan per rebuild. Line decorations
  // at the same position must enter the builder in add order, so the caret-block class goes in
  // as its own line decoration just ahead of the row's depth decoration.
  const caretLine = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const caret = caretContainerRange(scan, caretLine);
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const kind = directiveLineKind(line.text);
      const depth = Math.min(depths[line.number - 1] ?? 0, DEPTH_STEPS.length);
      if (caret && line.number - 1 >= caret.fromLine && line.number - 1 <= caret.toLine) {
        builder.add(line.from, line.from, caretBlockLine);
      }
      // A fence-shaped line at depth 0 is one the depth scan disowned (a documented example
      // inside a code block, outside any container); it gets no machinery treatment.
      if (kind === 'fence' && depth > 0) {
        builder.add(line.from, line.from, fenceLines[depth - 1]);
      } else if (kind === 'leaf') {
        builder.add(line.from, line.from, leafLine);
      } else if (kind === null && depth > 0) {
        builder.add(line.from, line.from, contentLines[depth - 1]);
      }
      // A quote or list line hangs its wrapped continuation under the content. The decoration is
      // a line decoration too, so it enters at line.from after the depth and caret-block lines
      // and before any mark decoration on the same row; inside a container it composes with the
      // gutter padding. A fence or leaf machinery line is never a quote or list, so this only
      // fires on prose and content rows.
      if (kind === null) {
        const prefix = markerPrefix(line.text);
        if (prefix) builder.add(line.from, line.from, hangLine(prefix.length));
      }
      // Mark decorations start at offsets past line.from, so they enter after every line
      // decoration on the row.
      if (kind === 'fence' && depth > 0) {
        for (const token of fenceTokens(line.text)) {
          builder.add(
            line.from + token.from,
            line.from + token.to,
            token.kind === 'mark' ? fenceMark : fenceLabels[depth - 1],
          );
        }
      } else if (kind === null) {
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
      scan: FenceScan;
      constructor(view: EditorView) {
        this.scan = fenceScan(docLines(view));
        this.decorations = buildDirectiveDecorations(view, this.scan);
      }
      update(update: ViewUpdate) {
        if (update.docChanged) this.scan = fenceScan(docLines(update.view));
        // A selection change rebuilds too, so the caret-block emphasis follows the cursor; the
        // fence scan stays cached, keeping a caret move at viewport cost.
        if (update.docChanged || update.viewportChanged || update.selectionSet)
          this.decorations = buildDirectiveDecorations(update.view, this.scan);
      }
    },
    { decorations: (v) => v.decorations },
  );
}
