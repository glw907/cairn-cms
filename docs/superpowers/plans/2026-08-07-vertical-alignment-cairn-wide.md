# Vertical alignment, cairn-wide — implementation plan

> **For agentic workers:** execute task-by-task per the repo's standing method: dispatch each
> task to `cairn-implementer` (pinned Sonnet), test-first; the main loop reviews each diff and
> confirms the full gate before the next dispatch. This pass GATES RELEASE ONE. This plan
> supersedes [`2026-08-07-vertical-alignment.md`](2026-08-07-vertical-alignment.md) (admin-only,
> stopped mid-task-1 and rescoped the same day). The governing design is the ratified spec at
> [`2026-08-07-vertical-alignment-cairn-wide-design.md`](../specs/2026-08-07-vertical-alignment-cairn-wide-design.md);
> where this plan is silent, the spec answers.

**Goal:** cairn owns vertical alignment on both surfaces where it owns the geometry: a measured
inventory across the admin's and Waymark's rendered screens, engine-owned recipes per confirmed
composition class on each surface, one generalized `cairn-audit` tripwire that measures any
rendered page, and honest upgrade notes for the consumers already exposed.

**Architecture:** one probe, two corpora. The measurement method is the correctness-critical
asset and stays singular: a shared metric-by-class measurement module drives both the probe
(task 1) and the audit rule (task 4), so the three traps are encoded once. Recipes land where
the geometry lives: the admin toolkit ships via npm (task 2); the Waymark chassis propagates by
copy through `examples/showcase` (task 3).

## Global constraints

- Additive only. No change to `FieldLabel`'s markup, registers, or semantics: an action
  affordance never goes inside its `<label>` (it would join the field's accessible name).
- Engine and chassis only. No consumer-repo edits; ASC's `/join` fix runs in `aksailingclub-org`
  on its own clock, caught by the shipped rule.
- **The three measurement traps bind every measuring artifact** (probe, rule, fixture
  assertions), verbatim from the spec: (1) an icon beside a multi-line block pairs with the
  block's FIRST LINE box, never the block; (2) type metrics resolve from the element that renders
  the line, never its container (the container reading returned −0.4px on a visibly broken row);
  (3) icon geometry is ink bounds (`getBBox()` through the screen CTM), text geometry is the
  glyph box (`getClientRects()` on a `Range`, cap-centre for title-class comparisons); element
  boxes only for controls whose border box is the visual object.
- **Metric by the pair's class:** text-beside-text compares BASELINES (a mixed-size pair sharing
  a baseline is correct typography); icon-beside-text and control-beside-text compare
  visible-content (ink) centres; optical suspects (buttons, chips, badges) compare glyph centre
  vs padding-box centre. Inventory reporting bar: 2px.
- Per-task gate: targeted tests, `npm run check` 0/0, `npm test` exit 0, `check:comments`; at
  pass end the four CI-only gates by name (`check:reference:signatures`, `check:surface`,
  `check:snippets`, `check:comments`) plus `check:invisible-craft`.
- Both visual baselines move (admin suite and the five-viewport site suite): each move runs
  through the visual-fidelity read, and Geoff sees before/after crops before merge.
- Design-system doc updates ride the task that changes the behavior (admin doc in task 2,
  Waymark doc in task 3).
- Task 1's inventory SIZES this pass; the sizing rule applies from the first split. Declared
  split point: the chassis long-tail sweep leaves first as a numbered follow-up, and the
  npm-shipped machinery (tasks 2, 4, 5) keeps the release-one gate. Tasks 2 and 3 are the
  watched tasks; a second task split anywhere in the pass triggers the split proposal.
- Worktree: reuse `.claude/worktrees/vertical-alignment` after fast-forwarding it to `main`'s
  tip (the rescope commits landed after the worktree was cut). Then a from-scratch
  `npm install` in the worktree's showcase, or its e2e proves MAIN's engine (the symlink
  gotcha); the `pretest:e2e` repackage hook covers the stale-`dist` half only.
- `text-box: trim-both cap alphabetic` is a progressive enhancement (Chrome/Edge 133+, Safari
  18.2+; unsupported browsers ignore it). No fallback machinery.

### Task 1: the probe and the measured inventory (two corpora)

**Files:**
- Create: `src/lib/audit/rules/rendered/vertical-metrics.ts` — the shared in-page measurement
  module (ink bounds, glyph box, first-line pairing, metric-by-class delta), following
  `field-edge-alignment.ts`'s existing in-page measurement pattern
- Create: `scripts/probe-vertical-alignment.mjs` — the renderer/walker that drives the module
  over both corpora and emits the inventory
- Create: `docs/internal/2026-08-vertical-alignment-inventory.md` — emitted by the probe
- Test: `src/tests/unit/audit/rules/rendered/vertical-metrics.test.ts` — the calibration
  fixtures and the metric-by-class unit tests

**Interfaces:** produces the measurement module task 4's rule imports, the re-runnable probe
task 4 re-runs as its verification, and the inventory table tasks 2 and 3 consume (columns:
surface, screen/route, viewport, theme, component file, pair class, measured delta, crop
reference, disposition).

A salvaged 802-line draft exists (paths in the spec, section "Architecture"); it predates traps
2 and 3, so correct it against the global constraints rather than trusting it. Two synthetic
calibration fixtures are required, since neither corpus still exhibits the known defects: one
reproducing ASC's season row (a stacked `FieldLabel` field beside a bare control in one flex
row; expected structural delta ≈12.5px, the label's height), one reproducing the `/join`
icon-card shape (an SVG icon beside a multi-line title block; the fixture must put the icon ink
measurably above the title cap centre). The probe self-calibrates on both fixtures before
measuring the corpora and refuses to emit if calibration misses sign or magnitude.

The corpora, verbatim from the spec: ADMIN — the visual suite's page list (office, lists, edit
with Details open, media library and detail, editors, settings, dialogs, plus the command
palette open and one open-menu state) at 1440 and 768 (per `admin-visual.spec.ts`) plus 390,
both themes, measuring every flex/grid row with two or more visible children AND every `<tr>`
in `AdminTable`/`OfficeList`. PUBLIC — the showcase `(site)` chrome, one representative article
page (directives, callouts, code), and `/styleguide`, at 320/390/768/1440/2560, both themes.
States not rendered (hover, focus, validation) are listed in the inventory as unmeasured. The
inventory doc's header records the three traps.

**Acceptance criteria:** the inventory exists with measured deltas and crop references, every
row above 2px dispositioned (recipe task or explicit decline with reason), zero rows "unknown";
the probe is re-runnable; the calibration self-check passes on both fixtures and is itself a
unit test; `vertical-metrics` unit tests cover each pair class including the non-firing
baseline-aligned mixed-size text pair.

### Task 2: admin-toolkit recipes and silent defaults (npm-shipped)

**Files:**
- Create: `src/lib/admin-toolkit/FieldRow.svelte`, exported through the same subpath as its
  admin-toolkit siblings
- Modify: `src/lib/components/cairn-admin.css` (row treatments the inventory confirms;
  `text-box: trim-both cap alphabetic` on the label-like recipes: `type-label`, `type-chip`,
  the button recipes)
- Modify: `src/lib/admin-toolkit/FieldLabel.svelte` (`@component` block only: the composition
  guidance)
- Modify: every engine/showcase/scaffold admin row the inventory confirmed defective
- Modify: `docs/internal/admin-design-system.md` (the vertical-alignment mechanics section: the
  two-class diagnosis, the metric-by-class table, the recipes)
- Test: browser-project component tests beside the existing admin-toolkit tests

`FieldRow` bottom-aligns its children (`items-end`), correct for any mix of stacked fields and
bare controls, a no-op for same-height children, with the one caveat documented (a field
rendering an error line below its control breaks bottom-alignment; the toolkit currently
renders none). Row treatments beyond `FieldRow` extend only to what task 1 confirmed. This task
carries five deliverables; if the inventory's confirmed admin list pushes it past that, propose
the split rather than absorbing.

**Acceptance criteria:** browser-project tests prove each recipe's alignment within 1px on real
layout; the admin visual baseline regenerates and the diffs pass the visual-fidelity read with
Geoff's before/after; the design-system section is in place; full per-task gate.

### Task 3: Waymark chassis recipes (copy-propagated)

**Files:**
- Modify: `examples/showcase/src/theme/theme.css` and/or
  `examples/showcase/src/chassis/composition.css` (wherever the inventory locates each shape):
  the icon-beside-text row mechanic, `text-box-trim` on Waymark's label-like recipes, plus
  whatever public rows task 1 confirmed
- Modify: the `(site)` chrome components the inventory names
- Modify: `examples/showcase/src/routes/(site)/styleguide/+page.svelte` — demonstrate each new
  or corrected recipe (the styleguide is the chassis the next theme port receives)
- Modify: `docs/internal/public-design-system.md` (the same mechanics section, Waymark register)
- Test: the site visual suite (`site-visual.spec.ts`, baselines regenerate on CI, the canonical
  renderer) plus `styleguide.spec.ts` if the styleguide's structure changes

The engine's public *output* stays design-agnostic: these are chassis mechanics, never
constraints on a consumer's own `render`. The five-viewport bar holds; composed at 320 and
2560, never merely unbroken.

**Acceptance criteria:** the re-composed public rows measure within task 1's noise floor when
the probe re-runs; site baselines regenerate on CI and the diffs pass the visual-fidelity read
with Geoff's before/after; the styleguide demonstrates the recipes; the Waymark doc section is
in place; full per-task gate.

### Task 4: the tripwire (`cairn-audit` rendered rule)

**Files:**
- Create: `src/lib/audit/rules/rendered/vertical-alignment.ts`, registered in
  `src/lib/audit/rules/rendered/index.ts`, importing `vertical-metrics.ts`
- Test: `src/tests/unit/audit/rules/rendered/vertical-alignment.test.ts`

The rule generalizes what task 1 proved measurable, scoped to the composition contexts the
inventory validated. It inherits the metric-by-class split and the three traps through the
shared module; it never fires on a deliberately baseline-aligned mixed-size text pair. The
stacked-field case is named in the finding message, recommending `FieldRow`/`items-end` and
stating the measured delta. The threshold comes from the inventory's measured noise floor, not
the placeholder 4px; any fixed defect sitting between the 2px reporting bar and the firing bar
is recorded in the inventory doc, so the regression window is a stated decision. Learn from
`field-edge-alignment`'s filed weaknesses (previous-member clustering, the
always-recommends-stacked message). If ink/glyph measurement proves too flaky for CI, ship the
border-box half and record the optical half as probe-script-only in the inventory doc, stated
plainly.

**Acceptance criteria:** fires on both task 1 calibration fixtures; silent on `FieldRow`
compositions, same-height rows, validated top-aligned layouts, and the baseline-aligned
mixed-size text pair (fixtures prove each non-firing); green over the swept engine and
showcase; the task 1 probe re-run reports zero rows above threshold across both corpora, or
each survivor is a documented decline; full per-task gate.

### Task 5: docs, changelog, upgrade notes, roadmap

**Files:**
- Modify: `docs/reference/admin-toolkit.md` (`FieldRow` and any new recipe surface)
- Modify: `CHANGELOG.md` under `## Unreleased`
- Modify: `docs/guides/upgrade-cairn.md` — the new entry AND the retroactive `0.92.0` geometry
  note ("check any flex row pairing a field with a bare control; compose with `FieldRow` or
  `items-end`"), each written as an adopter checklist item, not an erratum apology
- Modify: `ROADMAP.md` — the 2026-08-06 both-axes entry closes; the optical-centring default
  entry closes; the `field-edge-alignment` weaknesses entry updates if task 4 resolved any of it
- Verify: the design-system sections landed by tasks 2 and 3 read correctly against the shipped
  behavior

**Acceptance criteria:** the four doc gates plus `check:surface` with the regenerated snapshot;
`check:reference` clean over the new export; the upgrade guide entries read as checklist items;
ROADMAP lists neither closed entry.
