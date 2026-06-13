# Container folding: the full interaction prescription

The condensed rules live in the shell spec
(`docs/superpowers/specs/2026-06-12-cairn-editor-takes-the-shell-design.md`, "Containers fold").
This note preserves the fine grain from the 2026-06-12 design critique (benchmarked against VS
Code, Zed, and Obsidian) so plan-time implementation does not re-derive it.

## Affordance details

- Hover reveal fades the chevron in over ~120ms, and only while the pointer is inside the 28px
  rail band on any line of the container, never over the prose; when the pointer sits over a
  nested region, only the innermost container's chevron reveals.
- The chevron replaces its own container's innermost rail bar on the opener row (depth 1 at x0,
  depth 2 at x8, depth 3 at x16) in the container's stepped label ink; outer bars on that row
  stay. Down while the caret is inside (every enclosing opener shows its own; one chevron per
  row, no collisions), right while folded (always visible).
- The full 28px gutter band on the opener row is the click target (roughly 28x32px at the prose
  type step), `cursor: pointer` over the band only.

## Folded row details

- The pill is the fold placeholder widget and the screen-reader story: a real focusable button,
  `aria-label="Show N hidden lines"`, hover state picks up accent on the border. Line count, not
  word count: lines are what visibly disappear.
- Clicking the opener TEXT on a folded row places the caret for editing (the `{attrs}` stay
  editable without springing the block open); only the chevron, the pill, or the keys unfold.
- On unfold, flash the revealed range with a low-alpha accent background fading over ~400ms.

## Edge behaviors (the safety invariant's corollaries)

- Edits unfold: any transaction whose change range touches or enters a folded range unfolds it
  in the same transaction (covers Enter at a folded opener's end, Backspace after a folded
  closer, paste over a boundary, undo/redo landing inside).
- Selection unfolds immediately on entry (mouse drag or Shift+arrows); authors never hold a
  selection across hidden text, so copy semantics stay trivial (full text always).
- Vertical arrows treat a fold atomically (opener row, then the row after the closer);
  programmatic placements (search hits, diagnostic jumps, link-target scrolls) open the fold
  before scrolling.
- A replace landing inside a fold leaves it open afterward.
- Diagnostics unfold once on first error; a deliberately refolded erroring container keeps its
  fold and tints the pill warning ink instead of re-springing on every lint.
- Fold state lives outside document history (undo moves text only) and outside persistence.
- Focus mode dims the folded row like any machinery line, pill and chevron included, through the
  same dim variables.
- Fold ranges come only from `fenceScan`'s paired ranges; an unbalanced opener has no chevron.
  Worth an explicit test.

## Deliberately rejected

Always-visible chevrons everywhere; line-click toggling; fixed chevron x (collides at depth 3);
the CodeMirror ellipsis placeholder; content-preview placeholders; double-click unfold;
hover-reveal over prose; word-count pills; VS Code's edit-while-folded tolerance; force-unfolding
erroring containers on every lint; fold persistence; fold-all/unfold-all; heading and list
folding; any fold affordance in Preview; toolbar fold commands.
