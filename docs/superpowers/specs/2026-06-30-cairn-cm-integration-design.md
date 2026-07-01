# CodeMirror integration: the suggestion popover (design)

> Design spec for the CodeMirror integration pass. The pass converts the editor's spellcheck and
> objective-error suggestion popover from a skinned `@codemirror/lint` tooltip into cairn's own recipe
> DOM rendered through CodeMirror's public API, and gives it the keyboard and screen-reader model it has
> never had. Provenance: Geoff's steer (2026-06-30) mandated a prior-art review first; that review ran,
> then a four-way adversarial review (CM API, accessibility, scope, testability) narrowed the pass from
> a three-surface sweep to this one surface and corrected several load-bearing errors. This document is
> the post-review design. Framing history: `docs/internal/cm-editing-surface-alignment.md`. Memory:
> `cairn-codemirror-integration-pass`.

## Goal and the three constraints

The editor is cairn's core job, so investing in its integration is in-scope per the charter. The pass
holds three constraints that pull against each other.

1. **Full integration, shared design language.** The suggestion popover should read as a cairn admin
   surface (Warm Stone tokens, the popover recipe), not a third-party widget wearing CodeMirror's
   default button chrome and mono face.
2. **Easy to upgrade.** Bind to CodeMirror's public extension points, not its internal `.cm-*` classes.
   This is the upgrade-resilience discipline the admin re-expression sweep applied to DaisyUI and
   Tailwind.
3. **Do not subvert CodeMirror's editing UX.** Navigation, selection, and IME stay on CodeMirror's
   defaults. Where design consistency would degrade editing, consistency yields.

A fourth goal surfaced during review and is now first-class: **the popover gains a keyboard and
screen-reader path it does not have today.** The current lint tooltip is pointer-only, so this pass is
not preserving an accessibility baseline, it is creating one.

## Scope: the suggestion popover only

**In scope:** the spellcheck and objective-error suggestion popover (both flow through
`@codemirror/lint` `Diagnostic` objects today), and a tune of the writing-surface underline.

**Cut, with reasons recorded so they are not relitigated:**

- **Autocomplete alignment — cut.** The editor themes zero completion classes today. CodeMirror offers
  no public replacement for the dropdown container, so "aligning" it would *introduce* coupling to
  internal completion classes on a low-frequency link-completion surface. A pass whose metric is
  shrinking the fragility surface must not grow it for cosmetics. The dropdown stays a plain CodeMirror
  default, a known third-party surface rarely seen. It also carries its own selected-state contrast risk
  (WCAG 1.4.1 / 1.4.11) not worth taking on here.
- **Find/replace search panel — deferred as its own feature decision.** Search is not in the editor
  today, so adding it is new capability, not chrome alignment. It drags in `@codemirror/search`, a
  `searchKeymap` that also wires a stock (un-themed) `gotoLine` panel and multi-cursor bindings, and a
  five-point a11y contract of its own. cairn edits typically short Posts and Pages, and the browser
  already finds visible text. If find/replace is wanted, it earns its own small decision later, not a
  rider on this pass.
- **A shared `editor-chrome` seam — dropped.** With one consumer (the popover), a shared
  tooltip+panel abstraction is premature generality. Ship one plain `recipeTooltip` helper colocated
  with the popover.

## Prior art (the conclusion that drives the design)

Two research lines ran off the main loop (CodeMirror's own docs, and major CM6 adopters). CodeMirror's
documentation establishes the pattern, and adopters corroborate it at the architecture level:
**identity-through-facets** — render cairn's own DOM *through* CodeMirror's public extension points, and
theme only the documented writing-surface classes. This satisfies all three constraints at once.

The load-bearing evidence for the popover specifically is a Svelte spellcheck demo on
discuss.codemirror.net whose suggestion popovers are "**not** CodeMirror Linter tooltips… Instead,
they're **Svelte components** wrapped to function as standard DOM elements." Obsidian is the
counter-example: because it *is* the app, it skins `.cm-*` internals, and its CM5→CM6 migration guide is
the documented cost of that coupling. A redistributable library avoids it.

## The organizing rule (classify once)

Every in-editor CodeMirror surface is exactly one of:

- **Writing surface** — CodeMirror's text world. Theme it via `EditorView.theme` against the documented
  content classes (`.cm-content`, `.cm-line`, `.cm-cursor`, the gutters), plus cairn's own namespaced
  decoration classes (`.cm-cairn-*`, which are cairn's, not CodeMirror's). Keep the current approach.
- **Chrome** — the suggestion popover. Render cairn's own recipe DOM through the public API. Do not skin
  CodeMirror's built-in widget internals.

## The design

### The mechanism: `showTooltip` facet + caret `StateField`, not `hoverTooltip`

`hoverTooltip` is pointer-only (its plugin watches `mousemove` with a hover delay; it has no caret code
path), so it cannot drive a caret-reachable popover. The flagship is built on the **`showTooltip`
facet**, fed by a `StateField` that maps `state.selection.main.head` onto the diagnostic under the
caret and produces a `Tooltip` whose `create(view)` returns the recipe DOM. The `StateField` reads the
lint state through the public **`forEachDiagnostic(state, f)`** export, so it never touches lint
internals. A second, separate `hoverTooltip` source may provide the pointer-hover affordance; one
primitive does not cover both triggers.

Keep `@codemirror/lint` as the underline and diagnostic mechanism (the `linter()` sources at
`spellcheck.ts:692` and `725` still produce the diagnostics). **Suppress only the built-in tooltip** via
the `linter()` `tooltipFilter` option: `tooltipFilter: () => []` is sufficient because every diagnostic
in this editor is cairn's. `tooltipFilter` filters only the tooltip; `markerFilter` (the underline) and
the gutter are untouched. This drives the lint-*specific* classes (`.cm-tooltip-lint`,
`.cm-diagnostic-info`, `.cm-diagnosticAction`) out of the theme entirely.

### The recipe DOM: copy the visual recipe, not the modal behavior

The popover DOM matches the *look* of `MediaInsertPopover.svelte` (the recipe sibling): `--font-body`,
DaisyUI `.btn` for the actions (a suggestion, "Add to dictionary", "Ignore"), `--cairn-card-border`,
`--cairn-shadow`, `--radius-box`. The action handlers dispatch the same view transactions the current
lint actions do.

It must **not** copy `MediaInsertPopover`'s behavior. That component is `aria-modal="true"` with a
hand-rolled Tab focus trap, correct for a modal that deliberately parks the editor. On a popover sitting
over live text the user is mid-sentence in, a modal trap tells assistive tech the document is gone and
prevents returning to typing. The popover is non-modal.

### The keyboard and screen-reader model (first-class)

The current lint tooltip is pointer-only and announces nothing (the underline is bare
`text-decoration`). This pass builds the path that never existed. Two triggers share one DOM with two
different focus contracts:

- **Pointer hover → presentation, no focus move.** Satisfies WCAG 1.4.13: the card is *hoverable* (no
  dead gap; moving the pointer onto it keeps it open), *persistent* (stays until the trigger is left or
  invalidated), and *dismissable* (`Escape` closes it without moving the pointer). Configure the
  tooltip's `hideOn` accordingly. Interactive buttons in a pure hover card are an anti-pattern, so this
  path *shows* the fix; it is not the only way to operate it.
- **Deliberate key → action dialog, focus moves in.** When the caret is in a diagnostic range, an
  explicit keybinding (match the "Quick Fix" idiom, `Mod-.`) opens the action surface as
  `role="dialog"` with **`aria-modal="false"`**, moves focus to the first suggestion, and on `Escape`
  restores focus to the prior selection in `.cm-content`. Role follows focus: a `role="dialog"` that
  never receives focus is never announced, so the dialog role is used only on this focus-taking path.

Caret-in-range must **not** auto-open-and-focus the dialog (that is a WCAG 3.2.1 / 2.4.3 violation and
subverts navigation, constraint 3). Instead, when the caret enters a diagnostic range, announce
availability through a **polite** `aria-live` region: the word, that suggestions exist, and the key that
opens them ("misspelled: teh; 3 suggestions; press Ctrl+period"). Polite, not assertive, because a
spelling flag is not an interruption. This announcement is the screen-reader half of the caret trigger,
and without it a screen-reader user never learns the popover exists.

### The writing surface: keep the theme, tune the underline

The wavy underline is locked to `--cairn-warning-ink` (`spellcheck.ts:469`, `482`), reserved so it never
collides with tidy's `--cairn-error-ink` red. Keep the token; tune only its color and weight. No
re-architecture.

### Token resolution: a documented dependency, not a bug

`var(--cairn-*)` resolves inside the tooltip DOM today because CodeMirror parents tooltips to the
`.cm-editor` root, which sits inside the themed `data-theme` wrapper, so the custom properties inherit
down the DOM. This works by default. It would break only if a future change sets
`tooltips({ parent: document.body })` to escape a clipping container, which portals the DOM out of the
themed subtree. Document the dependency on the default `.cm-editor` parent and the clip-versus-theme
tension; do not change anything now.

## The coupling metric and the `check:cm-internals` gate

The honest metric: the lint-*specific* classes go to **zero**, and the popover carries one irreducible
override of `.cm-tooltip` (CodeMirror adds that class to every tooltip and paints its border and
background, so a recipe surface must neutralize it). The floor is `.cm-tooltip`, not zero.

Convert the watch into a failing gate, `check:cm-internals`, taking the *allowlist* half of
`check-custom-surface.mjs` (set-equality by name, `check-custom-surface.mjs:156-160`), not its numeric
budget. Design requirements, each closing a false-green path the review found:

1. **Allowlist by name, not a count.** Fail on any chrome `.cm-*` token not in {documented
   writing-surface set} ∪ {`.cm-cairn-*`} ∪ {`.cm-tooltip`, the popover floor}, and report the offender
   by name (`unsanctioned chrome class: .cm-panel`). A count launders coupling (drop one class, add a
   worse one, count unchanged); a by-name set does not.
2. **Scan an enumerated file set for the raw token `\.cm-[a-zA-Z-]+`,** not by detecting theme calls.
   `spellcheck.ts` builds its theme via `EditorViewMod.theme` (a function parameter), so a scanner that
   greps `EditorView.theme` never opens the flagship file and certifies "0" by blindness. Enumerate the
   editor theme sources explicitly, and **fail if any editor file contains `.cm-` and is not in the
   set**, so the set cannot silently go stale.
3. **Split composite keys** (`.cm-tooltip.cm-tooltip-lint`, comma lists, descendant selectors mixing a
   `.cm-cairn-*` class with a writing-surface class) into individual `.cm-*` tokens before checking.
4. **Ban dynamically-composed chrome selectors** (`` `.cm-${name}` ``). The gate refuses to reason about
   a selector it cannot read statically; treat interpolation in a chrome selector as a hard error.
5. Scan `.svelte` `<style>` blocks and `querySelector` strings too, not only JS theme objects.

The gate proves the theme *source* no longer names the lint classes. It cannot prove the built-in
tooltip does not *render*. Close that gap with a runtime assertion (see Testing): a stock
`.cm-tooltip-lint` element is absent while the recipe popover is present.

## Upgrade tripwire

Prose in a backlog is the weakest form and gets skipped. Use the repo's own watch taxonomy:

- **A committed public-API-shape test** (code condition, can't be forgotten): import the specific public
  symbols the popover leans on (`showTooltip`, `forEachDiagnostic`, the `linter` `tooltipFilter` config,
  `Diagnostic`, `EditorView.theme`) and assert their shape and callability. A major bump that renames or
  drops one then fails `npm test` deterministically.
- **A `schedule` routine** (external trigger): periodically bump the `@codemirror/*` ranges in a
  throwaway branch, run `npm run check` + `npm test`, and ping only on break, mirroring the kit#15992
  watcher the repo already runs.

## Visual finalization through frontend-design

One visual artifact: the suggestion popover composition. Route it through the frontend-design loop with
explicit criteria at its implementation phase (not front-loaded), per
`design-taste-research-via-frontend-design`. Criteria: match the `MediaInsertPopover.svelte` visual
recipe and the `admin-design-system.md` popover recipe; Warm Stone tokens only; `data-theme` on a bare
wrapper; scoped overrides in `@layer components`; the selected/hover states carry a non-color cue and
clear the contrast floors; preserve CodeMirror's editing affordances.

## Testing

Verify in the **chromium component vitest project** (which mounts `MarkdownEditor` in a pinned
container), driven by the existing fake-Worker seam (`spellcheckTest: { createWorker, assumeReady }`,
`MarkdownEditor.svelte:115`), so the tests are deterministic without the 1.5 MB dictionary. Assert
**computed structure and tokens** (role, the button set, `--font-body`, the `--cairn-*` border and
shadow resolving) over pixels, the technique the current spellcheck e2e already uses for the underline
color. A full-editor screenshot of an async, viewport-positioned tooltip is the wrong tool (the existing
spellcheck e2e already needs a 90-second timeout and two retries). If a pixel baseline is wanted for the
frontend-design sign-off, scope it to the popover locator with animations disabled, never a full-page
shot.

The load-bearing assertions, each a "button fired ≠ property held" trap:

- **Add-to-dictionary state:** the word is added, the underline clears, and it survives a re-lint (the
  current test's three-part assertion, not a click-only check).
- **Ignore scope:** the ignore action suppresses only that range, not the word globally.
- **Escape restores focus:** `document.activeElement` is back in `.cm-content` after dismissal.
- **Keyboard trigger:** the caret-in-range keybinding opens the dialog (test the keyboard path, not
  `hover`).
- **Announcement:** the polite live region carries the word, the suggestion count, and the key.
- **Built-in tooltip suppressed:** stock `.cm-tooltip-lint` is absent while the recipe popover renders
  (the runtime half of the coupling metric).

## Scope boundary and non-goals

- No editing-UX override. Navigation, selection, IME stay on CodeMirror's defaults. No auto-focus on
  caret movement. No modal trap over live text.
- The writing-surface theme stays; only the underline is tuned.
- One plain `recipeTooltip` helper, colocated with the popover. No shared seam, no speculative
  primitives.
- Autocomplete and search stay out (see Scope).

## Documentation (a pass dimension)

- Record the CodeMirror seam (the writing-surface / chrome rule, the `showTooltip` + `forEachDiagnostic`
  pattern, `tooltipFilter` suppression, the a11y model, the `check:cm-internals` allowlist, the upgrade
  tripwire) as the durable internal reference; fold or retire `cm-editing-surface-alignment.md` on ship.
- Update `admin-design-system.md` if the popover recipe gains an editor variant.
- Give the popover-render path a log event only if it becomes diagnosable; update the reference table if
  so.
- Prune the ROADMAP "Later" CM item on ship.

## Phasing (for the just-in-time plan)

0. Inventory the `.cm-*` surface across the enumerated editor files; land `check:cm-internals` (allowlist
   by name, raw-token scan, dynamic-selector ban) seeded to the current state.
1. Build the `recipeTooltip` helper on the `showTooltip` facet + caret `StateField` + `forEachDiagnostic`,
   with the two-trigger keyboard/screen-reader model and the polite live region. Run the frontend-design
   loop for the popover here. Suppress the built-in tooltip via `tooltipFilter`. Drive the lint-specific
   classes to zero; the allowlist tightens to the `.cm-tooltip` floor.
2. Tune the underline. Add the public-API-shape test and the `schedule` upgrade routine. Update docs;
   prune the roadmap.

Each phase clears the full gate (`check` 0/0, `npm test`, `check:cm-internals`, `check:custom-surface`,
`check:comments`, the component tests) before the next, per the cairn method: dispatch each
well-specified task to `cairn-implementer`, review the diff, verify the gate.

## What the adversarial review changed (self-review)

- The mechanism was wrong: `hoverTooltip` cannot do caret display. Rebased on `showTooltip` +
  `forEachDiagnostic`.
- "Zero coupling" was false: `.cm-tooltip` is an irreducible floor; the gate counts it.
- The gate would have been blind to `spellcheck.ts` (`EditorViewMod.theme`) and gameable as a count.
  Rebuilt as an allowlist-by-name over an enumerated raw-token file scan.
- The a11y contract was a contradictory footnote (no-focus + dialog + interactive buttons) that would
  have copied a modal focus trap onto live text. Rewritten as a first-class two-trigger model with a
  polite announcement, since the current tooltip has no keyboard or screen-reader path at all.
- Scope narrowed from three surfaces to one: autocomplete grew the coupling the pass exists to shrink,
  and search is a separate feature. Both cut, which also dissolved the premature shared seam.
- Token resolution is fine today (default `.cm-editor` parent); downgraded from a fix to a documented
  dependency.
