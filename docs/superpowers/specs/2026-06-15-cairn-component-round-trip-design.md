# Round-trip editing of a placed component: design

> **Status:** Design, 2026-06-15. Builds directly on the component-picker live-preview pass
> (`2026-06-15-cairn-component-picker-design.md`), bundled into the same release. The deferral this
> closes was recorded in that spec's out-of-scope list.

## Goal

Let an editor re-open a component already placed in the document back into the same guided form,
change it, and write it back, instead of hand-editing the directive markup. This is the round-trip
the git-backed editors offer and the cairn picker deferred to v1.

## Why it is reachable now

The substrate is already built. `serializeComponent` and `parseComponent` are a reversible pair with
a tested identity suite. `caretContainerRange(scan, caretLine)` returns the inclusive line span of the
container around the cursor without re-parsing. The picker's guided form (`ComponentForm`) already
seeds from `ComponentValues` and binds them out. Round-trip wires these together: find the block at
the cursor, parse it into the form, and on save serialize the form back over the block's range.

## The correctness hazard, and the safety gate

`valuesFromRoot` reads only the attributes and slots the component *declares*. A block a person typed
by hand can carry more than the schema models: an attribute the schema does not list, a child
directive the def does not declare, or slot content richer than the form's fields represent. Parsing
such a block into the form and re-serializing would silently drop that content. This is the exact
failure that corrupts content in Decap and TinaCMS, and the picker research named it.

So guided edit is offered only when it is provably lossless for that specific block. Before enabling
the edit affordance, the engine runs a `componentRoundTripSafety(blockMarkdown, def)` check that
passes only when all hold:

- every attribute key present on the block is declared in the schema (`parseRawAttributeKeys` is a
  subset of the def's attribute keys),
- the block carries no child container directive the def does not declare as a slot,
- the round-trip is idempotent: `parse → serialize → parse` yields the same values.

When the check passes, guided edit is safe and offered. When it fails, the edit affordance is
disabled with a plain reason, and the editor edits the block as markdown by hand. The engine never
silently rewrites a block it cannot round-trip. A guided edit that does pass re-emits the canonical
serialization, so formatting may normalize (canonical fences, dash bullets, attribute order) while
content is preserved; this is expected and documented.

## The flow

- **Detect.** As the cursor moves, the editor computes the innermost container around it
  (`fenceScan` + `caretContainerRange`), reads the opener's directive name, and resolves it against
  the registry. When the name is a known component with a schema and the safety check passes, the
  caret is "on an editable component."
- **Enter.** A toolbar control reads "Edit block" and enables only when the caret is on an editable
  component (its label in the tooltip). Activating it opens the picker dialog straight into the
  configure step for that component, the form seeded from `parseComponent` of the block, the header
  breadcrumb reading "Edit" rather than "Insert", and the primary button reading "Update".
- **Preview.** The same opt-in live preview runs in edit mode, so the editor sees the change as they
  make it.
- **Write back.** Update serializes the form and replaces the block's range (the editor exposes a
  range-replace seam beside the existing insert-at-cursor), then closes and restores the cursor. The
  catalog is one Back step away, the same as insert.

## Engine and editor responsibilities

- **`markdown-directives.ts`** gains a small helper to read a container opener's directive name from
  its line (the scan already classifies openers), so the editor can name the block at the cursor.
- **`MarkdownEditor.svelte`** exposes two seams beside `registerInsert`: a reader that returns the
  component at the caret (`{ name, markdown, from, to }` or null, computed from the scan and the
  caret) reported reactively as the caret moves, and a `(from, to, text) => void` range replace.
- **`component-grammar.ts`** gains `componentRoundTripSafety`. The parse and serialize functions are
  unchanged.
- **`ComponentInsertDialog` / `ComponentForm`** gain an edit mode: an `editComponent(def, values,
  range)` entry that skips the catalog, seeds the form, labels the header and button for editing, and
  on submit calls `onUpdate(markdown)` instead of `onInsert`.
- **`EditPage.svelte`** holds the caret-component state, renders the "Edit block" toolbar control
  gated on the safety check, and wires Update to the range-replace seam.

## Scope and boundaries

- In scope: guided re-edit of a single placed component, the safety gate, the toolbar affordance, the
  range replace, the live preview in edit mode, and the showcase exercising an edit.
- Out of scope: editing a nested component inside another, a visual block-select gesture (the toolbar
  affordance is the v1 entry), and bulk edits. The master-detail rail and the slash-trigger remain
  deferred from the picker spec.

## Testing strategy

- Unit (node): `componentRoundTripSafety` passes a canonical block and an authored-but-equivalent
  block; it fails a block with an unknown attribute, with an undeclared child directive, and with a
  non-idempotent parse. `parseComponent` of an authored block recovers the right values, and
  `serialize(parse(block))` preserves content.
- Component (browser): the dialog edit mode seeds the form from values, labels the header/button for
  editing, and calls `onUpdate` with the serialized markdown; the toolbar "Edit block" control is
  disabled off a component and when the safety check fails, enabled on a safe one.
- Editor (unit/component): the caret-component reader returns the right name and range inside a
  container and null outside; the range replace overwrites the right span.
- E2E (showcase): place a callout, move the cursor into it, Edit block, change the title, Update, and
  assert the directive in the source changed and the rendered output followed.

## Release

Bundled with the picker pass into one release. Round-trip is a new capability an editor can newly
use, so the bundled release is a minor (`0.57.0`), not the picker's standalone patch. The changelog
entry folds round-trip into the same release notes, carrying the same research framing.
