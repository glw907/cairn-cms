# Vertical alignment, cairn-wide: the rescope design

The rescope sitting, run 2026-08-07 (Fable), after the admin-only execution attempt was stopped
mid-task-1 the same day. The trigger was evidence, not preference: the pass's own calibration work
found the same defect class live on a public-site surface while the plan's acceptance criteria
fenced the public side off ("the public design system is untouched"). Geoff ratified the rescope:
the public design system is a core part of the problem and belongs in this pass. This spec settles
what the widened pass owns; the implementation plan that follows supersedes
[`2026-08-07-vertical-alignment.md`](../plans/2026-08-07-vertical-alignment.md), whose diagnosis,
constraints, and task skeletons carry forward except where this spec revises them.

Three decisions are Geoff-ratified from this sitting. The pass delivers cairn-cms machinery only,
on both surfaces: admin toolkit recipes, Waymark chassis recipes, and an audit rule that measures
any rendered page; consumer-site fixes (ASC's `/join` cards) run in each site's own repo on its own
clock, caught there by the shipped rule. Release one waits for the whole pass, with the standing
sizing rule as the escape valve: if the inventory forces a split, the npm-shipped machinery keeps
the release-one gate and the chassis long-tail becomes the numbered follow-up. And the shape is one
pass, one probe, two corpora—the measurement method is the scarce, correctness-critical asset,
and it stays singular.

## The evidence: one blindspot, two surfaces, four wrong answers

**The structural case (admin axis).** The `0.92.0` stacked register drops a field's control by the
label's height, so a bare sibling control in the same flex row rides 12.5px high (ASC's season
picker, both widths, both themes). ASC fixed its own three call sites in `f0f79bb` (`items-end`,
one explanatory comment) and regenerated baselines in `e509b28`. That fix is the failure mode the
engine-mechanic rule names: the knowledge now lives in one site's markup, and `907-life`,
`ecxc-ski`, and `cairn-pub` each cross the same register flip in their post-release-one migration
with nothing to warn them. Two of ASC's three call sites were wrong in the same repo by the same
author, which is the evidence that the correct composition is not discoverable from the component.

**The optical case (public axis).** On ASC's dev `/join` page, the card icons sit 2.8 to 5.1px
above the title's optical centre, consistently across all six cards at 1440px. The measured deltas
(icon ink centre vs title cap centre): Club Boats −5.10, Racing −3.41, Classes −3.31, RVs & Camping
−3.71, Community −2.80, Grounds Access −3.91. `asc-card` is a public-site component; the cause is
the same altitude mismatch as the admin case, and the icon-beside-text mechanic it fumbles is a
chassis-level shape every cairn site composes.

**Neither corpus still exhibits the calibration defect.** `FieldLabel`, `TextInput`, and
`SelectInput` have zero call sites in the engine's own admin components and zero in the showcase
routes; the only composition in the repo is one test fixture, and ASC—the sole composing
consumer—has already fixed its instances. The probe therefore cannot rediscover either
calibration case by rendering the engine's corpora. Both ship as synthetic fixtures reproducing
the shape, and the inventory doc says so plainly.

**The probe itself proved the blindspot.** A probe written specifically to hunt this defect got it
wrong twice before getting it right, and the middle failure is the dangerous kind: a rule shipped
with that bug reports green on a visibly broken screen, which is worse than shipping no rule.

## The three measurement traps (binding on probe, rule, and fixtures)

These are spec-level requirements. Every measuring artifact this pass produces—the probe, the
`cairn-audit` rule, the fixtures' assertions—inherits all three, and the plan repeats them in
the relevant task text so no implementer relearns them.

1. **Pair with the line, not the block.** An icon beside a multi-line text block aligns with the
   block's first line box, not the block. Comparing against the whole block reported 29 to 68px of
   phantom delta on rows that were correctly composed.
2. **Read type metrics off the element that renders the line.** Reading font metrics from the text
   *container* rather than the rendering element returned −0.4px—"this row is fine"—on the row
   whose icons visibly ride high. Resolve the metrics from the computed style of the element that
   owns the line box.
3. **Measure ink, not element boxes.** An SVG's element box centres while its drawn ink rides
   high. Icon geometry is the ink bounds: `getBBox()` mapped through the screen CTM. Text geometry
   is the glyph box: `getClientRects()` on a `Range`, with cap-centre for title-class comparisons.
   Element boxes are acceptable only for controls whose border box is the visual object.

## Architecture: one probe, two corpora

**The probe** renders both surfaces and emits one inventory doc
(`docs/internal/2026-08-vertical-alignment-inventory.md`), each row tagged by surface, screen,
composition class, and measured delta, with a screenshot crop reference and the component file. An
802-line draft from the stopped task-1 dispatch is salvaged at
`/tmp/claude-1000/-home-glw907-Projects-cairn-cms/29ad635b-3fa5-4aca-b54d-20136a477ae2/scratchpad/salvage/probe-vertical-alignment.mjs`
(a second copy under the `f83256f0-*` sibling directory); it predates traps 2 and 3, so it is a
starting point to correct against this spec, never a trusted base.

The **admin corpus** is the superseded plan's enumeration unchanged: the visual suite's page list
(office, lists, edit with Details open, media library and detail, editors, settings, dialogs, plus
the command palette open and one open-menu state) at 1440 and 768 per `admin-visual.spec.ts`, plus
390, both themes, measuring every flex/grid row with two or more visible children and every `<tr>`
in the table surfaces (`AdminTable`, `OfficeList`).

The **public corpus** is Waymark's rendered surface: the showcase `(site)` chrome, a
representative article page (the reading surface with directives, callouts, and code), and
`/styleguide`, which enumerates every public recipe by design and is the corpus's backbone. Public
pages measure at the family's five-viewport bar (320, 390, 768, 1440, 2560), both themes. States
not rendered (hover, focus, validation) are listed in the inventory as unmeasured, so the
zero-rows claim stays honest.

**The metric is chosen by the pair's class**, carried from the superseded plan and extended by
trap 3: a text-beside-text pair compares baselines, because a mixed-size pair sharing a baseline
is correct typography whose glyph centres diverge by design; an icon-beside-text or
control-beside-text pair compares visible-content centres, ink-based per trap 3; the optical
suspects (buttons, chips, badges) compare glyph centre against padding-box centre. Reporting bar:
2px, with every row above it dispositioned in a recipe task or explicitly declined with a reason,
zero rows "unknown".

## Recipes: land where the geometry lives

**Admin toolkit** (npm-shipped): `FieldRow` (new export, `items-end`, correct for any mix of
stacked fields and bare controls, no-op for same-height children, the error-line caveat
documented); whatever row treatments the inventory confirms, fixed at the recipe level in
`cairn-admin.css`; and `text-box: trim-both cap alphabetic` as a progressive-enhancement silent
default on the label-like recipes (`type-label`, `type-chip`, button recipes). Support is
Chrome/Edge 133+ and Safari 18.2+, with unsupported browsers ignoring the declaration, so no
fallback machinery.

**Waymark chassis** (copy-propagated through `examples/showcase`): the icon-beside-text row
mechanic the `/join` evidence names, fixed as a chassis recipe (in `theme.css` recipes or the
`(site)` chrome components, wherever the inventory locates the shape), plus the same
`text-box-trim` silent default on Waymark's label-like recipes, plus whatever the inventory
confirms on the public rows. `/styleguide` demonstrates each new or corrected recipe, because the
styleguide is what the next theme port receives as its starting chassis. The engine's public
*output* stays design-agnostic—these are chassis mechanics, not constraints on a consumer's own
`render`.

Re-compose every confirmed-defective engine, showcase, and scaffold row on both surfaces.
Baseline churn is expected on both visual suites; **both moves run through the visual-fidelity
read, and Geoff sees before/after crops before merge** (the admin baseline is approved; the public
baseline is the five-viewport CI matrix).

## The tripwire: one generalized `cairn-audit` rule

One rendered rule beside `field-edge-alignment`, scoped to the composition contexts the inventory
validated, inheriting the metric-by-class split and the three traps. It fires on a sibling whose
class-appropriate delta diverges beyond threshold, names the stacked-field case in its finding
message (recommending `FieldRow`/`items-end` with the measured delta), and sets its threshold from
the inventory's measured noise floor rather than the placeholder 4px. Any fixed defect sitting
between the inventory's 2px reporting bar and the rule's firing bar is recorded in the inventory
doc, so a silent regression window is a stated decision. Fixtures prove both directions: it fires
on synthetic reproductions of the ASC season row and the `/join` icon card, and stays silent on
`FieldRow` compositions, same-height rows, validated top-aligned layouts, and a baseline-aligned
mixed-size text pair. If ink/glyph measurement proves too flaky for CI, the rule ships the
border-box half and the inventory doc records the optical half as probe-script-only, stated
plainly rather than silently narrowed. Because the rule measures any rendered page, it is also
the mechanism that catches ASC's `/join` class site-side after release one, per the boundary
decision—the mechanically detectable half belongs in `cairn-audit`, never a consuming site's
own probe.

## Doctrine: the blindspot is an authoring-time failure

Both design-system docs gain a vertical-alignment mechanics section written for the component
author: the admin design system (`docs/internal/admin-design-system.md`) and the Waymark reference
(`docs/internal/public-design-system.md`). Each section carries the two-class diagnosis
(structural: alignment knowledge lives at a different altitude than the geometry it depends on;
optical: CSS centres line boxes while the eye centres glyphs), the metric-by-class table, and the
recipes to reach for. The three measurement traps are recorded in the inventory doc's header,
where the next probe author will look. The upgrade guide gets the new entry plus the retroactive
`0.92.0` geometry note ("check any flex row pairing a field with a bare control; compose with
`FieldRow` or `items-end`"), written as an adopter checklist item, since three consumers cross
that flip after release one.

## Constraints, sizing, and what the plan decides

The superseded plan's global constraints carry forward: additive only, no change to `FieldLabel`'s
markup, registers, or semantics; the per-task gate and the pass-end CI-only gates by name; design
system doc updates ride the task that changes the behavior; feature worktree off `main` (the
existing `vertical-alignment` worktree sits clean at `main`'s tip and is reusable), minding the
showcase-symlink gotcha.

The inventory sizes the pass, and the sizing rule applies from the first split. The declared split
point: the chassis long-tail sweep leaves first, as a numbered follow-up, and the npm-shipped
machinery (admin recipes, silent defaults, audit rule, upgrade notes) keeps the release-one gate.

Left to the plan (writing-plans, this sitting): task boundaries and dispatch order, which existing
probe-draft code survives trap-correction, the fixture file layout, and how the inventory doc's
disposition table maps to recipe tasks. Left to the inventory (execution): which row treatments
beyond the two budgeted classes are real, the rule's threshold, and whether the table surfaces are
defective.
