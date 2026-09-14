# Pre-Cut Window Pass Implementation Plan (the dependency sweep and the accepted admin defaults, immediately before the 0.97.0 cut)

> **For agentic workers:** four tasks, executed as a per-task chain (`cairn-implementer` then
> `diff-reviewer` then the gate), dispatched one task at a time with the Agent tool. Below six
> tasks, so no workflow runner. Steps use checkbox syntax for tracking. Every `file:line` below is
> re-verified at dispatch, per the Reconciliation block.

**Date:** 2026-09-14. **Approved:** Geoff, 2026-09-14, after the three-lens adversarial review and
the fold's independent read. The plan-approval gate is closed; execution needs no further read.

**Where it runs:** on `main`, in the main checkout, with **no worktree live**. The sweep rewrites
both lockfiles, which collide with any live branch, so this pass follows the last merge and
precedes the cut (Geoff, 2026-09-13, recorded in `docs/STATUS.md`'s next-action block and the
`release-deps-newest-production` memory). Commits land on `main` and push to `origin/main`; there
is no PR and no branch. CI green on `main` is the pass's own exit proof, because it is what the cut
reads.

**Where it sits in the sequence:** polish-C merges, the admin motion pass merges, **this pass**,
then the `0.97.0` cut through the `cairn-release` skill. Nothing in this pass bumps a version or
cuts anything.

**Why the sweep runs after the motion pass, not before it.** The motion pass creates sixty new
baseline files, all rendered against the toolchain this sweep then moves. Running the sweep first
would let those sixty be born on the shipped toolchain, and Geoff ruled the other way: the sweep
runs last so the cut reads a `main` whose dependencies moved after every code change, and the
newborn baselines are covered the same way every other baseline is. Task 1's declared moves and the
pass-end regen on CI cover the motion pass's sixty new surfaces as well as the twenty-eight older
admin shots, which is why this plan's CI-wait line item carries 0.5M rather than the 0.25M a
twenty-eight-file read would need.

**Goal:** the release starts from the newest production version of every dependency, the four
accepted admin defaults that belong to this window land, and the held majors plus the deferred
survey items are recorded where the next cut and the borrow-1 pass will find them.

**Scope, ruled by Geoff on 2026-09-13; no task re-opens any of it:**

- The dependency sweep across all three manifests (the engine root, `examples/showcase`, and the
  `packages/create-cairn-site` workspace): every minor and patch, plus the non-major `npm audit fix`
  results, both lockfiles reinstalled from scratch.
- Three of the five accepted Carbon defaults (`ROADMAP.md:896-914`): the pagination current-page
  cue, the two destructive dialogs' backdrops, and the `AdminTable` accessible name. The other two, the
  tooltip primitive and batch actions on `AdminTable`, are borrow-1 work and are out.
- The Blueprint audit's one FIX line, **if the motion pass has not already taken it**. See
  "The transition-all item" below; as planned it is already taken.

**A dependency upgrade carries a refactor step.** Geoff's standing rule, 2026-09-14: a bump that
adds a capability is not finished until the code that hand-rolls that capability is either changed
or filed. Task 1 carries the step as a named deliverable, "the refactor decision", with the changelog
survey as its capability list. The workstation `dependency-upgrade` skill carries this step
for every repo; the plan states it in full so no task depends on the skill being loaded.

**Inputs, read before dispatch:**

- `docs/internal/record/2026-09-13-minor-bump-features.md`, the changelog survey. It is done. No
  task re-surveys it, and it is the capability list the refactor decision rules against.
- `docs/internal/record/2026-09-13-carbon-patterns-survey.md`, Part 5b, the five accepted defaults.
- `docs/internal/record/2026-09-13-blueprint-audit.md`, "DEFECTS TO FIX BEFORE THE RELEASE".
- `~/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/release-deps-newest-production.md`,
  the standing dependency discipline.

**Task count:** four. Task 1 is the sweep, Task 2 and Task 3 are the accepted defaults split at the
published-contract boundary, and Task 4 is the records task. `ROADMAP.md:897` forecast the three
defaults as "one bounded task". This plan splits them in two and adds no work: Task 3 changes a
published prop contract and the reference page's props block, and Task 2 changes neither, so each
reviewer holds one acceptance rather than a merged pair. The split does **not** rest on the surface
snapshot; component props are opaque in that file, which Task 3's own steps state.

**Token ceiling:** **3.30M**, sized from the task count against polish-C's own derivation (fifteen
gate-bearing units at 500K each, 9M with reserves) and the motion pass's 6.7M for ten. The
arithmetic here, per line item rather than a flat band:

| Line item | Basis | Tokens |
|---|---|---|
| Task 1, the sweep | 850K. The heaviest unit in the pass: three `npm outdated` and `npm audit` reads, the release-note skims, two from-scratch reinstalls, the lockfile delta read, the target-stack doc reconciliation, the survey's named verification reruns, and the refactor decision with its one taken change | 0.85M |
| Tasks 2 and 3 | 900K together. Task 2 is 500K, carrying two components, two destructive dialogs, the sheet-inventory branch, and declared baseline moves; Task 3 is 400K, one optional prop with an existing component suite to go red first | 0.9M |
| Task 4, records | 350K. Three files and a friction-log verification, no code | 0.35M |
| Re-dispatch reserve | one fix round forecast, an implementer dispatch plus an Opus review | 0.4M |
| Reviewer fan-out | `daisyui-a11y-reviewer` and `svelte-reviewer` at pass end, plus `code-simplifier` over the pass's commits | 0.3M |
| Conductor CI waits and the baseline reads | the sweep's CI run on `main`, the pass-end `update_snapshots` regen on `main`, and the diff read over both this pass's declared moves and the motion pass's sixty new surfaces | 0.5M |
| **Total** | | **3.30M** |

The repo's last four comparable passes each overran (`docs/HISTORY.md`). This ceiling answers that
record rather than restating it: the per-line-item sizing above carries a 0.4M re-dispatch reserve
and a 0.3M fan-out reserve, and the conductor treats the 80 percent trigger (**2.64M**) as the
decision point rather than the ceiling. At that trigger the conductor finishes the task in flight,
writes STATUS, and asks one combined question. A fifth overrun is a combined question to Geoff, not
a silent extension.

**Checkpoint interval:** four tasks, the default, so the one scheduled checkpoint is the pass close.
One extra STATUS write is added after Task 1, because the lockfile reinstall is the pass's only
change a resuming session cannot infer from the tree: STATUS after Task 1 records whether `main`
already carries new lockfiles. Each write carries the task ledger, the decisions taken, the spend
against the ceiling, and the next task.

**Execution:** sequential, one task at a time, dispatched with the Agent tool as
`cairn-implementer` (Sonnet) then `diff-reviewer` (`claude-opus-5`) then the gate inside the chain.
One re-dispatch on a `fix` verdict; a second `fix` is the conductor's decision. The conductor reads
no diff. Task order is fixed: 1, then 2, then 3, then 4. Task 1 first because every later task's
gate runs against the new lockfiles, and Task 4 last because it reconciles what the first three
wrote.

**Pre-dispatch, before Task 1.** Preconditions, not task steps:

1. Confirm the admin motion pass has merged to `main` and CI on `main` is green.
2. Confirm no worktree carries work in flight. `git worktree list` reports nine entries today, and
   pruning registered worktrees is not this pass's job; the check is that
   `git -C <path> status --porcelain` is empty for every entry `git worktree list` reports, and that
   `pgrep -f .claude/worktrees` returns nothing. A live executor anywhere in this repo stops the
   pass (workstation rule, one executor per worktree).
3. Confirm `git status` is clean in the main checkout.
4. Commit this plan to `docs/superpowers/plans/2026-09-14-pre-cut-window-pass.md` on `main`. Each
   implementer is told to read it from the repo, so an untracked plan means four dispatches that
   cannot follow instruction one.
5. Run the transition-all reconciliation grep below and record its answer in the dispatch note.
6. **Arm the unattended-work guards.** Four full gates, each carrying the showcase e2e, is long
   unattended work. Arm the runaway transcript watcher and, on battery, `systemd-inhibit
   --what=sleep` plus the battery watchdog, per `~/.claude/docs/unattended-work-guards.md`, which
   is read before either is armed.

---

## Reconciliation at dispatch

Every anchor below was measured on `main` at `f1c72dbf` on 2026-09-14. **Polish-C and the motion
pass both land between this plan and its dispatch**, and both touch the admin components, so every
line number here is a starting point rather than a fact. Each task's step 1 re-greps its own
anchors and reports the measured line beside the quoted one.

| Subject | Anchor measured on `main` at `f1c72dbf` |
|---|---|
| Pagination current page, color-only | `src/lib/admin-toolkit/Pagination.svelte:102-105`: `class="join-item btn btn-sm {item === page ? 'btn-active' : ''}"` with `aria-current` at `:103` |
| The pagination range line, untouched | `src/lib/admin-toolkit/Pagination.svelte:64`, `role="status" aria-live="polite"` |
| The component's own scoped `<style>` | `src/lib/admin-toolkit/Pagination.svelte:124` |
| The ruled cue's source | `src/lib/admin-toolkit/ListToolbar.svelte:295` and `:352`, the check glyph the design system names |
| The design system's pagination ruling | `docs/internal/admin-design-system.md:603-614`, whose `:612-614` declares `Pagination` a known exception |
| `DeleteDialog`'s backdrop form | `src/lib/components/DeleteDialog.svelte:112`, `<form method="dialog" class="modal-backdrop">`, inside the `role="alertdialog"` dialog opened at `:71` |
| `EditPage`'s discard confirm, the second destructive dialog | `src/lib/components/EditPage.svelte:2539-2558`, its backdrop form at `:2556`, no `role="alertdialog"`, its own comment at `:366` calling it "on the DeleteDialog pattern" |
| The design system's light-dismiss rule | `docs/internal/admin-design-system.md:501-503`, with the generic Dialog bullet opening at `:490` and the media safe-delete at `:937-942` |
| `AdminTable`'s bare table | `src/lib/admin-toolkit/AdminTable.svelte:60`, inside the `toolkit-admin-table-wrap` at `:59`; props destructured at `:54`, `interface Props` at `:33` |
| `AdminTable` call sites, seven | `src/lib/components/ManageEditors.svelte:98`, `src/lib/components/CairnHistory.svelte:89`, `src/lib/components/ConceptList.svelte:366`, `src/lib/components/CairnMediaLibrary.svelte:823`, `src/lib/reproductions/stories/CustomScreen.svelte:18`, `examples/showcase/src/routes/admin/signups/+page.svelte:102`, and `templates/waymark/src/routes/admin/signups/+page.svelte` (generated, never hand-edited) |
| The `AdminTable` surface snapshot line | `docs/internal/api-surface.md:119`, `- \`AdminTable\`: Component<Props, {}, "">`, the opaque form twenty-five exports share |
| The role `<select>` the refactor decision takes | `src/lib/components/ManageEditors.svelte:169-174`, the label at `:169`, the `<select>` at `:170`, and `selected={entry.role === 'editor'}` inside the `#each` at `:172` |
| `EditPage`'s flash strip | `src/lib/components/EditPage.svelte:1643`, the only `transition-all` in `src/lib` |
| The pagination call site, one | `src/lib/components/ConceptList.svelte:465`, the repo's only `<Pagination>` |
| The motion pass's intended-moves protocol | `docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md:605-607` and `:641-663`; its Task 6a heading is at `:1300` |
| The second live ROADMAP entry for the pagination defect | `ROADMAP.md:1422-1431`, "Three design-system gaps found in the same triage" |

### The measured baseline fact, which two tasks depend on

`examples/showcase/e2e/admin-visual.spec.ts` shoots `/admin/posts` full-page in both schemes
(`admin-office-light.png` and `admin-office-dark.png`). That screen renders `ConceptList.svelte:465`'s
`<Pagination>`, the showcase's posts concept reads `src/content/posts` (`examples/showcase/src/theme/cairn.config.ts:66`)
which holds **27 entries**, and `ConceptList.svelte:66` sets `pageSize = 10`. So `pageCount` is 3,
`Pagination.svelte`'s `{#if pageCount > 1}` guard passes, and the pager nav is visible in both
baselines. **Task 2's cue therefore moves paint**, and Task 2 is a paint task rather than a
paint-neutral one. Task 1 moves paint too: the nav count pill
(`src/lib/components/CairnAdminShell.svelte:1005` and `:1030`, `badge badge-xs … ml-auto`) is on
every admin shot, and daisyUI 5.7.35 fixes badge shrink inside a flex row.

### The transition-all item

**Item B(4) in the ruled scope and the Blueprint audit's one FIX line are the same defect**, the
`transition-all` on the flash strip at `src/lib/components/EditPage.svelte:1643`. It is carried once
here, not twice.

**The motion pass already takes it.** Its plan,
`docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md`, assigns the fix to **Task 6a,
"The admin migrated onto the language"** (`:1300`), whose step 3 and acceptance criteria name
`EditPage.svelte:1643` taking "a named property list (`transition-[opacity,translate]`)" and the
duration token (`:1349`, `:1410`, `:1414`), with `:1468` asserting `transition-all` as one of three
classes leaving the packaged sheet and `:2324` carrying the consumer line for the three removed
utility classes.

**So this plan drops the item**, on one condition checked at dispatch, not assumed:

- [ ] Pre-dispatch step 5: `grep -rn "transition-all" src/lib` on `main` after the motion pass
  merges. **Empty is the expected answer** and the item is closed by motion Task 6a; Task 4 records
  which pass shipped it and nothing else in this pass touches it. **A hit** means the motion pass
  did not land it, and the hit becomes Task 2's fourth deliverable: the flash strip's
  `transition-all` gives way to the two properties it animates, on the motion pass's own token form
  if that pass shipped the tokens, and on a literal named property list if it did not. Both branches
  carry acceptance criteria, in Task 2 and in Task 4.

---

## Global constraints

These bind every task. An implementer reads them before its Files block.

1. **No em dash**, in any code comment or any doc this pass writes.
   `house/no-em-dash-in-comments` enforces it on `src/lib` and the showcase under `check:comments`;
   in prose it is a review finding.
2. **TSDoc governs every comment.** Document the contract and the reason, never the type the
   signature already states, and never a paraphrase of the symbol name. An exported symbol keeps
   its minimal one-line doc. Svelte `<script>` comments follow the same standard, with the
   `@component` convention for the component block.
3. **No process citations in shipped comments.** A comment names no pass, plan, ruling id, or task
   number. The changelog and the records carry that.
4. **`docs/STATUS.md` is the conductor's file.** No task edits it and no task lists it in Files. A
   task that finds a stale line there reports it.
5. **No version bump, no tag, no publish.** No task edits `package.json`'s `version`, runs
   `npm version`, creates a tag, or fires `publish.yml`. The cut is a separate act through
   `cairn-release`.
6. **`templates/waymark` is generated, never hand-edited.** `npm run emit:template` emits it from
   `examples/showcase`, which is the single source, and `check:template` is the proof. A task that
   changes a call the template carries changes the **showcase** and re-emits.
7. **A public-surface change regenerates the snapshot in the same commit**, with
   **`npm run package && node scripts/checks/check-surface.mjs --update`**. Never
   `npm run check:surface -- --update`: npm appends the argument to the end of that script's
   two-command chain, where `check-surface-leaks.mjs` receives it and `check-surface.mjs`, the only
   reader of the flag, never does. The snapshot's own generated banner
   (`scripts/checks/check-surface.mjs:22`) names the broken `-- --update` form; ignore the banner,
   use the form above, and report the discrepancy. Only Task 3 can move the surface, and component
   props are opaque in the snapshot, so it may not move at all. Tasks 1, 2, and 4 keep
   `docs/internal/api-surface.md` out of their diffs, and the plain `check:surface` in the gate
   proves it.
8. **The failing gate comes first.** Every task names the assertion or the gate that goes RED
   before any fix, and what turns it green. Tasks 2 and 3 have a real component suite to write into
   (`src/tests/component/Pagination.test.ts`, `DeleteDialog.test.ts`, `AdminTable.test.ts`), so
   each writes its assertion, watches it fail, then makes it green. Task 1's red-first is
   `check:target-stack`, which the declared-range rewrite fires. Task 4 has no red-first available
   and says so rather than dressing a read as one. A task with no red-first states that plainly; it
   never presents re-running an already-green test as a red.
9. **Each task appends its own `CHANGELOG.md` entry under `## Unreleased`**, and the heading is not
   renamed. A `Consumers must:` line appears only where consumer action is needed, with the matching
   bullet in `docs/extend/migration-notes.md`'s `## Unreleased` section. **This plan rules per task
   which entries carry one**: Task 1 does, for the packaged admin sheet and the bundled icon set;
   Tasks 2, 3, and 4 do not. Each task's Decisions block states the reasoning, so an implementer
   neither invents a consumer action nor omits one it owes. Every entry still states plainly what
   changed.
10. **Commits.** Imperative mood, Conventional Commits, specific files rather than `git add -A`,
    one commit per Commit boundary named in a task. The footer is exactly these two lines and no
    other:

    ```
    Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_019feEG5hQqL4uEaxU1Tq6hT
    ```

11. **Gates run through `cairn-run-gate '<string>'`** (dotfiles bin). On exit 75, re-issue the same
    command until it prints `gate exit:`. Never poll a log.
12. **The CI-canonical baseline rule.** The visual baselines are regenerated on CI, and this
    workstation's Chromium renders a few surfaces a few pixels differently. A local gate is green
    when its only visual failures are exactly the files the latest regen commit rewrote plus the
    files the task declared. Anything else is a real red, and a locally biased baseline is never
    committed.
13. **The intended-moves protocol, imported verbatim from the motion pass**
    (`docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md:605-607` and `:641-663`), and
    binding on **Task 1 and Task 2**, the pass's two paint tasks. Each declares `INTENDED MOVES:`
    before touching markup or a manifest, one `surface width scheme: what moves` per line. The moved
    list is **produced, not asserted**: before any regeneration, run the visual suites unmodified
    (`CI=1 npx playwright test e2e/admin-visual.spec.ts`, inside `examples/showcase`) and paste the
    exact failing snapshot names under `MOVED BASELINES:`. Regenerate only those files locally by
    file path with the mode pinned
    (`CI=1 npx playwright test e2e/admin-visual.spec.ts --update-snapshots=changed`). The implementer
    summary carries `INTENDED MOVES:` and `MOVED BASELINES:` verbatim and in order. Each task's
    acceptance is that every moved baseline is in its declared list and no baseline outside the list
    moved. A baseline that moves for a change the report does not enumerate is stop-and-report.
    Tasks 3 and 4 touch no rendered surface and prove it with `git status` over
    `examples/showcase/e2e/*.spec.ts-snapshots/`, reported as `MOVED BASELINES: none`.

---

## Gate

Run this exact string at the end of every task, in the main checkout, with nothing else bound to
port 4173. It is polish-C's CI-derived string with `publint` and `attw` invoked through `npx`.

```
npm run package && npm run check && npm test && npx publint --strict && npx attw --pack . --ignore-rules no-resolution cjs-resolves-to-esm internal-resolution-error && node scripts/checks/check-package-files.mjs && node scripts/checks/check-skill-budget.mjs && node scripts/checks/reference-coverage.mjs && node scripts/checks/check-reference-signatures.mjs && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs && node scripts/checks/check-self-use.mjs && node scripts/checks/check-custom-surface.mjs && npm run check:chassis-boundary && npm run check:cm-internals && npm run check:idioms && node scripts/checks/check-invisible-craft.mjs && node scripts/checks/check-admin-css-classes.mjs && node scripts/checks/check-readiness.mjs && npm run check:docs && npm run check:rulings-format && npm run check:target-stack && npm run check:arm-indexes && npm run check:editor-quotes && node scripts/checks/check-visuals.mjs && npm run check:transcripts && npm run check:symbols && node scripts/checks/check-snippets.mjs && npm run check:prose && npm run check:version && npm run check:dev-package && npm run check:template && node scripts/checks/check-consumers.mjs && npm run test:emit && npm --prefix packages/create-cairn-site run prepack && npm --prefix packages/create-cairn-site test && npm --prefix examples/showcase run check && npm --prefix examples/showcase run test:unit && npm --prefix examples/showcase run format:check && npm run check:vale && npm run check:comments && CI=1 npm --prefix examples/showcase run test:e2e
```

**Every task runs the full string, e2e clause included**, which is this pass's one departure from
the paint-neutral shortcut. The reason is Task 1: once the toolchain under the baselines moves,
no later task can claim paint neutrality without the suite that renders it. Expect 16 to 28
minutes per gate on polish-C's measured figure, plus the e2e.

**Package once, at the head.** Twelve of the npm scripts in the derived list chain `npm run
package` as a prerequisite, so the string runs it once and invokes each dependent check at its node
entry point against the same artifact.

`npm run check` must report 0 errors and 0 warnings, and `npm test` must exit 0. Both are the
floor, not the whole gate.

**Two checks outside the string, hand run once.** `check:interactive-contrast` and
`check:touch-targets` exist in `package.json` and run in no workflow. This pass ships an
accessibility change to a control cluster, so Task 2 runs both by hand over the pagination cue and
reports their output. Neither joins the gate string.

**Left to CI, deliberately:** `design.yml` (`check:public-tokens`, `test:reskin`, the styleguide
e2e), `norms.yml` (`norms:check`), `scaffold.yml` and `create-site.yml` (the packed-tarball
scaffold proofs), and `tsgo.yml` (`svelte-check --tsgo`). Each needs a clean checkout, a browser
matrix, or a full pack. **After Task 1 these matter more than in any other pass**, because the
scaffold proofs are what catch a template dependency bump the local gate cannot see. Nothing goes
to the cut on a red CI.

---

## Task 1: The dependency sweep

**Deliverables: five.** Every declared range on its newest non-major version with the audit fix
applied, both lockfiles reinstalled from scratch, the survey's named risks verified, the
target-stack doc reconciled, and the refactor decision ruled.

**The failing gate first:** `npm run check:target-stack` is the assertion, and the declared-range
rewrite is what fires it. `scripts/checks/check-target-stack.mjs:63-81` derives every `Target today`
cell in `docs/reference/supported-toolchain.md` from **declared ranges** (`rootPkg.version`,
`engines.node`, `peerDependencies`, the template's `devDependencies.wrangler`,
`adapter-cloudflare` and `typescript`, and `wrangler.compatibility_date`), never from installed
versions. Because this task rewrites `examples/showcase/package.json`'s `wrangler` range off
`^4.125.0`, the check goes red and the doc edit turns it green. A sweep that moved only the
lockfiles would leave the check green and the published floors stale, which is the reason the
ranges move at all.

**Files:**
- Modify: `package.json`, `package-lock.json`, `examples/showcase/package.json`,
  `examples/showcase/package-lock.json`, `packages/create-cairn-site/package.json`,
  `docs/reference/supported-toolchain.md`, `docs/extend/migration-notes.md`, `CHANGELOG.md`
- Modify, the refactor decision's one taken change: `src/lib/components/ManageEditors.svelte`
  (the role `<select>` at `:169-174`) and `src/tests/component/ManageEditors.test.ts`
- Possibly modify: `src/tests/unit/fixtures/admin-sheet-inventory.txt`, if the daisyUI move changes
  the compiled sheet's class inventory. `src/tests/unit/admin-sheet-inventory.test.ts` diffs the
  compiled sheet against that fixture in both directions and `expect.fail`s on any drift, so a
  seventeen-release daisyUI move can red the gate on a file the sweep never meant to touch. The
  ordering is the motion pass's: the `CHANGELOG.md` line first, then
  `npm run update-admin-sheet-inventory`, then account for every fixture diff line in the report.
- Possibly modify: `templates/waymark/**` by re-emission only (`npm run emit:template`), never by
  hand, if a showcase dependency the template carries moves
- Possibly modify: the declared baselines under `examples/showcase/e2e/*.spec.ts-snapshots/`, per
  global constraint 13
- Out of scope: every other file under `src/lib`. Beyond the one refactor-decision change named
  above, this task changes no engine code.

**Interfaces:** none. No public surface changes, and `docs/internal/api-surface.md` stays out of the
diff.

**Decisions the plan makes:**

- **Take every minor and patch and the non-major `npm audit fix` results, at every manifest, without
  asking.** The standing rule (`release-deps-newest-production`). `npm audit fix --force` is never
  run, anywhere.
- **The declared ranges move with the install.** Every `dependencies` and `devDependencies` caret
  range in `package.json`, `examples/showcase/package.json`, and
  `packages/create-cairn-site/package.json` is rewritten to `^<newest non-major>`, so the declared
  floors track what is installed and `check:target-stack` goes red first. `npm update` alone leaves
  every manifest untouched.
- **`peerDependencies` ranges do not move in this pass.** `svelte ^5.56.10`, `@sveltejs/kit ^2.70`,
  and `@cloudflare/workers-types ^5` stay exactly as they are.
  `docs/reference/supported-toolchain.md`'s own "How often it moves" column is the authority: a peer
  floor moves "only when a feature needs a newer capability", and no engine code in this window
  needs one. Raising a floor is a consumer requirement of a different kind. A dev-dependency bump of
  the same package is not a floor raise and needs no floor change.
- **Three majors are held as families, not as single packages, and no task argues them:** TypeScript
  7 (`svelte-check` and `typescript-eslint` peers), the Vitest 5 family (`vitest`,
  `@vitest/browser`, `@vitest/browser-playwright`, all blocked by
  `@cloudflare/vitest-pool-workers` pinning `^4.1`), and `@types/node` 26, which tracks the Node 24
  runtime. The installed range is `^24.13.3` at both roots, so the hold covers 25 as well as 26.
  Task 4 records all three with their peer blockers and their re-check triggers.
- **Packages that moved past the survey.** Skim the release notes for every package whose available
  version is newer than the survey's stated target, measured at dispatch rather than assumed. Today
  that is `@cloudflare/workers-types`, `@lucide/svelte`, `wrangler`, `eslint-plugin-jsdoc`,
  `devalue`, `esbuild`, `tsx`, `yaml`, and `postcss`, which the survey does not cover at all. One
  line each. There is no new survey of any package the survey already cleared at its current target.
- **The survey's per-package "risks in the bump" items are verification steps here, not reading.**
  Named explicitly so none is skipped:
  - The three `<select>` sites (`src/lib/admin-toolkit/ListToolbar.svelte:364,393`,
    `src/lib/admin-toolkit/Pagination.svelte:74`) and the `<textarea>`
    (`src/lib/components/ComponentForm.svelte:330-342`), against Svelte 5.57.0's two
    compiler-codegen fixes. Re-run the component suite and the e2e over these.
  - The checkbox, badge, and `loading-sm` visual and e2e baselines, against daisyUI 5.7.35 and
    5.7.36's pixel changes.
  - `src/tests/unit/reproductions-icon-drift.test.ts`, the correct tripwire for the `@lucide/svelte`
    range, run and reported by name.
  - A bounded dev-server proof against Vite 8.3.0's narrowed `node_modules` path matching, which the
    showcase's `file:../..` resolution sits closest to: start
    `npm --prefix examples/showcase run dev` in the background, poll the printed URL until it
    answers, load one `/admin` route and one public route, then kill the process and report both
    responses. Follow it with the e2e smoke.
  - `@codemirror/view` and `@codemirror/state`: the survey could not verify the range from a
    changelog. Read the installed `node_modules/@codemirror/*/CHANGELOG.md` **after** the bump and
    report what it says. This is the one package pair the survey left unconfirmed rather than
    cleared, and the report says so either way.
- **The refactor decision.** For every capability the bumped ranges add, source
  `docs/internal/record/2026-09-13-minor-bump-features.md`, name the code that hand-rolls it and rule
  take-now or file. The report carries this as a table, one row per survey capability, with a ruling
  in every row. Two rows are ruled by this plan:
  - **Take now:** Svelte 5.57's `defaultValue` on the role `<select>` at
    `src/lib/components/ManageEditors.svelte:169-174`, which today hand-rolls the default through
    `selected={entry.role === 'editor'}` inside the `#each`. Re-verify the anchor, make the change,
    and cover it with its component test. It is a small change inside this task, not a task of its
    own.
  - **File:** the `@clack/prompts` 1.8.0 async-`validate` rewrite of
    `packages/create-cairn-site/src/cloudflare/prefill.mjs:265-289`. It is a CLI behavior change
    with a retry-cap caveat, so it goes to `ROADMAP.md` for the next scaffolder pass through Task 4,
    not into this sweep.
  Every other survey capability is ruled in the table with its reason.
- **A `Consumers must:` line is required for the packaged admin sheet.** No peer range moves and no
  engine API changes, but the compiled `cairn-admin.css` and the bundled Lucide icons move with
  daisyUI 5.7.20 to 5.7.37 and `@lucide/svelte` 1.33 to 1.46, which change checkbox, badge, and
  `loading-sm` rendering. The entry ends
  `Consumers must: regenerate any visual baselines that capture admin screens after upgrading.`
  with the matching bullet in `docs/extend/migration-notes.md`'s `## Unreleased`.

**Steps:**
- [ ] **Step 1:** declare `INTENDED MOVES:` first (every admin baseline, since the daisyUI bump moves
  the nav badge on each; plus the sheet-inventory fixture if the survey's class changes reach it),
  then run `npm outdated --workspaces --include-workspace-root && npm audit` at the
  engine root, and `npm outdated && npm audit` in `examples/showcase`. The root form is what reaches
  the `packages/create-cairn-site` workspace, whose runtime `@clack/prompts ^1.7.0` a bare root
  `npm outdated` never reports. Paste every set of output into the report before any edit, and
  classify every line as minor/patch (taken), major (held, named with its family), or already
  satisfied by an existing caret range.
- [ ] **Step 2:** skim the release notes for every package newer than the survey's stated target, per
  the decision above, and report one line each.
- [ ] **Step 3:** rewrite every `dependencies` and `devDependencies` caret range in the three
  manifests to `^<newest non-major>`, leaving `peerDependencies` untouched, then run the non-major
  `npm audit fix` at both roots. Reinstall from scratch in exactly this order:
  `rm -rf node_modules examples/showcase/node_modules package-lock.json examples/showcase/package-lock.json`,
  then `npm install` at the root (its `prepare` runs `npm run package`, and `packages/*` are root
  workspaces that need no separate install), then `npm --prefix examples/showcase install`. Never
  `npm ci`, which has no lockfile to read. Report the resolved version of every package that moved
  at both roots.
- [ ] **Step 4:** diff both regenerated lockfiles against their pre-sweep copies and report every
  resolved-version change, manifest edited or not. This delta is where the pass's real risk lives:
  daisyUI, svelte, and every other caret-satisfied package move here with no manifest line to notice,
  and `check-target-stack.mjs` cannot see any of it. Step 5's named verifications are selected from
  this delta, not from `npm outdated`.
- [ ] **Step 5:** run the five named verifications above and report each by name with its result.
- [ ] **Step 6:** rule the refactor decision. Produce the table, make the one take-now change with
  its component test, and name the filed item for Task 4.
- [ ] **Step 7:** reconcile `docs/reference/supported-toolchain.md` against the new declared ranges,
  cell by cell, until `check:target-stack` is green. Re-emit the template if a showcase dependency it
  carries moved, and prove it with `check:template`.
- [ ] **Step 8:** produce `MOVED BASELINES:` from an unmodified suite run against the step 1 declaration,
  regenerate only those files by path with the mode pinned, and account for any
  `admin-sheet-inventory.txt` diff line.
- [ ] **Step 9:** append the `CHANGELOG.md` entry and its `docs/extend/migration-notes.md` bullet.
  Run the full gate. Commit.

**Acceptance criteria:**
- `npm outdated` across all three sets leaves no row whose `Wanted` differs from `Current`. Every
  remaining row is a held major, and the report names each with its peer blocker: `typescript` 7
  (svelte-check, typescript-eslint), `@types/node` 26 (Node 24 runtime), and the Vitest 5 family
  `vitest`, `@vitest/browser`, `@vitest/browser-playwright`
  (`@cloudflare/vitest-pool-workers` pins `^4.1`).
- The report classifies all three sets, the engine root, the `packages/*` workspaces, and the
  showcase, and names `@clack/prompts`'s resolved version among them.
- `npm audit` at both roots reports no non-major fix outstanding.
- Every rewritten caret range is in the diff, no `peerDependencies` range moved, and both lockfiles
  are in the diff. The report carries the command sequence that produced them
  (`rm -rf node_modules examples/showcase/node_modules package-lock.json examples/showcase/package-lock.json`,
  then the root `npm install`, then the showcase install) together with the resolved version of every
  package that moved.
- The report's before-and-after version table is the lockfile delta from step 4, not the
  `npm outdated` list.
- All five named verifications are reported by name, with the CodeMirror changelog read stated as
  confirmed or still unconfirmed.
- The report carries the refactor-decision table with every survey capability ruled. The
  `ManageEditors` role `<select>` uses `defaultValue` and its component test covers the default.
- `check:target-stack` is green, and every cell it derives matches the declared range in its source
  file (`package.json`, `examples/showcase/package.json`, `examples/showcase/wrangler.jsonc`).
- Any `admin-sheet-inventory.txt` line added or dropped is named with the daisyUI release that caused
  it, or the fixture is unchanged.
- No file under `src/lib` other than `ManageEditors.svelte` is in the diff, and
  `docs/internal/api-surface.md` is not.
- The `CHANGELOG.md` entry names the toolchain movement and ends
  `Consumers must: regenerate any visual baselines that capture admin screens after upgrading.`, with
  the matching `docs/extend/migration-notes.md` bullet.
- Every moved baseline is in the task's declared `INTENDED MOVES:` list, and no baseline outside that
  list plus the latest regen commit's own set moved.
- The full gate exits 0, the e2e included.

**Commit:** one, `chore(deps): take every minor and patch across all three manifests before the cut`.

---

## Task 2: The pagination cue and the destructive confirms

**Deliverables: three** (four if the pre-dispatch grep found a live `transition-all`; see the
Reconciliation block).

**Outcome:** a low-vision or colorblind editor can see which page they are on without relying on
hue, and a stray backdrop click can no longer dismiss either destructive confirm.

**The failing gate first:** three new assertions in the existing component suites. In
`src/tests/component/Pagination.test.ts`, beside `marks the current page with aria-current and
disables Previous at the first page`, an assertion that the current page renders the check glyph and
that the button's accessible name still computes to `Page N`. In
`src/tests/component/DeleteDialog.test.ts`, an assertion that the dialog renders no
`form[method="dialog"].modal-backdrop`. In `src/tests/component/EditPage.test.ts`, the same
assertion for the discard confirm plus its `role="alertdialog"`. All three are written first and
watched fail. No existing test asserts either backdrop
(`grep backdrop src/tests/component/DeleteDialog.test.ts` is empty), so the red-first rests entirely
on the new assertions, which is correct.

**Files:**
- Modify: `src/lib/admin-toolkit/Pagination.svelte` (the page button at `:102-105`),
  `src/lib/components/DeleteDialog.svelte` (the backdrop form at `:112`),
  `src/lib/components/EditPage.svelte` (the discard confirm at `:2539-2558`, its backdrop form at
  `:2556`), `src/tests/component/Pagination.test.ts`, `src/tests/component/DeleteDialog.test.ts`,
  `src/tests/component/EditPage.test.ts`, `docs/internal/admin-design-system.md`,
  `docs/reference/components.md`, `CHANGELOG.md`
- Modify, the declared baselines: `examples/showcase/e2e/admin-visual.spec.ts-snapshots/admin-office-light.png`
  and `admin-office-dark.png`, per the measured baseline fact and global constraint 13
- Possibly modify: `src/tests/unit/fixtures/admin-sheet-inventory.txt`, only on the branch where a
  new utility is unavoidable; see the decision below
- Out of scope: `src/lib/admin-toolkit/AdminTable.svelte` and its call sites, which are Task 3's.

**Interfaces:** none. No change here adds, removes, or renames a prop, so
`docs/internal/api-surface.md` stays out of the diff.

**Decisions the plan makes:**

- **The cue is `ListToolbar`'s own check glyph, and the design system is the authority.**
  `docs/internal/admin-design-system.md:603-614` already rules the form: "on light the check glyph IS
  the state cue, full stop", "the check glyph is the caller's job", and `Pagination` named as "the one
  caller that renders no glyph at all", a known exception out of conformance on light. So the cue is
  `<CheckIcon class="h-3 w-3" aria-hidden="true" />`, imported from `../components/admin-icons.js`
  and placed before the page number the way `ListToolbar.svelte:295` places it. The implementer does
  not pick a mark, because picking one splits the register across the three join-style pickers. A
  focus-style ring is not a valid answer: measured at 1.06:1 to 1.31:1 on light
  (`admin-design-system.md:609-612`), it satisfies a literal reading of "non-color" and fails in use.
- **The cue adds no class to the sheet.** `h-3` and `w-3` are already in the shipped inventory
  (`src/tests/unit/fixtures/admin-sheet-inventory.txt`, lines 280 and 817), and the component has its
  own scoped `<style>` at `Pagination.svelte:124` for anything else.
  `scripts/checks/check-admin-css-classes.mjs:1-8` passes any class the component's own scoped style
  defines, so it is not the gate that reds on a new utility; the inventory fixture under `npm test`
  is. If a new utility proves unavoidable, the task runs `npm run update-admin-sheet-inventory`,
  accounts for every fixture diff line, names the class in its `CHANGELOG.md` entry, and adds the
  fixture to its own diff.
- **The cue is static, so the motion rules and the contrast pairs are unaffected.** Recorded here so
  no implementer reaches for a transition or a pulse the motion pass's freshly landed static rules
  would flag: `reduced-motion.ts` and `motion-band.ts` do not apply to a static glyph, and the glyph
  inherits the button's own foreground, so it introduces no new contrast pair. Task 2 still hand runs
  `check:interactive-contrast` and `check:touch-targets` over the cluster and reports both.
- **The cue is not announced twice.** The button already carries `aria-current="page"` and an
  `aria-label`, so the glyph is `aria-hidden="true"` and the accessible name stays `Page N`.
- **Two dialogs are destructive, and both lose the backdrop form.** `DeleteDialog.svelte:112` and
  `EditPage`'s discard confirm (`EditPage.svelte:2556`, which its own comment at `:366` calls "on the
  DeleteDialog pattern", and whose copy reads "This restores the live version. The changes cannot be
  recovered."). The discard confirm also takes `role="alertdialog"`, which it lacks today. The design
  system already rules it at `docs/internal/admin-design-system.md:501-503` ("Light dismiss on the
  backdrop is for a non-destructive dialog; a destructive `alertdialog` keeps an explicit confirm and
  does not light-dismiss") and the media safe-delete at `:937-942` already complies. Shipping the
  rule on one of the two would hand the pass-end `daisyui-a11y-reviewer` a finding on the same rule.
- **The other ten dialogs stay.** Every remaining component carrying the same backdrop form is
  non-destructive, which the design system's rule permits. `modal-backdrop` therefore stays in the
  sheet inventory (fixture line 456) through those call sites, and the dim survives on both changed
  dialogs because daisyUI paints it on `.modal[open]` while `.modal-backdrop` is transparent. Escape
  and the focus trap come from `showModal()` and are untouched, so both dialogs stay dismissable by
  keyboard.
- **The design system's Dialog bullet gains the exception it is missing.** `:490` states the
  `method="dialog"` backdrop as part of the generic recipe with no carve-out, while `:501-503` carves
  one. One clause on the earlier bullet, pointing at the later rule, removes the conflict a reader
  would otherwise resolve wrongly.
- **The pagination known-exception sentence is retired.** `admin-design-system.md:612-614` declares
  `Pagination` a filed exception. Once the cue ships, that sentence is wrong, so this task removes it
  in the same commit.
- **No `Consumers must:` line.** `DeleteDialog` is an Unstable API tier component, `EditPage`'s
  discard confirm is engine-internal, and both changes remove an accidental dismissal path rather
  than a documented one. The entry names the behavior change plainly and ends
  `Consumers must: nothing`.

**Docs this task touches:** `docs/internal/admin-design-system.md` (the pagination recipe gains the
cue, `:612-614`'s known-exception sentence is retired, and the Dialog bullet at `:490` gains the
light-dismiss exception) and `docs/reference/components.md` (one sentence each in the `DeleteDialog`
and `EditPage` sections saying the destructive confirm does not light-dismiss).

**Steps:**
- [ ] **Step 1:** re-grep all four anchors (the two page buttons, the two backdrop forms) and report
  the measured lines beside this plan's. Declare `INTENDED MOVES:`.
- [ ] **Step 2:** write all three assertions, run them, report all three failures.
- [ ] **Step 3:** make them green. Report the rendered cue, its `aria-hidden`, and the computed
  accessible name of the current-page button.
- [ ] **Step 4:** hand run `check:interactive-contrast` and `check:touch-targets` over the pagination
  cluster and report both.
- [ ] **Step 5:** produce `MOVED BASELINES:` from an unmodified suite run, regenerate only those
  files by path with the mode pinned, and account for any inventory fixture diff.
- [ ] **Step 6:** update the two docs pages and append the `CHANGELOG.md` entry. Run the full gate.
  Commit.

**Acceptance criteria:**
- All three new assertions exist, and the report carries the failing output from before the fix.
- The `Pagination` assertion proves the current-page button renders the check glyph in its content,
  that the glyph carries `aria-hidden="true"`, and that the button's accessible name still computes
  to `Page N`. The report states the glyph and that it is distinguishable without hue.
- `grep -n "modal-backdrop" src/lib/components/DeleteDialog.svelte` returns nothing, and the
  `EditPage` discard confirm carries no `modal-backdrop` and does carry `role="alertdialog"`.
- No other component's `modal-backdrop` is in the diff.
- `docs/internal/admin-design-system.md`'s Dialog bullet carries the light-dismiss exception, and its
  pagination known-exception sentence is gone.
- `grep -rn "transition-all" src/lib` returns nothing. If the pre-dispatch grep found a hit, the
  flash strip at `EditPage.svelte` now names only the properties it animates, an assertion in
  `src/tests/component/EditPage.test.ts` covers the class list, and the report carries the failing
  output from before the fix.
- `docs/internal/api-surface.md` is not in the diff.
- Every moved baseline is in the task's declared `INTENDED MOVES:` list, and no baseline outside that
  list plus the latest regen commit's own set moved.
- The full gate exits 0.

**Commit:** one, `fix(admin): give the current page a non-color cue and stop the destructive confirms light-dismissing`.

---

## Task 3: The table's accessible name

**Deliverables: three.** The optional prop, every engine call site passing one, and the reference
page matching.

**Outcome:** a screen-reader user landing in any admin list hears the table's subject instead of
"table".

**The failing gate first:** an assertion in `src/tests/component/AdminTable.test.ts`, beside
`renders the wrapper with the horizontal-scroll fallback`, that the rendered `<table>` carries an
accessible name when the prop is passed and none when it is omitted. Written first, watched fail.

**Files:**
- Modify: `src/lib/admin-toolkit/AdminTable.svelte` (`interface Props` at `:33`, the destructure at
  `:54`, the `<table>` at `:60`), `src/tests/component/AdminTable.test.ts`,
  `src/lib/components/ManageEditors.svelte:98`, `src/lib/components/CairnHistory.svelte:89`,
  `src/lib/components/ConceptList.svelte:366`, `src/lib/components/CairnMediaLibrary.svelte:823`,
  `src/lib/reproductions/stories/CustomScreen.svelte:18`,
  `examples/showcase/src/routes/admin/signups/+page.svelte:102`,
  `docs/reference/admin-toolkit.md`, `docs/extend/add-a-custom-admin-screen.md`, `CHANGELOG.md`
- Possibly modify: `docs/internal/api-surface.md`, only if the regenerated snapshot actually moves;
  see step 6
- Re-emitted, never hand-edited: `templates/waymark/src/routes/admin/signups/+page.svelte`, through
  `npm run emit:template`.

**Interfaces:** `AdminTable` gains one optional prop, a published contract change. The surface
snapshot is regenerated in this commit per global constraint 7, and is expected not to move.

**Decisions the plan makes:**

- **The prop is `tableLabel?: string`, rendered as the table's `aria-label`.** The toolkit prefixes
  an assistive-technology-only name (`ListToolbar.svelte:130` `searchLabel`,
  `ExpandableRow.svelte:99` `triggerLabel`) and reserves bare `label` for visible text
  (`StatusChip.svelte:64,102`, rendered inside `.status-chip-label`). A bare `AdminTable.label` would
  read as a visible caption, and this is a published prop name landing one commit before a publish.
  An `aria`-prefixed prop name is not used, because the toolkit exposes none today.
- **Three naming mechanisms were weighed, and `aria-label` is the one left.** `<caption>` (WCAG
  H39) is declined because every engine call site already renders the subject as the screen's own
  `h1`, so a visible caption duplicates it. `aria-labelledby` is declined because a custom screen
  need not render a heading the toolkit primitive could point at, even though the repo does hardcode
  one elsewhere (`DeleteDialog.svelte:71`). `aria-label` is the remaining mechanism, and the table
  role supports it.
- **Omitting it leaves the table exactly as it is today.** The prop is optional, so no existing
  consumer call site breaks and no doc fence goes red under `check:snippets`.
- **Every engine call site passes the screen's own subject noun**, five in `src/lib` plus the
  showcase's signups screen. A name that merely repeats the page heading verbatim is still correct
  here; the subject is what a screen-reader user is missing.
- **No `Consumers must:` line.** The prop is additive and optional. The entry says plainly that a
  consumer's own table should pass one, which is a recommendation, not a required action, so no
  `docs/extend/migration-notes.md` bullet is added.

**Docs this task touches:** `docs/reference/admin-toolkit.md` (the `### AdminTable` props block at
`:336-352`, the prose, and both `<AdminTable>` fences at `:374` and `:801`) and
`docs/extend/add-a-custom-admin-screen.md`, **both** `<AdminTable>` fences (`:110` and `:348` on
`f1c72dbf`), re-located at dispatch because polish-C's `OfficeList` retirement rewrites that page.
`src/lib/reproductions/stories/CustomScreen.svelte:18` mirrors the first fence and is kept
consistent with it.

**Steps:**
- [ ] **Step 1:** re-grep the component anchors and the seven call sites, and report the measured
  lines beside this plan's. Re-locate both extend-page fences, which polish-C may have moved.
- [ ] **Step 2:** write the assertion, run it, report the failure.
- [ ] **Step 3:** add the prop and make it green.
- [ ] **Step 4:** pass a name at every engine call site and the showcase's, then
  `npm run emit:template` and prove it with `check:template`.
- [ ] **Step 5:** update the reference props block, the prose, both reference fences, and both
  extend-page fences.
- [ ] **Step 6:** run `npm run package && node scripts/checks/check-surface.mjs --update` and report
  whether the snapshot changed. The snapshot records a component as `Component<Props, {}, "">`
  (`docs/internal/api-surface.md:119`), so an added optional prop is expected to leave it
  byte-identical; commit it only if it moved. Append the `CHANGELOG.md` entry. Run the full gate.
  Commit.

**Acceptance criteria:**
- The prop is named `tableLabel`, is optional, and the assertion covers both the passed and the
  omitted case.
- Every `<AdminTable>` in `src/lib` and `examples/showcase` passes a name, verified by grep, with
  the count reported.
- No `templates/waymark` path is a hand edit, and `check:template` is green.
- `docs/reference/admin-toolkit.md`'s props block and both its fences match the component, and both
  extend-page fences pass a name. No gate reads any of them: component props are outside
  `scripts/checks/check-reference-signatures.mjs`, which renders signatures for function and
  const-function exports only, and `scripts/checks/check-snippets.mjs:24-25` silently excludes a
  markup-only ```svelte fence. So this is a report-and-review criterion, and
  `node scripts/checks/check-reference-signatures.mjs` and `node scripts/checks/check-snippets.mjs`,
  the forms the gate runs, still exit 0.
- `node scripts/checks/check-surface.mjs --update` was run and its result reported; the plain
  `check:surface` passes.
- The task touched no rendered surface, and `git status` shows no file changed under
  `examples/showcase/e2e/*.spec.ts-snapshots/`, reported as `MOVED BASELINES: none`.
- The full gate exits 0.

**Commit:** one, `feat(admin-toolkit): give AdminTable an optional accessible name`.

---

## Task 4: Records (last)

**Deliverables: four.** The changelog window reconciled, the held majors recorded with their
triggers, the deferred survey items filed, and the friction log triaged.

**The failing gate first: none is available.** This task changes no code, and its work is a read plus
three doc files. `check:docs`, `check:vale`, and `check:rulings-format` are the gates that prove its
edits. Step 1's reconciliation is reported as a finding list, not as a red.

**Files:**
- Modify: `CHANGELOG.md`, `ROADMAP.md`, `docs/internal/docs-friction-log.md` (only if it needs a
  change)
- Create: `docs/internal/record/2026-09-14-pre-cut-window.md`, the pass's own record, carrying the
  sweep's before-and-after version table (the lockfile delta), the three held major families with
  peer blockers and re-check triggers, the refactor-decision table, and the deferred survey items
  with their reasons.
- Out of scope: `docs/STATUS.md` (the conductor's), `docs/HISTORY.md` (written at the pass close by
  the conductor's records agent, not by a task).

**Interfaces:** none. This task changes no code.

**Decisions the plan makes:**

- **The held majors' home is the new record, and `ROADMAP.md` carries the three tripwires.** The
  memory says to record blocked majors "in the release checklist" and re-check them at the next cut;
  the `cairn-release` skill carries no checklist file, so the record is the checklist and the cut
  reads it. Each of the three tripwires (svelte-check accepting `typescript ^7` together with
  typescript-eslint lifting its `<6.1` cap; `@cloudflare/vitest-pool-workers` declaring `vitest ^5`,
  which unblocks the whole Vitest 5 family; Node 26 reaching LTS) is filed as a ROADMAP line naming
  its trigger, since the scheduled routines that watch them are held for after the release.
- **Deferred from the survey, each with its reason.** These are the survey's own code-change
  candidates that its text does not mark accepted or trivially safe, so none is in this pass:
  - **The `@clack/prompts` 1.8.0 async-validate rewrite of the Cloudflare token prompt**
    (`packages/create-cairn-site/src/cloudflare/prefill.mjs:265-289`). Task 1's refactor decision
    ruled it filed. The survey calls it "a possible simplification, not a drop-in win" and names a
    caveat: cairn caps the retry at exactly one, which the async form needs an explicit counter to
    preserve. It is a CLI behavior change, not a bump. Filed as a `ROADMAP.md` line for the next
    scaffolder pass.
  - **The nav `<details>` groups moving to daisyUI `collapse`/`accordion`.** The survey's own words:
    "worth a future small pass, unrelated to this version range", and a consumer that scoped-overrode
    `.cairn-caret` would need a `Consumers must:` line. Filed to ROADMAP beside the borrow-1 work.
  - **The daisyUI `aria-checked="mixed"` mirror on `src/lib/components/MediaOrphanTools.svelte:55-79`.**
    The survey states the DOM-property approach still works and this is "not a code deletion today".
    Filed as a `ROADMAP.md` Someday line naming the component and the trigger (the next pass that
    touches `MediaOrphanTools`), since this task changes no code and a co-located `// WATCH:` comment
    would put a `src/lib` file in its diff.
  - **The two Carbon defaults Geoff routed to borrow-1**, the tooltip primitive that retires
    `cairn-btn-guarded` and batch actions graduating onto `AdminTable`. Already in `ROADMAP.md`'s
    Next entry; this task confirms the entry still names them and leaves them there.
  - The survey's top-five items 2, 3, 4, and 5 are **not deferrals**. They are verification or
    awareness, and Task 1 discharged them; the record states their outcome.
- **The `ROADMAP.md` Next entry closes for what this pass shipped.** Its five-defaults bullet
  (`:896-914`) is rewritten to its borrow-1 remainder, since a pass that ships a roadmap item is not
  done until the roadmap stops listing it. The same bullet also carries two standing survey calls
  this pass did not reopen, "sign in" over Carbon's "log in" and the Carbon Charts rejection with its
  Chart-guidance-only note; both stay verbatim.
- **The second live entry for the pagination defect closes too.** `ROADMAP.md:1422-1431` ("Three
  design-system gaps found in the same triage") independently names `Pagination`'s fill-alone state
  and asks for the non-color cue. Its `Pagination` half is dropped; the legend-padding and
  variant-selected halves stay.
- **The flash-strip item is recorded, whichever pass shipped it.** The record states which pass
  landed the `EditPage` `transition-all` fix, the motion pass's Task 6a or this pass's Task 2, and
  `ROADMAP.md` stops listing it among the accepted defaults.
- **The friction log is verified, not appended to.** It reads "None open" today. If this pass
  surfaced no friction, the task says so in its report and leaves the file untouched, which is the
  correct triage outcome rather than a missing step.
- **No `Consumers must:` line of its own**, and the whole `## Unreleased` window is confirmed to
  carry every line the earlier passes owed it, plus Task 1's admin-sheet line, unchanged by this
  task.

**Steps:**
- [ ] **Step 1:** read this pass's three entries under `## Unreleased` against this plan's per-task
  consumer-line rulings (Task 1 carries one, Tasks 2 and 3 do not), and report each as matching or
  not. Confirm Task 1's `docs/extend/migration-notes.md` bullet is present.
- [ ] **Step 2:** write `docs/internal/record/2026-09-14-pre-cut-window.md`.
- [ ] **Step 3:** rewrite the `ROADMAP.md` Next bullet to its borrow-1 remainder, keeping the two
  standing survey calls verbatim; rewrite `ROADMAP.md:1422-1431` to drop its `Pagination` half; and
  file the three tripwires and every deferred item into the tier where each bites, with the
  `aria-checked="mixed"` mirror as a Someday line.
- [ ] **Step 4:** verify the friction log, and report the outcome whether or not the file changes.
- [ ] **Step 5:** append this task's own `CHANGELOG.md` entry (records only, no consumer action).
  Run the full gate. Commit.

**Acceptance criteria:**
- The report lists each of this pass's changelog entries and confirms its consumer line against the
  plan, including Task 1's line and its migration-notes bullet.
- The record names all three held major families with peer blockers and re-check triggers, carries
  the sweep's before-and-after table from the lockfile delta, and carries the refactor-decision
  table.
- The record states which pass shipped the flash-strip `transition-all` fix, and `ROADMAP.md` no
  longer lists it among the accepted defaults.
- `ROADMAP.md` no longer lists the three defaults this pass shipped, in either the five-defaults
  bullet or the `:1422-1431` entry, still carries the two standing survey calls verbatim, and does
  list the three tripwires and every deferred survey item with its reason.
- The friction log's state is reported either way.
- No file under `src/lib`, `examples/`, or `templates/` is in the diff, and
  `docs/internal/api-surface.md` is not. `git status` shows no baseline changed, reported as
  `MOVED BASELINES: none`.
- `check:docs`, `check:vale`, and `check:rulings-format` are green, and the full gate exits 0.

**Commit:** one, `docs(records): record the pre-cut window, the held majors, and the deferred survey items`.

---

## Pass-end ritual

1. **The full gate** above, green, in one uninterrupted run.
2. **`code-simplifier`** over the code Tasks 1, 2, and 3 changed, after their commits. Apply its
   refinements as one follow-up commit, then re-run the gate.
3. **The reviewer fan-out, two:** `daisyui-a11y-reviewer` on the pagination cue, the two removed
   backdrops, and the table name, the set being an accessibility change in daisyUI markup; and
   `svelte-reviewer` on the `AdminTable` prop, its seven call sites, and the `ManageEditors`
   `defaultValue` change. `web-auth-security-reviewer` and `cloudflare-workers-reviewer` are not
   dispatched, because no auth, route, or Worker code is in this pass's diff.
4. **CI green on `main`**, including `scaffold.yml` and `create-site.yml` against the packed
   tarballs, which is where a template dependency bump from Task 1 would surface.
5. **The canonical baseline regen.** Dispatch `e2e.yml`'s `update_snapshots` on `main`, which pushes
   its `chore(e2e): regenerate…` commit directly to the branch (`e2e.yml:127-141`). The conductor
   reads that diff before the cut, against the two paint tasks' own declared move lists and against
   the motion pass's sixty new surfaces. A file in the regen diff that no task declared and no
   renderer difference explains stops the cut.
6. **`CHANGELOG.md`'s `## Unreleased`** carries this pass's three entries, one of them with a
   `Consumers must:` line, and is otherwise unchanged. The heading is not renamed; the cut does that.
7. **`docs/STATUS.md`** written by the conductor, naming the cut as the next action.
8. **`docs/HISTORY.md`** gains this pass's entry, written by the conductor's records agent.
9. **No version bump, no tag, no publish inside this pass.** The conductor then invokes
   `cairn-release` as a separate act, verifies `0.97.0` is free with
   `npm view @glw907/cairn-cms versions --json`, and re-derives the size at the cut on the skill's
   own rule.

---

## What this pass hands forward

- **To the cut:** a `main` whose declared ranges and lockfiles are the newest production versions
  available without a major, whose `## Unreleased` window is reconciled, whose baselines were
  regenerated on the canonical renderer after the toolchain moved, and whose held majors are recorded
  where the next cut will re-check them.
- **To borrow-1:** the two Carbon defaults that reshape a pattern, still filed, plus the nav
  `collapse` adoption the survey found.
- **To the next scaffolder pass:** the `@clack/prompts` async-validate rewrite of the Cloudflare
  token prompt, filed with its retry-cap caveat.
- **To the post-release chores:** three tripwires filed with their triggers, ready for the
  `schedule` skill.

---

## Sources

- `docs/internal/record/2026-09-13-minor-bump-features.md`, the changelog survey (read in full).
- `docs/internal/record/2026-09-13-carbon-patterns-survey.md`, Parts 5b and 5c.
- `docs/internal/record/2026-09-13-blueprint-audit.md`, "DEFECTS TO FIX BEFORE THE RELEASE".
- `docs/superpowers/plans/2026-09-08-polish-c-pass.md`, its header, Token ceiling, Global
  constraints, Task 13, Gate, and Pass-end ritual.
- `docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md`, its header, Token ceiling,
  Execution, the intended-moves protocol at `:605-607` and `:641-663`, and Task 6a at `:1300`.
- `docs/STATUS.md`, the next-action block naming this pass and the `0.97.0` cut.
- `ROADMAP.md`, the Next tier's five-defaults entry at `:896-914` and the triage entry at
  `:1422-1431`.
- `docs/reference/supported-toolchain.md`, the target-stack table and its "How often it moves"
  column.
- `docs/reference/admin-toolkit.md` and `docs/reference/components.md`, the `AdminTable`,
  `DeleteDialog`, and `EditPage` sections.
- `docs/internal/admin-design-system.md`, the Dialog recipe at `:490`, the light-dismiss rule at
  `:501-503`, the pagination ruling at `:603-614`, and the media safe-delete at `:937-942`.
- `docs/internal/docs-friction-log.md`, its header rules and "Live findings".
- `docs/internal/api-surface.md:119`, the opaque component form.
- `scripts/checks/check-target-stack.mjs:63-81`, `scripts/checks/check-surface.mjs:22`,
  `scripts/checks/check-reference-signatures.mjs:1-13`, `scripts/checks/check-snippets.mjs:24-25`,
  `scripts/checks/check-admin-css-classes.mjs:1-8`.
- `src/tests/unit/admin-sheet-inventory.test.ts` and
  `src/tests/unit/fixtures/admin-sheet-inventory.txt`.
- `examples/showcase/e2e/admin-visual.spec.ts`, `examples/showcase/src/theme/cairn.config.ts:66`,
  and `examples/showcase/src/content/posts` (27 entries), the measured pagination-baseline fact.
- `.github/workflows/e2e.yml:127-141`, the `update_snapshots` regen job.
- `package.json`, `examples/showcase/package.json`, and `packages/create-cairn-site/package.json`,
  the scripts and all three dependency sets.
- `/var/home/glw907/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/release-deps-newest-production.md`.
- `/var/home/glw907/.claude/skills/cairn-release/SKILL.md`, checked for a release-checklist file.
- `CLAUDE.md` (repo) and `~/.claude/CLAUDE.md`, the pass, gate-economy, and records conventions.
