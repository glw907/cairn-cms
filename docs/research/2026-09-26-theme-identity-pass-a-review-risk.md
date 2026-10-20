# Theme identity pass A: plan review, domain-risk lens

Target: `docs/superpowers/plans/2026-09-26-theme-identity-pass-a.md` at `c260832f`, against the
approved spec `docs/superpowers/specs/2026-09-26-theme-identity-design.md`. The ratified design is
not re-argued. The findings below are ranked by consequence. Each one was checked against the
code, the daisyUI 5.7.44 sources, or the runner, and was not inferred from the plan's prose.

Counts: 1 blocker, 10 major, 7 minor.

## Blocker

### B1. A pinned `gateTier` with the fallback gate string trips the runner's MISMATCH on every task

- **Location:** plan:36-38 (`gate: "npm run check && npm test"`), plan:86-90 (every paint task
  pins `gateTier: "engine"`); runner `~/.claude/workflows/pass-execute.js:286-287` and `:222-230`.
- **Defect:** with a pin, `resolveGate` returns `t.gate || a.gate`, which is
  `npm run check && npm test`. The implementer runs `gate-tier.mjs --pin engine`, which prints
  `TIER_GATES.engine` (`scripts/checks/gate-tier.mjs:50-51`). That string is the docs checks
  followed by `npm run check && npm test`. `gateCore` compares the two strings literally, finds
  them different, and tells the reviewer to treat the mismatch "itself as a blocking finding." Every
  pinned task (1 to 13, and 15) fails review. `stopOnEscalate` then halts segment A at task 1
  after one or two wasted fix rounds.
- **Fold:** Task 0 item 6 already records the `engine` tier string. Add one clause: the conductor
  passes that exact string as the runner's `gate` arg (or as each pinned task's `gate`), so the
  pinned and resolved strings agree. Keep "the fallback" wording only for task 14, which is
  computed.

## Major

### M1. Component tests read a `dist` sheet that no gate rebuilds

- **Location:** plan:140-142 (tests render against `dist/components/cairn-admin.css`),
  plan:294-299 (`_idiom-probe.ts`), plan:363-370 (task 3's mechanism), plan:86-90 (the engine
  tier).
- **Defect:** `npm test` is `vitest run ... && npm run test:component` (`package.json:79`). Neither
  it nor the engine tier string runs `npm run package` or `build-admin-css.mjs`. `dist` is built
  once, by `prepare` at `npm ci`. Existing component tests already import
  `dist/components/cairn-admin.css?inline`. After a `cairn-admin.css` edit, an idiom test, a
  mutation check ("moving the rule unlayered fails"), or the diff reviewer's reproduction can run
  against the previous build. A mutation that "fired" or "did not fire" on a stale sheet is false
  evidence. CI catches this only at the boundary push, after the task is accepted.
- **Fold:** task 2 is the first task whose tests depend on a fresh sheet. Have it make the
  component project rebuild the admin sheet before it runs, through a `test:component` pre-step or
  a vitest `globalSetup` that calls `build-admin-css.mjs`. Add a guard test that fails when the
  sheet's mtime predates `cairn-admin.css`. Add one Global constraint: "no component-test result
  counts unless the sheet was rebuilt in the same run." Task 3's mechanism then inherits the
  freshness guarantee.

### M2. The checked switch's focus ring vanishes, and nothing measures it

- **Location:** plan:503-505 (the switch rule), plan:518-520 (task 7 acceptance), plan:708-711
  (task 13's focus-ring list: plain, neutral, soft primary, and selected buttons only).
- **Defect:** daisyUI draws the toggle's focus ring as `outline: 2px solid` with no color
  (`toggle.css`, `.toggle:focus-visible`), so the ring is `currentColor`, which is
  `var(--input-color)`. The knob is `:before { background-color: currentColor }`. The spec's
  variables-first condition names `--input-color` (spec:122). The natural implementation of a
  "base-100 knob" is therefore `--input-color: var(--color-base-100)`, which also turns the focus
  ring (and the track border) base-100. The ring then disappears on a base-100 card in both
  themes. Neither the task 7 tests nor the task 13 proof checks a switch's focus ring. This is a
  WCAG 2.4.7 failure that would ship.
- **Fold:** task 7 acceptance gains "a checked switch at `focus-visible` computes an outline color
  other than `base-100`, in all three checked forms, both themes." Task 13 adds the checked and
  unchecked switch to the focus-ring 3:1 list. Task 7's outcome notes that the knob is set on
  `::before` (or the rule sets `outline-color` explicitly), because the knob and the ring share
  `currentColor`.

### M3. A `:checked` radio or checkbox `.btn` takes the hairline and loses its text

- **Location:** plan:426-430 (the plain `btn` hairline and its exclusion list), plan:437-449.
- **Defect:** daisyUI's documented radio-join pattern (`<input class="join-item btn" type="radio"
  aria-label=…>`) colors a checked input through `.btn:where(:checked…) { --btn-color:
  primary; --btn-fg: primary-content }` (`button.css`). The spec's exclusion list covers the four
  active forms but not `:checked`. The idiom layer wins over daisyUI, so a checked radio button
  renders a base-100 fill (the hairline rule) with primary-content ink, which is `oklch(98% …)` on
  `oklch(99% …)` in light, about 1:1. The label becomes unreadable on any consumer's custom screen
  that uses the canonical join-radio. D2 compiles every daisyUI component in, `filter` included,
  and `filter` is built from `input.btn[type=radio]`. No cairn screen uses the pattern today, so
  no in-tree render will surface it.
- **Fold (execution):** add `:checked` to the hairline's exclusion list, which is the
  narrow-selector condition applied, so daisyUI's stock checked look holds. Task 5 tests a checked
  radio `join-item btn` in both themes (ink against fill at 4.5:1). Task 12's fixture carries one
  radio join.
- **OWNER FORK:** whether `:checked` should instead become a fifth selected-segment form (neutral
  wash, 600, hairline). Recommendation: exclude now and file the fifth-form question for pass B,
  since excluding changes nothing ratified and treating it as selected is a design extension.

### M4. Port 4173 plus `reuseExistingServer` lets a gate prove the wrong build

- **Location:** plan:224-229 (task 0 serves `main`'s build on 4173), plan:721-726 (task 13's
  preview), plan:769-771 (S1), plan:807-808 (S3's throwaway worktree);
  `examples/showcase/playwright.config.ts:29-32`.
- **Defect:** local Playwright reuses any server already listening on 4173
  (`reuseExistingServer: !process.env.CI`). Capture and preview servers run outside the
  `cairn-run-gate` lock. The failure paths are concrete:
  - A task 0 "before" server left alive makes task 11's and 12's heavy e2e checks run against
    `main`'s build.
  - S3's throwaway `main`-engine worktree does the same to task 15's rerun.
  - The concurrent docs session can hold the port too.
  - Task 13's `norms:generate` "against the built preview" can commit a manifest measured on the
    wrong build. That is a shipped data defect that `norms:check` then keeps green.
- **Fold:** capture and serve agents (task 0, S1, S3) use a port other than 4173 and kill the
  server on exit. Before any heavy showcase e2e or `norms:generate`, the running agent confirms
  that 4173 is free or that its listener's cwd is this worktree (`ss -ltnp` plus
  `/proc/<pid>/cwd`), and quotes the check.

### M5. Most swept surfaces are never looked at before S4 blesses them

- **Location:** plan:769-773 (S1's capture set: theme-kit, posts, one edit page, vocabulary,
  signups), plan:821-826 (S4 regenerates every `admin-visual` baseline), plan:589-608 (task
  10's 17 files).
- **Defect:** task 10 re-roles about 85 radius sites. A wrong role is invisible in a diff: a
  panel given `rounded-field` still reads as valid markup. The swept files include
  `CairnMediaLibrary` (the 390 bottom sheet), `HelpHome`, the editors screen, `TidyReview`, and the
  toolkit tooltip. The login page is in task 0's before-set but not in S1. `admin-visual.spec.ts`
  captures `/admin/editors`, `/admin/media` (four states), and the command palette, and S4's regen
  rewrites all of those PNGs. The only review of them is a Haiku probe that lists file names. A
  mis-roled radius or a layout shift from the size step on those screens ships blessed.
- **Fold:** widen S1's capture set to the union of `admin-visual`'s pages and the login page,
  with the media library's sheet opened at 390. Extra pages need only 1440 and 390. In S4, hand
  the regenerated-file list to one `visual-verifier` read of every file outside S1's set, and
  compare each against the task 0 before-set where one exists.

### M6. The public `PreviewBanner` can lose its site override seam in the radius sweep

- **Location:** plan:602-605 (literals become `var(--radius-*)`), plan:612-615 (the
  post-condition allows only a `var(--radius-*)` form or a `calc` over one);
  `src/lib/components/PreviewBanner.svelte:95`.
- **Defect:** the banner's radius is `var(--cairn-preview-radius, 0.5rem)`. It is the design-agnostic
  public component (`components/index.ts:40-44`), and `--cairn-preview-radius` is its override
  seam. The post-condition as written rejects that form. An implementer satisfying it would
  write `var(--radius-box, 0.5rem)`. That silently drops a site's override, and it makes the banner
  on every consumer's public pages follow that site's daisyUI `--radius-box`.
- **Fold:** task 10 names PreviewBanner as an exception: keep the outer
  `--cairn-preview-radius`, with an inner `var(--radius-box, 0.5rem)` fallback or the literal,
  and state that the post-condition accepts a `var(--cairn-…, var(--radius-*, …))` chain. Add a
  test that a page with no daisyUI and a set `--cairn-preview-radius` computes the override.

### M7. The `chip-ground-collision` re-key can make a shipped audit rule flag non-chips

- **Location:** plan:604-606 (the re-key), plan:620-621 (acceptance: one positive fixture only).
- **Defect:** the rule ships in `cairn-audit` to consumers and reports at error tier on
  collisions (`chip-ground-collision.ts:215`, `:282`). Today it detects a chip by pill shape
  (`isPillShaped`, radius at least half the height, `:165-191`). Re-keying to "filled,
  chip-height, text-carrying, at `--radius-selector`" reaches much more:
  - kbd, small filled labels, and any `btn-xs` or `btn-sm` whose radius equals the selector
    radius.
  - Whole classes of controls on a consumer theme whose `--radius-selector` equals
    `--radius-field`, which is common.

  A positive-only fixture cannot catch a false positive.
- **Fold:** task 10 acceptance adds negative fixtures: a text `btn-sm` at field radius, a `kbd`,
  and a theme with selector radius equal to field radius, where no button or input is flagged.
  Detection keys on the element's resolved `--radius-selector`, never a literal 4px. Interactive
  elements are excluded. Tasks 0 and 13 record this rule's findings, before and after.

### M8. The 80% flag sits below the planned spend, which makes an extra sitting likely

- **Location:** plan:49-59.
- **Defect:** the flag is 11.6M against a planned 11.9M, so the arithmetic contradicts the stated
  intent ("an overrun past plan"). Task 15 is close to certain to run once, for S3's
  corrections, with the plain button's hover step graded there. The close is sized at 0.7M, but
  HISTORY records a close that cost about four times its 0.4M sizing (`docs/HISTORY.md:827-828`).
  This close carries the changelog, facts, three reference pages, narrative-arm fixes, errata,
  rulings, four ROADMAP moves, HISTORY, STATUS, and the merge. The flag then trips in segment E or
  F and forces a combined question outside S3. That is an owner sitting the plan does not need.
- **Fold:** size the close at about 1.5M and task 15 at two runs. That puts the plan at about
  12.8M. Set the ceiling near 16M (flag 12.8M), or keep 14.5M and state: "if the flag trips in
  segment E, its question rides S3's sitting. The close proceeds without a second question unless
  spend passes the ceiling."

### M9. The close merges without re-checking concurrent executors or merging a moving `main`

- **Location:** plan:834-875 (task 16), plan:198-201 (task 0's one-time check).
- **Defect:** the docs initiative keeps running on `main` after pass 0+1 merges. The stage 2a
  pilot is authorized with a 30M working ceiling (`docs/STATUS.md`, "Immediate next action"). It
  touches the files this close edits: `docs/internal/facts/`, reference pages, `CLAUDE.md`,
  `CHANGELOG.md` `## Unreleased`, `STATUS.md`, and `HISTORY.md`. The plan checks for a live
  executor only at task 0, and only for the `theme-identity-a` path. The close then runs
  `check:facts` and `check:reference` on a stale base, writes STATUS against a `main` that has
  moved, and merges. The global rule forbids two conductors running a close or merge on one
  branch.
- **Fold:** task 16, before marking the PR ready:
  1. Re-run the executor check, widened to any conductor working `main` (the "fresh session
     executes this" line in STATUS and recent workflow journals).
  2. Merge `origin/main` into the branch.
  3. Re-run `check:facts`, `check:reference`, `check:docs`, and `check:rulings-format`, and let
     CI go green on the merged head.
  4. Write STATUS and HISTORY against the merged state.

### M10. The expected-red set masks public-page regressions for four segments

- **Location:** plan:73-77.
- **Defect:** `site-visual.spec.ts` is expected-red from segment A to S4. Tasks 1 to 10 change
  nothing on the public site by design, but task 10 edits the public `PreviewBanner` and toolkit
  components. A `site-visual` red before task 11 is exactly the signal of an unintended
  public-output change. The blanket exception hides it, and S4's regen then commits it as the new
  baseline. Separately, a failure "by spec file name" cannot tell a screenshot diff from a
  crash, a timeout, or a missing locator inside `admin-visual.spec.ts`.
- **Fold:** `site-visual` enters the expected-red set only from task 11's push. The Haiku probe
  reports, for each failure in the two visual specs, whether it is a `toHaveScreenshot` mismatch.
  Any other failure type is red.

## Minor

### m1. The plain button's full state set is required but not asserted

- **Location:** plan:437-440.
- **Defect:** daisyUI sets `--btn-bg: var(--btn-color, base-200)` on a plain `.btn:focus-visible`
  and darkens `--btn-bg` and `--btn-border` on `:active` (`button.css`). A rule written for rest
  and hover only passes task 5's tests, but the hairline turns into a base-200 slab under
  keyboard focus. Global constraints require the full state set, and the acceptance tests only
  rest, hover, and the outline color.
- **Fold:** assert fill and edge at `focus-visible` and `active` through `styleOf`.

### m2. The touch-target and interactive-contrast gates never visit the admin

- **Location:** plan:725-726.
- **Defect:** both scripts probe the sitemap pages plus `/styleguide`
  (`scripts/checks/live-probe-support.mjs:19-25`, `check-touch-targets.mjs:69`). A green run
  says nothing about WCAG 2.5.8 or focus in the admin. The risk is small, since sizes only grow,
  but the plan reads as if these gates prove the admin.
- **Fold:** add `/admin/theme-kit` to the `cairn-audit --rendered` page set in tasks 0 and 13, and
  record per-rule findings for `touch-targets`, `focus-renders`, `interactive-contrast`,
  `border-contrast`, and `chip-ground-collision`. Compare them by finding identity rather than
  totals, given the 133 and 116 run noise. Relabel the two live gates as public-site checks.

### m3. The fixture omits the other moved rules

- **Location:** plan:670-678.
- **Defect:** rules 13 and 14 (the checkbox, radio, and field edges) move into the sublayer, but
  the fixture has no checkbox or radio. The warm `modal-box` repair renders for the first time,
  but the fixture has no modal.
- **Fold:** add an unchecked and checked checkbox and radio, a static open `modal-box`, and the M3
  radio join. Assert their computed edges and shadow in `theme-kit.spec.ts`. This keeps the spec's
  list and adds to it.

### m4. The close's reference list misses two stale pages

- **Location:** plan:850-851.
- **Defect:** `docs/reference/admin-toolkit.md` says each component section lists its "exact class
  inventory," and the sweep changes toolkit classes in `PageHeader`, `ListToolbar`, and
  `Pagination`. `sveltekit.md:1826-1904` calls the nav counts "pills," and they leave pill
  geometry.
- **Fold:** add `admin-toolkit.md`'s class inventories and the geometry wording in `sveltekit.md`
  to the close. Leave API shape names such as the applied-filter `pill { id, label }` alone.

### m5. Task 6 lacks a call-site inventory of pressed and current buttons

- **Location:** plan:460-487.
- **Defect:** task 7 lists every border-utility call site before its move, and task 6 does not
  do the same for `.btn` elements carrying the four active forms. Known sites: `EditorToolbar:289`,
  `ListToolbar:289-290`, `MediaPicker:175-181` (a `btn-primary`/`btn-ghost` pair), and
  `Pagination:103`.
- **Fold:** mirror task 7's pre-move list, giving a per-site render verdict and naming any
  `btn-ghost` selected site for the reviewer's decision.

### m6. Release exposure on caret ranges

- **Location:** plan:834-844.
- **OWNER FORK.** Consumers on `^0.97.0` take any `0.97.x`. A patch cut from `main` after this
  merge, such as a site hotfix, would deliver the whole admin retheme and the 1.7x sheet to all
  four sites without an announcement.
- **Recommendation:** the close records in STATUS that the next cut from `main` is a minor
  (`0.98.0`, already the planned tier change for extend-1's rules), and that a hotfix before then
  branches from `v0.97.0`.

### m7. Session and task sizing

- **Location:** plan:63-69, plan:328-389.
- **Defect:** by S3 the conductor carries fourteen chains, and S3 needs Geoff attended, possibly
  hours later.
- **Fold:** make the segment D to E boundary a sanctioned close-and-resume point with a STATUS
  resume prompt. Task 3 carries six deliverables on Opus. Move the self-contained
  `motion-vocabulary` fix (one comparison change plus a test) into task 1, which lightens the
  Opus task without reordering anything.

## Checked and sound

- The segment sizes are three to four implementer tasks, each ending on a green commit.
  Sequential mode is justified by the shared stylesheet and budget file.
- Task 0 stops the pass on a version drift, and on the docs pass not having merged.
- The realpath check guards the worktree-showcase gotcha.
- The alert inks are pre-computed from source values in task 8, which is the right place to catch
  a contrast failure early.
- RTL at 320 and the hostile host sheet are pinned to tests. Previews render in a sandboxed
  iframe, so the idiom rules cannot leak into the preview pane. Site CSS loads only on the `(site)`
  layout, so the starter's `site-theme` rule cannot reach the admin.
- S3 is the only planned owner sitting, and S2's owner-taste items ride on it. The one gap is the
  flag interaction in M8.
