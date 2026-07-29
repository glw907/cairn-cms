# Craft chapter acceptance protocol (design infrastructure Pass 3, Task 11)

**What this is.** The pre-stated protocol and pass condition for the craft chapter's
acceptance test (spec section 12, criterion 5, and section 5's own wording: "an agent that has
never seen a cairn screen, given a plain daisy component and the chapter, moves it measurably
toward the cairn feel without human art direction"). Written BEFORE any round runs (Task 11,
Step 1). Step 2 executes the protocol and appends its round to this record; a FAIL amends the
chapter and re-runs, keeping every round rather than overwriting the last.

## The fixture

`examples/showcase/src/routes/probe-craft/+page.svelte` (plus its own co-located
`probe-craft.css`): a small, standing, admin-shaped "Members" screen assembled entirely from
plain DaisyUI v5 components, deliberately un-cairn. It imports no `cairn-admin.css`, no
`admin-toolkit` or `admin-fields` component, no grammar token, no `StatusChip`. Its own
stylesheet runs DaisyUI's stock bundled `light`/`dark` themes, never cairn's
`cairn-admin`/`cairn-admin-dark` pair, and it toggles between them with a `?theme=dark` query
param read server-side, so a capture needs no client interaction to settle on a theme.

Deliberate stock defaults the fixture carries into the BEFORE state, each one a catalogue item
the chapter addresses: a plain `text-2xl font-bold` heading with no display face; a
`badge-ghost` status chip on every row, DaisyUI's own transparent-background/transparent-border
default, which reads as bare text with no pill at all against the row; uniform font weight
across a row's name and its secondary columns, no hierarchy; a flat `border-base-300` card
border and a single-layer `shadow` utility, neither theme-adaptive; a circular icon button
whose glyph is centered by pure box math; a numeric balance column with no tabular-numeral
rule, so `$85.00` and `$1,240.00` do not align on their digits; uniform gaps top to bottom with
no spacing hierarchy between a label and its control versus one field and the next; the
browser's bare default focus ring (no styled `:focus-visible` recipe).

The fixture is **standing**: its markup stays exactly as committed between acceptance rounds.
Each round resets `probe-craft/+page.svelte` and `probe-craft/probe-craft.css` to this
commit's content before dispatching the round's fresh agent, so every round starts from the
identical BEFORE state. A round's own edited AFTER state is not committed to this repository;
only its capture images and the grader's verdict are.

## The BEFORE captures

Captured at the standard three-state, six-image set `grader-prompt.md`'s own Inputs section
names (390 and 1440 at rest, both themes, plus one interaction state, both themes), under
`docs/internal/probes/2026-07-29-craft-acceptance/`:

- `probe-craft-before-390-light.png`
- `probe-craft-before-390-dark.png`
- `probe-craft-before-1440-light.png`
- `probe-craft-before-1440-dark.png`
- `probe-craft-before-interaction-light.png` (the search input in a keyboard focus-visible
  state, light theme)
- `probe-craft-before-interaction-dark.png` (the same state, dark theme)

## The protocol (executed at Step 2)

1. Dispatch a fresh agent, in a clean context that has never seen a cairn admin screen or this
   repository's own admin design docs, with exactly two inputs: the fixture's file path
   (`examples/showcase/src/routes/probe-craft/+page.svelte` and its sibling
   `probe-craft.css`) and the chapter (`skills/cairn-admin-screens/references/craft.md`). No
   exemplar, no other reference file, no example screenshot, and no coaching beyond the
   instruction to load the chapter and apply it to the fixture. This mirrors section 9's own
   control discipline: the skill-load instruction is sanctioned process, anything beyond it is
   not.
2. The agent edits the fixture's own markup and/or its stylesheet to apply the chapter's
   guidance, then stops. It does not touch any other file.
3. Capture the AFTER set at the identical six-image, three-state contract (390/1440/interaction
   times light/dark) against the edited fixture, named `probe-craft-after-<round>-<label>.png`.
4. Run the shipped grader prompt (`skills/cairn-admin-screens/references/grader-prompt.md`)
   against the AFTER set alone, exactly as its own Inputs section specifies (six images, no
   other context, no access to the BEFORE set or the chapter). k = 3 independent runs, pinned
   model `claude-opus-5` (the same pin Task 10's calibration used), consensus rule 2-of-3 per
   per-device state (390, 1440, interaction), matching the calibration ledger's own method.

## The pre-stated pass condition

**PASS** when the AFTER set earns an overall PASS verdict from the grader prompt: all three
per-device states (390, 1440, interaction) read PASS by 2-of-3 consensus. The fixture's BEFORE
state is deliberately, verifiably stock (the catalogue above), so a PASS on the AFTER set can
only follow from the agent's own edits, never from an already-resolved starting point.

**FAIL** when any per-device state fails 2-of-3 consensus. A FAIL amends the chapter (never the
fixture, and never the grader prompt) and re-runs the full protocol, dispatching a new fresh
agent against the unchanged, reset fixture, with its own round appended below rather than
replacing the prior one.

## Rounds

Round 1 has not yet run; this record is written before it does, per the acceptance criterion's
own requirement that the pass condition precede the run. Step 2 appends each round's dispatch
summary, its AFTER capture paths, the grader's per-state verdicts and tells, and the resulting
PASS/FAIL, in order, below this line.

### Round 1: FAIL

A fresh agent was dispatched against the unamended chapter (the version at commit `1b2f8ba7`)
and the reset fixture, with no input beyond the fixture's own two files and
`skills/cairn-admin-screens/references/craft.md`. Its AFTER edits were captured at the standard
six-image set under
`docs/internal/probes/2026-07-29-craft-acceptance/round-1/probe-craft-after-round-1-<state>-<theme>.png`.

The literal three-judge grader transcript for this round was not preserved to disk; the
consolidated failure mechanism below is the record made contemporaneously, from diffing the
round's actual AFTER edits against the chapter as it stood, immediately after the grader
returned its verdict. It is a faithful account of the FAIL's cause, not a re-quote of the raw
per-judge output the round-2 entry below carries verbatim.

**Verdict: FAIL at 390, and marginally at all three per-device states.**

- **390, both themes.** The header row and the toolbar row kept their wide-viewport
  `flex ... justify-between` shape unconditionally. A flex item's default `min-width` is `auto`,
  so it refuses to shrink below its own content; once the combined content exceeded the narrow
  viewport, the row either collided with zero gap or a text child wrapped mid-phrase, and the
  overflow propagated to the page itself. The members table, already wrapped in
  `overflow-x-auto`, still ran off the visible edge because an ancestor between the wrapper and
  the card's outer edge was itself a flex item with the same unshrunk `min-width: auto`, so the
  page overflowed before the scroll container ever got a chance to clip.
- **All three states.** The renewal-card's own `<legend>` (the group-level eyebrow) and one
  field's own label inside the same card used the identical `type-label`/`role-label` styling,
  producing two visually identical grey uppercase lines with no readable subject; the chapter's
  Tokenize > Type bullet named `type-label` as one generic role with no distinction between a
  group's own title and a single field's own label, so the fresh agent, given no other reference
  file, had no way to tell the two apart.

**Chapter gap driving the FAIL.** `craft.md` never mentioned narrow-width row or table
composition at all; the agent applied every tokenize/numeric/before-after item it was given
faithfully (chip register, type roles, optical nudge, padding ratio, focus ring) but had no
recipe for a row or a table that no longer fits its viewport. Separately, the Type bullet's
`type-label` role needed a stated distinction between a group-level eyebrow and an individual
field's own label, which lives in the sibling `form-anatomy.md` the protocol does not hand the
agent.

**Amendment applied.** Extended the Tokenize > Type bullet with the group-title-vs-field-label
distinction, added two Numeric-rule bullets (row breakpoint discipline naming the
`min-width: auto` mechanism; table containment naming the ancestor-flex-item trap), one
Before/after entry (narrow-width row collision), and a parenthetical on the `viewport-overflow`
audit-rule row pointing at the new numeric rules. The full diff is
`skills/cairn-admin-screens/references/craft.md` at this pass; see also the
`craft-chapter-round1-fail-narrow-width` implementer-memory entry.

### Round 2: FAIL

A fresh agent was dispatched against the round-1-amended chapter and the reset fixture (fixture
markup and stylesheet unchanged from the committed BEFORE state; only `craft.md` differed from
round 1). Its AFTER edits were captured at the standard six-image set under
`docs/internal/probes/2026-07-29-craft-acceptance/round-2/probe-craft-after-round-2-<state>-<theme>.png`.
The grader prompt ran k = 3, pinned `claude-opus-5`, verbatim as follows.

**Judge 1: FAIL**
- 390 / light and dark, item f: the members table runs past the card's right edge. The BALANCE
  column header is clipped mid-word to "BA" and every row's balance value is cut off (only
  "$1," survives on the Owen Fitzgerald row; the other three rows show nothing at all in that
  column), with no visible scroll affordance or overflow cue in the capture. An editor at 390
  cannot see the balance column.
- 390 / light and dark, item f: the JOINED column breaks its dates mid-value on every single row
  ("2024-" / "03-11", "2022-" / "09-02"), and every member name wraps to two lines. This is not
  a content edge case in one field, it is the same break on all four rows in both themes, so the
  four-column table is being crushed rather than reflowed at that width.
- 390 regression, item f: the chip repair made the width miss worse. Giving the status chips
  real pill padding and a border widened the STANDING column relative to the stock state,
  pushing BALANCE further off-screen than it was before the agent's edits (the stock capture
  still showed "$85", "$1,2", "$0.0"; the edited one shows almost nothing). The chapter moved
  the agent on chip register without warning that chip sizing feeds back into a narrow table's
  column budget.
- Chapter gap driving the FAIL: the chapter gave the agent nothing to act on for a data table at
  a narrow viewport. Every item it did carry showed up in the AFTER set (chip register, eyebrow
  and type hierarchy, tabular numerals on the balance column, a styled focus-visible ring), so
  the agent applied what it was given. The 390 overflow survived untouched because no recipe
  covers it. The amendment needs a narrow-width table behavior, stack each row into a labeled
  block or demote secondary columns to a second line, plus the note that chip and control
  padding consume column width at 390.

**Judge 2: FAIL**
- 390 / both themes (item f): the members table keeps its full four-column desktop layout at
  390, so the Balance column runs past the container's right edge. The header cell renders as a
  chopped 'BA', Owen Fitzgerald's value is cut to '$1,', and Priya Natarajan, Mei Lin Zhao, and
  Former show no balance at all in the visible width. There is no scroll affordance, edge fade,
  or scrollbar to signal the content continues.
- 390 / both themes (item f): because no narrow-width re-composition was applied, Name and
  Joined each wrap to two lines per cell ('Priya / Natarajan', '2024- / 03-11') while the fourth
  column is simultaneously clipped, so the row reads as cramped and truncated at once. The
  chapter's craft moves landed on type, chips, numerals, spacing, and focus, but never on how
  this composition behaves at the narrow viewport.
- 390 / dark (item h): the 'Former' chip's soft tint and its label sit at nearly the same value
  as the row background, so it reads as a leftover default beside the crisply bordered Current
  and Overdue chips in the same column. The quiet register was applied without checking it
  survives the dark theme.
- Non-driving observation, all states: the 1/2/3 pagination group is the only element carried
  through untouched from the stock BEFORE state, with no current-page indication and a corner
  radius that does not agree with the cards above and below it. Not enough to fail item h on its
  own under the 'one property is not a system' rule, but it is the one place the screen reads as
  built and then left.

**Judge 3: FAIL**
- 390 (both themes), item f: the members table keeps its full desktop column set inside the
  card, so the BALANCE column is sliced at the card's right edge (header reads "BA", Owen
  Fitzgerald's value reads "$1,") and the row-expand caret column visible at 1440 is pushed
  entirely off the visible edge, with nothing on the card indicating the content continues.
- 390 (both themes), item f: every JOINED date breaks across two lines inside its own cell
  ("2024-" / "03-11") in all four rows, so an atomic value wraps mid-token as the column's
  standing behavior at this width, not as a single long-value edge case.
- 390 (both themes), item h: the heading, toolbar, pagination, and renewal-message card all
  reflow cleanly at the narrow width while the table alone is unadapted, so the table reads as
  the one region built and then left, standing next to regions that were looked at again.
- The 390 state is the only per-device state that fails; 1440 and the focus-visible interaction
  state both pass every checklist item, so the chapter moved the fixture on chip register, type
  hierarchy, spacing rhythm, facet quietness, and focus styling but left its narrow-width
  composition unaddressed.

**Per-device consensus.** 390: FAIL, 3-of-3. 1440: PASS, 3-of-3. Interaction: PASS, 3-of-3.

**Overall verdict: FAIL** (390 fails 2-of-3 consensus).

## Outcome: criterion 5 is unmet

Two rounds both FAILed on the same mechanism: the members table does not adapt to the 390
viewport, so it overflows the card and clips its rightmost column in both themes. Round 1's
amendment (a stated breakpoint rule and a table-containment rule, both prose-level) did not fix
this in round 2; per judge 1's regression note, the same round's chip-register repair actually
widened the STANDING column and pushed BALANCE further off-screen than the stock BEFORE state
had it. The chapter's prose recipes are read and applied faithfully by a fresh agent, but a
prose rule alone has not produced a working narrow-width table across two attempts. What the
chapter still lacks is either a concrete row-collapse or column-demotion recipe specific to a
multi-column data table (not a generic row), stated with enough precision that a fresh agent
free-hands the CSS correctly, or a shipped structural building block (a table component or CSS
recipe the developer includes rather than reconstructs by hand) that the chapter can point at
instead of describing.

Per the protocol's own pass condition, an overall FAIL after a round amends the chapter and
re-runs. This record stops at two rounds rather than launching a third, because the round-2
regression shows prose amendment alone repeating the same failure mode; a third round without a
different kind of fix (a structural component, not another paragraph) risks the same result.
**Criterion 5 (the craft chapter measurably moves a fresh agent's output toward the cairn feel,
demonstrated by this acceptance protocol) is not met.** The design-infrastructure initiative
cannot close until either a further round passes, or the initiative's own scope is revised to
accept the chapter's real reach (everything but multi-column data tables at narrow widths) with
that gap named as a known limitation rather than silently dropped.
