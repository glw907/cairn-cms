# Admin Motion Language Pass Implementation Plan (the motion pass, after polish-C, before the cut)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with TWO chains, launched as ONE workflow run; see
> Execution. Steps use checkbox syntax for tracking. Every anchor is re-verified at dispatch
> against the branch HEAD, per the Reconciliation block below.

## Fold (2026-09-13)

Draft 1 of this plan and revision 2 of the spec went to three adversarial reviews: a
contract-and-criteria lens (18 ranked changes), a mechanics-and-feasibility lens (16), and a
domain-risk lens (15). Every ranked change from all three is applied, here and in the spec. Six items
had two lenses disagreeing, and each is resolved on the standing rule that **the domain lens wins on
safety and the mechanics lens wins on executability**.

1. **The resize stopper is cut** (domain D1, mechanics R1). Domain showed the specified form is a
   no-op, because a class on the bare theme wrapper never matches the scoped sheet and transition
   properties do not inherit, and its working form is an unlayered rule. Mechanics measured the
   components layer at 19 selectors against a cap of 19, so the specified form had no room. Safety
   wins: the stopper leaves the pass as a documented limitation plus a ROADMAP Later entry, task 6b
   keeps the dropzone alone, and **no new `@layer components` rule is added anywhere in this pass**,
   so the cap is untouched and `custom-surface-budget.json` stays out of every diff.
2. **The vendor exemption reaches `motion-property`'s class join** (domain C1, mechanics 9). Domain
   measured four DaisyUI classes transitioning snap-list properties, one of them on cairn's own
   shell. Mechanics showed `conditions` cannot discriminate DaisyUI's layer output from cairn's own.
   Executability decides the discriminator: the exemption tests the compiled declaration's source
   rule, and falls back to an explicit DaisyUI class-name list shipped with the rule.
3. **The zen transition is authored in `cairn-admin.css`** (domain D2, mechanics 5 and 6, contract 2).
   All three found that `CairnAdminShell.svelte` carries no `<style>` block, no `margin-left`, and no
   `setZen()`. Executability decides: `cairn-admin.css` is the only file a `.drawer-content` selector
   can live in, the exception is keyed on that file, and `setZen()` is at `EditPage.svelte:441`.
4. **The upload fill keeps the native `<progress>` and loses its motion** (domain A3, against
   contract 7's request for an overlay criterion). Safety wins: the widget is recreated per tick, so
   no transition can apply, and the changelog line says what ships.
5. **The hover gate's predicate widens and its migration is dropped** (domain A1, A2). The two
   shipped exemplars are paint rules, so the narrow predicate was vacuous and the mandated selector
   splits were an unrequested paint change.
6. **Consumer scope is answered in the audit, not the gate** (domain C2 and C5, mechanics 10). The
   rules declare `adminOnly`, the audit config carries the roots it resolves over, and the gate sets
   those roots to its own tree, so a consumer gets the charter boundary from the default and the
   showcase's one consumer-shaped admin screen is dogfooded rather than dropped. The Fold correction
   below is the mechanism in full.

Two consequences carry beyond the six. The vendor property exemption records four more disagreements,
so the count is **eleven**, not seven, everywhere it appears. And the dropzone's drag-over paint takes
`base` rather than `instant`, because it rides the element's existing `transition-colors`.

The task count is unchanged at ten and the chain order is unchanged. What moved between tasks: the
two zen layout-count assertions go from task 10 to task 7, and the reproduction-manifest entry is cut
from task 10 entirely.

### Fold correction (2026-09-13)

A review of the folded pair escalated one item, and the conductor ruled it. **The admin boundary is
one mechanism, not two.** The fold left the rule-level `adminOnly` flag and a path term inside the
gate's own `scopeReport` standing side by side, and the two contradict each other: `scopeReport`
filters a report `runStatic` has already produced, so a path term there can only subtract, and it can
never restore a root the flag excluded. Under the fold as written, tasks 6a, 6b, and 7's shared
zero-findings criterion was vacuous and task 10's paired-run criterion was unsatisfiable. The
mechanism is now this, and nothing else:

- A static rule declares `adminOnly: true`. The field is new and optional on the static rule type,
  and `./audit` is not a package export subpath, so no package surface moves.
- The audit config gains an optional `static.adminScope` root list, a new consumer-facing config key,
  defaulting to `src/routes/admin` and `src/lib/admin-toolkit`.
- `runStatic` resolves an `adminOnly` rule over `static.adminScope` alone and every other rule over
  `static.scope` as today, across both surfaces a rule reads: the components under those roots, and
  the `static.cssFiles` entries that lie inside them.
- The engine's gate (`scripts/checks/check-invisible-craft.mjs`) sets `static.adminScope` to
  `src/lib/components`, `src/lib/admin-toolkit`, and `examples/showcase/src/routes/admin` when it
  builds its config. **`scopeReport` does not change**, the path term is dropped entirely, and its
  second caller, `check-admin-css-classes.mjs`, is untouched.

Task 3's claim that the boundary "costs no public surface" is amended: it costs one config key,
documented in `docs/reference/cairn-audit.md` and in the recipe page. Task 3's Step 0 assertion, task
10's failing assertion, and the three migration tasks' zero-findings criterion all name this one
mechanism, which is what makes the last of them real.

Five smaller corrections ride with the ruling. Task 6a's `npx cairn-audit --static` names a flag the
bin does not parse (`src/lib/audit/config.ts:241-274`), and becomes `npx cairn-audit --config <path>`
against a task-local config whose contents the task names. Task 6a's third deliverable and Step 4 are
reconciled with the spec's migration table: of the three `duration-[250ms]` sites, only
`EditPage.svelte:1643` takes the token form, `:2047` is removed outright, and `:1428` drops its
duration class to ride the theme default. Task 11 gains a numbered step that writes `Consumers must:`
line 1, which its criteria already required of it. The unfold flash's token is `base`, which the
spec's case table carried and this plan now states. And the pass-end `svelte-reviewer` brief loses
its resize-stopper clause, since the stopper is cut.

Three consequential edits follow from those. The `daisyui-a11y-reviewer` brief reads the upload
progress **bar**'s preserved `<progress>` semantics, since the overlay is cut too. Task 10's Files
drop from five to three, because `audit-gate.mjs` and `check-admin-css-classes.mjs` are no longer
touched, and task 3's rise from seven to eight for `config.ts`. And task 10's conditional over
`src/tests/unit/audit-gate.test.ts` is dropped: the file exists on `main`.

One disclosure joins the fold's two judgment calls, per the reviewer's finding: leaving
`editor-folding.ts`'s `FLASH_MS = 400` untouched was a third call the fold made on its own. The
constant is the timer that removes the flash class; the CSS transition is what paints the fade; the
two are independent, so the token migration does not reach the constant.

**A second review of the corrected pair escalated three more, and the conductor ruled them.** All
three follow from the one mechanism rather than reopening it.

- **Task 10's paired run gets a control arm that can produce findings.** With the boundary resolved
  inside `runStatic`, removing the gate's key does not widen the three rules, it narrows them to the
  key's default, so both arms of the old pair returned nothing and the pair proved nothing. The
  instrument is now a control arm with the gate's `static.adminScope` set to the five `SCAN_SCOPE`
  roots, which produces the showcase theme and chassis findings, against the shipping arm with the
  three admin roots, which produces none. `gap-scale`, `token-colors`, and `motion-band` keep the
  full five-root scope, proved by their finding counts being equal in both arms. Task 10's Step 4,
  its acceptance criteria, its counts bullet, and the pass's risk register all name that one
  instrument, and so does the spec's risk entry.
- **The no-key failure mode is under-coverage, not a red gate.** Without the gate's key the three
  rules resolve over the consumer default, which in this tree reaches `src/lib/admin-toolkit` alone
  and never `src/lib/components/cairn-admin.css`, where the shipped declarations and the zen
  exception live. The gate would be green over almost none of the admin frame. Task 10's Step 2
  assertion, a `motion-property` finding from a `src/lib/components` fixture under the gate's config,
  is the proof against it.
- **The key's default names one absent root, not two.** `src/routes/admin` is absent from this tree,
  which has no `src/routes` at all; `src/lib/admin-toolkit` exists and is the second entry of
  `SCAN_SCOPE`, covering part of the admin frame. Corrected in the plan and in both places the spec
  said it.

Three smaller items ride with those. **`static.adminScope` follows `static.scope`'s existence rule
exactly**, a config-named root that is missing throwing and a default root that is missing being
skipped, so a consumer at the default sees `src/routes/admin` skipped when absent and the gate's
three named roots must all exist; task 3 states it, asserts both halves in
`src/tests/unit/audit/run.test.ts`, and carries the parallel configured-versus-default flag. **The
gate exports its root list as `ADMIN_SCOPE`**, beside `SCAN_SCOPE` and `CSS_FILES`, so task 10's test
and the gate read one name. And three fixture corrections: task 3's Files rise from eight to nine for
`run.test.ts`, whose shared `beforeAll` root gains a `src/lib/components` fixture; task 10's Step 2
temporary root carries all five `SCAN_SCOPE` roots, both `CSS_FILES` entries, and a `dist` sheet,
since a configured root or CSS file that is missing throws; and task 6a's task-local config gains
`static.paletteFiles`, so the hand run carries no `token-colors` noise from the showcase theme.

---

**Goal:** the admin's motion written as a language, shipped as five duration and three easing tokens
the admin sheet carries, enforced as three error-tier static `cairn-audit` rules and one advisory
rendered rule a consumer runs on its own screens with no configuration, with the two shipped
reduced-motion bugs fixed, the seventeen shipped motion declarations migrated onto the tokens, zen's
offset and chrome given the one documented exception, and the result handed to the borrowable-patterns
work as the extend track's first per-pattern recipe.

**Spec:** `docs/superpowers/specs/2026-09-13-admin-motion-language-design.md`, revision 2 as folded
2026-09-13, whole. Its own Fold section governs where it conflicts with its Revision 2 section. Its
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

**6.7M**, re-derived after the fold. Every line item is named rather than folded into a band.

| Line item | Basis | Tokens |
|---|---|---|
| Five paint-neutral task chains (2, 3, 4, 8, 11) | 500K each. Four of the ten tasks author a `cairn-audit` rule with a fixture suite, the widest per-task read in the repo: the rule, the shared predicates in `motion.ts`, the `CompiledSheet` and `ClassToken` substrate, and the two existing fixture suites | 2.5M |
| Five paint task chains (1, 6a, 6b, 7, 10) | 440K each. The paint premium is a capture pair, a produced moved-baseline list, and a tile read; the fold cut the pair from six surfaces to two, which is where the reduction comes from | 2.2M |
| Re-dispatch reserve | two fix rounds forecast, each a second implementer dispatch plus a second Opus review. `maxFix: 1` makes one round per task the mechanism's own cap | 0.6M |
| Pass-end `visual-verifier` | chassis-B1's measured rate over the bounded full capture set, which the fold keeps at six surfaces | 0.5M |
| Reviewer fan-out | `daisyui-a11y-reviewer` and `svelte-reviewer`, plus `code-simplifier` over the pass's commits | 0.6M |
| Conductor CI regen waits and the baseline read | the pass-end regen over 60 new files plus whatever moves, and the diff read against the `INTENDED MOVES:` declarations | 0.3M |
| **Total** | | **6.7M** |

500K per paint-neutral unit is the upper half of the risk lens's measured band for this repo, 370K to
530K over the comparable passes (conventions 4a about 530K, conformance 4b about 430K, internals about
400K, chassis-A about 367K). The upper half rather than the middle is the right pick for the rule
tasks, whose read is the widest in the repo. 440K for a paint task is the same band's midpoint plus a
two-surface capture pair.

The repo's recorded overrun history is four for four on the last comparable passes
(`docs/HISTORY.md`). At 80 percent of the ceiling (5.4M) the conductor finishes the task in flight,
writes STATUS, and asks one combined question.

**Checkpoint interval:** every four tasks. The workflow run is one blocking call, so a checkpoint is
where the conductor writes STATUS **after the run returns**, not a pause inside it: the ledger names
the state at chain A's fourth and eighth completed tasks, and the pass close is the third write. Each
writes the task ledger, the decisions taken, the spend against the ceiling, and the next task.

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
the same commit.

**The chain-B merge happens at the pass-end ritual, not mid-run.** `main()` runs `parallel(...)` over
the chains and returns only when every chain has finished; `runChain` is a plain sequential loop with
no mid-run hook. So the conductor regains control after task 11 and not before, and a mid-run merge
into chain A's worktree would contradict the runner's own "you are the ONLY writer in this worktree"
instruction besides. Three instructions follow from that and are stated here once: the chain-B merge,
both STATUS writes, and the PR open are all pass-end ritual steps. Chain B holds nothing chain A
depends on, so the deferral costs nothing.

**The runner's arguments, stated so the args file is written rather than guessed.** The top-level
`args.gate` default is the CHECK-PLUS-UNIT string under "## Gate"; every task also carries its own
`gate`, and the five paint tasks carry the FULL string. `chain.repo` is the worktree path column
above. `maxFix` is set explicitly to `1`, so the mechanism's own cap is one fix round per task rather
than the default applied ten times, and the ceiling's two-round reserve is a forecast inside that
cap.

**Tasks 3 and 4 are serialized inside chain A, and the reason is stated rather than implied.** Both
register a rule in `src/lib/audit/rules/static/index.ts`. The spec's revision 1 claimed they shared no
files and the adversarial review corrected it. Parallel worktrees would collide on the registry every
time, so one chain owns 2, then 3, then 4, in that order.

**Task 8 shares no file with any chain-A task.** Its subjects are `src/lib/audit/rendered/types.ts`,
`rendered.ts`, `rendered/page-surface.ts`, the rendered rule and the rendered registry, its own test
files, and `.github/workflows/norms.yml`. Chain A touches none of those, verified file by file.
**Task 10 does not depend on task 8 in code**: task 10 wires the three static ids and the rendered
rule's own CI step is task 8's deliverable, so the relationship is merge order alone. Task 10 proceeds
whatever chain B is doing.

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
4. Run `npm install` at the **root** of each worktree, then a from-scratch `npm install` in each
   worktree's `examples/showcase`. A fresh `git worktree` checkout has no root `node_modules/`, so
   `svelte-package`, `vitest`, `publint`, `attw`, `eslint`, and `playwright` are all absent and the
   first task's gate dies on command one. The showcase half is separate and equally necessary: a
   worktree's `examples/showcase/node_modules` symlinks back to the main checkout and resolves both
   `file:` deps to `main`'s build, so without the reinstall the e2e and the showcase checks prove
   `main`'s engine rather than this branch's.
5. Write the pass's slice number into `docs/STATUS.md` in the same commit as the plan. The conductor
   owns `docs/STATUS.md`; no task edits it.
6. **Arm the unattended-work guards.** Ten gate-bearing tasks, five of them carrying the showcase
   e2e, is long unattended work by the workstation rule. Arm the runaway transcript watcher and, on
   battery, `systemd-inhibit --what=sleep` plus the battery watchdog, per
   `~/.claude/docs/unattended-work-guards.md`, which is read before either is armed.

The PR opens at the pass-end ritual, not after task 1. No implementer pushes; the runner's prompt
orders commits, and the conductor regains control only when the workflow returns.

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
| `src/tests/unit/reproductions-manifest.test.ts` (the frozen id list) | **Task 12 removes `'toolkit/custom-screen'` and rewrites the count** | **No motion task.** The zen reproduction entry is cut from task 10, so this pass neither reads nor writes the frozen list | Recorded as checked. Neither this file nor `src/lib/reproductions/manifest.ts` is in any task's Files |
| `src/lib/admin-toolkit/OfficeList.svelte` | **Task 12 deletes it** | Tasks 3, 4, and 10, since `src/lib/admin-toolkit` is in both `DEFAULT_STATIC_SCOPE` and the gate's `SCAN_SCOPE` | The rules run over whatever the directory holds at dispatch. No task pins a file count in that tree |
| `src/lib/components/LoginPage.svelte`, `ConfirmPage.svelte` | **Task 8 renames the outcome types** and edits the branch sites | Task 6a reads both as case-table rows ("Login and confirm pages, no motion of their own") | Re-verify the "no motion" reading by grep for `transition` and `animate-` in both files, rather than trusting the case table's dash |
| `src/lib/audit/rules/rendered/viewport-overflow.ts:20`, `weight-budget.ts:58` | **Task 12 rewrites two rule comments** naming `OfficeList` | Task 8 edits `src/lib/audit/rules/rendered/index.ts` | Neither file is task 8's. The row records the adjacency as checked |
| `docs/internal/admin-design-system.md` | **Tasks 1 and 12 rewrite passages**, including the F3-rhythm bullet near `:477-480`; polish-11b-i already inserted a busy recipe above it | Task 11 adds the Motion section | Locate by section heading and quoted phrase. Never by line |
| `docs/internal/engine-rulings.md` | **Task 13 annotates every row whose subject the window renames** and supersedes `audit-admin-officelist` with a new full-format row | Task 11 writes new rows | Place by reading the file's own ordering. Never by a line number from this plan |
| `docs/extend/add-a-custom-admin-screen.md` and `docs/extend/README.md` | **Task 1 rebuilds the custom-screen example**; task 14 reconciles the consumer list | Task 11 adds `docs/extend/animate-a-custom-screen.md` to the index | Read `docs/extend/README.md`'s index whole and insert in its own ordering |
| `CHANGELOG.md`'s `## Unreleased` block | **Task 14 reconciles the whole window** and task 15 derives release readiness | Every task appends beneath it | This pass appends beneath whatever polish-C left and reconciles nothing above its own entries |
| `src/tests/unit/fixtures/admin-sheet-inventory.txt` | **Task 12 deletes the line `gap-0`** | Tasks 6a, 6b, and 7 each change the shipped class inventory and regenerate the fixture | Never hand-edit it. Write the `CHANGELOG.md` line first, then run `npm run update-admin-sheet-inventory`, then read the diff and account for every line |
| `docs/extend/migration-notes.md` | **Task 14 rewrites its whole `## Unreleased` section** from `:12` | Task 11 adds this window's entry | Read the `## Unreleased` section whole and append inside polish-C's ordering |
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
| `scripts/checks/custom-surface-budget.json` `componentsLayerCap` | `19` at `:27`, and `componentsLayerSelectorCount(cairn-admin.css)` measures **19**. The spec's revision-2 "headroom at 19" claim was false | Confirmed, and it is why the resize stopper is cut. **No task adds an `@layer components` rule**, so the count stays 19 and the file stays out of every diff |
| `examples/showcase/e2e/admin-visual.spec.ts:7` (`SIGNUPS_WIDTHS`) | `const SIGNUPS_WIDTHS = [320, 390, 768, 1440, 2560];` at `:7` | Confirmed. Task 10 adds six surfaces across the same bar |
| `examples/showcase/scripts/capture-surfaces.mjs` `WIDTHS`, `SCHEMES`, `SURFACES` | `WIDTHS = [320, 390, 768, 1440, 2560]` at `:39`, `SCHEMES = ['light', 'dark']` at `:40`, `const SURFACES` at `:60` | Confirmed. The matrix is `home`, `article`, `styleguide`, `archive2`, `error404`, `signups`. Locate `SURFACES` by grep, since chassis-B2 already landed an addition above it |
| The static rule registry | `src/lib/audit/rules/static/index.ts`, 34 lines. Sixteen files in the directory: `index.ts`, twelve rule modules, and three helpers (`css-scope.ts`, `motion.ts`, `utility.ts`) | Confirmed with the count corrected. Tasks 3 and 4 both write here |
| The rendered rule registry | `src/lib/audit/rules/rendered/index.ts`, seventeen files in the directory, sixteen beside `index.ts` | Confirmed with the count corrected. Task 8 writes here |
| `src/tests/unit/admin-sheet-inventory.test.ts` and `admin-css-build.test.ts` | Both exist | Confirmed. Task 1 reads and extends them |
| The admin theme roots | `[data-theme='cairn-admin']` at `cairn-admin.css:81` and `[data-theme='cairn-admin-dark']` at `:255`; `scripts/build/admin-css.input.css` declares neither and has no `@theme` block | Confirmed. Task 1's tokens go in the two existing blocks |
| The zen offset's authoring site | `CairnAdminShell.svelte` has **no `<style>` block**, no `margin-left`, and no `setZen()`. Today's offset is `class:lg:ml-56` and `class:xl:ml-56` at `:692-693`; `setZen()` is `EditPage.svelte:441`; `class="drawer-side"` is at `:949` | Corrected against the spec's revision 2. Task 7 authors the transition in `cairn-admin.css` and task 3 keys the exception there |
| `scopeReport`'s second caller | `scripts/checks/check-admin-css-classes.mjs:35` calls `scopeReport(runStatic(loadConfig(ROOT)), RULE_IDS)` | Confirmed. Per the Fold correction, `scopeReport` keeps its signature and this call site is untouched by the pass |
| `.github/workflows/norms.yml:51-56` | `VITE_CAIRN_E2E=1` build, then detached `CAIRN_DEV_BACKEND=1 … run preview -- --port 4173` with a 60-try readiness poll on `/admin/posts` | Confirmed. Task 8's step copies the recipe with its own port |

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
- **Neither half of the custom-surface budget grows.** No task adds an `unlayeredAllowlist` entry and
  **no task adds an `@layer components` rule**, so `componentsLayerSelectorCount` stays at 19 against
  its cap of 19. `scripts/checks/custom-surface-budget.json` is in no task's diff, and tasks 6a, 6b,
  and 7 each carry that as an acceptance criterion. The cut resize stopper is the one thing that
  would have needed either, which is part of why it is cut.
- **`check:surface` stays byte-identical.** The pass changes no public export. No task runs
  `check-surface.mjs --update`, and `docs/internal/api-surface.md` is in no task's diff.
- **The `--cairn-dur-*` and `--cairn-ease-*` namespace has no export gate behind it.**
  `check:public-tokens` reads only the showcase's public theme files and would never see an admin
  token. What holds the namespace is `src/tests/unit/admin-sheet-inventory.test.ts`, and task 1 owns
  that assertion.
- **No new `@layer components` rule and no CSS rule for the dropzone.** The drag-over paint toggles
  utility classes the element already carries `hover:` variants of, so it costs a class in the built
  sheet and no rule at all.
- **No task dispatches a subagent.** `cairn-implementer` carries Read, Write, Edit, Bash, Grep and
  Glob and no Agent tool, so a step ordering a reviewer dispatch can only halt the chain, be skipped
  silently, or produce fabricated evidence. Every reviewer runs at the pass-end fan-out, and no
  acceptance criterion names a reviewer's report. Acceptance is tests, greps, counts, and the diff.
- **A task's Files count excludes `CHANGELOG.md` and the intended-moves manifest**, which every task
  carries and which would otherwise inflate every count by the same two. The count is the distinct
  source paths the task creates or modifies, and each is listed.
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
- **The one exception is keyed on the triple**, the engine-owned file
  (`src/lib/components/cairn-admin.css`, or its `dist` equivalent) plus the `.drawer-content` selector
  plus `margin-left`. Keying on the selector alone would hand the licence to any consumer element
  named `.drawer-content`, which is DaisyUI's own class name. The file is the admin sheet rather than
  the shell because the shell carries no `<style>` block, so no `.drawer-content` rule can come from
  it.
- **No paint opts back in under reduced motion this pass.** The permission stands for a consumer;
  cairn takes none of it, because `check-custom-surface.mjs:158` compares the unlayered rule list to
  the allowlist by length, so nine restatements would cost nine allowlist entries in a budget whose
  stated direction is zero. Every "Opts back in" cell in the case table reads "Snaps to the new paint".
- **The eleven vendor disagreements are recorded rather than fixed** (decision 4). Seven over timing,
  curve, or modality: `.btn` press timing, `.modal` timing and its `scale: .98`, `.drawer` overlay
  timing, `.collapse`'s `transition-property: all`, `.drawer` at the breakpoint flip, `.tooltip`'s
  ungated `:hover`, and `.menu`'s ungated `:hover`. Four over property, which the vendor exemption on
  `motion-property`'s class join records instead of convicting: `.drawer-side` transitioning `width`,
  `.filter input` transitioning `margin`, `padding`, and `border-width`, `.collapse ::details-content`
  transitioning `min-height`, `padding`, and `height`, and `.toggle:before` transitioning
  `inset-inline-start`. The `.modal-box` scale override is declined, with `modal-bottom` adoption as
  its reopen trigger.
- **Two new behaviors only**, and nowhere else: the zen offset and the dropzone's drag-over paint
  state. Every other transition the pass touches is a migration of a declaration that ships today. The
  resize stopper revision 2 named as a third is cut, filed to ROADMAP's Later tier with the finding
  that its working form costs an unlayered rule, and stated as a limitation in the design system.
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
4. **One port-4173 slot per machine.** `examples/showcase/playwright.config.ts` pins port 4173 with
   `reuseExistingServer: !process.env.CI`, and `examples/showcase/scripts/capture-surfaces.mjs:33`
   hard-codes the same port and starts its own preview server, so every paint task's capture steps
   hold the slot as well as its e2e, and so does the pass-end `visual-verifier`. The workstation rule
   is that a shared port travels as an environment variable; both call sites hard-code it, so this
   pass substitutes a scheduling argument instead, and the argument holds only because **chain B runs
   no e2e and captures nothing**. Never run this pass's e2e or its captures beside another pass's.
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
13. **Which paint branch a task takes follows capture REACH, and the pair is cut to the surfaces the
    change can reach.** `capture-surfaces.mjs`'s matrix is `home`, `article`, `styleguide`,
    `archive2`, `error404`, `signups`. `CairnAdminShell` wraps `/admin/signups` and `cairn-admin.css`
    styles it, so **a task that changes `CairnAdminShell.svelte` or `cairn-admin.css` takes the
    capture-pair branch**, even when its change is expected to be paint-neutral, because the pair is
    what proves the neutrality. **A per-task pair covers `signups` and `styleguide` only.** The other
    four are public surfaces that global constraint 6 forbids touching and `git status` already
    enforces, so capturing them five times over is a thousand captures of restated proof. The
    pass-end `visual-verifier` runs the full set. A task that touches only admin screens the capture
    tool cannot reach captures nothing, and its evidence is the produced `MOVED BASELINES:` list plus
    the regenerated `-linux.png` files. A task that touches no rendered file captures nothing and
    proves it by `git status`.
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
bulk.** Task 10 adds six surfaces the suite has never rendered, so exactly 60 baseline files come
into existence with no before to compare against. A brand-new baseline carries no `TILE DIFF:` row, because
there is nothing to diff; it is declared under `INTENDED MOVES:` as a new surface with its count, and
it is read by the pass-end `visual-verifier` rather than by a diff.

**Which branch each task takes, ruled here by capture reach.**

| Task | Subject | Branch | Capture surfaces and widths |
|---|---|---|---|
| 1 | `cairn-admin.css`, `admin-css.input.css`, `motion.ts`, two unit suites | **Capture pair.** The sheet styles `signups` | `signups` and `styleguide`, both schemes, 320 / 390 / 768 / 1440 / 2560. The theme-default curve change repaints no resting frame, so AE 0 on both is the expected leak proof, and the runtime computed-style assertion is what actually proves the change |
| 2 | three audit rule modules and two fixture suites | No rendered surface. `git status` is the proof | none |
| 3 | two new audit rule modules, the static rule type, the registry, two fixture suites | No rendered surface | none |
| 4 | one new audit rule module, the registry, one fixture suite | No rendered surface | none |
| 6a | seven admin components, `editor-folding.ts`, `cairn-admin.css`, the sheet inventory fixture | **Capture pair.** The shell and the sheet both reach `signups` | `signups` and `styleguide`, both schemes, the five-viewport bar. `signups` is the surface that can genuinely move; `styleguide` is the leak proof |
| 6b | `MediaHeroField.svelte`, its component test, the sheet inventory fixture | **Capture pair**, same reach | `signups` and `styleguide`, both schemes, the five-viewport bar. The drag-over state is state-triggered, so AE 0 at rest is the expected result |
| 7 | `cairn-admin.css`, `CairnAdminShell.svelte`, `EditPage.svelte`, `admin-visual.spec.ts`, the sheet inventory fixture | **Capture pair**, same reach | `signups` and `styleguide`, both schemes, the five-viewport bar. Zen is not a resting state on either, so AE 0 at rest is the expected result |
| 8 | rendered harness, one rendered rule, `.github/workflows/norms.yml` | No rendered surface | none |
| 10 | `check-invisible-craft.mjs`, `audit-gate.mjs`, `check-admin-css-classes.mjs`, `admin-visual.spec.ts`, the gate test | **Capture pair**, since the gate's own run reaches the showcase | `signups` and `styleguide`, both schemes, the five-viewport bar, plus the six NEW admin surfaces at 320 / 390 / 768 / 1440 / 2560 in both schemes, which are new baselines rather than moved ones |
| 11 | docs and records | No rendered surface | none |

---

## Task 1: The token set, the theme defaults, and the two shipped bugs

**Chain:** A, first. **Paint:** yes. **Depends on:** nothing. **Independent.**

**Deliverables: four.** The eight tokens on both theme roots with the two Tailwind theme defaults
pointed at them, the reduced-motion block's two delay declarations, the `no-preference` guard fix with
its fixture move, and the three proofs (source order, the authoring form, and the runtime default).

**Files (6, 3 of them tests):**
- Modify: `src/lib/components/cairn-admin.css` (the token authoring site, in the two existing
  `[data-theme=…]` blocks near `:81` and `:255`, plus the blanket reduced-motion block near `:1115`),
  `scripts/build/admin-css.input.css` (only if the measured Tailwind-defaults authoring form needs a
  `@theme` block there; the task reports whether it touched the file),
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
- **The tokens go into `cairn-admin.css`'s two existing `[data-theme=…]` blocks**, at `:81` and
  `:255`. `scripts/build/admin-css.input.css` declares no theme root and no `@theme` block, so there
  is no structure there to author them into, and adding declarations to a rule that already ships
  costs no `unlayeredAllowlist` entry, since the check compares whole-rule selector sets.
- `--default-transition-duration` is set to `var(--cairn-dur-base)` and
  `--default-transition-timing-function` to `var(--cairn-ease-standard)` on the admin root. The
  duration half is a rename, since today's default is `.15s`, which is already Carbon's
  `duration-moderate-01`. The easing half is a real change and is the pass's largest visual delta.
- **The defaults are Tailwind's and are declared inside `@layer theme`**, so overriding them takes an
  unlayered restatement on the same two roots, which outranks the layered declaration, or a `@theme`
  block if the build accepts one on those roots. The task measures which form the build produces and
  reports it verbatim, before it writes the rest, because task 4's vocabulary rule is specified
  against the compiled result.
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
  This task takes the capture-pair branch, over `signups` and `styleguide`.
- [ ] **Step 2: the failing assertions first, in `admin-sheet-inventory.test.ts`.** Assert that the
  built sheet declares all eight token names with their exact values on both admin theme roots, and
  that the reduced-motion block declares `transition-delay: 0s !important` and
  `animation-delay: 0s !important`. Run the file and watch both fail with the tokens absent and the
  delays absent.
- [ ] **Step 3:** author the eight tokens into `cairn-admin.css`'s existing `[data-theme='cairn-admin']`
  and `[data-theme='cairn-admin-dark']` blocks, then point `--default-transition-duration` and
  `--default-transition-timing-function` at `var(--cairn-dur-base)` and `var(--cairn-ease-standard)`
  in whichever form the build honors. Try the unlayered restatement on the same two roots first and
  the `@theme` block second, report which one the built sheet carries, and say whether
  `admin-css.input.css` was touched. Rebuild and watch the token assertion pass.
- [ ] **Step 4:** add the two delay declarations to the blanket block at `cairn-admin.css`'s
  reduced-motion `@media`. Rebuild and watch the delay assertion pass.
- [ ] **Step 5: the failing assertion for the source-order proof.** Add an `admin-css-build.test.ts`
  assertion that a class-bearing restatement placed after the blanket block inside the same
  `@media (prefers-reduced-motion: reduce)` guard appears later in the built sheet than the blanket
  block's own rule, and an assertion that the chosen Tailwind duration authoring form compiles to a
  `var(--cairn-dur-` reference rather than to a millisecond literal. Watch them fail, then make them
  pass, and report the exact authoring form measured.
- [ ] **Step 5b: the runtime proof of the curve change.** Add an assertion that reads the computed
  `transition-duration` and `transition-timing-function` on an element under each admin theme root
  and gets the token values, not Tailwind's `.15s` and `cubic-bezier(.4, 0, .2, 1)`. A resting frame
  carries no curve, so this assertion is the pass's only evidence for its largest visual delta, and
  it is a deliverable rather than a nicety.
- [ ] **Step 6: the failing assertion for the guard fix.** In `reduced-motion.test.ts`, assert that a
  rule declaring motion inside `(prefers-reduced-motion: no-preference)` is NOT treated as guarded.
  Watch it fail. Then narrow `isReducedMotionGuarded` in `motion.ts` so only the `reduce` form counts,
  and move the existing fixtures that depended on the old reading.
- [ ] **Step 7:** capture the after set over `signups` and `styleguide`. Run the visual suite
  unmodified to PRODUCE `MOVED BASELINES:`, declare `INTENDED MOVES:` (the expected declaration is
  none, since a resting frame carries no curve), regenerate any moved baseline locally by file path,
  and append the manifest rows under `## Admin motion`. Report `TILE DIFF:` per captured surface.
  Append the two `CHANGELOG.md` lines this task owns. The full gate through `cairn-run-gate`. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/admin-sheet-inventory.test.ts` passes, and the file asserts **all
  eight** token names with their exact values on both theme roots.
- `grep -c "cairn-dur-\|cairn-ease-" src/tests/unit/admin-sheet-inventory.test.ts` returns at least 8.
- The built sheet's reduced-motion block declares both `transition-delay: 0s !important` and
  `animation-delay: 0s !important`, asserted in `admin-sheet-inventory.test.ts` by name.
- `npx vitest run src/tests/unit/admin-css-build.test.ts` passes, with one assertion proving the
  source-order relationship, one proving the Tailwind duration authoring form compiles to a token
  reference, and one reading the computed `transition-duration` and `transition-timing-function` on
  each admin theme root and getting `150ms` and `cubic-bezier(0.2, 0, 0.38, 0.9)`. The report names
  the authoring form verbatim and says whether `scripts/build/admin-css.input.css` was touched.
- `grep -n "cairn-dur-instant" src/lib/components/cairn-admin.css` returns a declaration inside each
  of the two `[data-theme=…]` blocks, verifiable in the diff.
- `scripts/checks/custom-surface-budget.json` is not in the diff, and
  `node scripts/checks/check-custom-surface.mjs` exits 0.
- `src/lib/audit/rules/static/motion.ts` no longer matches `(prefers-reduced-motion: no-preference)`
  as a guard, verifiable in the diff, and
  `npx vitest run src/tests/unit/audit/rules/reduced-motion.test.ts` passes with the moved fixtures.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `docs/internal/api-surface.md` and `docs/STATUS.md` are not in the diff.
- `CAPTURES:` names `signups` and `styleguide` in both schemes at the five widths;
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
and **both** existing fixture suites re-baselined against the widened predicate. There are two, not
three: `motion.ts` holds shared predicates and ships no suite of its own, so the re-baseline is
`motion-band.test.ts` and `reduced-motion.test.ts`.

**Files (5, 2 of them tests):**
- Modify: `src/lib/audit/rules/static/motion.ts`, `src/lib/audit/rules/static/motion-band.ts`,
  `src/lib/audit/rules/static/reduced-motion.ts`, `CHANGELOG.md`
- Test: `src/tests/unit/audit/rules/motion-band.test.ts`,
  `src/tests/unit/audit/rules/reduced-motion.test.ts`. These are the two that exist; there is no
  `motion.test.ts` in the tree and this task creates none.

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
- **A shorthand counts as declaring the longhands the floor zeroes.** `.cairn-caret` declares
  `transition` and the floor declares `transition-duration`, so a literal reading would leave the one
  false positive this clause exists to kill alive. A `transition` shorthand declares
  `transition-duration`; an `animation` shorthand declares `animation-duration` and
  `animation-iteration-count`. The reverse does not hold, which is what keeps the residue real.
- **The widened set is nine and `transition-property` is in it.** The four matched today plus
  `transition-property`, `transition-timing-function`, `transition-delay`, `animation-delay`, and
  `animation-timing-function`. The regex stays anchored, so nothing outside the nine is matched, and
  a rule declaring `transition-property` alone is not discharged by the floor, which never touches
  it.
- The re-baselining is the work rather than the predicate change. Each of the two suites is read
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
- [ ] **Step 5:** re-baseline both suites against the widened predicate and report counts found,
  changed, deferred. Append the `CHANGELOG.md` line this task owns, which carries the dead-suppression
  sentence and the delay and timing-function exposure verbatim from the changelog table. The
  check-plus-unit gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/audit/rules/motion-band.test.ts src/tests/unit/audit/rules/reduced-motion.test.ts`
  passes, with the five new assertions from Step 1 present by name.
- `grep -n "MOTION_PROPERTY" src/lib/audit/rules/static/motion.ts` shows a pattern matching all nine
  properties, verifiable in the diff.
- A `transition: all` fixture produces **exactly one** finding, under the id `motion-band`, and its
  message contains the string `@starting-style`.
- A fixture declaring only `transition-timing-function` under the blanket floor produces a
  `reduced-motion` finding; a fixture declaring `transition-duration` under the same floor does not;
  and a fixture declaring the `transition` shorthand under the same floor does not, which is the
  shorthand-counts-as-longhand reading asserted rather than assumed.
- The `CHANGELOG.md` line this task appends contains the strings `dead suppression` and
  `transition-timing-function`, so the two consumer exposures the widened predicate creates are
  disclosed rather than implied.
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
- Counts found, changed, deferred: the number of fixture expectations found in the two suites, the
  number changed by the widened predicate, and any deferred with the reason.
- Re-emit before the gate.

**Gate:** the CHECK-PLUS-UNIT string under "## Gate", run as `cairn-run-gate '<check string>'`. Scoped
to the blast radius: the inner loop runs only the two named test files; the gate string runs once.

**Commit:** one, `refactor(audit): repoint motion-band and scope reduced-motion's floor clause`.

---

## Task 3: `motion-property` and `motion-hover-gate`

**Chain:** A, third. **Paint:** no. **Depends on:** task 2. **Shares the static registry with task 4,
so the two are serialized.**

**Deliverables: five.** The `adminOnly` field on the static rule type with the `static.adminScope`
config key it resolves over; `motion-property` with the
allowlist, the snap list, the three-property cap, the `animate-*` keyframe clause and the vendor-class
exemption on its class join; the one exception keyed on file plus selector plus property with its
three-sided fixture; `motion-hover-gate` with both predicates; and both registered.

**Files (9):**
- Create: `src/lib/audit/rules/static/motion-property.ts`,
  `src/lib/audit/rules/static/motion-hover-gate.ts`,
  `src/tests/unit/audit/rules/motion-property.test.ts`,
  `src/tests/unit/audit/rules/motion-hover-gate.test.ts`
- Modify: `src/lib/audit/types.ts` (the optional `adminOnly` field on `StaticRule`),
  `src/lib/audit/config.ts` (the optional `static.adminScope` key, its default, its
  configured-versus-default flag, and its entry on `AuditConfig`), `src/lib/audit/run.ts` (resolving
  the one over the other in `runStatic`), `src/lib/audit/rules/static/index.ts`,
  `src/tests/unit/audit/run.test.ts` (the `adminOnly` resolution's assertions, the existence rule,
  and a `src/lib/components` fixture in the shared `beforeAll` root), `CHANGELOG.md`
- The test file is counted above and is modified, not created: it already builds a temporary root
  with fixture files and drives `runStatic` with an injected rule.

**Interfaces:**
- Consumes: task 2's widened `isMotionProperty` and `motion-band`'s ownership of `transition: all`.
- Produces: the rule ids `motion-property` and `motion-hover-gate`, both static, both error tier,
  which task 10 adds to the gate's `RULE_IDS` and task 11 documents; and the `static.adminScope`
  config key, which task 10 sets in the gate's own config and task 11 documents on the reference page
  and the recipe page.
- Unchanged: no package export. Both rules are reached through the registry, not through a new
  subpath, and `static.adminScope` is read from a consumer's config file rather than exported.

**Decisions the plan makes:**
- **`adminOnly` is a new optional field on `StaticRule`, and it costs one config key.** A rule that
  sets it runs over the roots `static.adminScope` names, which default to `src/routes/admin` and
  `src/lib/admin-toolkit`, never `src/lib/components` unless a site names it there; every other rule
  resolves over `static.scope` as today. `DEFAULT_STATIC_SCOPE`'s middle root is where a consuming
  site keeps its shared **public** components, and running three error-tier admin-motion rules there
  is the charter breach the pass exists to avoid; narrowing `static.scope` instead is all-or-nothing
  and would also drop `no-uncompiled-class` and `focus-parity`. The restriction reaches both surfaces
  a rule reads, the components under those roots and the `static.cssFiles` entries that lie inside
  them, so an `adminOnly` rule never reads a site's public theme file. Both halves are additive and
  optional, so no existing rule and no existing config changes. `./audit` is not a package export
  subpath, so `check:surface` and `check:reference` never see either half and both stay untouched;
  the key is consumer-facing all the same, so task 11 documents it in
  `docs/reference/cairn-audit.md` and in the recipe page. This task's plain `CHANGELOG.md` line names
  the key. It owes no `Consumers must:` line, because the default answers it for a site whose admin
  screens sit at the default roots.
- **`static.adminScope` follows `static.scope`'s existence rule exactly.** A root the config names
  that is missing throws; a default root that is missing is skipped. `static.scope` carries that
  asymmetry through a configured-versus-default flag set in `resolveConfig` (`config.ts:180-181`)
  and read in `runStatic` (`run.ts:40-41`), and `static.adminScope` gets the parallel flag rather
  than a second rule, so one semantics governs both keys. A consumer at the default whose tree has
  no `src/routes/admin` sees that root skipped rather than a thrown run, and the engine gate's three
  named roots must all exist, which they do.
- **Both rules are specified consumer-first.** `motion-property` reads both CSS-family surfaces
  `cssScopeRules` already yields (a component's own scoped `<style>` block plus any file
  `static.cssFiles` names) and the per-element class-token join against `ctx.sheet.declarations()`,
  keyed on `ClassToken.elementStart`. A consumer whose admin screens sit at `static.adminScope`'s
  default roots writes no configuration at all, and `DEFAULT_SHEET_CANDIDATES` names the engine's
  `dist` sheet first and the installed
  `node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css` second, taking the first that
  exists. `motion-hover-gate` reads the CSS-family surfaces only, with no class join.
- **A vendor component class is exempt on `motion-property`'s class-join half, and only there.** Four
  DaisyUI components transition named-error properties in the shipped sheet (`.drawer-side`'s `width`
  at `dist/components/cairn-admin.css:1689`, `.filter input`'s `margin`, `padding`, and
  `border-width` at `:2541`, `.collapse ::details-content`'s `min-height`, `padding`, and `height` at
  `:5243`, and `.toggle:before`'s `inset-inline-start` at `:2763`), and
  `CairnAdminShell.svelte:949` carries `class="drawer-side"`, so without the exemption the engine's
  own tree produces an error-tier finding it cannot fix without the override decision 4 refuses. The
  discriminator is the compiled declaration's source rule: exempt when the sheet attributes it to
  DaisyUI's plugin output. `conditions` alone cannot answer that, because it reports at-rule preludes
  and cairn's own rules also sit in `@layer components`, so where the sheet cannot attribute a rule
  the exemption falls back to an explicit list of DaisyUI component class names shipped beside the
  rule. The CSS-family half keeps the full check, because a declaration read out of an authored CSS
  file is authored code by definition.
- **`transition: all` and `transition-all` are not `motion-property`'s findings.** `motion-band` owns
  that construct, so one construct produces one finding under one id, and the `@starting-style` fix
  message lives with `motion-band`.
- **Two different messages for two different failures.** A named-error property (the nine-item snap
  list) names the judder. A property that is neither allowlisted nor named on the error list still
  fails, with a message saying the property is outside the vocabulary. `max-width` on the zen editor
  card is the shipped instance of the second, and the difference is deliberate.
- **The exception is keyed on the triple**, never the selector alone: the file must resolve inside
  the engine's own tree (`src/lib/components/cairn-admin.css`, or its `dist` equivalent when the rule
  runs from an installed package) AND the selector must be `.drawer-content` AND the property must be
  `margin-left`. The file is the admin sheet rather than the shell because `CairnAdminShell.svelte`
  carries **no `<style>` block**, so no `.drawer-content` rule can come from it through
  `cssScopeRules`, and a Tailwind arbitrary class on the markup would reach the join as the compiled
  sheet's own utility selector rather than as `.drawer-content`. Task 7 authors the transition in
  `cairn-admin.css` for the same reason, and this key and that authoring site are one decision.
- **`motion-hover-gate` carries two predicates, and the widening is what stops it being vacuous.**
  It fires on a hand-authored `:hover` state whose element carries a transition or an animation,
  whether the motion sits on the `:hover` rule itself or on a base rule the same selector matches;
  and it fires on a `:focus-visible` rule declaring motion from **inside** `@media (hover: hover)`,
  which is the mistake its own fix message invites. The narrow reading, motion declared on the
  `:hover` rule, convicts nothing in the engine's tree: `HelpHome.svelte`'s pairs at `:566-567` and
  `:789-790` declare paint with the `transition` on the base selector, and
  `cairn-admin.css:1002`'s guarded rule declares `--btn-bg` alone. A rule that convicts nothing in
  the tree it ships from is the vacuous-gate failure this repo has already recorded once.
- `motion-hover-gate` mirrors `focus-parity`'s shape. Tailwind's `hover:` variant is out of scope by
  construction, exactly as it is in `focus-parity`, because it already compiles to
  `@media (hover: hover) { &:hover }`. Its fix message cites `cairn-admin.css:1002` as the shipped
  model and warns that a selector list pairing `:hover` with `:focus-visible` must be split before the
  guard goes on, or focus motion dies on a touch device with a keyboard. **The engine tree has no
  shipped instance of either predicate**, so every fixture is synthetic and task 6a adds no guard.
- **Folding `motion-hover-gate` into this task is deliberate.** It is one small rule in the same file
  family with the same dependency, and folding it saves a task's fixed overhead. The spec's revision 1
  gave it its own task and the adversarial review folded it.
- **The rendered half of the hover gate is not in this pass.** It needs the same emulation axis rule 4
  needs, it is advisory, and its remedy would be an override decision 4 declines. Task 11 files it.

**Steps:**
- [ ] **Step 0:** add the optional `adminOnly` field to `StaticRule` in `src/lib/audit/types.ts`,
  the optional `static.adminScope` key to `src/lib/audit/config.ts` with its two-root default, and
  the resolution in `runStatic`, with a failing assertion first: run with the consumer default, a
  rule declaring `adminOnly` reports nothing from a `src/lib/components` fixture and a finding from a
  `src/routes/admin` fixture, while a rule that does not declare it reports from both. Assert the
  `static.cssFiles` half too: a CSS file outside the admin roots reaches a rule that declares nothing
  and never reaches one that declares `adminOnly`. The shared `beforeAll` root in
  `src/tests/unit/audit/run.test.ts` builds `dist/components/cairn-admin.css`,
  `src/lib/admin-toolkit`, and `src/routes/admin/posts` today (`run.test.ts:14-28`), so this step
  adds a `src/lib/components` fixture to that root, which the default-registry test later in the
  same file also reads. Assert the existence rule in the same file: a default `src/routes/admin`
  the temporary root does not carry is skipped and the run returns, while a `static.adminScope` root
  the config names that does not exist throws, the asymmetry `static.scope` already holds.
- [ ] **Step 1: the failing fixtures first, for `motion-property`.** Write the eight fixtures the spec
  names and watch each fail with the rule module absent: a `transition-[width]` class fails; a
  `width 200ms` CSS declaration fails; a `transition-all` construct produces NO `motion-property`
  finding; the admin sheet's own `margin-left` on `.drawer-content` passes; a second selector in the
  same engine file transitioning `margin-left` fails; a consumer-owned file's `.drawer-content`
  transitioning `margin-left` fails; `class="drawer-side"` joined to the vendor's `width` transition
  is exempt; the same `width` transition authored in a CSS file the audit reads fails.
- [ ] **Step 2:** write `motion-property` until all eight pass. Include the three-property cap (more
  than three properties in one declaration is a finding) and the `animate-*` clause (an `animate-*`
  class is checked through its `--animate-*` custom property's keyframes, so animating a snap-list
  property is the same finding as transitioning one), each with its own fixture.
- [ ] **Step 3: the failing fixtures first, for `motion-hover-gate`.** `cairn-admin.css:1002` passes,
  because it is guarded and declares paint rather than motion; a `:hover` state on an element whose
  base rule declares a transition, ungated, fails; a `:hover` rule declaring a transition directly,
  ungated, fails; a `hover:` utility is not read at all; a correctly split pair with the `:hover` half
  guarded and the `:focus-visible` half outside passes on both halves, and `focus-parity` passes
  alongside it; and a `:focus-visible` alternative declaring motion from inside the guard **fails**.
  Watch them fail.
- [ ] **Step 4:** write `motion-hover-gate` until all six pass.
- [ ] **Step 5:** register both in `src/lib/audit/rules/static/index.ts`, at error tier, each
  declaring `adminOnly`. Append the `CHANGELOG.md` line this task owns, which does NOT carry
  `Consumers must:` (task 11 writes that line once, when the whole rule set has landed). The
  check-plus-unit gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/audit/rules/motion-property.test.ts src/tests/unit/audit/rules/motion-hover-gate.test.ts`
  passes, with **at least fourteen** named fixtures across the two files, covering every case in
  Steps 1 and 3 and every case in Step 2 (the three-property cap and the `animate-*` keyframe
  clause each have their own).
- A `transition-all` fixture produces zero `motion-property` findings, asserted by id.
- The three-sided exception fixture is present: the admin sheet's own offset passes, a second selector
  in the same file fails, and a consumer-owned file's `.drawer-content` fails. All three are asserted
  by name, and the fixture's file key is `cairn-admin.css`.
- The vendor pair is present: `class="drawer-side"` joined to the sheet's `width` transition produces
  zero findings, and the same declaration authored in a CSS file the audit reads produces one.
- Run with `static.adminScope`'s consumer default, a rule declaring `adminOnly` reports nothing from
  a `src/lib/components` fixture and a finding from a `src/routes/admin` fixture, while a rule
  declaring nothing reports from both; and a `static.cssFiles` entry outside the admin roots reaches
  the second rule and never the first. All four are asserted by name in
  `src/tests/unit/audit/run.test.ts`.
- `static.adminScope` is absent from a config: the run behaves as the two-root default, asserted, so
  an existing consumer config keeps working unchanged.
- The existence rule is asserted in `src/tests/unit/audit/run.test.ts` by name: a default admin root
  the tree does not carry is skipped and the run returns a report, and a `static.adminScope` root the
  config names that does not exist throws with the missing path in the message.
- `grep -n "motion-property\|motion-hover-gate" src/lib/audit/rules/static/index.ts` returns both
  module imports and both ids reach the registry, asserted by a registry test rather than by grep
  alone.
- **`motion-property`'s fix message** contains the offending property name, the phrase naming the
  language's allowlist, and the remedy, asserted as strings in the fixture. A named-error property
  and a merely-outside property produce **different** messages, asserted by comparing the two.
- **`motion-hover-gate`'s fix message** contains the selector, the string `@media (hover: hover)`,
  the citation `cairn-admin.css:1002`, and the split warning naming `:focus-visible`, all asserted as
  strings in the fixture.
- `node scripts/checks/check-surface.mjs` exits 0 and `docs/internal/api-surface.md` is not in the
  diff, because `./audit` is not a package export subpath.
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
the two new test files plus the run test that covers `adminOnly`.

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
- **The vendor-class exemption is enumerable, and its discriminator is named because the obvious one
  does not work.** `CompiledSheet.declarations()` reports each rule's `conditions`, but `conditions`
  is the enclosing at-rule preludes (`sheet.ts:23`), so the only layer signal it carries is
  `@layer components`, which cairn's own rules also sit in. The exemption is therefore "a class whose
  declarations, in the built sheet, come from a rule the sheet attributes to DaisyUI's plugin
  output", and where the sheet cannot attribute a rule it falls back to an explicit list of DaisyUI
  component class names shipped beside the rule. The fallback's limit is stated in the rule's doc
  comment rather than hidden: a cairn class colliding with a DaisyUI component name would be
  exempted, which is why the list is explicit and reviewed. Task 3's `motion-property` uses the same
  discriminator on its class-join half, so there is one implementation and one fixture family. The
  false-positive cost of not exempting is measured and stated in the spec: `.btn` alone computes over
  five properties on 19 elements at rest on `/admin/posts`, so firing on it would make `class="btn"`
  a violation on every button in every consumer tree.
- **The rule declares `adminOnly`**, the field task 3 adds, for the reason task 3 states.
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
- [ ] **Step 3:** add the vendor-class exemption, with a fixture proving `.btn` produces no finding,
  a fixture proving a cairn-authored class with the same shape does, and a fixture exercising the
  explicit class-name fallback. Report which discriminator the built sheet actually supports.
- [ ] **Step 4:** write the three join limits into the rule's own doc comment, each stated as a limit
  with what it misses.
- [ ] **Step 5:** register it in `src/lib/audit/rules/static/index.ts` at error tier, declaring
  `adminOnly`. Append the `CHANGELOG.md` line this task owns, without a `Consumers must:` line. The
  check-plus-unit gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/audit/rules/motion-vocabulary.test.ts` passes, with **at least
  twelve** named fixtures covering every case in Steps 1 and 3.
- A fixture reproducing `cairn-admin.css:545`'s `transition: rotate 150ms ease` produces a finding
  naming both the literal duration and the bare `ease`.
- With the companion assertion forced red, a `transition-colors`-only fixture reports the assertion
  and NOT the element, asserted by the finding's own text.
- A `.btn` fixture produces zero findings; a cairn-authored class of the same shape produces one; and
  a fixture exercising the explicit class-name fallback (a DaisyUI class the sheet cannot attribute)
  produces zero, asserted separately so the fallback is covered rather than assumed.
- **The fix message names three things**, asserted as strings in a fixture: the literal found, the
  nearest cairn token by value, and the authoring form a developer should write instead. A fixture
  over `150ms` names `--cairn-dur-base`; a fixture over `250ms` names `--cairn-dur-shift`, which is
  the nearest of the five by value.
- Each of the three abstention shapes produces a note and zero findings, asserted separately.
- `grep -n "motion-vocabulary" src/lib/audit/rules/static/index.ts` returns the module import, the
  id reaches the registry, and the registered rule declares `adminOnly`, all asserted by a registry
  test rather than by grep alone.
- The rule's doc comment names all three join limits and the exemption's class-name fallback limit,
  verifiable by
  `grep -c "conditional class\|dedup\|cross-component\|fallback" src/lib/audit/rules/static/motion-vocabulary.ts`
  returning at least 4.
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

**Checkpoint:** the conductor's ledger records the pass state at this point. The write itself happens
when the workflow run returns, since the run is one blocking call with no mid-run hook, and the
chain-B merge is a pass-end ritual step for the same reason.

---

## Task 6a: The admin migrated onto the language

**Chain:** A, fifth. **Paint:** yes. **Depends on:** tasks 3 and 4, so the rules exist before the code
is measured against them.

**Deliverables: four.** The three shipped violations fixed, the five token migrations (three CSS
rules and two CodeMirror theme strings) with the two `HelpHome` rules moved onto tokens and no guard
added, the three `duration-[250ms]` sites resolved as the spec's migration table rules them
(`EditPage.svelte:1643` onto the token form, `:2047` removed with its class, `:1428` dropping the
class to ride the theme default), and the shipped class inventory reconciled with its
`Consumers must:` line.

**Files (5 modified, 5 read):**
- Modify: `src/lib/components/EditPage.svelte`, `src/lib/components/MarkdownEditor.svelte`,
  `src/lib/components/HelpHome.svelte`, `src/lib/components/cairn-admin.css`,
  `src/tests/unit/fixtures/admin-sheet-inventory.txt`, `CHANGELOG.md`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`
- Read and confirm unchanged: `src/lib/components/CairnAdminShell.svelte`,
  `src/lib/components/CairnMediaLibrary.svelte`, `src/lib/components/ConceptList.svelte`,
  `src/lib/components/MediaHeroField.svelte`, `src/lib/components/editor-folding.ts`. The first four
  hold the eight bare `transition-*` utilities the theme defaults resolve, which is why the migration
  gives them no edit; the fifth holds `FLASH_MS`, which is the flash's class timer rather than its
  transition. Step 6b is where the task proves each of the five rather than assuming it, and each
  leaves the diff.
- Test: no new file. `npm test`'s existing component suite is the regression net,
  `admin-sheet-inventory.test.ts` is the shipped-class net, and the visual suite is the paint proof.

**Interfaces:**
- Consumes: task 1's eight tokens and the two theme defaults.
- Produces: an admin tree with zero `motion-property`, `motion-vocabulary`, and `motion-hover-gate`
  findings, which is what makes task 10's wiring legal.
- Unchanged: `check:surface`, every export, and `scripts/checks/custom-surface-budget.json`, which is
  not in this task's diff.

**Decisions the plan makes:**
- **The seventeen shipped declarations, and nothing else.** Eleven sites are Tailwind utilities: two
  are fixed by hand, one drops its `duration-*` sibling, and eight need no edit because the theme
  defaults resolve them. Three are CSS rules and move onto the tokens. Three are CodeMirror theme
  strings: two move onto the tokens and one, the progress fill, is removed. The three `animate-spin`
  uses are exempt.
- **Three utility classes leave the packaged sheet, and that is this task's seventh `Consumers must:`
  line.** `transition-all`, `transition-[width]`, and `duration-[250ms]` each have exactly the call
  sites this task removes or rewrites and no others, so Tailwind tree-shakes all three out.
  `src/tests/unit/fixtures/admin-sheet-inventory.txt` freezes the inventory in both directions and
  its own contract says a class may only leave as a deliberate act carried in `CHANGELOG.md`, so the
  order is: write the line, then run `npm run update-admin-sheet-inventory`, then read the fixture
  diff and account for every line. Skipping it reds `npm test` inside this task's own gate.
- `EditPage.svelte:1643` gets a named property list (`transition-[opacity,translate]`) and takes its
  duration from the token form. **The `@starting-style` entrance stays**, because it is what the
  transition exists for.
- `EditPage.svelte:2047`'s `transition-[width]` on the preview frame is **removed**. It transitions
  `width`, which the snap list bans, and the change it animates is a split-pane resize, which the
  resize rule says should snap for an independent reason. This is a behavior change a reader will
  notice, so it carries a `Consumers must:` line.
- `MarkdownEditor.svelte:530`'s `width 200ms ease` on `::-webkit-progress-value` is **removed with no
  replacement**, and the reduced-motion pin on the same pseudo-element at `:614` goes with it, having
  nothing left to pin. The fill snaps. The `transform: scaleX()` overlay the spec's revision 2
  proposed is **cut**: `PlaceholderWidget.eq()` compares the progress fraction
  (`editor-placeholder.ts:49-84`), so CodeMirror destroys and recreates the widget on every progress
  tick and a fresh element has no previous value to transition from. The same mechanism means today's
  `width 200ms ease` almost certainly already snaps. **The native `<progress>` element is untouched**
  and keeps its implicit `progressbar` role, its `value`, its `max`, and its own painted fill, and
  `editor-placeholder.ts` is in no task's Files because nothing there changes. No ARIA is authored,
  because none is needed.
- `cairn-admin.css:545` moves onto `var(--cairn-dur-quick)` and `var(--cairn-ease-standard)`. Bare
  `ease` is `cubic-bezier(0.25, 0.1, 0.25, 1)` and matches no token.
- **The two `HelpHome` rules move onto the tokens and gain no guard.** Both `transition` declarations
  sit on the base selector (`:562` and `:787`); the paired `:hover, :focus-visible` lists at
  `:566-567` and `:789-790` declare `border-color`, `background`, and `color` and no motion at all.
  Wrapping a paint-only pair in `@media (hover: hover)` would remove hover paint on a coarse pointer
  for no enforcement gain, which is an unrequested paint change. The selector-list split stays as the
  authoring step `motion-hover-gate`'s fix message and the recipe page teach for a consumer whose own
  pair does declare motion. **This task adds no `@media (hover: hover)` guard anywhere.**
- `EditPage.svelte:1428` drops its `duration-*` class; the theme default carries it at `base`.
- The `MarkdownEditor` fold chevron and unfold flash move onto the tokens and keep their shape. The
  chevron takes `quick` and the flash takes `base`, per the spec's case table. Both
  already sit inside a `prefers-reduced-motion: reduce` block in the same theme object, and the
  chevron carries a `@media (hover: none)` rest state. That is the best motion in the admin.
- **`editor-folding.ts`'s `FLASH_MS` does not move with the flash's token.** The constant is the
  timer that removes the flash class (`:306`, used at `:405`); the CSS transition is what paints the
  fade. They are independent, the task changes only the transition, and it records the independence
  in the report so a reviewer does not read the untouched 400ms as an oversight. The file is in Files
  because the task reads it to establish that, and it is committed only if it changes.
- **No opt-back-in is authored.** The reasons are the same two the spec gives: each restatement costs
  one unlayered allowlist entry, and the paint still changes instantly under the floor. The case
  table lives in the spec and its cells are already written; **task 11 owns the design system's
  restatement of them**, so no file in this task's list holds a case table.
- **Nothing is added to `custom-surface-budget.json` and no `@layer components` rule is added**, which
  is the test that this task stayed inside both 2026-09-13 rulings and the cap's zero headroom.

**Steps:**
- [ ] **Step 1:** capture this task's before set per the paint protocol, at the task's parent commit.
  Capture-pair branch, over `signups` and `styleguide`.
- [ ] **Step 2: measure first.** Run the three new rules over the admin tree and paste the full
  finding list. The command is `npx cairn-audit --config <path>` from the worktree root, against a
  task-local config the task writes outside the repo tree and never commits. The bin resolves from
  `dist`, so `npm run package` runs first. The config sets four keys and nothing else:
  `static.scope` to the gate's five roots (`src/lib/components`, `src/lib/admin-toolkit`,
  `examples/showcase/src/chassis`, `examples/showcase/src/routes`, `examples/showcase/src/theme`),
  `static.adminScope` to the engine's three admin roots (`src/lib/components`,
  `src/lib/admin-toolkit`, `examples/showcase/src/routes/admin`), `static.cssFiles` to
  `src/lib/components/cairn-admin.css` and `examples/showcase/src/theme/theme.css`, and
  `static.paletteFiles` to those same two files, which is what the engine gate sets and what keeps
  `token-colors` from raising on the showcase theme's own palette in a hand run. The run reports
  every registered rule, so the task counts `motion-property`, `motion-vocabulary`, and
  `motion-hover-gate` findings alone and says which ids it counted. The rules are not in the gate's
  `RULE_IDS` yet, so this is a hand run and the task says so. This is the task's found count, and
  every later step closes a named finding.
- [ ] **Step 3:** the three violations. `EditPage.svelte:1643`'s named property list, the preview
  frame's `transition-[width]` removed, and the upload fill's `width` transition removed along with
  the reduced-motion pin at `MarkdownEditor.svelte:614`, the native `<progress>` untouched.
- [ ] **Step 4:** `cairn-admin.css:545` onto the tokens, and the three `duration-[250ms]` sites
  resolved per the migration table: `EditPage.svelte:1643` takes the token form task 1 proved and
  reported, `:2047`'s class goes with the transition Step 3 removed, and `:1428` drops the class so
  the theme default carries it at `base`. No `duration-[250ms]` class survives in the tree.
- [ ] **Step 5:** the two `HelpHome` rules onto the tokens, with no guard added and no selector list
  split. Confirm `focus-parity` still passes and that no `@media (hover: hover)` appears in the diff.
- [ ] **Step 6:** the two remaining CodeMirror theme strings onto the tokens, the fold chevron and the
  unfold flash.
- [ ] **Step 6b: prove the five read-only files rather than assuming them.** Grep
  `CairnAdminShell.svelte`, `CairnMediaLibrary.svelte`, `ConceptList.svelte`, and
  `MediaHeroField.svelte` for a `duration-*` or `ease-*` class beside each bare `transition-*`
  utility, and report that there is none, which is why the theme defaults resolve all eight and none
  needs an edit. Read `editor-folding.ts`'s `FLASH_MS` and record that it is the class timer rather
  than the transition, so it stays at 400ms. All five leave the diff, and `git status` proves it.
- [ ] **Step 7:** re-run Step 2's command against the same task-local config and confirm zero
  findings under the three motion ids. Report counts found, changed, deferred.
- [ ] **Step 8: the shipped class inventory.** Append this task's three `CHANGELOG.md` lines first,
  the third naming `transition-all`, `transition-[width]`, and `duration-[250ms]` as classes leaving
  the packaged sheet. Then run `npm run update-admin-sheet-inventory`, read the fixture diff, and
  account for every added and removed line in the report. Never hand-edit the fixture.
- [ ] **Step 9:** capture the after set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` naming the preview frame's removed transition and the
  upload fill's removed transition and nothing else, regenerate any moved baseline locally by file
  path, and append the manifest rows under `## Admin motion`. Report `TILE DIFF:` per captured
  surface. The full gate. Commit.

**Acceptance criteria:**
- Re-running Step 2's command, against the same task-local config, returns **zero findings** under
  `motion-property`, `motion-vocabulary`, and `motion-hover-gate`, pasted in the report with the
  command and the config's three keys quoted beside them. The engine's `static.adminScope` is what
  makes the run reach `src/lib/components`, so the criterion is a real measurement rather than an
  empty scan, and the report states the file count the run scanned.
- No `cairn-audit.config.json` appears in the diff: the config is task-local and uncommitted.
- Every `duration-*` class remaining under `src/lib/components/` uses the token-referencing authoring
  form task 1 measured and reported, and no `duration-*` class carries a millisecond literal. The
  criterion is phrased against that reported form rather than against a guessed spelling, because
  task 1 measures the form and this task consumes it.
- `grep -n "transition-\[width\]" src/lib/components/EditPage.svelte` returns nothing.
- `grep -rn "150ms\|200ms\|250ms\|300ms" src/lib/components/cairn-admin.css` returns **nothing**.
  Exactly one match exists today, at `:545`, and this task migrates it.
- `grep -n "progress" src/lib/components/MarkdownEditor.svelte` still shows a native `<progress>`
  element carrying `value` and `max`. No `role="progressbar"` is authored, no overlay element is
  added, and `src/lib/components/editor-placeholder.ts` is not in the diff.
- The CodeMirror theme object in `MarkdownEditor.svelte` carries **no bare millisecond literal and no
  bare `ease` or `linear`** in any `transition` string, verifiable by grep over the theme object's
  line range. The three static rules read `<style>` blocks and `cssFiles` and cannot see a JS theme
  object at all, so "zero findings" proves nothing here and this grep is what does.
- `MarkdownEditor.svelte`'s reduced-motion block no longer pins
  `.cm-cairn-media-placeholder-bar::-webkit-progress-value`, verifiable in the diff.
- `scripts/checks/custom-surface-budget.json` is **not** in the diff, `@layer components` gains no
  rule, and `node scripts/checks/check-custom-surface.mjs` exits 0.
- `grep -n "@media (hover: hover)" src/lib/components/HelpHome.svelte` returns nothing added by this
  task, and `focus-parity` produces no finding on the file.
- `src/tests/unit/fixtures/admin-sheet-inventory.txt` is in the diff, generated by
  `npm run update-admin-sheet-inventory` rather than hand-edited, and the report accounts for every
  added and removed line. The three removals `transition-all`, `transition-[width]`, and
  `duration-[250ms]` are present and each is named in the third `CHANGELOG.md` line.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `CAPTURES:` names `signups` and `styleguide` in both schemes at the five widths;
  `INTENDED MOVES:`/`MOVED BASELINES:` agree name for name; `TILE DIFF:` is reported per tile.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The progress bar's comment states that the
  native element carries the role and the values, only because the markup does, and it does not claim
  the fill animates, because nothing does.
- The labeled report block verbatim and in order.
- No process citations in shipped comments.
- Counts found, changed, deferred: the Step 2 finding count found, the number closed, and any
  deferred with the reason. The seventeen-declaration inventory is the denominator. Report separately
  the sheet-inventory lines added and removed.
- Re-emit before the gate.

**Gate:** the FULL string, run as `cairn-run-gate '<full string>'`.

**Commit:** one, `refactor(admin): migrate the shipped motion onto the token language`.

---

## Task 6b: The dropzone's drag-over state

**Chain:** A, sixth. **Paint:** yes. **Depends on:** task 6a, whose file it shares.

**Deliverables: two.** The dropzone's drag-over paint state, and its component test over the four
handlers and the `relatedTarget` boundary.

**The resize stopper is cut from this task and from the pass.** Revision 2 paired it with the
dropzone as "the two new behaviors". Two measured findings remove it. Its specified form is a no-op:
the class would sit on the bare element the `data-theme` attribute sits on, and every scoped rule in
the admin sheet is `:where([data-theme]) .thing`, so a class on the theme element itself never matches
(`CairnAdminShell.svelte:632-635` states the rule); and `transition-*` and `animation-*` do not
inherit, so even a matching rule on that one element would suppress nothing on the drawer or the
sidebar. Its working form is a universal descendant rule in the blanket block's shape, which is
unlayered and costs one `unlayeredAllowlist` entry. The specified form had no room either:
`componentsLayerSelectorCount(cairn-admin.css)` measures **19** against a `componentsLayerCap` of
**19**, so the spec's "headroom at 19" was wrong. Task 11 records it as a limitation in the design
system's responsive rules and files it to ROADMAP's Later tier with the finding that its working form
costs an unlayered rule. A layout change on resize snaps structurally already, because every layout
property is on the named-error list and the one exception is the zen offset, which a resize does not
drive.

**Files (3):**
- Modify: `src/lib/components/MediaHeroField.svelte`,
  `src/tests/unit/fixtures/admin-sheet-inventory.txt`, `CHANGELOG.md`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`
- Create: `src/tests/component/media-hero-field-dropzone.test.ts`

**Interfaces:**
- Consumes: nothing from task 6a beyond the file itself, which 6a leaves with its bare
  `transition-colors` unchanged.
- Produces: a drag-over paint state on the hero dropzone, which task 11 documents in the design
  system's case coverage.
- Unchanged: `check:surface`, every export, `custom-surface-budget.json` in both halves.

**Decisions the plan makes:**
- **The state is fully specified.** A `dragOver` boolean set on `ondragenter` and `ondragover` (which
  must also `preventDefault` for the drop to be allowed), cleared on `ondrop` and on `ondragleave`
  only when the event's `relatedTarget` lies outside the button, so the dropzone's own child spans do
  not flicker it off.
- **The paint is applied by toggling utility classes, and no CSS rule is authored.** The button at
  `MediaHeroField.svelte:450` already carries `transition-colors` plus
  `hover:border-[color-mix(…)]` and `hover:bg-[color-mix(…)]`. The drag-over state toggles the
  variant-free equivalents of those two classes on the `dragOver` boolean, so the paint reaches a
  coarse pointer, needs no modality guard, and costs no rule inside `@layer components`, which has
  zero headroom. Nothing moves and nothing resizes.
- **The token is `base`, not `instant`, and the departure is recorded.** The paint rides the
  element's existing `transition-colors`, which resolves to the theme default at `base`. Reaching
  `instant` would take either a CSS rule the components layer has no room for or an unconditional
  duration class that would also retime the same element's hover paint. `base` on a paint change is
  inside the language, and the spec's case table carries the same reason.
- **The two new classes enter the shipped sheet**, which is an addition rather than a removal, so it
  owes a fixture regeneration and no `Consumers must:` line. The order is the same as task 6a's: the
  plain `CHANGELOG.md` entry, then `npm run update-admin-sheet-inventory`, then account for the diff.
- **The component test is the deliverable, not a grep.** The `relatedTarget` boundary is the task's
  one piece of real logic and a grep over handler names cannot prove it fires correctly.

**Steps:**
- [ ] **Step 1:** capture this task's before set per the paint protocol. Capture-pair branch, over
  `signups` and `styleguide`.
- [ ] **Step 2: the failing test first**, in `src/tests/component/media-hero-field-dropzone.test.ts`.
  Assert five things: `ondragenter` sets the state; `ondragover` sets it and calls `preventDefault`;
  `ondrop` clears it; `ondragleave` with a `relatedTarget` inside the button does NOT clear it; and
  `ondragleave` with a `relatedTarget` outside the button does. Watch all five fail.
- [ ] **Step 3:** wire the four handlers and the `dragOver` boolean in `MediaHeroField.svelte` until
  all five pass.
- [ ] **Step 4:** toggle the two paint classes on the boolean, the variant-free equivalents of the
  element's own `hover:` classes. Confirm by reading the diff that no CSS rule was authored and no
  `:hover` selector was added.
- [ ] **Step 5:** append the plain `CHANGELOG.md` line this task owns, then run
  `npm run update-admin-sheet-inventory` and account for every added line in the report.
- [ ] **Step 6:** capture the after set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` (the expected declaration is none, since the state is
  drag-triggered and no baseline renders it), regenerate any moved baseline locally by file path, and
  append the manifest rows under `## Admin motion`. Report `TILE DIFF:` per captured surface. The full
  gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/component/media-hero-field-dropzone.test.ts` passes with all five named
  assertions, including both `relatedTarget` directions.
- `MediaHeroField.svelte` wires `ondragenter`, `ondragover` (with `preventDefault`), `ondrop`, and
  `ondragleave`, and the `ondragleave` handler tests `relatedTarget` against the button, verifiable
  line by line in the diff.
- The drag-over paint is applied through toggled utility classes: no `:hover` selector and no CSS rule
  is added anywhere in this task's diff, and `src/lib/components/cairn-admin.css` is not in the diff.
- `scripts/checks/custom-surface-budget.json` is not in the diff, `@layer components` gains no rule,
  and `node scripts/checks/check-custom-surface.mjs` exits 0.
- `src/tests/unit/fixtures/admin-sheet-inventory.txt` is in the diff, generated rather than
  hand-edited, and every added line is named in the report. No line is removed.
- No file named `resize-stopper.test.ts` exists and the string `cairn-resizing` appears nowhere in the
  repository.
- Running the three motion rules over the admin tree still returns zero findings, through task 6a's
  command and task-local config (`npx cairn-audit --config <path>`, with `static.adminScope` naming
  the engine's three admin roots), quoted in the report.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `CAPTURES:` names `signups` and `styleguide` in both schemes at the five widths, with
  `INTENDED MOVES:` and `MOVED BASELINES:` agreeing name for name.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The dropzone's comment states the
  `relatedTarget` condition the test covers and no more.
- The labeled report block verbatim and in order.
- No process citations in shipped comments.
- Counts found, changed, deferred: the event handlers found on the dropzone before the change, the
  number added, the sheet-inventory lines added, and any deferred.
- Re-emit before the gate.

**Gate:** the FULL string, run as `cairn-run-gate '<full string>'`.

**Commit:** one, `feat(admin): add the dropzone drag-over state`.

---

## Task 7: Zen

**Chain:** A, seventh. **Paint:** yes. **Depends on:** tasks 1, 6a, and 6b.

**Deliverables: five.** The `.drawer-content` `margin-left` transition authored in `cairn-admin.css`
at `shift` in and `base` out on the paired curves, the chrome regions' fade, the chip's guarded
delayed entrance and immediate exit, the editor card's box left snapping, and the two zen
layout-count assertions in the showcase e2e.

**Files (4 modified, 1 read):**
- Modify: `src/lib/components/cairn-admin.css`, `src/lib/components/EditPage.svelte`,
  `examples/showcase/e2e/admin-visual.spec.ts`,
  `src/tests/unit/fixtures/admin-sheet-inventory.txt`, `CHANGELOG.md`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`
- Read and confirm unchanged, or modify and say why: `src/lib/components/CairnAdminShell.svelte`. The
  expected outcome is that the shell keeps its two conditional margin utilities at `:692-693` and
  leaves the diff, because the sheet rule is what transitions the value they change. Step 3 reports
  which happened.
- Test: no new file. The two layout-count assertions join the existing showcase e2e spec.

**Interfaces:**
- Consumes: task 1's tokens; task 3's `motion-property` exception, keyed on
  `src/lib/components/cairn-admin.css` plus `.drawer-content` plus `margin-left`.
- Produces: the one allowlist exception's live instance, gated in this task by the two layout-count
  assertions rather than two tasks later.
- Unchanged: `check:surface`, `setZen()`'s signature, every export, `custom-surface-budget.json`.

**Decisions the plan makes:**
- **The transition is authored in `cairn-admin.css`, on `.drawer-content`, and that decision is the
  same one as task 3's exception key.** `CairnAdminShell.svelte` carries **no `<style>` block**, so no
  `.drawer-content` rule can come from it; a Tailwind arbitrary class on the markup would reach the
  class join as the compiled sheet's own utility selector rather than as `.drawer-content`; and the
  admin sheet is the one file the selector can live in. The shell **keeps** its two conditional margin
  utilities at `:692-693` (`class:lg:ml-56` and `class:xl:ml-56`), which are what change the value;
  the sheet rule is what transitions it. The task states in its report that it kept them rather than
  replacing them.
- **The rule sits where it costs nothing.** It targets `.drawer-content` under the two theme roots in
  the sheet's existing scoped-selector idiom, outside `@layer components`, which has zero headroom,
  and it adds no `unlayeredAllowlist` entry. If the implementer finds no placement that satisfies
  both, it stops and reports rather than editing `custom-surface-budget.json`.
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
- **`setZen()` is `EditPage.svelte:441`, and its `flushSync()` focus sequence stays synchronous**, so
  motion never gates focus. This is a preservation requirement rather than a change, and the task
  states which lines it preserved. One obligation is named and explicitly not discharged: the focus
  lands while `.drawer-content` is still traveling 224px, so 2.4.11's non-obscured requirement is a
  question about the travel window that a resting screenshot cannot answer. Keeping the sequence
  synchronous is necessary and not sufficient, and task 11 records the gap in the Motion section
  rather than letting a later reader assume it was checked.
- **The two layout-count assertions land here, not in task 10.** They are the pass's only real proof
  of motion, and the task that ships the motion is the task that gates on it. Task 10 keeps the six
  new visual surfaces and the gate wiring.

**Steps:**
- [ ] **Step 1:** capture this task's before set per the paint protocol. Capture-pair branch, over
  `signups` and `styleguide`.
- [ ] **Step 2:** read `setZen()` at `EditPage.svelte:441` whole and record the `flushSync()` focus
  sequence verbatim in the report, so the diff can be checked against it.
- [ ] **Step 3:** the `.drawer-content` `margin-left` transition in `cairn-admin.css`, at
  `--cairn-dur-shift` on `--cairn-ease-entrance` entering and `--cairn-dur-base` on
  `--cairn-ease-exit` leaving. Confirm by hand that `motion-property` passes it through the exception
  and that a second selector in the same file transitioning `margin-left` would fail, using the
  fixture task 3 shipped. Report whether the shell's `class:lg:ml-56` and `class:xl:ml-56` toggles
  were kept or replaced, and why.
- [ ] **Step 4:** the chrome regions' fade, `quick` out on the exit curve and `quick` back on the
  standard curve.
- [ ] **Step 5:** the chip's entrance at `base` on the entrance curve after a 110ms delay authored
  inside a `(prefers-reduced-motion: no-preference)` guard, and its exit at `quick` on the exit curve
  with no delay.
- [ ] **Step 6:** confirm the editor card's box snaps, with neither `padding` nor `max-width` in any
  transition property list.
- [ ] **Step 7: the two layout-count assertions**, in `examples/showcase/e2e/admin-visual.spec.ts`, at
  1440. In a default context, toggling zen produces more than two distinct computed `margin-left`
  values on `.drawer-content` during the toggle window. In a `reducedMotion: 'reduce'` context, it
  produces **at most two**: the floor keeps `0.01ms` rather than `0s` so `transitionend` still fires,
  which leaves a window a sample could in principle land inside, so the assertion is a bound and the
  companion `LayoutCount` reading is the signal. No frame-interval count is asserted.
- [ ] **Step 8:** run `npm run update-admin-sheet-inventory` if the sheet's class inventory moved, and
  account for the diff. Capture the after set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` (zen is not a resting state on either captured
  surface, so the expected declaration is none), regenerate any moved baseline locally by file path,
  and append the manifest rows under `## Admin motion`. Report `TILE DIFF:` per captured surface.
  Append the `CHANGELOG.md` line this task owns. The full gate. Commit.

**Acceptance criteria:**
- `grep -n "drawer-content" src/lib/components/cairn-admin.css` shows exactly one rule transitioning
  `margin-left`, with the four token references in the diff (`shift` and `entrance` in, `base` and
  `exit` out), and `grep -n "margin-left" src/lib/components/CairnAdminShell.svelte` returns nothing.
- Running `motion-property` over the admin roots returns zero findings, through task 6a's command
  and task-local config (`static.adminScope` naming the engine's three admin roots, `static.cssFiles`
  naming the admin sheet), and the report states that the sheet's offset was reached and passed by
  the exception rather than by absence, naming the fixture that proves the exception's file key is
  `cairn-admin.css`. Reaching it is what the admin scope's inclusion of `src/lib/components`
  guarantees.
- `grep -n "prefers-reduced-motion: no-preference" src/lib/components/EditPage.svelte` returns the
  chip's delay guard, and the chip's exit declaration carries no delay.
- Neither `padding` nor `max-width` appears in any `transition-property` or `transition` shorthand in
  `EditPage.svelte`, verifiable by grep.
- `setZen()`'s `flushSync()` focus sequence is byte-identical to the Step 2 record, verifiable in the
  diff, and the report quotes both.
- The two zen layout-count assertions are present by name in
  `examples/showcase/e2e/admin-visual.spec.ts`, one asserting more than two distinct `margin-left`
  values in a default context and one asserting at most two in a reduced context. No frame-interval
  count is asserted anywhere in the diff. Both pass in the task's own `CI=1` e2e run.
- `scripts/checks/custom-surface-budget.json` is not in the diff, `@layer components` gains no rule,
  and `node scripts/checks/check-custom-surface.mjs` exits 0.
- Running all three motion rules over the admin tree returns zero findings, through the same command
  and config.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `CAPTURES:` names `signups` and `styleguide` in both schemes at the five widths, with
  `INTENDED MOVES:` and `MOVED BASELINES:` agreeing name for name.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. The offset's comment states the exception it
  relies on and the triple the rule keys on, only because task 3's fixture proves it. The focus
  comment does not claim the travel window is unobscured, because nothing asserts it.
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
  `.github/workflows/norms.yml`, `CHANGELOG.md`
- Create: `src/lib/audit/rules/rendered/motion-reduced-delay.ts`,
  `src/tests/unit/audit/rules/rendered/motion-reduced-delay.test.ts`
- Test: `src/tests/unit/audit/rendered.test.ts`, the existing rendered-harness suite, extended for
  the axis and named in the report

**Two path decisions the plan makes rather than leaving to a guess.** The rule's fixture suite goes
under `src/tests/unit/audit/rules/rendered/`, which is where every other rendered rule's tests live;
`src/tests/unit/audit/rules/` is the static rules' directory. And the workflow file is
`.github/workflows/norms.yml`, not `e2e.yml` or an unnamed sibling, because `norms.yml` already
builds and serves an authenticated showcase admin and this step reuses that recipe.

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
  style rule. A throwaway probe would not. Each shape gets a named test; there is no
  stated-limitation alternative, because an escape clause makes the criterion unfalsifiable.
- **The axis is opt-in per rule, and `RenderedRuleContext` carries its value.** A rule that declares
  no axis runs in the default context alone, so the seventeen registered rendered rules run exactly
  the context count they run today, which is an acceptance criterion rather than an expectation.
  `RenderedRuleContext` carries `pagePath`, `theme`, `state`, and `config` today and gains the axis
  value, because a rule running under two axis values that cannot tell them apart cannot decide
  whether to check.
- **Findings dedupe on the axis.** `rendered.ts:229` keys a resolved finding on page, theme, and
  state. With an axis above the context the same element fires twice under different axis values, so
  `ResolvedRenderedFinding` gains the axis and `RenderedPageVisit.selectorsSeen` is keyed by it. The
  task states the resulting key in its report.
- **The workflow step owns its own preview server, and it copies `norms.yml`'s recipe verbatim.** A
  Playwright spec inside the showcase e2e suite is declined: the e2e server is Playwright's own
  `webServer`, its lifetime is the `playwright test` process, and the audit harness refuses to start a
  server. **The spec's revision-2 reason for declining the e2e-flagged build is withdrawn**, because a
  default build cannot serve the pages the rule reads at all: `__CAIRN_DEV_BUILD__`
  (`examples/showcase/vite.config.ts:28`) folds the dev backend out of a default build, so the runtime
  `CAIRN_DEV_BACKEND=1` half has nothing to enable, and `DEFAULT_RENDERED_PAGES` (`config.ts:41-49`)
  is six `/admin/*` routes. As revision 2 specified it the step would either fail to load the pages
  or, worse, audit `/admin/login` redirects and report clean, which is a vacuous advisory rule wearing
  a green tick. The recipe is `norms.yml:51-56`: a `VITE_CAIRN_E2E=1` build, then
  `CAIRN_DEV_BACKEND=1 nohup npm --prefix examples/showcase run preview -- --port <this step's port>`
  detached with its output redirected, then a readiness poll on `/admin/posts` that fails the step
  with the server log if it never answers. The port is the step's own and is never 4173.
- **The `CAIRN_DEV_BACKEND` tripwire is re-read before the step is wired.** `docs/HISTORY.md`'s
  internals pass, round A, records a guard that refuses the variable when it is set alongside a
  non-local host. This step is the second place in the repo to set it, so the implementer reads that
  record first and reports what it says, rather than discovering the guard from a red CI run.
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
- [ ] **Step 3:** add the emulation axis to `runRendered` as a loop level above the context,
  **opt-in per rule** and declared the way `states` is, threading the axis value into
  `RenderedRuleContext` and into `ResolvedRenderedFinding`, and keying
  `RenderedPageVisit.selectorsSeen` by it. Extend `src/tests/unit/audit/rendered.test.ts` for the new
  loop level and name the added tests in the report. Assert that a registry without an axis-declaring
  rule produces the same context and page-load count as today, and report both counts before and
  after.
- [ ] **Step 4:** add the shared CSSOM walker to `__cairnAudit` beside `signature` and `isVisible`,
  handling the six node shapes and catching a per-sheet `SecurityError`.
- [ ] **Step 5:** write `motion-reduced-delay` until all five fixtures pass, reading computed values
  per element and using the walker for the fix message's locator. Register it at advisory tier.
- [ ] **Step 6:** re-read the `CAIRN_DEV_BACKEND` tripwire record in `docs/HISTORY.md` and quote what
  it says in the report. Then add the step to `.github/workflows/norms.yml`, copying `norms.yml`'s own
  recipe at `:51-56`: a `VITE_CAIRN_E2E=1` build, a detached `CAIRN_DEV_BACKEND=1` preview on this
  step's own port, a readiness poll on `/admin/posts` that fails with the server log, then
  `cairn-audit --rendered`. Append the `CHANGELOG.md` line this task owns, without a
  `Consumers must:` line. The check-plus-unit gate. Commit.

**Acceptance criteria:**
- `npx vitest run src/tests/unit/audit/rules/rendered/motion-reduced-delay.test.ts` passes with all
  five named fixtures, three firing and two not.
- The quoted rule id in `src/lib/audit/rules/rendered/` is `motion-reduced-delay` and never
  `reduced-motion`, verified against the `id:` declarations rather than by a bare text grep, which
  would fail on any `prefers-reduced-motion` mention the new rule legitimately carries.
- The rendered registry resolves `motion-reduced-delay` at advisory tier, asserted by a registry test
  rather than by grep, since tier lives in the rule module.
- `grep -n "reducedMotion\|hasTouch" src/lib/audit/rendered/types.ts` returns both members.
- `src/tests/unit/audit/rendered.test.ts` covers the new axis by name, and **a registry with no
  axis-declaring rule produces the same context and page-load count as today**, asserted rather than
  argued. The report states both counts before and after.
- `RenderedRuleContext` carries the axis value and `ResolvedRenderedFinding` carries it too, so the
  same element under two axis values produces two distinguishable findings, asserted by a named test.
- The walker handles all six node shapes, **each covered by its own named test**. No shape is
  discharged by a stated limitation.
- **The fix message names three things**, asserted as strings in a fixture: the element's
  `__cairnAudit.signature(el)`, the authored rule's selector, and that rule's file condition. The
  no-matching-rule path is its own fixture and asserts the message says so and gives the signature
  alone.
- **Both negative results are recorded in the harness code's comments** and are verifiable by grep:
  the ignored CDP `features` array, and computed styles resolving every `var()`.
- The new workflow step lands in `.github/workflows/norms.yml`, names its own port, and that port is
  not 4173. The step carries the readiness poll and fails with the server log if the preview never
  answers, verifiable in the diff.
- The report quotes what the `CAIRN_DEV_BACKEND` tripwire record says.
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

**Chain:** A, eighth. **Paint:** yes. **Depends on:** tasks 6a, 6b, and 7. **Task 8 is merge order
only**, not a code dependency: the two share no file and this task wires the three static ids.

**Deliverables: three.** The gate's own `static.adminScope`, naming its three admin roots, for the
rules that declare `adminOnly`; the three `RULE_IDS` plus the one `CSS_FILES` addition with the gate
green; and the six new visual surfaces across the five-viewport bar.

**Three items revision 2 gave this task are gone.** The zen layout-count assertions move to task 7,
where the motion they prove is authored. The `scopeReport` path term is dropped entirely by the Fold
correction, so `audit-gate.mjs` and its second caller leave this task's Files. And the
reproduction-manifest entry is **cut**: the frozen id
list is a cross-repo contract (`reproductions-manifest.test.ts:13-15` records that cairn-pub's
`2026-08-15-live-reproduction-seam-design.md` owns it and that changing an id is a spec edit), the
edit needs a third file nobody listed because `getStory` throws for an unregistered id, and a
reproduction is a static mount that cannot show motion. `src/lib/reproductions/manifest.ts` and
`src/tests/unit/reproductions-manifest.test.ts` are in no task's Files.

**Files (3):**
- Modify: `scripts/checks/check-invisible-craft.mjs`, `examples/showcase/e2e/admin-visual.spec.ts`,
  `src/tests/unit/audit-gate.test.ts`, `CHANGELOG.md`,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`
- Not touched: `scripts/checks/audit-gate.mjs` and `scripts/checks/check-admin-css-classes.mjs`.
  `scopeReport` keeps its signature and its rule-id-only filtering, per the Fold correction, so
  neither file is in this task's diff.
- Baselines: 60 new files under `examples/showcase/e2e/admin-visual.spec.ts-snapshots/`, regenerated
  on CI

**Interfaces:**
- Consumes: tasks 3 and 4's three rule ids and the `adminOnly` field they declare; task 2's floor
  clause, which is what lets `cairn-admin.css` join `CSS_FILES` without a false positive; tasks 6a,
  6b, and 7's migrated tree, which is what makes the gate green on landing.
- Produces: `ADMIN_SCOPE`, the gate's exported root list, which it sets `static.adminScope` to and
  which a later pass extends when it adds a consumer-facing gate.
- Unchanged: `DEFAULT_STATIC_SCOPE`, `runStatic`'s own contract, and `scopeReport`'s signature. A
  consumer's run is unaffected, because `static.adminScope`'s default already gives a consumer the
  boundary and this key is the engine gate's own translation of it into a differently laid-out
  tree.

**Decisions the plan makes:**
- **The boundary lives on the rule, and the gate only says where its own admin roots are.** Tasks 3
  and 4 gave the three rules `adminOnly` and task 3 added `static.adminScope`, whose default answers
  a consuming site. This task sets the key in the config `check-invisible-craft.mjs` builds, because
  the engine's tree is laid out differently from a consuming site's: `SCAN_SCOPE` is
  `src/lib/components`, `src/lib/admin-toolkit`, and three showcase roots, and the key's default
  names one root this tree does not have (`src/routes/admin`, since there is no `src/routes` at all)
  and one that covers only part of the admin frame (`src/lib/admin-toolkit`). `scopeReport` is not
  involved and does not change.
- **The gate's `static.adminScope` names three roots:** `src/lib/components`,
  `src/lib/admin-toolkit`, and `examples/showcase/src/routes/admin`. The first two are the engine's
  admin frame. The third is
  deliberate and is a gain: `examples/showcase/src/routes/admin/signups/+page.svelte` is the repo's
  one consumer-shaped admin screen, so including it dogfoods the rules on the surface a consumer's
  own screen most resembles, while `examples/showcase/src/chassis`, `examples/showcase/src/theme`,
  and the showcase's public routes stay out. Dropping the whole `examples/showcase/src/routes` root
  would have excluded the dogfood along with the public pages.
- **Without the key the gate under-covers silently.** The boundary resolves inside `runStatic`, so
  the three `adminOnly` rules with no key set resolve over the consumer default. In this tree that
  default reaches `src/lib/admin-toolkit` alone, and it never reaches
  `src/lib/components/cairn-admin.css`, where the shipped declarations and the zen exception live.
  The gate would report green over almost none of the admin frame, which is under-coverage rather
  than a red gate, and the coverage the pass exists to add would not exist. Step 2's failing
  assertion is the proof against it: a `motion-property` finding from a `src/lib/components` fixture,
  under the gate's own config. The public roots do carry the constructs the rules convict, three
  literal `0.2s ease-out` durations on the theme-flip cross-fade
  (`examples/showcase/src/theme/theme.css:365-368`) and `animation-duration: 0.18s` on the root
  view-transition pseudo-elements (`:384`), which is what the control arm of Step 4's paired run
  produces and what the admin scope keeps out of the shipping arm.
- **`scopeReport` grows no path term, and that is the point.** It filters a report `runStatic` has
  already produced, so a path term there could only subtract and could never restore
  `src/lib/components` to a rule the admin scope had excluded, which is why the fold's two mechanisms
  contradicted each other. The whole boundary is resolved inside `runStatic`, before a report exists
  to filter. `scripts/checks/check-admin-css-classes.mjs:35`, the second caller, is therefore
  untouched, and its absence from the diff is an acceptance criterion.
- **A root `cairn-audit.config.json` plus two npm scripts was considered and declined**, because it
  would create a second, narrower gate beside the one already running, since `DEFAULT_STATIC_SCOPE`
  drops the three showcase roots this gate covers, and `motion-band` would run twice against two
  different scopes.
- **`CSS_FILES` keeps both entries**, and the admin scope is what sorts them. The CSS-family rules
  read the file that belongs to their roots: `src/lib/components/cairn-admin.css` lies inside an
  admin root, so the three motion rules read it, and `examples/showcase/src/theme/theme.css` does
  not, so they do not, while `gap-scale`, `token-colors`, and `motion-band` keep reading both.
- **The six new surfaces** are the spec's list: the edit page in zen, the drawer open as an overlay,
  the persistent sidebar, a dialog open (`DeleteDialog` is the smallest instance), the command palette
  open, and the media library with a selection. Each renders across 320, 390, 768, 1440, 2560 in both
  themes, which is exactly 60 files.
- **Baselines regenerate on CI**, never from this workstation. Sixty new files is the pass's largest
  artifact.

**Steps:**
- [ ] **Step 1:** capture this task's before set per the paint protocol. Capture-pair branch, over
  `signups` and `styleguide`.
- [ ] **Step 2: the failing assertion first, in `src/tests/unit/audit-gate.test.ts`.** Assert that
  with the gate's config, `runStatic` produces a `motion-property` finding from a fixture under
  `src/lib/components` and none from a fixture under `examples/showcase/src/theme`, while
  `gap-scale` reports from both. The test builds the config from the gate's own exported lists
  (`SCAN_SCOPE`, `ADMIN_SCOPE`, and `CSS_FILES`) over a temporary root carrying the two fixtures,
  which is the idiom `src/tests/unit/audit/run.test.ts` already uses. A configured root the tree does
  not have throws (`run.ts:40-41`, and the existing assertion at `run.test.ts:129-130`) and so does a
  missing `static.cssFiles` entry, so the temporary root carries all five `SCAN_SCOPE` roots, both
  `CSS_FILES` entries, and a `dist` sheet, not only the two fixtures. Watch it fail.
- [ ] **Step 3:** set `static.adminScope` in the config `check-invisible-craft.mjs` builds, exporting
  the root list as `ADMIN_SCOPE` beside `SCAN_SCOPE` and `CSS_FILES` so the test reads one source of
  truth, until the assertions pass. Run `node scripts/checks/check-admin-css-classes.mjs` and confirm
  it still exits 0 with neither it nor `audit-gate.mjs` in the diff.
- [ ] **Step 4:** add the three ids to `RULE_IDS` and `src/lib/components/cairn-admin.css` to
  `CSS_FILES`. Run `node scripts/checks/check-invisible-craft.mjs` and confirm it exits 0. If it does
  not, paste every finding and stop: a red gate here means the migration tasks left something, and
  guessing a suppression is not the fix. Then run the pair the acceptance criteria turn on: a control
  arm with the gate's `static.adminScope` set to the five `SCAN_SCOPE` roots, which produces the
  showcase theme and chassis findings, against the shipping arm with the three admin roots, which
  produces none. The control arm is a local edit run and reverted, never a committed second config.
  Paste both arms with their per-id finding counts.
- [ ] **Step 5:** add the six surfaces to `admin-visual.spec.ts` across the five-viewport bar in both
  themes, following the file's own cookie-plus-`emulateMedia` idiom and reusing the existing width
  bar rather than declaring a second one.
- [ ] **Step 6:** capture the after set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` naming the six new surfaces with their 60-file count
  and any moved existing baseline, regenerate any MOVED baseline locally by file path (the new ones
  regenerate on CI), and append the manifest rows under `## Admin motion`. Report `TILE DIFF:` per
  captured surface, with none for the six new surfaces since no before exists. Append the
  `CHANGELOG.md` line this task owns. The full gate. Commit.

**Acceptance criteria:**
- `node scripts/checks/check-invisible-craft.mjs` exits 0 with `RULE_IDS` carrying all six ids
  (`gap-scale`, `token-colors`, `motion-band`, `motion-property`, `motion-vocabulary`,
  `motion-hover-gate`) and `CSS_FILES` carrying both entries.
- The gate exports `ADMIN_SCOPE` beside `SCAN_SCOPE` and `CSS_FILES`, carrying the three admin roots,
  and `src/tests/unit/audit-gate.test.ts` imports it rather than restating the roots.
- The three motion ids report **nothing** from `examples/showcase/src/chassis`,
  `examples/showcase/src/theme`, or the showcase's public routes, proved by a paired run: a control
  arm with the gate's `static.adminScope` set to the five `SCAN_SCOPE` roots, which produces the
  showcase theme and chassis findings, against the shipping arm with the three admin roots, which
  produces none. Both arms are pasted in the report.
- The three motion ids **do** run over `examples/showcase/src/routes/admin`, proved by the same pair
  of arms and by the report stating the finding count there, which is expected to be zero.
- `gap-scale`, `token-colors`, and `motion-band` keep the full five-root scope, proved by their
  finding counts being equal in both arms.
- `npx vitest run src/tests/unit/audit-gate.test.ts` passes with the Step 2 assertions and with the
  file's existing `scopeReport` assertions unchanged.
- `node scripts/checks/check-admin-css-classes.mjs` exits 0, and neither it nor
  `scripts/checks/audit-gate.mjs` is in the diff.
- No second width array is declared in `examples/showcase/e2e/admin-visual.spec.ts`: the six new
  surfaces reuse the existing bar, verifiable in the diff.
- The six new surfaces are present by name in the spec file, each at five widths in both themes, which
  the report counts as 60 files.
- `src/lib/reproductions/manifest.ts` and `src/tests/unit/reproductions-manifest.test.ts` are **not**
  in the diff.
- `npm run check` reports 0 errors and 0 warnings; `npm test` exits 0; the full gate string exits 0.
- `CAPTURES:` names `signups` and `styleguide` in both schemes at the five widths;
  `INTENDED MOVES:` names the six new admin surfaces with their 60-file count; `MOVED BASELINES:` and
  `INTENDED MOVES:` agree name for name on the moved set.

**Notes: the pre-flight checklist.**
- No comment claims what its assertion does not prove. `ADMIN_SCOPE`'s comment states which ids it
  narrows and why, and the "no existing coverage narrows" claim is backed by the paired run's equal
  counts rather than asserted.
- The labeled report block verbatim and in order, with the new-surface count inside `INTENDED MOVES:`.
- No process citations in shipped comments.
- Counts found, changed, deferred: the finding count from the showcase public roots in each arm of
  the paired run, the `gap-scale`, `token-colors`, and `motion-band` counts in each arm, the finding
  count from the showcase admin route, and the new baseline file count.
- Re-emit before the gate.

**Gate:** the FULL string, run as `cairn-run-gate '<full string>'`. The standing CI-canonical-baseline
gotcha applies: a local `CI=1` e2e is green when its only visual failures are exactly the files the
latest CI regen commit rewrote.

**Checkpoint:** the conductor's ledger records the pass state at this point. The write happens when the
workflow run returns.

**Commit:** one, `feat(audit): wire the motion rules to the engine gate and the visual suite`.

---

## Task 11: Docs and records (last)

**Chain:** A, ninth. **Paint:** no. **Depends on:** everything.

**Deliverables: four.** The design system's Motion section as the canonical home, the extend track's
recipe page, the audit reference rows with the two prose counts, and the records (HISTORY, ROADMAP,
the rulings ledger, the friction log, and the `## Unreleased` block read whole).

**Files (9):**
- Modify: `docs/internal/admin-design-system.md`, `docs/extend/README.md`,
  `docs/reference/cairn-audit.md`, `docs/extend/migration-notes.md`, `docs/HISTORY.md`, `ROADMAP.md`,
  `CHANGELOG.md`, `docs/internal/engine-rulings.md`, `docs/internal/docs-friction-log.md`
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
  class with the empty opt-back-in list and its budget reason, the responsive rules, and the DaisyUI
  decision with all **eleven** vendor disagreements (seven over timing, curve, or modality; four over
  property, which the vendor exemption records), the declined `.modal-box` override, and its reopen
  trigger.
- **Four limitations go in the Motion section as limitations**, rather than being left to a reader's
  inference. The shipped sheet does not honor the language's furniture rule at the breakpoint flip,
  and nothing in this pass covers it, because the resize stopper is cut. The zen offset's travel
  window is unasserted against 2.4.11, so the synchronous focus sequence is necessary and not
  sufficient. The skeleton shimmer's 2.2.2 answer is DaisyUI's own reduced-motion off switch, not the
  spinner's replaces-the-content reasoning. And a focus indicator's own geometry animates at `instant`
  and no longer band, which is the bound that keeps `outline-width` and `outline-offset` on the
  allowlist.
- **The `modal-bottom` reopen trigger is carried as a `WATCH:` comment** beside the recipe in the
  design system, per this repo's watch-item rule, because the trigger is a markup change a future pass
  makes rather than an external event. If it cannot be carried as a `WATCH:`, it is filed to ROADMAP
  instead, and the task says which it did.
- **The recipe page is written for a developer building a custom admin screen**: the tokens they
  write, the four rules they will meet and what each fix message means, the three join limits stated
  as limits, and the two configuration lines a consumer may owe, neither required by default: naming
  their own theme CSS in `static.cssFiles` if they want the CSS-family rules to read it, which is
  already true of `token-colors`, and naming `static.adminScope` if their admin screens sit outside
  `src/routes/admin` and `src/lib/admin-toolkit`. It carries the one non-obvious authoring step,
  splitting a `:hover` and `:focus-visible` selector list before adding the modality guard, and the
  opt-back-in permission with its budget caveat.
- **The reference gets three static rows, one rendered advisory row, the `static.adminScope` config
  key with its default, the `motion-band` band correction, and the coverage limits.** The key is the
  pass's one consumer-facing config addition, so the reference page is where a consumer meets it.
  Two prose counts move with them: `:66` says "Twelve rules
  run, all error tier", which becomes fifteen and is no longer all error tier once the rendered
  advisory lands; and `:25` says "All 28 registered rules", which becomes 32. Both are named here
  because a reviewer will not find them by reading the tables. This page is gated by review rather
  than by `check:reference`, which is why both counts are acceptance criteria.
- **The ledger rows quote decisions 3 and 4 and the two escalation rulings of 2026-09-13**, each
  citing the spec by path and date. Rows take the ledger's own heading form.
- **Five follow-ups are filed:** the rendered half of `motion-hover-gate` with its trigger (the
  borrow-1 pass, which owns the consumer-facing gates layer); the `.tooltip` touch defect with the
  review's finding that closing it means gating the tooltip's **visibility**, not its transition, which
  is a behavioral override of a vendor component and a decision borrow-1 takes on its own terms; the
  `.menu` gate with the same follow-up; the `modal-bottom` reopen trigger if it is not carried as a
  `WATCH:`; and **the resize stopper**, in ROADMAP's Later tier, carrying the finding that its
  specified form is a no-op on the bare theme wrapper and its working form is a universal descendant
  rule costing one `unlayeredAllowlist` entry. That finding is the thing a future pass would otherwise
  re-derive.
- **`docs/extend/migration-notes.md` gets this window's entry.** The `cairn-pass` ritual requires a
  per-version record for any behavior change and this pass ships seven. Polish-C's task 14 rewrites
  that file's whole `## Unreleased` section concurrently, so this task reads the section whole and
  appends inside polish-C's ordering rather than by a line number.
- **If task 8 is cut, `Consumers must:` line 1 is amended before it is written.** The Risks section
  names the rendered half as the pass's one cuttable item. Line 1 names `motion-reduced-delay`, so a
  cut means the line drops its advisory-rendered clause and keeps the three static rules. This task
  checks whether `src/lib/audit/rules/rendered/motion-reduced-delay.ts` is in the tree before writing
  the line, and reports which version it wrote.
- **ROADMAP's "A motion language for the admin" entry is closed and removed from the live tier.**
  "Borrowable patterns" stays open, and this task adds the three filed follow-ups to it rather than
  creating a fifth tier entry.
- **The `## Unreleased` block is read whole.** This window carries seven `Consumers must:` lines, and
  this task writes the one the changelog table assigns to it and verifies all seven are present.
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
  `docs/reference/cairn-audit.md`, document `static.adminScope` with its default beside
  `static.cssFiles` in that page's config section, correct the `motion-band` band, write the coverage
  limits, and fix both prose counts.
- [ ] **Step 3b:** read `docs/extend/migration-notes.md`'s `## Unreleased` section whole and append
  this window's entry inside polish-C's ordering, one line per behavior change this pass ships.
- [ ] **Step 4:** write the ruling rows into `docs/internal/engine-rulings.md` in the full format,
  placed by reading the file's own ordering.
- [ ] **Step 5:** write the `docs/HISTORY.md` entry: what landed, what the gate caught, and what a
  later pass would be wrong to rediscover from scratch. Name at minimum the five items: that
  the admin boundary is one mechanism and not two, an `adminOnly` flag on the static rule type
  resolved over the config's `static.adminScope` roots inside `runStatic`, while `scopeReport` still
  filters by rule id alone and grew no path term, because a post-run filter can only subtract and
  can never restore a root the scope excluded; that
  `isReducedMotionGuarded` treated `(prefers-reduced-motion: no-preference)` as a guard, so a 3000ms
  transition inside an inverse gate was exempt from `motion-band`; that a reduced-motion restatement
  ties the blanket block on specificity and is decided by source order, measured in the built sheet;
  that `signature(el)` names a class of elements rather than an element, which is why the rendered
  differential has no join key; and that the emulation axis multiplies rendered contexts by the factor
  this pass measured.
- [ ] **Step 6:** close ROADMAP's motion entry, remove it from the live tier, and file the five
  follow-ups, the resize stopper in the Later tier with its finding.
- [ ] **Step 6b: write `Consumers must:` line 1.** Check whether
  `src/lib/audit/rules/rendered/motion-reduced-delay.ts` is in the tree, then append line 1 to
  `CHANGELOG.md`'s `## Unreleased` block verbatim from the changelog table, or the amended version
  naming the three static rules alone if task 8 was cut. Report which version it wrote. This is the
  one `Consumers must:` line this task owns, and no other step writes it.
- [ ] **Step 7:** triage `docs/internal/docs-friction-log.md` complete-or-move, or record both sections
  empty. Read the `## Unreleased` block whole and confirm all seven `Consumers must:` lines are present
  and correctly worded. Do not touch `package.json`. The check-plus-unit gate, with `check:docs`,
  `check:vale`, `check:rulings-format`, and `check:symbols` green. Commit.

**Acceptance criteria:**
- `docs/internal/admin-design-system.md` carries a Motion section naming all eight tokens with their
  Carbon aliases, the allowlist, the nine named errors, the one exception with its file-plus-selector
  key, the enter and exit rule with its floor, the carve-out and the zen offset's explicit exception
  to it, the modality gate with the selector-list split, the reduced-motion policy with the empty
  opt-back-in list, and **all eleven** vendor disagreements, each numbered, so the count is verifiable
  by grep. It also carries the four named limitations, each verifiable by its own quoted phrase: the
  breakpoint flip the shipped sheet does not honor and which this pass does not cover, the unasserted
  zen travel window, the skeleton's own 2.2.2 answer, and the `instant` bound on focus-indicator
  geometry.
- The Motion section and `docs/extend/animate-a-custom-screen.md` each carry a line naming the design
  system as canonical.
- `docs/extend/animate-a-custom-screen.md` names all four rules, the three join limits, and the two
  configuration lines a consumer may owe (`static.cssFiles` and `static.adminScope`, each with the
  default that makes it optional), and `grep -n "animate-a-custom-screen" docs/extend/README.md`
  returns the index entry.
- `docs/reference/cairn-audit.md` carries three new static rows, one rendered advisory row, and
  `static.adminScope` documented with its `src/routes/admin` plus `src/lib/admin-toolkit` default;
  the
  string "Twelve rules run, all error tier" appears nowhere in the file; and the string "All 28
  registered rules" appears nowhere in the file. The replacements read fifteen and 32.
- `docs/internal/engine-rulings.md` carries rows whose headings match
  `^## [a-z0-9-]+: .*\((accept|reshape|decline), \d{4}-\d{2}-\d{2}, ` with all five labeled lines
  beneath each, quoting decisions 3 and 4 and the two escalation rulings, and citing
  `docs/superpowers/specs/2026-09-13-admin-motion-language-design.md` with its 2026-09-13 date in the
  body. The heading's date is the date the row is written, which is not necessarily this plan's.
- `npm run check:rulings-format` passes.
- `docs/HISTORY.md` carries this pass's entry with the five named do-not-rediscover items.
- `ROADMAP.md` no longer lists "A motion language for the admin" in any live tier, and carries the
  five follow-ups.
- `docs/internal/docs-friction-log.md` has no untriaged entry.
- The `## Unreleased` block carries exactly seven `Consumers must:` lines from this pass, matching the
  spec's text verbatim, verifiable by
  `grep -c "Consumers must:" CHANGELOG.md` against the pre-pass count plus seven. If task 8 was cut,
  line 1 is the amended version and the report says so.
- `docs/extend/migration-notes.md` carries an entry for this window under `## Unreleased`, with one
  line per behavior change, and `git diff` shows the append landed inside polish-C's ordering rather
  than above it.
- `ROADMAP.md`'s Later tier carries the resize stopper with the phrase naming its working form's
  unlayered cost, verifiable by grep.
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
  filed, the friction entries triaged, the migration-notes lines added, and the `Consumers must:`
  count before and after.
- Re-emit before the gate.

**Gate:** the CHECK-PLUS-UNIT string, run as `cairn-run-gate '<check string>'`. This task touches no
engine source, so the blast radius is the doc gates; the string still runs whole rather than trimmed.

**Commit:** one, `docs: write the admin motion language and close the pass's records`.

---

## The changelog window

Seven `Consumers must:` lines, all in one release, quoted verbatim from the spec and assigned to the
task that ships each. No task writes a line the table does not assign to it, and every line has
exactly one owner.

| # | Line, verbatim from the spec | Task |
|---|---|---|
| 1 | `cairn-audit` gains three error-tier static rules (`motion-property`, `motion-vocabulary`, `motion-hover-gate`) and one advisory rendered rule (`motion-reduced-delay`). A custom admin screen that transitions a layout property, writes `transition-all`, writes a literal duration or easing, or declares an ungated hand-authored `:hover` transition now fails `npx cairn-audit`. Move onto the `--cairn-dur-*` and `--cairn-ease-*` tokens, or suppress with a reason. | **11** |
| 2 | `motion-band`'s band widens from 150ms to 250ms to 70ms to 400ms, and it no longer reports a call site that references a token. A site relying on the narrow band loses that check; the vocabulary rule is what replaces it. An existing `cairn-audit-disable-next-line motion-band` directive that covered a finding inside the old band and outside the new one now silences nothing, which `cairn-audit` reports as a dead suppression at error tier that cannot itself be suppressed: delete the directive on upgrade. The motion predicate also widens, so a `transition-delay` reaches `motion-band`'s band check and a rule declaring only `transition-timing-function` now owes a reduced-motion sibling under `reduced-motion`. | **2** |
| 3 | The admin sheet sets `--default-transition-duration` and `--default-transition-timing-function` to cairn tokens on the admin root. A bare `transition` utility on a custom screen changes curve from Tailwind's `cubic-bezier(0.4, 0, 0.2, 1)` to Carbon's productive standard `cubic-bezier(0.2, 0, 0.38, 0.9)`. The duration is unchanged at 150ms. | **1** |
| 4 | The admin's reduced-motion block now zeroes `transition-delay` and `animation-delay`. A custom screen that relied on a delay surviving a reduced-motion preference loses it, which is the fix. | **1** |
| 5 | The edit page's preview pane no longer animates its width when the split changes. The resize snaps. | **6a** |
| 6 | The upload progress fill no longer transitions its `width`, and no motion replaces it: the fill snaps to each new value. The native `<progress>` element is unchanged and keeps its implicit `progressbar` role and its `value`/`max` mapping, so nothing changes for assistive technology. The reduced-motion pin on `::-webkit-progress-value` goes with the transition it pinned. | **6a** |
| 7 | Three utility classes leave the packaged admin sheet, because their last call sites go: `transition-all`, `transition-[width]`, and `duration-[250ms]`. A site whose own markup carries any of the three was relying on the engine's sheet to compile it; add the class to that site's own Tailwind content or restate the declaration. | **6a** |

**Line 1 is task 11's rather than task 4's, and the reason is stated.** It names all four rules, and
three tasks ship them (3, 4, and 8). A line written when the trio was incomplete would be false at the
moment it landed. Tasks 3, 4, and 8 each append a plain changelog entry for what they shipped, and
task 11 writes line 1 once, verbatim, when the whole rule set is in the tree. If task 8 is cut, task
11 writes the amended line naming the three static rules alone and says so in its report.

**Task 6a owns three of the seven** (5, 6, and 7), which is the only task carrying more than two. All
three are consequences of the same migration, and line 7 is the one the shipped class inventory
forces: its fixture regeneration is in the same commit, so the line and the removal cannot drift.

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
npm run package && npm run check && npm test && npx publint --strict && npx attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs && node scripts/checks/reference-coverage.mjs && node scripts/checks/check-reference-signatures.mjs && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-self-use.mjs && node scripts/checks/check-custom-surface.mjs && npm run check:chassis-boundary && npm run check:cm-internals && npm run check:idioms && node scripts/checks/check-invisible-craft.mjs && node scripts/checks/check-admin-css-classes.mjs && node scripts/checks/check-readiness.mjs && npm run check:docs && npm run check:rulings-format && npm run check:target-stack && npm run check:arm-indexes && npm run check:editor-quotes && node scripts/checks/check-visuals.mjs && npm run check:transcripts && npm run check:symbols && node scripts/checks/check-snippets.mjs && npm run check:prose && npm run check:version && npm run check:dev-package && npm run check:template && node scripts/checks/check-consumers.mjs && npm run test:emit && npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test && npm --prefix examples/showcase run check && npm --prefix examples/showcase run test:unit && npm --prefix examples/showcase run format:check && npm run check:vale && npm run check:comments && CI=1 npm --prefix examples/showcase run test:e2e
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

**`publint` and `attw` are `npx`-prefixed, and the prefix is load-bearing.** `cairn-run-gate` runs
the string through `bash -c` under the ambient PATH, which does not carry `node_modules/.bin`; both
binaries exist only there. Inside an `npm run` script they resolve, which is why `check:package` gets
away with the bare form, but in this hand-assembled string the bare form exits 127 at the fourth
command on every task.

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

- **After task 4:** mergeable. The tokens, the two bug fixes, the reconciliation, and the three static
  rules are in the tree, and nothing is wired to the gate yet, so the gate is green with the rules
  dormant. Chain B is a separate branch and merges at the ritual, so it neither blocks this halt state
  nor is blocked by it.
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

The workflow run is one blocking `parallel()` call with no mid-run hook, so the conductor regains
control here and not before. Four things revision 1 of this plan put mid-run therefore live at the
head of this ritual.

0. **The conductor's own first four acts, in order.**
   - **Write STATUS twice**, once as the ledger for chain A's fourth completed task and once for its
     eighth, then continue. These are the checkpoint writes the token ceiling names; the interval is
     four tasks and the point where they can be written is here.
   - **Merge `admin-motion-8` into `admin-motion`.** Chain B holds nothing chain A depends on, so the
     merge is a fast-forward or a trivial three-way. If task 8 was cut, the branch is abandoned and
     the ritual says so.
   - **Open the PR** on `admin-motion`. No implementer pushed; the runner's prompt orders commits
     only.
   - **Push**, so CI has something to run before the gates below are read.
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
     The per-task capture pairs were cut to `signups` and `styleguide`; this is where the full set is
     read, which is why it stays six here.
   - **The read is bounded.** The verifier reads one above-the-fold tile per capture, plus the tiles
     the `## Admin motion` intended-moves rows name, and nothing else, with one verdict per visual
     device and COSMETIC or STRUCTURAL on each.
   - **The loop is bounded:** verify, fix, fresh verify. A second FAIL halts and is the conductor's
     decision, never a third round.
8. **The reviewer fan-out**, named per what this pass touches. No task dispatched any of these.
   - **`daisyui-a11y-reviewer`** over every markup and CSS change: `CairnAdminShell.svelte`,
     `EditPage.svelte`, `MarkdownEditor.svelte`, `CairnMediaLibrary.svelte`, `ConceptList.svelte`,
     `MediaHeroField.svelte`, `HelpHome.svelte`, and `cairn-admin.css`. It reads the upload progress
     bar's preserved `<progress>` semantics, the dropzone's drag-over state on a coarse pointer,
     the modality gate's selector splits against keyboard focus on a touch device, and the
     reduced-motion policy against WCAG 2.2 and DaisyUI 5.
   - **`svelte-reviewer`** over the same `.svelte` files, reading for reactivity defects in the
     dropzone's `dragOver` state and its `relatedTarget` test, and in zen's `flushSync()` focus
     sequence.
   - **`cloudflare-workers-reviewer` runs only if a worker file changes.** No task in this pass is
     planned to change Worker runtime code, a D1 query, or a binding, so the expected answer is that
     it does not run. The conductor checks the diff rather than assuming.
   - **`web-auth-security-reviewer` does not run.** This pass changes no auth path.
9. **Docs this pass owns**, confirmed present: `docs/internal/admin-design-system.md` (the Motion
   section with eleven disagreements and four named limitations),
   `docs/extend/animate-a-custom-screen.md` and its index entry, `docs/reference/cairn-audit.md`
   (three static rows, one rendered advisory row, the band correction, both prose counts),
   `docs/extend/migration-notes.md` (this window's entry, which the `cairn-pass` ritual requires of a
   pass that changes behavior), and `docs/internal/engine-rulings.md` (the new rows).
10. **The live admin smoke** (`docs/internal/admin-smoke-test.md`, under `wrangler dev`), which the
    `cairn-pass` ritual requires of any plan touching the `/admin` surface. This pass rewrites the
    admin's motion end to end, so the smoke is owed. **It is skipped, with the reason recorded here
    rather than omitted:** the pass runs unattended, the smoke is an interactive walk-through, and the
    motion it would exercise is proved by the two zen layout-count assertions, the sixty new
    CI-canonical baselines, and the fresh-context `visual-verifier`. The conductor records the skip
    and its reason in `docs/HISTORY.md` beside the pass entry, so the next pass sees a decision rather
    than a gap. If Geoff's own before-and-after read on the merged branch surfaces anything the three
    proofs missed, the smoke runs then.
11. **`CHANGELOG.md` under `## Unreleased`**, finalized, carrying all seven `Consumers must:` lines
    verbatim, each with exactly one owning commit.
12. **`docs/HISTORY.md`** carries this pass's entry with its five do-not-rediscover items (task 11).
13. **`ROADMAP.md`** has "A motion language for the admin" closed and removed from the live tier, with
    the five follow-ups filed (task 11), the resize stopper among them in the Later tier.
14. **The friction log** triaged whole in task 11, complete-or-move, never appended to.
15. **The intended-moves manifest** carries an `## Admin motion` heading whose rows account for every
    baseline this pass moved, verified by diffing
    `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` against `main` and matching each changed
    file to a row.
16. **The conductor writes `docs/STATUS.md`** at merge, never a task.
17. **Geoff merges.**
18. **The next plan, drafted while the context is warm**, and the context clear pre-baked: the
    artifacts point at the next action, `docs/STATUS.md` names it, and nothing load-bearing lives only
    in this conversation. The `cairn-pass` ritual marks both as always rather than on request.
19. **The release cut, after the merge.** This pass is the last before the cut (decision 7), so the
    conductor runs the `cairn-release` skill once `admin-motion` is on `main` with CI green. Verify the
    next number is free with `npm view @glw907/cairn-cms versions --json` before promising it, set the
    number only at the cut, and cut with `gh release create v<x.y.z> --target main`, which fires the
    OIDC publish workflow. The release body is the changelog window since the last published tag,
    carrying **every** `Consumers must:` line in the window, this pass's seven and polish-C's
    included.
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
- **The `adminOnly` scope is a rule-type change, a config key, and one line in the gate's own
  config, and none of the three exists yet.** Without the first two the three new ids run at error
  tier over a consuming site's public components and over the showcase's public theme. Without the
  third the gate under-covers silently, resolving the three rules over the key's default, which in
  this tree reaches `src/lib/admin-toolkit` alone and never
  `src/lib/components/cairn-admin.css`. The field and the key are task 3's, task 4's rule declares
  the field, and the gate's `static.adminScope` is task 10's. **Mitigation:** task 3 asserts the
  resolution directly against the consumer default, and task 10's acceptance criterion is a paired
  run, a control arm with the gate's `static.adminScope` set to the five `SCAN_SCOPE` roots, which
  produces the showcase theme and chassis findings, against the shipping arm with the three admin
  roots, which produces none, with `gap-scale`, `token-colors`, and `motion-band` keeping the full
  five-root scope, proved by their finding counts being equal in both arms, and the showcase's own
  admin route staying in scope.
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
  new surfaces at five widths in two themes is exactly 60 new CI-canonical baseline files, committed
  by the regen run, on top of whatever the five paint tasks move in the existing set. Three things make
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
  published tag, carrying this pass's seven `Consumers must:` lines and polish-C's.
- **To a later pass, the resize stopper**, filed to ROADMAP's Later tier with the finding that makes
  it cheap to re-argue: its specified form is a no-op, because a class on the bare theme wrapper never
  matches the admin sheet's scoped rules and transition properties do not inherit, and its working
  form is a universal descendant rule costing one `unlayeredAllowlist` entry.
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
  recorded in task 11's HISTORY entry: that the admin boundary resolves inside `runStatic`, through
  `adminOnly` over `static.adminScope`, while `scopeReport` filters by rule id alone and cannot carry
  it, because a post-run filter can only subtract;
  that `isReducedMotionGuarded` treated the inverse gate as a guard; that a reduced-motion restatement
  ties the blanket block on specificity and is decided by source order; that `signature(el)` names a
  class of elements rather than an element; and the factor by which the emulation axis multiplies
  rendered contexts.

---

## Post-mortem

The `cairn-pass` ritual appends the post-mortem here at pass close, scoring both budgets against the
ceiling and the interaction counts.
