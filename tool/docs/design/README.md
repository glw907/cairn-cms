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
- [`render-reference/`](render-reference/) is iteration 3 of the mockups, which is the design the
  owner chose on 2026-09-20 and the acceptance reference the render package's goldens are reviewed
  against.

## The render reference

`render-reference/index.html` is the index: open it in a browser for every frame, each variant's
tradeoff, and the measured width sweep. `measurements.txt` is that sweep's raw result, including
the East Asian Width class of every glyph. `s8-plain.txt` is the plain non-terminal body.

The `.ansi` files are the canonical text: all thirty-four of them, each one frame's exact bytes,
escapes included, so a diff against a golden is meaningful. The `.png` files are the thirteen
frames the plan cites, six of them real-terminal captures and the rest offscreen renders; the rest
of the set stayed in the capture cache rather than in git, so the index shows a broken image for a
frame whose `.png` is absent. The index's own iteration 2 comparison points at `../mockups-2/`,
which is not in git either: read those two panels' captions rather than their images.

**The Go sources carry a `.txt` suffix on purpose.** `make -C tool check` walks every `.go` file
under `tool/` for build tags and lints every `.go` file's comments through Vale, and neither gate
should grade a throwaway mockup. The suffix is the one mechanism that hides these files from the
Go toolchain, the hygiene walk, and the comment linter at once. To run them, copy the directory
somewhere outside the module and strip the suffix.

The mockup is a mockup: its model types are flattened, its fixtures are invented, and nothing in
it is the `render` package. What it fixes is the design. Four choices the owner made from these
frames, and three known faults the render package corrects, are stated in the plan's Task 20a and
Task 20b.
