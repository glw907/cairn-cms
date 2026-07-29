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
