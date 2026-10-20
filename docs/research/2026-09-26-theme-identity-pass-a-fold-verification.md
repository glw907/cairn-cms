# Theme identity pass A: fold verification

Target: `docs/superpowers/plans/2026-09-26-theme-identity-pass-a.md` at `340208cd`, against the fold
record (`...-pass-a-fold.md`), the three lens reviews, the arc log's settled decisions, the runner
(`~/.claude/workflows/pass-execute.js`, last commit `ce70b5f`), and the tree. The settled decisions
(the sequencing reversal, decisions 9 to 11) were not reopened. No gate was run.

Counts: 0 blockers, 1 major, 10 minors.

## 1. Did every blocker and major close where the fold cites?

Yes, all 2 blockers and all 25 major IDs were checked at their cited locations. Each one closed.

- **Gate string (C-B2, X-B1, R-B1):** closed at plan:39-46, :125-127, and :326-328. Task 14 stays
  computed (:1035). A probe of `decideGate` gives the `docs` tier for task 14's three paths. The
  printed engine string matches plan:126 exactly. The task 0 command still has a defect (m1).
- **Norms (C-B1, X-B2):** closed. Task 4 no longer touches `RATIFIED_NORMS` (:555-557) and asserts
  `norms.test.ts` (:566). Task 13 moves the table with the manifest (:966-968, :984-987).
- **Majors:** C-M1 (:208-212, plus "all four states" in tasks 2, 5, 6, 7, and 11; see m6 for task
  7's switch line), C-M2 (:426-432, :455-457), C-M3 and X-M4 (:486-496, :520-525, :533-536), C-M4
  and R-M1 (:418-420, :220-223, :458), C-M5, X-M3, and R-M4 (:227-234, :970-973, and the port checks
  in tasks 11, 12, 13, and 15), C-M6 (:950-963, :896; see m4 on task 6's timing), C-M7 (:916-922),
  C-M8 (:433-434, :224-226, :730-733), C-M9 (:447), X-M1 (:189-195, tasks 7, 9, and 10), X-M2
  (:214-219, :463, :606, :690, :694), X-M5 (:1124-1137), R-M2 (:675-678, :695-696, :963), R-M3
  (:179-188, :596, :639-640, :899-900), R-M5 (:1047-1051, :1129-1131), R-M6 (:803-806, :823, :831-832),
  R-M7 (:810-813, :833-836), R-M8 (:63-86), R-M9 (:298-303, :1187-1197), R-M10 (:108-114).

## 2. Does every gate stay green at its commit?

No commit goes deterministically red on code grounds. The walk checked these points:
- The pinned engine string matches the runner's `t.gate || a.gate` (`pass-execute.js:286-288`), so
  there is no MISMATCH.
- `RATIFIED_NORMS` and the manifest land together in task 13.
- The inventory stays green because tasks 7, 9, and 10 regenerate additions or safelist removals.
  `shadow-none` stays compiled for task 2's utility case, since task 9 safelists it.
- The allowlist falls 18, 15, then 13. `componentsLayerCap` falls from 19 to 16.
- Task 2's lift assertion reads `--btn-shadow`, so task 4's `--depth: 0` cannot break it.
- The engine gate reaches `npm run package` through `check:reference`. Task 2's pre-run build
  covers the component project.
- The sheet has no size test. `engine-isolation.test.ts` and `grammar-tokens.test.ts` survive task
  3 if the plugin blocks follow the first house-scope selector in the file.
- Task 14's docs-only commit sits on task 13's green engine gate, and the D code-simplifier gate
  re-proves it.

One execution-environment risk remains open: the stock engine string can hang on this workstation
(M1). Some CI-only checks are also absent from every task check, so their first red would surface
at a boundary (m8).

## 3. Did the fold state a new mechanism from memory?

- **The CDP press:** the `cdp()` precedent is real (`reproductions-containment.test.ts:17,114`).
  That precedent sends only `Accessibility`/`Page` commands, never `Input.dispatchMouseEvent`, and
  it notes that the test runs in a child frame (m5).
- **`resolveColor`:** the plan introduces it as new, so no claim needs a source. It resolves in
  the wrapper's context, which a `var(--alert-color, …)` formula needs (m4).
- **Pre-run build:** vitest 4.1.11 supports a project-level `globalSetup` (`TestProject._globalSetups`).
  The "pre-step" alternative does not deliver the TDD-loop claim (m9).
- **`BASE_URL` and 4391:** the Playwright config hard-codes `baseURL: 'http://localhost:4173'`
  and reuses a local server (`playwright.config.ts:29-35`). `norms:generate`, the rendered audit,
  `check:touch-targets`, and `check:interactive-contrast` all read `BASE_URL`. The capture agents'
  `cairn-admin-theme` cookie matches `admin-visual.spec.ts:18-28`. This mechanism is correct.
- **Listener cwd:** `ss -ltnp` shows a user-owned pid, and `/proc/<pid>/cwd` is
  `<worktree>/examples/showcase`, which sits under the worktree. This mechanism is correct.
- **Grep patterns:** re-run at HEAD. The PCRE pattern finds 85 matches in 17 files, plus 1 in
  `CustomScreen.svelte`. The `border-radius:` lookahead prints exactly 7 lines (HelpHome 6,
  Tooltip 1). `PreviewBanner.svelte:95` and the `MediaInsertPopover` fallbacks pass it, as stated.
- **S4:** `test.yml` and `design.yml` have only `push` on main and rebuild, plus `pull_request`.
  `e2e.yml` has the `update_snapshots` dispatch. `norms.yml` is `workflow_call` from `e2e`. The draft PR
  opened at segment A makes the ledger push start `pull_request` CI. This mechanism is correct.
- **daisyUI facts:** confirmed in 5.7.44. These are the `:checked` selector and the `.btn:active`
  restatement of `--btn-shadow`. They also include `translate: 0 .5px`, the bare alert's
  `var(--alert-color,var(--color-base-200))`, and `alert-soft`'s 8% mix. So are the toggle
  knob and ring sharing `currentColor`, `daisyui/theme/object.js`, and the `rounded-t-box`
  utility. daisyUI's output sits in `utilities.daisyui`.
- **The fold record's spot checks:** one is false. `IMPL_SCHEMA` does carry `summary`
  (`pass-execute.js:107-109`). The plan's instruction still works (m10). The workstation claim at
  plan:144-146 is also stated from memory (M1).

## 4. Is the sequencing reversal carried everywhere?

In the plan, yes. No "after draft docs merges" wording remains, and plan:118-121, :298-303,
:323-325, :1166-1168, and :1183-1190 all carry the reversal. The spec still says the opposite, and
the plan's exception clause does not cover it (m2).

## 5. Is the ceiling arithmetic right?

Yes. The rows sum to 15.6M: 7.0 + 0.3 + 0.9 + 0.3 + 0.8 + 0.9 + 0.8 + 1.0 + 0.4 + 0.4 + 1.5 + 1.2
+ 0.1. Fourteen chains cover tasks 1 to 14. A quarter of 14 chains at 0.25M is 0.875M, which the
table rounds to 0.9M. The old 11.9M plus the fold's +3.7M in deltas also gives 15.6M. The flag is
16.0M, which is 80% of 20M and 0.4M above planned spend, as intended.

## 6. Can a Sonnet implementer execute each task?

Mostly. The gaps are m3 to m9. None forces a guess that a gate would not catch.

## Findings

### Major

**M1. The engine string hangs on this workstation's recorded state, and task 0's stop condition
lets the pass proceed into it.**
- Location: plan:144-148 and plan:329-331.
- Defect: plan:144-146 says the component project "runs serialized (`--no-file-parallelism`)" on
  this workstation. That is the recorded workaround (STATUS.md:51-52, HISTORY.md:545-549, and the
  `vitest-browser-parallel-pages-stall` memory). The pinned engine string runs stock `npm test`,
  which is parallel. The runner forces that stock string, and a serialized string draws the MISMATCH.
  In the recorded state, stock `npm test` hangs with no watchdog and holds the heavy lock for hours.
  Task 0 item 7 stops only on "a stall … that a serialized rerun of the file does not clear". A
  baseline that stalls stock and passes serialized therefore proceeds, and every pinned task's gate
  hangs from task 1 on.
- Fix: say at plan:144 that the stock engine string runs the component project in parallel and the
  serialized form is diagnosis only. Change item 7 so that any stall of the stock engine string at
  baseline stops the pass with one message to Geoff, whatever a serialized rerun shows. The remedy
  is a reboot and a retest, per the memory. The alternative is a scripts change to
  `gate-tier.mjs`'s engine string before the pass, which Geoff would rule on.

### Minor

**m1. Task 0 item 6's command exits 1 in a fresh worktree.**
- Location: plan:326-328.
- Defect: `node scripts/checks/gate-tier.mjs --range HEAD..HEAD --pin engine` prints `range
  "HEAD..HEAD" carries no changed paths` and exits 1. The empty-range check runs before the pin
  (`gate-tier.mjs:226-232`). This was probed at HEAD.
- Fix: use `--range HEAD~1..HEAD --pin engine`. That form prints the plan:126 string, probed.

**m2. The spec still sequences the pass after draft docs merges, and the plan's exception clause
omits the reversal.**
- Location: plan:14-16, spec:556.
- Defect: the plan tells executors to stop on a plan/spec disagreement unless it is one of the
  "Decisions this plan takes". The reversal lives only in the Worktree paragraph (:118-121).
- Fix: add the reversal as decision 12, citing the arc log, or widen the exception clause at :15
  to "and the arc log's rulings after the spec's commit".

**m3. Task 6 is told to state ratios "from task 13's pair table rows", but task 13 runs seven
tasks later.**
- Location: plan:649-652 and :639-640.
- Defect: task 6 must measure these ratios itself. The plan names no compositing or contrast
  helper, so an implementer would hand-roll one.
- Fix: say that task 6 computes these rows' definitions itself in `BtnActiveDarkGround.test.ts`. It
  uses `resolveColor` values with `composite` and `contrastRatio` from `src/lib/audit/color.ts:30,51`.
  Task 13 then re-measures the rows on canvas.

**m4. `resolveColor` resolves in the wrapper's context, not the element's.**
- Location: plan:433-434 and :730-733.
- Defect: task 8's `alert-soft alert-info` oracle references `--alert-color`, which only
  `.alert-info` sets. Painted in the wrapper, it resolves to the fallback, so the oracle would be
  wrong.
- Fix: give `resolveColor` an optional context element to paint inside. Alternatively, state that
  task 8 substitutes the variant variable, for example `var(--color-info)`, into daisyUI's formula.

**m5. The CDP `mousePressed` needs the test frame's offset.**
- Location: plan:429-432.
- Defect: `Input.dispatchMouseEvent` coordinates are in top-level viewport space, and the test
  runs in a child frame. The cited precedent never dispatches input. The `el.matches(':active')`
  guard catches a miss, but the implementer would have to discover the fix.
- Fix: add that the press point is the element's rect offset by `window.frameElement`'s rect and
  any scale. Alternatively, restore C-M2's `userEvent.keyboard('{Space>}')` fallback, provided the
  self-test proves it reaches `:active`.

**m6. Task 7's switch color assertions name only rest and hover.**
- Location: plan:692-693.
- Defect: the Global constraint (:208-212) requires all four states. A Sonnet implementer follows
  the narrower task line.
- Fix: change the line to "at rest, hover, focus-visible, and active". Focus-visible is already
  asserted for the ring.

**m7. Task 13's order of steps omits the `RATIFIED_NORMS` edit.**
- Location: plan:970-973.
- Defect: `norms:generate` packages and then reads `RATIFIED_NORMS` from `dist` (`norms.ts:484`).
  An edit made after generating yields `ratified-drift` rows. The acceptance line at :985-986
  catches it, but only after a wasted run.
- Fix: make the first step "edit `RATIFIED_NORMS`".

**m8. Some CI checks that these tasks can trip are in no task check.**
- Location: plan:136-137 (the admin CSS set) and :929-934 (task 12).
- Defect: `check:idioms` bans pass-scoped references in `src/lib` comments. That covers "Round N",
  "Pass A", "Task N", and "design-arc D2"-style citations, which the spec's vocabulary (round 1,
  2, 4; D1; D2) invites in `cairn-admin.css`. It also checks scripts, which tasks 1 and 2 add or
  edit. `check:invisible-craft` scans `examples/showcase/src/routes/admin`, where task 12's fixture
  lands, but task 12 does not run the admin CSS set. Both run only in `test.yml`, so the first red
  surfaces at a boundary and costs a re-dispatch.
- Fix: append `npm run check:idioms` to the admin CSS set. Add the admin CSS set to task 12's task
  checks.

**m9. The "`test:component` pre-step" alternative does not cover a TDD loop.**
- Location: plan:418-420.
- Defect: the plan claims that "a TDD loop, and every mutation read a fresh" sheet. A direct `npx
  vitest run --project component <file>` bypasses an npm pre-step.
- Fix: require the project-level `globalSetup`, which vitest 4.1.11 supports.

**m10. The fold record's spot check on `IMPL_SCHEMA` is false.**
- Location: fold:13.
- Defect: `IMPL_SCHEMA` has a required `summary` field (`pass-execute.js:107-109`). The plan's
  choice of `gateOutput` for task-check lines (:132-135) still works, so no plan change is needed.
- Fix: correct the record's line so a later reader does not rely on it.
