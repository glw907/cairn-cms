# The cairn admin custom-surface ledger (Tier 1/2/3)

> The committed audit artifact for the admin idiomatic re-expression initiative
> (`docs/superpowers/specs/2026-06-29-admin-idiomatic-re-expression-design.md`,
> Phase 0 plan `docs/superpowers/plans/2026-06-29-admin-re-expression-0-foundation.md`).
> It classifies every custom property defined in `src/lib/components/cairn-admin.css`
> into the three tiers the five de-customization rules define, censuses the high-volume
> call sites, inventories the verification gaps the sweep must close, records the two
> resolved investigations, and seeds the `check:custom-surface` retired-token budget.
> The tier assignment is the human judgment this initiative makes; the Phase 0 review
> (Task 6) verifies it. Measured 2026-06-29 against DaisyUI 5.6.6 and Tailwind 4.3.2.

## How to read the tiers

The five de-customization rules sort the custom surface:

- **Tier 1** is the Warm Stone theme: the DaisyUI 5 theme variables, kept verbatim, because
  setting the theme variables *is* the idiomatic way to theme DaisyUI. Rule 1 keeps these in
  the theme and never duplicates them into a component.
- **Tier 2** is essential non-theme custom that stays, walled and documented as the floor
  (Rule 4). Each entry carries its locked contrast value and the reason it survives: an
  accessibility ink, the editor system, the embed-anywhere infrastructure, an unlayered forced
  workaround, the `.btn-primary` lift, the elevation pair, or the muted/subtle pending pair.
- **Tier 3** is the proven-foldable remainder (Rule 3 and Rule 2): the retired arbitrary-token
  references in markup that migrate to the named role layer, plus any `@layer components`
  override that only re-creates a 5.6 native primitive. The sweep ratchets these to their proven
  floor, and the gate's retired-token budget reaches zero when the migration completes.

## Tier 1: the Warm Stone theme (keep verbatim)

The `[data-theme='cairn-admin']` and `[data-theme='cairn-admin-dark']` blocks set the DaisyUI 5
theme variables. They are idiomatic theming and do not change.

The theme color, geometry, and font variables:

- `--color-base-100`, `--color-base-200`, `--color-base-300`, `--color-base-content`
- `--color-primary`, `--color-primary-content`
- `--color-secondary`, `--color-secondary-content`
- `--color-accent`, `--color-accent-content`
- `--color-neutral`, `--color-neutral-content`
- `--color-info`, `--color-info-content`
- `--color-success`, `--color-success-content`
- `--color-warning`, `--color-warning-content`
- `--color-error`, `--color-error-content`
- `--radius-selector`, `--radius-field`, `--radius-box`
- `--size-selector`, `--size-field`
- `--border`, `--depth`, `--noise`
- `--font-body`, `--font-display`, `--font-editor`

These are Tier 1 by Rule 1: they are the theme, set where DaisyUI 5 reads them at point of use.
Phase 0 keeps them in the raw `[data-theme]{}` block rather than the `@plugin "daisyui/theme"`
form (see the resolved theme-as-plugin investigation below).

## Tier 2: essential non-theme custom (the documented floor)

This tier is owned on purpose. The gate guards it by exact token name and by exact selector; it
may only shrink with a ledger update. Each entry names its locked contrast value where one applies
and the reason it survives.

### Accessibility text inks (no native primitive supplies these)

DaisyUI's `--color-warning` and `--color-error` are fills tuned behind dark content; as small text
on a light surface they fall near 2.2:1, under the 4.5:1 AA floor (WCAG 1.4.3). The admin defines
the readable on-surface ink counterparts at locked, measured contrast.

| Token | Reason | Locked contrast (light) | Locked contrast (dark) |
| --- | --- | --- | --- |
| `--cairn-warning-ink` | ink | on base-100 5.98:1, on 8% accent chip tint 5.59:1 | on base-100 8.61:1, on chip tint 6.20:1 |
| `--color-positive-ink` | ink | on base-100 ~4.9:1 | on base-100 ~7:1 |
| `--cairn-error-ink` | ink | on base-100 ~5.2:1, on error tint ~4.9:1 | on base-100 ~7:1, on error tint ~5.3:1 |
| `--cairn-error-tint` | ink (surface for the ink above) | the locked break-list surface | the locked dark surface |
| `--cairn-error-border` | ink (hairline for the tint) | the danger hairline | the dark danger hairline |
| `--cairn-tidy-del-row` | ink (tidy diff row tint) | deletion ink on row tint 5.81:1 | deletion ink on row tint 7.12:1 |
| `--cairn-tidy-del-run` | ink (tidy diff run highlight) | deletion ink on run tint 5.08:1 | deletion ink on run tint 5.89:1 |
| `--cairn-tidy-add-row` | ink (tidy diff row tint) | insertion ink on row tint 5.56:1 | insertion ink on row tint 8.01:1 |
| `--cairn-tidy-add-run` | ink (tidy diff run highlight) | insertion ink on run tint 4.98:1 | insertion ink on run tint 6.48:1 |

### The editor system (CodeMirror `EditorView.theme` territory; hard floor, out of scope)

No DaisyUI equivalent exists, and these are a settled design the sweep confirms untouched.

| Token | Reason | Locked contrast |
| --- | --- | --- |
| `--cairn-directive-ink-2` | editor | label ink on base-100: light 6.28:1, dark 6.81:1 |
| `--cairn-directive-ink-3` | editor | label ink on base-100: light 6.85:1, dark 7.82:1 |
| `--cairn-directive-ink-active` | editor | caret-depth ink on base-100: light 7.47:1, dark 8.84:1 |
| `--cairn-directive-rail-1` | editor | rail vs base-100 (non-text 3:1 floor): light 3.08:1, dark 3.09:1 |
| `--cairn-directive-rail-2` | editor | rail vs base-100: light 3.71:1, dark 3.83:1 |
| `--cairn-directive-rail-3` | editor | rail vs base-100: light 4.51:1, dark 4.69:1 |
| `--cairn-directive-rail-active` | editor | solid accent rail (non-text 3:1 floor) |
| `--cairn-code-chip` | editor | base-content ink on chip: light 13.2:1, dark 11.3:1 |
| `--cairn-focus-dim-ink` | editor | deliberate sub-AA transient: light 3.03:1, dark 3.12:1 |
| `--cairn-focus-dim-rail-1` | editor | deliberate sub-3:1 transient-state rail |
| `--cairn-focus-dim-rail-2` | editor | deliberate sub-3:1 transient-state rail |
| `--cairn-focus-dim-rail-3` | editor | deliberate sub-3:1 transient-state rail |
| `--cairn-focus-dim-rail-active` | editor | deliberate sub-3:1 transient-state rail |

### The embed-anywhere infrastructure (forced by the no-Preflight constraint; hard floor)

The admin self-styles on any host with no host CSS and no global Preflight, which forces these
rules into `@layer components`. They carry no token of their own; they are pinned by selector and
guarded structurally by `admin-css-build.test.ts`. A naive "count `@layer components` rules" metric
must exempt them, which is why the gate caps the count rather than forbidding the layer.

- The scoped box-sizing reset (`*`, `*::before`, `*::after` under the two theme roots).
- The bare-button Preflight replacement: `.menu li > button:not(.btn)` and `button:not(.btn)`.
- The anchor reset (`a { color: inherit; text-decoration: none }`), the `summary` marker reset, the
  `::selection` brand tint, the `:focus-visible` ring, the `scroll-margin-top` focus-not-obscured
  rule, and the `prefers-reduced-motion` block.
- The post-compile `@font-face` rebasing (added by `scripts/build-admin-css.mjs`).

### The two unlayered forced workarounds (pinned by exact selector)

A layered rule cannot outrank DaisyUI's own utilities-layer rules, so these must stay unlayered.
Both fix real shipped bugs. The gate pins the exact set: neither may be deleted nor a third added
without a reviewed allowlist change.

- `.menu li > :is(button, a):focus-visible` — restores the keyboard focus ring DaisyUI's `.menu`
  quiets (lost menu focus).
- `.btn.cairn-btn-guarded[aria-disabled='true']` — restores `pointer-events: auto` so a guarded
  toolbar button keeps its explanatory tooltip (a killed tooltip).

The gate now pins the unlayered set by **whole-selector set equality**, not by substring (the Phase 0
review fix). The allowlist in `scripts/custom-surface-budget.json` therefore holds the full,
whitespace-normalized text of every sanctioned unlayered scoped rule, which is more than these two
forced workarounds: the two `[data-theme]` theme-root blocks (Tier 1), the embed-anywhere box-sizing
reset, and the `prefers-reduced-motion` block also live outside `@layer components` and are legitimate
floor (six rules total). A swapped rule that merely *contains* `.menu li` or `.cairn-btn-guarded` no
longer passes; a seventh unlayered rule fails the length check and the set-equality check.

### The `.btn-primary` lift (resolved: stays Tier 2)

The bespoke soft-violet shadow lift in the `.btn-primary:not(:disabled)` and its `:hover` rule. It
cannot fold onto the theme's native `--depth`; see the resolved investigation below.

### The theme-adaptive elevation pair

| Token | Reason |
| --- | --- |
| `--cairn-shadow` | elevation — the layered card shadow, warm-tinted, theme-adaptive |
| `--cairn-card-border` | elevation — the faint hairline that carries card definition where the shadow does not |

### The muted/subtle pair (RESOLVED Task 2: Tier 2, guaranteed-value branch)

| Token | Reason |
| --- | --- |
| `--color-muted` | muted-subtle-guaranteed — desaturated hue-shifted secondary-text tone, >= 4.5:1 on base-100/200 |
| `--color-subtle` | muted-subtle-guaranteed — the stronger secondary-text role, hue-shifted, lighter than muted on dark |

These are desaturated, hue-shifted tones, not opacity steps, and the dark theme paints `subtle`
lighter than `muted` (80% L vs 72% L) while it still reads as the stronger contrast role. Task 2
published the measured per-theme, per-surface ratio table (`role-layer-contrast.test.ts`,
`prints the role-layer ratio table`) and took the **guaranteed-value branch**.

The measured table: a single `base-content` opacity step over both surfaces in both themes clears
4.5 only at `>= 80%` alpha (light 50% -> 3.71 .. 100% -> 14.05; dark 50% -> 1.50 .. 75% -> 4.05 ..
80% -> 5.14 .. 100% -> 13.39). An 80%/85% fold technically clears AA, but a single shared
alpha pair cannot reproduce the design across both themes. Tone is fixed by alpha over one ink: more
alpha makes the text darker over the light surface and lighter over the dark surface. So no one
`(muted, subtle)` alpha pair can make `subtle` read darker than `muted` on light (where stronger
means darker) while reading lighter than `muted` on dark (where stronger means lighter). The
hue/chroma-shifted guaranteed values express a tone a single opacity ramp over one ink cannot, so
`--color-muted` / `--color-subtle` stay Tier-2 vars and the named role utilities
`text-muted` / `text-subtle` (in `scripts/admin-css.input.css`) point at them. The utilities are the
frozen interface the pilot consumes, and the arbitrary `text-[var(--color-muted)]` /
`text-[var(--color-subtle)]` references leave the markup (Phase 0 retired the pilot-adjacent
`CairnTidySettings.svelte`; the sweep ratchets the rest to zero).

## Tier 3: the proven-foldable remainder (the target)

A candidate is Tier 3 only when a native 5.6 primitive provably replaces it without losing an
accessibility cue or a design intent.

- **Retired token references in markup.** `text-[var(--color-muted)]` and
  `text-[var(--color-subtle)]` arbitrary-token references in `.svelte` migrate to the named role
  layer (Rule 2). The retired-token seed below counts them. Phase 0 retires only the pilot-adjacent
  files; the sweep ratchets the budget to zero.
- **Truly redundant `@layer components` overrides.** Any scoped override that exists only to
  re-create a 5.6 native primitive, evaluated one by one against the load-bearing-rules invariant
  list. Most of the current `@layer components` block is Tier 2 infrastructure, so this set is
  small.
- **Genuine native primitives to adopt where they help.** `status`, `floating-label`, and `tab`
  ship in DaisyUI 5.6. Adopting them is a re-expression where one replaces a hand-rolled control,
  or an addition (`floating-label` is a new pattern, not a fold).

**Explicitly not Tier 3** (the review rejected these): the segmented / check-and-tint control and
card-selectable states (no native 5.6 primitive; `.filter` breaks the WCAG 1.4.1 non-color cue),
the `.btn-primary` lift, the two unlayered rules, and `--color-muted` / `--color-subtle` (pending
the ratio table). All are Tier 2 above.

## Call-site census (high-volume tokens, the admin tree)

Counts of `var(--token)`, `--token`, and `[var(--token)]` references across
`src/lib/components` (`*.svelte`, `*.css`, `*.ts`), measured 2026-06-29.

| Token | Call sites | Tier |
| --- | --- | --- |
| `--color-muted` | 288 | 2 (pending) |
| `--color-subtle` | 18 | 2 (pending) |
| `--cairn-card-border` | 177 | 2 (elevation) |
| `--cairn-shadow` | 25 | 2 (elevation) |
| `--cairn-warning-ink` | 44 | 2 (ink) |
| `--color-positive-ink` | 50 | 2 (ink) |
| `--cairn-error-ink` | 54 | 2 (ink) |
| `--cairn-error-tint` | 19 | 2 (ink) |
| `--cairn-error-border` | 26 | 2 (ink) |

The high-volume custom is mostly essential Tier 2 that stays. This is the evidence behind the
spec's premise check: the genuinely foldable Tier 3 is a modest remainder, so the sweep is bounded
by what is provably excessive.

## Verification gaps (the sweep closes these)

### Presence-only a11y tests (upgrade to behavioral before re-expressing the cluster)

- `src/tests/component/MediaPicker.test.ts:90` — `expect(live.length).toBeGreaterThanOrEqual(2)`.
  Pure presence: it passes even if both `[aria-live]` regions wire to one source, which would break
  the clobber-avoidance the design system names load-bearing. The Phase 5 cluster (MediaPicker)
  upgrades it to the behavioral assertion `src/tests/component/tidy-review.test.ts:239` models (a
  second identical action must still change the region text so a screen reader re-announces) before
  re-expressing.

The roving-tabindex and dual-live-region math is genuinely pinned elsewhere
(`CairnMediaLibrary.test.ts`, `tidy-review.test.ts:239`); MediaPicker is the one presence-only gap.

### Component-test selectors coupled to fold-target DaisyUI classes (pre-declare the migration)

When a sweep phase folds a coupled class, these go red as a known migration, not a regression. The
plan for each phase pre-declares which assertions migrate to `getByRole` / `data-testid` / role
selectors as part of the port.

- `src/tests/component/edit-page-advisories.test.ts:72` — `querySelectorAll('.alert')`.
- `src/tests/component/ConceptList.test.ts` — `.badge` (lines 51, 296), `.alert-success` (68),
  `.alert-warning` (133), `.alert-error` (254).
- `src/tests/component/EditPage.test.ts` — `.alert` / `.alert-success` / `.alert-warning`
  (lines 256, 265, 268, 276, 277, 567, 598, 600, 628, 646, 660, 686, 694, 731, 774, 780, 1679),
  `.badge` / `.badge-neutral` / `.badge-ghost` (1385, 1386, 1417), and the
  `.cairn-save-state .bg-warning` save-state chip (2150, 2155).

## Resolved investigations

### Theme as `@plugin "daisyui/theme"` (resolved: keep the raw `[data-theme]{}` block)

Empirically tested 2026-06-29 by compiling a scratch input that expresses the `cairn-admin` theme
through `@plugin "daisyui/theme" { name: "cairn-admin"; … }` (the form the showcase already uses in
`examples/showcase/src/lib/theme.css`) and running it through the build's Tailwind+DaisyUI stage.

Findings:

- It **compiles** and emits exactly the same flat `[data-theme="cairn-admin"]` variable block, which
  the scope transform in `build-admin-css.mjs` passes through untouched (it already skips selectors
  containing `[data-theme=`). So it is feasible and would pass `admin-css-build.test.ts`.
- It offers **no new tokens** over the raw block.
- It **strips the co-located contrast comments**. The scratch block carried a load-bearing comment
  (`5.28:1`); the compiled output dropped it, because the DaisyUI plugin reads the declarations and
  re-emits a clean block. Those interleaved AA-math comments are load-bearing by Rule 4: each ink's
  locked contrast must stay beside its value so a future editor cannot lighten it blind.

**Recommendation:** keep the raw `[data-theme]{}` block as documented Tier-2 infrastructure,
precisely because the comments must stay with the values. Task 3 walls it into the Tier-2 home with
its comments intact. There is no open investigation here.

### The `.btn-primary` lift versus native `--depth` (resolved: the lift stays Tier 2)

Verified 2026-06-29 in `node_modules/daisyui/components/button.css` (DaisyUI 5.6.6).

- `--depth` is consumed **globally** inside `.btn`: it scales `--btn-shadow`, `--btn-border`,
  `--btn-inset`, and the `text-shadow` (`calc(var(--depth) * 30%)`, `* 5%`, `* 6%`, `* .15`). The
  theme sets `--depth: 1`, so the depth shadow is already applied; the admin's lift is **additive**
  on top of it.
- The native depth shadow (`--btn-shadow`) is a tight `0 3px 2px -2px` / `0 4px 3px -2px` —
  small-blur, no violet. The admin lift is a soft 16px violet glow.
- The `.btn` `&:hover` block re-emits `--btn-shadow` to the **same** depth formula (the
  `--btn-hover-shadow` default equals the resting shadow), so the native depth shadow has **no
  hover-growth**. The admin lift grows on hover.

The lift is design intent the native primitive does not express, additive on a depth that is already
global. It cannot fold onto `--depth`. It stays Tier 2.

## The check:custom-surface gate (mechanism and its limits)

`scripts/check-custom-surface.mjs` scans the **source** partial `src/lib/components/cairn-admin.css`,
never the compiled `dist/components/cairn-admin.css`. The source sheet isolates cairn's own bespoke
custom; the compiled sheet inlines all of DaisyUI's and Tailwind's scoped rules, so scanning it would
count hundreds of framework rules. The gate emits three signals: the unlayered-rule set (pinned by
whole-selector set equality), a cap on `@layer components` rule selectors, and the markup retired-token
budget.

**The `stripCssComments` pre-pass.** The Tier-2 wall (Task 3) added a load-bearing-rules banner comment
that QUOTES both `@layer components` and a `:where([data-theme…])` selector. The brace-matcher finds the
real block with `indexOf('@layer components')`, which would land on that comment first, so
`stripCssComments` whitespace-blanks every `/* … */` (preserving byte offsets, so a hit's `file:line`
stays accurate) before any structural scan. Without it the layer count read 0 and the unlayered set
swept in every reset rule. The line-based markup retired-token scan leaves comments intact on purpose.

**FIX A: both scoped-selector forms.** The signal matches a scoped rule in either authored form, an
optionally `:where(`-wrapped `[data-theme=` selector (`/(?::where\(\s*)?\[data-theme=[^{]*?\{/`). The
compiled sheet normalizes everything to `:where(…)`, but a developer types the bare
`[data-theme='cairn-admin'] .foo {` form directly (the box-sizing reset and the reduced-motion block
both do), and postcss-prefix-selector only normalizes at build time, so a `:where(`-only matcher let a
bespoke bare-scoped rule ship unguarded.

**Residual limitation (NOT closed).** A top-level rule with NO `[data-theme=` substring at all, a fully
bare `.foo {}` relying solely on the build's prefixer to scope it, is not enumerated by the
`[data-theme=`-anchored signal. It is backstopped by the cascade-equivalence discipline
(`admin-css-build.test.ts` asserts the compiled sheet leaks no global selector and scopes every rule)
and is a non-idiomatic form in a theme-scoped partial that authors `[data-theme=]` selectors directly.
A later reviewer eyeballs added unscoped top-level rules.

**The `@layer` cap gap.** The second signal is a COUNT cap, not a pinned set. It catches growth (a 15th
rule fails a cap of 14) but not an equal-count substitution of a sanctioned rule for a bespoke one. A
reviewer should eyeball any added or changed `@layer components` rule, the same as the unscoped-rule
gap above.

## The retired-token seed

The total occurrence count of `text-[var(--color-muted)]` and `text-[var(--color-subtle)]` in
`src/lib/components/**/*.svelte`, measured 2026-06-29:

**281 matching lines (282 token occurrences — one line carries both tokens) across 23 files.**

Task 4 seeds the `check:custom-surface` admin `retiredTokenBudget` at the post-Task-2 remainder
(this 281 minus the references Task 2 retires in the pilot-adjacent files). Each sweep phase lowers
the budget to its own post-sweep count, and the migration is complete when the budget reaches zero.
The 23 files holding them: `MediaHeroField`, `ManageEditors`, `MediaInsertPopover`, `ComponentForm`,
`MediaFigureControl`, `EditPage`, `EntryPicker`, `MarkdownHelpDialog`, `FieldInput`, `LoginPage`,
`MediaPicker`, `ShortcutsDialog`, `RenameDialog`, `ConfirmPage`, `ConceptList`, `ReferenceField`,
`MediaCaptureCard`, `ShortcutsGrid`, `CairnAdminShell`, `TidyReview`, `ComponentInsertDialog`,
`CairnMediaLibrary`, `CairnTidySettings`.

**FIX D (Phase 0 review): the budget broadened from the `text-` utility alone to every parallel-token
form.** Rule 2 forbids more than `text-[var(--color-muted)]`: any arbitrary-value Tailwind utility that
wraps the var in square brackets (`bg-[var(--color-muted)]`, `decoration-[var(--color-muted)]/55`, the
`[color:var(--color-subtle)]` long form) and an inline `style="…var(--color-muted)…"` are the same
anti-pattern. The pattern now anchors on the bracket or the inline-style attribute, so a scoped `<style>`
block declaration (`color: var(--color-muted)`) and a JS theme object stay allowed as idiomatic token
consumption, and the named `text-muted` / `text-subtle` utilities (no brackets, no `var()`) stay allowed.
Broadening surfaced exactly one extra hit the `text-`-only pattern missed,
`CairnMediaLibrary.svelte`'s `decoration-[var(--color-muted)]/55` strikethrough on an alt-was diff row.
There is no named utility for a decoration color (folding it to `text-muted` would change the property),
so it is not trivially retireable; the sweep retires it with the rest. The admin seed is therefore **235**
(234 `text-`-utility lines plus that one), measured 2026-06-29.

## Phase 0 sign-off: the role interface is frozen

Phase 0 is complete and adversarially reviewed in two rounds: a per-task verification inside the
execution workflow (segments 1 and 2), then a four-lens review (gate-integrity, embed-anywhere,
role-layer contract, a11y) over the whole result. The review folded three majors and several minors,
most importantly hardening the gate against bare-selector evasion and adding the standing role-interface
guard; the residual gate limits are recorded in the gate section above.

The **developer-facing role interface is frozen**: the named utilities `text-muted` and `text-subtle`
(guaranteed-value branch, resolving to the Tier-2 `--color-muted` / `--color-subtle` vars) are the
contract the vocabulary pilot (Phase 1) and every later sweep cluster build against. A standing test
(`admin-css-build.test.ts`) asserts both stay compiled and keep pointing at their vars, so a tree-shake
or a rename fails the gate. No later investigation reshapes these names. The Tier-1 theme tokens, these
two role utilities, and the documented recipes are the lean, versioned developer vocabulary the final
docs phase publishes in `admin-design-system.md`.

Phase 0 gate, independently confirmed green 2026-06-29: `check` 0/0 (1242 files),
`check:custom-surface` PASS both trees, `check:comments` OK, `check:prose` clean, `npm test` 2855
passed (270 files), showcase e2e 46 passed (the two new admin visual baselines included), and the gate
bite-test (a planted bare `[data-theme] .evil {}` rule fails, removed passes).
