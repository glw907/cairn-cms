# Aligning the CodeMirror editing surface

> The framing for bringing cairn's in-editor CodeMirror surfaces into the Warm Stone design language
> **without** making CodeMirror upgrades expensive. This is **not** part of the admin
> idiomatic-re-expression sweep (Phases 2 to 6), which deliberately walls the CodeMirror content theme as
> a Tier-2 hard floor and does not touch it. Captured 2026-06-30 from a design discussion.

## Status (2026-06-30)

The suggestion popover, the clearest chrome-vs-writing-surface case below, **shipped in this pass**: see
"What shipped" for the design as built. The broader chrome-alignment vision this doc originally framed,
autocomplete and the search/replace panel rendered the same way, remains deferred; it is filed in
`ROADMAP.md` under `## Later` ("Editor accessibility hardening (beyond the suggestion popover)" and the
find/replace and autocomplete follow-ons). This doc stays the home for the writing-surface/chrome
principle and for that remaining scope.

## The problem

Some surfaces inside the editor act as **chrome** (popovers, menus, panels) but are CodeMirror's own
stock widgets dressed in a thin `EditorView.theme` patch, so they inherit CodeMirror's default layout,
button chrome, and typography and read as a different design language than the rest of the admin.

The clearest case was the **spellcheck suggestion popover**, before this pass. It was CodeMirror's
built-in `@codemirror/lint` tooltip: a `.cm-tooltip-lint` box holding the message and the suggestion /
"Add to dictionary" / "Ignore" buttons, rendered by CodeMirror itself from the `Diagnostic.actions` array.
The only cairn input was a handful of theme rules, so the popover inherited CodeMirror's default padding,
positioning, box-shadow, a hardcoded radius, its own inline button chrome, and the editor's iA Writer Mono
face, none of which was the admin popover recipe (DaisyUI `.btn`, `--cairn-card-border`, `--cairn-shadow`,
`--radius-box`, `--font-body`). Every other in-editor decoration deliberately escapes the mono face by
setting `font-family: var(--font-body)` (the media chip and figure pill); the spellcheck tooltip never
did, so it was the one in-editor surface still wearing CodeMirror's clothes. Its real sibling,
`MediaInsertPopover.svelte`, is a recipe-built Svelte `role="dialog"` and was the target look, though the
popover shipped without the modal semantics; see "What shipped" below for why.

The misspelling **underline** (`.cm-lintRange-info`, a `text-decoration: underline wavy`) is a separate,
lesser issue: it is a decoration on the content, so theming it is correct; it just needed its color and
weight tuned, not re-architected. That tuning also shipped in this pass (see below).

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
  skin the built-in): the spellcheck lint suggestion popover (shipped, see "What shipped" below),
  autocomplete, the search / replace panel, any hover card. These should read as cairn chrome.

## What shipped

The suggestion popover pass (spec `docs/superpowers/specs/2026-06-30-cairn-cm-integration-design.md`)
realized the writing-surface/chrome rule for the spellcheck and objective-error popover:

- **The recipe DOM replaces the built-in tooltip.** `cairnSuggestionPopover`
  (`src/lib/components/editor-suggestion-popover.ts`) is a pure `StateField` that maps the caret onto the
  diagnostic under it via the public `forEachDiagnostic`, and provides the resulting `Tooltip` through the
  public `showTooltip` facet. The `create` callback builds `.cairn-cm-suggest` DOM directly: a
  `role="group"` container, a `.cairn-cm-suggest__msg` message line, and a `.cairn-cm-suggest__actions`
  row of `.btn.btn-sm` buttons built from `Diagnostic.actions`. None of that DOM is CodeMirror's.
- **The built-in tooltip is suppressed, not left to collide.** `linter()`'s `tooltipFilter` returns `null`
  (not `[]`; @codemirror/lint 6.9.7 treats an empty array as truthy and still mounts an empty
  `.cm-tooltip-lint`) so only cairn's `showTooltip`-provided tooltip renders. `linter()` still owns the
  diagnostics themselves and the underline decoration.
- **The one sanctioned internal-class touch is neutralizing `.cm-tooltip`.** CodeMirror force-adds that
  class to every tooltip it mounts, cairn's included, and paints a border and background on it; the theme
  neutralizes it (`border: none`, transparent background, no padding) so the recipe DOM owns the surface.
  Everything else under `.cairn-cm-suggest*` is cairn's own class, not a CodeMirror internal.
- **The coupling floor is enforced, not just documented.** `npm run check:cm-internals`
  (`scripts/check-cm-internals.mjs`, wired into CI) reads an allowlist of writing-surface content classes
  plus the single `.cm-tooltip` chrome floor, and fails on any other `.cm-*` chrome class or a dynamically
  composed one. Any file under `src/lib/components` that mentions `.cm-` must be enumerated in the
  allowlist, so a new chrome touch cannot slip in silently.
- **One recipe serves two diagnostic kinds.** The popover renders `Diagnostic.message` and
  `Diagnostic.actions` generically, so it is not spellcheck-specific: the same DOM and theme back the
  objective-error popover's single Fix button.
- **An accessibility model the built-in tooltip never had.** The popover shows when the caret sits inside a
  diagnostic's range, without stealing focus. A visually hidden `aria-live="polite"` region announces the
  message, the suggestion count, and the key that opens the popover. `Alt-Enter` (not `Mod-.`, which is the
  Details panel's existing shortcut and would double-fire) moves focus into the popover's first button. A
  native `keydown` listener on the popover DOM, not a CodeMirror keymap, handles Escape and returns focus
  to `.cm-content`; a CodeMirror keymap lives on `contentDOM` and would never see a keydown fired from DOM
  outside it. The popover is `role="group"` with an `aria-label`, a non-modal labeled group of native
  buttons, not `role="dialog"` and not a focus trap (see the paragraph below for why it deliberately
  departs from `MediaInsertPopover`'s modal shape).
- **The underline token was tuned, not re-architected.** `--cairn-warning-ink` stays the locked color; the
  shipped tune is a 1px `text-decoration-thickness` and a `0.22em` `text-underline-offset`, both applied in
  `lockedUnderlineTheme` (`src/lib/components/spellcheck.ts`).

The popover deliberately does not copy `MediaInsertPopover`'s `role="dialog" aria-modal="true"` focus trap.
A modal fits an image-insert flow the editor deliberately opens and must dismiss; the suggestion popover is
ambient, tied to caret position, and should not compete with typing for focus. A non-modal labeled group
reached by `Alt-Enter` and announced by the live region is the simpler and more correct shape here; this is
a recorded spec deviation, not an oversight.

## What remains deferred

The rule above (theme the writing surface, render chrome through the public API) still governs the
surfaces this pass did not touch:

1. **Autocomplete and the search/replace panel** are still CodeMirror's stock chrome, skinned rather than
   replaced. Filed in `ROADMAP.md` under `## Later`.
2. **Editor accessibility hardening beyond the suggestion popover** ("Editor accessibility hardening
   (beyond the suggestion popover)" in `ROADMAP.md`) covers the keyboard and screen-reader path for those
   remaining surfaces, mirroring what this pass gave the popover.
3. **The upgrade rehearsal** should extend to bump the lint, autocomplete, and search packages
   independently of `@codemirror/state` / `view` (they version separately) and re-validate the public-API
   calls plus any new recipe DOM, mirroring the admin sweep's upgrade rehearsal. `check:cm-internals` is
   the standing regression gate; a future pass over autocomplete or search/replace should extend its
   allowlist the same way this pass did, not bypass it.

## Boundary and sequencing

Separate from the admin de-customization sweep (which walls the CodeMirror theme as Tier-2 and must not
touch it). The suggestion popover pass settled the writing-surface/chrome line and the public-API pattern
in practice; a future pass over autocomplete or search/replace should start from a brainstorm scoped to
those surfaces rather than re-deriving the pattern from scratch. The locked amber underline token
(`--cairn-warning-ink`, reserved so it never collides with tidy's `--cairn-error-ink` red) and the
deliberate, documented choice of `@codemirror/lint` as the surfacing *mechanism* both stay; the pattern
below (public API, allowlisted coupling) is what any remaining chrome surface should follow.

## Geoff's steer (2026-06-30): the goal, the three constraints, and prior-art first

Geoff framed this pass as a deliberate initiative, not a finish-up. The goal holds three constraints that
pull against each other, and holding all three is the work:

- **Full integration and a shared design language.** From the end-user's view the editor should feel like a
  fully integrated part of cairn and share its design language (the Warm Stone admin look), not a bolted-on
  third-party widget.
- **Easy to upgrade.** CodeMirror is mature and battle-tested, so the work must leave it easy to upgrade:
  narrow seams against CodeMirror's public extension points, not deep overrides against its internal
  `.cm-*` classes. This is the same upgrade-resilience discipline the admin re-expression sweep applied to
  DaisyUI and Tailwind.
- **Do not subvert CodeMirror's editing UX for design purity.** Leverage CodeMirror's accumulated UI/UX
  lessons; do not trade a quality editing experience for theoretically perfect design consistency. Where
  consistency would degrade editing, consistency yields.

**Method: prior-art review first.** The design must START with a careful review of how other systems have
successfully integrated CodeMirror while preserving their own visual identity and keeping the seams such
that CodeMirror stays easy to upgrade. Route the visual and taste decisions through the frontend-design
loop with explicit criteria rather than main-loop web research. Prior art, then brainstorm, then spec. The
`cairn-codemirror-integration-pass` memory carries this steer for a cold session.
