# Admin Guided-Insert Form (Plan 2 of 3): Design

## Goal

Give a non-technical editor a guided way to insert a site component without knowing directive
syntax. The author clicks Insert, picks a component from a list that shows its description and
intended use, fills a form generated from the component's schema, and the validated directive
markdown lands at the cursor. This is the admin UI half of the component registry initiative. The
engine grammar and schema it drives landed in Plan 1.

This design refines the "guided insert form" section of the parent initiative spec
(`2026-05-31-cairn-site-components-design.md`) with the implementation decisions settled in
brainstorming. The parent spec stays the initiative-level source of truth.

## Scope

Plan 2 ships the guided-insert form in cairn-cms: the admin UI plus the engine wiring that turns a
filled form into validated, inserted markdown. It is engine and admin-UI only.

Out of scope, by decision:
- **Per-site migration** stays Plan 3. No reference site moves its `ComponentDef` array to the new
  schema in this plan, so a fully-schema'd showcase component drives and tests the form.
- **Server-side body validation** (scanning a saved document for every component directive and
  rejecting an invalid save) is deferred to its own later pass. The insert form validates before it
  inserts, and the build-time check already exists, so the only remaining gap is a hand-edit after
  insert, which the build catches.
- Round-trip editing of an existing directive, multi-field repeatable items, and nested components
  stay past v1, as the parent spec already records.

## Architecture

Three new admin components and one new prop thread, all building on the Plan 1 engine surface
(`emptyValues`, `serializeComponent`, `validateComponent`) and the editor's existing
`registerInsert` seam.

### Components

- **`ComponentInsertDialog.svelte`** (new). Owns the Insert trigger button and a DaisyUI
  `<dialog class="modal">`. The dialog holds two states: a **picker** that lists each insertable
  component by label with its description and intended use, and, after a pick, the **fill form**. A
  Back control returns from the form to the picker; Cancel and the close control dismiss the dialog.
  This replaces the direct-insert behavior currently in `ComponentPalette.svelte`. The old palette
  collapses into this dialog's trigger, so the editor header keeps one Insert control.
- **`ComponentForm.svelte`** (new). Renders one component's schema into form fields and holds the
  working `ComponentValues` as local `$state`, seeded by `emptyValues(def)`. It owns its own field
  rendering rather than sharing a field abstraction with the frontmatter aside, because the two field
  taxonomies differ enough that a shared component would be premature. It matches the DaisyUI idiom
  already used in `EditPage.svelte`.
  - Attribute fields by `FieldType`: `text` is an input, `select` is a `<select>` over `options`,
    `boolean` is a checkbox, `icon` is the icon picker below.
  - Slot fields by `SlotKind`: `inline` is a single-line input, `markdown` is a textarea,
    `repeatable` is an add-and-remove list of single-line item inputs bound to a `string[]`.
- **`IconPicker`** (a small piece, inside `ComponentForm` or its own file). Renders a visual choice
  over the site's icon glyphs. See the icon section.

### IconSet plumbing

The icon picker needs the site's `IconSet`, the glyph-name-to-SVG map the renderer already owns. It
threads as an optional prop from the adapter through `EditPage` to `ComponentInsertDialog` to
`ComponentForm`. When the IconSet is absent, an `icon` field degrades to a plain text input, so a
site that defines no icons still works.

## Data flow

1. The author opens the dialog and picks a component. `emptyValues(def)` seeds a fresh
   `ComponentValues`.
2. The author fills the form. Field edits update the local `ComponentValues`.
3. On Submit, the form runs `serializeComponent(def, values)` then `validateComponent(md, def)`.
   - Invalid: the verdict's field-keyed errors map back onto their inputs (an attribute key or a slot
     name keys both the error and the field), errors show inline, and the dialog stays open.
   - Valid: the form calls `insert(md)` through `registerInsert`, the dialog closes, and the live
     preview re-renders from the changed body.

Reusing `validateComponent` as the form's validator keeps one source of validation truth. The UI does
not reimplement the required, select-option, or unknown-key rules.

## The icon field and optionality

An `icon`-typed attribute renders a visual picker over the IconSet glyphs, so the author chooses by
sight. Optionality is the schema's `required` flag, with no special grammar.

- When the icon field is not `required`, the picker includes a None choice that clears the value. An
  empty icon serializes to omitted, which `validateComponent` accepts.
- When the icon field is `required`, None is absent, and an empty selection fails validation with the
  field's required error.

So a component can be icon-mandatory or icon-optional purely through `required` on its icon attribute.

## The schema-versus-template transition

The palette handles both def shapes during the migration window between Plan 2 and Plan 3:

- A def with a **schema** (`attributes` or `slots` defined) opens the guided form.
- A def with **only `insertTemplate`** and no schema inserts its template directly at the cursor, the
  behavior shipped before this plan.
- A def with neither is not insertable and is filtered out of the picker list.

This resolves the Plan 1 review finding that an optional `insertTemplate` could render a no-op
list item. A def is shown when it is actionable by one path or the other.

## The showcase example

Plan 2 adds one fully-schema'd component to the `examples/showcase` registry, a card or call-to-action
carrying attributes, a title and body, and a repeatable slot. It drives the form, anchors the browser
tests, and serves as the worked demo, without waiting on Plan 3's real-site migration.

## Testing

- **Component (browser).** The picker lists components with their descriptions. Picking a component
  renders the fields its schema declares. The repeatable add-and-remove list adds and removes items.
  An invalid submit shows inline field errors and inserts nothing. A valid submit inserts the expected
  directive markdown and the preview updates. The icon picker offers None only when the field is
  optional. A template-only def still inserts directly.
- **Unit (node).** Any pure value-mapping helper extracted from the form (for example a function that
  reconciles form state to `ComponentValues`) gets table tests.
- **Render agreement** stays a Plan 3 concern. It needs a `build()` that reads named slots, which Plan
  3 introduces.

## Boundaries

`build()` is untouched in this plan. The `parseComponent` round-trip seam exists from Plan 1 but the
guided round-trip edit UI is not built. This is a breaking-change initiative on the `ComponentDef`
surface, but Plan 1 already absorbed the type change, so Plan 2 adds UI without a further version
break beyond what Plan 1 set.
