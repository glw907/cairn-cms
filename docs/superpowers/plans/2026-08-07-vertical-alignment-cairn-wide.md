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

## EXECUTION STATE (2026-08-07, pass closed, not merged)

**Pass A is closed and committed on the `vertical-alignment` branch, HEAD `4ed4d05f`. It is NOT
merged to `main`, NOT released, and NOT visually verified.** All five carried tasks (1c's finish,
2, the suite widening, 4b, 5) landed, plus a `code-simplifier` pass over the whole diff. The full
post-mortem is below. What the main loop still owes before this can merge: read the moved admin
and site visual baselines against the visual-fidelity method (site baselines do not exist yet and
regenerate on CI first), get Geoff's before/after, and rule on the two open decisions the
post-mortem names (the static rule's shipped precision, and the `.cairn-icon-label` wrapping-label
gap). Do not re-run task 1 or re-derive the inventory; it is done and its numbers are final.

## RESCOPE, ratified by Geoff 2026-08-07 (after task 1; supersedes the task list below)

**The measured defect surface came in far smaller than this plan assumed, and the pass is cut
short accordingly.** Task 1 ran, was condemned by audit three times, and split twice (1a the probe
and module, 1b the block-versus-line correction, 1c the metric-selection correction). Two splits is
this plan's own trigger for a pass-split proposal, and the proposal was made and answered.

What the corrected inventory actually found, against an expectation of broad two-surface defect
classes: **one admin mechanic at three call sites** (`CairnTidySettings.svelte` 367/372/380: an
`inline-flex` label containing an icon synthesises its baseline from the icon, so the row's own
declared `sm:items-baseline` misses by 2.5px), **one chip genuinely low** (`22a0e709`), **one
marginal icon row** (`76d4cd3e`, −2.33px against thirteen siblings at −0.5 to −0.75px), and **zero
public rows**. Task 3's only candidate was a false positive. This is not a measurement failure: the
`/join` evidence that drove the cairn-wide rescope lives on a consumer site, and the boundary
decision keeps consumer fixes in consumer repos, so cairn's own corpora cannot contain it. The
pass's public deliverable is the tripwire that catches it site-side, plus the doctrine.

**This pass (Pass A) carries, and keeps the release-one gate:**

1. Task 1c, finishing (the metric-selection correction and its independent grade).
2. **Task 2, reduced** to the confirmed admin work: the one three-call-site mechanic, `22a0e709`
   levelled on the heading's line box (NOT its baseline), and `76d4cd3e`. `FieldRow` and the
   `text-box: trim-both` silent defaults still ship as spec-declared enhancements, stated plainly
   as having no measured backing (the inventory found zero optical defects).
3. **The five-viewport site-suite widening as its own task**, separated from task 3. It is coverage
   hygiene independent of alignment, and it stands whether or not a chassis recipe ever lands.
4. Task 4, the `cairn-audit` tripwire.
5. Task 5, the docs, changelog, and upgrade notes, **now also carrying the Waymark mechanics doc
   section** that task 3 was to have written.

**Task 3 is dissolved.** Its recipe work is empty, its doc section moves to task 5, and its
styleguide demonstration drops, since there are no new public recipes to demonstrate.

**The follow-up pass carries** the sub-bar `ConceptList` family (fifteen rows at exactly 1.55px,
the same shape as the three confirmed defects, sitting below the 2px bar) and whatever the shipped
tripwire finds once consumers cross it. It is not the old "chassis long tail", which measured empty.

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
- Modify: `examples/showcase/e2e/site-visual.spec.ts` — WIDEN to the full five-viewport bar
  (Geoff, 2026-08-07; see the amendment below)

The engine's public *output* stays design-agnostic: these are chassis mechanics, never
constraints on a consumer's own `render`. The five-viewport bar holds; composed at 320 and
2560, never merely unbroken.

**Amendment (Geoff, 2026-08-07): widen the site suite to all five viewports in this task.** The
suite as committed does not meet the bar it is supposed to enforce: home covers 320, default,
and 2560 in light plus one dark; article covers 320, 1920, and 2560 in light only; styleguide
covers light and dark at the default width. Nothing covers 390 or 768, which is exactly where a
re-composed icon row is most likely to break, so regenerating the nine existing baselines would
prove the bar without testing it. Task 3 brings `site-visual.spec.ts` to 320/390/768/1440/2560
across both themes for home, the representative article, and the styleguide. Baselines render on
CI, the canonical renderer, never locally.

**Deliverable count: six** (recipes, `(site)` chrome, styleguide demonstration, the Waymark doc
section, the baseline move with its visual-fidelity read, and this suite widening). That is past
the roughly-four bar and past the five task 2 is capped at, on a task the constraints already
name as watched. The widening is the cleanest thing to shed if the inventory pushes task 3 over:
it is chassis-adjacent and self-contained, so it can leave with the declared chassis long-tail
follow-up without weakening the release-one gate, which rides on the npm-shipped machinery. Take
that call at dispatch, against task 1's confirmed public-row count, not before.

**Acceptance criteria:** the re-composed public rows measure within task 1's noise floor when
the probe re-runs; `site-visual.spec.ts` covers 320/390/768/1440/2560 in both themes for home,
article, and styleguide; site baselines regenerate on CI and the diffs pass the visual-fidelity
read with Geoff's before/after; the styleguide demonstrates the recipes; the Waymark doc section
is in place; full per-task gate.

### Task 4: DROPPED (Geoff, 2026-08-07). The lab keeps the instrument; nothing new ships.

**The ruling:** complexity locally to build the engine is fine; what ships to a developer must be as
simple and clean as it can be. The rendered rule was the only artifact in this pass that is BOTH
complex AND shipped, so it does not ship. This reverses the ratified spec's "one generalized
`cairn-audit` rule measuring any rendered page"; the spec's reasoning is superseded, not forgotten.

**What that removes, and this is the point.** No sixteenth rendered rule on the audit surface. No
firing threshold, so the fifteen `ConceptList` rows at exactly 1.55px stop being a decision and
become an observation. No tier question. No false-positive fixture burden for the brand tile, the
count pill and the footer masthead. No measurement engine in the shipped package.

**What it costs, stated plainly.** A consumer can no longer point `cairn-audit` at their own pages
and get vertical-alignment findings on markup cairn has never seen. The spec named that as the
mechanism that would catch ASC's `/join` icon-card class site-side. That class is NOT covered again
until the pre-beta pass ships the precomputed icon-ink table, which reaches the same defect
statically: an icon's ink offset inside its own viewBox is a property of the icon FILE, computable
offline from path data, so a static rule can know which icons ride high without rendering anything.
ASC has already fixed its own `/join` cards by hand, so the gap is future recurrence rather than a
live defect. Record it in the pre-beta initiative as that pass's first target.

**The instrument is LAB APPARATUS, and the CLEANUP PASS relocates it, not this pass** (revised
2026-08-07, before the relocation was attempted). `vertical-metrics.ts` and
`probe-vertical-alignment.mjs` are cairn's discovery instrument, not engine code, and
`vertical-metrics` ships today (`dist/audit/rules/rendered/vertical-metrics.js`, verified). It must
stop shipping. But moving it HERE means moving it twice, into whatever location this pass invents
and again into whatever structure the cleanup pass settles on, and the lab-versus-shipped boundary
is that pass's whole organizing principle rather than one file's problem.

So this pass leaves both files where they are and marks the module with a co-located `// WATCH:`
comment, the mechanism this repo's watch-item doctrine prescribes for a next-time-you-touch-X note.
The cleanup pass draws the boundary once, across the whole repo, and confirms with
`npm run check:package` and `npm run check:surface` that neither file reaches the package. Filed in
`ROADMAP.md`'s Now tier as that pass's worked example.

**Delete the census when task 2 consumes it.** `docs/internal/2026-08-vertical-alignment-inventory.md`
is a point-in-time snapshot, already four corrections deep and stale the moment the fixes land. The
durable lesson lives in `2026-08-07-vertical-alignment-harvest-findings.md`. Keeping a stale census
contradicts the same complete-or-move rule the friction log runs on.

### Task 4 (superseded, retained for the reasoning only): the tripwire (`cairn-audit` rendered rule)

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

**Amendment (Geoff, 2026-08-07): TARGET `error` TIER, and treat precision as the deliverable.**
Geoff's ruling is that mechanical guardrails in the system beat training Claude to be more
effective on its own, and that ranking demotes every advisory or agent-facing channel. An
advisory rule reports and never gates, so it is inert unless someone runs it AND reads it, which
makes it the same class of intervention as prompting. The guardrail is a rule that FAILS THE
BUILD.

Do not copy `field-edge-alignment`'s `tier: 'advisory'` by default. Design for `error` and state
the reasoning either way.

This raises the precision bar rather than lowering it, and that is the point. An advisory rule is
allowed to be sloppy, because a false positive only adds noise to a report. An error-tier rule
cannot be, because a false positive fails a CONSUMER'S build on a correctly composed row. Shipped
at error tier off task 1's first inventory, this rule would have broken builds on the admin brand
tile across eleven screens and on the public footer masthead at every viewport, every one of them
composed correctly. The three condemnation rounds bought the precision this tier requires.

The threshold decision is therefore load-bearing, not a footnote. The fifteen `ConceptList` rows
at exactly 1.55px carry the same shape as the three confirmed defects, so any threshold in the
window either adopts them or excludes them, and at error tier that choice fails builds or misses
a family. Size it before picking, and record the choice as a decision.

**If the evidence will not support `error`, say so plainly and ship advisory with the reason
stated.** A rule quietly shipped advisory and described as a tripwire is the failure this
amendment exists to prevent.

**Acceptance criteria:** fires on both task 1 calibration fixtures; silent on `FieldRow`
compositions, same-height rows, validated top-aligned layouts, and the baseline-aligned
mixed-size text pair (fixtures prove each non-firing); **zero false positives across both
corpora, proven by fixtures for each confirmed-correct composition the pass identified
(`1728754a` the brand tile, `689c8adb` the count pill, `dabaf490` the footer masthead, plus both
reviewed declines)**; the shipped tier is a stated decision with its evidence; green over the
swept engine and showcase; the task 1 probe re-run reports zero rows above threshold across both
corpora, or each survivor is a documented decline; full per-task gate.

### Task 4b: the static guardrail (no browser), NEW (Geoff, 2026-08-07)

Geoff's ruling: mechanical guardrails beat training the agent, and the guardrail should not need
Playwright. This task ships the first one. Beta blocks on the full capability; this pass ships the
narrow, working half so release one is not held for the architecture.

**Files:**
- Create: a static rule under `src/lib/audit/rules/static/`, registered like `motion-band`,
  `gap-scale` and `token-colors`, using the same `svelte/compiler` substrate
- Test: fixtures beside the existing static-rule tests

**What it detects:** the ONE mechanic this pass confirmed, as a STRUCTURAL PATTERN rather than a
measurement. A flex item whose own display is `inline-flex` and whose first child is an icon,
inside a container declaring `items-baseline` (any breakpoint prefix). Such a label synthesises its
baseline from the icon, never from its text, so the row's declared baseline alignment cannot hold.
Confirmed at `src/lib/components/CairnTidySettings.svelte` 367, 372 and 380.

**Why static works HERE and not in general.** The dividing line is authored versus rendered, and
this repo has already paid to learn it: `touch-targets` and `interactive-contrast` were graduated
FROM static TO rendered because a regex could not read computed geometry or an oklch color, and
interactive-contrast had plausibly been passing VACUOUSLY for its whole life. The static rules that
survived (`motion-band`, `gap-scale`, `token-colors`) all check an authored value against a scale.
This mechanic is likewise authored: the defect IS the markup shape, so no rendering is needed to
see it. Do not extend this rule to anything that requires a measured threshold; that is the mistake
the graduation history records.

**The vacuous-pass guard is mandatory**, and it is what the interactive-contrast lesson demands: a
fixture the rule MUST trip, asserted to trip, so a rule that silently matches nothing fails its own
test rather than reporting clean. Same discipline as the probe's calibration refusal, one layer
down.

**Acceptance criteria:** fires on all three confirmed call sites; silent on a baseline row whose
label is not `inline-flex`, on an `inline-flex` label with no leading icon, and on the same label
under a non-baseline container (fixtures prove each non-firing); the must-trip fixture is asserted;
runs in `npm run check` with NO browser, NO server and NO Playwright; ships at a stated tier with
its reasoning; full per-task gate.

**Deliverable count: one.** It is deliberately one pattern on an existing substrate. Resist adding
patterns here; the pre-beta pass owns breadth.

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

## Post-mortem (Pass A, closed 2026-08-07)

### What was built

Task 1's inventory (5028 readings, 106 renders, 7 rows above the 2px bar) drove everything below
it; it is not repeated here. On top of it, this pass shipped:

- **The `.cairn-icon-label` and `.cairn-line-slot` recipes** in `cairn-admin.css`, fixing the
  three confirmed `CairnTidySettings.svelte` rows and the pill.
- **A markup-only fix to `EditorToolbar.svelte`**, wrapping the Write-tab icon in an
  `inline-flex` span so DaisyUI's button centres it the same way it centres every other
  icon-in-button row.
- **`FieldRow.svelte`**, a new `admin-toolkit` export (`items-end` composition for a stacked
  field beside a bare control), and the `text-box: trim-both cap alphabetic` silent default,
  which was measured and explicitly declined rather than shipped (see below).
- **`icon-baseline-synthesis`**, a new static, browser-free `cairn-audit` rule shipped at
  `advisory` tier (commit `4503da4b`, after two rounds targeting `error`), detecting the one
  confirmed mechanic (an `inline-flex` label with a leading icon inside a baseline row) as a
  structural markup pattern rather than a measurement. A 59-probe re-verification found five
  shapes that render at 0.00px and still fire, decisively an icon-only label whose prescribed fix
  measures identically before and after, so a consumer could not make that build green by obeying
  the message. The four steps that would earn `error` are filed in `ROADMAP.md`, not taken here.
- **The site-visual suite widened** from ad hoc, uneven coverage to the full five-viewport bar
  (320/390/768/1440/2560) in both color schemes, for three representative surfaces.
- **Docs**: the admin and Waymark design-system sections, `CHANGELOG.md`, the upgrade guide's
  retroactive `0.92.0` note, `ROADMAP.md` closed and re-filed, the harvest findings doc
  (`docs/internal/2026-08-07-vertical-alignment-harvest-findings.md`), and the friction-log entry
  on `FieldLabel`'s missing pointer to `FieldRow`.
- **A `code-simplifier` pass** over `vertical-metrics.ts`, `icon-baseline-synthesis.ts`, and their
  tests, folding repeated shapes into shared helpers without touching any CSS, markup, or
  component file, so no measured box moved after the fixes landed.

### What was verified, with evidence

Every task ran its own targeted test, `npm run check` at 0 errors/0 warnings, and `npm test` at
exit 0; the final full-gate run (22 steps derived from `.github/workflows/test.yml`, everything
except the Playwright e2e suite, which needs CI-regenerated baselines) exited 0 on all 22 at HEAD
`4ed4d05f`: `npm run check` 1604 files, 0/0; `npm test` 414 files / 5282 tests, process exit 0
(checked via `echo $?`, not inferred from the summary line); `npm run check:package`,
`check:reference`, `check:reference:signatures`, `check:surface`, `check:custom-surface`,
`check:snippets`, `check:docs`, `check:prose`, `check:comments`, and the showcase's own
`svelte-check` (625 files, 0/0) all green.

The icon-label and pill fixes were independently re-measured in headless Chromium 148 against the
shipped dist sheet, not just asserted by the implementer: label-vs-value baseline moved from
-2.50px to 0.00px on all three `CairnTidySettings.svelte` rows; the pill's padding-box centre moved
from +5.00px to 0.00px against the heading's first line box; the Write-tab icon moved from -2.33px
to -0.83px, matching the icon-in-button control to 0.5px. A later measurement on the real rendered
page corrected that post-fix figure from the -0.33px first reported. Commit `68d622a1`'s message
carries the wrong number and stays as written history. The pre-fix -2.33px is exact, and the
component tests never contradicted -0.83px, since they assert absolute deltas within 1px and within
0.5px of the icon-in-button control. The three findings the pass's own review gate raised (the CSS
comment misstating the mechanism, `text-box-trim`'s non-shipping, and the missing `FieldLabel`
pointer) were each verified against real Chromium measurements or grep, not taken on the
implementer's word. Task 4b's precision claim did not hold on first submission: an
adversarial verification round reproduced five distinct false-positive shapes at error tier
(self-declared baseline, self-* opt-out, column direction, a `class:` directive, a ternary) against
real markup, all fixed in `f141e3ae`. A second, later review round found the fix incomplete; see
"Open decisions" below, since that finding did not get a further fix commit in this pass.

### Decisions locked in

- **The icon-label mechanism**, as shipped after the review gate (commit `524a76a8`):
  `align-items: baseline` on `.cairn-icon-label` plus `align-self: start; min-height: 1lh` on its
  `> svg`. Chromium synthesises a flex container's reported baseline from its first
  BASELINE-PARTICIPATING item; pulling the icon out of that group leaves the word as the only
  participant, so the container's baseline becomes the word's. Both declarations are load-bearing
  and were measured independently: dropping the second does not reopen the 2.5px baseline miss
  (Chromium resolves the container baseline to the word either way), but it does reopen the icon's
  own vertical placement by about the same margin, a regression of the identical size and shape as
  the defect just fixed. The CSS comment stated that mechanism wrongly and was corrected in the
  same commit.

  The pass first shipped `align-self: center`, which a reviewer then measured at +16.71px on a
  WRAPPING three-line label, since `center` levels the glyph on the flex line's cross size, which
  for a single-line flex container is the label's full height. That contradicts this pass's own
  doctrine that an icon beside a text block pairs with the block's FIRST LINE. `min-height`, not
  the reviewer's prescribed `height`: cascade layers put `utilities` after `components`, so a
  `height` written in `@layer components` is a silent no-op against the glyph's own `h-3.5`, and
  the reviewed value measured -1.79px when injected as a real layered rule.
- **The pill fix levels the padding box on the heading's line box, not on any baseline.** `.
  cairn-line-slot` is `display: flex; align-items: center; height: 1lh`, sized off the same
  `type-meta` role the heading itself carries, so `1lh` genuinely resolves to that line's leading
  rather than an unrelated token. `1lh` degrades safely on browsers that do not support it (Chrome
  <109, Safari <16.4, Firefox <120): `height` falls back to `auto` and the slot regains the pill's
  own height, which reinstates the original 5px miss rather than overflowing or breaking layout.
- **`icon-baseline-synthesis` ships at `advisory` tier** (commit `4503da4b`), reversing this
  pass's earlier `error`-tier decision. Geoff's ruling stands as written: a guardrail that only
  reports and never gates is inert unless someone runs it and reads it. The evidence simply would
  not carry it. A 59-probe re-verification measured five markup shapes that render at exactly
  0.00px and still fire, and the decisive one is an icon-only label, which fails the build while
  the prescribed `.cairn-icon-label` fix measures identically before and after, leaving the author
  no way to comply. Recall does not earn the tier back either: a `flex` label is the same defect
  at -1.75px and passes silent, and lucide's default-import spelling `<Check />` is invisible. The
  reference, the upgrade guide and the changelog now state the recall boundary instead of a
  tripwire claim, per the task's own instruction that a rule quietly shipped advisory while
  described as a tripwire is the failure to avoid.
- **`text-box: trim-both cap alphabetic` does not ship.** It was implemented, measured, and pulled
  before commit. It does not inherit, so on a flex container the text becomes an anonymous flex
  item and the declaration is inert exactly where the spec wanted it (a padded `inline-flex` chip
  and a `.btn btn-sm` both stayed unchanged). Where it does bite, block containers and blockified
  flex items, it shifted `type-chip` 13.00px to 7.14px and `type-label` 14.00px to 7.86px, roughly
  6px across every block call site of those roles, silently re-ruling a `gap-*` scale calibrated
  against untrimmed line boxes, and it fails `grammar-tokens.test.ts`'s assertion that a type role
  is a size and a leading and nothing else, a published contract in
  `docs/reference/admin-grammar-tokens.md`. `FieldRow` does ship; it has no measured backing (the
  inventory found zero rows above the 2px bar it would address), and it composes correctly today
  because the toolkit renders no error line under a field, a caveat documented at the component and
  in `docs/reference/admin-toolkit.md`.

### What was dropped, and why

- **Task 4, the rendered `cairn-audit` rule, dropped entirely.** Complexity locally to build the
  engine is fine; what ships to a developer should not carry a rendering measurement engine. The
  reasoning and its cost (a consumer can no longer point `cairn-audit` at their own rendered pages
  and get vertical-alignment findings sight unseen) are recorded in the "Task 4: DROPPED" section
  above and in `ROADMAP.md`'s Now tier, which names the precomputed icon-ink table as the pre-beta
  pass's replacement mechanism.
- **Task 3, dissolved into task 2 and task 5.** The corrected inventory found zero public rows
  above the 2px bar; there was no chassis recipe to write, no styleguide demonstration to add, and
  no baseline to move on the public side beyond the widened suite's own new coverage. Its doc
  section moved to task 5 and states plainly that the measured public corpus is clean.
- **`vertical-metrics.ts` (the shared measurement module) stays where it is, not shipped-clean.**
  It ships today as `dist/audit/rules/rendered/vertical-metrics.js` (confirmed at close: 68 KB,
  unregistered in any rule index, unreachable from any documented export subpath, present only
  because `svelte-package` emits everything reachable under `src/lib`). This pass carries a
  co-located `WATCH:` comment rather than relocating it, on the grounds that moving it now means
  moving it twice: once into whatever this pass invented and again into whatever structure the
  authorized repo-organization cleanup pass settles on. That cleanup pass is filed in `ROADMAP.md`'s
  Now tier with this file as its worked example.

### Cost and process, stated plainly

Task 1 is the sizing evidence for this whole pass, and it earns the honest accounting the sizing
rule asks for. It was condemned by independent audit three times and split twice (1a the probe and
module, 1b the block-versus-line correction, 1c the metric-selection correction) before its
inventory could be trusted at all. Two splits is this plan's own declared trigger for a
pass-split proposal; the proposal was made and Geoff answered it the same day, in five separate
ratifying decisions recorded in this file's own text (the rescope, the suite-widening amendment,
dropping task 4, targeting `error` tier, and adding task 4b). That is a genuinely large number of
human interaction points for one plan, and it is what buying trustworthy measurement cost: three
condemnation rounds on the inventory, plus a fourth on task 4b's rule precision after
implementation, where the reviewer reproduced five real false-positive shapes at error tier that
the implementer's own gate had not caught.

The lesson for sizing a measurement-first pass: **the plan's assumption (broad two-surface defect
classes) was wrong in the direction that helps, but the cost of finding that out was not smaller
for it.** Verifying a null-ish result (five confirmed rows, zero public rows, against a plan
budgeted for two full chassis-recipe tasks) still needed the same number of audit rounds a large
finding would have needed, because the risk being managed was a wrong measurement passing as a
clean one, not a large defect list. A measurement-first pass should be sized by the verification
work its instrument demands, not by a guess at how much the instrument will find.

### Open decisions, not resolved in this pass

- **`icon-baseline-synthesis`'s shipped precision has a known gap the pass did not close.** The
  `f141e3ae` fix commit closed five reproducible false-positive shapes. A later review round,
  after that fix, reproduced several more against the code as it now stands: the rule never checks
  that the container declares a live flex/grid `display` (it fires on `<tr class="items-baseline">`
  and on `display: block` containers, where `align-items` does nothing); it matches only the label's
  own `inline-flex` token and stays silent on the identical defect written as `flex` (CSS flexbox
  baseline synthesis does not depend on inner-vs-outer display); it fires on an icon-only label with
  no text sibling at all, where the prescribed `.cairn-icon-label` fix is inert because there is no
  word to expose; and a `max-*` breakpoint variant on a direction utility is unrecognised by the
  rule's breakpoint table and can tie-break on class order rather than on CSS cascade order.
  `icon-baseline-synthesis`'s recall is also bound to this repo's own `*Icon` import-naming
  convention (`import Check from '@lucide/svelte/icons/check'` renders `<Check />` and is invisible
  to the rule), which the rule's own tree scan cannot expose, since cairn's tree happens to follow
  the one convention the rule recognises. None of this was fixed after being found; it needs a
  ruling before the rule is trusted at `error` tier in a consumer's CI, the same bar the amendment
  that chose `error` set. `cairn-audit` is a separate CLI (`cairn-audit`, wired through the
  package's own `bin`), not run in this repo's own CI, so the gap is real for a consumer without
  yet having broken anything of cairn's own.
- **The CSS comment on `.cairn-icon-label` states the wrong mechanism** (it claims dropping
  `align-self: center` "synthesises the same wrong baseline again"; measurement shows the baseline
  stays correct either way, and what actually breaks is the icon's own placement). Needs a one-line
  correction before the next editor reads it and acts on the false claim.
- **`.cairn-icon-label` centres the glyph on the label's full block height, not its first line.**
  Correct for the pass's own non-wrapping call sites; measured at +16.71px off a 3-line label's
  first-line cap centre in a synthetic case. `icon-baseline-synthesis`'s message prescribes this
  recipe to any consumer, whose labels may wrap where cairn's own do not. Needs a ruling: patch the
  recipe (`align-self: start; height: 1lh` on the `> svg` measured at -0.29px in the same synthetic
  case) or document the non-wrapping assumption at the call site.
- **Both visual baselines are unregenerated and unread.** The admin suite's 18 existing baselines
  move (three rows recomposed) and have not been regenerated locally, per instruction; the widened
  site suite needs 25 of its 30 baselines generated from nothing. Both are CI-canonical
  (`gh workflow run e2e.yml -f update_snapshots=true`) and both need the visual-fidelity read with
  Geoff's before/after before this branch merges.
