// The media: source decoration. Each `![alt](media:slug.hash)` token in the source has its URL part
// (the media: reference inside the parens, never the alt) replaced by an inline chip showing the
// asset's thumbnail and display name, with a persistent needs-alt marker when the alt is empty. The
// reference token is also made atomic, so a stray keystroke selects or replaces the whole reference
// rather than corrupting a hex digit.
//
// Client-only like editor-highlight, editor-modes, and editor-folding: MarkdownEditor reaches this
// module through a dynamic import, so the static @codemirror imports here never enter a server bundle
// (guarded by the editor-boundary test, whose DYNAMIC_ONLY list names this file).
//
// The library is reactive: MarkdownEditor feeds it in through a compartment reconfigured on a prop
// change, so a just-uploaded image decorates the moment it lands in the library. The chip reads the
// library for the thumbnail src, the display name, and the dimensions; a hash absent from the library
// renders a neutral fallback chip named from the token slug rather than throwing.
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder, type Extension, type Range } from '@codemirror/state';
import { parseMediaToken } from '../media/reference.js';
import { publicPath } from '../media/naming.js';
import { fenceScan, figureRoleAtLine } from './markdown-directives.js';
// The decoration reads MediaLibrary/MediaLibraryEntry (the shared node-safe projection) for the
// thumbnail path, the display name, and the alt-empty test.
import type { MediaLibrary, MediaLibraryEntry } from '../media/library-entry.js';

// Markdown image tokens whose URL is a media: reference. The capture groups split the alt (group 1,
// author content that stays editable) from the URL token (group 2, the media: reference that becomes
// the atomic chip). The alt body excludes a closing bracket so a following `![...]` cannot run into
// it; the URL body excludes whitespace and the closing paren. parseMediaToken does the real
// validation, so a non-media or malformed URL is dropped after the match.
const MEDIA_IMAGE = /!\[([^\]]*)\]\((media:[^\s)]+)\)/g;

/** A matched media image in a line: the alt text and the URL token's character offsets within the
 *  whole document, plus the parsed reference and the library entry (null when the hash is unknown).
 *  figureRole carries the enclosing `:::figure` placement (the closed-set role, or `'figure'` for
 *  the measure default), or null when the token is not in a figure: a bare token shows no role pill. */
interface MediaImageMatch {
  alt: string;
  from: number;
  to: number;
  token: string;
  slug: string | null;
  hash: string;
  entry: MediaLibraryEntry | null;
  figureRole: 'center' | 'wide' | 'full' | 'figure' | null;
}

// The chip widget: an inline element carrying the thumbnail and the display name, with a needs-alt
// marker (a glyph plus a label, never hue alone) when the alt is empty. A library miss renders a
// neutral fallback chip named from the token slug. The widget never throws on a missing entry.
class MediaChipWidget extends WidgetType {
  constructor(readonly match: MediaImageMatch) {
    super();
  }

  eq(other: WidgetType): boolean {
    if (!(other instanceof MediaChipWidget)) return false;
    const a = this.match;
    const b = other.match;
    // The chip's appearance depends on the token, the alt-empty state, and the resolved entry's
    // identity (its slug/ext/hash drive the thumbnail src and the name). Comparing those keeps the
    // widget stable across a rebuild that did not change the chip.
    return (
      a.token === b.token &&
      a.alt === b.alt &&
      a.figureRole === b.figureRole &&
      a.entry?.slug === b.entry?.slug &&
      a.entry?.ext === b.entry?.ext &&
      a.entry?.displayName === b.entry?.displayName
    );
  }

  toDOM(): HTMLElement {
    const { entry, slug, hash, alt, figureRole } = this.match;
    const chip = document.createElement('span');
    chip.className = 'cm-cairn-media-chip';
    chip.setAttribute('aria-hidden', 'true');

    if (entry) {
      const img = document.createElement('img');
      img.className = 'cm-cairn-media-thumb';
      img.src = publicPath(entry.slug, entry.hash, entry.ext, 'slug');
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      chip.appendChild(img);
    }

    const name = document.createElement('span');
    name.className = 'cm-cairn-media-name';
    // The display name from the library, or the token slug as a neutral fallback when the hash is
    // unknown to this entry's library (an image referenced from a branch whose manifest the read
    // missed); the bare hash stands in when even the slug is absent.
    name.textContent = entry?.displayName || slug || hash;
    chip.appendChild(name);

    if (figureRole !== null) {
      // The figure/role pill: the role name (or "figure" for the measure default), in the directive
      // accent language. It is present only inside a :::figure, so the visible chip and the source
      // agree (the no-hidden-state rule). aria-hidden like the rest of the chip; the source `{.wide}`
      // carries the meaning for assistive tech.
      const pill = document.createElement('span');
      pill.className = 'cm-cairn-media-role';
      pill.setAttribute('aria-hidden', 'true');
      pill.textContent = figureRole;
      chip.appendChild(pill);
    }

    if (alt.trim() === '') {
      // The needs-alt marker: a glyph and a label, never hue alone (the spec accessibility rule). The
      // title gives the same words on hover, and the chip's name span already conveys which image.
      const flag = document.createElement('span');
      flag.className = 'cm-cairn-media-needs-alt';
      flag.title = 'This image has no alt text. Add a description for screen readers.';
      // A small warning glyph ahead of the label, marked decorative so the label carries the meaning.
      const glyph = document.createElement('span');
      glyph.className = 'cm-cairn-media-needs-alt-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = '⚠'; // warning sign
      const label = document.createElement('span');
      label.textContent = 'Needs alt';
      flag.appendChild(glyph);
      flag.appendChild(label);
      chip.appendChild(flag);
    }

    return chip;
  }

  // The chip carries its own interactive intent only through the surrounding atomic range; clicks on
  // it should fall through to CodeMirror so the caret lands beside the atomic token.
  ignoreEvent(): boolean {
    return false;
  }
}

/** Scan one line's text for media image tokens, mapping each to its document offsets and resolving its
 *  library entry. lineFrom is the line's document start, so the match offsets become absolute. */
function matchesInLine(text: string, lineFrom: number, library: MediaLibrary): MediaImageMatch[] {
  const out: MediaImageMatch[] = [];
  MEDIA_IMAGE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MEDIA_IMAGE.exec(text)) !== null) {
    const alt = m[1] ?? '';
    const token = m[2] ?? '';
    const ref = parseMediaToken(token);
    if (!ref) continue; // a media:-prefixed but malformed token is left as plain source
    // The URL token sits between the '(' after the alt's ']' and the closing ')'. The match starts
    // at the '!', and the token's offset within the match is the index of the '(' plus one.
    const tokenStart = m.index + m[0].indexOf('(' + token + ')') + 1;
    const from = lineFrom + tokenStart;
    const to = from + token.length;
    out.push({
      alt,
      from,
      to,
      token,
      slug: ref.slug,
      hash: ref.hash,
      entry: library[ref.hash] ?? null,
      figureRole: null,
    });
  }
  return out;
}

/** Every media image match across the editor's visible ranges, in document order, each carrying its
 *  enclosing figure role. One {@link fenceScan} over the whole document feeds the cheap per-token
 *  figure detection (no remark parse on the per-rebuild chip path); the visible lines are scanned
 *  for tokens, then each token's line index drives {@link figureRoleAtLine}. */
function visibleMatches(view: EditorView, library: MediaLibrary): MediaImageMatch[] {
  const lines = view.state.doc.toString().split('\n');
  const scan = fenceScan(lines);
  const out: MediaImageMatch[] = [];
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const role = figureRoleAtLine(scan, lines, line.number - 1);
      for (const match of matchesInLine(line.text, line.from, library)) {
        out.push({ ...match, figureRole: role });
      }
      pos = line.to + 1;
    }
  }
  return out;
}

/** Replace decorations for each visible media image's reference token: the chip widget over the URL
 *  token, the alt left untouched. The same spans seed the atomic-range set. */
function buildMediaDecorations(view: EditorView, library: MediaLibrary): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const match of visibleMatches(view, library)) {
    builder.add(match.from, match.to, Decoration.replace({ widget: new MediaChipWidget(match) }));
  }
  return builder.finish();
}

/** The atomic ranges for the visible media reference tokens: a caret or selection edit treats each
 *  token as one unit, so a stray keystroke replaces the whole reference rather than corrupting a hex
 *  digit. Built from the same matches the decorations use, so the two never disagree. */
function buildAtomicRanges(view: EditorView, library: MediaLibrary): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (const match of visibleMatches(view, library)) {
    ranges.push(Decoration.replace({}).range(match.from, match.to));
  }
  return Decoration.set(ranges, true);
}

/**
 * The media: source decoration extension over a projected library. Each `![alt](media:slug.hash)`
 * token in the source shows the asset's thumbnail and display name in place of the reference, the
 * reference is atomic, and an empty alt carries a persistent needs-alt marker. The library is the
 * `mediaLibrary` projection EditData carries; MarkdownEditor holds it in a compartment and rebuilds
 * this extension when the library changes, so a just-uploaded image decorates once it is in the
 * library. An empty library is valid: nothing decorates.
 */
export function cairnMediaDecorations(library: MediaLibrary): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      atomic: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildMediaDecorations(view, library);
        this.atomic = buildAtomicRanges(view, library);
      }
      update(update: ViewUpdate) {
        // A doc edit changes the tokens; a viewport change brings new lines into view. A caret move
        // alone changes neither, so it is not a rebuild trigger here.
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildMediaDecorations(update.view, library);
          this.atomic = buildAtomicRanges(update.view, library);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
      // atomicRanges reads the plugin's own atomic set, so the unit the caret skips matches the
      // decorated tokens exactly.
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none),
    },
  );
  return plugin;
}
