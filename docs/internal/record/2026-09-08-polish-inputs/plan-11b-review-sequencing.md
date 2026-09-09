# Polish-11b plan review, sequencing and risk lens

Target: `docs/superpowers/plans/2026-09-08-polish-11b-pass.md` (uncommitted, 1838 lines).
Spec: `docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 4 (`ac911ec3`).
Neighbours read: `docs/superpowers/plans/2026-09-08-polish-11a-pass.md` (committed `f273274e`),
`docs/superpowers/plans/2026-09-08-polish-c-pass.md` (uncommitted draft),
`.claude/worktrees/chassis-b2` at `4de378ec`.
Lens: task order across the three runs, cross-pass collisions, the polish-C hand-forward, the
`cairnAccess` seam and its adoption, ceiling and checkpoints, halt state, verifier budget.
Read-only. Fourteen findings.

**Measured state that shapes several findings.** Chassis-B2 at `4de378ec` has landed only its
content-corpus and archive tasks. Its Task 3 (site identity through `page.data.siteName`), Task 5
(`scripts/checks/check-public-tokens.mjs`) and Task 6 (the signups server) are **not in the branch
yet**, so every 11b statement about what B2 left behind is a forecast, not a measurement. No
`polish-11a` branch exists, so 11a is likewise unrun. 11b therefore sits two unmerged passes
downstream of its own anchor measurements at `4453f540`.

## Ranked findings

**1. Plan:Task 1 vs Tasks 9, 10, 14 and the Reconciliation table -- Task 1 inserts prose into
`admin-design-system.md` at `:547-551` and `:843-849`, and five later citations in this same plan
are pinned line numbers below that insertion point.** Evidence: Task 1 Step 2 writes "the two busy
shapes into the design system" beside the guarded-button passages at `:547-551` and `:843-849`.
Every anchor after `:551` then moves by the inserted length. In this plan alone the casualties are
Task 9's escape-hatch recipe at `admin-design-system.md:574-576`, Task 5's contrast cite at
`:1013`, Task 10's `scope="col"` cite at `:1015`, Task 14's safe-delete recipe at `:917-923`, and
the Reconciliation row for the floating-card recipe at `:1215-1216`. The plan applies exactly the
right discipline to `engine-rulings.md` (the semantic column orders Tasks 1 and 15 to locate rows
"by slug with `grep -n`, never by reusing a line number from this plan") and then does not apply it
to the file its own first task rewrites. Correction: add a line to the semantic column stating that
Task 1 moves every `admin-design-system.md` anchor after `:551`, and change Tasks 5, 9, 10 and 14
to locate their design-system citations by section heading or quoted text rather than by line.

**2. Plan:Tasks 2, 7, 8 and Tasks 13, 14 -- the Reconciliation block re-anchors against post-11a
`main` and never against the pass's own earlier tasks, so four tasks cite line numbers a preceding
task in the same run has already moved.** Evidence: the Reconciliation preamble says "the executor
re-verifies each against post-11a `main` before its task runs", which is a one-time rebase against
the branch point. Inside the pass, Task 2 edits `EditPage.svelte:255-264` and `:1276-1295`; Task 7
then wraps the narrow pill at `:1413` in a new `role="status"` element; Task 8 then cites `:1560`,
`:1561-1566` and `:2303-2326` as measured on `main`. Each of those three is below both earlier
edits. The same defect runs through the showcase: Task 13 rewrites the signups form at `:15-22`
into a stacked-label register (a line-adding change), and Task 14 then pins the Delete button at
`:39` and its form at `:36-40`. Correction: state in the Reconciliation block that anchors are
re-verified at each dispatch against the branch HEAD, not against the branch point, and mark Tasks
7, 8 and 14 as tasks whose anchors a predecessor moves.

**3. Plan:Task 14 -- the confirm dialog falsifies `examples/showcase/e2e/custom-screen.spec.ts`,
which every task in the pass lists as read-only and expected to pass.** Evidence: the committed
spec at `:31-33` reads `await row.getByRole('button', { name: 'Delete' }).click();` followed by
`await expect(page.getByRole('cell', { name })).toHaveCount(0);`. Task 14 puts a native
`<dialog role="alertdialog">` with no light dismiss in front of that POST, so the click opens the
dialog and the row survives. Task 14's Test line says only "`custom-screen.spec.ts` (read)", its
acceptance never names an edit, and Task 12's acceptance affirmatively requires the spec to be "not
in the diff". The per-row `aria-label` is harmless by comparison (Playwright name matching is
substring by default, so "Delete Ada-123" still matches `name: 'Delete'`). Correction: Task 14
edits `custom-screen.spec.ts` to confirm through the dialog, that edit is named in its Files block
and its acceptance, and Task 12's "not in the diff" clause is scoped to Task 12.

**4. Plan:Pass-end ritual item 8 -- the `visual-verifier` is budgeted at zero and bounded at
nothing, against a capture set roughly double chassis-B1's.** Evidence: the verifier's subject is
nine admin routes at five widths in both schemes, which is 90 captures, plus two unbaselined states
opened by hand (the palette and the login confirmation), giving 92 at the floor and more if those
two states are also taken at five widths. Each capture is then read as tiles. Chassis-B1's ceiling
line budgets "about 0.5M for the pass-end verifier over five surfaces"
(`2026-09-07-chassis-b1-pass.md:37-39`), which is 50 captures; at that rate 11b's set is roughly
1.0M. The 11b ceiling arithmetic allocates only "about 0.3M for the two mid-chain conductor CI
regen waits and the two render-and-tile-read proofs", naming the verifier nowhere. B1 also bounded
the verifier's loop ("verify, fix, FRESH verify; a second FAIL is the conductor's decision") and
its verdict vocabulary; 11b bounds neither, and carries no equivalent of B1's named one-check
conductor read. Correction: add a verifier line to the ceiling arithmetic at B1's measured rate,
cap the tile read the way the paint protocol caps a task report (one above-the-fold tile per
capture plus the manifest's rows), and copy B1's bounded verify-fix-verify loop.

**5. Plan:Execution and Checkpoint interval -- the two capture-bearing paint tasks (13 and 14) sit
after the last checkpoint with no CI regen until the pass is over, and the plan declines a fourth
cut by name.** Evidence: checkpoints fall at 4, 8 and 12, and run cuts after 5 and 10. Tasks 13 and
14 each move all ten `admin-signups-*` baselines, each carries a capture pair, and each mirrors to
the template. The plan's Execution block says "Run three's paint tasks (13 and 14) are covered by
the pass-end regen rather than a fourth cut". So twenty baseline moves get their first canonical CI
verification at the moment the pass is otherwise finished, with no checkpoint between the last
STATUS write and that verification, and any unintended move discovered there is fixed at the
ceiling's edge. Contrast the riskiest earlier tasks, which are each covered: Task 4 (combobox) is
followed immediately by the checkpoint at 4, Task 5 by the run-one cut and regen, Tasks 11 and 12
by the checkpoint at 12. Correction: cut run three after Task 14 and regen there, or move the
checkpoint from 12 to 14 and add a regen with it.

**6. Plan:Global constraints and Gate -- `check:public-tokens` walks every `.svelte` under
`examples/showcase/src`, including the signups route Tasks 13 and 14 rewrite, and it is left to CI
while chassis-B2's Task 5 is concurrently editing it.** Evidence:
`scripts/checks/check-public-tokens.mjs` resolves `SHOWCASE_SRC` as `examples/showcase/src` and its
walk takes "every `.svelte` file" recursively (`:79`), failing on any literal colour or hard-coded
absolute font size. `examples/showcase/src/routes/admin/signups/+page.svelte` is inside that tree.
The 11b gate string does not include `check:public-tokens`; the "Left to CI, deliberately" block
puts it in `design.yml` and says only that a red `design.yml` is "a blocking finding for the pass".
Since Tasks 13 and 14 are the last two code tasks, a violation surfaces at pass end, and the
script's own shape may have changed under B2's unmerged Task 5. Correction: add
`npm run check:public-tokens` to the gate for the tasks that touch `examples/showcase/src`, and add
a Reconciliation row for the script's post-B2 shape.

**7. Plan:Task 8 -- the `hidden` attribute does nothing on an element carrying a Tailwind display
utility, so `inert` alone carries the claim the task rests on, and the acceptance proves it only in
component tests.** Evidence: Task 8's Decisions block states "`hidden` plus `inert` removes the
branch from the accessibility tree and from Playwright's role locators", and both branches carry
display utilities (`EditPage.svelte:2305-2307` is `class="fixed ... flex ..."`, `:1567` is
`class="flex items-center gap-2 ..."`). Tailwind v4 emits `[hidden]{display:none}` in the base
layer and `flex{display:flex}` in the utilities layer, so the utility wins and the element is not
`display:none`; the `hidden` attribute's a11y-tree removal is a consequence of that computed style,
not of the attribute. `inert` does remove the subtree independently, so the fix works, but for one
reason rather than two. Correction: state that `inert` is the load-bearing attribute and that
`hidden` is a declaration of intent under these classes, and put at least one acceptance in the
Playwright layer (an accessible-name count at 390 and 1440 in a real browser) rather than only in
the component suite.

**8. Plan:Task 8 acceptance -- "no `narrow` gate around the bottom action bar" invites deleting the
zen half of a two-condition gate.** Evidence: the gate at `EditPage.svelte:2303` is
`{#if !prefs.zen && narrow}`, and its comment at `:2300-2302` says the bar is "Hidden under zen
with the rest of the chrome, the same gate the band and the footer strip use". The design system at
`:155` ratifies that zen "drops the whole topbar and the persistent sidebar, at every width" and
keeps only a floating chip. Task 8's Decisions block discusses only `narrow`, and its acceptance
names only the `narrow` gate, so an implementer clearing the criterion literally can remove the
whole `{#if}`. Correction: the acceptance states that `prefs.zen` survives as an `{#if}` and that
only the `narrow` half becomes attribute-driven.

**9. Plan:Reconciliation semantic column and Global constraint 13 -- the chassis-B2 collision is
named on one axis and missed on two.** Evidence: the semantic column quotes B2's Task 6 keep of
"the raw `requireOwner` shape and its comment" and orders Task 12 to overrule it. It does not name
B2 Task 6's other stated change to the same lines, the removal of the three `platform!` assertions
(`+page.server.ts:19`, `:32`, `:45` today), which is exactly the code Task 12 replaces with
`resolveDb` reading `env.APP_DB`. Separately, Global constraint 13 pins the capture tool's surface
matrix at `capture-surfaces.mjs:59-109`; B2 has **already landed** an eleven-line addition above it
(`4aac78db`, a new `waitForYearHeading` plus a comment rewrite), so that anchor is stale today, and
`capture-surfaces.mjs` appears in no Reconciliation row. Correction: add both to the semantic
column, and add `capture-surfaces.mjs` to the anchor table with a locate-by-symbol instruction
(`grep -n "const SURFACES"`).

**10. Plan:Task 11 -- defaulting `locals.cairnAccess` to `{}` in the dev handle erases the one
signal `section-action.ts` uses to detect an unwired guard, and the plan asserts parity without
naming that consequence.** Evidence: `guard.ts:365-368` carries the reasoning in code: "an absent
`locals.cairnAccess` then only ever means the guard never ran on this route", and
`section-action.ts:288-291` turns `access === undefined` into
`misconfigured('rejected: access map not attached')` with `fail(500)`. In the showcase the dev
handle *replaces* `createAuthGuard` outright (`hooks.server.ts:18-32` is an if/else, not a
sequence), so today that branch is reachable in dev and is the thing that would tell a developer
their wiring is missing. Task 11's decision "A site that passes no `access` gets `{}`" makes it
permanently unreachable under the dev backend. Correction: either attach only when an `access`
option is supplied (which preserves the misconfigured signal and still satisfies Task 12, whose
declaration is mandatory), or state the suppression deliberately in the TSDoc and in the
`web-auth-security-reviewer` dispatch. On the circular-import question the plan is clean:
`packages/cairn-cms-dev/package.json` already carries `@glw907/cairn-cms` as a peer plus a `file:`
devDependency and `handle.ts:12` already type-imports `Backend` from it, so `AccessMap` and
`RolesDeclaration` (exported at `src/lib/index.ts:25` and `:20`) add no new edge.

**11. Plan:Rollback and halt semantics -- "the branch is mergeable at each of the sixteen commits"
is false for every commit that regenerated a baseline locally, which the same section then
concedes.** Evidence: the section opens with the mergeability claim and closes with "Baselines
regenerated locally but not yet through a conductor CI regen are the one thing a resuming session
must check". Merging requires green CI, and the pass exists in three runs precisely because locally
regenerated baselines are not canonical. The concrete halt states are therefore: after Task 5 and
its regen, mergeable; after Task 10 and its regen, mergeable; anywhere else inside a run that moved
paint, red on `e2e.yml` until a regen runs. The plan never states this per cut. Correction: replace
the blanket claim with three named halt states (after run one's regen, after run two's regen,
after the pass-end regen) and say that a mid-run halt owes a regen before merge.

**12. Plan:Token ceiling -- the spec amendment the plan orders is under-scoped by one clause, and
the 7.5M is derived from a band whose measurement passes look nothing like 11b's tasks.** Evidence:
the spec's ceiling sentence reads "11a 6.5M ..., 11b 5.5M, C 7M, so 19M is the total on the table";
raising 11b to 7.5M makes the total 21M, and the plan's instruction amends "the 11b ceiling and its
basis, nothing else". On the derivation, the band (370K to 530K) comes from module-split and
conformance passes; `docs/HISTORY.md` records `~4.6M` against a 4.5M ceiling (`:343-344`), `~2.3M`
against 1.8M (`:386`), `~2.1M` against 1.8M (`:449`), and `~7.5M` against a thrice-raised 1.5M
(`:547`). Every recorded number is an overrun, which the plan honestly notes, but the plan then
prices sixteen tasks at the band's *middle* while Tasks 3, 9 and 15 are single-file attribute or
regex edits. The countervailing cost the plan cites (a full gate per task) is real and is a
wall-clock exposure as much as a token one: the gate string runs `npm run package` plus a full
`CI=1` showcase e2e sixteen times. Correction: amend the total to 21M in the same edit, and price
the verifier separately per finding 4 rather than inside the per-task band.

**13. Plan:"What this pass hands forward" -- the polish-C hand-forward gives the floating-card
recipe's body at `admin-design-system.md:95`; the recipe body is at `:353-359`, which is where
polish-C's own draft correctly cites it.** Evidence: 11b's Reconciliation row reads "the
floating-card recipe at `admin-design-system.md:1215-1216` | Confirmed. The recipe's own body sits
at `:95`". Measured, `:95` is the "Borders and shadows are theme-adaptive vars" bullet;
`:353-359` under "Component recipes" is the recipe, whose class set is `card-shell card-shadow`.
Polish-C's draft has it right at `:118` and `:228` and composes against it in Task 1
(`:631-637`, `:649-659`). So C is not misled today, but the hand-forward names no class set and
gives a wrong anchor, and 11b's Task 1 will move C's other pinned anchor at `:1215-1216`.
Correction: the hand-forward names the recipe as "Component recipes, Floating card
(`card-shell card-shadow`)" with no line number, and states that Task 1's insertion shifts every
design-system anchor after `:551` so C re-measures. The 11b commitment that matters most to C holds
as written and is verified: no 11b task opens `OfficeList.svelte`, `add-a-custom-admin-screen.md`,
the `toolkit/custom-screen` reproduction, or the recipe itself, so C's Task 10 removal lands on the
tree it expects. One process note: the spec at `:502-505` says polish-C's plan is authored *after*
11a and 11b merge, and a C draft already exists on disk with anchors measured on today's `main`.

**14. Plan:Reconciliation table -- roughly a dozen task-body read anchors sit outside the table, so
no re-verify instruction reaches them, and one cross-pass claim in the header is wrong.**
Evidence: the table's preamble promises "Every `file:line` below", and the tasks then cite anchors
that never appear in it: `VocabularyAdmin.svelte:179` and `EditPage.svelte:1442` (Task 9),
`ManageEditors.svelte:147` and `DeleteDialog.svelte:12-34`, `:71`, `:103` (Task 14),
`section-action.ts:37-46`, `:49-69`, `:170` (Task 12), `MediaPicker.svelte:194-215` (Task 4),
`StatusChip.svelte:33-51` (Task 7). Several sit in files 11a reopens. Relatedly, the header claims
11a reopens "`VocabularyAdmin.svelte` and `CairnMediaLibrary.svelte`, which Tasks 5 and 10 touch";
no 11b task touches `VocabularyAdmin.svelte`. Its only 11b consumer is Task 9's unlisted `:179`
read anchor, and 11a's Task 7 rewrites eleven copy lines in that file at `:162` through `:347`,
which brackets `:179`. Correction: fold the task-body read anchors into the table (or add one
sentence extending the re-verify rule to them), and fix the `VocabularyAdmin` sentence to name Task
9's read anchor.

## Collision table

| File | Other pass and task | 11b task | Reconciled |
|---|---|---|---|
| `examples/showcase/src/routes/admin/signups/+page.server.ts` | chassis-B2 Task 6 (unmerged): keeps the raw `requireOwner` shape and its comment, removes three `platform!` assertions | Task 12 | **Partly.** The comment and the `requireOwner` keep are named and overruled; the `platform!` removal on the same lines is not. |
| `examples/showcase/scripts/capture-surfaces.mjs` | chassis-B2 (landed, `4aac78db`): +11 lines above the surface matrix | Global constraint 13, pinned at `:59-109` | **No.** The anchor is already stale and the file is in no Reconciliation row. |
| `scripts/checks/check-public-tokens.mjs` | chassis-B2 Task 5 (unmerged) | Tasks 13 and 14 are governed by it; no 11b task edits it | **No.** Not in the gate string, not in the anchor table, and the gate runs only in CI at pass end. |
| `src/lib/components/VocabularyAdmin.svelte` | polish-11a Task 7: eleven copy lines `:162` to `:347`, plus two comments | Task 9 read anchor `:179` (unlisted) | **No.** The header attributes it to Tasks 5 and 10, which do not touch the file. |
| `docs/internal/admin-design-system.md` | intra-11b: Task 1 inserts at `:547-551` and `:843-849` | Tasks 5, 9, 10, 14 cite `:574-576`, `:917-923`, `:1013`, `:1015`; polish-C cites `:1215-1216` | **No.** The by-slug discipline applied to `engine-rulings.md` is not applied here. |
| `src/lib/components/EditPage.svelte` | intra-11b: Task 2 then Task 7 move lines above Task 8's anchors | Tasks 2, 5 (read), 7, 8 | **No.** Re-anchoring is specified against the branch point only. |
| `examples/showcase/src/routes/admin/signups/+page.svelte` | intra-11b: Task 13 adds label markup above Task 14's anchors | Tasks 13, 14 | **No.** Same defect. |
| `examples/showcase/e2e/custom-screen.spec.ts` | committed spec, `:31-33` | Task 14 (dialog gates the Delete click) | **No.** Listed read-only in Tasks 12, 13 and 14. |
| `src/lib/components/ShareLinkPanel.svelte` | polish-11a Task 10: TSDoc fixes at `:51-52` | Task 6 rewrites `:124-134` and `:176-196` | Yes. Named in the header as a re-read. |
| `src/lib/components/CairnMediaLibrary.svelte` | polish-11a Tasks 4 to 6: import repoints | Task 5 (read), Task 10 (five glyphs) | Yes. Named in the header. |
| `src/lib/components/EditPage.svelte:667` | polish-11a Task 3: a comment naming the retired module | Tasks 2, 7, 8 | Yes, by the same header sentence; the drift is one comment line. |
| `eslint.config.js` (`.svelte` glob at `:80`) | polish-11a Task 10 widens it to `src/lib/components/**` | Global constraint 8, every comment 11b writes | Yes. Called out as the constraint most likely to surprise the pass. |
| `docs/internal/engine-rulings.md` | polish-11a inserts rows | Tasks 1 and 15 | Yes. Locate-by-slug is ordered explicitly. |
| `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md` | polish-11a Task 7 adds `## Polish-11a` (verified at `11a:1147`) | Every paint task appends under `## Polish-11b` | Yes, with a stated fallback if 11a did not add the heading. |
| `CHANGELOG.md` `## Unreleased` | polish-11a, every task | Every task, Task 16 reads the whole block | Yes. |
| `ROADMAP.md` polish sub-bullet `:342-361` | chassis-B2 Task 8 rewrites it; polish-11a closes two | Task 16 | Yes. Reconcile-then-close is ordered. |
| `templates/waymark/src/routes/admin/signups/*` | chassis-B2 Task 6 re-emits | Tasks 12, 13, 14 | Yes, through `emit:template` in the same commit and `check:template` in the gate. |

Unreconciled: **eight** rows (the first eight), of which three are cross-pass (B2's `platform!`
removal, `capture-surfaces.mjs`, `check-public-tokens.mjs`), one is cross-pass and mis-attributed
(`VocabularyAdmin.svelte`), three are intra-pass anchor drift, and one is a falsified committed
test.

## Sizing verdict

**Split.** Cut at the existing run-two boundary: **11b-i is Tasks 1 to 10** (the design system, the
shell's keyboard and combobox work, the pressed cue, the live regions and the busy convergence, the
desk band, the login page, the small conformance sweep), and **11b-ii is Tasks 11 to 16** (the
`cairnAccess` seam, the signups exemplar's three halves, `formatTimestamp`, records). The cut is
already drawn: the plan's own run-two/run-three boundary sits there, with a conductor CI regen and
an anchor re-verification on either side, and the two halves share no file, no baseline and no
ledger row except `CHANGELOG.md` and `ROADMAP.md`. The plan's task-split count makes the proposal
overdue by the workstation's own rule: it performs three splits of spec tasks (spec task 1 into
two, spec task 6 into two, spec task 10 into three), and a third split is the point at which
proposing a pass split is late rather than early. The ceiling supports it too: 11b-i is ten tasks
at about 4.5M with no verifier over the showcase, 11b-ii is six tasks at about 2.7M plus the
verifier, and neither half needs the 7.5M that pushes the polish initiative to 21M. Each half needs
its own records task, so Task 16 splits, and 11b-i hands 11b-ii the `## Unreleased` block and the
open ROADMAP sub-bullets exactly as 11a hands them to 11b today. If the pass is kept whole, the
minimum is finding 5's fourth run cut after Task 14 plus finding 4's verifier budget, which
together add roughly 1M to the ceiling anyway.

## Checked and found sound

- **Task 1 first.** The reason given (doc-only, corrects eight references to a component that does
  not exist, every later implementer reads it) holds, and the eight `AdminLayout` hits are exactly
  the eight the plan enumerates. The spec's ordering constraint (the busy rule before the
  convergence) is preserved and strengthened, and Tasks 4, 6 and 13 each cite the rule Task 1
  writes.
- **Task 11 before Task 12.** Correct and correctly reasoned. `createSectionAction` fails closed on
  an absent map (`section-action.ts:288-291`), the showcase's dev branch replaces the guard
  outright (`hooks.server.ts:18-32`), so adopting the wrapper before the dev handle attaches an
  access map would turn `custom-screen.spec.ts` red. Both tasks are inside run three, as the plan
  requires.
- **The adoption's gate is named and real.** `custom-screen.spec.ts:22-33` exercises both the
  create and the delete POST against the dev backend, so a wrong access rule fails the e2e in the
  per-task gate rather than at pass end. Task 12's acceptance names that spec.
- **No circular import in the seam.** The dev package already depends on the engine as a peer plus
  a `file:` devDependency and already type-imports from it; `AccessMap` and `RolesDeclaration` are
  exported at `src/lib/index.ts:25` and `:20`.
- **Tasks 15 and 16 last is right, and Task 15 is genuinely paint-neutral.** The plan asserts it
  without evidence; measured, `formatTimestamp` has exactly one rendering consumer,
  `CairnHistory.svelte`, whose route is in none of the twenty-eight admin baselines, so no seeded
  value can move paint. That evidence belongs in the plan.
- **The `DeleteDialog` correction.** Verified: props are `conceptId`, `id`, `singular`,
  `inboundLinks`; the form posts to a hardcoded `?/delete` while the signups row posts to
  `?/remove`; the dialog label id is fixed. The spec's instruction cannot be followed, and the
  plan's route-local alertdialog is the right call under the no-new-surface constraint.
- **The `check:template` byte-identity constraint** and the per-commit `emit:template` rule cover
  all three signups tasks.
- **The ledger discipline for `engine-rulings.md`** (locate by slug, annotate rather than rewrite a
  closed row, `check:rulings-format` as the acceptance on an annotated row) is exactly right and is
  the model the design-system anchors should follow.
- **The pass carries no `Consumers must:` line** and no version bump, consistent with the one cut
  after polish-C.
