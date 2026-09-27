# Theme identity pass A plan review: contract and criteria

Lens: contract and criteria. Target: `docs/superpowers/plans/2026-09-26-theme-identity-pass-a.md`
at `c260832f`, against the approved spec `docs/superpowers/specs/2026-09-26-theme-identity-design.md`.
Every finding below was checked against the tree or `node_modules`, not recalled. The spec's ratified
design is not re-argued.

**Counts:** 2 blockers, 9 majors, 9 minors. No owner forks: each finding has one correct answer.

Spec coverage is sound. Every requirement the spec assigns to pass A lands in a task with an
acceptance line (presence and inventory tests, the pin assertion, the custom-surface category, rules
10 to 14, the D1 split and its two guards, the values, every idiom family, the sweep post-condition,
the starter, the fixture and its spec, norms and the chip re-key, the proof, the docs, the facts, the
reference pages, the changelog, ROADMAP, and the rulings-ledger reading). The defects are in whether
the criteria can go green, and whether they reach the states they claim.

## Blockers

### B1. The norms discipline test goes red at task 4 and stays red until task 13

- **Location:** plan:395-405 (task 4 edits `RATIFIED_NORMS`), plan:721-722 (task 13 regenerates
  the manifest), plan:73-76 (the expected-red set names only CI's norms job).
- **Defect:** `src/tests/unit/audit/norms.test.ts` ("honors its own disciplines against the
  production tables") runs in `npm test`. It calls `checkManifestDisciplines(manifest)`, which
  flags a ratified row whose band disagrees with `RATIFIED_NORMS` unless the row carries
  `ratified-drift` (`src/lib/audit/norms.ts:555-561`). The committed manifest holds
  `button-primary`, `button-ghost`, `input-text`, and `select` `border-radius` at `[10]` and `card`
  at `[16]`, all `ratified` with no flags. Task 4 moves the table to 6 and 8. The engine gate for
  tasks 4 to 12 then fails on a test the plan never lists as expected-red. The implementer can't fix
  it without touching the manifest, which the plan defers to task 13.
- **Fold:** move the `RATIFIED_NORMS` edit out of task 4 and into task 13, beside
  `norms:generate`, so the table and the manifest change in one commit. Drop `norms.ts` from task
  4's Files. Add to task 13's acceptance: `norms.test.ts` passes on the regenerated manifest, and no
  radius row carries `ratified-drift`.

### B2. Pinned tiers make the runner report a gate MISMATCH on every paint task

- **Location:** plan:36-39 (`gate: "npm run check && npm test"`, "the fallback"), plan:86-90
  (paint tasks pin `gateTier: "engine"`).
- **Defect:** for a pinned task, `resolveGate` returns `t.gate || a.gate` as the gate to reproduce
  (`~/.claude/workflows/pass-execute.js:286-288`). The implementer instead runs the string that
  `gate-tier.mjs --pin engine` prints, which I ran:
  `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:reference:signatures && npm run check:facts && npm run check && npm test`.
  `reviewPrompt` compares the two on their command core and emits "MISMATCH ... Treat this mismatch
  itself as a blocking finding" (`pass-execute.js:227-230`). Every one of tasks 1 to 13 therefore
  draws a blocking review finding that no code fix can clear. The reviewer would also reproduce with
  the weaker string, which skips `check:reference` and so never runs `npm run package` (B2 and M4
  compound).
- **Fold:** set each pinned task's `gate` (or `a.gate`) to the exact engine string above. Task 0
  item 6 already records it, so the plan can say "task 0 item 6's engine string". Leave task 14
  unpinned, since its tier is computed. Say in the Execution mode paragraph that `gate` must equal
  the pinned tier's string, or the runner flags a mismatch.

## Majors

### M1. The full state set is a spec condition, but the tests sample only rest and hover

- **Location:** plan:319-321 (task 2), plan:437-445 (task 5), plan:471-480 (task 6), plan:518-520
  (task 7 switch).
- **Defect:** daisyUI 5.7.44's `button.css` restates the variables at every state.
  `.btn:where(:checked..., :focus-visible)` resets `--btn-bg` to
  `var(--btn-color, var(--color-base-200))`, and `--btn-border` and `--btn-shadow` with it.
  `.btn:active:not(.btn-active, [aria-pressed=true], ...)` sets `--btn-shadow: 0 0 0 0` and a darker
  `--btn-bg`. So a lift that is right at rest and on hover can still vanish on `:active`. A hairline
  that is right at rest and on hover can still turn base-200 on keyboard focus. The tests have gaps:
  - Task 2 tests the lift at rest and hover only. The spec says the lift is "the same in every state".
  - Task 5 tests the plain button's fill and edge at rest and hover. It checks only the outline color
    on focus-visible, never the fill or edge, and has no active case.
  - Task 6 tests the selected segment at rest and hover. It has focus-visible in dark only, and no
    active case.
  - Task 7 tests the switch on its three checked forms but not on hover.
- **Fold:** add one Global constraint. Every idiom test asserts each property its rule sets at rest,
  hover, focus-visible, and active. Where the rule does not exclude disabled, it also asserts
  disabled. A state the rule leaves to daisyUI is asserted to match stock, which proves the
  `:not(...)` exclusion. Update each task's acceptance line to "all states" rather than naming two.

### M2. `styleOf` never proves it reached a state, and no mechanism for `active` is quoted

- **Location:** plan:296-299 (`styleOf(el, prop, state)` interface).
- **Defect:** the vitest 4.1.11 `userEvent` API (`node_modules/@vitest/browser/context.d.ts`) offers
  `hover`, `unhover`, `tab`, and `keyboard`. It has no press-and-hold, so "driving real pointer
  input" for `:active` is unspecified library behavior. For a value that equals its rest value (the
  lift, the text colors), a probe that silently fails to reach hover, focus-visible, or active
  passes vacuously.
- **Fold:** name the mechanisms in the interface. Hover uses `userEvent.hover`. Focus-visible uses
  `userEvent.tab` or a keyboard event followed by focus. Active uses a CDP
  `Input.dispatchMouseEvent` `mousePressed` with no release, through `cdp()`, the repo's precedent at
  `src/tests/component/reproductions-containment.test.ts:17,114`. Alternatively, active uses
  `userEvent.keyboard('{Space>}')`, if a quick check proves Chromium holds `:active` under it.
  `styleOf` asserts `el.matches(':hover' | ':focus-visible' | ':active')` before it reads the value,
  and throws naming the state otherwise. Add a probe self-test that reaches each state on a stock
  `btn`, reads daisyUI's `:active` `translate` of `0 .5px`, and proves the read differs from rest.

### M3. The hostile equivalence run names no child element, so it's impossible or vacuous

- **Location:** plan:351-352 and plan:379-382 (task 3); Review focus 2 (plan:174-176).
- **Defect:** the hostile sheet is `div { font-family: Georgia; ... }`. If the "light child" is a
  `div`, that rule matches it directly, and `font-family` and the other properties differ both
  today and after the change. Then "zero differences" can't pass. If the child is some other
  element, the run proves only inheritance through the wrapper. That is the real hazard, but the
  plan never says so. The spike describes the host rule "on the wrapper, and so on its children"
  (spike:125-130), which implies its child was not a `div`. Nothing proves the variant can fail, so
  a probe that injected `hostCss` after the read would also pass.
- **Fold:** name the fixture state. The wrapper is a `div`, so the host rule meets the unlayered
  `[data-theme]` rule there. The child is a `span`. Require the hostile run against the pre-edit
  sheet (step 2) to show zero differences before the roots change. Add a mutation-ledger entry:
  moving `font-family` from the plain root rule into the plugin block, where it is demoted to
  `@layer base`, fails the hostile run and names `font-family` on the wrapper.

### M4. Component tests read `dist`, which only `npm run package` refreshes

- **Location:** plan:140-142 (tests render against `dist/components/cairn-admin.css`); the mutation
  ledgers at plan:278, 322-323, 387, 449, and 690-691.
- **Defect:** the component tests import `dist/components/cairn-admin.css?inline`
  (`src/tests/component/BtnActiveDarkGround.test.ts:7` and nine others). `npm test` doesn't build.
  Only `npm run package` does, which the engine tier reaches through `check:reference`. An
  implementer's TDD loop, the `code-simplifier` pass, and each mutation (unlayering a rule,
  reversing the pin, deleting `@source inline`) all need a rebuild before the test run means
  anything. Without one, a mutation reports "did not fire", or a stale sheet reports green.
- **Fold:**
  - Add a Global constraint: every component-test run that follows a CSS or build edit, each
    mutation included, is preceded by `node scripts/build/build-admin-css.mjs` or `npm run package`.
    The mutation ledger records that step.
  - Better, make task 3's mechanism close the gap. A component-project `globalSetup` calls
    `buildAdminCss()` and writes `dist` before the run, and the guard test covers it.

### M5. A stale preview on port 4173 turns the showcase e2e checks vacuous

- **Location:** plan:224-229 (task 0 serves a preview), plan:721-726 (task 13 needs a preview),
  plan:770 (S1 serves one); the heavy task checks in tasks 11, 12, 13, and 15.
- **Defect:** `examples/showcase/playwright.config.ts:29-35` sets
  `reuseExistingServer: !process.env.CI`. Locally, any server already on 4173 is reused. That could
  be a preview this pass left running, or one from the other session sharing this checkout and
  machine. The e2e would then prove that server's build, not the task's. Task 12's 404 would fail
  loudly. Task 11's `styleguide.spec.ts`, and task 13's contrast run after its own
  `norms:generate` preview, would pass on the wrong build.
- **Fold:** before each heavy showcase e2e, assert port 4173 is free (`ss -ltn 'sport = :4173'`
  prints no listener) and quote the output under Task checks. In task 13, order the steps. Build and
  serve the preview for `norms:generate`, `check:touch-targets`, and `check:interactive-contrast`.
  Stop it. Confirm the port is free, then run the contrast e2e. Every capture agent (task 0, S1, S3)
  stops its server and reports doing so.

### M6. Several contrast checks name no pair or no compositing ground

- **Location:** plan:707-712 (task 13), plan:482-484 (task 6), plan:188-189 (Review focus 5).
- **Defect:** a contrast check needs both colors, and a translucent value
  (`color-mix(..., transparent)`) needs a ground to composite on. These checks lack one or both:
  - The focus ring at 3:1 names no pair: against the fixture's card, the page ground, or the
    button's own fill?
  - The selected text at 4.5:1 doesn't name the wash as its ground.
  - "Against the ground" doesn't say whether the ground is the base-100 card or the base-200 page.
  - Task 6's "measured ratio against `base-100` and against the resting sibling's 22% edge" compares
    two translucent colors with no compositing named.
- **Fold:** give task 13 a pair table with every row naming a foreground, a background, a
  compositing ground, and a floor. Examples: "focus ring vs the fixture card (`base-100`), 3:1";
  "selected-segment text vs the 7% wash composited on `base-100`, 4.5:1"; "light hairline, 55% over
  `base-100`, vs the resting edge, 22% over `base-100`, 3:1". State in task 12 that the joins sit on
  a `base-100` card. Task 6 uses the same table.

### M7. Review focus 2 doesn't fix the stylesheet order, which decides the cascade

- **Location:** plan:174-178, plan:685-686 (task 12).
- **Defect:** the order of cascade layers comes from each layer's first declaration across all
  sheets. If the host's compiled sheet declares its `utilities` sublayers first, `site-theme` sorts
  before `cairn-idiom`. If the host sheet follows the admin sheet, the host's `site-theme` sublayer
  (task 11) is appended after `cairn-idiom`. Its unscoped `.btn-outline` rule then beats rule 11's
  outline ink inside the admin. That second order is the realistic one for a consumer who imports
  site CSS in the root layout. The plan also asserts only the plain button, `btn-sm`, and the radii.
  It never checks `btn-outline`, which is where two sheets actually compete. It also never says how
  the spec file locates the showcase's hashed compiled CSS.
- **Fold:** inject the host sheets in both orders, before and after the admin sheet. Add
  `btn-outline btn-active` and an uncolored `btn-outline` to the host-injection assertions, and
  state the expected result for each order. If the host-after order loses rule 11 to `site-theme`,
  that is a finding for the conductor, not a patch. Name the host CSS source: the path of the
  showcase build output, or the file the spec reads.

### M8. The probe interface has no color oracle, and task 8's "stock render" has no expected value

- **Location:** plan:294-299 (`_idiom-probe.ts` interface), plan:549-551 (task 8).
- **Defect:** tasks 5, 6, and 8 compare computed colors with `color-mix(...)` expressions, and the
  browser serializes those as resolved `oklab(...)` or `color(srgb ...)` values. Each implementer
  would invent its own resolver. In task 8, "a bare `.alert` and `alert-soft alert-info` match
  daisyUI's stock render" names no oracle. Reading the same element under the same sheet compares
  the element with itself, so the check passes vacuously.
- **Fold:** add `resolveColor(expr, theme)` to `_idiom-probe.ts`. It paints the expression on a
  probe element inside the same wrapper and returns the computed value. The stock oracle is either
  daisyUI's own formula resolved through `resolveColor`, for example
  `var(--alert-color, var(--color-base-200))` for a bare alert and the `alert-soft` 8% mix from
  `node_modules/daisyui/components/alert.css`, or a variant of the compiled sheet with the
  `cairn-idiom` block removed. Name which one the plan uses.

### M9. The `componentsLayerCap` arithmetic is off by one

- **Location:** plan:311.
- **Defect:** the lift is two `@layer components` rules,
  `.btn-primary:not(:disabled)` and `.btn-primary:not(:disabled):hover`
  (`src/lib/components/cairn-admin.css:166,171`). The modal repair is one more (`:236`). I counted
  the gate's own `SCOPED_RULE` matches inside the components block and got 19. Removing those three
  leaves 16, not 17. As written, the acceptance number either can't be met or invites padding.
- **Fold:** say "19 to 16", or "to the measured count after the three selectors leave, stated in
  the report".

## Minors

- **m1.** plan:395-397. Task 4's Files omit `src/tests/component/cairn-idiom-surface.test.ts`, which
  its acceptance extends with the height assertions (plan:411-412). Add it.
- **m2.** plan:249-251 and plan:265-267. `listDaisyuiClasses({ exclude })` takes no root, so the
  "fails loud on an empty result" case can't be planted without mocking the filesystem. Add a
  `root` option that defaults to `node_modules/daisyui`. Define "no calendar class" as the
  difference between the lists with and without `exclude`, so the presence test doesn't hand-keep
  calendar names.
- **m3.** plan:306-308 and plan:121-122. Spell out the dark lift literal that decision 3 derives:
  the dark `--cairn-shadow` tint is `oklch(10% 0.02 75)` (`cairn-admin.css:501`), so the lift is
  `0 1px 2px -1px oklch(10% 0.02 75 / .35)`. Otherwise the rule and its test can derive different
  values.
- **m4.** plan:342-344 and plan:409-410. Name how `admin-theme-computed.json` is produced and
  regenerated: a committed script, or an update flag on the equivalence test. Task 4 "updates it
  deliberately", and a regenerated file hides nothing if the report diffs it, but the path must
  exist.
- **m5.** plan:576-580. Tie task 9's "found" counts to task 0's recount (4 ink-opener, 1 Publish, 5
  `shadow-none`, 16 inline strokes), so a narrower grep can't under-find. Name the two plain-button
  `font-semibold` sites it keeps.
- **m6.** plan:613-615. Give the `border-radius:` literal post-condition a command with an expected
  empty output, for example `grep -rnP 'border-radius:\s*(?!var\(--radius-|calc\()' --include=*.svelte`
  over both trees. Without one it is a claim, not a check.
- **m7.** plan:620-621. The chip re-key has only a positive fixture, so a re-key that treats every
  filled 4px element as a chip passes. Add a negative case: a filled element at `rounded-selector`
  that isn't chip height or carries no text is not reported as a chip.
- **m8.** Sweep scope. `src/lib/reproductions/stories/CustomScreen.svelte` matches the spec's
  fixed-radius pattern and sits outside the two swept trees. It is the custom-screen reproduction
  that models G1. Name it in task 10, either swept or explicitly left, with the reason.
- **m9.** plan:719-720. The rendered audit's page list defaults to the core admin routes
  (`src/lib/audit/rendered.ts:158`). Name `rendered.pages` for the 320 and 390 check so the fixture
  and a chip-beside-heading row are covered. State the fixture condition for `Pagination`: the
  showcase ships 27 posts at `pageSize` 10 (`ConceptList.svelte:66`), so `/admin/posts` renders it.

## The four planning-miss checks

- **Library behavior quoted, not recalled.** Mostly met through the spike, which measured daisyUI,
  Tailwind, and postcss-prefix-selector. Misses: M2 (vitest has no press-and-hold), M5 (Playwright
  `reuseExistingServer`), and B2 (the runner's pin resolution, a workstation tool). A narrower
  daisyUI gap sits under M1: the plan names the four active forms but not the `:focus-visible`,
  `:checked`, and `:active` restatements that force the full state set.
- **Every state a check can meet names its report.** Met for the generator's empty result and the
  sweep greps. Missed for the hostile run's child (M3) and for a probe that never reaches its state
  (M2).
- **Every privileged field names every channel that may set it.** Mostly met. The four active forms
  and the three checked forms are enumerated. `--radius-field` has three setters: the theme block,
  the concentric rule, and a host unlayered rule (D1 accepts the last). A host sheet's sublayer
  order is an unnamed channel for the outline variables (M7).
- **Every proof names its fixture state.** Missed for the hostile child (M3), the contrast grounds
  (M6), the injection order (M7), the preview server (M5), the freshness of `dist` (M4), and the
  audit page list (m9).
