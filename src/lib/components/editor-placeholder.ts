// The optimistic image placeholder. While an upload runs, the editor shows the image the author is
// placing right where the caret sits, with a determinate progress bar, so there is no dead wait. The
// placeholder is a WIDGET decoration at a position, NEVER doc text: the source markdown is untouched
// until the upload resolves, so a failed or session-expired upload leaves the source exactly as it
// was (the 2b open-risk-2 acceptance bar). On resolve the placeholder is removed and the real
// `![alt](media:slug.hash)` text is inserted in ONE transaction, so the surface never shows a frame
// with neither the placeholder nor the committed text.
//
// Client-only like editor-highlight, editor-modes, editor-folding, and editor-media: MarkdownEditor
// reaches this module through a dynamic import, so the static @codemirror imports here never enter a
// server bundle (guarded by the editor-boundary test, whose DYNAMIC_ONLY list names this file).
//
// The architecture mirrors editor-folding: a StateField<DecorationSet> of active placeholders driven
// by StateEffects (add, set-progress, remove). The field maps positions across doc changes
// (deco.map(tr.changes)) and tracks each placeholder's mapped position, so concurrent typing never
// strands a placeholder. The seam ops (begin, progress, resolveTo, cancel) dispatch the effects; the
// resolve op dispatches the remove effect AND the real text insert in one transaction.
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';
import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { insertImage as insertImageFormat } from './markdown-format.js';

/** One active placeholder's data: its stable id, the object URL for the thumbnail, and the upload
 *  progress as a 0..1 fraction. The widget reads this to render the thumbnail and the bar. */
interface PlaceholderData {
  id: number;
  url: string;
  fraction: number;
}

// The effects that drive the placeholder field. add lands a placeholder at a position; set-progress
// updates its bar; remove takes it out. resolveTo and cancel both end in a remove (resolveTo pairs
// the remove with the text insert in its dispatch; cancel dispatches only the remove).
const addPlaceholder = StateEffect.define<{ id: number; pos: number; url: string }>();
const setProgress = StateEffect.define<{ id: number; fraction: number }>();
const removePlaceholder = StateEffect.define<{ id: number }>();

// The widget: a small thumbnail from the local object URL plus a determinate progress bar, in the
// editor's accent visual language (the same accent tint the media chip uses). aria-live polite so a
// screen reader hears the upload progress without being interrupted. The bar is a real <progress> so
// the determinate value is conveyed natively.
class PlaceholderWidget extends WidgetType {
  constructor(readonly data: PlaceholderData) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof PlaceholderWidget &&
      other.data.id === this.data.id &&
      other.data.url === this.data.url &&
      other.data.fraction === this.data.fraction
    );
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-cairn-media-placeholder';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    const percent = Math.round(this.data.fraction * 100);
    wrap.setAttribute('aria-label', `Uploading image, ${percent} percent`);

    const img = document.createElement('img');
    img.className = 'cm-cairn-media-placeholder-thumb';
    img.src = this.data.url;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    wrap.appendChild(img);

    const bar = document.createElement('progress');
    bar.className = 'cm-cairn-media-placeholder-bar';
    bar.max = 1;
    bar.value = this.data.fraction;
    wrap.appendChild(bar);

    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/** The active placeholders as a decoration set plus the per-id position map, so a resolve can find
 *  the mapped position to insert at and the field can rebuild after a position shift. */
interface PlaceholderState {
  set: DecorationSet;
  // Each active placeholder's current data and its mapped document position.
  items: Map<number, { data: PlaceholderData; pos: number }>;
}

function buildSet(items: Map<number, { data: PlaceholderData; pos: number }>): DecorationSet {
  // Sort by position so the decoration set receives ascending ranges (RangeSet requires it).
  const sorted = [...items.values()].sort((a, b) => a.pos - b.pos);
  return Decoration.set(
    sorted.map((it) => Decoration.widget({ widget: new PlaceholderWidget(it.data), side: 1 }).range(it.pos)),
  );
}

const placeholderField = StateField.define<PlaceholderState>({
  create() {
    return { set: Decoration.none, items: new Map() };
  },
  update(value, tr) {
    // Map every active placeholder's position across the change, so concurrent typing before a
    // placeholder shifts it rather than stranding it.
    let items = value.items;
    let changed = false;
    if (tr.docChanged) {
      const next = new Map<number, { data: PlaceholderData; pos: number }>();
      for (const [id, it] of items) next.set(id, { data: it.data, pos: tr.changes.mapPos(it.pos, 1) });
      items = next;
      changed = true;
    }

    for (const e of tr.effects) {
      if (e.is(addPlaceholder)) {
        const next = new Map(items);
        next.set(e.value.id, { data: { id: e.value.id, url: e.value.url, fraction: 0.1 }, pos: e.value.pos });
        items = next;
        changed = true;
      } else if (e.is(setProgress)) {
        const it = items.get(e.value.id);
        if (it) {
          const next = new Map(items);
          next.set(e.value.id, { data: { ...it.data, fraction: e.value.fraction }, pos: it.pos });
          items = next;
          changed = true;
        }
      } else if (e.is(removePlaceholder)) {
        if (items.has(e.value.id)) {
          const next = new Map(items);
          next.delete(e.value.id);
          items = next;
          changed = true;
        }
      }
    }

    if (!changed) return value;
    return { set: buildSet(items), items };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.set),
});

/** The seam the host drives: begin lands a placeholder and returns its id; progress moves its bar;
 *  resolveTo swaps it for the committed image text; cancel removes it leaving the source untouched.
 *  Mirrors the register-callback idiom MarkdownEditor uses for its other editor ops. */
export interface ImagePlaceholderApi {
  /** Land an optimistic placeholder at the current caret from a local object URL; returns its id. */
  begin(objectUrl: string): number;
  /** Update a placeholder's determinate progress bar to the given 0..1 fraction. */
  progress(id: number, fraction: number): void;
  /** Swap the placeholder for the committed `![alt](media:ref)` text in one transaction. */
  resolveTo(id: number, alt: string, ref: string): void;
  /** Remove the placeholder, leaving the source exactly as it was (the failure/expiry path). */
  cancel(id: number): void;
}

// A module-level id counter. Browser app code, so a monotone counter is the simplest stable id; it
// never crosses a process boundary, so collision is not a concern.
let nextId = 1;

/**
 * The placeholder extension: the StateField holding the active placeholders, their decorations, and
 * the position-mapping across doc changes. The host adds it to the initial editor state, then builds
 * the driving api with imagePlaceholderApi once the view exists.
 */
export function cairnImagePlaceholders(): Extension {
  return placeholderField;
}

/**
 * Build the api that drives the placeholders against one editor view. The host registers it through
 * registerImagePlaceholders; the insert popover calls begin, progress, resolveTo, and cancel.
 */
export function imagePlaceholderApi(view: EditorView): ImagePlaceholderApi {
  const api: ImagePlaceholderApi = {
    begin(objectUrl) {
      const id = nextId++;
      const pos = view.state.selection.main.head;
      view.dispatch({ effects: addPlaceholder.of({ id, pos, url: objectUrl }) });
      return id;
    },
    progress(id, fraction) {
      view.dispatch({ effects: setProgress.of({ id, fraction }) });
    },
    resolveTo(id, alt, ref) {
      const it = view.state.field(placeholderField).items.get(id);
      if (!it) return;
      // Insert the committed text at the placeholder's mapped position, and remove the placeholder,
      // in ONE transaction: the surface never shows a frame with neither the placeholder nor the
      // text. insertImageFormat over an empty doc yields the bare `![alt](media:ref)` token, escaping
      // a bracket in the alt the same way every other inline image insert does.
      const token = insertImageFormat('', 0, 0, alt, ref).doc;
      view.dispatch({
        changes: { from: it.pos, insert: token },
        effects: removePlaceholder.of({ id }),
        selection: { anchor: it.pos + token.length },
      });
    },
    cancel(id) {
      view.dispatch({ effects: removePlaceholder.of({ id }) });
    },
  };
  return api;
}
