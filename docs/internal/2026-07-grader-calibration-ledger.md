# Grader calibration ledger (design infrastructure Pass 3, Task 10)

**What this is.** The measured evidence that the shipped coherence-read prompt
(`skills/cairn-admin-screens/references/grader-prompt.md`) reproduces known verdicts on a
labeled set, run k=3 on a pinned model and combined by a stated consensus rule. Calibration
**SUCCEEDED**: round 2, on the amended prompt, reproduces all three known verdicts by
consensus.

**What this is not.** It is not a claim that the prompt catches everything a human reviewer
would; it is a claim that on this labeled set, at this k and this consensus rule, the prompt's
verdicts match the known labels.

---

## 1. Reconstructed provenance (a ratified deviation from the plan's assumption)

Task 10's plan draft assumed a labeled set already existed as archived capture images, at
`~/Projects/aksailingclub-org/docs/design-benchmark/probes/` (`2026-07-20-members-toolkit/`,
`2026-07-21-classes/`) with verdicts recorded in that repo's `decisions.md`. That assumption
did not hold: the archive held prose verdicts and narrative descriptions of what each round
found, not the six-image capture sets a coherence read requires as its input. There was
nothing to run the prompt against.

The labeled set was rebuilt rather than located, on two legs:

- **Two constructed FAIL fixtures**, built as SvelteKit routes rendering the admin theme
  (`cairn-admin-shell.css`) around deliberately untuned markup, each one assembling a small,
  named family of tells whose presence is known by construction (they were authored in, not
  discovered): competing filled actions, a browser-default `<mark>` highlight, a chip melting
  into its zebra row, a flat type hierarchy, an overflowing header at 390px, a mis-grouped
  filter block, a table that does not accommodate the narrow viewport, and an expanded-row
  panel that reads as a sibling row rather than a child of the row that opened it. These
  routes rendered at `examples/showcase/src/routes/probe-calibration/{fail-a,fail-b}/` for the
  duration of this task only (see "Disposition of the probe fixtures" below); they are not
  part of the shipped package.
- **One fresh, read-only capture of the consumer's Members screen**, a real state whose
  lineage of cold reads (independent reviews of the same screen, over time) graded PASS. This
  is the set's one positive control: a screen a human reader has repeatedly judged resolved,
  captured fresh rather than pulled from the unusable archive.

All three items were captured at the standard three-state, six-image set the prompt's Inputs
section names (390 and 1440 at rest, both themes, plus one interaction state, both themes).

This deviates from the plan's literal "archived labeled captures" wording. It does not
deviate from the plan's outcome: a labeled set with known verdicts, run against the shipped
prompt, k=3, consensus-graded.

---

## 2. The labeled set

| id | known verdict | what it is |
| --- | --- | --- |
| `cal-fail-a` | FAIL | constructed fixture: competing filled header actions, a browser-default `<mark>` highlight, a chip melting into a zebra row, a flat name/note type hierarchy, an inconsistent row-disclosure control, and a 390px header overflow |
| `cal-fail-b` | FAIL | constructed fixture: a filter block whose label-to-control spacing groups each label with the field above it rather than its own, an unarranged filter row at 1440, a status select and a table that both overflow at 390, and an expanded-row panel with no boundary tying it to its row |
| `cal-pass-members` | PASS | a fresh, read-only capture of the consumer's real Members screen, a state whose prior cold reads graded PASS |

---

## 3. Method

- **k = 3.** Each item in the labeled set was graded by three independent runs of the prompt,
  each given only the six image paths and the prompt file, per the prompt's own Inputs
  section (no cross-run context, no access to another run's verdict).
- **Consensus rule: 2 of 3.** An item's consensus verdict is whichever of PASS/FAIL at least
  two of the three runs returned.
- **Pinned model: `claude-opus-5`.** Every run, both rounds, executed on this exact model ID.
- **Two rounds.** Round 1 ran the prompt as it stood before this task. It reproduced both
  known FAILs but returned a false-positive FAIL on the known-PASS item. The prompt was
  amended (section 5) and round 2 re-ran all three items against the amended prompt.

---

## 4. Round 1 (pre-amendment prompt)

### `cal-fail-a` (known: FAIL), consensus: **FAIL** (3/3 FAIL)

All three runs failed the item at the header band (competing "Add Member" / "Export CSV"
fills, disagreeing corner radii), the browser-default `<mark>` highlight on the result-count
line, the row-disclosure control's two-treatment inconsistency, and the flat name/note type
hierarchy. Representative tells (run 1):

- Header band, item b: both header buttons carry the same accent fill, so the surface has two
  competing primary actions; the lower-stakes export should drop to ghost or outline.
- Result line, item h: the search-term echo uses the browser-default yellow `<mark>`
  highlight, unstyled in both themes, sitting against an otherwise styled admin card.
- Member rows, item d: each row's name and its "Joined YYYY" line render at the same size and
  near-identical weight, so the row's own subject does not lead over its secondary note.
- Row disclosure, item h (interaction only): the expanded row's toggle becomes a filled,
  bordered grey box while collapsed rows keep a bare triangle glyph, so one control shows two
  unrelated visual identities.
- 390 header, item f: "Export CSV" runs past the visible right edge and "Add Member" crowds
  directly onto the "Members" heading with no gap.

Runs 2 and 3 converged on the same tell families (competing header fills, the raw `<mark>`
highlight, the flat type hierarchy, the two-treatment disclosure control, the 390 overflow),
with run 3 additionally naming the "Quinn Wavefixture" off-palette name color. All three runs
agree with the fixture's construction; no false negative and no fabricated tell outside the
built-in set.

### `cal-fail-b` (known: FAIL), consensus: **FAIL** (3/3 FAIL)

All three runs failed the item on the filter block's inverted spacing rhythm (each label sits
tighter to the field above it than to its own control below), the 390px table and filter
select overflowing the viewport, the unarranged filter row at 1440, and the expanded-row panel
carrying no visible boundary to its row. Representative tells (run 1):

- Filter block, item e: the gap from a label up to the preceding control is the same as (or
  smaller than) the gap down to the label's own control, so each label reads paired with the
  wrong field.
- 390, item f: the "Current + Overdue" select overruns the filter card's right edge, and the
  household table truncates its "Members" column mid-word with no scroll affordance.
- 1440, item h: the filter cluster mixes two unrelated layouts on one card, an unlabeled
  full-width row above two labeled, narrower, left-hugging selects, leaving a large empty area
  beside them.
- Expanded panel, item e (interaction only): the disclosed detail band sits at the same
  padding and rhythm as the sibling rows, so it reads as a fifth row rather than as content
  belonging to the row that opened it.

Runs 2 and 3 converged on the same core families (the inverted label rhythm, the two
overflowing controls at 390, the unarranged 1440 filter row, the ungrouped expanded panel).
All three runs agree with the fixture's construction.

### `cal-pass-members` (known: PASS), consensus: **FAIL** (2 FAIL, 1 PASS), a calibration failure

Two of three runs returned FAIL, both citing the same structural defects: two rail items
("Overview" and "Members") both carrying full active-nav treatment, a lowercase raw route
slug in the breadcrumb, and misalignment inside the expanded-row detail panel. Run 3 returned
PASS with no tells.

Run 1's FAIL tells (verbatim):

> Nav rail, 1440 and interaction, both themes, d: "Overview" and "Members" both carry the full
> active treatment (lavender tinted pill, accent label, accent icon) at identical weight, so
> two unrelated rail entries compete for the reader's first look and neither reads as the
> current page.
>
> Header breadcrumb, 1440 and interaction, both themes, h: the trailing crumb renders as the
> raw lowercase route slug "members" beside a Title Case "Overview" crumb and a "Members" page
> title, so an unstyled default sits inside otherwise resolved chrome.
>
> Expanded row panel, interaction, both themes, e: the CONTACTS label sits about 32px above
> its first item while the MEMBERS, HOLDINGS, and CLASSES labels sit about 18px above theirs,
> and inside CONTACTS the email address and "No phone on file" are separated by about 40px;
> two items in one group therefore sit further apart than the group sits from its own label.
>
> Expanded row panel MEMBERS cell, interaction, both themes, h: the member summary wraps its
> trailing em dash onto a line by itself, leaving a one-glyph orphan under "E2E Current Member
> · Primary · Age" — an unlooked-at detail on a surface whose other three columns sit on a
> single line.

Run 2's FAIL tells cite the same nav-rail double-active tell, the same lowercase breadcrumb,
and add pixel-distance claims about the expanded panel's column x-positions ("the panel's own
'MEMBERS' column label sits roughly 90px left of the table header's own 'MEMBERS' directly
above it") and a first-line baseline claim across the panel's four columns. Run 3 returned
PASS with an empty tells list.

**Diagnosis.** The two FAIL runs manufactured or overstated evidence on a screen a human
reader had already judged resolved: an invented sub-pixel distance ("about 32px," "about
90px," "about 40px") standing in for a measurement never actually taken, and a wrapped
trailing character in a data-driven summary line (the age-computed "· Age" segment) treated
as a coherence defect rather than a content edge case. This is the failure mode section 5's
amendment targets directly.

---

## 5. Prompt amendment

Round 1's false positive traced to two identifiable defects in the prompt as it stood: no
instruction against inventing pixel measurements to support a claim, and no instruction to
distinguish a data-driven content edge case (one unusually shaped value wrapping awkwardly)
from a defect in the composition itself. A "Reading discipline" section was added to
`skills/cairn-admin-screens/references/grader-prompt.md`, immediately before the checklist,
stating four rules that bind every checklist item:

- **The materiality bar.** Read each image at the size given, no zooming, no inferred
  sub-pixel measurement. Never cite an invented distance as evidence; a claim that cannot be
  described without appealing to a measurement never actually taken does not clear the bar.
- **Verify before you name it.** A claim that two things fail to line up must be traced across
  the full row, column, or width in the actual pixels before it is included.
- **One property is not a system.** A control differing from its neighbors in one small
  affordance detail, with every other visible property matching, is not the generic-scaffold
  tell; FAIL a control only when its overall presentation reads as a different, unstyled
  system standing next to a styled one.
- **Content edge cases.** A field carrying an unusually long or unbroken value that wraps
  awkwardly while its siblings render cleanly is a content edge case in that capture's data,
  not a coherence defect in the composition, and does not alone FAIL the item.

This is the whole amendment; no checklist item, per-device rule, consensus mechanic, or output
shape changed. Round 2 re-ran all three labeled items against this amended prompt.

---

## 6. Round 2 (post-amendment prompt)

### `cal-fail-a` (known: FAIL), consensus: **FAIL** (3/3 FAIL)

All three runs again failed the item, converging on the same core tell families as round 1
(competing header fills, corner-radius disagreement, the raw `<mark>` highlight, the
row-disclosure inconsistency, the flat name/note hierarchy, the 390 header overflow), each
tell traceable to a plainly visible, ordinary-read defect rather than an invented measurement.

### `cal-fail-b` (known: FAIL), consensus: **FAIL** (3/3 FAIL)

All three runs again failed the item on the same core families (the inverted label-to-control
rhythm, the two overflowing controls at 390, the unarranged 1440 filter row, the ungrouped
expanded-row panel), again without invented sub-pixel distances.

### `cal-pass-members` (known: PASS), consensus: **PASS** (3/3 PASS)

All three runs returned PASS with an empty tells list. The nav-rail double-active tell and the
lowercase breadcrumb tell that fired in round 1 did not recur in any of the three round-2
runs; against the amended prompt's materiality bar and content-edge-case rule, the reviewers
that had cited invented pixel distances and the wrapped-em-dash content edge case in round 1
no longer had grounds to FAIL the screen.

---

## 7. Verdict

**Calibration SUCCEEDED.** Round 2, on the amended prompt, reproduces all three known verdicts
by 2-of-3 consensus: `cal-fail-a` FAIL, `cal-fail-b` FAIL, `cal-pass-members` PASS.

- **Consensus rule:** 2 of 3.
- **Pinned model:** `claude-opus-5`.
- **Final prompt file:** `skills/cairn-admin-screens/references/grader-prompt.md`.
- **Final prompt SHA-256:**
  `55b99a1497842e6f81b7c9cfc3ea4f6c720ff7ad363a553b629d53abcdd171e9`

---

## Disposition of the probe fixtures

The two constructed fixture routes (`examples/showcase/src/routes/probe-calibration/{fail-a,
fail-b}/`) and the eighteen capture images they and the Members read produced
(`docs/internal/probes/2026-07-29-grader-calibration/`) were scratch artifacts for this
calibration run, each marked in its own header comment as staying uncommitted until this
ledger step decided their fate. This ledger's per-round tells (sections 4 and 6) are the full
record of what each run found; the fixtures themselves carry no further evidentiary value
beyond reproducing that record, and are removed rather than committed. A later calibration
round that needs a labeled FAIL fixture can rebuild one from the tell families named in
section 2, or draw a fresh consumer capture per section 1's method.
