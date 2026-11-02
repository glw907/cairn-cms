# The `cairn` CLI design record

What the render package is built against, and why it looks the way it does. Everything here is a
record for an implementer and a reviewer. None of it is compiled, and none of it ships in a
release archive.

## The documents

- [`copy-standard.md`](copy-standard.md) is the binding standard for every operator-facing string
  the binary prints: the governing style guides, the grammar of a detail line, a fix line, a skip
  reason, and an error message, the fixed vocabulary with its banned column, and the production
  mechanism (one messages table per package, `make copy-list`, `make check-copy`). An implementer
  reads section 2 and section 4.6 before writing any string, and never invents copy: a string the
  catalogue lacks is listed in the task report for an editor.
- [`charm-v2-capabilities.md`](charm-v2-capabilities.md) is the Charm v2 capability survey the
  render dependencies were chosen from.
- [`reviews/`](reviews/) holds the six adversarial design reviews of the mockups (beauty,
  charm-stack, usability, family, robustness, agent-usability) and
  [`reviews/iteration-2-brief.md`](reviews/iteration-2-brief.md), the conductor's consolidation
  that settled where they conflicted. They are the reasoning behind the plan's acceptance
  criteria, not criteria themselves; where a review and the plan disagree, the plan wins.
- [`render-reference/measurements.txt`](render-reference/measurements.txt) is the measured width
  sweep, including the East Asian Width class of every glyph. `glyph.go`, `glyph_test.go`, and
  `width.go` in the render package cite it.

## The render reference

Iteration 3 of the mockups, the design the owner chose on 2026-09-20, is gone from the tree. Its
frames live at the `pre-agent-first` tag. The goldens in `tool/internal/render/testdata` are the
acceptance record for the render package.
