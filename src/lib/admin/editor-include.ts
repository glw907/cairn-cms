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
import { fenceScan, includeFragmentId } from './markdown-directives.js';
import { docLines } from './editor-doc-lines.js';

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
 * The published title for a fragment id, or null when the lookup carries no entry for it. Reads
 *  only the lookup's own keys ({@link Object.hasOwn}), never the inherited `Object.prototype`
 *  chain: `titles` is a plain object built from author-typed fragment ids, so an id like
 *  `"constructor"` or `"toString"` must fall back to the raw id rather than resolving a JS
 *  internal the bracket lookup would otherwise hit.
 */
function resolveTitle(titles: FragmentTitles, fragmentId: string): string | null {
  if (!Object.hasOwn(titles, fragmentId)) return null;
  const title = titles[fragmentId];
  return typeof title === 'string' ? title : null;
}

/**
 * Every resolved include line across the editor's visible ranges, in document order. A line
 *  resolves when it carries a `fragment="id"` value {@link includeFragmentId} can read AND sits
 *  outside a fenced code block: a documented `::include{...}` example inside a code fence is the
 *  block's own literal text, never a live directive the renderer resolves, so it stays plain
 *  source like every sibling decoration in this editor. An include leaf directive with no fragment
 *  attribute (or a malformed one) is likewise left as plain source, matching the media decoration's
 *  own "malformed token stays plain source" precedent.
 */
function visibleMatches(view: EditorView, titles: FragmentTitles): IncludeMatch[] {
  const lines = docLines(view);
  const scan = fenceScan(lines);
  const out: IncludeMatch[] = [];
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      if (!scan.inCode[line.number - 1]) {
        const fragmentId = includeFragmentId(line.text);
        if (fragmentId) {
          out.push({ from: line.from, to: line.to, fragmentId, title: resolveTitle(titles, fragmentId) });
        }
      }
      pos = line.to + 1;
    }
  }
  return out;
}

/**
 * The chip decorations and the atomic ranges for the visible resolved include lines, from one scan
 *  of the same matches so the two sets can never disagree. `decorations` is the chip widget over
 *  each whole line's content; `atomic` marks each of those lines as one unit, so a caret or
 *  selection edit removes the whole directive rather than corrupting its fence machinery.
 */
function buildIncludeSets(
  view: EditorView,
  titles: FragmentTitles,
): { decorations: DecorationSet; atomic: DecorationSet } {
  const chips = new RangeSetBuilder<Decoration>();
  const atomicRanges: Range<Decoration>[] = [];
  for (const match of visibleMatches(view, titles)) {
    chips.add(match.from, match.to, Decoration.replace({ widget: new IncludeChipWidget(match) }));
    atomicRanges.push(Decoration.replace({}).range(match.from, match.to));
  }
  return { decorations: chips.finish(), atomic: Decoration.set(atomicRanges, true) };
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
        const sets = buildIncludeSets(view, titles);
        this.decorations = sets.decorations;
        this.atomic = sets.atomic;
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          const sets = buildIncludeSets(update.view, titles);
          this.decorations = sets.decorations;
          this.atomic = sets.atomic;
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
