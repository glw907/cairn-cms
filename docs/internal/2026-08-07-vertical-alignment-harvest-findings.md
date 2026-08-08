# Vertical alignment, cairn-wide: harvest findings

Banked 2026-08-07, from the pass that measured both corpora for vertical-alignment defects. The
pass's own history is the evidence: task 1 was condemned by audit three times and split twice
before its inventory could be trusted, and the final defect surface was a fraction of what the
plan assumed. What follows is what that cost bought.

The engine-level mechanics rule in `CLAUDE.md` governs the filing: a UI **mechanic** belongs to
cairn, a design **choice** belongs to the site. Everything here is a mechanic.

## The mechanic: an `inline-flex` label breaks its own row's `items-baseline`

Confirmed at three call sites in one file (`src/lib/components/CairnTidySettings.svelte`, lines
367, 372 and 380), which is the repeated-local-workaround signal `CLAUDE.md` names as an altitude
problem rather than three bugs.

The shape is a meta row that declares `sm:items-baseline` and contains a label written as
`<span class="inline-flex items-center gap-1.5"><CheckIcon/>Tidy</span>`. An inline-flex flex item
synthesises its baseline from its FIRST item, which is the icon, not from its text. The row's own
declared baseline alignment therefore misses by 2.5px, 25% of the cap height, with both members at
identical 10px cap height so nothing about it is a mixed-size artefact.

Two things make this cairn's rather than a site's. Any label-with-leading-icon inside a
baseline-aligned row reproduces it, on any cairn site, in any component of that shape. And the
correct composition is not discoverable from the component: three call sites in one file by one
author went the same wrong way, the same signal the `0.92.0` stacked-register defect gave when two
of ASC's three call sites were wrong together.

**Filed as:** recipe-level fix in this pass's task 2, not three row fixes.

## The blind spot: reasoning about alignment from source cannot work

The deeper finding, and the reason the pass cost what it did.

Horizontal alignment is box-level, and boxes are what CSS talks about and what
`getBoundingClientRect` returns, so reasoning from source lands close to reality. Vertical
alignment is ink-level. The eye centres a glyph's visual mass; CSS centres its line box; an SVG's
drawn art sits wherever it sits inside a viewBox that centres perfectly. Every layer of the stack
is box-shaped and the judgment is ink-shaped.

This pass hit that gap four separate ways, each one a defect in the measuring tool written
specifically to avoid it: `getBBox()` returning geometry rather than painted bounds so a
`fill="none"` spacer inflated the ink box to the full viewBox; the element box read where the ink
was meant; the cap centre confused with the line-box centre; type metrics resolved off an ancestor
container rather than the element owning the line box.

No doubt signal fires while authoring, because `items-center` reads as its own confirmation. That
is why the class survives review and is fixed instantly once someone points at it: detection is
global and perceptual, repair is local and symbolic.

**Filed as:** the "ink, not boxes" section of the `visual-fidelity` skill, whose trigger was
widened at the same time. The skill previously fired only on rebuilds, ports and migrations. This
defect class is AUTHORED, not ported: the three rows above had been wrong since the day they were
written, through every green test run.

## The measurement rule that cost three rounds

Both major errors were one shape wearing two disguises. Round 1 measured an icon against a
wrapping block's first line; round 3 measured a chip against a baseline. Both fired on rows that
declared `align-items: center` and ACHIEVED it to within a pixel.

**Compare against what the composition declared.** The container's alignment is the intent, and a
defect is deviation from the declared intent, never from an assumed one. A corollary the pass had
to learn twice: a padded chip is a BOX, not a text run, so scoring it `text-beside-text` and
comparing baselines manufactures a delta equal to the cap-height ratio. The mixed-size rule the
spec already carried ("a pair sharing a baseline has centres that diverge by design") has a
converse that nobody wrote down, and the converse is the half that bites.

Cost of not knowing this: the corrected inventory would have prescribed dropping the admin shell
brand tile's `CMS` chip 3.5px off a centre it currently hits, on eleven screens.

## Two gate lessons that generalize past alignment

**An approved snapshot baseline certifies stability, never correctness.** A defect that ships
before the baseline is written becomes the baseline, and no amount of green can surface it. The
three `CairnTidySettings` rows passed every visual run they ever had. Never cite a passing visual
suite as evidence that a composition is right.

**Conformance verification cannot find a wrong premise.** Three adversarial verifiers found 14
real defects, 8 of them in the reports-green-on-broken direction, every one reproduced in real
Chromium. All three missed the premise error, because each was handed the spec's three traps as
ground truth and asked whether the code conformed. Only the auditor, asked whether the result was
TRUSTWORTHY, caught it. Any verification fan-out needs at least one agent whose question is
whether the whole thing is right rather than whether it matches the brief that produced it.

## The method finding: the image settles what arithmetic cannot

Three rounds of numeric correction moved the inventory from 37 above-bar rows to 13 to 10 without
resolving a single row's truth. One grader opening the crops at 4x to 8x zoom resolved all ten
definitively in one pass, separated three false positives from five real defects, corrected a
prescribed remedy that would have made a row worse, and caught a "reviewed" decline whose written
rationale contradicted the crop it cited.

**No row gets a disposition without its crop being seen**, and that belongs in the measuring
tool's contract rather than in an auditor's discretion.

## Carried to the follow-up

The fifteen `ConceptList` rows reading exactly 1.55px, the same shape as the three confirmed
defects but below the 2px reporting bar. A threshold anywhere in the window either adopts fifteen
rows of work in one step or leaves a visible family untouched, so it is a decision to take
deliberately rather than a number to pick.
