# Component insert picker, redesigned around a live preview: design

> **Status:** Design, mockup-first. Approved direction after a precedent survey, a deficiency hunt,
> and an adversarial UI/UX critique (all 2026-06-15). The mockup is
> `docs/internal/design/2026-06-15-component-picker-mockup.html` (rev. 2, the critique folded in).
> Builds on the shipped component registry and the editor's existing preview machinery.

## Goal

Make cairn's "Insert component" picker the best in its class for a non-technical editor, and grow
the `ComponentDef` contract so a developer can declare the things that make it good. The picker and
the contract are one design: the best picker features need declaration fields that do not exist yet.

The optimization target is the non-technical editor. The win they should feel is seeing what a
component produces while they fill it in, instead of guessing from a name.

## What exists today

A component is declared once through `defineRegistry({ components: ComponentDef[] })`, and the same
def drives the parser, the rehype render, and the insert picker. The picker is a native `<dialog>`:
a single-column list of components (label, description, intended-use); picking one replaces the list
with a schema-driven fill form; Back returns. It is insert-only, the catalog is small (a handful per
site), and the form writes serialized directive markdown at the cursor through the editor's
`registerInsert` seam.

## What the research found

Two research arms ran. The first surveyed how comparable systems build their inserters (Gutenberg,
Sanity, Wagtail, Payload, Contentful, Builder, plus the git-backed and document tools). The second
hunted documented complaints from both audiences, the editor and the developer, and paired each with
a correction.

Five pains recur across systems that share no code. cairn already beats four of them by its existing
architecture:

- **Insert blind.** Editors pick and configure a block without seeing the result. Payload editors:
  "nobody knows what they do." Sanity renders "Untitled." This is the one nobody has solved, and it
  is cairn's opening.
- **Round-trip corruption.** Systems that let you re-edit a block often mangle content (TinaCMS
  wipes nested files; Decap re-renders the wrong component). cairn parses real directives, so a
  lossless re-edit is achievable. Out of scope here, a separate pass.
- **Schema and render drift.** Two declarations that must stay in sync (Sanity, Tina). cairn's
  single `ComponentDef` co-locates the render and the schema, so the drift class is designed out.
- **Migration pain.** JSON-in-a-database content makes a field rename a 197 KB migration (Wagtail).
  cairn stores markdown in git, so that class cannot occur.
- **Picker poverty.** No per-item icon, no grouping, no preview, validation not enforced in the
  form. These are gaps cairn closes with additive contract fields.

The full reports, with cited URLs, are summarized in the changelog at release time (a standing
requirement for this work: the release notes carry the research and the case for why the picker
beats the alternatives).

## The design

### The preview is the differentiator, and it is opt-in and honest

The right pane renders the configured component through the site's own `render()` into a sandboxed
iframe, the same machinery the edit page already uses for its preview tab. Three rules keep it
honest, all from the adversarial critique:

- **Opt-in, not always-on.** The pane appears at the configure step only when a component declares a
  `preview`. Browsing the catalog stays one column, and a component with no `preview` keeps today's
  single-column form. A second pane over a three-component catalog, or beside a component with no
  meaningful visual, is dead weight.
- **It settles, it does not pulse.** The site render path is async and not free, so the preview is
  debounced with a latest-wins guard, reusing the edit page's existing pattern and one persistent
  iframe whose `srcdoc` is replaced. The status chip reads "Settling" then "Settled," never a "live"
  claim the implementation cannot keep.
- **It never lies.** The pane has three real states. A required field still empty shows the skeleton
  with the empty region called out, never a fabricated "Untitled" finished block. A render that
  throws shows a render-failed surface and keeps the form intact. Otherwise it shows the settled
  result.

### The flow

The catalog is one column: components under one-word group headings in declaration order, each row a
glyph, a label, a description, and an intended-use line. Search appears above the list only past a
named threshold (about eight components); below that it is noise. Picking a component opens its form,
two panes when it declares a `preview`, one column otherwise. One Back step returns to the catalog.
Below the breakpoint the preview stacks beneath the form, so the modal stays usable on a phone.

A persistent catalog rail at the configure step (true master-detail, so switching components skips
the Back step) is deferred. It earns its width only past a large catalog, which no current site has.

### Validation honored in the form

Required fields carry an asterisk and `aria-required`, and an empty one blocks Insert with inline
text naming the field, never a build-time or console-only failure. Validation runs client-side in the
admin and never gates Insert at build.

## The contract additions

All additions are optional, so existing site defs compile unchanged. None is a breaking change.

On `ComponentDef`:

- `icon?: string` is a glyph from the site `IconSet`, shown beside the label in the picker.
- `group?: string` is a category heading. Components order by declaration within a group, never
  alphabetically.
- `hidden?: boolean` omits a component from the top-level picker (for a nested-only or future
  round-trip-only component). It is a pure filter applied after the actionable filter, one predicate,
  one test.
- `preview?: { attributes?: Record<string, string | boolean>; slots?: Record<string, string | string[]> }`
  is a structured sample. The picker seeds the form with it and renders it through
  `serializeComponent` then `render`, the same path a real insert takes, so the preview is provably
  faithful and a reference gate can validate it. There is no raw-markdown form: one path, less to
  test. Declaring `preview` is also what opts the component into the two-pane layout.

On `AttributeField`:

- `pattern?: { source: string; message: string }` is the primary inline-validation case, a RegExp
  source and the message to show.
- `validate?: (value: string | boolean, all: ComponentValues) => string | null` is the escape hatch
  for a cross-field rule. It must be pure and browser-safe, and the picker wraps its call in
  try/catch so an author's throw never crashes the modal.

On `SlotDef`:

- `itemLabel?: (item, i) => string` derives a repeatable row's label, so a list of items is not a
  column of blanks. It falls back to `${label} ${i + 1}` when it returns nothing.

## Scope and boundaries

- In scope: the picker redesign (catalog, opt-in two-pane configure, the honest preview states), the
  contract additions above, validation honored in the form, and the showcase declaring `icon`,
  `group`, and `preview` so the path is exercised end to end.
- Out of scope: round-trip editing of an existing block (a separate pass, gated on a tested lossless
  serializer), the master-detail catalog rail, browse-time preview-on-highlight, and a `/` slash
  trigger inside the editor. Each is noted for later, none blocks this work.

## Testing strategy

- Unit (node): the new contract fields parse and default correctly; `preview` seeds `ComponentValues`
  and serializes through the existing path; `pattern` and `validate` produce the expected inline
  errors; `itemLabel` falls back when empty; the `hidden` filter excludes the right defs.
- Component (browser): the catalog groups and lists with glyphs; picking opens the form; a
  `preview`-declaring component shows two panes and a non-declaring one shows a single column; a
  required-empty field disables Insert and shows the inline error; the preview shows the incomplete
  and failed states.
- Render agreement: a component's `preview` serialized and rendered through `build()` matches the
  expected HTML, proving the preview path and the insert path agree.

## Release notes

The changelog entry summarizes the research (the precedent survey and the deficiency hunt across the
comparable systems) and states plainly how cairn's picker is built to beat them: the live preview no
competitor offers, grounded on the render pipeline cairn already owns, plus the additive contract
fields that close the picker-poverty gaps. This is a requirement of the work, not an afterthought.
