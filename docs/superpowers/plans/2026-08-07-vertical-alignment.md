# Vertical alignment (the pervasive class, not one row shape) — implementation plan

> **For agentic workers:** execute task-by-task per the repo's standing method: dispatch each
> task to `cairn-implementer` (pinned Sonnet), test-first; the main loop reviews each diff and
> confirms the full gate before the next dispatch. This pass GATES RELEASE ONE, and the
> remaining consumer migrations run AFTER release one so each site crosses once (Geoff,
> 2026-08-07). The governing evidence is the ROADMAP entry "The field register has now produced
> an alignment defect on BOTH axes" (2026-08-06), ASC commit `f0f79bb`, and Geoff's 2026-08-07
> direction that the issue is more pervasive than field rows.

**Goal:** the engine owns vertical alignment wherever it owns the geometry, instead of advising
consumers about it. Not one fix: a measured inventory of the defect across the admin's rendered
screens, engine-owned recipes for each composition class the inventory confirms, a tripwire
that detects the miss mechanically, and an honest upgrade note for the consumers already
exposed.

**The diagnosis (two classes, one cause):** vertical-alignment knowledge lives at a different
altitude than vertical geometry. STRUCTURAL: the engine defines a component's internal shape,
the composition around it picks the alignment, and nothing connects the two, so an engine shape
change (the `0.92.0` stacked register) silently breaks every row composed against the old
shape. Known instances beyond the field row: icon-beside-text rows (a geometric block beside a
line box), two-part rows whose halves carry different line heights, fixed-height DaisyUI
controls meeting the custom type scale. OPTICAL: CSS centers line boxes while the eye centers
glyphs, per-font, which is why pixel nudges never stay fixed; `text-box-trim` is the
at-the-source answer.

## Global constraints

- Additive only. No change to `FieldLabel`'s markup, registers, or semantics: an action
  affordance never goes inside its `<label>` (it would join the field's accessible name).
- Per-task gate: targeted tests, `npm run check` 0/0, `npm test` exit 0, `check:comments`,
  plus the four CI-only gates by name at pass end (`check:reference:signatures`,
  `check:surface`, `check:snippets`, `check:comments`) and `check:invisible-craft`.
- Admin design system doc updates ride the task that changes the behavior.
- Task 1's inventory SIZES this pass. If the confirmed defect list needs more than the two
  recipe classes task 2 budgets, the orchestrator proposes splitting (recipes-and-defaults
  this pass, the long-tail sweep as a numbered follow-up) rather than absorbing it; the
  pass-sizing rule applies from the first split.
- Feature worktree off `main`; mind the showcase-symlink gotcha.

### Task 1: the measured inventory (replaces any grep-only scoping)

**Files:** a probe script under `scripts/` (or a `cairn-audit` dev harness extension if the
rendered-audit engine already exposes the measuring half), and the inventory doc it emits at
`docs/internal/2026-08-vertical-alignment-inventory.md`.

Render the admin's screens (the visual suite's page list is the enumeration: office, lists,
edit with the Details panel open, media library and detail, editors, settings, dialogs) at
1280 and 390, both themes, and MEASURE, per flex/grid row containing two or more visible
children: each child's visible-content vertical center (for text: the glyph box via
`getClientRects` on a Range, not the element box; for controls and icons: the border box)
and the delta between siblings. Emit every row whose delta exceeds 2px, with a screenshot
crop reference, the component file, and a first-guess class (stacked-field row, icon-text
row, mixed-line-height pair, fixed-height control, optical-only). ALSO measure the known
optical suspects (buttons, chips, badges: glyph center vs padding-box center). The output is
a table the orchestrator reads and Geoff can skim, each row dispositioned in task 2/3 or
explicitly declined with a reason. The ASC season-row case (12.5px) is the calibration row:
the probe must find its shape in any showcase equivalent, or explain why the showcase lacks
one.

**Acceptance criteria:** the inventory doc exists with measured deltas and crops; the probe
is re-runnable (it becomes task 3's fixture source); zero rows are dispositioned "unknown".

### Task 2: engine-owned recipes and silent defaults

**Files:** `src/lib/admin-toolkit/FieldRow.svelte` (new, exported); `cairn-admin.css`;
`FieldLabel.svelte`'s `@component` block; the admin design system's form-row and row-recipes
sections; every engine/showcase/scaffold composition the inventory confirmed defective.

Two budgeted recipe classes plus one default, extended only by what task 1 confirms:
- **`FieldRow`**: bottom-aligns its children (`items-end`), correct for any mix of stacked
  fields and bare controls, no-op for same-height children. Document the one caveat (a field
  rendering an error line below its control breaks bottom-alignment; the toolkit currently
  renders none).
- **The icon/text and mixed-line-height row treatment**: whatever the inventory confirms as
  the recurring shape, fixed at the recipe level in `cairn-admin.css` (a `.cairn-row` recipe
  or per-component fix), with the mechanic documented in the design system. If the inventory
  shows this class is small, it folds into the sweep; if large, it is the split point.
- **`text-box: trim-both cap alphabetic`** as a progressive-enhancement silent default on the
  label-like recipes (`type-label`, `type-chip`, button recipes), per the workstation
  silent-default rule for always-right mechanics.

Re-compose every confirmed-defective engine, showcase, and scaffold row. Baseline churn is
expected and reads on CI; **this moves the approved admin visual baseline, so the diffs run
through the visual-fidelity read and Geoff sees before/after crops before merge.**

**Acceptance criteria:** browser-project component tests prove each recipe's alignment within
1px on real layout; the re-run task 1 probe reports zero rows above threshold in the swept
screens (or each survivor is a documented decline); the public design system is untouched
(public output stays design-agnostic; these are admin/toolkit mechanics).

### Task 3: the tripwire (`cairn-audit`)

**Files:** a new rendered rule beside `field-edge-alignment`; fixtures.

The rule generalizes to what task 1 proved measurable: within one flex row, a sibling whose
visible-content vertical center diverges beyond threshold (start 4px; ASC measured 12.5),
with the stacked-field case called out by name in the finding message (recommending
`FieldRow`/`items-end` and stating the measured delta). Scope to composition contexts the
inventory validated, so legitimately top-aligned layouts do not false-positive; learn from
`field-edge-alignment`'s filed weaknesses (previous-member clustering, the
always-recommends-stacked message). If glyph-box measurement proves too flaky for CI, the
rule ships the border-box half and the inventory doc records the optical half as
probe-script-only, stated plainly rather than silently narrowed.

**Acceptance criteria:** fires on a fixture reproducing ASC's season row; silent on `FieldRow`
compositions, same-height rows, and validated top-aligned layouts; green over the swept
engine and showcase.

### Task 4: docs, changelog, upgrade note, roadmap

**Files:** `docs/reference/admin-toolkit.md` (FieldRow and any new recipe surface), the admin
design system sections (verified), `CHANGELOG.md` under `## Unreleased`,
`docs/guides/upgrade-cairn.md` (the new entry AND a retroactive geometry note on the `0.92.0`
entry: "check any flex row pairing a field with a bare control; compose with `FieldRow` or
`items-end`" — the changelog convention covered the API, not the shape change, and
`907-life`/`cairn-pub` cross that flip in their post-release-one migration), `ROADMAP.md`
(the 2026-08-06 both-axes entry closes; the optical-centring default entry closes; the
`field-edge-alignment` weaknesses entry updates if task 3 resolves any of it).

**Acceptance criteria:** the four doc gates plus `check:surface` with the regenerated
snapshot; the upgrade guide's 0.92.0 note reads as an adopter checklist item, not an erratum
apology.
