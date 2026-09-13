# Admin Motion Language Pass Implementation Plan (the motion pass, after polish-C, before the cut)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with TWO chains, launched as ONE workflow run; see
> Execution. Steps use checkbox syntax for tracking. Every anchor is re-verified at dispatch
> against the branch HEAD, per the Reconciliation block below.

**Goal:** the admin's motion written as a language, shipped as five duration and three easing tokens
the admin sheet carries, enforced as three error-tier static `cairn-audit` rules and one advisory
rendered rule a consumer runs on its own screens with no configuration, with the two shipped
reduced-motion bugs fixed, the seventeen shipped motion declarations migrated onto the tokens, zen's
offset and chrome given the one documented exception, and the result handed to the borrowable-patterns
work as the extend track's first per-pattern recipe.

**Spec:** `docs/superpowers/specs/2026-09-13-admin-motion-language-design.md`, revision 2, whole. Its
Decisions block, "The token set", "The property allowlist", "Enter and exit, with the floor", "The
modality gate", "Reduced motion", "Responsive rules", "The case table", "The DaisyUI component-class
decision", "The migration", "The four rules", "Reconciling with the shipped rules", "The harness
additions", "CI wiring", "Deliverables", "Verification", "The changelog window", "Non-goals", "Risks",
and "Task outline" all bind. The spec's ten-task outline is this plan's skeleton, with no task added,
removed, merged, or split.

**Inputs beyond the spec:** the three research records on `main`, all revision 2:
`docs/internal/record/2026-09-13-motion-language-research.md` (cited as **language**),
`docs/internal/record/2026-09-13-motion-enforcement-research.md` (**enforcement**), and
`docs/internal/record/2026-09-13-sidebar-zen-prior-art.md` (**zen**). Where the language record's
ruleset differs from the other two, the other two win, per the spec's Inputs note. Supporting reads:
`docs/internal/admin-design-system.md`, `docs/reference/cairn-audit.md`,
`docs/internal/what-cairn-is-and-is-not.md`, and ROADMAP's Next-tier entries "A motion language for
the admin" (`ROADMAP.md:886`) and "Borrowable patterns" (`:936`).

**Task count:** ten, matching the spec's outline exactly. The ids are `1`, `2`, `3`, `4`, `6a`, `6b`,
`7`, `8`, `10`, `11`. **The retired ids 5 and 9 are never reused**, per the spec's outline, so every
number in this plan means what it meant in the spec's revision 1 numbering, and a reader comparing the
two documents is never misled.

---

## The binding decisions (Geoff, 2026-09-13)

Quoted from the spec's Decisions block. Every clause a task writes into
`docs/internal/engine-rulings.md`, the design system, or a docs page cites the spec by path and date
and quotes the decision text.

1. **Purpose:** professional-level visual polish, nothing novel, in the admin's register. Clean,
   conventional, polished, understated, professional.
2. **One reference:** IBM Carbon's productive motion set. Its duration and easing tokens ship under
   cairn names, each naming the Carbon token it aliases; its entrance and exit curve pairing and its
   distance rule are adopted. Atlassian is the tiebreaker where Carbon publishes no machine-checkable
   rule, which is reduced motion ("off and instant"). GNOME and Material are comparison data and
   govern nothing, except where the spec cites Material or Atlassian by name for a rule Carbon does
   not publish.
3. **Zen mode:** the industry default, shadcn's shape. A transition on `.drawer-content`'s
   `margin-left` at the shift token on Carbon's productive entrance curve, exiting one band faster on
   the exit curve, snapping under reduced motion. It is the one documented exception to the property
   allowlist, enforced by selector.
4. **Conform to conventions:** DaisyUI's component timings stay the vendor's own vocabulary. No
   unlayered override of the four components (`.modal`, `.drawer`, `.collapse`, `.btn`). cairn's rules
   enforce authored code. The audit treats a DaisyUI component class as a vendor contribution, checked
   for the properties it animates rather than its durations.
5. **Enforcement is the critical deliverable.** The rules ship as `cairn-audit` rules a consumer runs
   on its own custom admin screens with no configuration. Each rule is specified consumer-first. The
   audit runs over the engine's own tree first, wired through
   `scripts/checks/check-invisible-craft.mjs`'s `RULE_IDS` and `CSS_FILES`. The reduced-motion rule is
   the CSSOM delay check at advisory tier; the rendered differential is out.
6. **Borrow hand-off:** the pass writes the extend track's first per-pattern recipe page, beside the
   design system's Motion section, which the later `cairn-extend` skill routes to.
7. **Sequencing:** its own pass, after polish-C merges and before the release cut, so the cut carries
   the tokens and the rules. Single release. The pass runs unread on its reviewed plan.
8. **Task zero:** author the token set, point Tailwind's two transition defaults at it, and fix the
   two shipped bugs before any rule is specified against them.

Two escalations of 2026-09-13 came back as rulings and bind the same way. **The two
`@media (hover: hover)` guards on `.tooltip` and `.menu` are dropped**, recorded as vendor
disagreements 6 and 7, with the touch-tooltip visibility defect filed to borrow-1. **The drawer
scoping to `isPersistentSidebar` is dropped**, recorded as vendor disagreement 5. The zen offset
exception stands as decided.

---

## Token ceiling

**7.0M.** Derived per task the way this repo's polish plans derive it, with every line item named
rather than folded into a band.

| Line item | Basis | Tokens |
|---|---|---|
| Ten task chains | ten gate-bearing units at 500K each | 5.0M |
| Re-dispatch reserve | two fix rounds, each a second implementer dispatch plus a second Opus review, about 0.6 of a unit | 0.6M |
| Pass-end `visual-verifier` | chassis-B1's measured rate over a bounded capture set | 0.5M |
| Reviewer fan-out | `daisyui-a11y-reviewer` and `svelte-reviewer`, plus `code-simplifier` over the pass's commits | 0.6M |
| Conductor CI regen waits and the baseline read | the pass-end regen over up to 60 new files, plus the diff read against the `INTENDED MOVES:` declarations | 0.3M |
| **Total** | | **7.0M** |

500K per gate-bearing unit is the upper half of the risk lens's measured band for this repo, 370K to
530K over the comparable passes (conventions 4a about 530K, conformance 4b about 430K, internals about
400K, chassis-A about 367K). The upper half rather than the middle is the right pick here for two
reasons. Four of the ten tasks author a new `cairn-audit` rule with a fixture suite, which is the
widest per-task read in the repo (the rule, the shared predicates in `motion.ts`, the `CompiledSheet`
and `ClassToken` substrate, and the three existing fixture suites). And five tasks move paint, so each
carries a capture pair, a produced moved-baseline list, and a tile read inside its own chain.

The repo's recorded overrun history is four for four on the last comparable passes
(`docs/HISTORY.md`). At 80 percent of the ceiling (5.6M) the conductor finishes the task in flight,
writes STATUS, and asks one combined question.

**Checkpoint interval:** every four tasks. Checkpoints land after the main chain's fourth and eighth
completed tasks (task 4 and task 10), and the pass close is the third STATUS write. Each writes the
task ledger, the decisions taken, the spend against the ceiling, and the next task.

---

## Execution

**Workflow mode**, through `~/.claude/workflows/pass-execute-chains.js`, copied into the session
scratchpad first, because the Workflow tool refuses a `~/.claude/workflows` scriptPath. **TWO chains,
launched as ONE workflow run**, per the spec's Parallelism note.

| Chain | Tasks, in order | Worktree | Branch |
|---|---|---|---|
| A | 1, 2, 3, 4, 6a, 6b, 7, 10, 11 | `.claude/worktrees/admin-motion` | `admin-motion` |
| B | 8 | `.claude/worktrees/admin-motion-8` | `admin-motion-8` |

**Why chain B gets its own worktree on its own branch.** The pass is one branch, `admin-motion`, off
`main` after polish-C merges, and `admin-motion` is what merges at the end. The chains runner gives
each chain a repo directory and requires that each be the only writer in it, so two parallel chains
cannot share one worktree. Chain B therefore runs on `admin-motion-8`, branched from `admin-motion` at
the same commit, and the conductor merges `admin-motion-8` into `admin-motion` at the first checkpoint
(after task 4), which is well before chain A reaches task 10. Chain B is one task and runs no
end-to-end suite, so it finishes far ahead of that point.

**Tasks 3 and 4 are serialized inside chain A, and the reason is stated rather than implied.** Both
register a rule in `src/lib/audit/rules/static/index.ts`. The spec's revision 1 claimed they shared no
files and the adversarial review corrected it. Parallel worktrees would collide on the registry every
time, so one chain owns 2, then 3, then 4, in that order.

**Task 8 shares no file with any chain-A task.** Its subjects are `src/lib/audit/rendered/types.ts`,
`rendered.ts`, `rendered/page-surface.ts`, the rendered rule and the rendered registry, its own test
files, and `.github/workflows/`. Chain A touches none of those. The spec lists task 10 as depending on
task 8; the dependency is the merge order rather than the code, since task 10 wires the three **static**
ids and the rendered rule's own CI step is task 8's deliverable. If chain B has not reported done when
chain A reaches task 10, task 10 proceeds and the merge happens at the pass-end ritual instead.

**The pass runs unread on this reviewed plan** (Geoff, 2026-09-13). No mid-pass check-in. The single
human gate was this plan's approval.

### Pre-dispatch, before the run

All six are preconditions rather than task steps, and none is true at plan authoring.

1. Confirm polish-C has merged to `main` and CI on `main` is green. This pass branches off post-C
   `main`, per decision 7.
2. Commit this plan onto `admin-motion` at `docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md`.
   The runner's implement prompt names the plan as committed in the repo and orders a first read of
   its Global constraints, Ruled inputs, and Task section; an untracked plan means ten dispatches that
   cannot follow instruction one.
3. Create the worktree `.claude/worktrees/admin-motion` on `admin-motion` off post-C `main`, then
   `.claude/worktrees/admin-motion-8` on `admin-motion-8` off the same commit.
4. Run a from-scratch `npm install` in **each** worktree's `examples/showcase`. A worktree's
   `examples/showcase/node_modules` symlinks back to the main checkout and resolves both `file:` deps
   to `main`'s build, so without the reinstall the e2e and the showcase checks prove `main`'s engine
   rather than this branch's.
5. Write the pass's slice number into `docs/STATUS.md` in the same commit as the plan. The conductor
   owns `docs/STATUS.md`; no task edits it.
6. **Arm the unattended-work guards.** Ten gate-bearing tasks, five of them carrying the showcase
   e2e, is long unattended work by the workstation rule. Arm the runaway transcript watcher and, on
   battery, `systemd-inhibit --what=sleep` plus the battery watchdog, per
   `~/.claude/docs/unattended-work-guards.md`, which is read before either is armed.

Open the PR after task 1's commit.

---

## Reconciliation at dispatch

**Every `file:line` the spec cites is re-verified at dispatch against the branch HEAD, never against
this plan's table and never against the branch point.** Two forces move the anchors. **Polish-C merges
between this plan's authoring and this pass's branch**, and it is a rename-and-removal window that
reopens files this pass edits. And this pass moves its own anchors: task 1 inserts declarations at the
top of `cairn-admin.css` and into its reduced-motion block, task 6a rewrites lines throughout seven
components, and task 6b and task 7 both edit `CairnAdminShell.svelte` and `cairn-admin.css` after 6a
has already moved them. Tasks 6a, 6b, 7, 10, and 11 are therefore tasks whose anchors a predecessor
inside this same pass has already moved, and each re-measures.

### Anchors polish-C is known to move

Read from `docs/superpowers/plans/2026-09-08-polish-c-pass.md`'s task list. Each row names the polish-C
task that moves it and the motion task that reads it.

| Anchor | What polish-C does | Which motion task cares | How to relocate |
|---|---|---|---|
| `src/lib/reproductions/manifest.ts:298-304` (the `toolkit/custom-screen` row) | **Task 12 deletes it** with the `OfficeList` removal | Task 10 adds the zen toggle as a motion case | Read the array whole. Do not reuse a line number |
| `src/tests/unit/reproductions-manifest.test.ts:13`, `:16`, `:41`, `:77` (the frozen id list, its comment, and its `it(...)` title) | **Task 12 removes `'toolkit/custom-screen'` at `:41` and rewrites the count** in the `:13` comment and the `:77` title | Task 10 adds one id back | **The frozen count is 25 today, 24 after polish-C, and 25 again after task 10.** Task 10 reads the file's own current count and never assumes 25 |
| `src/lib/admin-toolkit/OfficeList.svelte` | **Task 12 deletes it** | Tasks 3, 4, and 10, since `src/lib/admin-toolkit` is in both `DEFAULT_STATIC_SCOPE` and the gate's `SCAN_SCOPE` | The rules run over whatever the directory holds at dispatch. No task pins a file count in that tree |
| `src/lib/components/LoginPage.svelte`, `ConfirmPage.svelte` | **Task 8 renames the outcome types** and edits the branch sites | Task 6a reads both as case-table rows ("Login and confirm pages, no motion of their own") | Re-verify the "no motion" reading by grep for `transition` and `animate-` in both files, rather than trusting the case table's dash |
| `src/lib/audit/rules/rendered/viewport-overflow.ts:20`, `weight-budget.ts:58` | **Task 12 rewrites two rule comments** naming `OfficeList` | Task 8 edits `src/lib/audit/rules/rendered/index.ts` | Neither file is task 8's. The row records the adjacency as checked |
| `docs/internal/admin-design-system.md` | **Tasks 1 and 12 rewrite passages**, including the F3-rhythm bullet near `:477-480`; polish-11b-i already inserted a busy recipe above it | Task 11 adds the Motion section | Locate by section heading and quoted phrase. Never by line |
| `docs/internal/engine-rulings.md` | **Task 13 annotates every row whose subject the window renames** and supersedes `audit-admin-officelist` with a new full-format row | Task 11 writes new rows | Place by reading the file's own ordering. Never by a line number from this plan |
| `docs/extend/add-a-custom-admin-screen.md` and `docs/extend/README.md` | **Task 1 rebuilds the custom-screen example**; task 14 reconciles the consumer list | Task 11 adds `docs/extend/animate-a-custom-screen.md` to the index | Read `docs/extend/README.md`'s index whole and insert in its own ordering |
| `CHANGELOG.md`'s `## Unreleased` block | **Task 14 reconciles the whole window** and task 15 derives release readiness | Every task appends beneath it | This pass appends beneath whatever polish-C left and reconciles nothing above its own entries |
| `ROADMAP.md` | **Task 15 closes polish's items** | Task 11 closes "A motion language for the admin" and files the follow-ups | Re-read the Next tier whole. The motion entry is at `:886` today and will have moved |
| `docs/reference/cairn-audit.md:66` ("Twelve rules run, all error tier") and `:24-25` ("All 28 registered rules") | **Not touched by polish-C.** Task 14's `docs/reference/*` sweep covers renamed exports, and a rule id is not an export | Task 11 rewrites both counts | Verified present today at `:66` and `:25`. Re-measure anyway |
| The gate string | **Unchanged.** Polish-C's derived string is byte-identical to polish-11b-i's | Every task | Re-derive from the committed `.github/workflows/` at the branch point before the first dispatch |

### The spec's own anchors, measured on `main` at `39bc75eb`

Spot-measured at plan authoring. Every one is re-verified at dispatch.

| Spec anchor | Measured | Note |
|---|---|---|
| `cairn-admin.css:1115` (the blanket reduced-motion block) | `@media (prefers-reduced-motion: reduce) {` at `:1115`, with the theme-root selectors at `:1116-1117` | Confirmed. Task 1 adds the two delay declarations inside it |
| `cairn-admin.css:1002` (the shipped modality-gate model) | `@media (hover: hover) {` at `:1002`, with the rationale comment above it | Confirmed. Rule 3's fix message cites it |
| `cairn-admin.css:545` (`.cairn-caret`) | `transition: rotate 150ms ease;` at `:545`, inside a `:where()` theme-root selector at `:544` | Confirmed. Task 6a moves it onto tokens; task 2's floor clause is what stops `reduced-motion` firing on it |
| `cairn-admin.css:754` (the guarded-button rule) | The `.btn.cairn-btn-guarded[aria-disabled='true']` selector at `:754` | Confirmed. A pinned unlayered rule, read by task 6a |
| `scripts/checks/check-invisible-craft.mjs` `RULE_IDS`, `SCAN_SCOPE`, `CSS_FILES` | `RULE_IDS = ['gap-scale', 'token-colors', 'motion-band']` at `:39`; `SCAN_SCOPE` five roots at `:41-47`; `CSS_FILES = ['examples/showcase/src/theme/theme.css']` at `:56` | Confirmed. Task 10's three additions land here |
| `scripts/checks/custom-surface-budget.json` `componentsLayerCap` | `19` at `:27` | Confirmed. Task 6b's one `@layer components` rule counts against it and the headroom is real |
| `examples/showcase/e2e/admin-visual.spec.ts:7` (`SIGNUPS_WIDTHS`) | `const SIGNUPS_WIDTHS = [320, 390, 768, 1440, 2560];` at `:7` | Confirmed. Task 10 adds six surfaces across the same bar |
| `examples/showcase/scripts/capture-surfaces.mjs` `WIDTHS`, `SCHEMES`, `SURFACES` | `WIDTHS = [320, 390, 768, 1440, 2560]` at `:39`, `SCHEMES = ['light', 'dark']` at `:40`, `const SURFACES` at `:60` | Confirmed. The matrix is `home`, `article`, `styleguide`, `archive2`, `error404`, `signups`. Locate `SURFACES` by grep, since chassis-B2 already landed an addition above it |
| The static rule registry | `src/lib/audit/rules/static/index.ts`, 34 lines, sixteen rule modules beside it | Confirmed. Tasks 3 and 4 both write here |
| The rendered rule registry | `src/lib/audit/rules/rendered/index.ts`, seventeen rule modules beside it | Confirmed. Task 8 writes here |
| `src/tests/unit/admin-sheet-inventory.test.ts` and `admin-css-build.test.ts` | Both exist | Confirmed. Tasks 1, 6b, and 10 read or extend them |

### Claims this plan states rather than leaving an implementer to guess

- **The rendered rule id is `motion-reduced-delay`, never `reduced-motion`.** `reduced-motion` is a
  static rule id, there is no duplicate-id guard across the two registries, and `suppress.ts` resolves
  directives by id. The repo already ships one duplicated id, `list-role`, in both
  `rules/static/list-role.ts` and `rules/rendered/list-role.ts`, so the hazard is known rather than
  hypothetical.
- **The `no-preference` fix is task 1's, not task 2's.** It is the second of the two shipped bugs
  decision 8 names, and it must land before any rule is specified against the predicate. Moving the
  existing `reduced-motion` fixtures is part of that fix rather than task 2's re-baseline.
- **`cairn-admin.css:545`'s false positive is resolved before `CSS_FILES` gains the file.** Task 2
  adds the floor clause; task 10 adds the file. The order is not an accident and a halt between them
  leaves the gate green, since the file is not yet scanned.
- **`isMotionProperty`'s widening re-baselines two shipped rules.** `motion.ts:6`'s `MOTION_PROPERTY`
  matches `transition|transition-duration|animation|animation-duration` today. Widening it makes
  `reduced-motion` start convicting rules that declare only a timing function, and changes what
  `motion-band` sees. The re-baselining is task 2's work rather than a side effect.
- **The `custom-surface-budget.json` unlayered allowlist does not grow.** No task adds an entry. Task
  6a's acceptance criterion states the absence, which is the test that the task stayed inside both
  2026-09-13 rulings. Task 6b's one new rule sits inside `@layer components` on a cairn-owned class,
  which costs no unlayered entry and counts against `componentsLayerCap`.
- **`check:surface` stays byte-identical.** The pass changes no public export. No task runs
  `check-surface.mjs --update`, and `docs/internal/api-surface.md` is in no task's diff.
- **The `--cairn-dur-*` and `--cairn-ease-*` namespace has no export gate behind it.**
  `check:public-tokens` reads only the showcase's public theme files and would never see an admin
  token. What holds the namespace is `src/tests/unit/admin-sheet-inventory.test.ts`, and task 1 owns
  that assertion.
- **No task dispatches a subagent.** `cairn-implementer` carries Read, Write, Edit, Bash, Grep and
  Glob and no Agent tool, so a step ordering a reviewer dispatch can only halt the chain, be skipped
  silently, or produce fabricated evidence. Every reviewer runs at the pass-end fan-out, and no
  acceptance criterion names a reviewer's report. Acceptance is tests, greps, counts, and the diff.
- **The conductor writes `docs/STATUS.md`, never a task.**

---

## Ruled inputs (recorded; no task re-derives them)

- **The token set is fixed at five durations and three curves.** `--cairn-dur-instant` 70ms
  (`duration-fast-01`), `--cairn-dur-quick` 110ms (`duration-fast-02`), `--cairn-dur-base` 150ms
  (`duration-moderate-01`), `--cairn-dur-shift` 240ms (`duration-moderate-02`), `--cairn-dur-settle`
  400ms (`duration-slow-01`); `--cairn-ease-standard` `cubic-bezier(0.2, 0, 0.38, 0.9)`,
  `--cairn-ease-entrance` `cubic-bezier(0, 0, 0.38, 0.9)`, `--cairn-ease-exit`
  `cubic-bezier(0.2, 0, 1, 0.9)`. A component that needs a sixth duration or a fourth curve is wrong.
  Carbon's `duration-slow-02` (700ms) is deliberately not aliased, and Carbon's expressive set is out
  of register.
- **The band ladder is instant, quick, base, shift, settle**, used by the exit rule. An exit runs one
  band faster than its enter and uses the exit curve. `instant` is the floor and changes only its
  curve. Asymmetry never applies to hover, press, or focus.
- **The property allowlist is closed:** `opacity`, `color`, `background-color`, `border-color`,
  `box-shadow`, `outline-color`, `outline-width`, `outline-offset`, `rotate`, `translate`, `scale`,
  `transform`, `grid-template-rows`. Nine properties are named errors: `width`, `height`, `top`,
  `left`, `right`, `bottom`, `margin` and its longhands, `padding` and its longhands, `font-size`.
  Anything neither allowlisted nor named still fails, as outside the language, with a different
  message.
- **`transition: all` has one owner, `motion-band`.** Rule 1 does not re-report it, so one construct
  produces one finding under one id.
- **The one exception is keyed on the pair**, the engine-owned file
  (`src/lib/components/CairnAdminShell.svelte`, or its `dist` equivalent) plus the `.drawer-content`
  selector plus `margin-left`. Keying on the selector alone would hand the licence to any consumer
  element named `.drawer-content`, which is DaisyUI's own class name.
- **No paint opts back in under reduced motion this pass.** The permission stands for a consumer;
  cairn takes none of it, because `check-custom-surface.mjs:158` compares the unlayered rule list to
  the allowlist by length, so nine restatements would cost nine allowlist entries in a budget whose
  stated direction is zero. Every "Opts back in" cell in the case table reads "Snaps to the new paint".
- **The seven vendor disagreements are recorded rather than fixed** (decision 4): `.btn` press timing,
  `.modal` timing and its `scale: .98`, `.drawer` overlay timing, `.collapse`'s `transition-property:
  all`, `.drawer` at the breakpoint flip, `.tooltip`'s ungated `:hover`, and `.menu`'s ungated
  `:hover`. The `.modal-box` scale override is declined, with `modal-bottom` adoption as its reopen
  trigger.
- **Three new behaviors only**, and nowhere else: the zen offset, the dropzone's drag-over paint
  state, and the resize stopper's suppression class. Every other transition the pass touches is a
  migration of a declaration that ships today.
- **The theme-change cross-fade is cut to a dash.** Adding one is new motion the scope bound refuses.
  The showcase's public theme ships the pattern a later pass would port.
- **Release:** ONE cut, after this pass merges. This pass does not bump `package.json`, does not tag,
  and does not publish. It appends to `## Unreleased` and stops. The conductor cuts through
  `cairn-release` after the merge.

---

## Global constraints

These bind every task. An implementer reads them before its Files block.

1. **The em dash is banned** in every code comment and every doc this pass writes.
   `house/no-em-dash-in-comments` enforces it on `src/lib` and the showcase under `check:comments`; in
   prose it is a review finding.
2. **No process citations in shipped comments.** A comment states the contract and the reason. It does
   not name a pass, a plan, a ruling id, or a task number. Ledger rows and changelog entries carry that
   record, and the ledger's own `- **Note (<pass>, Task N):**` amendment line is the one place a pass
   name belongs.
3. **The gate is CI-derived, not remembered.** The exact strings are under "## Gate". A task is not
   done until its string exits 0 in its worktree, run through `cairn-run-gate`.
4. **One end-to-end slot per machine.** `examples/showcase/playwright.config.ts` pins port 4173 with
   `reuseExistingServer: !process.env.CI`, so two `CI=1` runs cannot coexist. Chain B runs no
   end-to-end suite, which is what makes the two chains safe to run in parallel on one machine. Never
   run this pass's e2e beside another pass's.
5. **`check:surface` output is byte-identical.** `docs/internal/api-surface.md` is not regenerated and
   not committed by any task. A fix that needs a new prop, a new export, or a changed signature on a
   published symbol is out of scope, and the task reports it rather than taking it.
6. **The public site surface does not move.** No task changes a file
   `examples/showcase/e2e/site-visual.spec.ts` renders. `git status` showing any file changed under
   `examples/showcase/e2e/site-visual.spec.ts-snapshots/` is a blocking finding in every task.
7. **TSDoc governs every comment.** Document the contract and the reason, never the type the signature
   already states, and never a paraphrase of the symbol name. An exported symbol keeps its minimal
   one-line doc, because `check:reference` and `jsdoc/require-jsdoc` want one. Svelte `<script>`
   comments follow the same standard with the `@component` convention for the component block.
   `eslint.config.js` globs `src/lib/components/**/*.svelte` with `tsdoc/syntax` at error, so a
   malformed code span or an unescaped brace in a comment this pass writes fails `check:comments`.
8. **Commits.** Imperative mood, Conventional Commits, specific files rather than `git add -A`. The
   footer is exactly these two lines, and no other:

   ```
   Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_01UQgai6kCsj79ubY2HzikXD
   ```

   One commit per Commit boundary named in a task. A task that adds a test file commits that file,
   which is why every test-bearing task names its test path in its Files block.
9. **Each task appends its own `CHANGELOG.md` line under `## Unreleased`.** The six
   `Consumers must:` lines are assigned to tasks under "## The changelog window" below, and no task
   writes a `Consumers must:` line the table does not assign to it.
10. **A ruling row this pass writes carries the full block.** `Verdict`, `Reopens on`, `Shape`,
    `Record`, `Verified`, under a heading in the ledger's own form
    `## <slug>: <Title>  (<verdict>, <date>, <source>)`, because `check-rulings-format.mjs` parses
    headings as `/^## ([a-z0-9-]+):/` and never sees a bare-slug heading at all. Task 11 is the one
    task that writes rows.
11. **The conductor writes `docs/STATUS.md`.** No task edits it.
12. **The paint protocol** rides once in the runner's `paintProtocol` field and is reproduced under
    "## The paint protocol" below. Which branch each task takes is ruled in that section's table, so
    no implementer judges it.
13. **Which paint branch a task takes follows capture REACH.** `capture-surfaces.mjs`'s matrix is
    `home`, `article`, `styleguide`, `archive2`, `error404`, `signups`, and `signups` is the one admin
    route in it. `CairnAdminShell` wraps `/admin/signups` and `cairn-admin.css` styles it, so **a task
    that changes `CairnAdminShell.svelte` or `cairn-admin.css` takes the capture-pair branch**, even
    when its change is expected to be paint-neutral, because the pair is what proves the neutrality. A
    task that touches only admin screens the capture tool cannot reach captures nothing, and its
    evidence is the produced `MOVED BASELINES:` list plus the regenerated `-linux.png` files. A task
    that touches no rendered file captures nothing and proves it by `git status`.
14. **Local and CI renders.** Every paint task regenerates its moved baselines locally by file path
    and then passes a local `CI=1` e2e in the same gate, while the repo's standing rule is that CI is
    the canonical renderer. If a pulled CI baseline fails locally on a surface the task never touched,
    that is a renderer difference rather than a finding: report it under `MOVED BASELINES:` with the
    note, do not regenerate it, and let the pass-end conductor regen settle it.
15. **The gate builds the package twice on a paint task, not once.** `npm run package` runs at the
    head of the string, and the string's last command is
    `CI=1 npm --prefix examples/showcase run test:e2e`, whose `pretest:e2e` is
    `npm --prefix ../.. run package`. The second build is what makes the e2e prove this tree. The
    dependent checks in between are invoked at their node entry points against the first build, so no
    task re-runs `npm run package` between them.
16. **The inner test loop is scoped to the blast radius; the gate is not.** A task's test-first loop
    runs only its own target file, with `npx vitest run <path>` from the worktree root. The full gate
    string runs once, at the end of the task, and it is never trimmed.

---

## The paint protocol

Adopted verbatim from polish-11b-i, with the cache path, the pass name, and the manifest heading
replaced by this pass's. It rides once in the runner's `paintProtocol` field, which the runner appends
to every implement and review prompt.

> Capture directories are pinned: the PASS before set at `~/.cache/cairn-admin-motion/pass/before/`
> (it exists only if some task captured one, so a paint task captures its own before set at its
> parent commit); this task's before set at `~/.cache/cairn-admin-motion/task-<N>/before/` captured at
> the START of the task on the clean worktree at the task's parent commit with
> `node examples/showcase/scripts/capture-surfaces.mjs --out <dir>` (symlink the pass set if no
> predecessor moved paint, and say so) and its after set at
> `~/.cache/cairn-admin-motion/task-<N>/after/`; every directory is write-once (the tool refuses a
> non-empty target; report a collision). Images are TILES: the capture tool writes
> `full/<surface>-<scheme>-<width>.png` and `tiles/<surface>-<scheme>-<width>-<nn>.png` (bands of at
> most 1400 CSS px with a 60 px overlap) plus `manifest.json`; a grader reads tiles or named crops,
> never a full-page file. The intended-moves manifest is the committed file
> `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`: append this task's
> rows under the `## Admin motion` heading in the same commit as its change (surface, width, scheme,
> what moves, why, the baseline names it moves); a task that moves a baseline without appending its
> row is a blocking finding. The moved-baseline list is PRODUCED, not asserted: before any
> regeneration run the visual suites unmodified
> (`CI=1 npx playwright test e2e/admin-visual.spec.ts`, inside `examples/showcase`) and paste the
> exact FAILING snapshot names under `MOVED BASELINES:`; for surfaces not yet baselined use
> `magick compare -metric AE before.png after.png null:` per tile as `TILE DIFF:`. Regenerate moved
> baselines locally with the mode pinned,
> `CI=1 npx playwright test e2e/admin-visual.spec.ts --update-snapshots=changed`, by FILE PATH. An
> empty produced list is a result, not a defect: a task that expected a mover and produced none
> reports `INTENDED MOVES: none` with the reason, rather than declaring a mover the suite does not
> see. The implementer summary carries verbatim and in order: `CAPTURES:` / `INTENDED MOVES:` (one
> `surface width scheme: what moves` per line) / `MOVED BASELINES:` / `TILE DIFF:` / `READ ME:` (at
> most twelve tile or crop paths). REVIEWER: read the tiles or crops named in the report's `READ ME:`
> line (at most twelve) and verify the report's `INTENDED MOVES:` list equals its `MOVED BASELINES:`
> list name for name; a name in one and not the other is blocking; a baseline moved with no manifest
> row is blocking; name each tile you read. A paint-neutral task that touches a rendered surface
> proves it at the floor-free level: every baseline unchanged AND `magick compare` AE = 0 for every
> before/after tile of every touched surface, reported per tile. A task that touches NO rendered
> surface captures nothing and requires no capture: its proof is that `git status` shows no file
> changed under `examples/showcase/e2e/*.spec.ts-snapshots/`, reported as
> `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`, and the gate's own
> `CI=1 npm --prefix examples/showcase run test:e2e` is the confirming run.
> STOP-AND-REPORT: a baseline that moves for a change the report does not enumerate.

**A note this pass adds to the protocol, because it is the first pass to create new baselines in
bulk.** Task 10 adds six surfaces the suite has never rendered, so up to 60 baseline files come into
existence with no before to compare against. A brand-new baseline carries no `TILE DIFF:` row, because
there is nothing to diff; it is declared under `INTENDED MOVES:` as a new surface with its count, and
it is read by the pass-end `visual-verifier` rather than by a diff.

**Which branch each task takes, ruled here by capture reach.**

| Task | Subject | Branch | Capture surfaces and widths |
|---|---|---|---|
| 1 | `admin-css.input.css`, `cairn-admin.css`, `motion.ts`, three unit suites | **Capture pair.** The sheet styles `signups` | All six surfaces, both schemes, 320 / 390 / 768 / 1440 / 2560. The theme-default curve change repaints no resting frame, so AE 0 on all six is the expected leak proof |
| 2 | three audit rule modules and their fixture suites | No rendered surface. `git status` is the proof | none |
| 3 | two new audit rule modules, the static registry, two fixture suites | No rendered surface | none |
| 4 | one new audit rule module, the static registry, one fixture suite | No rendered surface | none |
| 6a | seven admin components plus `cairn-admin.css` | **Capture pair.** The shell and the sheet both reach `signups` | All six surfaces, both schemes, the five-viewport bar. `signups` is the surface that can genuinely move; the other five are the leak proof |
| 6b | `MediaHeroField.svelte`, `CairnAdminShell.svelte`, `cairn-admin.css` | **Capture pair**, same reach | All six surfaces, both schemes, the five-viewport bar. Both new behaviors are state-triggered, so AE 0 at rest is the expected result |
| 7 | `CairnAdminShell.svelte`, `EditPage.svelte`, `cairn-admin.css` | **Capture pair**, same reach | All six surfaces, both schemes, the five-viewport bar. Zen is not a resting state on `signups`, so AE 0 at rest is the expected result |
| 8 | rendered harness, one rendered rule, `.github/workflows/` | No rendered surface | none |
| 10 | `check-invisible-craft.mjs`, `audit-gate.mjs`, `admin-visual.spec.ts`, the reproduction manifest and its test | **Capture pair.** `manifest.ts` feeds the reproductions the `styleguide` surface renders | All six surfaces, both schemes, the five-viewport bar, plus the six NEW admin surfaces at 320 / 390 / 768 / 1440 / 2560 in both schemes, which are new baselines rather than moved ones |
| 11 | docs and records | No rendered surface | none |

---

## Task 1: The token set, the theme defaults, and the two shipped bugs

**Chain:** A, first. **Paint:** yes. **Depends on:** nothing. **Independent.**

**Deliverables: four.** The eight tokens on both theme roots with the two Tailwind theme defaults
pointed at them, the reduced-motion block's two delay declarations, the `no-preference` guard fix with
its fixture move, and the two built-sheet proofs.

**Files (6):**
- Modify: `scripts/build/admin-css.input.css` (the token authoring site and the two theme defaults),
  `src/lib/components/cairn-admin.css` (the blanket reduced-motion block near `:1115`),
  `src/lib/audit/rules/static/motion.ts` (`isReducedMotionGuarded`), `CHANGELOG.md`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`
- Test: `src/tests/unit/admin-css-build.test.ts`, `src/tests/unit/admin-sheet-inventory.test.ts`,
  `src/tests/unit/audit/rules/reduced-motion.test.ts`

**Interfaces:**
- Produces: the `--cairn-dur-instant` / `-quick` / `-base` / `-shift` / `-settle` and
  `--cairn-ease-standard` / `-entrance` / `-exit` custom properties on both admin theme roots, which
  every later task writes; and `isReducedMotionGuarded` with `(prefers-reduced-motion: no-preference)`
  no longer counted as a guard, which tasks 2, 3, and 4 build against.
- Consumes: nothing.
- Unchanged: `check:surface`, every package export.

**Decisions the plan makes:**
- The eight values are the spec's table, read from `@carbon/motion` 11.52.0. No value is re-derived
  and no sixth duration or fourth curve is authored.
- `--default-transition-duration` is set to `var(--cairn-dur-base)` and
  `--default-transition-timing-function` to `var(--cairn-ease-standard)` on the admin root. The
  duration half is a rename, since today's default is `.15s`, which is already Carbon's
  `duration-moderate-01`. The easing half is a real change and is the pass's largest visual delta.
- The reduced-motion block keeps its `0.01ms` idiom rather than `0s`, so `transitionend` still fires.
  The two new declarations are delays, at `0s !important`, and they join the block's existing
  declarations rather than opening a second block.
- `isReducedMotionGuarded` stops treating `(prefers-reduced-motion: no-preference)` as a guard.
  `motion.ts:15` tests `/prefers-reduced-motion/` today, which matches the inverse gate. The fix
  changes what the shipped `reduced-motion` fixtures assert, so moving those fixtures is part of this
  fix rather than task 2's re-baseline.
- **Two claims the spec marks as reasoning are proved here rather than asserted.** First, that a
  restatement inside the reduced guard beats the blanket block by source order: the floor's selector
  `[data-theme='cairn-admin'] *` is (0,1,0), a class selector is also (0,1,0), both carry
  `!important`, so the specificities tie and source order decides. The proof is an assertion over the
  built sheet, per this workstation's Tailwind v4 layer-order rule. Second, that the chosen Tailwind
  duration authoring form compiles to a `var(--cairn-dur-*)` reference in the sheet rather than to a
  literal. If the second proof fails, the task reports the authoring form it measured and stops rather
  than inventing a form, because task 4's vocabulary rule is specified against it.

**Steps:**
- [ ] **Step 1:** capture this task's before set per the paint protocol, at the task's parent commit.
  This task takes the capture-pair branch.
- [ ] **Step 2: the failing assertions first, in `admin-sheet-inventory.test.ts`.** Assert that the
  built sheet declares all eight token names with their exact values on both admin theme roots, and
  that the reduced-motion block declares `transition-delay: 0s !important` and
  `animation-delay: 0s !important`. Run the file and watch both fail with the tokens absent and the
  delays absent.
- [ ] **Step 3:** author the eight tokens in `scripts/build/admin-css.input.css` on both theme roots
  and point `--default-transition-duration` and `--default-transition-timing-function` at
  `var(--cairn-dur-base)` and `var(--cairn-ease-standard)`. Rebuild and watch the token assertion pass.
- [ ] **Step 4:** add the two delay declarations to the blanket block at `cairn-admin.css`'s
  reduced-motion `@media`. Rebuild and watch the delay assertion pass.
- [ ] **Step 5: the failing assertion for the source-order proof.** Add an `admin-css-build.test.ts`
  assertion that a class-bearing restatement placed after the blanket block inside the same
  `@media (prefers-reduced-motion: reduce)` guard appears later in the built sheet than the blanket
  block's own rule, and an assertion that the chosen Tailwind duration authoring form compiles to a
  `var(--cairn-dur-` reference rather than to a millisecond literal. Watch them fail, then make them
  pass, and report the exact authoring form measured.
- [ ] **Step 6: the failing assertion for the guard fix.** In `reduced-motion.test.ts`, assert that a
  rule declaring motion inside `(prefers-reduced-motion: no-preference)` is NOT treated as guarded.
  Watch it fail. Then narrow `isReducedMotionGuarded` in `motion.ts` so only the `reduce` form counts,
  and move the existing fixtures that depended on the old reading.
- [ ] **Step 7:** capture the after set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` (the expected declaration is none, since a resting
  frame carries no curve), regenerate any moved baseline locally by file path, and append the manifest
  rows under `## Admin motion`. Report `TILE DIFF:` per captured surface. Append the two
  `CHANGELOG.md` lines this task owns. The full gate through `cairn-run-gate`. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/admin-sheet-inventory.test.ts` passes, and the file asserts **all
  eight** token names with their exact values on both theme roots.
- `grep -c "cairn-dur-\|cairn-ease-" src/tests/unit/admin-sheet-inventory.test.ts` returns at least 8.
- The built sheet's reduced-motion block declares both `transition-delay: 0s !important` and
  `animation-delay: 0s !important`, asserted in `admin-sheet-inventory.test.ts` by name.
- `npx vitest run src/tests/unit/admin-css-build.test.ts` passes, with one assertion proving the
  source-order relationship and one proving the Tailwind duration authoring form compiles to a token
  reference. The report names the authoring form verbatim.
- `src/lib/audit/rules/static/motion.ts` no longer matches `(prefers-reduced-motion: no-preference)`
  as a guard, verifiable in the diff, and
  `npx vitest run src/tests/unit/audit/rules/reduced-motion.test.ts` passes with the moved fixtures.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `docs/internal/api-surface.md` and `docs/STATUS.md` are not in the diff.
- `CAPTURES:` names all six surfaces in both schemes at the five widths;
  `INTENDED MOVES:`/`MOVED BASELINES:` agree name for name; `TILE DIFF:` is reported per tile.

**Notes: the pre-flight checklist.** Run it before the gate, and re-emit the report block after any
fix.
- No comment claims what its assertion does not prove. The source-order comment states what the test
  measured in the built sheet, never what specificity "should" do.
- The labeled report block is emitted verbatim and in order: `CAPTURES:` / `INTENDED MOVES:` /
  `MOVED BASELINES:` / `TILE DIFF:` / `READ ME:`.
- No process citations in shipped comments. No pass name, plan name, ruling id, or task number.
- Counts found, changed, deferred: report the number of token declarations found in the input sheet
  before the change, the number added, and any deferred.
- Re-emit the whole report block before the gate.

**Gate:** the FULL string under "## Gate", run as `cairn-run-gate '<full string>'`.

**Commit:** one, `feat(admin): ship the motion token set and fix the two reduced-motion bugs`.

---

## Task 2: The shipped-rule reconciliation

**Chain:** A, second. **Paint:** no. **Depends on:** task 1.

**Deliverables: four.** `isMotionProperty` widened, `motion-band` repointed with its new band and its
sole ownership of `transition: all`, `reduced-motion`'s floor clause scoped to what the floor zeroes,
and all three suites re-baselined against the widened predicate.

**Files (6):**
- Modify: `src/lib/audit/rules/static/motion.ts`, `src/lib/audit/rules/static/motion-band.ts`,
  `src/lib/audit/rules/static/reduced-motion.ts`, `CHANGELOG.md`
- Test: `src/tests/unit/audit/rules/motion-band.test.ts`,
  `src/tests/unit/audit/rules/reduced-motion.test.ts`

**Interfaces:**
- Consumes: task 1's narrowed `isReducedMotionGuarded`.
- Produces: a widened `isMotionProperty` covering `transition-property`,
  `transition-timing-function`, `transition-delay`, `animation-delay`, and
  `animation-timing-function` beside the four it matches today, which tasks 3 and 4 read; and
  `motion-band` as the one owner of `transition: all` and `transition-all`, which task 3's rule 1
  defers to.
- Unchanged: every rule id. No id is retired, added, or renamed by this task.

**Decisions the plan makes:**
- **`motion-band` is repointed, never retired.** Retiring the id would turn every consumer's
  co-located `cairn-audit-disable-next-line motion-band` directive into a hard failure on upgrade,
  because `suppress.ts:201-206` reports a directive that silences nothing as a dead suppression at
  error tier, which cannot itself be suppressed. The revision-1 evidence for retiring it (a showcase
  carousel directive) does not exist in the tree.
- The band widens from 150ms-to-250ms to **70ms to 400ms**, the span of the five token values, so a
  literal that rule 2 abstains on still gets a band check.
- `motion-band`'s fix message takes on the `@starting-style` clause: for `transition-all` on an
  element whose entrance is a `@starting-style`, the remedy is a named property list, never deleting
  the transition, because deleting the transition deletes the entrance.
- **`reduced-motion`'s floor clause carries two conditions, and the reason for the narrowing is
  stated.** A clause that discharged the whole file the moment a floor rule exists would make
  `reduced-motion` vacuous over `cairn-admin.css`, the engine's largest CSS file. So the floor's own
  selector must match the rule's selector, and the floor must declare the motion property the rule
  declares. A rule declaring only `transition-timing-function`, which the widened predicate now sees,
  is **not** discharged, because the floor does not zero it. The file-scoped matching
  (`guardedByFile`) is unchanged.
- The re-baselining is the work rather than the predicate change. Each of the three suites is read
  whole and every changed expectation is accounted for in the report's counts.

**Steps:**
- [ ] **Step 1: the failing assertions first.** In `reduced-motion.test.ts`, assert that a rule whose
  selector the blanket floor matches and whose declared property the floor zeroes produces NO finding,
  and that a rule declaring only `transition-timing-function` under the same floor DOES produce one.
  In `motion-band.test.ts`, assert that a 400ms literal passes the band, a 500ms literal fails it, and
  a `transition: all` declaration produces exactly one finding under `motion-band` whose message names
  the `@starting-style` remedy. Run both files and watch each new assertion fail.
- [ ] **Step 2:** widen `MOTION_PROPERTY` in `motion.ts` to the nine properties named in the
  Interfaces block. Run both suites and record every expectation that changed.
- [ ] **Step 3:** widen `motion-band`'s band to 70ms to 400ms and add the `@starting-style` clause to
  its fix message. Make `motion-band` the one owner of `transition: all` and `transition-all`,
  explicitly, so task 3's rule can defer to it by name.
- [ ] **Step 4:** add `reduced-motion`'s two-condition floor clause. Verify by fixture that
  `.cairn-caret`'s declaration under the blanket floor no longer fires, which is the shipped false
  positive task 10's `CSS_FILES` addition would otherwise expose.
- [ ] **Step 5:** re-baseline all three suites against the widened predicate and report counts found,
  changed, deferred. Append the `CHANGELOG.md` line this task owns. The check-plus-unit gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/audit/rules/motion-band.test.ts src/tests/unit/audit/rules/reduced-motion.test.ts`
  passes, with the five new assertions from Step 1 present by name.
- `grep -n "MOTION_PROPERTY" src/lib/audit/rules/static/motion.ts` shows a pattern matching all nine
  properties, verifiable in the diff.
- A `transition: all` fixture produces **exactly one** finding, under the id `motion-band`, and its
  message contains the string `@starting-style`.
- A fixture declaring only `transition-timing-function` under the blanket floor produces a
  `reduced-motion` finding; a fixture declaring `transition-duration` under the same floor does not.
- No rule id is added, removed, or renamed in `src/lib/audit/rules/static/index.ts`, which is not in
  this task's diff.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the check-plus-unit gate string
  exits 0.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The floor clause's comment states the two
  conditions it checks, never a general claim about cascade resolution.
- The labeled report block verbatim: `CAPTURES: none (no rendered surface touched)` and
  `MOVED BASELINES: none`, with the `git status` proof.
- No process citations in shipped comments.
- Counts found, changed, deferred: the number of fixture expectations found in the three suites, the
  number changed by the widened predicate, and any deferred with the reason.
- Re-emit before the gate.

**Gate:** the CHECK-PLUS-UNIT string under "## Gate", run as `cairn-run-gate '<check string>'`. Scoped
to the blast radius: the inner loop runs only the two named test files; the gate string runs once.

**Commit:** one, `refactor(audit): repoint motion-band and scope reduced-motion's floor clause`.

---

## Task 3: `motion-property` and `motion-hover-gate`

**Chain:** A, third. **Paint:** no. **Depends on:** task 2. **Shares the static registry with task 4,
so the two are serialized.**

**Deliverables: four.** `motion-property` with the allowlist, the snap list, the three-property cap,
and the `animate-*` keyframe clause; the one exception keyed on file plus selector with its
three-sided fixture; `motion-hover-gate`; and both registered.

**Files (5):**
- Create: `src/lib/audit/rules/static/motion-property.ts`,
  `src/lib/audit/rules/static/motion-hover-gate.ts`,
  `src/tests/unit/audit/rules/motion-property.test.ts`,
  `src/tests/unit/audit/rules/motion-hover-gate.test.ts`
- Modify: `src/lib/audit/rules/static/index.ts`, `CHANGELOG.md`

**Interfaces:**
- Consumes: task 2's widened `isMotionProperty` and `motion-band`'s ownership of `transition: all`.
- Produces: the rule ids `motion-property` and `motion-hover-gate`, both static, both error tier,
  which task 10 adds to the gate's `RULE_IDS` and task 11 documents.
- Unchanged: no package export. Both rules are reached through the registry, not through a new
  subpath.

**Decisions the plan makes:**
- **Both rules are specified consumer-first.** `motion-property` reads both CSS-family surfaces
  `cssScopeRules` already yields (a component's own scoped `<style>` block plus any file
  `static.cssFiles` names) and the per-element class-token join against `ctx.sheet.declarations()`,
  keyed on `ClassToken.elementStart`. A consumer needs no configuration: `DEFAULT_STATIC_SCOPE` covers
  `src/routes/admin`, `src/lib/components`, and `src/lib/admin-toolkit`, and
  `DEFAULT_SHEET_CANDIDATES` names the engine's `dist` sheet first and the installed
  `node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css` second, taking the first that
  exists. `motion-hover-gate` reads the CSS-family surfaces only, with no class join.
- **`transition: all` and `transition-all` are not `motion-property`'s findings.** `motion-band` owns
  that construct, so one construct produces one finding under one id, and the `@starting-style` fix
  message lives with `motion-band`.
- **Two different messages for two different failures.** A named-error property (the nine-item snap
  list) names the judder. A property that is neither allowlisted nor named on the error list still
  fails, with a message saying the property is outside the vocabulary. `max-width` on the zen editor
  card is the shipped instance of the second, and the difference is deliberate.
- **The exception is keyed on the pair**, never the selector alone: the file must resolve inside the
  engine's own tree (`src/lib/components/CairnAdminShell.svelte`, or its `dist` equivalent when the
  rule runs from an installed package) AND the selector must be `.drawer-content` AND the property
  must be `margin-left`.
- `motion-hover-gate` mirrors `focus-parity`'s shape. Tailwind's `hover:` variant is out of scope by
  construction, exactly as it is in `focus-parity`, because it already compiles to
  `@media (hover: hover) { &:hover }`. Its fix message cites `cairn-admin.css:1002` as the shipped
  model and warns that a selector list pairing `:hover` with `:focus-visible` must be split before the
  guard goes on, or focus motion dies on a touch device with a keyboard.
- **Folding `motion-hover-gate` into this task is deliberate.** It is one small rule in the same file
  family with the same dependency, and folding it saves a task's fixed overhead. The spec's revision 1
  gave it its own task and the adversarial review folded it.
- **The rendered half of the hover gate is not in this pass.** It needs the same emulation axis rule 4
  needs, it is advisory, and its remedy would be an override decision 4 declines. Task 11 files it.

**Steps:**
- [ ] **Step 1: the failing fixtures first, for `motion-property`.** Write the six fixtures the spec
  names and watch each fail with the rule module absent: a `transition-[width]` class fails; a
  `width 200ms` CSS declaration fails; a `transition-all` construct produces NO `motion-property`
  finding; the shell's own `margin-left` on `.drawer-content` passes; a second element in the same
  engine file transitioning `margin-left` fails; a consumer-owned `.drawer-content` transitioning
  `margin-left` fails.
- [ ] **Step 2:** write `motion-property` until all six pass. Include the three-property cap (more
  than three properties in one declaration is a finding) and the `animate-*` clause (an `animate-*`
  class is checked through its `--animate-*` custom property's keyframes, so animating a snap-list
  property is the same finding as transitioning one), each with its own fixture.
- [ ] **Step 3: the failing fixtures first, for `motion-hover-gate`.** `cairn-admin.css:1002` passes
  because it is guarded; a hand-authored `:hover` transition with no guard fails; a `hover:` utility
  is not read at all; a split pair with the `:hover` half guarded and the `:focus-visible` half
  outside passes on both halves, and `focus-parity` passes alongside it. Watch them fail.
- [ ] **Step 4:** write `motion-hover-gate` until all four pass.
- [ ] **Step 5:** register both in `src/lib/audit/rules/static/index.ts`, at error tier. Append the
  `CHANGELOG.md` line this task owns, which does NOT carry `Consumers must:` (task 11 writes that line
  once, when the whole rule set has landed). The check-plus-unit gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/audit/rules/motion-property.test.ts src/tests/unit/audit/rules/motion-hover-gate.test.ts`
  passes, with **at least ten** named fixtures across the two files, covering every case in Steps 1
  and 3.
- A `transition-all` fixture produces zero `motion-property` findings, asserted by id.
- The three-sided exception fixture is present: the shell's own offset passes, a second element in the
  same file fails, and a consumer-owned `.drawer-content` fails. All three are asserted by name.
- `grep -n "motion-property\|motion-hover-gate" src/lib/audit/rules/static/index.ts` returns both ids.
- Each rule's fix message names the property or the selector, the rule, and the remedy, verifiable in
  the fixture assertions rather than only in the source.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the check-plus-unit gate string
  exits 0.
- `scripts/checks/check-invisible-craft.mjs` is NOT in this task's diff. Wiring is task 10's.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The exception's doc comment states the pair it
  keys on, and says the fixture proves all three sides, only if the fixture does.
- The labeled report block verbatim.
- No process citations in shipped comments. The rule doc comments state the contract and the reason,
  never the spec, the pass, or the decision number.
- Counts found, changed, deferred: fixtures written per rule, rules registered, and any spec clause
  deferred with the reason.
- Re-emit before the gate.

**Gate:** the CHECK-PLUS-UNIT string, run as `cairn-run-gate '<check string>'`. Inner loop scoped to
the two new test files.

**Commit:** one, `feat(audit): add motion-property and motion-hover-gate`.

---

## Task 4: `motion-vocabulary`

**Chain:** A, fourth. **Paint:** no. **Depends on:** tasks 1 and 2. **Shares the static registry with
task 3.**

**Deliverables: four.** The token check on both surfaces with the class join, the vendor-class
exemption, the companion built-sheet assertion, and the positive `infinite` clause with the three
abstention shapes.

**Files (3):**
- Create: `src/lib/audit/rules/static/motion-vocabulary.ts`,
  `src/tests/unit/audit/rules/motion-vocabulary.test.ts`
- Modify: `src/lib/audit/rules/static/index.ts`, `CHANGELOG.md`

**Interfaces:**
- Consumes: task 1's eight tokens and the proven Tailwind duration authoring form; task 2's widened
  `isMotionProperty`.
- Produces: the rule id `motion-vocabulary`, static, error tier, which task 10 adds to `RULE_IDS` and
  task 11 documents.
- Unchanged: no package export.

**Decisions the plan makes:**
- **The companion assertion is part of the rule, not a separate check.** A `transition-*` class with
  no sibling `duration-*` or `ease-*` class passes because it resolves to the theme default, so the
  rule ships with an assertion that the built sheet sets `--default-transition-duration` and
  `--default-transition-timing-function` to cairn tokens on the admin root. Without it the pass
  verdict is a lie on eleven of the admin's declarations. When the assertion is red, the rule reports
  the assertion rather than the element.
- **The vendor-class exemption is enumerable rather than a hand-maintained list.** It is defined as "a
  class whose declarations resolve, in the built sheet, only inside DaisyUI's own nested component
  layer", which `CompiledSheet.declarations()` already reports through each rule's `conditions` array.
  The false-positive cost of not exempting is measured and stated in the spec: `.btn` alone computes
  over five properties on 19 elements at rest on `/admin/posts`, so firing on it would make
  `class="btn"` a violation on every button in every consumer tree.
- **The `infinite` carve-out is a positive clause.** An animation declared `infinite` MUST declare
  `linear`, and is exempt from the duration check only. Its easing is still checked, against the one
  value the carve-out permits. This departs from the enforcement record, which wanted `animate-spin`
  to fail on both its `1s` and its `linear`, and the departure is recorded because the record's remedy
  has no legal form for the `linear` half.
- **Three abstention shapes record a note rather than a finding**, each shipping today: a `var()` in
  the property slot, a `calc()` over a foreign variable, and a shorthand carrying `allow-discrete`
  keywords. Abstaining is stated in the report, so a check that skips itself is visible.
- **The three join blind spots are documented in the rule's own doc comment** rather than claimed
  away. A conditional class puts two values in one slot, and the rule reports on **every branch**,
  abstaining only where a pairing verdict would need one value. The token dedup drops the second
  owner, accepted as a false negative, because changing the dedup key changes the shared substrate
  every static rule reads. A cross-component pair is out of reach, stated as the limit of the coverage
  claim.

**Steps:**
- [ ] **Step 1: the failing fixtures first.** Write the nine the spec names and watch each fail with
  the rule module absent: `duration-[250ms]` fails; the token form passes; `transition-colors` alone
  passes with the companion assertion green; `transition-colors` alone with the companion assertion
  red reports the assertion rather than the element; `animate-spin` passes on both halves with its
  duration exempt; a five-second `linear infinite` animation passes, with the fixture recording that
  the duration is deliberately unchecked; an `infinite` animation declaring `ease-in-out` fails on its
  easing; a 700ms finite `animate-*` fails; and each of the three abstention shapes records a note
  rather than a finding.
- [ ] **Step 2:** write `motion-vocabulary` until all nine pass. The CSS half convicts a literal, a
  bare `ease`, a bare `linear`, and a raw `cubic-bezier()`; the class half convicts a `duration-*` or
  `ease-*` class whose value is not a cairn token.
- [ ] **Step 3:** add the vendor-class exemption, with a fixture proving `.btn` produces no finding
  and a fixture proving a cairn-authored class with the same shape does.
- [ ] **Step 4:** write the three join limits into the rule's own doc comment, each stated as a limit
  with what it misses.
- [ ] **Step 5:** register it in `src/lib/audit/rules/static/index.ts` at error tier. Append the
  `CHANGELOG.md` line this task owns, without a `Consumers must:` line. The check-plus-unit gate.
  Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/audit/rules/motion-vocabulary.test.ts` passes, with **at least
  twelve** named fixtures covering every case in Steps 1 and 3.
- A fixture reproducing `cairn-admin.css:545`'s `transition: rotate 150ms ease` produces a finding
  naming both the literal duration and the bare `ease`.
- With the companion assertion forced red, a `transition-colors`-only fixture reports the assertion
  and NOT the element, asserted by the finding's own text.
- A `.btn` fixture produces zero findings; a cairn-authored class of the same shape produces one.
- Each of the three abstention shapes produces a note and zero findings, asserted separately.
- `grep -n "motion-vocabulary" src/lib/audit/rules/static/index.ts` returns the id.
- The rule's doc comment names all three join limits, verifiable by
  `grep -c "conditional class\|dedup\|cross-component" src/lib/audit/rules/static/motion-vocabulary.ts`
  returning at least 3.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the check-plus-unit gate string
  exits 0.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The join-limits comment says what the rule
  misses, and each limit has either a fixture or an explicit "not covered" statement.
- The labeled report block verbatim.
- No process citations in shipped comments.
- Counts found, changed, deferred: fixtures written, abstention shapes covered, and any spec clause
  deferred with the reason.
- Re-emit before the gate.

**Gate:** the CHECK-PLUS-UNIT string, run as `cairn-run-gate '<check string>'`. Inner loop scoped to
the one new test file.

**Commit:** one, `feat(audit): add motion-vocabulary`.

**Checkpoint:** the conductor writes STATUS after this task and merges `admin-motion-8` into
`admin-motion` if chain B has reported done.

---

## Task 6a: The admin migrated onto the language

**Chain:** A, fifth. **Paint:** yes. **Depends on:** tasks 3 and 4, so the rules exist before the code
is measured against them.

**Deliverables: four.** The three shipped violations fixed, the six token migrations (three CSS rules
and three CodeMirror theme strings) with the two `HelpHome` selector lists split, the three
`duration-[250ms]` classes onto the token form, and the case table's nine reduced-motion cells written
with the migration row recording the empty opt-back-in list.

**Files (8):**
- Modify: `src/lib/components/EditPage.svelte`, `src/lib/components/MarkdownEditor.svelte`,
  `src/lib/components/CairnAdminShell.svelte`, `src/lib/components/CairnMediaLibrary.svelte`,
  `src/lib/components/ConceptList.svelte`, `src/lib/components/MediaHeroField.svelte`,
  `src/lib/components/HelpHome.svelte`, `src/lib/components/cairn-admin.css`, `CHANGELOG.md`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`
- Test: no new file. `npm test`'s existing component suite is the regression net, and the visual
  suite is the paint proof.

**Interfaces:**
- Consumes: task 1's eight tokens and the two theme defaults.
- Produces: an admin tree with zero `motion-property`, `motion-vocabulary`, and `motion-hover-gate`
  findings, which is what makes task 10's wiring legal.
- Unchanged: `check:surface`, every export, and `scripts/checks/custom-surface-budget.json`, which is
  not in this task's diff.

**Decisions the plan makes:**
- **The seventeen shipped declarations, and nothing else.** Eleven sites are Tailwind utilities: two
  are fixed by hand, one drops its `duration-*` sibling, and eight need no edit because the theme
  defaults resolve them. Three are CSS rules and three are CodeMirror theme strings, and all six move
  onto the tokens. The three `animate-spin` uses are exempt.
- `EditPage.svelte:1643` gets a named property list (`transition-[opacity,translate]`) and takes its
  duration from the token form. **The `@starting-style` entrance stays**, because it is what the
  transition exists for.
- `EditPage.svelte:2047`'s `transition-[width]` on the preview frame is **removed**. It transitions
  `width`, which the snap list bans, and the change it animates is a split-pane resize, which the
  resize rule says should snap for an independent reason. This is a behavior change a reader will
  notice, so it carries a `Consumers must:` line.
- `MarkdownEditor.svelte:530`'s `width 200ms ease` on `::-webkit-progress-value` moves to a
  `transform: scaleX()` overlay. **The native `<progress>` element stays**, keeping its implicit
  `progressbar` role and its `value` and `max` mapping to `aria-valuenow` and `aria-valuemax`. Its own
  painted fill is suppressed (`::-webkit-progress-value` and `::-moz-progress-bar` at zero-width or
  transparent) and the visible fill is a decorative `aria-hidden` overlay whose `scaleX` tracks the
  same value. **No new ARIA is authored, because none is needed.**
- `cairn-admin.css:545` moves onto `var(--cairn-dur-quick)` and `var(--cairn-ease-standard)`. Bare
  `ease` is `cubic-bezier(0.25, 0.1, 0.25, 1)` and matches no token.
- **Each `HelpHome` hover and focus pair splits before the guard goes on.** The admin authors its
  pairs as one selector list; wrapping that list in `@media (hover: hover)` would carry the
  `:focus-visible` half into the guard and kill focus motion for a keyboard attached to a touch
  device. The `:hover` alternative moves inside the guard; the `:focus-visible` alternative stays
  outside it. `focus-parity` still passes after the split, because it looks for the sibling selector
  anywhere in the same file.
- `EditPage.svelte:1428` drops its `duration-*` class; the theme default carries it at `base`.
- The `MarkdownEditor` fold chevron and unfold flash move onto the tokens and keep their shape. Both
  already sit inside a `prefers-reduced-motion: reduce` block in the same theme object, and the
  chevron carries a `@media (hover: none)` rest state. That is the best motion in the admin.
- **No opt-back-in is authored**, and the case table's nine cells are written to read "Snaps to the
  new paint". The migration row records the empty list and the two reasons: each restatement costs one
  unlayered allowlist entry, and the paint still changes instantly under the floor.
- **Nothing is added to `custom-surface-budget.json`**, which is the test that this task stayed inside
  both 2026-09-13 rulings.

**Steps:**
- [ ] **Step 1:** capture this task's before set per the paint protocol, at the task's parent commit.
  Capture-pair branch.
- [ ] **Step 2: measure first.** Run the three new rules over the admin tree by hand and paste the
  full finding list. This is the task's found count, and every later step closes a named finding.
- [ ] **Step 3:** the three violations. `EditPage.svelte:1643`'s named property list, the preview
  frame's `transition-[width]` removed, and the upload fill moved to the `aria-hidden` `scaleX`
  overlay over the native `<progress>` that stays.
- [ ] **Step 4:** `cairn-admin.css:545` onto the tokens, and the three `duration-[250ms]` classes onto
  the token form task 1 proved.
- [ ] **Step 5:** the two `HelpHome` rules onto the tokens, each pair split before its `:hover`
  alternative moves inside `@media (hover: hover)`. Confirm `focus-parity` still passes.
- [ ] **Step 6:** the three CodeMirror theme strings onto the tokens.
- [ ] **Step 7:** re-run the three rules and confirm zero findings over the admin tree. Report counts
  found, changed, deferred.
- [ ] **Step 8:** capture the after set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` naming the preview frame's removed transition and the
  upload fill's new overlay and nothing else, regenerate any moved baseline locally by file path, and
  append the manifest rows under `## Admin motion`. Report `TILE DIFF:` per captured surface. Append
  the two `CHANGELOG.md` lines this task owns, both carrying `Consumers must:`. The full gate. Commit.

**Acceptance criteria:**
- Running `motion-property`, `motion-vocabulary`, and `motion-hover-gate` over `src/lib/components`
  and `src/lib/admin-toolkit` returns **zero findings**, pasted in the report.
- `grep -rn "duration-\[" src/lib/components/` returns nothing.
- `grep -n "transition-\[width\]" src/lib/components/EditPage.svelte` returns nothing.
- `grep -n "progress" src/lib/components/MarkdownEditor.svelte` still shows a native `<progress>`
  element carrying `value` and `max`, and the new overlay carries `aria-hidden`. No `role="progressbar"`
  is authored.
- `grep -rn "150ms\|200ms\|250ms\|300ms" src/lib/components/cairn-admin.css` returns only vendor or
  non-motion matches, each named in the report.
- `scripts/checks/custom-surface-budget.json` is **not** in the diff, and
  `node scripts/checks/check-custom-surface.mjs` exits 0.
- Each `HelpHome` hover and focus pair is split in the diff, with the `:hover` half inside
  `@media (hover: hover)` and the `:focus-visible` half outside, and `focus-parity` produces no
  finding on the file.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `CAPTURES:` names all six surfaces in both schemes at the five widths;
  `INTENDED MOVES:`/`MOVED BASELINES:` agree name for name; `TILE DIFF:` is reported per tile.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The progress overlay's comment states that the
  native element carries the role and the values, only because the markup does.
- The labeled report block verbatim and in order.
- No process citations in shipped comments.
- Counts found, changed, deferred: the Step 2 finding count found, the number closed, and any
  deferred with the reason. The seventeen-declaration inventory is the denominator.
- Re-emit before the gate.

**Gate:** the FULL string, run as `cairn-run-gate '<full string>'`.

**Commit:** one, `refactor(admin): migrate the shipped motion onto the token language`.

---

## Task 6b: The two new behaviors

**Chain:** A, sixth. **Paint:** yes. **Depends on:** task 6a, whose files it shares.

**Deliverables: three.** The dropzone's drag-over paint state, the resize stopper with its fake-timer
test, and the built-sheet assertion for the stopper's rule.

**Files (5):**
- Modify: `src/lib/components/MediaHeroField.svelte`,
  `src/lib/components/CairnAdminShell.svelte`, `src/lib/components/cairn-admin.css`,
  `src/tests/unit/admin-sheet-inventory.test.ts`, `CHANGELOG.md`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`
- Create: `src/tests/unit/resize-stopper.test.ts`

**Interfaces:**
- Consumes: task 1's `--cairn-dur-instant`.
- Produces: the class name `cairn-resizing` on the admin theme-attribute element, and one
  `@layer components` rule keyed on it, which task 11 documents in the design system's responsive
  rules.
- Unchanged: `check:surface`, every export, `custom-surface-budget.json`'s `unlayeredAllowlist`.

**Decisions the plan makes:**
- **The dropzone state is fully specified.** A `dragOver` boolean set on `ondragenter` and
  `ondragover` (which must also `preventDefault` for the drop to be allowed), cleared on `ondrop` and
  on `ondragleave` only when the event's `relatedTarget` lies outside the button, so the dropzone's own
  child spans do not flicker it off. The paint is the same border and background tint the `:hover`
  rule gives, at `--cairn-dur-instant`, applied **through a class rather than a hover selector** so it
  reaches a coarse pointer and needs no modality guard. Nothing moves and nothing resizes.
- **The resize stopper is fully specified.** The class is `cairn-resizing`, set on the same element
  the admin theme attribute sits on, by `CairnAdminShell.svelte`'s own `resize` listener. It is added
  on the first `resize` event of a burst and removed by a trailing timer, restarted by every
  subsequent `resize`, that fires 400ms after the last one. Clear conditions: the trailing timer, and
  component teardown, which clears both the timer and the class so a navigation away mid-resize never
  strands it.
- **It declares one rule**, inside `@layer components` on cairn's own class, zeroing
  `transition-duration`, `animation-duration`, `transition-delay`, and `animation-delay` in the same
  `0.01ms` and `0s` idiom the reduced-motion block uses, so the admin has one idiom rather than two.
  Being a cairn-owned class inside the components layer, it costs no unlayered allowlist entry; it
  counts against `componentsLayerCap`, which has headroom at 19.
- **It is keyed on `resize`, which an orientation change also fires**, which is why the case table's
  orientation row names the stopper as its owner.
- **The stopper is what holds the breakpoint flip**, since the DaisyUI drawer's vendor transition
  stays (disagreement 5). It covers the common case, a drag across the breakpoint; a scripted or
  rotation-driven flip still shows the vendor slide, and task 11 states that in the design system.

**Steps:**
- [ ] **Step 1:** capture this task's before set per the paint protocol. Capture-pair branch.
- [ ] **Step 2: the failing test first, in `resize-stopper.test.ts`.** With fake timers, assert four
  things: the class appears on the first `resize`; it survives a second `resize` at 300ms; it clears
  400ms after the last `resize`; and it is gone after component teardown, with the timer cleared.
  Watch all four fail.
- [ ] **Step 3:** implement the listener and the teardown in `CairnAdminShell.svelte` until all four
  pass.
- [ ] **Step 4: the failing assertion first, in `admin-sheet-inventory.test.ts`.** Assert that the
  built sheet's `.cairn-resizing` rule zeroes all four properties, inside `@layer components`. Watch
  it fail, then write the rule in `cairn-admin.css`.
- [ ] **Step 5:** the dropzone's drag-over state in `MediaHeroField.svelte`, exactly as the Decisions
  block specifies, painting through a class at `--cairn-dur-instant`.
- [ ] **Step 6:** capture the after set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` (the expected declaration is none, since both new
  behaviors are state-triggered and no baseline renders either state), regenerate any moved baseline
  locally by file path, and append the manifest rows under `## Admin motion`. Report `TILE DIFF:` per
  captured surface. Append the `CHANGELOG.md` line this task owns. The full gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/resize-stopper.test.ts` passes with all four named assertions.
- `npx vitest run src/tests/unit/admin-sheet-inventory.test.ts` passes, and the file asserts the
  `.cairn-resizing` rule zeroes `transition-duration`, `animation-duration`, `transition-delay`, and
  `animation-delay`.
- `grep -n "cairn-resizing" src/lib/components/cairn-admin.css` shows the rule inside
  `@layer components`, verifiable in the diff.
- `scripts/checks/custom-surface-budget.json` is not in the diff, and
  `node scripts/checks/check-custom-surface.mjs` exits 0 with `componentsLayerCap` not exceeded.
- `MediaHeroField.svelte` wires `ondragenter`, `ondragover` (with `preventDefault`), `ondrop`, and
  `ondragleave`, and the `ondragleave` handler tests `relatedTarget` against the button, verifiable
  line by line in the diff.
- The drag-over paint is applied through a class, and `grep -n ":hover" src/lib/components/MediaHeroField.svelte`
  shows no new hover selector added by this task.
- Running the three motion rules over the admin tree still returns zero findings.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `CAPTURES:` names all six surfaces in both schemes at the five widths, with `INTENDED MOVES:` and
  `MOVED BASELINES:` agreeing name for name.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The stopper's comment states the four clear
  conditions the test covers and no more.
- The labeled report block verbatim and in order.
- No process citations in shipped comments.
- Counts found, changed, deferred: the event handlers found on the dropzone before the change, the
  number added, and any deferred.
- Re-emit before the gate.

**Gate:** the FULL string, run as `cairn-run-gate '<full string>'`.

**Commit:** one, `feat(admin): add the dropzone drag-over state and the resize stopper`.

---

## Task 7: Zen

**Chain:** A, seventh. **Paint:** yes. **Depends on:** tasks 1, 6a, and 6b.

**Deliverables: four.** The `.drawer-content` `margin-left` transition at `shift` in and `base` out on
the paired curves, the chrome regions' fade, the chip's guarded delayed entrance and immediate exit,
and the editor card's box left snapping.

**Files (3):**
- Modify: `src/lib/components/CairnAdminShell.svelte`, `src/lib/components/EditPage.svelte`,
  `src/lib/components/cairn-admin.css`, `CHANGELOG.md`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`
- Test: no new file. Task 10 owns the zen toggle's layout-count assertions in the e2e.

**Interfaces:**
- Consumes: task 1's tokens; task 3's `motion-property` exception, keyed on
  `src/lib/components/CairnAdminShell.svelte` plus `.drawer-content` plus `margin-left`.
- Produces: the one allowlist exception's live instance, which task 10's layout-count assertions
  measure.
- Unchanged: `check:surface`, `setZen()`'s signature, every export.

**Decisions the plan makes:**
- **The offset takes decision 3's asymmetry, not the stays-nearby carve-out.** It enters at
  `--cairn-dur-shift` on `--cairn-ease-entrance` and leaves one band faster at `--cairn-dur-base` on
  `--cairn-ease-exit`. The offset leaves and stays nearby in the chrome's sense, so the carve-out
  would give it `shift` in both directions on the standard curve. Decision 3 settles it the other way,
  because the offset is the motion the reader asked for and the way back out of zen is the one the
  finger is waiting on. It is an explicit exception to the carve-out rather than an oversight.
- **The chrome regions take the carve-out.** They leave but stay nearby, ready to reappear, so they
  use `--cairn-ease-standard` rather than the exit curve and keep `quick` in both directions rather
  than taking the one-band reduction.
- **The chip's 110ms entrance delay is authored inside a `(prefers-reduced-motion: no-preference)`
  guard.** Its exit carries no delay, because the finger is still on the glass. Under the reduced
  context the declaration does not apply and the computed delay is zero, which is why task 8's rule 4
  does not fire on cairn's own code.
- **The editor card's box snaps.** `padding` is a named error and `max-width` is outside the
  allowlist, so both snap for different reasons and the reader gets two different messages if either
  is ever reintroduced.
- **Under reduced motion the offset takes the blanket block and snaps**, per decision 3. No static
  substitute is authored. Carbon's "always provide alternatives" runs the other way and decision 3
  overrides it, because zen's own state is already communicated statically by the chrome that is gone
  and the chip that names the mode.
- **`setZen()`'s `flushSync()` focus sequence stays synchronous**, so motion never gates focus. This
  is a preservation requirement rather than a change, and the task states which lines it preserved.

**Steps:**
- [ ] **Step 1:** capture this task's before set per the paint protocol. Capture-pair branch.
- [ ] **Step 2:** read `setZen()` whole and record the `flushSync()` focus sequence verbatim in the
  report, so the diff can be checked against it.
- [ ] **Step 3:** the `.drawer-content` `margin-left` transition, at `--cairn-dur-shift` on
  `--cairn-ease-entrance` entering and `--cairn-dur-base` on `--cairn-ease-exit` leaving. Confirm by
  hand that `motion-property` passes it and that a second element in the same file transitioning
  `margin-left` would fail, using the fixture task 3 shipped.
- [ ] **Step 4:** the chrome regions' fade, `quick` out on the exit curve and `quick` back on the
  standard curve.
- [ ] **Step 5:** the chip's entrance at `base` on the entrance curve after a 110ms delay authored
  inside a `(prefers-reduced-motion: no-preference)` guard, and its exit at `quick` on the exit curve
  with no delay.
- [ ] **Step 6:** confirm the editor card's box snaps, with neither `padding` nor `max-width` in any
  transition property list.
- [ ] **Step 7:** capture the after set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` (zen is not a resting state on any captured surface,
  so the expected declaration is none), regenerate any moved baseline locally by file path, and append
  the manifest rows under `## Admin motion`. Report `TILE DIFF:` per captured surface. Append the
  `CHANGELOG.md` line this task owns. The full gate. Commit.

**Acceptance criteria:**
- `grep -n "margin-left" src/lib/components/CairnAdminShell.svelte` shows exactly one transitioned
  site, on `.drawer-content`, with the four token references in the diff (`shift` and `entrance` in,
  `base` and `exit` out).
- Running `motion-property` over `src/lib/components` returns zero findings, and the report states
  that the shell's offset was reached and passed by the exception rather than by absence.
- `grep -n "prefers-reduced-motion: no-preference" src/lib/components/EditPage.svelte` returns the
  chip's delay guard, and the chip's exit declaration carries no delay.
- Neither `padding` nor `max-width` appears in any `transition-property` or `transition` shorthand in
  `EditPage.svelte`, verifiable by grep.
- `setZen()`'s `flushSync()` focus sequence is byte-identical to the Step 2 record, verifiable in the
  diff.
- Running all three motion rules over the admin tree returns zero findings.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `CAPTURES:` names all six surfaces in both schemes at the five widths, with `INTENDED MOVES:` and
  `MOVED BASELINES:` agreeing name for name.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The offset's comment states the exception it
  relies on and the pair the rule keys on, only because task 3's fixture proves it.
- The labeled report block verbatim and in order.
- No process citations in shipped comments. The offset's comment states the contract and the reason,
  never decision 3 by number.
- Counts found, changed, deferred: the zen motion sites found, the number changed, and any deferred.
- Re-emit before the gate.

**Gate:** the FULL string, run as `cairn-run-gate '<full string>'`.

**Commit:** one, `feat(admin): give zen its offset, chrome and chip motion`.

---

## Task 8: The rendered harness, `motion-reduced-delay`, and its CI step

**Chain:** B, alone. **Paint:** no. **Depends on:** nothing. **Independent.**

**Deliverables: four.** `newContext` gaining `reducedMotion` and `hasTouch`, `runRendered` gaining the
emulation axis declared by rules the way `states` is, the shared CSSOM walker on `__cairnAudit`, and
the rule with its own workflow step.

**Files (8):**
- Modify: `src/lib/audit/rendered/types.ts`, `src/lib/audit/rendered.ts`,
  `src/lib/audit/rendered/page-surface.ts`, `src/lib/audit/rules/rendered/index.ts`,
  `.github/workflows/e2e.yml` or a sibling workflow file, `CHANGELOG.md`
- Create: `src/lib/audit/rules/rendered/motion-reduced-delay.ts`,
  `src/tests/unit/audit/rules/motion-reduced-delay.test.ts`
- Test: the existing rendered-harness tests under `src/tests/unit/audit/` are extended for the axis
  and named in the report

**Interfaces:**
- Consumes: nothing from chain A.
- Produces: the rule id `motion-reduced-delay`, rendered, advisory tier, which task 11 documents in
  the reference's rendered advisory table; and the emulation axis on `RenderedRule`, which a later
  pass's rendered hover half will use.
- Unchanged: `check:surface`. The logger and the harness are internal, exported from no package
  subpath, so their API is free to grow.

**Decisions the plan makes:**
- **The id is `motion-reduced-delay`, never `reduced-motion`.** `reduced-motion` is a static rule id,
  there is no duplicate-id guard across the two registries, and `suppress.ts` resolves directives by
  id, so a source-positioned `cairn-audit-disable-next-line reduced-motion` would read as covering a
  rendered finding it can never reach. The repo already ships one duplicated id, `list-role`, which is
  the precedent for how confusing the alternative is.
- **The rule reads computed values, per element**, in a `reducedMotion: 'reduce'` context, at rest, on
  each configured page. A nonzero `transition-delay` or `animation-delay` is a finding. That is the
  value a reader actually experiences and it is what the shipped defect is.
- **The CSSOM walk is the locator, not the detector.** A computed value has no selector to name, so
  the walker supplies the authored rule: for a firing element it reports the admin-owned rule whose
  selector matches that element and whose authored text declares the nonzero delay. The fix message's
  locator is the element's `__cairnAudit.signature(el)` plus that authored rule's selector and file
  condition. Where the walk finds no matching authored rule, the message says so and gives the
  signature alone.
- **The differential is withdrawn**, for two measured reasons. `signature(el)` names a class of
  elements rather than an element (483 elements on `/admin/posts` collapse to 130 signatures), so
  there is no join key. And the blanket block never touches `transition-property`, whose initial value
  is `all`, so under reduced motion 370 of 433 motion-bearing elements report `transition-property:
  all` and the differential's transform and layout clauses convict every element on the page.
- **Tier is advisory.** All three known offenders are DaisyUI's and cairn ships no override for them
  under decision 4. Error tier would fail every consumer's first `audit:rendered` on CSS the consumer
  cannot edit.
- **The walker handles six node shapes plus a per-sheet `SecurityError`:** `CSSNestedDeclarations`,
  `CSSSupportsRule`, `CSSContainerRule`, `CSSLayerBlockRule`, `@starting-style`, and the ordinary
  style rule. A throwaway probe would not.
- **The workflow step owns its own preview server.** A Playwright spec inside the showcase e2e suite
  is declined: the e2e server is Playwright's own `webServer`, its lifetime is the `playwright test`
  process, and the audit harness refuses to start a server. The deciding reason is second-order: that
  server is built with `VITE_CAIRN_E2E=1`, so riding it would audit an e2e-flagged build rather than
  the build a consumer ships, and this is the one rule that reads vendor CSS. The step starts and
  holds its own `npm run preview` on a dedicated port and runs `cairn-audit --rendered`.
- **Two negative results are recorded in the harness code's own comments** so a later pass does not
  re-run them: CDP `Emulation.setEmulatedMedia` with a `features` array for `hover` and `pointer` was
  silently ignored on the measured Chromium, and computed styles resolve every `var()`, so a rendered
  vocabulary check can compare values but never token names.
- **`RenderedPage.hover` is not added.** The modality gate reads the CSSOM rather than a forced state,
  and the rendered hover half is out of this pass.

**Steps:**
- [ ] **Step 1: the failing fixtures first.** Write the five the spec names and watch each fail with
  the rule module absent. Three positives, all measured at rest on `/admin/posts` in a reduced
  context: `div.drawer-side` (computes `0.1s, 0.1s`, ungated, fires); `.checkbox::before` (`0.1s`
  across four longhands, ungated, fires); `div.modal-box` (`50ms`, ungated, fires). Two negatives: the
  tooltip (authored at 75ms inside `(prefers-reduced-motion: no-preference)`, computes zero, must not
  fire) and the zen chip (cairn's own 110ms delay, same guard, computes zero, must not fire).
- [ ] **Step 2:** add `reducedMotion` and `hasTouch` to `RenderedBrowser.newContext`'s options type
  and thread them through.
- [ ] **Step 3:** add the emulation axis to `runRendered`, declared by rules the way `states` is, as a
  loop level above the context. Extend the rendered-harness tests for the new loop level and name them
  in the report. Report the resulting context and page-load count, since the axis multiplies both.
- [ ] **Step 4:** add the shared CSSOM walker to `__cairnAudit` beside `signature` and `isVisible`,
  handling the six node shapes and catching a per-sheet `SecurityError`.
- [ ] **Step 5:** write `motion-reduced-delay` until all five fixtures pass, reading computed values
  per element and using the walker for the fix message's locator. Register it at advisory tier.
- [ ] **Step 6:** add the workflow step that starts its own `npm run preview` on a dedicated port and
  runs `cairn-audit --rendered`. Append the `CHANGELOG.md` line this task owns, without a
  `Consumers must:` line. The check-plus-unit gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/audit/rules/motion-reduced-delay.test.ts` passes with all five named
  fixtures, three firing and two not.
- `grep -rn "reduced-motion" src/lib/audit/rules/rendered/` returns nothing. The id is
  `motion-reduced-delay` everywhere.
- `grep -n "motion-reduced-delay" src/lib/audit/rules/rendered/index.ts` returns the id at advisory
  tier.
- `grep -n "reducedMotion\|hasTouch" src/lib/audit/rendered/types.ts` returns both members.
- The rendered-harness tests cover the new axis, named in the report, and the report states the
  context and page-load count the axis produces.
- The walker handles all six node shapes, each covered by a named test or a stated limitation.
- The new workflow step names its own port, and that port is not 4173.
- `node scripts/checks/check-surface.mjs` exits 0 and `docs/internal/api-surface.md` is not in the
  diff.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the check-plus-unit gate string
  exits 0.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The two negative results are stated as measured
  on the named Chromium, with what was measured, never as general browser facts.
- The labeled report block verbatim.
- No process citations in shipped comments.
- Counts found, changed, deferred: the rendered contexts and page loads before and after the axis, the
  node shapes handled, and any deferred with the reason.
- Re-emit before the gate.

**Gate:** the CHECK-PLUS-UNIT string, run as `cairn-run-gate '<check string>'`. This chain never runs
the showcase e2e, which is what keeps the two chains free of the single port-4173 slot.

**Commit:** one, `feat(audit): add the rendered emulation axis and motion-reduced-delay`.

---

## Task 10: The engine's tree wired, and the visual suite

**Chain:** A, eighth. **Paint:** yes. **Depends on:** tasks 6a, 6b, 7, and 8.

**Deliverables: four.** The per-rule root restriction, the three `RULE_IDS` plus the one `CSS_FILES`
addition with the gate green, the six new visual surfaces across the five-viewport bar with the zen
toggle's two layout-count assertions, and the zen toggle added to the reproduction manifest.

**Files (5):**
- Modify: `scripts/checks/check-invisible-craft.mjs`, `scripts/checks/audit-gate.mjs`,
  `examples/showcase/e2e/admin-visual.spec.ts`, `src/lib/reproductions/manifest.ts`,
  `src/tests/unit/reproductions-manifest.test.ts`, `CHANGELOG.md`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`
- Baselines: up to 60 new files under `examples/showcase/e2e/admin-visual.spec.ts-snapshots/`,
  regenerated on CI

**Interfaces:**
- Consumes: tasks 3 and 4's three rule ids; task 2's floor clause, which is what lets `cairn-admin.css`
  join `CSS_FILES` without a false positive; tasks 6a, 6b, and 7's migrated tree, which is what makes
  the gate green on landing.
- Produces: a per-rule root map beside `RULE_IDS`, which a later pass extends when it adds a
  consumer-facing gate.
- Unchanged: `DEFAULT_STATIC_SCOPE` and `runStatic`. The filtering happens where `scopeReport` runs,
  so a consumer's own run is unaffected.

**Decisions the plan makes:**
- **The per-rule root restriction is a code deliverable, not a config line.** The gate's `SCAN_SCOPE`
  is `src/lib/components`, `src/lib/admin-toolkit`, and three showcase roots, and `scopeReport` filters
  the report by rule id alone, with no path term. Adding the three ids without a restriction would run
  the admin's motion language at error tier over the showcase's public site theme and chassis, which
  declares no `--cairn-dur-*` token and carries the exact constructs the rules convict (three literal
  `0.2s ease-out` durations on the theme-flip cross-fade and `animation-duration: 0.18s` on the root
  view-transition pseudo-elements). The gate would be red on landing, for the right reason under the
  wrong rule, since the charter boundary says the language governs the admin frame only.
- **The shape:** `check-invisible-craft.mjs` gains a per-rule root map beside `RULE_IDS`. A rule id may
  name the subset of `SCAN_SCOPE` it runs over, defaulting to all of it. The three motion ids name
  `src/lib/components` and `src/lib/admin-toolkit`. `gap-scale`, `token-colors`, and `motion-band` keep
  the full scope, so no existing coverage narrows, which the gate's own header comment requires.
- **A root `cairn-audit.config.json` plus two npm scripts was considered and declined**, because it
  would create a second, narrower gate beside the one already running, since `DEFAULT_STATIC_SCOPE`
  drops the three showcase roots this gate covers, and `motion-band` would run twice against two
  different scopes.
- **`CSS_FILES` keeps both entries.** The CSS-family rules read the file that belongs to their roots.
- **The six new surfaces** are the spec's list: the edit page in zen, the drawer open as an overlay,
  the persistent sidebar, a dialog open (`DeleteDialog` is the smallest instance), the command palette
  open, and the media library with a selection. Each renders across 320, 390, 768, 1440, 2560 in both
  themes.
- **The zen toggle gets two layout-count assertions, and frame-interval counts are deliberately not
  asserted.** In a default context at 1440, toggling zen produces more than two distinct computed
  `margin-left` values on `.drawer-content` during the toggle window, which fails if the transition is
  ever dropped, scoped away, or beaten by a later rule. In a `reducedMotion: 'reduce'` context at the
  same width, it produces exactly two, which fails if the exception ever escapes the blanket block.
  The same 700ms window returned 40 to 46 frames in some runs and 88 to 92 in others under headless
  Chromium, so the over-threshold frame counts are a noise floor and `LayoutCount` is the reliable
  signal.
- **The reproduction manifest's frozen id list is read, never assumed.** Polish-C's task 12 removes
  `toolkit/custom-screen`, so the count is 24 at this task's parent commit and 25 after it. The task
  reads the file's own current count and reports the number before and after.
- **Baselines regenerate on CI**, never from this workstation. Up to 60 new files is the pass's
  largest artifact.

**Steps:**
- [ ] **Step 1:** capture this task's before set per the paint protocol. Capture-pair branch, since
  `manifest.ts` feeds the reproductions the `styleguide` surface renders.
- [ ] **Step 2: the failing assertion first, for the restriction.** Assert that a report carrying a
  `motion-property` finding from a showcase root is filtered out while a `gap-scale` finding from the
  same root survives. Watch it fail.
- [ ] **Step 3:** implement the per-rule root map in `check-invisible-craft.mjs` and the path term in
  `audit-gate.mjs`'s `scopeReport` until the assertion passes.
- [ ] **Step 4:** add the three ids to `RULE_IDS` and `src/lib/components/cairn-admin.css` to
  `CSS_FILES`. Run `node scripts/checks/check-invisible-craft.mjs` and confirm it exits 0. If it does
  not, paste every finding and stop: a red gate here means the migration tasks left something, and
  guessing a suppression is not the fix.
- [ ] **Step 5:** add the six surfaces to `admin-visual.spec.ts` across the five-viewport bar in both
  themes, following the file's own cookie-plus-`emulateMedia` idiom.
- [ ] **Step 6:** add the zen toggle's two layout-count assertions, at 1440, one in a default context
  and one in a `reducedMotion: 'reduce'` context.
- [ ] **Step 7:** read the reproduction manifest's current frozen id count, add the zen toggle as a
  motion case, and update both `src/lib/reproductions/manifest.ts` and the frozen list in
  `src/tests/unit/reproductions-manifest.test.ts`, including its comment and its `it(...)` title.
  Report the count before and after.
- [ ] **Step 8:** capture the after set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` naming the six new surfaces with their file count and
  any moved existing baseline, regenerate any MOVED baseline locally by file path (the new ones
  regenerate on CI), and append the manifest rows under `## Admin motion`. Report `TILE DIFF:` per
  captured surface, with none for the six new surfaces since no before exists. Append the
  `CHANGELOG.md` line this task owns. The full gate. Commit.

**Acceptance criteria:**
- `node scripts/checks/check-invisible-craft.mjs` exits 0 with `RULE_IDS` carrying all six ids
  (`gap-scale`, `token-colors`, `motion-band`, `motion-property`, `motion-vocabulary`,
  `motion-hover-gate`) and `CSS_FILES` carrying both entries.
- The three motion ids report **nothing** from `examples/showcase/src/chassis`,
  `examples/showcase/src/routes`, and `examples/showcase/src/theme`, proved by a run with the
  restriction removed producing findings from those roots and a run with it in place producing none.
  Both runs are pasted in the report.
- `gap-scale`, `token-colors`, and `motion-band` keep the full five-root scope, proved by the same
  pair of runs.
- `grep -c "SIGNUPS_WIDTHS\|320, 390, 768, 1440, 2560" examples/showcase/e2e/admin-visual.spec.ts`
  shows the bar reused rather than a second width list authored.
- The six new surfaces are present by name in the spec file, each at five widths in both themes.
- The two zen layout-count assertions are present by name, one asserting more than two distinct
  `margin-left` values in a default context and one asserting exactly two in a reduced context. No
  frame-interval count is asserted anywhere in the diff.
- `npx vitest run src/tests/unit/reproductions-manifest.test.ts` passes, and the report names the
  frozen id count before and after.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `CAPTURES:` names all six capture surfaces in both schemes at the five widths;
  `INTENDED MOVES:` names the six new admin surfaces with their file count; `MOVED BASELINES:` and
  `INTENDED MOVES:` agree name for name on the moved set.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The root map's comment states which ids it
  narrows and why, and the "no existing coverage narrows" claim is backed by the paired runs rather
  than asserted.
- The labeled report block verbatim and in order, with the new-surface count inside `INTENDED MOVES:`.
- No process citations in shipped comments.
- Counts found, changed, deferred: the finding count from the showcase roots with and without the
  restriction, the new baseline file count, and the frozen id count before and after.
- Re-emit before the gate.

**Gate:** the FULL string, run as `cairn-run-gate '<full string>'`. The standing CI-canonical-baseline
gotcha applies: a local `CI=1` e2e is green when its only visual failures are exactly the files the
latest CI regen commit rewrote.

**Checkpoint:** the conductor writes STATUS after this task.

**Commit:** one, `feat(audit): wire the motion rules to the engine gate and the visual suite`.

---

## Task 11: Docs and records (last)

**Chain:** A, ninth. **Paint:** no. **Depends on:** everything.

**Deliverables: four.** The design system's Motion section as the canonical home, the extend track's
recipe page, the audit reference rows with the two prose counts, and the records (HISTORY, ROADMAP,
the rulings ledger, the friction log, and the `## Unreleased` block read whole).

**Files (8):**
- Modify: `docs/internal/admin-design-system.md`, `docs/extend/README.md`,
  `docs/reference/cairn-audit.md`, `docs/HISTORY.md`, `ROADMAP.md`, `CHANGELOG.md`,
  `docs/internal/engine-rulings.md`, `docs/internal/docs-friction-log.md`
- Create: `docs/extend/animate-a-custom-screen.md`

**Interfaces:** none. No code changes.

**Decisions the plan makes:**
- **The design system's Motion section is canonical.** Where the design system and the recipe page
  state the same rule, the design system is the source and the recipe cites it by heading rather than
  restating it. Both documents say so in a line of their own. Without that, the two drift, and the
  recipe is the one a developer reads.
- **The Motion section carries** the token table with each Carbon alias, the allowlist and the snap
  list with the one exception, the enter and exit rule with its `instant` floor and the stays-nearby
  carve-out, the modality gate with the selector-list split, the reduced-motion policy by property
  class with the empty opt-back-in list and its budget reason, the responsive rules with the resize
  stopper, and the DaisyUI decision with all **seven** vendor disagreements, the declined `.modal-box`
  override, and its reopen trigger. It states plainly that the shipped sheet does not honor the
  language's furniture rule at the breakpoint flip.
- **The `modal-bottom` reopen trigger is carried as a `WATCH:` comment** beside the recipe in the
  design system, per this repo's watch-item rule, because the trigger is a markup change a future pass
  makes rather than an external event. If it cannot be carried as a `WATCH:`, it is filed to ROADMAP
  instead, and the task says which it did.
- **The recipe page is written for a developer building a custom admin screen**: the tokens they
  write, the four rules they will meet and what each fix message means, the three join limits stated
  as limits, and the one configuration line a consumer owes (naming their own theme CSS in
  `static.cssFiles` if they want the CSS-family rules to read it, which is already true of
  `token-colors`). It carries the one non-obvious authoring step, splitting a `:hover` and
  `:focus-visible` selector list before adding the modality guard, and the opt-back-in permission with
  its budget caveat.
- **The reference gets three static rows, one rendered advisory row, the `motion-band` band
  correction, and the coverage limits.** Two prose counts move with them: `:66` says "Twelve rules
  run, all error tier", which becomes fifteen and is no longer all error tier once the rendered
  advisory lands; and `:25` says "All 28 registered rules", which becomes 32. Both are named here
  because a reviewer will not find them by reading the tables. This page is gated by review rather
  than by `check:reference`, which is why both counts are acceptance criteria.
- **The ledger rows quote decisions 3 and 4 and the two escalation rulings of 2026-09-13**, each
  citing the spec by path and date. Rows take the ledger's own heading form.
- **Four follow-ups are filed:** the rendered half of `motion-hover-gate` with its trigger (the
  borrow-1 pass, which owns the consumer-facing gates layer); the `.tooltip` touch defect with the
  review's finding that closing it means gating the tooltip's **visibility**, not its transition, which
  is a behavioral override of a vendor component and a decision borrow-1 takes on its own terms; the
  `.menu` gate with the same follow-up; and the `modal-bottom` reopen trigger if it is not carried as
  a `WATCH:`.
- **ROADMAP's "A motion language for the admin" entry is closed and removed from the live tier.**
  "Borrowable patterns" stays open, and this task adds the three filed follow-ups to it rather than
  creating a fifth tier entry.
- **The `## Unreleased` block is read whole.** This window carries six `Consumers must:` lines, and
  this task writes the one the changelog table assigns to it and verifies all six are present.
- **`docs/STATUS.md` is not written by this task.** The conductor owns it.
- **The friction log is triaged complete-or-move**, which is the log's own rule, rather than appended
  to.

**Steps:**
- [ ] **Step 1:** write the Motion section into `docs/internal/admin-design-system.md`, located by
  section heading and quoted phrase rather than by any line number in this plan. State in its own line
  that it is canonical and the recipe cites it.
- [ ] **Step 2:** write `docs/extend/animate-a-custom-screen.md` and add it to
  `docs/extend/README.md`'s index in the index's own ordering. State in its own line that the design
  system's Motion section is canonical and this page cites it.
- [ ] **Step 3:** add the three static rows and the one rendered advisory row to
  `docs/reference/cairn-audit.md`, correct the `motion-band` band, write the coverage limits, and fix
  both prose counts.
- [ ] **Step 4:** write the ruling rows into `docs/internal/engine-rulings.md` in the full format,
  placed by reading the file's own ordering.
- [ ] **Step 5:** write the `docs/HISTORY.md` entry: what landed, what the gate caught, and what a
  later pass would be wrong to rediscover from scratch. Name at minimum the five items: that
  `scopeReport` filtered by rule id alone until this pass and now carries a per-rule root map; that
  `isReducedMotionGuarded` treated `(prefers-reduced-motion: no-preference)` as a guard, so a 3000ms
  transition inside an inverse gate was exempt from `motion-band`; that a reduced-motion restatement
  ties the blanket block on specificity and is decided by source order, measured in the built sheet;
  that `signature(el)` names a class of elements rather than an element, which is why the rendered
  differential has no join key; and that the emulation axis multiplies rendered contexts by the factor
  this pass measured.
- [ ] **Step 6:** close ROADMAP's motion entry, remove it from the live tier, and file the four
  follow-ups.
- [ ] **Step 7:** triage `docs/internal/docs-friction-log.md` complete-or-move, or record both sections
  empty. Read the `## Unreleased` block whole and confirm all six `Consumers must:` lines are present
  and correctly worded. Do not touch `package.json`. The check-plus-unit gate, with `check:docs`,
  `check:vale`, `check:rulings-format`, and `check:symbols` green. Commit.

**Acceptance criteria:**
- `docs/internal/admin-design-system.md` carries a Motion section naming all eight tokens with their
  Carbon aliases, the allowlist, the nine named errors, the one exception with its file-plus-selector
  key, the enter and exit rule with its floor, the carve-out and the zen offset's explicit exception
  to it, the modality gate with the selector-list split, the reduced-motion policy with the empty
  opt-back-in list, the resize stopper, and **all seven** vendor disagreements. The disagreement count
  is verifiable by grep.
- The Motion section and `docs/extend/animate-a-custom-screen.md` each carry a line naming the design
  system as canonical.
- `docs/extend/animate-a-custom-screen.md` names all four rules, the three join limits, and the one
  configuration line a consumer owes, and `grep -n "animate-a-custom-screen" docs/extend/README.md`
  returns the index entry.
- `docs/reference/cairn-audit.md` carries three new static rows and one rendered advisory row; the
  string "Twelve rules run, all error tier" appears nowhere in the file; and the string "All 28
  registered rules" appears nowhere in the file. The replacements read fifteen and 32.
- `docs/internal/engine-rulings.md` carries rows whose headings match
  `^## [a-z0-9-]+: .*\((accept|reshape|decline), 2026-09-13, ` with all five labeled lines beneath
  each, quoting decisions 3 and 4 and the two escalation rulings, and citing
  `docs/superpowers/specs/2026-09-13-admin-motion-language-design.md` with its 2026-09-13 date.
- `npm run check:rulings-format` passes.
- `docs/HISTORY.md` carries this pass's entry with the five named do-not-rediscover items.
- `ROADMAP.md` no longer lists "A motion language for the admin" in any live tier, and carries the
  four follow-ups.
- `docs/internal/docs-friction-log.md` has no untriaged entry.
- The `## Unreleased` block carries exactly six `Consumers must:` lines from this pass, matching the
  spec's text verbatim, verifiable by
  `grep -c "Consumers must:" CHANGELOG.md` against the pre-pass count plus six.
- `package.json` is not in the diff, `git tag --points-at HEAD` is empty, and no release exists.
- `docs/STATUS.md` is not in the diff. No file under `src/` or `examples/` is in the diff.
- `npm run check:docs`, `npm run check:vale`, and `npm run check:symbols` pass.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The HISTORY entry's five items each state what
  was measured and where, never a general inference.
- The labeled report block verbatim.
- No process citations in shipped comments. This is a docs task, so the constraint reaches the design
  system's `WATCH:` line, which states the trigger and the remedy without naming this pass.
- Counts found, changed, deferred: the rule rows added, the prose counts corrected, the follow-ups
  filed, the friction entries triaged, and the `Consumers must:` count before and after.
- Re-emit before the gate.

**Gate:** the CHECK-PLUS-UNIT string, run as `cairn-run-gate '<check string>'`. This task touches no
engine source, so the blast radius is the doc gates; the string still runs whole rather than trimmed.

**Commit:** one, `docs: write the admin motion language and close the pass's records`.

---

## The changelog window

Six `Consumers must:` lines, all in one release, quoted verbatim from the spec and assigned to the
task that ships each. No task writes a line the table does not assign to it.

| # | Line, verbatim from the spec | Task |
|---|---|---|
| 1 | `cairn-audit` gains three error-tier static rules (`motion-property`, `motion-vocabulary`, `motion-hover-gate`) and one advisory rendered rule (`motion-reduced-delay`). A custom admin screen that transitions a layout property, writes `transition-all`, writes a literal duration or easing, or declares an ungated hand-authored `:hover` transition now fails `npx cairn-audit`. Move onto the `--cairn-dur-*` and `--cairn-ease-*` tokens, or suppress with a reason. | **11** |
| 2 | `motion-band`'s band widens from 150ms to 250ms to 70ms to 400ms, and it no longer reports a call site that references a token. A site relying on the narrow band loses that check; the vocabulary rule is what replaces it. | **2** |
| 3 | The admin sheet sets `--default-transition-duration` and `--default-transition-timing-function` to cairn tokens on the admin root. A bare `transition` utility on a custom screen changes curve from Tailwind's `cubic-bezier(0.4, 0, 0.2, 1)` to Carbon's productive standard `cubic-bezier(0.2, 0, 0.38, 0.9)`. The duration is unchanged at 150ms. | **1** |
| 4 | The admin's reduced-motion block now zeroes `transition-delay` and `animation-delay`. A custom screen that relied on a delay surviving a reduced-motion preference loses it, which is the fix. | **1** |
| 5 | The edit page's preview pane no longer animates its width when the split changes. The resize snaps. | **6a** |
| 6 | The upload progress fill is painted by a `transform`-driven overlay rather than by the native `<progress>` fill transitioning `width`. The `<progress>` element itself stays, keeping its implicit `progressbar` role and its `value`/`max` mapping, so nothing changes for assistive technology. A site that styled `::-webkit-progress-value` on that element restyles the overlay. | **6a** |

**Line 1 is task 11's rather than task 4's, and the reason is stated.** It names all four rules, and
three tasks ship them (3, 4, and 8). A line written when the trio was incomplete would be false at the
moment it landed. Tasks 3, 4, and 8 each append a plain changelog entry for what they shipped, and
task 11 writes line 1 once, verbatim, when the whole rule set is in the tree.

**No export changes, so `check:surface` stays byte-identical.** That is narrower than it looks, and
the gap is named rather than discovered later: the `--cairn-dur-*` and `--cairn-ease-*` namespace is a
public contract with no export gate behind it, because `check:public-tokens` reads only the showcase's
public theme files and would never see an admin token. What holds it is
`src/tests/unit/admin-sheet-inventory.test.ts`, and task 1 owns that assertion.

---

## Gate

Derived at plan authoring from the committed `.github/workflows/`. The string is byte-identical to the
one polish-11b-i and polish-C both derived, because the committed workflows did not change between
those derivations and this one. **Re-derive it from the branch point before the first dispatch**, per
global constraint 3.

**The FULL string**, for the paint tasks (1, 6a, 6b, 7, 10). Run it through `cairn-run-gate '<string>'`,
in the worktree, with nothing else bound to port 4173.

```
npm run package && npm run check && npm test && publint --strict && attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs && node scripts/checks/reference-coverage.mjs && node scripts/checks/check-reference-signatures.mjs && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-self-use.mjs && node scripts/checks/check-custom-surface.mjs && npm run check:chassis-boundary && npm run check:cm-internals && npm run check:idioms && node scripts/checks/check-invisible-craft.mjs && node scripts/checks/check-admin-css-classes.mjs && node scripts/checks/check-readiness.mjs && npm run check:docs && npm run check:rulings-format && npm run check:target-stack && npm run check:arm-indexes && npm run check:editor-quotes && node scripts/checks/check-visuals.mjs && npm run check:transcripts && npm run check:symbols && node scripts/checks/check-snippets.mjs && npm run check:prose && npm run check:version && npm run check:dev-package && npm run check:template && node scripts/checks/check-consumers.mjs && npm run test:emit && npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test && npm --prefix examples/showcase run check && npm --prefix examples/showcase run test:unit && npm --prefix examples/showcase run format:check && npm run check:vale && npm run check:comments && CI=1 npm --prefix examples/showcase run test:e2e
```

**The CHECK-PLUS-UNIT string**, for the paint-neutral tasks (2, 3, 4, 8, 11), is the FULL string with
the trailing `&& CI=1 npm --prefix examples/showcase run test:e2e` removed. Nothing else is dropped.
That is the workstation's gate-economy rule: the slow suite runs only where it can catch something,
and the pass-end gate plus CI on every push run the full suite regardless.

**The reduced gate, for a comment-only fix round.** The `diff-reviewer` marks each blocking finding
`commentOnly` when its fix changes only comment or doc text and no code behavior. A fix round whose
findings are all comment-only runs `npm run check:comments && npm run check:symbols && npm run
check:docs` plus the touched files' own unit tests, and nothing else. The chains script routes on the
flag.

**Blast-radius scoping, stated once.** A task's inner test loop runs only its own target file with
`npx vitest run <path>`. `npm test` inside the gate string is the whole suite and is never scoped
down. Task 8's Files touch `src/lib/audit/rendered/` only, so its inner loop is the rendered-harness
tests plus its own rule fixture.

**It is the CI-derived list, not a shorter one.** It includes the six CI-only gates a local ritual
skips (`check:comments`, `check:surface`, `check:snippets`, `check:transcripts`, `check:symbols`,
`check:reference:signatures`), plus `check:rulings-format`, which is in neither `npm run check` nor
`npm test` and is the only gate over `engine-rulings.md`.

**What changed is the wrapper, not the list.** Twelve of the npm scripts chain `npm run package` as a
prerequisite, so the naive string builds the package thirteen times per run. The string above runs
`npm run package` once at the head and invokes each dependent check at its node entry point, in the
derived order, against the same artifact. Every check still runs.

**Left to CI, deliberately.** `design.yml` (`check:public-tokens`, `test:reskin`, the styleguide
e2e), `norms.yml`, `scaffold.yml` and `create-site.yml`, `tsgo.yml`, and `publish.yml`. Each needs a
clean checkout, a browser matrix, or a full pack that a per-task local loop cannot afford, and the
PR's own CI run clears them. Nothing merges on a red CI. **`design.yml` matters to this pass**, since
it moves admin CSS and component markup, so a red `design.yml` on the PR is a blocking finding for the
pass.

---

## Rollback and halt semantics

Every task ends with its gate string green and `check:surface` byte-identical, so the branch is
mergeable at each commit as far as the local gate goes. Merging additionally requires green CI, and
locally regenerated baselines are not canonical. The concrete halt states are three.

- **After task 4 and the chain-B merge:** mergeable. The tokens, the two bug fixes, the reconciliation,
  and the three static rules are in the tree, and nothing is wired to the gate yet, so the gate is
  green with the rules dormant.
- **After task 11 and the pass-end CI regen:** mergeable, and the intended end state.
- **Anywhere between tasks 6a and 10:** red on `e2e.yml` until a regen runs. A mid-run halt owes a
  `gh workflow run e2e.yml --ref admin-motion -f update_snapshots=true` and a pull before merge, and
  the run's accumulated `INTENDED MOVES:` declarations are the record of what is owed.

**One ordering dependency is load-bearing and a halt cannot violate it.** The shipped violations
convict on run one, so task 10 must land after tasks 6a, 6b, and 7. Task 10 is eighth in chain A and
those three are fifth, sixth, and seventh, so any halt that reaches task 10 has already passed them.

**A halt before task 10 leaves the gate green**, because the rules exist but `RULE_IDS` and
`CSS_FILES` are untouched. That is the cheapest place to stop and it is deliberate.

**A halt after task 8 but before the chain-B merge** leaves `admin-motion-8` unmerged. The branch
holds nothing chain A depends on, so it can merge later or be abandoned without touching chain A's
work. The rendered rule and its CI step would then be the cut the spec's Risks section already
names.

---

## Pass-end ritual

1. **`code-simplifier`** over the code this pass changed, before the final commits. Apply its
   refinements, then re-run the gate.
2. **The full gate** above, green, in one uninterrupted run, in the npm-script form so the wrappers
   are proven at least once before merge.
3. **The six CI-only gates** confirmed green inside that run: `check:comments`, `check:surface`,
   `check:snippets`, `check:transcripts`, `check:symbols`, `check:reference:signatures`.
   `check:surface` must still be byte-identical to `main`'s, since no task updates it.
4. **The from-scratch consumer build.** A fresh `npm install` in the worktree's
   `examples/showcase`, then `npm --prefix examples/showcase run build` and the e2e suite, so the
   proof is against this branch's components rather than `main`'s symlinked build.
5. **`design.yml` green on the PR.** This pass moves admin CSS and component markup, so the styleguide
   e2e and the public-token check are part of the merge evidence.
6. **The pass-end CI regen**, `gh workflow run e2e.yml --ref admin-motion -f update_snapshots=true`,
   covering tasks 1, 6a, 6b, 7, and 10, with the six new surfaces baselined for the first time. Pull
   the regenerated baselines and read the CI diff against every task's `INTENDED MOVES:` declaration.
   Up to 60 new files is expected; a moved file with no matching declaration is blocking.
7. **The fresh-context `visual-verifier`**, which must not be a context that built any of this work.
   It is bounded, and the bound is part of the ceiling.
   - **The before set, captured first**, at the pass's parent commit into
     `~/.cache/cairn-admin-motion/verify/before/`. The verifier is handed both sets as separate
     labeled blocks and never a composite.
   - **Where it runs:** inside `examples/showcase`, using that directory's own
     `node_modules/@playwright/test`, against the preview server the suite already starts on port
     4173 with the dev backend active. Nothing else may hold that port.
   - **How it captures, per route:** set the `cairn-admin-theme` cookie on the `baseURL` origin
     (`cairn-admin` or `cairn-admin-dark`), call `page.emulateMedia({ colorScheme })` to match, set
     the viewport with `page.setViewportSize({ width, height: 800 })`, navigate, wait on the route's
     own settling locator, and screenshot with `fullPage: true`. This is the idiom
     `examples/showcase/e2e/admin-visual.spec.ts` uses, and the reason the cookie rather than
     `emulateMedia` selects the SSR theme is recorded in that file's own comment.
   - **The widths:** 320, 390, 768, 1440, 2560, the family five-viewport bar. **Both schemes** at
     every width.
   - **The surfaces, cut to the spec's verification plan:** the edit page in zen, the drawer open as
     an overlay, the persistent sidebar, `DeleteDialog` open, the command palette open, and the media
     library with a selection. Six surfaces at five widths in both schemes is sixty captures per set.
   - **The read is bounded.** The verifier reads one above-the-fold tile per capture, plus the tiles
     the `## Admin motion` intended-moves rows name, and nothing else, with one verdict per visual
     device and COSMETIC or STRUCTURAL on each.
   - **The loop is bounded:** verify, fix, fresh verify. A second FAIL halts and is the conductor's
     decision, never a third round.
8. **The reviewer fan-out**, named per what this pass touches. No task dispatched any of these.
   - **`daisyui-a11y-reviewer`** over every markup and CSS change: `CairnAdminShell.svelte`,
     `EditPage.svelte`, `MarkdownEditor.svelte`, `CairnMediaLibrary.svelte`, `ConceptList.svelte`,
     `MediaHeroField.svelte`, `HelpHome.svelte`, and `cairn-admin.css`. It reads the upload progress
     overlay's preserved `<progress>` semantics, the dropzone's drag-over state on a coarse pointer,
     the modality gate's selector splits against keyboard focus on a touch device, and the
     reduced-motion policy against WCAG 2.2 and DaisyUI 5.
   - **`svelte-reviewer`** over the same `.svelte` files, reading for reactivity defects in the resize
     stopper's listener and teardown, the dropzone's `dragOver` state and its `relatedTarget` test,
     and zen's `flushSync()` focus sequence.
   - **`cloudflare-workers-reviewer` runs only if a worker file changes.** No task in this pass is
     planned to change Worker runtime code, a D1 query, or a binding, so the expected answer is that
     it does not run. The conductor checks the diff rather than assuming.
   - **`web-auth-security-reviewer` does not run.** This pass changes no auth path.
9. **Docs this pass owns**, confirmed present: `docs/internal/admin-design-system.md` (the Motion
   section), `docs/extend/animate-a-custom-screen.md` and its index entry,
   `docs/reference/cairn-audit.md` (three static rows, one rendered advisory row, the band correction,
   both prose counts), and `docs/internal/engine-rulings.md` (the new rows).
10. **`CHANGELOG.md` under `## Unreleased`**, finalized, carrying all six `Consumers must:` lines
    verbatim.
11. **`docs/HISTORY.md`** carries this pass's entry with its five do-not-rediscover items (task 11).
12. **`ROADMAP.md`** has "A motion language for the admin" closed and removed from the live tier, with
    the four follow-ups filed (task 11).
13. **The friction log** triaged whole in task 11, complete-or-move, never appended to.
14. **The intended-moves manifest** carries an `## Admin motion` heading whose rows account for every
    baseline this pass moved, verified by diffing
    `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` against `main` and matching each changed
    file to a row.
15. **The conductor writes `docs/STATUS.md`** at merge, never a task.
16. **Geoff merges.**
17. **The release cut, after the merge.** This pass is the last before the cut (decision 7), so the
    conductor runs the `cairn-release` skill once `admin-motion` is on `main` with CI green. Verify the
    next number is free with `npm view @glw907/cairn-cms versions --json` before promising it, set the
    number only at the cut, and cut with `gh release create v<x.y.z> --target main`, which fires the
    OIDC publish workflow. The release body is the changelog window since the last published tag,
    carrying **every** `Consumers must:` line in the window, this pass's six and polish-C's included.
    The window is a breaking one, so the scale the number signals is the whole accumulated window
    rather than this pass alone.

---

## Risks

The spec's six, then this plan's two.

- **The default curve change reaches everything.** Setting `--default-transition-timing-function` on
  the admin root repaints every bare `transition` utility in the admin and in every consumer's custom
  screens. It is a one-line change with repo-wide effect, it is the largest visual delta in the pass,
  and it lands in task 1 so the whole pass renders against it. **Mitigation:** the visual suite's six
  new surfaces plus the CI-canonical baseline regen, and `Consumers must:` line 3.
- **The shipped violations convict on run one.** The moment `cairn-admin.css` joins `CSS_FILES` and
  the new ids join `RULE_IDS`, `EditPage.svelte`'s preview frame and `MarkdownEditor.svelte`'s
  progress fill fire under `motion-property`, `cairn-admin.css:545` fires under `motion-vocabulary`,
  and `EditPage.svelte`'s feedback alert fires under `motion-band`. **Mitigation:** task 10 lands
  after tasks 6a, 6b, and 7, and the chain orders them that way explicitly. Task 10's Step 4 stops on
  a red gate rather than reaching for a suppression.
- **The per-rule root restriction is a gate mechanism that does not exist yet.** Without it the three
  new ids run over the showcase's public theme and the gate is red on landing for a reason the charter
  forbids. It is a task 10 deliverable rather than a config line, and it is the one place in the pass
  where a rule change requires a gate-script change. **Mitigation:** task 10's acceptance criterion is
  the paired run, one with the restriction removed producing showcase findings and one with it in
  place producing none, with `gap-scale`, `token-colors`, and `motion-band` keeping the full five-root
  scope in both.
- **The emulation axis is the one large item, for one advisory rule.** `runRendered` nests pages, then
  themes, then one context, then states, then one page, and `RenderedRule.check` takes one page with
  no mechanism to carry state between invocations. An axis above the context threads a new loop level
  through the runner, extends the rule declaration surface, and multiplies contexts. **Mitigation:** if
  it overruns, **the cut is the rendered half in its entirety**, which is all of task 8. The pass still
  delivers the token set, the three static rules, and the migration, which is the ruling's core.
  Cutting it cuts the delay bug's detection, never the delay bug's fix, which task 1 lands regardless,
  and the `admin-sheet-inventory.test.ts` assertion on the two delay declarations survives the cut.
  Task 8 is chain B and shares no file with chain A, so the cut is a branch nobody merges.
- **The vocabulary rule ships at error tier on a consumer's first upgrade.** A consumer with custom
  admin screens gets findings on run one. Advisory-on-first-adoption was considered and declined: tier
  is a property of the rule and cannot differ between cairn's gate and a consumer's run, every other
  static rule in the registry is error tier, and an advisory static rule would be a novel shape.
  **Mitigation:** the documented migration path, a suppression with a reason, carried by the recipe
  page task 11 writes.
- **A worktree showcase e2e proves `main`'s engine.** The showcase's `node_modules` symlinks back to
  the main checkout, so both `file:` deps resolve to `main`'s build. **Mitigation:** a from-scratch
  `npm install` in each worktree's `examples/showcase` is pre-dispatch step 4, and the pass-end ritual
  repeats it before the merge evidence is taken.

This plan's own two.

- **The workflow runner's cache is positional.** The chains script builds each task's implement and
  review prompt from the plan path, the task id, and the condensed criteria, and a resume replays
  unchanged step prompts while running changed ones live. Two consequences bite this pass. Editing the
  chains prompt or a task's criteria between resumes re-runs every earlier chain task live, which the
  2026-09-12 rulings record. And the task ids here are not contiguous (`6a`, `6b`, the retired `5` and
  `9`), so an args file that addresses tasks by array position rather than by the id string dispatches
  the wrong task section. **Mitigation:** the args file is written fresh for this pass, never copied
  from a polish stage's cache, with every id spelled as a string exactly as this plan spells it
  (`"1"`, `"2"`, `"3"`, `"4"`, `"6a"`, `"6b"`, `"7"`, `"8"`, `"10"`, `"11"`); the args are frozen at
  launch and edited only before the first launch of the run; and the retired ids 5 and 9 appear
  nowhere in the args.
- **The paint tasks' baseline count is the pass's largest artifact and its least reversible one.** Six
  new surfaces at five widths in two themes is up to 60 new CI-canonical baseline files, committed by
  the regen run, on top of whatever the five paint tasks move in the existing set. Three things make
  it risky. A baseline committed from this workstation would be locally biased and is forbidden, so
  every new file waits on CI. The standing gotcha applies after the regen: this workstation's Chromium
  renders some files a few pixels differently, so a local `CI=1 test:e2e` is green only when its sole
  visual failures are exactly the files the latest regen commit rewrote, and any other failure is a
  real red. And 60 new files is more than the twelve-tile verifier read can cover, so the verifier
  reads one above-the-fold tile per capture plus the tiles the manifest rows name, and the rest are
  covered by the intended-moves accounting rather than by eyes. **Mitigation:** task 10 declares the
  six new surfaces with their file count under `INTENDED MOVES:` rather than letting them appear
  silently; the pass-end regen diff is matched file to row; and a moved or created baseline with no
  matching row is blocking.

---

## What this pass hands forward

- **To the release cut, the whole window.** This pass is the last before the cut, so the cut carries
  the tokens and the rules, per decision 7. The release body is the changelog window since the last
  published tag, carrying this pass's six `Consumers must:` lines and polish-C's.
- **To the borrowable-patterns work (borrow-1 and borrow-2), five things.** The three static rules and
  the one rendered rule as the consumer-facing gates layer's first motion members;
  `docs/extend/animate-a-custom-screen.md` as the extend track's first per-pattern recipe, which the
  later `cairn-extend` skill routes to; the rendered half of `motion-hover-gate`, filed with its
  trigger; the `.tooltip` touch defect with the finding that closing it means gating the tooltip's
  visibility rather than its transition, which is a behavioral override of a vendor component and
  borrow-1's own decision; and the `.menu` gate with the same follow-up.
- **To any later pass, a Motion section that is canonical.** The recipe page cites it by heading
  rather than restating it, and both documents say so, so a later pass edits one place.
- **To a later pass, the `modal-bottom` reopen trigger**, carried as a `WATCH:` beside the recipe. If
  the admin adopts `modal-bottom` at narrow widths, a bottom sheet scales a full-viewport surface, the
  travel is then the viewport rather than 10px, and the declined `.modal-box` override becomes
  warranted.
- **To a later pass, the emulation axis**, which exists for one advisory rule today and is the
  mechanism a rendered hover or pointer rule needs.
- **To a later pass, the theme-flip cross-fade precedent.** The showcase's public theme ships the
  pattern the cut theme-change row described, so a pass that wants it in the admin has a working
  precedent to port and a `Consumers must:` line to write.
- **To any later pass, the five things this pass measured that a plan should not re-derive**, all
  recorded in task 11's HISTORY entry: that `scopeReport` filtered by rule id alone until this pass;
  that `isReducedMotionGuarded` treated the inverse gate as a guard; that a reduced-motion restatement
  ties the blanket block on specificity and is decided by source order; that `signature(el)` names a
  class of elements rather than an element; and the factor by which the emulation axis multiplies
  rendered contexts.

---

## Post-mortem

The `cairn-pass` ritual appends the post-mortem here at pass close, scoring both budgets against the
ceiling and the interaction counts.
