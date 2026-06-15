# Fold gutter: moving container folding into a real gutter column

Status: design, awaiting review. Supersedes the folding affordance prescribed in
`docs/internal/design/2026-06-12-folding-interaction-notes.md` and depicted in
`docs/internal/design/2026-06-12-editor-shell-gold-standard.html`. The fold engine (ranges, safety
invariant, pill, flash, keymap) is unchanged; only the affordance moves.

Mockup: `docs/internal/design/2026-06-14-fold-gutter-mockup.html` (link the compiled
`cairn-admin.css`, wrap in `data-theme`, hover a directive block to feel the reveal).

## The problem

cairn folds exactly one structure, by design: remark-directive container fences
(`:::name[label]{attrs}` ... `:::`), nesting allowed. That scope is correct and not changing. What
fails is the affordance. The current design floats the fold chevron inside the text on an invisible
28px band over the opener line, and that single decision (no gutter, to protect the quiet prose
surface) forces every downstream flaw:

- The chevron is invisible at rest (`opacity: 0`), revealed only by hovering the exact 28px band or
  by placing the caret inside the container. An unfolded block gives no signal it can fold.
- The chevron's x-position shifts with nesting depth (0, 8, 16px), so there is no column to learn
  and the control overlaps the opener glyph. No benchmarked editor moves the fold control with
  depth.
- The hit/reveal zone is a narrow strip competing with caret placement and text selection on the
  opener line, which is why the widget needs a `mousedown`/`preventDefault` focus-stealing guard.

Two independent UI/UX critiques (benchmarked against VS Code, JetBrains, Zed, Sublime, CodeMirror 6,
Obsidian, GitHub, Notion, Logseq) reached the same conclusion: the control belongs in a fixed-x
gutter column, the pattern every one of those editors uses. The fold engine underneath is sound and
in places (the line-count pill, the safety invariant) exceeds the benchmarks.

## The decision

Adopt CodeMirror 6's standard fold machinery, styled to stay quiet. A `foldService` over cairn's
existing directive ranges feeds a `foldGutter()` that renders the control in a real left-column
gutter at a constant x. At rest the gutter is empty (the best-editor consensus, confirmed against
the closest analog, Obsidian); the chevron reveals on hovering the whole opener line, and persists
when folded or when the caret is inside the container. The collapsed-state language (row wash plus
line-count pill) and the entire safety layer carry over unchanged.

The quiet surface is preserved because a gutter is not noise; an always-on column of markers is, and
those are separable. Obsidian runs a calm prose surface on CM6 with exactly this hover-revealed
gutter.

## Architecture

The work is contained to the editor components. No package export changes, no new public API.

### Fold ranges become a `foldService`

Today `editor-folding.ts` derives fold ranges from `containerRanges()` / `caretFoldRange()` and
dispatches `foldEffect`/`unfoldEffect` by hand from the widget and keymap. Keep those helpers; add a
`foldService` (registered via `@codemirror/language`'s `foldService` facet) that, given a line,
returns the directive container fold range whose opener is that line, or null. This is the one new
seam: `foldGutter` and the standard fold commands both query the foldService to learn which lines are
foldable, so registering it is what lights up the gutter on opener rows and nothing else.

The fold char range stays `foldCharRange()` (end-of-opener-line to end-of-closer-line). The
foldService returns null for a line that is not a paired opener, so an unbalanced opener never gets a
gutter marker, preserving the safety invariant that a half-typed fence earns no fold.

### The gutter replaces the widget

Remove `FoldBandWidget` and the widget arm of `foldPlugin`'s decoration build. In their place:

- `foldGutter({ markerDOM, domEventHandlers })`. `markerDOM(open)` returns the gutter control: a real
  focusable `<button>` holding one rotating chevron SVG, `aria-hidden` on the SVG, an `aria-label`
  on the button ("Fold this section" / "Unfold this section"), and a `title` tooltip carrying the
  same plus the shortcut. The single chevron path rotates (down for open, `rotate(-90deg)` for
  folded) rather than swapping two glyphs.
- The three mandatory overrides of `foldGutter`'s defaults:
  1. Suppress the always-on open marker. `foldGutter` renders an open marker on every foldable line
     by default (the noisy-IDE look). The marker stays in the DOM for layout and a11y, but its
     chevron is `opacity: 0` at rest and revealed by CSS on opener-line hover. This is the same
     hover-reveal mechanism the current `.cm-cairn-fold-band:hover svg` rule already uses, ported
     onto the gutter element.
  2. The gutter cell fills the line height so the whole cell is the click/hover target, not just the
     glyph. Gutter width about 20px; final width and the gutter-to-rail channel are pixel-tuned
     against the live CM line box (see Visual).
  3. Do not add CodeMirror's `foldKeymap`. The container-aware keymap already replaces it; keep that.

Keep verbatim: `codeFolding({ preparePlaceholder, placeholderDOM })` (the pill), `flashField` and the
unfold flash, `safetyExtender()`, the `washLine` folded-row decoration, and the `Mod-Shift-[` /
`Mod-Shift-]` keymap. The wash decoration still rides the opener row; the plugin's decoration build
keeps only the wash arm (the widget arm is gone).

### Caret-inside reveal

The current design reveals the chevron when the caret is inside the container. Preserve it: the
foldService/gutter does not know about the caret, so a small piece keeps the existing behavior. Mark
the opener row's gutter element with a class when `caretContainerRange` names that container, and let
CSS force the chevron visible (down, in the active ink). This reuses the selection-driven rebuild the
plugin already runs.

## Affordance specification

At rest (foldable, not folded, not hovered): the gutter cell is empty. Nothing.

On hover of the opener line: the chevron fades in to full over 120ms, pointing down.

Folded: the chevron is forced visible, rotated right, and persists. The row carries the wash; the
line-count pill renders after the opener text as the primary, labeled unfold control.

Caret inside the container: the chevron is forced visible, pointing down, in the stronger active
ink. With nested containers, only the innermost container holding the caret reads as active (this is
what `caretContainerRange` already returns, and it matches Obsidian); an enclosing outer container's
chevron stays at rest.

One chevron per opener row, at a constant x for every container at every depth. The rails to the
right of the gutter carry nesting; the chevron never moves to show it. The chevron ink is uniform (one
directive ink); the depth-stepped chevron ink of the old design is dropped because a 4% lightness
step at 11px is imperceptible and the rails already carry depth.

## Accessibility

The old design left folding asymmetric: the pill (unfold) was a focusable button, but folding was
only reachable through the invisible band, so a keyboard or screen-reader user could unfold but not
fold. The gutter closes this:

- The gutter marker is a real `<button>` with an `aria-label` and a `title`, reachable by keyboard
  and announced by AT. It toggles its container's fold on activate.
- CodeMirror's fold system announces fold/unfold to screen readers; keep that wiring intact (do not
  suppress it when overriding the marker DOM).
- The pill stays as the visible, labeled unfold affordance with its `aria-label="Show N hidden
  lines"`.
- The `Mod-Shift-[` / `Mod-Shift-]` shortcuts are surfaced in the Ctrl+/ help sheet
  (`ShortcutsGrid` / `editor-shortcuts.ts`) under a Folding heading, so the keyboard path is
  discoverable.

## Visual and motion

- Gutter width about 20px, tightened so the chevron binds to its block rather than floating in a
  wide channel. The fold gutter takes the place of most of the content's old left padding, so text x
  is roughly preserved. Pixel-check the chevron's vertical centering against the real CM line box
  (1.9 line-height), not the mockup's approximation rows.
- The hover-reveal trigger is the full CodeMirror line box of the opener row, not just the rendered
  text or the 20px gutter cell, so a short opener (`:::panel`) still reveals across the whole line
  width. The gutter cell sits inside that hover region, so the pointer travelling from the line to
  the chevron never crosses a gap that would dismiss it. Reveal fades in over 120ms; the fade-out on
  mouse-leave matches at 120ms rather than snapping.
- Dark theme raises the revealed chevron's ink floor so the violet clears the dark card; at rest it
  is still nothing.
- Touch and other no-hover pointers cannot reveal on hover, so under `@media (hover: none)` the
  chevron is persistent at a legible opacity (about 0.65; a no-hover pointer has no hover state to
  complete a fainter cue). The whole-line tap does not toggle (that would be a surprising gesture);
  folding on touch is the visible chevron button.
- Focus mode dims the gutter control with its row like any other machinery line, through the existing
  focus-dim variables (the current `.cm-cairn-focus-dim .cm-cairn-fold-...` rules extend to the
  gutter element). One exception: a folded row's chevron stays legible even when dimmed, so a folded
  block outside the focus paragraph is still findable and reversible; the dim floor for a folded
  chevron must not reach invisibility.
- Fold and unfold of the body are CodeMirror's instant replace; the existing unfold flash is the
  motion cue. A full collapse/expand height animation is out of scope: CM6 does not animate folded
  range height cleanly, and the flash plus the wash already signal the state change. This is a
  deliberate non-goal, recorded so a later pass does not read it as an omission.

## Out of scope (unchanged decisions)

Heading, list, and code folding (cairn folds directive containers only). Any fold affordance in
Preview. Fold persistence (fold state stays session-local, outside document history). Toolbar fold
commands. No body height animation on fold (see Visual and motion).

## Watch items (deferred, recorded so they are not lost)

Two questions the second design critique raised land outside this pass but should not vanish:

- Fold-all / unfold-all. Every code editor ships it; cairn deliberately omits it because a prose
  page with a handful of directive panels is not a long source file, and a non-technical author has
  no model for "collapse everything." If real documents routinely carry eight or more directive
  blocks, reconsider it as a keyboard command surfaced only in the help sheet, never as visible
  chrome.
- First-run discoverability. Nothing-at-rest is correct for the steady state, but it gives a
  first-time author no proactive signal that folding exists; discovery rests on hovering an opener,
  reading the help sheet, or meeting an already-folded block. The steady-state design is sound, so a
  proactive nudge (a one-time dismissible coachmark, or a single first-block chevron shown in a
  fresh document) is a candidate enhancement, not a ship blocker. Build it only if folding proves
  undiscovered in real use.

## Files

- `src/lib/components/editor-folding.ts`: add the `foldService`; replace `FoldBandWidget` and the
  widget arm of `foldPlugin` with `foldGutter({ markerDOM, domEventHandlers })`; keep `codeFolding`,
  `flashField`, `safetyExtender`, the wash decoration, the pill, and the keymap. Add the
  caret-inside gutter marking.
- `src/lib/components/MarkdownEditor.svelte`: move the hover-reveal CSS from `.cm-cairn-fold-band`
  onto the gutter element; set gutter width and full-height cell; drop the `:has(){position:
  relative}` band workaround; add the dark-theme ink floor, the `@media (hover: none)` rule, the
  focus-dim extension, and the focus-visible ring on the gutter button.
- `src/lib/components/editor-shortcuts.ts` (and `ShortcutsGrid` if needed): add the fold/unfold
  shortcuts under a Folding heading in the help sheet.
- `docs/internal/design/2026-06-12-folding-interaction-notes.md`: mark superseded by this design,
  with a pointer; the "Deliberately rejected" entries that this design reverses (fixed chevron x,
  hover-reveal location) are called out.
- `docs/internal/admin-design-system.md`: record the fold gutter as a sanctioned exception to the
  gutter-free surface, with the rationale (empty-until-hover is quiet; Obsidian precedent), so a
  later pass does not "fix" it back into the text.
- `docs/internal/design/2026-06-12-editor-shell-gold-standard.html`: update the fold rows to the
  gutter treatment, or annotate that the 2026-06-14 mockup supersedes the old fold affordance.

## Testing

Test-first, against the existing `MarkdownEditor.test.ts` and `probe.test.ts` (their fold
screenshots will be regenerated). Behavioral targets:

- A paired directive opener row renders a gutter fold button; a non-opener row and an unbalanced
  opener do not.
- The gutter button carries an `aria-label`; folding is reachable by keyboard (activate the button)
  and by `Mod-Shift-[`.
- Folding hides the body and renders the pill; the pill and the gutter button both unfold.
- Caret inside a container marks its opener's gutter control active.
- The safety invariant is unchanged: an edit, selection, paste, or undo touching a folded range
  unfolds it (existing tests carry over).
- The foldService returns a range only for a paired opener line (unit test over `containerRanges` /
  `foldCharRange`).

Gate: targeted test green, `npm run check` 0/0, `npm test` exit 0, plus the showcase visual check
(`npm run package`, then the showcase build/preview at `/admin/posts`) because component tests import
the variables-only `cairn-admin.css` and do not carry the compiled gutter styling.
