// The tidy apply primitives (spec 2.5, Task 14). The author's original stays in the buffer until they
// accept: tidy never overwrites the document and asks for an undo. A StateField holds the change set
// and each change's disposition, and a decoration plugin shows the proposed edits IN PLACE over the
// untouched source. An insertion renders as a mark/widget showing the new text in --color-positive-ink
// (the inserted text is decoration CONTENT, never buffer text); a deletion renders as a strike-through
// over the original run in --cairn-error-ink (reserved for tidy deletions). The author sees exactly
// what tidy wants to remove, which is the safety contract.
//
// Client-only like editor-placeholder and editor-media: MarkdownEditor reaches this through a dynamic
// import, so the static @codemirror imports never enter a server bundle (the editor-boundary test's
// DYNAMIC_ONLY list names this file). The architecture mirrors editor-placeholder: a StateField over
// StateEffects, with positions mapped across doc changes so an accepted change shifts the others.
//
// Accept lands in ONE batched transaction. accept-fixes collects every named change into a single
// view.dispatch({ changes }), so the whole edit is one undoable step (the session-level "Undo tidy").
// accept-one dispatches that change alone; reject-one and reject-all change no text, leaving the
// original byte-identical.

import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
import { StateEffect, StateField, RangeSet, type Extension, type Range } from '@codemirror/state';
import type { Change } from './tidy-diff.js';

/** A change plus its live disposition and current mapped span. `pending` is undecided-in-the-buffer:
 *  it still carries decorations. `accepted` has been written (its edit dispatched), so it carries no
 *  decoration. `rejected` was dropped, so it also carries no decoration and never writes. The `from`
 *  and `to` are the change's current offsets, mapped across every accepted edit since tidy opened. */
interface TidyEntry {
	index: number;
	from: number;
	to: number;
	replacement: string;
	status: 'pending' | 'accepted' | 'rejected';
}

/** The tidy state: the entry per change keyed by its stable index. Empty when tidy is not open. */
interface TidyState {
	entries: Map<number, TidyEntry>;
}

// The effects that drive the field. enter seeds the change set (tidy opened); accept marks one or many
// changes accepted (their edits ride the SAME transaction); reject marks changes rejected; clear empties
// the set (tidy closed or reject-all). Accept and reject carry the index list so one effect covers the
// bulk action.
const enterTidy = StateEffect.define<Change[]>();
const markAccepted = StateEffect.define<number[]>();
const markRejected = StateEffect.define<number[]>();
const clearTidy = StateEffect.define<void>();

// The deletion widget: a zero-width marker is not enough, since the deletion's original text stays in
// the buffer; the strike-through mark below carries the visible deletion. This widget renders the small
// non-color marker that pairs with the color, so the deletion reads without relying on hue (WCAG 1.4.1).
// It sits at the start of the deleted run.
class DeletionMarkerWidget extends WidgetType {
	eq(other: WidgetType): boolean {
		return other instanceof DeletionMarkerWidget;
	}
	toDOM(): HTMLElement {
		const span = document.createElement('span');
		span.className = 'cm-cairn-tidy-del-marker';
		span.setAttribute('aria-hidden', 'true');
		span.textContent = '';
		return span;
	}
	ignoreEvent(): boolean {
		return true;
	}
}

// The insertion widget: the proposed new text shown as decoration CONTENT after the change's point in
// the buffer, so the source is untouched. It carries the addition color and a leading marker glyph so
// the insertion reads without hue alone. A pure insertion (from === to) and a replacement both render
// their insertion this way; the replacement also strikes the original run through the deletion mark.
class InsertionWidget extends WidgetType {
	constructor(readonly text: string) {
		super();
	}
	eq(other: WidgetType): boolean {
		return other instanceof InsertionWidget && other.text === this.text;
	}
	toDOM(): HTMLElement {
		const span = document.createElement('span');
		span.className = 'cm-cairn-tidy-ins';
		span.setAttribute('aria-hidden', 'true');
		span.textContent = this.text;
		return span;
	}
	ignoreEvent(): boolean {
		return true;
	}
}

// Build the decoration set for the pending entries. A deletion (a non-empty span) draws a strike-through
// mark over its run plus a leading marker widget. An insertion (replacement text) draws an insertion
// widget at the change's end point. A replacement does both: the original strikes through and the new
// text shows beside it. RangeSet requires ascending, side-ordered ranges, so the ranges are sorted.
function buildDecorations(state: TidyState): DecorationSet {
	const ranges: Range<Decoration>[] = [];
	for (const e of state.entries.values()) {
		if (e.status !== 'pending') continue;
		if (e.to > e.from) {
			// A deletion run: strike it through, and mark its start.
			ranges.push(Decoration.widget({ widget: new DeletionMarkerWidget(), side: -1 }).range(e.from));
			ranges.push(Decoration.mark({ class: 'cm-cairn-tidy-del' }).range(e.from, e.to));
		}
		if (e.replacement.length > 0) {
			// The proposed insertion, shown as decoration content after the (possibly struck) original.
			ranges.push(Decoration.widget({ widget: new InsertionWidget(e.replacement), side: 1 }).range(e.to));
		}
	}
	// Sort by from, then by startSide so a -1 marker precedes the run it leads and a +1 insertion follows.
	ranges.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
	return RangeSet.of(ranges, true);
}

const tidyField = StateField.define<TidyState>({
	create() {
		return { entries: new Map() };
	},
	update(value, tr) {
		let entries = value.entries;
		let changed = false;

		// Map every entry's span across a doc change (an accepted edit) so the remaining pending changes
		// shift with the text rather than stranding on stale offsets.
		if (tr.docChanged && entries.size > 0) {
			const next = new Map<number, TidyEntry>();
			for (const [i, e] of entries) {
				next.set(i, {
					...e,
					from: tr.changes.mapPos(e.from, 1),
					to: tr.changes.mapPos(e.to, -1),
				});
			}
			entries = next;
			changed = true;
		}

		for (const effect of tr.effects) {
			if (effect.is(enterTidy)) {
				const next = new Map<number, TidyEntry>();
				for (const c of effect.value) {
					next.set(c.index, { index: c.index, from: c.from, to: c.to, replacement: c.replacement, status: 'pending' });
				}
				entries = next;
				changed = true;
			} else if (effect.is(clearTidy)) {
				entries = new Map();
				changed = true;
			} else if (effect.is(markAccepted)) {
				const next = new Map(entries);
				for (const i of effect.value) {
					const e = next.get(i);
					if (e) next.set(i, { ...e, status: 'accepted' });
				}
				entries = next;
				changed = true;
			} else if (effect.is(markRejected)) {
				const next = new Map(entries);
				for (const i of effect.value) {
					const e = next.get(i);
					if (e) next.set(i, { ...e, status: 'rejected' });
				}
				entries = next;
				changed = true;
			}
		}

		if (!changed) return value;
		return { entries };
	},
	provide: (f) => EditorView.decorations.from(f, (v) => buildDecorations(v)),
});

/** The api the host drives over one editor view (spec 2.5). Mirrors imagePlaceholderApi: the host
 *  registers it through registerTidy, and the review surface calls it as the author works the list.
 *  Every accept lands as a CodeMirror transaction; reject and reject-all write no text. */
export interface TidyApi {
	/** Open tidy with the validated change set: seed the field, show the decorations. The buffer is
	 *  untouched; the originals stay until an accept writes. */
	enter(changes: Change[]): void;
	/** Accept one change: dispatch its replacement over its current span in one transaction and mark it
	 *  accepted. The other pending changes map across the edit. */
	acceptOne(index: number): void;
	/** Reject one change: mark it rejected so its decorations clear, leaving the original untouched. */
	rejectOne(index: number): void;
	/** Accept many changes (the bulk action) in ONE transaction: the whole edit is one undoable step.
	 *  The caller passes ONLY the indexes it has decided to keep; this never sweeps an index the caller
	 *  did not name, which is how Accept-fixes confines itself to objective hunks. */
	acceptMany(indexes: number[]): void;
	/** Reject every remaining pending change, leaving the document byte-identical. */
	rejectAll(): void;
	/** Close tidy: clear the field and the decorations. The buffer holds whatever the accepts wrote. */
	exit(): void;
}

/** The tidy extension: the StateField holding the change set and its decorations. The host adds it to
 *  the initial editor state (in its own compartment beside media and folding), then builds the driving
 *  api with tidyApi once the view exists. */
export function cairnTidy(): Extension {
	return tidyField;
}

/** Build the api that drives tidy against one editor view. The host registers it through registerTidy;
 *  the review surface calls enter, the per-hunk and bulk accept/reject, and exit. */
export function tidyApi(view: EditorView): TidyApi {
	// Dispatch the named changes' replacements over their CURRENT mapped spans in one transaction, mark
	// them accepted, and let the field map any remaining pending entries. The changes are read from the
	// field so they carry the live offsets, and they are sorted ascending (CodeMirror requires it).
	const applyIndexes = (indexes: number[]) => {
		const entries = view.state.field(tidyField).entries;
		const specs = indexes
			.map((i) => entries.get(i))
			.filter((e): e is TidyEntry => !!e && e.status === 'pending')
			.sort((a, b) => a.from - b.from)
			.map((e) => ({ from: e.from, to: e.to, insert: e.replacement }));
		if (specs.length === 0) return;
		view.dispatch({ changes: specs, effects: markAccepted.of(indexes) });
	};

	return {
		enter(changes) {
			view.dispatch({ effects: enterTidy.of(changes) });
		},
		acceptOne(index) {
			applyIndexes([index]);
		},
		rejectOne(index) {
			view.dispatch({ effects: markRejected.of([index]) });
		},
		acceptMany(indexes) {
			applyIndexes(indexes);
		},
		rejectAll() {
			const indexes = [...view.state.field(tidyField).entries.keys()];
			view.dispatch({ effects: markRejected.of(indexes) });
		},
		exit() {
			view.dispatch({ effects: clearTidy.of() });
		},
	};
}
