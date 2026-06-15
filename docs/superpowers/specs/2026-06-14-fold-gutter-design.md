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

### A custom gutter renders the control

Today `editor-folding.ts` derives fold ranges from `containerRanges()` / `caretFoldRange()` and
dispatches `foldEffect`/`unfoldEffect` by hand from the in-text `FoldBandWidget` and the keymap. Keep
those helpers and `foldCharRange()` (end-of-opener-line to end-of-closer-line). Remove
`FoldBandWidget` and the widget arm of `foldPlugin`'s decoration build, and render the control in a
real gutter instead.

Use CodeMirror's lower-level `gutter()` (from `@codemirror/view`), not `foldGutter()`. The reason is
the caret-inside reveal, which the current design has and we are keeping: the open container holding
the caret shows its chevron (down, active ink). `foldGutter` re-renders its markers on fold changes
but not on plain caret moves, so it cannot drive a caret-inside state. A custom `gutter()` takes a
`lineMarkerChange` predicate that forces a marker recompute on any update we name, so recomputing on
`selectionSet` (alongside `docChanged` and fold effects) gives the caret-inside reactivity for free.
This is the fallback the earlier draft reserved; the caret-inside requirement makes it the primary.

The gutter's `lineMarker(view, line)` returns a marker only when `line.from` is the opener of a
paired container (computed from the cached `fenceScan` / `containerRanges`, memoized per state to
stay linear), and null otherwise, so an opener gets a control and a closer, prose line, or unbalanced
opener gets nothing. The marker is a `GutterMarker` whose `toDOM` is a real focusable `<button>`
holding one chevron SVG (`aria-hidden` on the SVG), with an `aria-label` ("Fold this section" /
"Unfold this section"), a `title` tooltip carrying the same plus the shortcut, and a class set from
the folded and caret-active state. The single chevron path rotates by CSS (down open, `rotate(-90deg)`
folded) rather than swapping two glyphs. The button's `mousedown` calls `preventDefault` (keep the
caret and focus where they are), and its `click` toggles the fold, so one handler serves both a mouse
click and a keyboard activation (Enter/Space) with no double-toggle. The gutter's own width is a
fixed ~20px from CSS, so the empty cells reserve the column without a spacer marker.

Keep verbatim: `codeFolding({ preparePlaceholder, placeholderDOM })` (the pill), `flashField` and the
unfold flash, `safetyExtender()`, the `washLine` folded-row decoration, and the `Mod-Shift-[` /
`Mod-Shift-]` keymap. The plugin's decoration build keeps only the wash arm; the widget arm is gone.
Do not add CodeMirror's `foldKeymap` (the container-aware keymap still replaces it).

### Restore the opener row's innermost rail bar

The current design drops the opener row's own innermost rail bar because the in-text chevron stood in
its place (the `dropInnermost` rail variant in `MarkdownEditor.svelte` and the `cm-cairn-directive-opener`
line decoration in `editor-highlight.ts`). With the chevron in the gutter, left of all rails, the
opener row should paint its full rail like any other fence row. Remove the `openerLine` decoration and
its application in `editor-highlight.ts`, and the `dropInnermost` rail rules (and the parameter) in
`MarkdownEditor.svelte`, so a paired opener keeps every bar.

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
- The hover-reveal trigger is the gutter cell, sized for a comfortable target (about 22px, full line
  height), the way VS Code, Zed, and Obsidian reveal on gutter hover. Revealing on hover of the whole
  opener line would read as a larger target, but a real CodeMirror gutter is a separate DOM column
  from the text with no CSS relationship to the line, so a line-hover reveal needs a JS pointer
  bridge; that is deferred as an enhancement, not built now. Reveal fades in over 120ms; the fade-out
  on mouse-leave matches at 120ms rather than snapping.
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
- Whole-line hover reveal. Gutter-hover is the standard and ships here. A line-hover reveal (a larger
  discovery target) needs a JS pointer bridge that tracks the opener line under the cursor and flags
  its gutter marker. Worth it only if the gutter target proves too small in real use.

## Files

- `src/lib/components/editor-folding.ts`: replace `FoldBandWidget` and the widget arm of `foldPlugin`
  with a custom `gutter()` plus a `GutterMarker` button; add the per-state memo for the scan/ranges
  and caret-inside check; keep `codeFolding`, `flashField`, `safetyExtender`, the wash decoration, the
  pill, and the keymap.
- `src/lib/components/MarkdownEditor.svelte`: replace the `.cm-cairn-fold-band` CSS with the gutter
  rules (fixed ~20px width, full-height cell, hover-reveal on the opener line, folded and caret-active
  forced states, the rotating chevron, the focus-visible ring); drop the `:has(){position: relative}`
  band workaround; add the dark-theme ink floor, the `@media (hover: none)` rule, and the focus-dim
  extension to the gutter button. Remove the `dropInnermost` rail rules and the parameter so the
  opener row keeps its innermost bar.
- `src/lib/components/editor-highlight.ts`: remove the `openerLine` (`cm-cairn-directive-opener`)
  decoration and its application, so the opener row no longer drops its innermost rail bar.
- The `Fold / unfold` row already exists in `src/lib/components/editor-shortcuts.ts`; verify it reads
  `Ctrl Shift [ / ]` and leave it. No change needed.
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
