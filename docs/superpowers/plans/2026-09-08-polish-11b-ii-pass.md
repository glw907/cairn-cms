# Polish-11b-ii Pass Implementation Plan (audit remediation, slice 11b-ii: the cairnAccess seam, the signups exemplar, and formatTimestamp, non-breaking)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (sequential), launched as TWO
> workflow runs; see Execution. Steps use checkbox syntax for tracking. Every anchor is
> re-verified at dispatch against the branch HEAD, per the Reconciliation block below.

**Goal:** the dev handle at parity with the guard on `locals.cairnAccess`, the showcase's first
`access` declaration authored as exemplar surface, the signups exemplar teaching the engine's own
recipes (the documented action wrapper, a stacked label register, an announced outcome, a named and
confirmed destructive action), `formatTimestamp` widened to every shape that names its own zone, and
the records for this half of the slice.

**Spec:** `docs/superpowers/specs/2026-09-08-polish-passes-design.md`, revision 4, section
"Polish-11b", with the Decisions block (5, 7, 8, 9, 11), the Dispositions table, "Sequencing and
budgets", and "Risks". **The spec's "Polish-11b" section is executed by two passes, polish-11b-i and
this one.** Polish-11b-i carried the spec's tasks 1 through 8 (the design system and the engine
admin surface). This pass carries the spec's tasks 9 through 12. Geoff ruled the split on 2026-09-08
at the draft plan's run-two boundary.

**Folded 2026-09-08** from the three-lens adversarial plan review of the unsplit draft (records
under `docs/internal/record/2026-09-08-polish-inputs/`: `plan-11b-review-coverage.md`,
`plan-11b-review-executor.md`, `plan-11b-review-sequencing.md`; disposition per finding, with the
half it landed in, in `plan-11b-review-fold.md`).

**Inputs:** the admin sweep `docs/internal/record/2026-09-08-polish-inputs/admin-sweep.md` (A9 to
A13 route here), decision 5, and the design system `docs/internal/admin-design-system.md`, whose
anchors polish-11b-i's Task 1 moved. No finding from
`docs/internal/record/2026-09-08-polish-inputs/exports-sweep.md` routes to either 11b half.

**Task count:** six, the unsplit draft's Tasks 11 through 16 renumbered 1 to 6, with no work added
or removed. The draft's Task 16 held the records for both halves; polish-11b-i writes its own
records in its Task 11, so this task 6 carries only this half's HISTORY entry, this half's two
ROADMAP closes, and the final read of the whole `## Unreleased` window before polish-C branches.

The one spec-task split the draft made in this range is preserved. The spec's task 10 (the signups
exemplar) is Tasks 2, 3 and 4, cut at the server-and-markup boundary and again between the form and
the destructive row, because that one spec task carries seven deliverables and its destructive half
is the one that overrules a documented component choice.

**Token ceiling:** 5.0M. The arithmetic, with every line item named rather than folded into a
per-task band:

| Line item | Basis | Tokens |
|---|---|---|
| Four ordinary task chains | Tasks 1, 2, 5 and 6 at the measured band's middle of about 450K | 1.8M |
| Two capture-bearing task chains | Tasks 3 and 4 each carry a capture pair, tile diffs per tile, a template re-emit, and an e2e edit, which puts them above the band | 1.1M |
| Re-dispatch reserve | two fix rounds, each a second implementer dispatch plus a second Opus review | 0.55M |
| Pass-end `visual-verifier` | chassis-B1's measured rate over a bounded capture set, cut to the routes this pass recomposes | 0.5M |
| Reviewer fan-out | `web-auth-security-reviewer` over the seam and the adoption, `daisyui-a11y-reviewer` and `svelte-reviewer` over the signups route, plus `code-simplifier` | 0.85M |
| Conductor CI regen wait and the render proof | one mid-chain regen, the pass-end regen, and Task 3's tile read | 0.2M |
| **Total** | | **5.0M** |

The band is the risk lens's measurement for this repo, 370K to 530K per task over four comparable
passes. The repo's recorded overrun history is four for four on the last comparable passes
(`docs/HISTORY.md:343-344`, `:386`, `:448-449`, `:547`), so at 80 percent of the ceiling the
conductor finishes the task, writes STATUS, and asks one combined question.

**Checkpoint interval:** every four tasks, so one checkpoint at Task 4, which is also the run cut and
therefore a single write rather than two. The pass close is the second STATUS write.

**Execution:** sequential, one chain, in one worktree: `.claude/worktrees/polish-11b-ii` on branch
`polish-11b-ii`, branched from `main` after polish-11b-i merges. No parallel chains: the single
end-to-end slot, `CHANGELOG.md`, `docs/internal/engine-rulings.md`, and the one
`admin-visual.spec.ts-snapshots` directory are all contended. Open the PR after Task 1's commit.

**Two tasks run on Opus.** Tasks 1 and 2 carry `"model": "opus"` in the args, per the workstation
rule for novel correctness-critical logic. Task 1 is this pass's only authorization-seam change and
the plan leaves it real design latitude inside the shape it names. Task 2 is the adoption that
changes which code path refuses an unauthorized POST on a route with a live destructive action.
Tasks 3 through 6 run Sonnet.

**The chain runs as TWO workflow runs.** `pass-execute-chains.js` has no mid-run pause hook, and the
run that moves paint hands its baselines to a conductor CI regen. Run one is Tasks 1 to 4 and run two
is Tasks 5 to 6. The cut sits after the two capture-bearing paint tasks rather than at the pass end,
so twenty `admin-signups-*` baseline moves get their canonical CI verification while there is still
budget and a task boundary to fix at, rather than at the moment the pass is otherwise finished.
Between the runs the conductor runs
`gh workflow run e2e.yml --ref polish-11b-ii -f update_snapshots=true`, waits for it, pulls the
regenerated baselines into the worktree, and reads the CI diff against Tasks 3 and 4's
`INTENDED MOVES:` declarations. Run two's first act is to re-verify Task 5's anchors against the
pulled head.

**Pre-dispatch, before run one.** All four are preconditions, not task steps, and none is true at
plan authoring:

1. Commit this plan onto `polish-11b-ii`. The workflow's implement prompt names the plan as
   committed in the repo and orders a first read of its Global constraints, Ruled inputs, and Task
   section; an untracked plan means six dispatches that cannot follow instruction one.
2. Create the worktree `.claude/worktrees/polish-11b-ii` on `polish-11b-ii` off post-11b-i `main`.
3. Run a from-scratch `npm install` in that worktree's `examples/showcase`. A worktree's
   `examples/showcase/node_modules` symlinks back to the main checkout and resolves both `file:`
   deps to `main`'s build, so without the reinstall the e2e proves `main`'s engine rather than this
   branch's dev package.
4. **No spec amendment.** Polish-11b-i's first commit amends the spec's Sequencing ceiling line to
   name both halves and the new total. This pass does not re-amend it.

---

## Reconciliation at dispatch

Every `file:line` below is quoted as the sweep or the spec states it, with the value measured on
`main` at `f944ca4e` beside it. **Anchors are re-verified at each dispatch against the branch HEAD,
not against the branch point.** Three forces move them. Chassis-B2 and polish-11a merge before
polish-11b-i branches; polish-11b-i merges before this pass branches and moved every
`docs/internal/admin-design-system.md` anchor with its own first task; and this pass moves its own
anchors, since Task 3 adds label markup to the signups route above Task 4's Delete-button anchors.
Task 4 is therefore a task whose anchors a predecessor inside this same pass has already moved, and
it re-measures rather than trusting the table.

### Line anchors

| Sweep or spec anchor | Measured at `f944ca4e` | Note |
|---|---|---|
| Decision 5: `src/lib/ambient.ts:48` (`cairnAccess?: AccessMap`) | Confirmed | No move |
| Decision 5: `src/lib/sveltekit/guard.ts:348` (the attach) | Confirmed, and a second attach sits at `:368`, each immediately after minting `locals.cairnEditor`. **The second carries the reasoning in code**: `access ?? {}` is behavior-identical for a zero-config site and "buys `section-action.ts` a real signal: an absent `locals.cairnAccess` then only ever means the guard never ran on this route" | The parity task mirrors both, not only `:348`, and it does NOT mirror the `?? {}` default; see the Corrections block |
| `section-action.ts`'s misconfigured branch | `misconfigured('rejected: access map not attached', 'access_map_not_attached')` at `:290`, returning `fail(500)`; the denial at `:219` is `fail(403, { error: opts.deniedMessage ?? DENIED_MESSAGE })` | New measurement, and it is what makes the `{}` default a real loss |
| `section-action.ts` type anchors | `SectionActionConfig` opens at `:37`, `SectionActionOptions` opens at `:49` and **closes at `:70`, not `:69`**, `createSectionAction` at `:170` | Corrected (coverage finding 15) |
| The fail-closed posture's ruling row | **`access-semantics-documented-divergence`** at `docs/internal/engine-rulings.md:5374-5382`, "an unmapped target refuses". `audit-sveltekit-requireaccess` at `:2522` is a keep row carrying no 403 semantics at all | New row. Task 2's decisions cite the first, not the second (coverage finding 14) |
| Decision 5: `examples/showcase/src/hooks.server.ts:32` (`createAuthGuard()` with no arguments) | Confirmed at `:32`; `devBackendHandle()` with no arguments is at `:20`. Line 20 sits OUTSIDE the `cairn-template:exclude` fence, which covers `:21-30`, so a scaffolded site does receive the wiring | No move. `defineAccess` appears nowhere under `examples/showcase/src`, as the spec states |
| `defineAccess`'s signature | `defineAccess<const A extends AccessMap>(roles: RolesDeclaration \| undefined, map: A): A` in `src/lib/auth/access.ts`. It throws on an empty map, on an empty role list (owner-only must be written `['owner']`), and on a role outside the vocabulary | New measurement. Task 1's declaration is written against this signature, two arguments, not one |
| `AccessMap` and `RolesDeclaration` exports | `src/lib/index.ts:25` and `:20` | Confirmed |
| `DevBackendOptions` and `devBackendHandle` | `DevBackendOptions` at `packages/cairn-cms-dev/src/handle.ts:26-34` carrying only `seedContent`; `devBackendHandle` at `:46`; the per-request `isAdmin` block that mints `locals.cairnEditor` at `:127-138`; the type re-export at `packages/cairn-cms-dev/src/index.ts:7` | Confirmed |
| A9 to A13: `examples/showcase/src/routes/admin/signups/+page.svelte:15`, `:17-20`, `:26-28`, `:39` | All four confirmed. The route's `<script>` destructures only `data` from `$props()`, with **no `form` prop**, which Task 3 must add for the outcome region | The missing `form` prop is a new measurement |
| chassis-B2's Task 6 on the signups server | B2's Task 6 both keeps "the raw `requireOwner` shape and its comment" AND removes the three `platform!` assertions at `+page.server.ts:19`, `:32`, `:45`. **Both statements are about the code Task 2 replaces.** B2 at `4de378ec` had not landed its Task 6 | Corrected (sequencing finding 9). Task 2 re-reads the file at dispatch and reports the shape it actually finds |
| `examples/showcase/e2e/custom-screen.spec.ts` | The delete flow is `:32-33`: `await row.getByRole('button', { name: 'Delete' }).click();` then `await expect(page.getByRole('cell', { name })).toHaveCount(0);` | **Task 4's confirm dialog falsifies this**, so Task 4 edits the spec. The "not in the diff" pin belongs to Task 2 alone |
| `examples/showcase/scripts/capture-surfaces.mjs`'s surface matrix | `const SURFACES` opens at `:59` today, and chassis-B2 has already landed an eleven-line addition above it (`4aac78db`), so any range anchor is stale. **Locate with `grep -n "const SURFACES" examples/showcase/scripts/capture-surfaces.mjs` and read the array from there** | New row (sequencing finding 9). The matrix is `home`, `article`, `styleguide`, `archive2`, `error404`, `signups` |
| `scripts/checks/check-public-tokens.mjs` | Resolves `SHOWCASE_SRC` as `examples/showcase/src` and walks every `.svelte` file recursively, failing on a literal color or a hard-coded absolute font size. It is in `design.yml`, **not in this pass's gate string** | New row (sequencing finding 6). It walks the signups route, which Tasks 3 and 4 rewrite, so both run it as a task step. Chassis-B2's Task 5 may have changed its shape, so the task re-reads it before running it |
| `src/lib/components/DeleteDialog.svelte` | Props run `:12-35` and carry **eight** members: `conceptId`, `id`, `singular`, `inboundLinks`, `inboundKind`, `pending`, `trigger`, `onsubmitting`. The hardcoded `action="?/delete"` at `:103` and the fixed `aria-labelledby` id `cairn-delete-dialog-title` at `:71` both verify | Corrected from the draft's "four, `:12-34`" (coverage finding 15). The `trigger` prop is addressed by name in Task 4's Decisions |
| `src/lib/components/ManageEditors.svelte:147` (the per-row `aria-label` shape) | Confirmed | No move |
| Spec task 11: `src/lib/admin-toolkit/format.ts` | `SQLITE_DATETIME` at `:65`, `ISO_WITH_ZONE` at `:72`, the doc block at **`:74-82`**, `formatTimestamp` opening at `:83`, the SQLite branch at `:87`, the ISO branch at `:89`, `new Date(input)` at `:90`, the pass-through `return input` at `:92`, the close at `:93` | The doc block's open is corrected from `:75` (coverage finding 15) |
| The closed ledger row | `audit-admin-formattimestamp` at `docs/internal/engine-rulings.md:2670`. **Two of its lines carry the false claim**: `Reopens on:` at `:2674` says `formatTimestamp` "now accepts any Date-parseable timestamp", and `Shape:` at `:2675` says "Take any Date-parseable timestamp (ISO with offset included)" | The `Shape:` line is new (coverage finding 8). The superseding row names both |
| `formatTimestamp`'s rendering consumers | Exactly one, `src/lib/components/CairnHistory.svelte`, whose route appears in none of the twenty-eight admin baselines | New measurement (sequencing lens). This is the evidence that Task 5 is paint-neutral, rather than an assertion |
| `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md` | Headings at `:7`, `:42`, `:233`, `:244`, `:286`, plus `## Polish-11a` and `## Polish-11b-i` added by those passes | This pass adds `## Polish-11b-ii` beneath them, with the same stated fallback if a predecessor did not add its own |
| `ROADMAP.md`'s polish sub-bullet | One prose bullet at `:342-361`, reconciled by 11a and 11b-i before this pass reads it | Task 6 closes this half's two by name from within it |
| `docs/internal/docs-friction-log.md` | "None open." at `:25` (Live findings) and `:60` (Open findings) | Task 6 re-reads rather than assuming |
| `templates/waymark/src/routes/admin/signups/` | Byte-identical to `examples/showcase/src/routes/admin/signups/` today, verified by `diff` | Global constraint 7 rests on it |

### Design-system anchors are located by section and quoted phrase, never by line

Polish-11b-i's Task 1 inserted prose into `docs/internal/admin-design-system.md` beside the
guarded-button passages, so every line anchor below that insertion point is stale before this pass
starts. Global constraint 14 states the rule; this is the conversion for the two anchors this pass
cites.

| What a task cites | How to locate it |
|---|---|
| The safe-delete alertdialog recipe (Task 4) | `## Component recipes`, the bullet opening `**The safe-delete is a modal alertdialog with no light dismiss.**` |
| The two-level form-label register (Task 3) | `## Type`, the "Form field labels, two-level register" passage, including its inline-label shape |

### Corrections this plan makes to the spec, knowingly

Each supersedes a sentence the spec states, on measurement.

- **The signups delete confirm does not go through `DeleteDialog`.** Spec task 10 says "confirm
  through `DeleteDialog`". Measured, `DeleteDialog` is a content-entry delete and cannot express a
  developer's own table row. Its eight props are content-entry shaped
  (`src/lib/components/DeleteDialog.svelte:12-35`); its form posts to a hardcoded
  `action="?/delete"` at `:103` while the signups row posts to `?/remove`; and its dialog is
  labelled by the fixed id `cairn-delete-dialog-title` at `:71`, which collides across the rows of a
  table. **The one prop that looks like an escape hatch is `trigger?: boolean`, and it is not one:**
  it only chooses whether the component renders its own Delete button, leaving the host to open the
  dialog through the exported `open()`. It changes neither the posted action nor the dialog's label
  id, which are the two things that actually block this use. Adding a prop that did fix them would
  add public surface and break the `check:surface` byte-identity this pass requires. Task 4
  therefore writes the confirm in the route itself, following the design system's own safe-delete
  recipe, which is what a developer copying the exemplar must actually write. The engine gains no
  generic confirm component: that is the developer's domain under the charter, and it would be new
  surface in a non-breaking pass.
- **The dev handle attaches `locals.cairnAccess` only when the site supplies an `access` map, and
  not as `{}` by default.** Decision 5 says the dev handle "attaches `locals.cairnAccess`
  verbatim", and a naive parity reading would copy the guard's `access ?? {}`. The guard's own
  comment at `guard.ts:365-368` says why that default exists on ITS side and what it buys:
  "an absent `locals.cairnAccess` then only ever means the guard never ran on this route", which
  `section-action.ts:290` turns into `misconfigured('rejected: access map not attached')` and
  `fail(500)`. In the showcase the dev handle REPLACES `createAuthGuard` outright
  (`hooks.server.ts:18-32` is an if/else, not a sequence), so under the dev backend that branch is
  the one signal telling a developer their wiring is missing. Defaulting to `{}` there would make it
  permanently unreachable in exactly the environment a developer builds in. Task 1 therefore
  attaches the map when one is given and leaves `locals.cairnAccess` undefined when none is, and
  says so in the TSDoc. Task 2 is unaffected, since its declaration is mandatory.
- **The spec's Render-proof paragraph names three arithmetic findings and this half carries one.**
  A3 and A16 landed in polish-11b-i's Task 5; A12 lands in Task 3 here. So this pass ends one task
  with a render and a tile read.

### The semantic column: decisions earlier passes landed that this pass overturns or depends on

- **Overturns chassis-B2's Task 6 deliberate keep, by design and by name, and inherits its other
  change to the same lines.** B2's Task 6 modified
  `examples/showcase/src/routes/admin/signups/+page.server.ts` and stated in its Files block both
  that "the raw `requireOwner` shape and its comment kept" and that the three `platform!` assertions
  are removed. The comment it preserved reads "The raw requireOwner/formData/fail shape is kept
  deliberately: this route has no audit requirement. createSectionAction (@glw907/cairn-cms/sveltekit)
  is the documented path for a site that needs one, since it wraps the same guard with a logged
  before/after diff." **Task 2 replaces exactly that shape**, per decision 5 and the spec's
  Dispositions row, and it replaces the `platform!`-or-not database read with `resolveDb` in the same
  edit. It rewrites the comment rather than deleting it, so the file records why the exemplar now
  teaches the wrapper: the exemplar's job is to show the documented path, not the minimum that
  compiles. Task 2 re-reads the file as it actually stands at dispatch and reports which of B2's two
  changes it finds, since B2 had not landed its Task 6 when this plan was measured.
- **Overturns `audit-admin-formattimestamp`'s execution text on two lines, not one.** Task 5's
  superseding row names both the `Reopens on:` sentence and the `Shape:` sentence, so the closed row
  does not keep a second live copy of the same wrong statement.
- **Overturns nothing in polish-11b-i.** That half's subjects are the design system, the engine's
  admin components, and the admin sheet. It lands one ruling, `polish-busy-idiom`, which this pass
  applies rather than reverses: Task 3's outcome region is always mounted and content-gated for the
  reason 11b-i wrote into the design system.
- **`docs/internal/engine-rulings.md` is written by 11a, 11b-i and this pass.** A row a predecessor
  inserts shifts every anchor below it. Task 5 therefore locates its rows by slug with
  `grep -n "^## <slug>" docs/internal/engine-rulings.md`, never by reusing a line number from this
  plan, and writes its new heading in the ledger's own form.
- **Depends on polish-11b-i having appended to `## Unreleased`** and on it having closed two ROADMAP
  polish sub-bullets. Task 6 reconciles rather than assumes, and closes only the two this pass
  shipped.
- **Depends on polish-11b-i having added `## Polish-11b-i` to the intended-moves manifest.** This
  pass appends `## Polish-11b-ii` beneath it. If 11b-i did not add one, Task 3 adds only its own
  heading and says so.
- **`docs/STATUS.md` is never a task deliverable.** The conductor owns it and writes it at the
  checkpoint, the run cut, and at merge.

### The gate, re-derived

Derived at plan authoring from the committed `.github/workflows/` at `f944ca4e`, per the initiative
design's standing constraint at `2026-08-27-audit-remediation-initiative-design.md:138-140`. CI runs
`test.yml` (thirty-one `npm run` gates), `e2e.yml`, `design.yml`, `norms.yml`, `scaffold.yml`,
`create-site.yml`, `tsgo.yml`, and `publish.yml`. The derived list is identical to the one 11a
derived at `ac911ec3` and 11b-i derived at `f944ca4e`, because the committed workflows did not change
between the derivations, so the exact per-task string under "## Gate" below is unchanged.
`check:figures` is NOT in the committed `test.yml`; it exists only in Geoff's uncommitted working
tree, which decision 13 leaves unowned, so it is in no gate this pass runs. **`check:public-tokens`
is deliberately outside the uniform gate string and is run as a task step by the two tasks that
touch a file it walks**, so the gate stays one string across every task while the check still runs
before the code that could break it leaves its own task.

---

## Ruled inputs (recorded; no task re-derives them)

- **The dev handle reaches parity with the guard on the existing `locals.cairnAccess`** (decision 5),
  then the showcase's signups page adopts `createSectionAction`. `locals.cairnAccess` is already
  engine-owned, so this adds no engine surface. The dev handle reads the site's own `access`
  declaration, never a copy derived from the session.
- **The busy and live-region idiom is ruled architecture** (decision 7, executed by polish-11b-i's
  Task 1). A status region is mounted unconditionally and only its contents are gated. Task 3's
  outcome region follows that rule and does not re-derive it.
- **`OfficeList` retires in polish-C, not here** (decision 8). No task in this pass touches
  `OfficeList`, `docs/extend/add-a-custom-admin-screen.md`, the `toolkit/custom-screen`
  reproduction, or the floating-card recipe.
- **`check:surface` stays byte-identical.** No task runs `check:surface -- --update`, and
  `docs/internal/api-surface.md` is in no task's diff. The engine's own surface does not move in
  this pass; the only new public members are on the dev package, which `check:dev-package` covers.
- **No task dispatches a subagent.** `cairn-implementer` carries Read, Write, Edit, Bash, Grep and
  Glob and no Agent tool, so a step ordering a reviewer dispatch can only halt the chain, be skipped
  silently, or produce fabricated evidence inside an auth change. **`web-auth-security-reviewer` runs
  once, at this pass's end, over the seam and the adoption together**, which is the read that matters
  most anyway since it sees the adoption on top of the seam. No acceptance criterion in any task
  names a reviewer's report; acceptance is tests, greps, and the diff.
- **This window is non-breaking.** The new `devBackendHandle` parameters are additive disclosed
  surface: the changelog names them, with no `Consumers must:` line. No entry this pass writes
  carries a `Consumers must:` line, and Task 6 checks the absence across the whole window.
- **The conductor writes `docs/STATUS.md`, never a task** (spec, "Ledger ownership").
- **Release:** ONE cut, after polish-C. This pass does not bump `package.json`, does not tag, and
  does not publish. It appends to `## Unreleased` and stops. `docs/extend/migration-notes.md` is NOT
  written by this pass, since the window carries no consumer action and polish-C's task 14
  reconciles the whole section.
- **A finding a render refutes retires with the tile named** (spec, Risks). Task 3 ends with a render
  and a tile read. If the render shows A12 does not hold, the task reports the retirement with the
  tile that shows it, records the retirement in its `CHANGELOG.md` line, and does not ship a fix for
  it.

---

## Global constraints

These bind every task. An implementer reads them before its Files block.

1. **The em dash is banned** in every code comment and every doc this pass writes.
   `house/no-em-dash-in-comments` enforces it on `src/lib` and the showcase under `check:comments`;
   in prose it is a review finding.
2. **No process citations in shipped comments.** A comment states the contract and the reason. It
   does not name a pass, a plan, a ruling id, or a task number. Ledger rows and changelog entries
   carry that record instead, and the ledger's own `- **Note (<pass>, Task N):**` amendment line is
   the one place a pass name belongs.
3. **The gate is CI-derived, not remembered.** The exact string is under "## Gate". A task is not
   done until that string exits 0 in this worktree. Tasks 2, 3 and 4 additionally run
   `npm run check:public-tokens` as a task step, because it walks the file they rewrite and it lives
   in `design.yml` rather than in the gate string.
4. **One end-to-end slot per machine.** `examples/showcase/playwright.config.ts` pins port 4173 with
   `reuseExistingServer: !process.env.CI`, so two `CI=1` runs cannot coexist and two non-`CI` runs
   silently share one preview server. Run the e2e suite alone in this worktree, and never beside
   another pass's. The from-scratch qualifier: the e2e proves this worktree's engine only after a
   from-scratch `npm install` in `examples/showcase` inside the worktree, which is a pre-dispatch
   step, not a task step.
5. **`check:surface` output is byte-identical.** `docs/internal/api-surface.md` is not regenerated
   and not committed by any task in this pass. A fix that needs a new prop, a new export, or a
   changed signature on a published symbol in `src/lib` is out of scope, and the task reports it
   rather than taking it. The dev package's own additive members are the one exception, and
   `check:dev-package` is their gate.
6. **The public site surface does not move.** No task changes a file
   `examples/showcase/e2e/site-visual.spec.ts` renders. `git status` showing any file changed under
   `examples/showcase/e2e/site-visual.spec.ts-snapshots/` is a blocking finding in every task.
7. **The showcase and the template stay in step.** `templates/waymark/src/routes/admin/signups/` is
   byte-identical to `examples/showcase/src/routes/admin/signups/` today, and `check:template`
   (`packages/create-cairn-site/scripts/emit-template-dir.mjs --check`) fails the moment they
   diverge. A task that edits either signups file runs `npm run emit:template` in the same commit.
   `npm run check:template` is in the gate string, so this is enforced, not advisory.
8. **TSDoc governs every comment.** Document the contract and the reason, never the type the
   signature already states, and never a paraphrase of the symbol name. An exported symbol keeps its
   minimal one-line doc even when self-evident, because `check:reference` and `jsdoc/require-jsdoc`
   want one; the write-only-when-it-helps judgment applies to internal symbols. Svelte `<script>`
   comments follow the same standard, with the `@component` convention for the component block.
   From polish-11a on, `eslint.config.js` globs `src/lib/components/**/*.svelte` with `tsdoc/syntax`
   at error, and `check:comments` also covers the showcase's `.ts`, `e2e` and `.svelte` sources,
   which is the whole subject of Tasks 3 and 4.
9. **Commits.** Imperative mood, Conventional Commits, specific files rather than `git add -A`.
   The footer is exactly these two lines, and no other:

   ```
   Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_016oR8pMpc33qKYZtuMAeHfz
   ```

   One commit per Commit boundary named in a task; a task's boundaries are listed in its own Commit
   block. **A task that adds or edits a test file commits that file**, which is why every
   test-bearing task below names its test path in its Files block rather than naming a suite in
   prose.
10. **Each task appends its own `CHANGELOG.md` line under `## Unreleased`** and closes or
    progress-notes any ledger entry it executes, per the initiative design's standing constraint at
    `2026-08-27-audit-remediation-initiative-design.md:141-144`. This window is non-breaking, so no
    entry carries a `Consumers must:` line. A ruling row this pass WRITES carries the full `Verdict`,
    `Reopens on`, `Shape`, `Record`, `Verified` block, since `check:rulings-format` ratchets only the
    truncated parentheticals. **A new row's heading takes the ledger's own form,
    `## <slug>: <Title>  (<verdict>, <date>, <source>)`**, because `check-rulings-format.mjs` parses
    headings as `/^## ([a-z0-9-]+):/` and never sees a bare-slug heading at all, so
    `check:rulings-format` passing proves nothing about a malformed new row. A row this pass only
    ANNOTATES keeps whatever fields it has; the acceptance on an annotated row is that
    `check:rulings-format` stays green, never that a field it never carried appears. One task writes
    a new row and annotates a closed one: Task 5.
11. **The conductor writes `docs/STATUS.md`.** No task edits it.
12. **The paint protocol.** Adopted verbatim from chassis-B2 by way of polish-11a and polish-11b-i,
    and it rides once in the args file's own `paintProtocol` field rather than inside each task's
    criteria. The text is under "## The paint protocol" below.
13. **Which paint branch a task takes follows capture REACH, not a pre-assigned pair.**
    `examples/showcase/scripts/capture-surfaces.mjs`'s surface matrix is `home`, `article`,
    `styleguide`, `archive2`, `error404`, and `signups`, and `signups` is the one admin route in it,
    which is this pass's own subject. **A task that changes the signups route's markup takes the
    capture-pair branch.** A task that changes only server code, the dev package, or a formatter
    renders nothing itself: its evidence is the visual suite's PRODUCED `MOVED BASELINES:` list plus
    the route's own e2e, and it captures nothing. The per-task ruling is under
    "## The paint protocol".
14. **Anchors into `docs/internal/admin-design-system.md` are located by section heading and quoted
    phrase, never by line number.** Polish-11b-i's Task 1 inserted prose into that file, so every
    pinned line below its insertion point is stale before this pass starts. Locate with
    `grep -n "^## <heading>" docs/internal/admin-design-system.md` and then the quoted phrase from
    the conversion table in the Reconciliation block.
15. **Local and CI renders.** Every paint task regenerates its moved baselines locally by file path
    and then passes a local `CI=1` e2e in the same gate, while the repo's standing rule is that CI is
    the canonical renderer. Local and CI renders have matched on this machine through chassis-B. If a
    pulled CI baseline fails locally on a surface the task never touched, that is a renderer
    difference, not a finding: report it under `MOVED BASELINES:` with the note, do not regenerate
    it, and let the next conductor CI regen settle it.
16. **The gate builds the package twice, not once.** `npm run package` runs at the head of the gate
    string, and the string's last command is `CI=1 npm --prefix examples/showcase run test:e2e`,
    whose `pretest:e2e` is `npm --prefix ../.. run package`. The second build is what makes the e2e
    prove this tree. The twelve dependent checks in between are invoked at their node entry points
    against the first build, so no task re-runs `npm run package` between them.

---

## The paint protocol

Verbatim from polish-11b-i's Global constraints, which took it from chassis-B2 by way of polish-11a,
with the cache path, the pass name, and the manifest heading replaced by this pass's. It is the whole
paint contract, and it rides once in the args file's `paintProtocol` field, which the runner appends
to every implement and review prompt.

> Capture directories are pinned: the PASS before set at `~/.cache/cairn-polish-11b-ii/pass/before/`
> (it exists only if some task captured one, so a paint task captures its own before set at its
> parent commit); this task's before set at
> `~/.cache/cairn-polish-11b-ii/task-<N>/before/` captured at the START of the task on the clean
> worktree at the task's parent commit with
> `node examples/showcase/scripts/capture-surfaces.mjs --out <dir>` (symlink the pass set if no
> predecessor moved paint, and say so) and its after set at
> `~/.cache/cairn-polish-11b-ii/task-<N>/after/`; every directory is write-once (the tool refuses a
> non-empty target; report a collision). Images are TILES: the capture tool writes
> `full/<surface>-<scheme>-<width>.png` and `tiles/<surface>-<scheme>-<width>-<nn>.png` (bands of
> at most 1400 CSS px with a 60 px overlap) plus `manifest.json`; a grader reads tiles or named crops, never a
> full-page file. The intended-moves manifest is the committed file
> `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`: append this task's
> rows under the `## Polish-11b-ii` heading in the same commit as its change (surface, width,
> scheme, what moves, why, the baseline names it moves); a task that moves a baseline without
> appending its row is a blocking finding. The moved-baseline list is PRODUCED, not asserted: before
> any regeneration run the visual suites unmodified
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

**Which branch each task takes, ruled here by capture reach so no implementer judges it.**

| Task | Subject | Branch |
|---|---|---|
| 1 | `packages/cairn-cms-dev/src/handle.ts`, `examples/showcase/src/access.ts`, `hooks.server.ts` | No rendered file in the diff. Produce the moved list from the unmodified suite, expect none, and let the route's own e2e (`access-map.spec.ts` and `custom-screen.spec.ts`) be the behavioral proof |
| 2 | `examples/showcase/src/routes/admin/signups/+page.server.ts` | Same. A server module renders no markup, and every `admin-signups-*` baseline is expected unchanged |
| 3 | `examples/showcase/src/routes/admin/signups/+page.svelte` | **Capture pair.** `signups` is in the capture matrix and this task rewrites its form |
| 4 | `examples/showcase/src/routes/admin/signups/+page.svelte` | **Capture pair.** Its before set is captured at its own parent commit, which is Task 3's commit, so the two sets differ and the write-once directories do not collide. Do not symlink Task 3's set |
| 5 | `src/lib/admin-toolkit/format.ts` | Produce the moved list, expect none. `formatTimestamp`'s one rendering consumer is `CairnHistory.svelte`, whose route is in none of the twenty-eight admin baselines, so no seeded value can move paint. The produced list is the proof, not an assertion |
| 6 | records | No rendered surface |

---

## Task 1: The dev handle's `cairnAccess` parity

**Deliverables: four.** The dev-package parameters, the attach at parity with the guard, the
showcase's first `access` declaration, and the hook passing that one declaration to both branches.

**Model: opus.** This is the pass's only authorization-seam change, and the plan leaves real design
latitude inside the shape it names.

**Files:**
- Modify: `packages/cairn-cms-dev/src/handle.ts` (`DevBackendOptions` at `:26-34`, `devBackendHandle`
  at `:46`, the per-request `isAdmin` block at `:127-138`), `packages/cairn-cms-dev/src/index.ts`
  (the type re-export at `:7`, if the interface's doc changes),
  `examples/showcase/src/hooks.server.ts` (`:20` and `:32`), `CHANGELOG.md`
- Create: **`examples/showcase/src/access.ts`**, the showcase's own access declaration. The path is
  named here rather than left to the implementer, because Task 2 and the template mirror both
  inherit it. It sits outside the `cairn-template:exclude` fence, so a scaffolded site receives it
- Create or modify: `packages/cairn-cms-dev/src/handle.test.ts` (the failing tests named in Step 1)
- Read but expected unchanged: `src/lib/ambient.ts:48`, `src/lib/sveltekit/guard.ts:348` and `:368`
  (the two attach sites the dev handle mirrors, with the reasoning comment at `:365-368`),
  `src/lib/auth/access.ts` (`defineAccess`), `src/lib/sveltekit/section-action.ts:290` (the
  misconfigured branch the default would erase)
- Test: `examples/showcase/e2e/access-map.spec.ts` (read, expected to keep passing, not in the diff)
- Baselines: none. No rendered markup changes.

**Interfaces:**
- Produces: `DevBackendOptions` gains `access?: AccessMap` and `roles?: RolesDeclaration`, both
  optional, both imported as types from the engine package.
- Produces: `devBackendHandle(options)` attaches `event.locals.cairnAccess` on the same requests on
  which it mints `event.locals.cairnEditor`, **when and only when an `access` map is supplied**.
- Produces: `examples/showcase/src/access.ts`, built with `defineAccess`, exporting one map.
- Consumes: `AccessMap` and `RolesDeclaration`, both already exported from `src/lib/index.ts` at
  `:25` and `:20`. The dev package already carries `@glw907/cairn-cms` as a peer plus a `file:`
  devDependency and already type-imports `Backend` from it, so these add no new dependency edge.
- Unchanged: `check:surface`. The engine's own surface does not move; the change is in the dev
  package, which `check:dev-package` covers.

**Decisions the plan makes:**
- **This is additive disclosed surface with no `Consumers must:` line**, per the spec.
- **The dev handle reads the site's own declaration, never a copy derived from the session**
  (decision 5). It does not synthesize an access map from the minted owner identity, and it does not
  grant by capability.
- **A handle given no `access` leaves `locals.cairnAccess` undefined rather than `{}`.** The full
  reasoning is in the Reconciliation block's Corrections section: `{}` and undefined are
  behavior-identical to `canReach` and `hasAccessRule`, both failing closed, but
  `section-action.ts:290` reads undefined as `misconfigured('rejected: access map not attached')`
  and `fail(500)`, and under the dev backend, which replaces the guard outright, that is the one
  signal telling a developer their wiring is missing. The TSDoc states this and states that it is a
  deliberate divergence from `guard.ts`'s `access ?? {}`, with the reason.
- **`roles` is carried for parity and is inert in this pass.** The spec's sentence names both.
  `access` reaches `locals.cairnAccess`; `roles` exists so the same declaration object a site hands
  `createAuthGuard` can be handed here without reshaping, and `devBackendHandle` resolves no
  capability from it, because the dev backend mints the literal `capability: 'owner'`. The TSDoc says
  so in one line, so a reader does not assume `roles` affects authorization here and
  `diff-reviewer` does not read an inert option as unspecified.
- **The declaration is written literally, not left open.** `examples/showcase/src/access.ts` calls
  `defineAccess(undefined, { '/admin/signups': ['owner'] })`. Two things pin it: `defineAccess` takes
  the roles declaration as its FIRST argument and the map as its second, refusing an empty map, an
  empty role list, and a role outside the vocabulary; and the dev backend mints `role: 'owner'`,
  while the guard branch resolves a real roster row, so `['owner']` is the one list both branches
  satisfy. `undefined` for roles resolves against the implicit owner/editor vocabulary, which is what
  a site declaring no roles of its own gets. The module carries a comment saying why the same object
  goes to both the guard and the dev handle.
- **The showcase's declaration is exemplar surface a scaffolded site copies**, so it is written to be
  read: one small module, one `defineAccess` call, a rule for the site's own custom screen, and that
  comment. `defineAccess` appears nowhere under `examples/showcase/src` today, so nothing is being
  replaced.
- **No security reviewer runs inside this task.** The spec places `web-auth-security-reviewer` in
  this task's chain, but `cairn-implementer` has no Agent tool, so the step could only halt the
  chain or fabricate a report. It runs once at the pass end instead, over this seam and Task 2's
  adoption together, which is the stronger read.
- The template inherits `access.ts` through `check:template`. If it lands inside the
  template-emitted tree, `npm run emit:template` runs in the same commit; if it lands outside it, the
  task says so and explains why a scaffolded site still gets a working access declaration.

**Steps:**
- [ ] **Step 1:** the failing tests first, in `packages/cairn-cms-dev/src/handle.test.ts`. Assert
  that a handle constructed with an `access` map attaches that exact map to `locals.cairnAccess` on
  an `/admin` request, that a handle constructed without one leaves `locals.cairnAccess` undefined,
  and that neither attaches anything on a non-`/admin` path. Watch them fail.
- [ ] **Step 2:** read `guard.ts:348` and `:368` and record the exact attach shape and the request
  conditions, so the mirror is verbatim rather than approximate, and record the `?? {}` divergence
  and its reason. Report both.
- [ ] **Step 3:** add `access` and `roles` to `DevBackendOptions` with TSDoc stating what each
  reaches, that `roles` is inert here and why, and that the undefined default is deliberate. Attach
  `cairnAccess` in `devBackendHandle` on the `isAdmin` branch that mints `cairnEditor`.
- [ ] **Step 4:** author `examples/showcase/src/access.ts` and pass the same exported object to
  `devBackendHandle` at `hooks.server.ts:20` and to `createAuthGuard` at `:32`.
- [ ] **Step 5:** run the visual suite unmodified to PRODUCE `MOVED BASELINES:`, expected empty, and
  confirm `examples/showcase/e2e/access-map.spec.ts` and `custom-screen.spec.ts` still pass. Append
  the `CHANGELOG.md` line, naming the new parameters as additive and carrying no `Consumers must:`.
  The full gate, with `check:dev-package` and `check:template` green. Commit.

**Acceptance criteria:**
- `DevBackendOptions` carries `access?: AccessMap` and `roles?: RolesDeclaration`, each with a TSDoc
  line stating what it reaches, with `roles` documented as inert in this window and the reason.
- `devBackendHandle` sets `event.locals.cairnAccess` on the same request conditions `createAuthGuard`
  does, and the report quotes both guard attach lines beside the new one.
- With an `access` map passed, `locals.cairnAccess` is that exact object; with none passed it is
  `undefined`, not `{}`. Both asserted in `packages/cairn-cms-dev/src/handle.test.ts`, and the TSDoc
  names the divergence from `guard.ts`'s `access ?? {}` with the `section-action.ts` misconfigured
  signal as its reason.
- `examples/showcase/src/access.ts` exists, calls `defineAccess` with the roles declaration first and
  the map second, and declares `'/admin/signups': ['owner']`.
- `examples/showcase/src/hooks.server.ts` imports that one declaration and passes it to both
  branches, and `defineAccess` now appears under `examples/showcase/src`.
- No access map is derived from the minted session anywhere in the diff.
- `npm run check:dev-package`, `npm run check:template`, and `npm run check:surface` pass, with
  `check:surface` byte-identical.
- `examples/showcase/e2e/access-map.spec.ts` is not in the diff and passes.
- `MOVED BASELINES: none` and no file changed under either snapshots directory.

**Commit:** one, `feat(dev): attach the site's access map in the dev backend handle`.

---

## Task 2: The signups exemplar's server half

**Deliverables: three.** `createSectionAction` adopted for both actions, the deliberate-keep comment
rewritten, and the template re-emitted.

**Model: opus.** This changes which code path refuses an unauthorized POST on a route with a live
destructive action.

**Files:**
- Modify: `examples/showcase/src/routes/admin/signups/+page.server.ts` (the comment at `:26-28` and
  both actions at `:29-49`), `templates/waymark/src/routes/admin/signups/+page.server.ts` (through
  `npm run emit:template`), `CHANGELOG.md`
- Read but expected unchanged: `src/lib/sveltekit/section-action.ts` (`SectionActionConfig` at
  `:37`, `SectionActionOptions` at `:49-70`, `createSectionAction` at `:170`, the denial at `:219`,
  the misconfigured branch at `:290`)
- Create: `examples/showcase/src/routes/admin/signups/actions.test.ts`, the pure module test named
  in Step 2. The showcase co-locates its unit tests beside their subject
- Test: `examples/showcase/e2e/custom-screen.spec.ts` is read and **is not in this task's diff**;
  the task reports any assertion its change falsifies before editing. That pin belongs to this task
  alone; Tasks 3 and 4 edit the spec by design
- Baselines: none. `+page.server.ts` renders no markup.

**Interfaces:**
- Produces: the signups route's `actions` built from a `createSectionAction` factory whose
  `resolveDb` reads `env.APP_DB`, with `create` and `remove` each carrying `action` and `entity` in
  their `SectionActionOptions`.
- Consumes: `createSectionAction` from the engine's `/sveltekit` subpath, and the access declaration
  Task 1 authored, through `locals.cairnAccess`.
- Unchanged: `check:surface`. Nothing in `src/lib` is in this diff.

**Decisions the plan makes:**
- **This task overrules chassis-B2's Task 6 deliberate keep by name, and inherits its `platform!`
  removal on the same lines.** The comment at `:26-28` says the raw shape is kept because the route
  has no audit requirement. The rewritten comment records the new reason: the exemplar's job is to
  teach the documented path, and a developer copying it should copy the wrapper, not the minimum.
  The comment is rewritten rather than deleted. B2's Task 6 also removes the three `platform!`
  assertions at `:19`, `:32` and `:45`, which is exactly the database read `resolveDb` replaces in
  the two actions. **B2 had not landed its Task 6 when this plan was measured**, so Step 1 reads the
  file as it actually stands and reports which of B2's two changes it finds.
- **`createSectionAction` fails closed on every call**, unlike `adminAction`'s opt-in `access`
  option: a target the map has no rule for refuses with `fail(403)` at `section-action.ts:219`, and
  an absent map refuses with `fail(500)` at `:290`. The ruling that establishes that posture for a
  site-authored POST is **`access-semantics-documented-divergence`**
  (`docs/internal/engine-rulings.md:5374-5382`, "an unmapped target refuses"), which the rewritten
  comment and the changelog line cite. `audit-sveltekit-requireaccess` at `:2522` is a keep row
  carrying no 403 semantics and is not the citation. This fail-closed posture is exactly why Task 1
  orders before this one: without the access rule for `/admin/signups` in `locals.cairnAccess` on
  both the guard branch and the dev branch, both actions refuse and the e2e goes red. The task
  reports the rule it relies on and confirms both branches supply it.
- **`ownerOnly: true` stays on the remove action**, preserving the owner gate `requireOwner` supplies
  today. The create action takes the map check alone unless the read of B2's assertions says
  otherwise, and the task states which it chose and why.
- **The load keeps `requireOwner`.** `createSectionAction` wraps form actions, not loads;
  `requireAccess` is the documented path for a load, and changing the load is not in the spec's
  routed item. The task leaves the load alone and says so.
- **The 403 this introduces gets a reader in Task 3**, not here. Task 3's outcome region is
  specified against any `form.error`, not the `fail(400, { error: 'missing' })` path alone, so a
  denial renders rather than vanishing on a screen this pass is giving an announced outcome.
- The audit `action` and `entity` verbs follow the repo's ruled kebab and verb grammar. The task
  proposes them and reports them; a grammar disagreement is a stop-and-report, not a silent choice.
- **The test's home is the showcase's node vitest**, not a DOM harness: a module-level invocation of
  the route's exported `actions` with a fake event is a pure module test and runs in
  `examples/showcase`'s default vitest environment, which is where the showcase's five existing unit
  tests live. Name the file in the diff.

**Steps:**
- [ ] **Step 1:** read `examples/showcase/e2e/custom-screen.spec.ts` and chassis-B2's pinned
  acceptance on the `admin-signups-*` baselines, and read `+page.server.ts` as it actually stands.
  Report which of B2's two Task 6 changes are present, and report any spec assertion this change
  falsifies BEFORE editing. A falsified assertion is a stop-and-report.
- [ ] **Step 2:** the failing test first, in a showcase unit test that invokes the route's exported
  `actions` with a fake event. Assert an unauthorized POST to `?/remove` refuses through the section
  action's own path rather than through a bare `requireOwner` throw. Watch it fail.
- [ ] **Step 3:** build the factory with `resolveDb` reading `env.APP_DB`, wrap both actions, and
  report the `action` and `entity` verbs chosen.
- [ ] **Step 4:** rewrite the deliberate-keep comment, citing the documented path and the fail-closed
  posture without naming a pass, a plan, or a task.
- [ ] **Step 5:** `npm run emit:template` in the same commit. Run `npm run check:public-tokens` as a
  task step and report its result, since it walks this route's directory. Append the `CHANGELOG.md`
  line. The full gate, with `check:template` green and the showcase e2e green. Commit.

**Acceptance criteria:**
- `examples/showcase/src/routes/admin/signups/+page.server.ts` builds both actions through
  `createSectionAction`, and `requireOwner` no longer appears inside either action body.
- The `load` still calls `requireOwner`, and the report states why.
- The comment at the old `:26-28` is present and rewritten, naming the exemplar's job rather than the
  audit requirement, and naming no pass or plan.
- `templates/waymark/src/routes/admin/signups/+page.server.ts` is byte-identical to the showcase's,
  and `npm run check:template` passes.
- `examples/showcase/e2e/custom-screen.spec.ts` is not in this task's diff and passes, and every
  `admin-signups-*` baseline is unchanged.
- The report names the access rule both hook branches supply and confirms both do, and names which
  of chassis-B2's two Task 6 changes it found in the file.
- `npm run check:public-tokens` passes.
- `check:surface` is byte-identical and no file under `src/lib` is in the diff.
- `MOVED BASELINES: none` and no file changed under either snapshots directory.

**Commit:** one, `refactor(showcase): adopt createSectionAction on the signups exemplar`.

---

## Task 3: The signups form's labels, composition, and outcome

**Deliverables: three.** The stacked label register, the composition verdict at 320 and 390, and a
`role="status"` region carrying every outcome both actions produce.

**Files:**
- Modify: `examples/showcase/src/routes/admin/signups/+page.svelte` (the `<script>` block at
  `:5-11`, the form at `:15-22` and the `sr-only` labels at `:17` and `:19`),
  `templates/waymark/src/routes/admin/signups/+page.svelte` (through `npm run emit:template`),
  **`examples/showcase/e2e/custom-screen.spec.ts`** (the DOM assertions named below),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`, `CHANGELOG.md`
- Test: `examples/showcase/e2e/custom-screen.spec.ts`. **The e2e spec is this task's test home, and
  it is editable here.** The showcase has no DOM harness: `examples/showcase/package.json` runs
  `vitest run` in the default node environment with no jsdom, no `@vitest/browser`, no
  testing-library and no `vitest-browser-svelte`, and all five of its existing unit tests are pure
  module tests. The engine's own component project is a chromium project scoped to
  `src/tests/component/**` and cannot mount an example's route module. Adding a browser stack to the
  showcase is new tooling surface no task authorizes, so the assertions go where a browser already
  runs
- Baselines: all ten `admin-signups-{light,dark}-{320,390,768,1440,2560}` are the expected movers.

**Interfaces:** none. The route consumes only `PageHeader`, `AdminTable`, and `CsrfField`, all
already imported. It gains a `form` member on its `$props()` destructure, which today reads `data`
alone.

**Decisions the plan makes:**
- **The stacked register is the one the sweep names**: a `type-body font-medium` label above the
  control, matching the login page's own field markup and the design system's form-row registers,
  located under `## Type` by the "Form field labels, two-level register" passage rather than by a
  line, since polish-11b-i moved every anchor in that file. The `sr-only` labels go, and the
  placeholders either go or become example text that is not the label.
- **A12 is an arithmetic finding and this task ends with a render.** The sweep could not build, so
  the 320 and 390 composition claim is unverified. If the render at those widths shows the current
  `flex gap-2` composes acceptably, A12 retires with the tile named and the task ships only the label
  and outcome deliverables. The task states the verdict explicitly either way. If the render
  confirms the finding, the fix is `flex-col gap-2 sm:flex-row` with `min-w-0` on the inputs, at the
  `sm` breakpoint the sweep names and the family standard uses.
- **The live region is one region for both actions, and it reads any `form.error`**, not the
  `fail(400, { error: 'missing' })` path alone. Task 2's adoption introduces two more failure
  outcomes on the same screen, `fail(403)` for a denial and `fail(500)` for an unattached access
  map, and a region written against the 400 path alone would leave both silent. It is always mounted
  and content-gated, per the busy and live-region rule polish-11b-i wrote into the design system, and
  it reports the created and removed outcomes as well (A13 names WCAG 4.1.3 and 3.3.1).
- **The DOM assertions this task adds to `custom-screen.spec.ts`**, named so the implementer does not
  invent them:
  - the Name input's accessible name resolves through a visible `<label>`, asserted with
    `page.getByLabel('Name')` plus an assertion that the label element is visible rather than
    `sr-only`;
  - the same for the Email input;
  - the `role="status"` region is present in the DOM on first load, with no outcome text;
  - submitting the create form with an empty Name surfaces the failure inside
    `page.getByRole('status')`.

**Steps:**
- [ ] **Step 1:** the task before capture set, per the paint protocol, at this task's parent commit.
  `signups` is in the capture tool's matrix, so this task captures.
- [ ] **Step 2:** the failing tests first, the four assertions named above, added to
  `examples/showcase/e2e/custom-screen.spec.ts`. Watch them fail.
- [ ] **Step 3:** the stacked labels.
- [ ] **Step 4:** add `form` to the route's `$props()` destructure and the always-mounted
  `role="status"` region reading any `form.error` plus both success outcomes.
- [ ] **Step 5:** **the render proof for A12.** Read the before-set tiles for the signups screen at
  320 and 390 in both schemes and report the verdict. Apply the composition fix only if the render
  shows the composition fails; otherwise retire A12 with the tile named.
- [ ] **Step 6:** the after capture set. Run the visual suite unmodified to PRODUCE
  `MOVED BASELINES:`, declare `INTENDED MOVES:` one line per surface, width, and scheme, regenerate
  the moved baselines locally by file path, and append the manifest rows under `## Polish-11b-ii`.
  Report `TILE DIFF:` per tile. The `READ ME:` line names at most twelve tiles, including the 320 and
  390 pairs in both schemes. `npm run emit:template` in the same commit. Run
  `npm run check:public-tokens` as a task step and report its result. Append the `CHANGELOG.md`
  line. The full gate. Commit.

**Acceptance criteria:**
- `grep -n "sr-only" examples/showcase/src/routes/admin/signups/+page.svelte` returns no hit on a
  form label. The Actions column header may keep its own.
- Both inputs have visible labels in the stacked register, asserted by the two e2e assertions that
  read the accessible name from the visible label.
- One always-mounted `role="status"` region exists, is present with no outcome on first load, and
  carries any `form.error` as well as both actions' success outcomes. The diff shows the region
  reading `form.error` generically rather than testing for the string `missing`.
- The report carries an explicit A12 verdict with the tile that settles it, and the composition
  changed only if that verdict says it must.
- `examples/showcase/e2e/custom-screen.spec.ts` is in the diff, carries the four named assertions,
  and passes.
- `templates/waymark/src/routes/admin/signups/+page.svelte` is byte-identical to the showcase's and
  `npm run check:template` passes.
- `npm run check:public-tokens` passes.
- The `INTENDED MOVES:` and `MOVED BASELINES:` lists match name for name, every moved baseline has a
  manifest row under `## Polish-11b-ii` in the same commit, and `TILE DIFF:` is reported per tile.
- No file under `examples/showcase/e2e/site-visual.spec.ts-snapshots/` changed.

**Commit:** one, `fix(showcase): give the signups form real labels and an announced outcome`.

---

## Task 4: The signups exemplar's destructive row

**Deliverables: two.** The per-row `aria-label` on Delete and the confirm before the destructive
submit, with the e2e's delete flow updated to go through it.

**Files:**
- Modify: `examples/showcase/src/routes/admin/signups/+page.svelte` (the Delete button and its
  enclosing form, **re-measured at dispatch because Task 3 added label markup above them**),
  `templates/waymark/src/routes/admin/signups/+page.svelte` (through `npm run emit:template`),
  **`examples/showcase/e2e/custom-screen.spec.ts`** (the delete flow at `:32-33` and the new
  assertions named below),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`, `CHANGELOG.md`
- Read but expected unchanged, and named as the recipes this task copies:
  `src/lib/components/ManageEditors.svelte:147` (the per-row `aria-label` shape), and the design
  system's safe-delete recipe, located under `## Component recipes` by the bullet opening
  `**The safe-delete is a modal alertdialog with no light dismiss.**`
- Test: `examples/showcase/e2e/custom-screen.spec.ts`, this task's test home for the same reason
  Task 3 gives
- Baselines: all ten `admin-signups-*` are the candidate movers.

**Interfaces:** none. No engine export is added or consumed beyond what the route already imports.

**Decisions the plan makes:**
- **The confirm is NOT `DeleteDialog`.** The spec names it; measurement says it cannot serve. Its
  eight props are content-entry shaped (`src/lib/components/DeleteDialog.svelte:12-35`), its form
  posts to a hardcoded `action="?/delete"` at `:103` while this row posts to `?/remove`, and its
  dialog is labelled by the fixed id `cairn-delete-dialog-title` at `:71`, which collides across the
  rows of a table. **Its `trigger?: boolean` prop is the closest thing to an escape hatch and is not
  one:** it only chooses whether the component renders its own Delete button, leaving the host to
  open the dialog through the exported `open()`, and it changes neither the posted action nor the
  label id. Adding a prop that did fix those would be public surface this pass may not add. The full
  reasoning is in the Reconciliation block's Corrections section.
- **The confirm is written in the route**, following the design system's safe-delete recipe: a native
  `<dialog>` opened with `showModal()`, `role="alertdialog"`, `aria-modal="true"`, labelled by its
  own heading, no light dismiss, and the POST inside it. That is what a developer copying the
  exemplar must write for their own domain object, which is the exemplar's whole job. The recipe's
  type-the-slug confirmation is for the engine's in-use content delete and is not copied here; the
  calm-confirm face is the shape this row takes.
- **One dialog serves every row**, opened with the row's id and name, rather than one dialog per row.
  That avoids the duplicate-id problem `DeleteDialog` has and is the shape a table wants.
- The `aria-label` follows `ManageEditors.svelte:147`'s shape: an interpolated per-row name on the
  trigger.
- **The confirm dialog falsifies the committed e2e, so this task edits it.**
  `custom-screen.spec.ts:32-33` clicks Delete and immediately asserts the row is gone; with a modal
  alertdialog in front of the POST, the click opens the dialog and the row survives. Task 4 rewrites
  that flow to click Delete, confirm inside the alertdialog, and then assert the cell count is 0.
  The per-row `aria-label` alone is harmless there, since Playwright name matching is substring by
  default and the locator is already scoped to one row.
- **The DOM assertions this task adds**, named so the implementer does not invent them:
  - two rows' Delete triggers expose two different accessible names, asserted with exact-match
    locators built from the two rows' own names;
  - clicking a row's Delete opens an element with `role="alertdialog"` and the row is still present
    until the dialog's confirm is pressed;
  - exactly one `role="alertdialog"` exists in the DOM regardless of row count;
  - the updated delete flow (click, confirm, cell count 0) passes.

**Steps:**
- [ ] **Step 1:** the task before capture set, per the paint protocol, at this task's parent commit,
  which is Task 3's commit. **Do not symlink Task 3's set:** the two parent commits differ, and the
  capture directories are write-once.
- [ ] **Step 2:** re-measure the Delete button's and its form's line numbers, since Task 3 added
  label markup above them.
- [ ] **Step 3:** the failing tests first, the four assertions named above. Watch them fail.
- [ ] **Step 4:** the per-row `aria-label`.
- [ ] **Step 5:** the single shared alertdialog, opened with the row's id and name, following the
  design system's recipe, and the e2e's delete flow rewritten to confirm through it.
- [ ] **Step 6:** the after capture set, the produced `MOVED BASELINES:`, the declared
  `INTENDED MOVES:`, the local regeneration by file path, and the manifest rows under
  `## Polish-11b-ii`. `npm run emit:template` in the same commit. Run `npm run check:public-tokens`
  as a task step and report its result. Append the `CHANGELOG.md` line. The full gate. Commit.

**Acceptance criteria:**
- Each Delete trigger carries an `aria-label` naming its own row, asserted by a test that reads two
  different accessible names from two rows.
- A native `<dialog>` with `role="alertdialog"` and `aria-modal="true"` gates the destructive POST,
  there is exactly one such dialog in the route regardless of row count, and it has no light
  dismiss.
- `DeleteDialog` is not imported by the route, and `src/lib/components/DeleteDialog.svelte` is not in
  the diff.
- `examples/showcase/e2e/custom-screen.spec.ts` is in the diff, its delete flow confirms through the
  dialog before asserting the row is gone, and it passes.
- `check:surface` is byte-identical and no file under `src/lib` is in the diff.
- `templates/waymark/src/routes/admin/signups/+page.svelte` is byte-identical to the showcase's and
  `npm run check:template` passes.
- `npm run check:public-tokens` passes.
- The `INTENDED MOVES:` and `MOVED BASELINES:` lists match name for name, with a manifest row for
  each mover, and `TILE DIFF:` reported per tile.

**Commit:** one, `fix(showcase): name and confirm the signups destructive action`.

---

> **Run one ends here.** The conductor runs
> `gh workflow run e2e.yml --ref polish-11b-ii -f update_snapshots=true`, waits for it, pulls the
> regenerated baselines into the worktree, and reads the CI diff against Tasks 3 and 4's
> `INTENDED MOVES:` declarations before run two launches. This cut sits after the two
> capture-bearing paint tasks rather than at the pass end, so twenty baseline moves are verified
> canonically while a task boundary and budget remain to fix at. Run two's first act is to re-verify
> Task 5's anchors against the pulled head. This is also the pass's one checkpoint STATUS write.

---

## Task 5: `formatTimestamp` widened

**Deliverables: two.** The widened accept set with its tests, and the superseding ledger row.

**Files:**
- Modify: `src/lib/admin-toolkit/format.ts` (the `ISO_WITH_ZONE` regex at `:72`, the
  `formatTimestamp` doc block at `:74-82`, and the parse path at `:89-90`),
  `docs/internal/engine-rulings.md` (a new row, plus a Note line on
  `audit-admin-formattimestamp`, located by slug), `docs/reference/admin-toolkit.md` (only if the
  doc block's text reaches generated reference prose), `CHANGELOG.md`
- Test: `src/tests/unit/admin-toolkit-format.test.ts`, the existing format unit suite and the one
  place `formatTimestamp` is tested today. Do not create a new file
- Baselines: none. `formatTimestamp`'s one rendering consumer is
  `src/lib/components/CairnHistory.svelte`, whose route appears in none of the twenty-eight admin
  baselines, so no seeded value can move paint. The produced list confirms it.

**Interfaces:**
- Produces: `formatTimestamp` keeps its signature exactly. Its accepted domain widens to include the
  no-seconds ISO variant, the basic offset form, and a lowercase `z`.
- Unchanged: `check:surface`. The signature and the exported names do not move.

**Decisions the plan makes:**
- **The accepted domain is stated as a rule, not as a list**: every shape that names its own zone,
  plus the SQLite `'YYYY-MM-DD HH:MM:SS'` shape the function assumes UTC for. All three new forms
  name a zone, so the widening sits inside the closed row's own rationale, which is why this is a new
  proposal against a closed row rather than a reopen.
- **The two new non-standard forms are NORMALIZED before parsing, not merely admitted by a wider
  regex.** `ISO_WITH_ZONE` today admits only the ECMAScript Date Time String Format, which is what
  makes `new Date(input)` at `:90` deterministic across a Worker's SSR and a browser's hydration,
  the invariant the doc block states. The basic offset form (`+0000`) and a lowercase `z` are both
  outside that format, so widening the regex alone would hand those two shapes to
  implementation-defined `Date.parse` behavior and the rule the ledger row states would stop being
  what the code proves. The task therefore inserts the colon into a basic offset and uppercases a
  trailing `z`, then feeds the canonical string to `new Date()`. The no-seconds variant is inside the
  format and needs no normalization.
- **The superseding row corrects the closed row's execution text on both lines that carry it.**
  `audit-admin-formattimestamp`'s `Reopens on:` line at `:2674` claims `formatTimestamp` "now accepts
  any Date-parseable timestamp", and its `Shape:` line at `:2675` repeats the claim as "Take any
  Date-parseable timestamp (ISO with offset included)". Measured at
  `src/lib/admin-toolkit/format.ts:87-93`, it accepts two shapes and returns every other input
  unchanged by design. The new row states the true domain and names both sentences as superseded, so
  the closed row keeps no live copy of the wrong statement. The closed row's own fields are not
  rewritten, per the ledger's amendment rule; it gains a `- **Note (polish-11b-ii, Task 5):**` line
  pointing at the new row.
- **The pass-through behavior is preserved and is the point.** An unrecognized shape still returns
  unchanged, because a Worker's SSR and a browser's hydration must render identical text, and a
  zone-less string cannot promise that. The doc block says so, and the task adds a test asserting a
  zone-less near-ISO string still returns unchanged.
- The row's slug is `polish-formattimestamp-domain`, its heading takes the ledger's own form
  (`## polish-formattimestamp-domain: formatTimestamp's accepted domain  (accept, 2026-09-08,
  polish-11b-ii)`), and it is placed by reading the ledger's ordering.

**Steps:**
- [ ] **Step 1:** the failing tests first. Assert the three new forms format, assert each new form
  yields the same rendered text as its canonical spelling, and assert a zone-less near-ISO string
  still returns unchanged. Watch the new ones fail and the pass-through one pass.
- [ ] **Step 2:** widen `ISO_WITH_ZONE` to accept the no-seconds variant, the basic offset form, and
  a lowercase `z`, and normalize the latter two to their canonical spelling before `new Date()`.
  Confirm every existing assertion still passes.
- [ ] **Step 3:** rewrite the doc block to state the domain as the rule, keeping the hydration reason
  it already carries and naming the normalization as what preserves it.
- [ ] **Step 4:** write the superseding ledger row in the full five-line format under a heading in
  the ledger's own form, and append the `- **Note (polish-11b-ii, Task 5):**` line to
  `audit-admin-formattimestamp`, located by slug.
- [ ] **Step 5:** run the visual suite unmodified and report the produced moved list, expected empty.
  Append the `CHANGELOG.md` line. The full gate, with `check:rulings-format`, `check:reference`, and
  `check:reference:signatures` green. Commit.

**Acceptance criteria:**
- `formatTimestamp` formats an ISO string with no seconds, one with a basic offset (the `+0000`
  form), and one with a lowercase `z`, each asserted with the rendered zone pinned.
- Each new form renders the identical string its canonical spelling renders, asserted.
- A zone-less near-ISO string still returns unchanged, asserted.
- The diff shows the basic offset and the lowercase `z` normalized to canonical form before
  `new Date()`, not handed to `Date.parse` as written.
- `formatTimestamp`'s signature and its exported names are unchanged, and `check:surface` is
  byte-identical.
- The doc block states the accepted domain as every shape that names its own zone, plus the SQLite
  shape, and carries the hydration reason with the normalization named as what preserves it.
- `docs/internal/engine-rulings.md` carries a row whose heading matches
  `^## polish-formattimestamp-domain: ` with a title and the ledger's own parenthetical, all five
  labeled lines beneath it, the domain stated as a rule, and **both** the closed row's
  "any Date-parseable" sentences (its `Reopens on:` and its `Shape:`) named as superseded.
- `audit-admin-formattimestamp` carries a `- **Note (polish-11b-ii, Task 5):**` line, its heading id
  is unchanged, and none of its existing fields is rewritten.
- `npm run check:rulings-format` passes.
- `MOVED BASELINES: none`, with the report naming `CairnHistory.svelte` as the only rendering
  consumer and its route as unbaselined.

**Commit:** one, `feat(admin-toolkit): widen formatTimestamp to every shape that names its zone`.

---

## Task 6: Records (last)

**Deliverables: four.** The HISTORY entry, the two ROADMAP sub-bullets this pass shipped closed by
name, the friction log verified, and a final read of the whole `## Unreleased` window before
polish-C branches.

**Files:**
- Modify: `docs/HISTORY.md` (the 11b-ii entry, newest first), `ROADMAP.md` (the polish sub-bullet at
  `:342-361`, reconciled against post-11b-i `main`), `docs/internal/docs-friction-log.md` (verified
  still empty, or triaged if a task filed something), `CHANGELOG.md` (a final read, no new entry)

**Interfaces:** none.

**Decisions the plan makes:**
- **The two ROADMAP sub-bullets this pass closes by name** are the `formatTimestamp` widening (Task
  5) and the `createSectionAction` adoption in `admin/signups/+page.server.ts` with its dev-package
  seam (Tasks 1 and 2). Polish-11b-i closed the `ShareLinkPanel` busy-idiom ruling and the command
  palette's live region; this task reconciles rather than assumes. The `OfficeList` and `AdminTable`
  scroll-ownership item stays open, since polish-C ships it.
- **The bracketed-fill-tone filing is not repeated.** Polish-11b-i's records task filed it to
  ROADMAP's Later tier with its measured figure. This task verifies it is there and does not re-file
  or re-measure it.
- **This task reads the whole `## Unreleased` window, not only this pass's slice.** Polish-C branches
  next and cuts the release, so the last cheap moment to confirm that the 11a, 11b-i and 11b-ii
  windows together carry no `Consumers must:` line is here.
- If a task filed a friction entry, this task triages it complete-or-move rather than leaving it,
  which is the log's own rule.
- `docs/extend/migration-notes.md` is not written. See the Ruled inputs block.

**Steps:**
- [ ] **Step 1:** write the `docs/HISTORY.md` entry for 11b-ii: what landed, what the gate caught,
  and what a later pass would be wrong to rediscover from scratch. Name at minimum the four items a
  later pass would otherwise re-derive: that `DeleteDialog` cannot serve a developer's own table row
  (content-entry props, a hardcoded `?/delete` action, a fixed dialog label id, and a `trigger` prop
  that fixes none of that); that the dev handle deliberately leaves `locals.cairnAccess` undefined
  rather than `{}` so `section-action.ts`'s unattached-map signal stays reachable under the dev
  backend, diverging from `guard.ts` on purpose; that the showcase has no DOM test harness, so route
  assertions belong in `examples/showcase/e2e/`; and that `formatTimestamp`'s two non-standard new
  forms are normalized before parsing rather than admitted by a wider regex, because
  `new Date(input)` is only deterministic across SSR and hydration inside the ECMAScript Date Time
  String Format.
- [ ] **Step 2:** reconcile the ROADMAP polish sub-bullet against post-11b-i `main`, close the two
  this pass shipped by name, remove them from the live tier, and verify the bracketed-fill-tone
  filing polish-11b-i made is present in Later.
- [ ] **Step 3:** re-read both sections of the friction log and record them empty, or triage what is
  there.
- [ ] **Step 4:** read the whole `## Unreleased` block, covering 11a, 11b-i and this pass, and
  confirm that the string `Consumers must:` appears nowhere in it. Do not touch `package.json`. The
  full gate, with `check:docs`, `check:vale`, `check:version`, and `check:rulings-format` green.
  Commit.

**Acceptance criteria:**
- `docs/HISTORY.md` carries an 11b-ii entry naming slice 11b-ii, with the four named
  do-not-rediscover items.
- `ROADMAP.md` no longer lists the `formatTimestamp` widening or the `createSectionAction` adoption
  in any live tier, and still carries the bracketed-fill-tone sweep in Later.
- The `OfficeList` and `AdminTable` item is still listed, since polish-C ships it.
- `docs/internal/docs-friction-log.md` has no untriaged entry.
- `CHANGELOG.md`'s `## Unreleased` block carries an entry from each of Tasks 1 through 5, and the
  string `Consumers must:` appears nowhere in the whole block.
- `package.json` is not in the diff, `git tag --points-at HEAD` is empty, and no release exists.
- `docs/STATUS.md` and `docs/extend/migration-notes.md` are not in the diff.
- `CAPTURES: none (no rendered surface touched)` and `MOVED BASELINES: none`.

**Commit:** one, `docs: close polish-11b-ii's records`.

---

## Gate

Run this exact string at the end of every task, in the worktree, with nothing else bound to port
4173.

```
npm run package && npm run check && npm test && publint --strict && attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs && node scripts/checks/reference-coverage.mjs && node scripts/checks/check-reference-signatures.mjs && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-self-use.mjs && node scripts/checks/check-custom-surface.mjs && npm run check:chassis-boundary && npm run check:cm-internals && npm run check:idioms && node scripts/checks/check-invisible-craft.mjs && node scripts/checks/check-admin-css-classes.mjs && node scripts/checks/check-readiness.mjs && npm run check:docs && npm run check:rulings-format && npm run check:target-stack && npm run check:arm-indexes && npm run check:editor-quotes && node scripts/checks/check-visuals.mjs && npm run check:transcripts && npm run check:symbols && node scripts/checks/check-snippets.mjs && npm run check:prose && npm run check:version && npm run check:dev-package && npm run check:template && node scripts/checks/check-consumers.mjs && npm run test:emit && npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test && npm --prefix examples/showcase run check && npm --prefix examples/showcase run test:unit && npm --prefix examples/showcase run format:check && npm run check:vale && npm run check:comments && CI=1 npm --prefix examples/showcase run test:e2e
```

**It is the CI-derived list, not a shorter one.** The list is derived from the committed
`.github/workflows/` at `f944ca4e` and includes the six CI-only gates a local ritual skips
(`check:comments`, `check:surface`, `check:snippets`, `check:transcripts`, `check:symbols`,
`check:reference:signatures`), plus `check:rulings-format`, which the spec names explicitly because
it is in neither `npm run check` nor `npm test` and is the only gate over `engine-rulings.md`. No
check is dropped for cost; the spec forecloses that. The string is byte-identical to the one
polish-11a and polish-11b-i derived, because the committed workflows did not change between the
derivations.

**What changed is the wrapper, not the list.** Twelve of the npm scripts in the derived list chain
`npm run package` as a prerequisite (`check:package`, `check:reference`,
`check:reference:signatures`, `check:surface`, `check:self-use`, `check:custom-surface`,
`check:invisible-craft`, `check:admin-css-classes`, `check:readiness`, `check:visuals`,
`check:snippets`, `check:consumers`), so the original string built the package thirteen times per
run. The string above runs `npm run package` once at the head and invokes each dependent check at
its node entry point, in the derived order, against the same artifact. Every check still runs.

**The package builds twice per gate, not once.** The head build is one, and the string's last
command, `CI=1 npm --prefix examples/showcase run test:e2e`, has `npm --prefix ../.. run package` as
its `pretest:e2e`. That second build is what makes the e2e prove this tree rather than a stale
`dist`, so it is deliberate.

`npm run check` must report 0 errors and 0 warnings, and `npm test` must exit 0; both are the floor
rather than the whole gate. The CLI suite and `check:template` run per task, because a
template-mirrored edit can carry pinned text, and three of this pass's six tasks edit a
template-mirrored file.

**Left to CI, deliberately, with one exception this pass makes.** `design.yml`
(`check:public-tokens`, `test:reskin`, the styleguide e2e), `norms.yml` (`norms:check`),
`scaffold.yml` and `create-site.yml` (the packed-tarball scaffold proofs), `tsgo.yml`
(`svelte-check --tsgo`), and `publish.yml`. Each needs a clean checkout, a browser matrix, or a full
pack that a per-task local loop cannot afford, and the PR's own CI run is the gate that clears them.
**The exception is `check:public-tokens`**, which walks every `.svelte` file under
`examples/showcase/src` and therefore walks the signups route Tasks 2, 3 and 4 rewrite. Leaving it
to CI would surface a violation only after the pass's last code task. Those three tasks run
`npm run check:public-tokens` as a task step and report its result, while the uniform gate string
stays one string across every task. Chassis-B2's Task 5 edits that script, so Task 2 re-reads it
before running it. Nothing merges on a red CI.

**The pass-end run uses the npm-script form**, the original string with `npm run check:package` and
its eleven siblings called through their wrappers, so the wrappers themselves are proven at least
once before merge.

---

## Rollback and halt semantics

Every task ends with the full gate green and `check:surface` byte-identical, so the branch is
mergeable at each of the six commits **as far as the local gate goes**. Merging additionally
requires green CI, and locally regenerated baselines are not canonical. The concrete halt states are
three:

- **After Task 4 and its conductor CI regen:** mergeable.
- **After Task 6 and the pass-end CI regen:** mergeable.
- **Anywhere else inside a run that moved paint, which means after Task 3 alone:** red on `e2e.yml`
  until a regen runs. A halt there owes a
  `gh workflow run e2e.yml --ref polish-11b-ii -f update_snapshots=true` and a pull before merge, and
  the run's accumulated `INTENDED MOVES:` declarations are the record of what is owed.

One ordering dependency is real and may not be split across the run boundary. **Task 1 before Task
2:** `createSectionAction` fails closed, so adopting it before `locals.cairnAccess` carries a rule
for `/admin/signups` on both hook branches turns the showcase e2e red. Both tasks are inside run
one. A second is intra-pass and softer: **Task 3 before Task 4**, since Task 4 confirms through a
dialog on a form Task 3 has just relabelled, and Task 4 re-measures its anchors because of it.

What a halt breaks for polish-C is small. Polish-C's own work is renames and removals over
`src/lib/sveltekit/*`, `/admin-toolkit`, and the log vocabulary, and the only outputs from this pass
it depends on are the `OfficeList` item staying open in ROADMAP and the `## Unreleased` block
carrying no `Consumers must:` line from this window. A halt before Task 6 leaves both unverified but
neither wrong.

---

## Pass-end ritual

1. **`code-simplifier`** over the code this pass changed, before the final commits. Apply its
   refinements, then re-run the gate.
2. **The full gate** above, green, in one uninterrupted run, in the npm-script form so the wrappers
   are proven.
3. **The six CI-only gates** confirmed green inside that run: `check:comments`, `check:surface`,
   `check:snippets`, `check:transcripts`, `check:symbols`, `check:reference:signatures`.
   `check:surface` must still be byte-identical to `main`'s, since no task updates it.
4. **The from-scratch consumer build.** A fresh `npm install` in the worktree's
   `examples/showcase`, then `npm --prefix examples/showcase run build` and the e2e suite, so the
   proof is against this branch's dev package and not `main`'s symlinked build.
5. **`design.yml` green on the PR**, with `check:public-tokens` green over the rewritten signups
   route.
6. **The pass-end CI regen**, covering Task 5's produced empty list and anything run two moved, and
   its diff read.
7. **The reviewer fan-out**, named per what this pass touches. No task dispatched any of these; they
   all run here.
   - **`web-auth-security-reviewer`** over the `cairnAccess` seam and the signups adoption:
     `packages/cairn-cms-dev/src/handle.ts`, `examples/showcase/src/access.ts`,
     `examples/showcase/src/hooks.server.ts`, and
     `examples/showcase/src/routes/admin/signups/+page.server.ts`. It reads for a session-derived
     grant, a permissive default, a divergence from `guard.ts`'s own attach (the undefined-rather-
     than-`{}` divergence is deliberate and is named in the dispatch so the reviewer grades the
     reasoning rather than reporting it as a defect), and a weakened owner gate on the destructive
     action. **This is the pass's only security review**; the spec placed one inside Task 1's chain,
     which `cairn-implementer` cannot run, and this read sees the adoption on top of the seam.
   - **`daisyui-a11y-reviewer`** over the signups route: the stacked label register, the outcome
     region, the per-row accessible names, and the alertdialog, against WCAG 2.2 and DaisyUI 5.
   - **`svelte-reviewer`** over the same route, reading for reactivity defects in the `form` prop's
     outcome region and the shared dialog's per-row state.
   - **`cloudflare-workers-reviewer` does not run.** No task in this pass changes Worker runtime
     code, a D1 query, or a binding. The signups route's D1 access moves from a `platform!` read to
     `resolveDb`, which is an engine seam rather than new query code.
8. **The fresh-context `visual-verifier`**, which must not be a context that built any of this work.
   It is bounded the way chassis-B1's was, and the bound is part of the ceiling.
   - **The before set, captured first.** Capture the same routes, schemes and widths at the pass's
     parent commit into `~/.cache/cairn-polish-11b-ii/verify/before/`, using this plan's own recipe.
     The verifier is handed both sets as separate labeled blocks and never a composite.
   - **Where it runs:** inside `examples/showcase`, using that directory's own
     `node_modules/@playwright/test`, against the preview server the suite already starts on port
     4173 with the dev backend active. Nothing else may hold that port.
   - **How it captures, per route:** set the `cairn-admin-theme` cookie on the `baseURL` origin
     (`cairn-admin` or `cairn-admin-dark`), call `page.emulateMedia({ colorScheme })` to match, set
     the viewport with `page.setViewportSize({ width, height: 800 })`, navigate, wait on the route's
     own settling locator, and screenshot with `fullPage: true`. This is the idiom at
     `examples/showcase/e2e/admin-visual.spec.ts:17-21` and `:222-228`, and the reason the cookie
     rather than `emulateMedia` selects the SSR theme is recorded in that file's comment at `:9-13`.
   - **The widths:** 320, 390, 768, 1440, 2560, the family five-viewport bar.
   - **Both schemes** at every width.
   - **The route, cut to what this pass recomposes:** `/admin/signups` alone. One route at five
     widths in both schemes is ten captures per set.
   - **The one state the committed baselines do not reach**, which the verifier opens by hand at 390
     and 1440 only: the delete confirm's alertdialog, opened from a row.
   - **The read is bounded.** The verifier reads **one above-the-fold tile per capture, plus the
     tiles the `## Polish-11b-ii` intended-moves rows name**, and nothing else. Output under
     `~/.cache/cairn-polish-11b-ii/verify/after/signups-<scheme>-<width>.png`, with one verdict per
     visual device and COSMETIC or STRUCTURAL on each.
   - **The loop is bounded:** verify, fix, fresh verify. A second FAIL halts and is the conductor's
     decision, never a third round.
9. **Docs this pass owns**, confirmed present: `docs/internal/engine-rulings.md` (Task 5's new row
   and its annotation). No published page under `docs/admin/`, `docs/editors/`, `docs/extend/`, or
   `docs/reference/` changes, except `docs/reference/admin-toolkit.md` if and only if Task 5's doc
   block reaches generated reference prose.
10. **`CHANGELOG.md` under `## Unreleased`**, finalized. **This window is non-breaking, so no entry
    carries a `Consumers must:` line**, and the absence across the whole 11a-to-11b-ii window is a
    checked acceptance in Task 6.
11. **`docs/extend/migration-notes.md` is untouched.** The window carries no consumer action and
    polish-C's task 14 reconciles the whole section.
12. **`docs/HISTORY.md`** carries the 11b-ii entry (Task 6).
13. **`ROADMAP.md`** has the two shipped sub-bullets closed and removed from their live tier (Task
    6).
14. **The friction log** triaged whole in Task 6, complete-or-move, not appended to.
15. **The intended-moves manifest** carries a `## Polish-11b-ii` heading whose rows account for every
    baseline this pass moved, verified by diffing
    `examples/showcase/e2e/admin-visual.spec.ts-snapshots/` against `main` and matching each changed
    file to a row.
16. **The conductor writes `docs/STATUS.md`** at merge, never a task.
17. **No version bump, no tag, no publish.** The window holds for polish-C's single cut.
    **Geoff merges.**

---

## What this pass hands forward

Polish-C branches from `main` after this pass merges, and its plan is authored then, with the
post-11a module map as its Reconciliation input.

- **To polish-C, the `OfficeList` item, still open and the only polish sub-bullet left in ROADMAP's
  live tier.** Polish-11b-i closed two and Task 6 closes two more, leaving that one, so polish-C's
  task 12 finds it where the spec says it is, and task 15 reconciles ROADMAP.
- **To polish-C, `OfficeList` untouched.** No task in either 11b half opens
  `src/lib/admin-toolkit/OfficeList.svelte`, `docs/extend/add-a-custom-admin-screen.md`, the
  `toolkit/custom-screen` reproduction, or the floating-card recipe. The removal lands on the tree
  the spec described.
- **To polish-C, the floating-card recipe named by its class set rather than by a line.** The recipe
  is under `## Component recipes`, the bullet opening `**Floating card:** \`card-shell card-shadow\``,
  and the elevation pair it composes over is under
  `## The developer-facing vocabulary (the versioned seam)`, the bullet opening
  `**The theme-adaptive elevation pair**`. Polish-11b-i's Task 1 moved both anchors, so polish-C
  re-measures rather than reusing any line from either plan.
- **To polish-C, two new ledger rows to sweep for renames.** `polish-busy-idiom` (polish-11b-i's
  Task 1) and `polish-formattimestamp-domain` (Task 5 here) both name symbols the breaking window may
  rename (`ShareLinkPanel`, `formatTimestamp`, `cairn-btn-guarded`). Polish-C's task 13 enumerates the
  ledger population by grep rather than by a pinned count, so these two join that population
  automatically, and this line is the reminder that the count moved by two.
- **To polish-C, a widened `formatTimestamp` whose accepted domain is a stated rule.** If the
  breaking window touches `/admin-toolkit`, the rule (every shape that names its own zone, with the
  two non-standard forms normalized before parsing) is the thing to preserve, not the regex.
- **To polish-C, `DevBackendOptions` with two new members.** Line 2 of the consumer list renames it
  to `DevBackendConfig`. It carries `seedContent`, `access`, and `roles` after this pass, so the
  rename's migration note names three members rather than one.
- **To polish-C, `examples/showcase/src/access.ts` as a new exemplar file.** It is surface a
  scaffolded site copies, so any polish-C rename touching `defineAccess`, `AccessMap`, or
  `RolesDeclaration` reaches it and the template's mirror of it.
- **To polish-C, the whole `## Unreleased` window verified free of `Consumers must:` lines** (Task
  6), so polish-C's own task 10 reconciles a migration-notes section whose only actionable entries
  are its own.
- **To the docs rewrite, a signups exemplar that now teaches the documented path.**
  `docs/extend/add-a-custom-admin-screen.md`'s rebuild (pass 2a's chain D, ordered after polish-C)
  describes a route that uses `createSectionAction`, a stacked label register, an announced outcome
  reading any `form.error`, and a safe-delete alertdialog. The old page describes the raw
  `requireOwner` shape.
- **To any later pass, the four things this pass measured that a plan should not re-derive**, all of
  them recorded in Task 6's HISTORY entry: that `DeleteDialog` cannot serve a developer's own table
  row and that its `trigger` prop does not change that; that the dev handle deliberately leaves
  `locals.cairnAccess` undefined rather than `{}`, diverging from `guard.ts` to keep
  `section-action.ts`'s unattached-map signal reachable under the dev backend; that the showcase has
  no DOM test harness, so route assertions belong in `examples/showcase/e2e/`; and that
  `formatTimestamp`'s two non-standard forms are normalized before parsing because `new Date(input)`
  is only deterministic across SSR and hydration inside the ECMAScript Date Time String Format.
- **Release:** the window holds. ONE cut, after polish-C.

---

## Post-mortem

The `cairn-pass` ritual appends the post-mortem here at pass close, scoring both budgets against
the ceiling and the interaction counts.
