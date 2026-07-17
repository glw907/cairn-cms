// The include: source decoration. A resolved `::include{fragment="id"}` leaf directive line has its
// whole line replaced by a chip naming the fragment's human title ("Include: Office contact"), never
// the raw fence machinery or the bare id. The line is also made atomic, so a backspace or delete
// touching it removes the whole line in one transaction (one undo step restores it), mirroring the
// media: source chip's own atomic-token behavior (editor-media.ts) but scoped to the whole line
// rather than one inline token, since a leaf directive's grammar already confines it to its own line.
//
// Client-only like editor-highlight, editor-modes, and editor-media: MarkdownEditor reaches this
// module through a dynamic import, so the static @codemirror imports here never enter a server bundle
// (guarded by the editor-boundary test, whose DYNAMIC_ONLY list names this file).
//
// The title lookup is reactive: MarkdownEditor feeds it in through a compartment reconfigured on a
// prop change, mirroring the media library's own wiring. A fragment id absent from the lookup (the
// title unavailable) renders a neutral chip named from the raw id rather than throwing; the decoration
// never touches the document text either way.
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder, type Extension, type Range } from '@codemirror/state';
import { includeFragmentId } from './markdown-directives.js';

/** The published fragment titles an include chip resolves against, keyed by fragment id. */
export type FragmentTitles = Record<string, string>;

/**
 * A resolved include line: its document offsets, the fragment id, and the title (null when the
 *  lookup carries no entry for it, the fallback-to-id case).
 */
interface IncludeMatch {
  from: number;
  to: number;
  fragmentId: string;
  title: string | null;
}

// The chip widget: replaces the whole include line with a small accent chip reading
// "Include: <title>" (or "Include: <id>" when the title is unavailable). Never throws on a missing
// title; the id always stands in.
class IncludeChipWidget extends WidgetType {
  constructor(readonly match: IncludeMatch) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof IncludeChipWidget &&
      other.match.fragmentId === this.match.fragmentId &&
      other.match.title === this.match.title
    );
  }

  toDOM(): HTMLElement {
    const { fragmentId, title } = this.match;
    const chip = document.createElement('span');
    chip.className = 'cm-cairn-include-chip';
    const label = document.createElement('span');
    label.className = 'cm-cairn-include-label';
    label.textContent = 'Include';
    chip.appendChild(label);
    chip.appendChild(document.createTextNode(': '));
    const name = document.createElement('span');
    name.className = 'cm-cairn-include-name';
    name.textContent = title ?? fragmentId;
    chip.appendChild(name);
    return chip;
  }

  // Interactive intent rides the surrounding atomic range, not the widget itself; clicks fall
  // through to CodeMirror so the caret lands beside the atomic line, matching the media chip.
  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Every resolved include line across the editor's visible ranges, in document order. A line
 *  resolves when it carries a `fragment="id"` value {@link includeFragmentId} can read; an include
 *  leaf directive with no fragment attribute (or a malformed one) is left as plain source, matching
 *  the media decoration's own "malformed token stays plain source" precedent.
 */
function visibleMatches(view: EditorView, titles: FragmentTitles): IncludeMatch[] {
  const out: IncludeMatch[] = [];
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const fragmentId = includeFragmentId(line.text);
      if (fragmentId) {
        out.push({ from: line.from, to: line.to, fragmentId, title: titles[fragmentId] ?? null });
      }
      pos = line.to + 1;
    }
  }
  return out;
}

/**
 * Replace decorations for each visible resolved include line: the chip widget over the whole
 *  line's content. The same spans seed the atomic-range set.
 */
function buildIncludeDecorations(view: EditorView, titles: FragmentTitles): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const match of visibleMatches(view, titles)) {
    builder.add(match.from, match.to, Decoration.replace({ widget: new IncludeChipWidget(match) }));
  }
  return builder.finish();
}

/**
 * The atomic ranges for the visible resolved include lines: a caret or selection edit treats the
 *  whole line as one unit, so a stray keystroke removes the whole directive rather than corrupting
 *  its fence machinery. Built from the same matches the decorations use, so the two never disagree.
 */
function buildAtomicRanges(view: EditorView, titles: FragmentTitles): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (const match of visibleMatches(view, titles)) {
    ranges.push(Decoration.replace({}).range(match.from, match.to));
  }
  return Decoration.set(ranges, true);
}

/**
 * The include: source decoration extension over a fragment-title lookup. Each resolved
 * `::include{fragment="id"}` leaf directive line renders as an atomic chip naming the fragment's
 * title, falling back to the raw id when the lookup carries no entry for it. `titles` is the
 * `fragmentTitles` projection EditData carries; MarkdownEditor holds it in a compartment and
 * rebuilds this extension when the lookup changes. An empty lookup is valid: every resolved include
 * still chips, named by its raw id.
 */
export function cairnIncludeDecorations(titles: FragmentTitles): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      atomic: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildIncludeDecorations(view, titles);
        this.atomic = buildAtomicRanges(view, titles);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildIncludeDecorations(update.view, titles);
          this.atomic = buildAtomicRanges(update.view, titles);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none),
    },
  );
  return plugin;
}
