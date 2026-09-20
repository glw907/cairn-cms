# Grader prompt: the coherence read

This is the coherence-read gate from the standard doc's done-gate, step 3: the
compositional judgment no mechanical rule carries. A builder runs it against their own
captures before calling a derivation or a novel composition done. Execute this prompt
exactly as written, given only the image paths supplied to you; do not add or drop a
check, and do not consult anything beyond the images and this file.

## Inputs

You are given six image paths, each labeled with its own state and theme:

| Label | What it shows |
|---|---|
| `390 / light` | The screen at a 390px viewport, light theme, at rest (no open menu, no focus) |
| `390 / dark` | The same viewport and state, dark theme |
| `1440 / light` | The screen at a 1440px viewport, light theme, at rest |
| `1440 / dark` | The same viewport and state, dark theme |
| `interaction / light` | One interaction state this screen's own composition exercises (an open menu or panel, an expanded row, a focus-visible control), light theme |
| `interaction / dark` | The same interaction state, dark theme |

If a label is missing, or a path does not open as an image, stop and report
`INCOMPLETE-CAPTURE` naming the missing label. Do not grade a partial set, and do not
infer a missing state from another image in the set.

Read only the six images and this prompt. No build log, self-report, prior grader
read, or source diff informs your verdict. A coherence read grades what a visitor
would see, not the process that produced it: a green audit means vocabulary-clean,
never design-done, and this read is the other half of that judgment.

## Reading discipline

Four rules bind every item below, before you apply any of them. A calibration run against
labeled captures with known verdicts found a grader failing them by manufacturing evidence
these rules rule out; hold to them strictly.

- **The materiality bar.** Read each image at the size you were given it, the way a visitor
  actually looks at a screen: no zooming, no inferred sub-pixel measurement. Note a FAIL
  only for something plainly visible at that ordinary read. Never cite an invented distance
  ("this sits 32px above that," "90px to the left") as evidence; describe what you see in
  terms you can point to directly, which edge, which baseline, which color, and if you
  cannot describe the difference without appealing to a measurement you did not actually
  take, it does not clear the bar. A genuinely large, obvious gap or drift needs no ruler
  and still fails; a small claim whose precision manufactures a distinction the image does
  not otherwise show does not.
- **Verify before you name it.** For any claim that two things fail to line up, share a
  boundary, or that a rule or border is cut short, trace it across the full row, column, or
  width in the image before including it. A claim you have not traced end to end in the
  actual pixels does not clear the bar.
- **One property is not a system.** A control that matches its neighbors in every visible
  property but one, the same shape, border, color, type, and spacing, differing only in a
  single small affordance detail such as a disclosure icon, is not the generic-scaffold
  tell item h describes. A screen may deliberately mix two different KINDS of the same
  control family (a quiet menu-button facet beside a content-sized native select, say), and
  their default affordances differing in that one respect is not itself a tell. FAIL a
  control only when its overall presentation, several properties at once, reads as a
  different, unstyled system standing next to a styled one.
- **Content edge cases.** Before failing an item on how one specific value wraps, breaks,
  or spaces out, check whether the same element pattern handles an ordinary-length value
  cleanly elsewhere in the same capture, another row, another field of the same kind. A
  field carrying an unusually long or unbroken value that wraps awkwardly while its
  siblings render cleanly is a content edge case in this capture's data, not a coherence
  defect in the composition; do not FAIL the item on it alone.

## The checklist

Answer every item below for every one of the six images. Note a checklist letter
against an image only when the answer is a FAIL; a passing item needs no note.

**a. Primary action placement (the anatomy affirmative half).** If this surface has one
deliberate primary action, does it sit in the header, toolbar, or dialog-footer
position, rather than trailing the content below it? A surface with no primary action
passes this item automatically.

**b. One filled action, the right one.** Treat each landmark region in the capture (the
main content, a nav rail, a header band, a side panel) as its own surface. On each
surface, name every accent-filled control you can see, then ask two things. Does more
than one control on the same surface carry the fill? And where exactly one does, is it
the thing an editor looking at that surface most needs to do, or does the fill sit on a
lower-stakes control while a more consequential action sits ghost or outline beside it?
FAIL a surface with competing fills, and FAIL a surface whose one fill is not its own
deliberate primary action. A surface with no accent-filled control passes this item
automatically.

**c. Chip register.** Does every status or state chip read as clearly one of two
things: a bounded object with a real, visible edge, or a quiet, soft-tinted mark with no
implied border? FAIL a chip that looks like it is attempting a border without actually
clearing one, a chip that reads as almost bounded.

**d. Type hierarchy.** Without reading every word, can you tell which text is the row
or section's own subject, which is a label, and which is a secondary note, from size
and weight alone? FAIL if two or more unrelated pieces of text compete at the same
visual weight for the reader's first look.

**e. Spacing rhythm.** Do related items sit visibly closer together than unrelated
ones: a label tighter to its own control than to the next field, one field tighter to
its neighbor than one section is to the next? FAIL a screen where the gaps read as
uniform or arbitrary rather than expressing this hierarchy.

**f. Composition width** (390 and 1440 images only). Does anything wrap awkwardly,
crowd against another control, or run past the visible edge at this width? A label
wrapping inside a control's own row, or two controls touching with no breathing room
between them, both FAIL this item.

**g. Facet quietness** (only when this screen has a filter control). Does the filter
read as quiet, bordered chrome showing only its own name at rest, picking up emphasis
only once a non-default value is applied? FAIL a filter that looks pre-emphasized
before anything is chosen, or that competes visually with the surface's one filled
action.

**h. Assembled vs. resolved.** Setting the checklist aside, does this look like a
screen someone built and then left, or a screen someone built and then looked at
again? FAIL anything that reads as a generic scaffold: unstyled defaults standing next
to styled ones, an icon language that doesn't match the rest of the admin, corner radii
that don't agree with each other on the same surface.

## Per-device verdicts

Score three states, not six images: fold each theme pair into one verdict per state.

| State | Verdict | Tells (checklist letters) |
|---|---|---|
| 390 | PASS or FAIL | |
| 1440 | PASS or FAIL | |
| interaction | PASS or FAIL | |

A state FAILs if either its light or its dark image failed any checklist item. Name
every letter that drove the FAIL, from either theme.

## Overall verdict

PASS only if all three per-device verdicts are PASS. FAIL if any one of them is FAIL: a
screen that only holds together on its best-looking capture has not resolved.

## Tells

List the full, deduplicated set of everything that drove a FAIL, one line each,
specific enough that a builder could act on it without re-reading the images. Name the
surface, the checklist letter, and what is wrong: not "spacing feels off" but "the
picker panel's own destination rows sit at the same gap as the panel-to-trigger
distance, so the group and the panel boundary read as one rhythm." An empty tells list
accompanies an overall PASS only.

## Output shape

Report, in this order: the per-image notes (FAILs only, grouped by image), the
per-device verdict table, the overall verdict, and the tells list. Nothing else; this
prompt runs unattended, and its caller reads a fixed shape.

This per-run contract is what a fresh run executes identically whether it is a
builder's own single done-gate check or one of several independent runs a trial
measurement folds into a consensus; the consensus rule itself, how many runs and how
they combine, belongs to whichever process is calling this prompt, not to this file.
