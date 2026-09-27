# Theme identity spec: fold verification

**Target:** `docs/superpowers/specs/2026-09-26-theme-identity-design.md` at `ea7b2575`.
**Inputs read in full:** the fold record, the four lens reviews, the spike report, and the arc log's
rulings section.
**Reader:** fresh context, no part in the fold.
**Method:** every blocker and major was checked at the location the fold record cites. New mechanisms
were checked against `node_modules` (daisyUI 5.7.44, Tailwind 4.3.3, @lucide/svelte 1.47.0),
`scripts/checks/custom-surface-budget.json`, `scripts/build/build-admin-css.mjs`, the audit rules, and
the named tests. The only scratch run was a regex probe in the session scratchpad.

**Counts:** 0 blockers, 2 majors, 10 minors.

**Verdict:** the fold is sound. All 4 blockers and all 23 majors close at the cited locations (see the
table). The A/B split builds, and no gate goes red at the boundary. R1 can be ruled on the evidence
given. Two majors remain. One is a daisyUI active form that the new rules miss. The other is a size
and calendar decision the fold made that the owner's ruling left open. Both are one-line fixes.

## 1. Blocker and major closure

| ID(s) | Closed? | Where in the spec |
|---|---|---|
| MX-B1, RK-B1, CS-B1 | Yes | :93-131. The sublayer and pin match spike point 4, and `build-admin-css.mjs:103` is the pin's anchor line. The amended three-home rule is at :126-131. CS-B1's decision-4 note is at :158-159 (see minor m6). |
| MX-M4 | Yes | :135-156, gate list :433-434. Verified: the allowlist has 18 entries, and rules 10 to 14 are exactly 5 of them, which leaves 13. The components cap (19) drops by the two moved rules. |
| MX-M1, RK-M1 | Yes | :168-173. The "depth 0 removes achromatic shadows" claim is gone. The modal shadow is confirmed theme-invariant black (`modal.css`: `oklch(0% 0 0/.25)`). |
| MX-M2, CS-M1 | Yes | :111-115 and :223-230. The soft-primary states match the spike table (0.10/0.15/0.22, `--btn-fg` pinned). |
| MX-M3, RK-M3, CS-M2 | Yes, with major M1 below | :143-144 and :237-245. |
| RK-M2 | Yes, with major M1 below | :227-236. The focus-ring proof is at :410-411. |
| MX-M5 | Yes | :70-91. `utilities/radius/object.js` carries `.rounded-selector/field/box`, so the walk covers them. |
| MX-M6 | Yes | :274-283. The three checked forms match `toggle.css`. |
| MX-M6 (spike risk 5) | Yes | :281-282. The eight color modifiers are excluded. |
| CT-M1 | Yes | :287-290 |
| CT-M2, CS-M3 | Yes | :257-272 |
| CT-M3 | Yes | :349-360 |
| CT-M4 | Yes | The captures are committed (`docs/internal/record/2026-09-26-theme-identity/`, in `ea7b2575`). The fold record's row is stale (see minor m10). |
| CT-M5 | In intent; the stated command is broken | :314-323 (see minor m1). |
| RK-M4, CS-M4 | Yes | :420-424, :450, :452. `norms:generate`, `norms:check`, and `chip-ground-collision.ts` all exist. |
| RK-M5 | Yes | :207-214 and :413-416. The fold's "settled" is true: arc log R2 records `--size-selector 0.28125rem`, and `final-1.html:20,105-117` renders `badge-sm`, `checkbox-sm`, and `toggle-sm` at the step. |
| RK-M6 | Yes | :454-455, :504 |
| CS-M5 | Yes | :342-343, :459 |
| CS-M6 | Yes, by pointer | :444-446, :453. The spec defers the errata list to the fold record, which carries it in full. |

## 2. Contradictions and the A/B pass order

The pass order builds. I checked the likely red-at-boundary gates:

- `skill-references-compile.test.ts` compiles the skill's taught classes. The references teach no
  class that the pass A sweep removes, and `type-title font-bold` still compiles, since `font-bold`
  has 54 other uses.
- `check:invisible-craft` scans `examples/showcase/src/routes`. Its rules (gap-scale, token-colors,
  and motion) do not fire on a plain-class fixture.
- `norms:check` and the chip re-key are correctly kept in pass A.
- No gate caps the sheet's size.
- `interactive-control-edge-contrast.test.ts` reverts through `!important`, so it survives the move
  of rules 13 and 14.

One inaccuracy in the stated rationale is minor m7.

## 3. Mechanisms stated from memory

Most new mechanisms are quoted or proven: the sublayer and pin (spike), the class walk (spike), the
switch forms, the `.menu` radius (`menu.css` declares no `--radius-field`), the Lucide attribute
(`buildLucideIconNode.js`), and the theme-variable list for R1's completeness test
(`daisyui/theme/object.js` keys). The concentric rule and the site-theme pin are honestly marked
inferred or open. Three stated mechanisms are wrong or incomplete: major M1, minor m2, and minor m3.

## 4. R1 and the owner forks

R1 can be ruled on the evidence given. Each of its four conditions traces to a spike measurement, and
the "what each answer changes" list is complete. Only one input is missing (minor m8). No settled
question is dressed as a ruling. One fork was ruled by the fold instead (major M2).

## 5. G1 and G2 criteria

- **G1** has a named fixture (`examples/showcase/src/routes/admin/theme-kit/+page.svelte`), a named
  spec (`e2e/theme-kit.spec.ts`), and a stated failure reason for each test. The route pattern already
  exists (`routes/admin/signups`). Minors m4 and m5 widen what it checks.
- **G2** names the `radius-scale` rule, the retired-patch arms, the fixtures, and the sync test, each
  with its failure reason. It also names the one-shot agent probe and what counts as failure. The
  audit-rule and sync-test fixture files are not named, but those follow the repo's standing
  convention. Minor m9 is the one G2 hazard.

## Findings

### Major

**M1. The rules miss daisyUI's fourth active form, `[aria-current]`.**

- **Location:** spec :111-115 (full state set), :231-234 (plain-`btn` exclusions), :237-238
  (selected segment). Fold record :40.
- **Defect:** daisyUI 5.7.44 treats four forms as active: `.btn-active`, `[aria-pressed=true]`,
  `[aria-checked=true]`, and `[aria-current]:not([aria-current=false],[aria-current=""])`
  (`node_modules/daisyui/components/button.css`, the `daisyui.l1.l2` active rule and the `:active`
  exclusion). The spec and the fold record say "three active forms." The plain-`btn` rule does not
  exclude `[aria-current]`. A developer's `btn` marked current with `aria-current="page"` alone is
  plain daisyUI and legal. The winning sublayer repaints it as a resting hairline, and the selected
  state disappears. Nothing catches this: the fixture uses `btn-active`, and cairn's one
  `aria-current` button (`Pagination.svelte:102-103`) also carries `btn-active`. This is a G1 path
  that fails silently.
- **Proposed fix:** add `[aria-current]:not([aria-current='false'], [aria-current=''])` to the
  full-state-set sentence, to the plain-`btn` `:not(...)` list, and to the selected-segment keys. Add
  one `aria-current`-only segment to the fixture's join.

**M2. The fold ruled the size cost and the calendar exclusion, which ruling 1 left to the owner.**

- **Location:** spec :36-37 and :80-85 ("Accepted."). Fold record :122-124 ("Deviations").
- **Defect:** ruling 1 reads "every daisyUI component compiles in," and it asked the spike to
  "measure the size cost before the fold." The fold accepted the measured cost (about 1.7x, +21 KB
  gzipped on every admin page for every consumer) and excluded `calendar`. It did not put either
  choice to the owner. The spike offers a real alternative: a scanned compile plus a safelist, grown
  family by family. So this is a genuine product fork that the fold ruled, and the spec's "one owner
  fork is open" is not quite true.
- **Proposed fix:** add a confirmation item beside R1, for example "R2: accept the 1.7x admin sheet
  and exclude calendar (recommended), or keep the scanned compile plus a safelist." Recommend the
  former, with the spike's numbers. A one-word answer closes it.

### Minor

**m1. The sweep post-condition regex matches every token class.**

- **Location:** spec :318.
- **Defect:** `\brounded(-sm|…)?\b` matches `rounded` inside `rounded-field`, `rounded-selector`,
  `rounded-box`, `rounded-full`, and `rounded-l-none`. A scratch probe matched all five, so "zero
  matches" can never hold after the sweep. "Their side forms" (`rounded-t-lg`) are not in the
  pattern. CT-M5 closes in intent but not as a runnable command, and pass B promotes this command.
- **Proposed fix:** anchor the end with `(?![\w-])` and add a side-form alternation, for example
  `\brounded(-(t|b|l|r|s|e|tl|tr|br|bl|ss|se|es|ee))?(-(sm|md|lg|xl|2xl|3xl)|-\[[^\]]*\])?(?![\w-])`.

**m2. The alert edge needs `--alert-border-color`, and `border-color` would lose.**

- **Location:** spec :118-120 and :257-265.
- **Defect:** `alert.css` declares `.alert { border-color: var(--alert-border-color, …) }` directly
  in `@layer utilities`, outside any `daisyui.*` sublayer. Unnested declarations in a layer beat all
  of its sublayers, so a cairn-theme `border-color` on an alert loses. Only the variable works. The
  spec's variables list names `--alert-color` but not `--alert-border-color`. The per-rule render test
  would catch the miss, but it would catch it late.
- **Proposed fix:** add `--alert-border-color` to the variables list. Note under the sublayer section
  that daisyUI keeps a few unnested declarations (`.alert`, `.kbd`, `.collapse`), which cairn-theme
  cannot beat.

**m3. The Lucide rule also catches explicit stroke-width 2.**

- **Location:** spec :293-294.
- **Defect:** the claim that the rule "leaves an explicit `strokeWidth` or `absoluteStrokeWidth` icon
  alone" is only partly true. `strokeWidth={2}` writes `stroke-width="2"`. `absoluteStrokeWidth` at
  size 24 computes 2×24/24 = 2 (`buildLucideIconNode.js`). Both match the rule and are retuned.
- **Proposed fix:** reword the sentence to "leaves any non-2 stroke alone." Tell developers who want a
  deliberate 2px stroke to use `2.01` or a scoped exception.

**m4. The switch's off-state 3:1 is asserted but never measured.**

- **Location:** spec :283 and :408-409.
- **Defect:** "the 50% `base-content` edge and knob, which clears 3:1" appears in no review or spike
  table. A 50% oklab mix toward base-100 sits near 3:1, so the claim is borderline, and Proof measures
  only the checked state.
- **Proposed fix:** add the unchecked track edge and knob against `base-100`, 3:1, to the Proof
  contrast list on the fixture.

**m5. The selected segment names no color-variant exclusion.**

- **Location:** spec :237-245.
- **Defect:** the plain-`btn` rule enumerates its exclusions, but the selected-segment rule keys on
  every `.btn-active` except disabled. That would wash `btn-primary btn-active` neutral, which
  `BtnActiveDarkGround.test.ts:145-150` guards today, and the spec says that test is "rewritten."
- **Proposed fix:** state the exclusions (color variants, plus outline and dash, which rule 11
  handles). Say that the rewrite keeps the color-variant and `text-error` assertions.

**m6. The decision-4 sentence overclaims.**

- **Location:** spec :158-159.
- **Defect:** "retire every unlayered `.btn` override" is false.
  `.btn.cairn-btn-guarded[aria-disabled='true']` (pinned rule 2) stays unlayered, and decision 4's
  shape text (`engine-rulings.md:6051`) names `.btn`.
- **Proposed fix:** "retire rules 10 to 12's unlayered `.btn` overrides; the guarded-button rule
  stays, and decision 4 is timing-scoped (CS-B1)."

**m7. The delivery rationale claims disjoint files.**

- **Location:** spec :519-520.
- **Defect:** "touches files disjoint from A's (`src/lib/audit/rules`, …)" is untrue. Pass A re-keys
  `src/lib/audit/rules/rendered/chip-ground-collision.ts` and edits `src/lib/audit/norms.ts`, which
  pass B extends with the recipe field. The passes are sequential, so nothing breaks. The stated
  reason is simply wrong.
- **Proposed fix:** say that pass B depends on pass A's audit data and runs strictly after it.

**m8. R1 omits the plugin form's one benefit.**

- **Location:** spec :480-481 and :483-485.
- **Defect:** R1 lists only the costs of `@plugin` blocks. The spike states their value: "idiom
  alignment only." That value is what ruling 1 chose them for. An owner reversing ruling 1 should see
  what is given up, which is small here because no consumer edits the admin roots.
- **Proposed fix:** add one line: "Plugin blocks buy idiom alignment (the admin reads as a stock
  daisyUI theme to an agent); consumers never author these roots, so G2 is served equally by the
  documentation step."

**m9. There are two pressed-state hairlines, and cairn-theme is a second name for "cairn theme."**

- **Location:** spec :242 and :102.
- **Defect, part one:** light's selected-segment hairline is left "measured." A locked, measured
  pressed hairline already exists: `segmentTintClass`'s `ring-base-content/55`, 3.586:1 light and
  4.959:1 dark (`segmented-control.ts:10-24`, 13 sites). The two devices can diverge, which cuts
  against G1's one look.
- **Defect, part two:** separately, "the cairn theme" already names the public opt-in identity layer
  (`examples/cairn-theme/`, `public-design-system.md:66`). Ruling 1 named the sublayer, so it stands,
  but agents are the G2 audience.
- **Proposed fix:** seed light's value from the locked 55% mix, or state why it differs. In the
  shipped guidance, call the sublayer "the admin's `cairn-theme` cascade sublayer" at first mention.

**m10. The fold record's CT-M4 row is stale.**

- **Location:** fold record :51.
- **Defect:** the row says "the plan's first task commits PNG captures." The captures were committed
  in `ea7b2575`, as spec :9-13 says.
- **Proposed fix:** update the row.

## Checked and sound

- The fold record's counts (59 IDs, 57 folded, 1 refused, 1 ruled) reconcile with the four reviews.
- The density arithmetic holds against `button.css` and `badge.css`: `btn-sm` 36px, `btn` 45px,
  `badge-sm` 22.5px.
- The starter's site-theme pin is correctly left open for the plan, with a computed-style test. The
  starter rule's own state set and the `badge-outline` half (daisyUI sets `border-color: currentColor`
  there, not a variable) are details for that same plan item.
