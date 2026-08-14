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

**A static rule's precision bar is set by its TIER, and an error-tier rule cannot be sloppy,**
because a false positive breaks somebody else's build. `icon-baseline-synthesis` was written to
`error` on a ruling that an advisory guardrail is inert unless somebody runs it and reads it. An
adversarial verification then measured 59 Chromium probes and found five markup shapes reading
exactly 0.00px, the correct result, that the rule reports anyway: a first AST child that is not
the first FLEX ITEM (`position: absolute`, `display: none`, an `order-*` utility), a `class` handed
to a Svelte component, and an icon-only label. It shipped at advisory, and was then DELETED
outright (Geoff, 2026-08-08) rather than kept.

**The decisive disqualifier was a finding whose own prescribed fix did not fix it.** Two of the
five are precision problems, arguable against the value of a gate. The icon-only label is not: the
message prescribes `.cairn-icon-label`, and the label measures -4.00px before the change and
-4.00px after, because there is no word for the recipe to expose. A consumer handed that finding at
error tier cannot make their build green by doing what the message says. That is the test to apply
to any gating rule before its tier is chosen, and it is cheaper than a precision census: take the
rule's own remedy, apply it to the finding, and measure. If the number does not move, the rule does
not gate.

The corollary the same round produced: a claimed false positive is not one until it is measured.
A `display: block` container was reported as a false positive and is not. It measures -1.75px, a
real defect, because an `inline-flex` box's baseline is icon-synthesised in an inline formatting
context too. Only the stated REASON was wrong. Correcting a rule on a review's reasoning rather
than on a measurement would have removed a true finding.

**The rule was built and then removed, and the removal carries the larger lesson.** Task 4b was
ratified before task 1's inventory came back, and that inventory found five admin rows and no
public ones. Recomposing those rows onto the recipes took the shape the rule detects out of the
tree, so the shipped rule fired on zero files across `src` and the showcase, which declares
`items-baseline` on no element at all. Its precondition never occurred in the repo it shipped
from. It went out anyway, at advisory, with a reference entry that had to spell out what it could
not see, and Geoff deleted it on 2026-08-08 as shipped surface guarding nothing. The construction
was sound; the premise was stale. **When a measurement collapses the problem a planned instrument
was meant to guard, re-ask whether the instrument is still owed, before building it and again
before shipping it.** A consumer pays for every rule in the registry, in reading and in trust,
and cairn's charter makes "we don't need this one" a correct answer.

## The gate finding: a pixel tolerance has a defect-size floor

`examples/showcase/playwright.config.ts` sets `maxDiffPixels: 120` for every `toHaveScreenshot`
comparison in the suite. Measured after the fixes landed, replicating the `admin edit page — 1440`
test exactly (same viewport, session cookie, colour scheme, `fullPage`, `.cm-content` mask): the
shipped render against itself differs by 0 pixels, so the render is deterministic; the fixed render
against the pre-fix one differs by 51 pixels, all of them inside x 1027-1038 by y 245-254, which is
the check glyph and nothing else.

51 is under 120, so the comparison passes and the baseline is never rewritten. That is why CI's
regeneration changed zero admin baselines while the fix was real.

The tolerance is roughly 2.4x the entire pixel footprint of a 1.5px shift on a 16px icon. Every
defect this pass fixed sits under it, and so does every future reintroduction of one. **The visual
baseline is not a regression net for this defect class and never was. A passing visual suite must
not be cited as evidence that alignment is intact.**

The general form: a pixel-tolerance gate has a defect-size floor, and a defect class whose whole
footprint falls under that floor needs a gate that measures geometry rather than one that compares
images. This pass's real regression net is
[`src/tests/component/vertical-alignment-recipes.test.ts`](../../../src/tests/component/vertical-alignment-recipes.test.ts),
which renders the real components and reads ink and cap centres directly, so it has the resolution
the screenshot lacks.

A second gap compounds the first. Four of the five fixed rows render on `/admin/settings`, and the
admin visual corpus does not capture that route at all, so those four could not have moved a
baseline at any tolerance. The 51-pixel measurement above is the fifth row, the only one the corpus
can see.

The tolerance itself was left alone here. Lowering it touches every existing baseline and every
unrelated test, and 120 is presumably where it is because a much lower number goes flaky on font
antialiasing. That is a decision with its own evaluation, filed in `ROADMAP.md` together with the
corpus gap.

## The cascade finding: `height` in `@layer components` is a silent no-op

Layers beat specificity, and Tailwind's `utilities` layer comes after `components`, so a
`height: 1lh` written in a `cairn-admin.css` `@layer components` rule never applies to an element
carrying an `h-3.5` utility. It does not warn, it does not lose a specificity fight a developer can
see in devtools; it simply does not apply, and the measurement reads as if the rule were never
written (-1.79px, unchanged). The sibling recipe fix used `min-height` instead, which wins by
being a DIFFERENT PROPERTY that no size utility sets, and which only ever grows the box, so an
oversized glyph keeps its authored size.

**Reach for the different property before reaching for `!important` or an unlayered rule.** The
general shape: when an admin-sheet rule has to beat a utility, the durable move is a property the
utility namespace does not write, not a stronger form of the same property.

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
