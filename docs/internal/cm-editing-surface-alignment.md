# Aligning the CodeMirror editing surface (framing for a future pass)

> The pre-spec framing for a dedicated pass to bring cairn's in-editor CodeMirror surfaces into the
> Warm Stone design language **without** making CodeMirror upgrades expensive. This is **not** part of
> the admin idiomatic-re-expression sweep (Phases 2 to 6), which deliberately walls the CodeMirror
> content theme as a Tier-2 hard floor and does not touch it. This is its own initiative; start it with a
> brainstorm and a spec. Captured 2026-06-30 from a design discussion.

## The problem

Some surfaces inside the editor act as **chrome** (popovers, menus, panels) but are CodeMirror's own
stock widgets dressed in a thin `EditorView.theme` patch, so they inherit CodeMirror's default layout,
button chrome, and typography and read as a different design language than the rest of the admin.

The clearest case is the **spellcheck suggestion popover**. It is CodeMirror's built-in `@codemirror/lint`
tooltip: a `.cm-tooltip-lint` box holding the message (`.cm-diagnostic-info`) and the suggestion / "Add to
dictionary" / "Ignore" buttons (`.cm-diagnosticAction`), which CodeMirror renders itself from the
`Diagnostic.actions` array (`src/lib/components/spellcheck.ts:239-272`). The only cairn input is four theme
rules (`spellcheck.ts:477-503`). So the popover inherits CodeMirror's default padding, positioning,
box-shadow, a hardcoded `0.5rem` radius, CodeMirror's inline button chrome, and the editor's iA Writer Mono
face, none of which is the admin popover recipe (`role="dialog"`, DaisyUI `.btn`, `--cairn-card-border`,
`--cairn-shadow`, `--radius-box`, `--font-body`). Every other in-editor decoration deliberately escapes the
mono face by setting `font-family: var(--font-body)` (the media chip and figure pill,
`MarkdownEditor.svelte:339, 383`); the spellcheck tooltip never does, so it is the one in-editor surface
still wearing CodeMirror's clothes. Its real sibling, `MediaInsertPopover.svelte`, is a recipe-built Svelte
`role="dialog"` and is the target look.

The misspelling **underline** (`.cm-lintRange-info`, a `text-decoration: underline wavy`) is a separate,
lesser issue: it is a decoration on the content, so theming it is correct; it just needs its color and
weight tuned, not re-architected.

## The principle: the upgrade tax is styling CodeMirror's internals, not customizing CodeMirror

This is the same North Star as the admin sweep: what breaks on a framework major is overrides written
against the framework's internals. For CodeMirror, the internals are the `.cm-*` class names of its
built-in UI (`.cm-tooltip-lint`, `.cm-diagnosticAction`, the autocomplete and search-panel classes). Their
package can rename or restructure them across a major. So skinning them harder shrinks the visual drift but
makes the upgrade **more** fragile, not less.

CodeMirror's **public** surface is the stable contract: the `Tooltip` / `showTooltip` API, `ViewPlugin`,
`StateField`, decorations, and panels. The way to align the look while keeping upgrades cheap is therefore
to **render cairn's own recipe DOM through the public extension points, instead of theming CodeMirror's
built-in widgets.** Then a chrome popover *is* a cairn popover (its markup, its `.btn`, its shadow, its
font), and the only CodeMirror coupling is a stable positioning API.

## The organizing decision: classify each CodeMirror surface as "writing surface" or "chrome"

Draw the line once and the whole editing surface gets one rule.

- **Writing surface** (theme it via `EditorView.theme` against the `.cm-content` content classes, the
  documented and stable theming target; keep the current approach, idiomatic): `.cm-content`, syntax
  highlight, the directive rails, the fold gutter, selection, the cursor, and the lint underline. This is
  legitimately CodeMirror's text world.
- **Chrome that CodeMirror happens to provide** (render cairn's own recipe DOM via the public API, do not
  skin the built-in): the spellcheck lint suggestion popover, autocomplete, the search / replace panel, any
  hover card. These should read as cairn chrome.

## What a future pass would deliver

1. **Classify every in-editor CodeMirror surface** as writing-surface or chrome, per the rule above.
2. **Replace the skinned built-in chrome with recipe-built DOM via CodeMirror's public API**, the spellcheck
   lint popover first: render the admin popover recipe (`--font-body`, DaisyUI `.btn`, `--cairn-shadow`,
   `--radius-box`, `--cairn-card-border`). Investigate the cleanest public hook (the lint `Diagnostic`'s
   `renderMessage`, or a custom tooltip source via `showTooltip` bridged to the lint state) and pick the one
   that keeps the coupling on stable API, not internal classes.
3. **Keep the writing-surface theme**; tune the underline's color and weight.
4. **Inventory the `.cm-*` INTERNAL selectors the theme touches.** That list is the fragility surface, and
   the pass's success metric is shrinking it toward only the content classes.
5. **Wire the upgrade rehearsal** to bump the lint, autocomplete, and search packages independently of
   `@codemirror/state` / `view` (they version separately), and to re-validate the public-API calls plus the
   recipe popovers, mirroring the admin sweep's upgrade rehearsal.

## Boundary and sequencing

Separate from the admin de-customization sweep (which walls the CodeMirror theme as Tier-2 and must not touch
it). Start with a brainstorm to settle the writing-surface/chrome line and the public-API pattern for the
popover, then a spec. The locked amber underline token (`--cairn-warning-ink`, reserved so it never collides
with tidy's `--cairn-error-ink` red) and the deliberate, documented choice of `@codemirror/lint` as the
surfacing *mechanism* both stay; only the un-recipe'd visual finish and the internal-class coupling change.
