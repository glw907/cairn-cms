# Pre-Cut Pass Implementation Plan (the dependency sweep, two guidance hardening fixes, the site upgrade brief's tools section, the Blueprint audit, and the `0.97.0` cut)

> **For agentic workers:** six deliverable units across five plan tasks plus the cut. Execution is
> a per-task chain (`cairn-implementer`, then `diff-reviewer`, then the gate), dispatched one task
> at a time with the Agent tool. Below six implementer-driven tasks, so no workflow runner. Task 4
> runs in the conductor's own turns, and Task 6 is the release skill, not an implementer dispatch.
> **Tasks run strictly serially, 1 through 6, in the one `pre-cut` worktree.** Nothing shares that
> worktree with a live task: Task 1 deletes `node_modules` and both lockfiles, so any concurrent
> task would build against a half-installed tree. Every `file:line` below was verified against the
> tree at `e2615a08`; re-verify at dispatch.

**Date:** 2026-09-21.

**Supersedes:** `docs/superpowers/plans/2026-09-14-pre-cut-window-pass.md`. That plan was written,
approved, and never executed: `docs/HISTORY.md` carries no entry for it, the last commit touching
`package-lock.json` is `c2290d69` (2026-09-07), and the root manifest still declares
`svelte: ^5.56.10`, the version its own survey ruled should move to 5.57.0. Its dependency-sweep
task returns here as Task 1; its three accepted admin defaults do not return, because extend-1,
extend-2, and the admin motion pass have all landed since, and re-deriving what remains of those
three is not this pass's job.

## Header

| Field | Value |
| --- | --- |
| **Token ceiling** | **2.5M**. The 80 percent decision point is **2.0M**. |
| **Checkpoint interval** | Four tasks. One scheduled checkpoint after Task 4, one STATUS write after Task 1 (the lockfile reinstall is the pass's only irreversible step). |
| **Execution mode** | Per-task chain via the Agent tool (`cairn-implementer`, then `diff-reviewer`), below six tasks. No `pass-execute.js`. **Serial, one task at a time.** |
| **Worktree** | `pre-cut`, branch `pre-cut`, off `origin/main`, at `.claude/worktrees/pre-cut`. No task touches the main checkout or any other worktree. |
| **Merge** | By PR. Before the PR, `git merge origin/main` into `pre-cut`: another session pushes a STATUS update to `main` overnight and may merge PR #68, so `main` will have moved. Resolve, re-gate, then open the PR and merge on green CI. |
| **Segment boundaries** | After Task 1 (irreversible), after Task 3 (Files seam: Tasks 4 through 6 touch no source), and at Task 5's merge. |

## Before each dispatch: the live-executor sweep

Carried forward from the superseded plan. Run before every dispatch, not once at pass start:

1. `git -C <path> status --porcelain` is empty for every entry `git worktree list` reports, except
   `pre-cut` itself and the Go tool's `cairn-tool-b2`, which is a separate module with no npm
   lockfile and cannot collide with this pass's installs.
2. `pgrep -f .claude/worktrees/pre-cut` returns nothing. A live executor in this worktree stops the
   pass (workstation rule, one executor per worktree).
3. Warm uncommitted code in `pre-cut` that this pass did not author is stop-and-investigate, never
   free progress.

## Unattended-work guards (armed by the conductor before Task 1)

Per `~/.claude/docs/unattended-work-guards.md`, read before arming either. This pass runs several
full gates carrying the showcase e2e, so all three are armed and recorded here as a fact of the
run:

- **Sleep inhibitors** under the tag `cairn-pre-cut` (`systemd-inhibit --what=sleep`), armed
  unconditionally rather than only on battery: the kernel can report the charger offline while it
  charges, and GNOME then suspends on the battery rule.
- **A battery watchdog**, per the same doc.
- **A `/loop` heartbeat**, so a stalled dispatch surfaces rather than burning the window silently.

Release the inhibitors at pass close, or at a battery stand-down.

## The owner's rulings (Geoff, 2026-09-20)

These four are settled. No task re-opens any of them, and no agent asks about them.

1. **Publish `0.97.0` only if every cut gate is green.** If any cut gate is red, stop with the
   release staged and the notes written; do not publish, do not tag.
2. **Majors stay held.** TypeScript 7, Vitest 5, and `@types/node` 26 are held. Any *new* major the
   sweep finds is filed with its unblock trigger, never taken.
3. **Refactor decisions default to "file".** Nothing that changes behavior is taken overnight. A
   survey item is ruled "take now" only when it is a zero-behavior-change change with an existing
   test already covering it.
4. **Two cairn-guidance hardening fixes ride along**, from `ROADMAP.md`'s Next-tier
   `cairn-guidance install` write-hardening entry (`ROADMAP.md:845-861`): item (3), carry `err.code`
   out of the write's `catch` so a disk error is not reported as a refusal; and item (6), list a
   refused destination itself in the install report. The other four items in that entry stay filed.

**The scope of rulings 3 and 4.** Ruling 3 governs survey and audit findings, which is Tasks 1 and
4. Ruling 4 is its only exception, and it is bounded to `ROADMAP.md` items (3) and (6) of the
`cairn-guidance install` write-hardening entry. No other behavior-changing work enters this pass
under either ruling.

## Halts

Stop and write STATUS, then ask one combined question, on any of the pass-wide halts below. Each
task that can trip a halt also carries its own halt line, in the task.

- The sweep needing more than one fix round.
- Any red gate.
- A reviewer hedge on the release notes. **A hedge is a halt, and no publish fires.**
- A visual baseline move not explained by a bumped renderer.
- The `cairn-release` skill deriving any number other than `0.97.0` (see Task 6).
- A partial publish (see below).
- Battery at 11 percent or below outside the unsafe window (see below).

Everything else runs to completion with no check-in.

### The partial-publish playbook

`publish.yml` publishes `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` in two separate jobs that
can fail apart; `0.95.0` is the cut that proved it, publishing the engine while the dev backend
failed provenance validation. If one job lands and the other does not:

- **Never bump the version to retry.** The `cairn-release` skill states this directly: "Do not bump
  the version again to retry; fix the config and re-run the same release's workflow"
  (`~/.claude/skills/cairn-release/SKILL.md`, section 6, "Verify the publish").
- **Never retry blindly.** Both jobs carry an already-published guard that exits 0 green, so a
  blind re-run can print success while changing nothing.
- Stop. Record which package published and at which version, and report. The fix is a decision, not
  an overnight action.

### The unsafe window and the battery stand-down

**The unsafe window runs from the version-bump push through both publish jobs reporting green.**
Nothing else in this pass is unsafe: every other task boundary is a safe stop.

Entering the unsafe window requires **either** a Mains-type power supply online **or** the battery
at 40 percent or more, **and** the sleep inhibitors still held. If neither holds, do not enter it;
leave the release staged and report.

**Battery stand-down at 11 percent, anywhere outside the unsafe window:** WIP-commit on `pre-cut`,
write the STATUS resume prompt, release the inhibitors, and stop.

## Cut gates (Task 6)

All five must be green before the publish fires. Ruling 1: if any is red, stop with the release
staged and the notes written. No publish, no tag.

1. **CI on `main` fully green at the exact SHA the release will tag.** After the cut gates, pin it:
   `SHA=$(git rev-parse origin/main)`. "Fully green" means every workflow that runs on a push to
   `main` has conclusion `success` on that SHA, checked with
   `gh run list --commit "$SHA" --json workflowName,conclusion,status`. **An absent run counts as
   red**, not as a pass. The workflows, enumerated from `.github/workflows/` and verified at
   `e2615a08`: **`test`, `e2e`, `create-site`, `scaffold`, `design`**. `norms` is not on that list
   as a workflow of its own; it carries only `workflow_call` and `workflow_dispatch`, and it runs
   as a called job inside `e2e` (and inside `publish`), so its result is read through the `e2e`
   run. `tool` runs only on `tool/**` paths and `tsgo` only on a weekly schedule; neither is
   required here, and neither counts as absent.
   **If `origin/main` moved after the gates ran, re-verify on the new SHA before tagging.** Another
   session pushes STATUS tonight and may merge PR #68, so treat a moved `main` as expected.
2. **The from-scratch consumer build**, as an outcome rather than a symlink check: in the tree
   being proved, delete `examples/showcase/node_modules` and `examples/showcase/package-lock.json`,
   install fresh, and build. `rm -rf examples/showcase/node_modules examples/showcase/package-lock.json`,
   then `npm install --prefix examples/showcase`, then `npm --prefix examples/showcase run build`.
   Local Playwright reuses a stale preview off CI, so a local "all green" alone is not this gate.
3. `npm run check:version`.
4. `npm view @glw907/cairn-cms versions --json` showing `0.97.0` free.
5. One independent reviewer (`claude-opus-5`, fresh context, not the conductor and not the agent
   that wrote them) reading the rolled release notes against the whole `## Unreleased` window,
   confirming every `Consumers must:` line survived into the notes and that none contradicts
   another. The window is large: about 2,420 lines of `CHANGELOG.md` between `## Unreleased` and
   the `0.96.0` heading. Size the dispatch for that. **A hedge is a halt, no publish.**

## Task ordering

**Strictly serial: 1, 2, 3, 4, 5, 6, in the one `pre-cut` worktree.** No task in this pass runs
concurrently with another. Task 1 deletes `node_modules` and both lockfiles, so for the length of
that task the worktree has no installed tree for any other task to gate against; and Tasks 1, 2,
and 4 all write `ROADMAP.md`, while Tasks 1 and 2 both write `CHANGELOG.md` under `## Unreleased`.

| Task | Runs as | Files |
| --- | --- | --- |
| 1, dependency sweep | `cairn-implementer` chain | every `package.json` and lockfile in scope, `docs/reference/supported-toolchain.md`, `docs/internal/record/2026-09-13-minor-bump-features.md`, `docs/extend/migration-notes.md`, `CHANGELOG.md`, `ROADMAP.md` |
| 2, guidance hardening | `cairn-implementer` chain | `src/lib/guidance/install.ts`, `src/lib/guidance/bin.ts`, `src/tests/unit/guidance/install.test.ts`, `docs/reference/guidance.md`, `docs/internal/facts/reference.md`, `docs/extend/migration-notes.md`, `CHANGELOG.md`, `ROADMAP.md` |
| 3, upgrade brief tools section | `cairn-implementer` chain | one new file under `docs/internal/record/` |
| 4, Blueprint audit | conductor's own turns | one new record under `docs/internal/record/`, `ROADMAP.md` |
| 5, close | ritual | STATUS, HISTORY, post-mortem, friction log, `ROADMAP.md` |
| 6, the cut | `cairn-release` skill | `package.json`, `packages/cairn-cms-dev/package.json`, `templates/waymark/` (re-emitted), `docs/reference/supported-toolchain.md`, `CHANGELOG.md`, the tag |

**Why the sweep runs first here, against the 2026-09-14 plan's sweep-last rule.** That rule existed
so newly created visual baselines would not be born on a toolchain the sweep then moved. Task 2
touches `src/lib/guidance/`, which ships no Svelte component and renders no surface; it creates and
moves no baseline. The rule does not bite, so the sweep goes first and every later gate in the pass
runs on the toolchain the cut will read.

**Gate contention.** Task 3 is a docs-only task whose gate is light-lane
(`CAIRN_GATE_LANE=light`); Task 1's gate is browser-bearing. Run at most one browser-bearing gate
at a time, this pass's own and any other session's.

## Standing gate procedure (every task)

- Gates run through `cairn-run-gate '<command>'`. **On exit 75, re-issue the same command
  unchanged until it prints `gate exit:`.** Never poll a log. Act on any NOTE the tool prints
  before the next dispatch.
- A gate that launches no browser sets `CAIRN_GATE_LANE=light`.

### The full gate, named from CI

The earlier draft's twelve-check list was incomplete. The full gate is the CI list, read from
`.github/workflows/test.yml`, `design.yml`, and `norms.yml` at `e2615a08`. Every name below was
verified to exist as a script in the root `package.json` unless noted:

- **The two roots:** `npm run check` (svelte-check, 0 errors and 0 warnings) and `npm test`
  (exit 0, not just a passing count).
- **Package and surface:** `check:package`, `check:surface`, `check:self-use`,
  `check:custom-surface`, `check:dev-package`, `check:chassis-boundary`, `check:cm-internals`.
- **Docs and reference:** `check:reference`, `check:reference:signatures`, `check:docs`,
  `check:target-stack`, `check:arm-indexes`, `check:facts`, `check:transcripts`, `check:symbols`,
  `check:snippets`, `check:prose`, `check:vale`, `check:comments`, `check:rulings-format`,
  `check:editor-quotes`, `check:visuals`, `check:readiness`.
- **Craft and admin:** `check:idioms`, `check:invisible-craft`, `check:admin-css-classes`.
- **Version and template:** `check:version`, `check:template`, `test:emit`, and
  `npm --prefix packages/create-cairn-site test` (which needs the `template/` bake first, as
  `test.yml` does it).
- **Consumer-facing:** `check:consumers`, then the showcase's own
  `npm --prefix examples/showcase run check`, `check:cairn`, `test:unit`, and `format:check`.
- **From `design.yml`:** `check:public-tokens`, `test:reskin`, and the styleguide e2e
  (`npm --prefix examples/showcase run test:e2e -- styleguide`).
- **From `norms.yml`:** `norms:check`, which needs a built and served showcase admin.
- **`check:surface-leaks` does not exist as a script.** The reviewer named it, but
  `check-surface-leaks.mjs` runs inside `check:surface`
  (`package.json:40`). Running `check:surface` covers it; do not invent a script name.

**Sequencing, mandatory.** `npm test`, `check:custom-surface`, and `check:consumers` all repackage
`dist`, so they run **strictly sequentially**, never concurrently with each other.

**Scope.** A per-task gate may be scoped to that task's blast radius, and each task below names its
scope. The **full list runs at the end of Task 1**, again at **Task 5** after the merge from
`main`, and on **CI**.

### Two standing gotchas

- **Worktree gotcha, mandatory for Task 1.** `examples/showcase/node_modules` symlinks back to the
  main checkout, so the showcase resolves `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` to
  **main's** build and silently proves the wrong engine. A from-scratch `npm install` in this
  worktree's `examples/showcase` is required before any showcase build or e2e run is trusted.
- **Baseline gotcha.** Visual baselines are CI-canonical. A local `CI=1 test:e2e` is green when its
  only visual failures are exactly the files the latest baseline regen commit rewrote. Anything
  else is a real red. Committing a locally biased baseline is forbidden.

### The baseline procedure (replaces "declare intended moves before the run")

A dependency sweep cannot know in advance which surfaces a bumped renderer repaints, so this pass
does not ask for a declared list. It asks for a classification after the fact:

1. Run the showcase e2e.
2. Classify every visual failure against the files the latest CI baseline regen commit rewrote.
   Those are not red locally; they are this workstation's known Chromium divergence.
3. A move **attributable to a bumped renderer** is regenerated on CI, never locally:
   `gh workflow run e2e.yml --ref pre-cut -f update_snapshots=true` (the input name
   `update_snapshots` is verified in `.github/workflows/e2e.yml`). Read the committed diff.
4. **Any move not explained by a bumped renderer is a halt.**
5. Never commit a locally generated baseline.

---

## Task 1: the dependency sweep

**Runs as:** `cairn-implementer` chain, `model: sonnet` for the mechanical half; the survey
extension is dispatched as its own research read (`model: opus`) per the skill's step 2.

**Method:** the workstation `dependency-upgrade` skill at `~/.claude/skills/dependency-upgrade/SKILL.md`.
Read it before starting. The plan states the deliverables so no step depends on the skill being
loaded, but the skill is the procedure of record.

**The manifests in scope.** Every directory in this repo with its own `package.json`, verified at
`e2615a08`:

| Manifest | Own lockfile | Notes |
| --- | --- | --- |
| `package.json` (root) | `package-lock.json` | `workspaces: ["packages/*"]` |
| `packages/cairn-cms-dev/package.json` | no | workspace member; shares the root lockfile. Its only dependency is `@glw907/cairn-cms: file:../..` |
| `packages/create-cairn-site/package.json` | no | workspace member; shares the root lockfile. One dependency, `@clack/prompts: ^1.7.0` |
| `examples/showcase/package.json` | `examples/showcase/package-lock.json` | not a workspace; consumes the root by `file:`. 28 declared dependencies |

`packages/cairn-cms-dev` declares `peerDependencies` (`@glw907/cairn-cms: *` and
`@sveltejs/kit: ^2.61.0`) as well as its `file:../..` devDependency, and the sweep considers that
Kit peer range like any other peer range.

**`templates/waymark` is excluded from the before table, because it is generated.**
`packages/create-cairn-site/scripts/emit-template-dir.mjs` emits the whole tree from
`examples/showcase` plus the bake, wholesale on every run, so a hand edit survives at most one
emit. Its two cairn pins derive from the root and dev package versions at bake time, and every
other range in it derives from `examples/showcase`. **`examples/showcase` is the source of its
ranges**, so moving the showcase is what moves the template. This task does not hand-edit it. If a
sweep-moved range should reach the template within this pass, re-emit it with
`npm run emit:template` (the script name is verified in `package.json`) and prove it with
`npm run check:template`, which is the same emitter under `--check`.

**Out of scope:** the Go module at `tool/` and its `go.mod`. It has its own gate and is not part of
the npm package a site installs.

**The prior survey record.** `docs/internal/record/2026-09-13-minor-bump-features.md` exists, covers
this same `## Unreleased` window (the window opened at the `0.96.0` publish, 2026-08-22), and is
the record the sweep **extends in place**. Do not start a new dated file. Add the packages that have
moved since 2026-09-13 and mark which of its existing per-package sections are still accurate
against the ranges as they now stand. Its ruled items are still live: nothing in it landed, because
the pass that would have taken them never ran.

### Outcomes

- [ ] **A before table**, one row per package: package, current, wanted, latest, manifest. Produced
      by `npm outdated --workspaces --include-workspace-root` and `npm audit` at the root, and the
      same pair run again in `examples/showcase`. A caret range that already admits a newer version
      still counts as a bump, because it moves only when the lockfile is regenerated.
- [ ] **The survey record extended in place** at
      `docs/internal/record/2026-09-13-minor-bump-features.md`, covering exactly the `current..target`
      range of every package that moved since the file was written, with three lists per package:
      features to leverage, practices to change, and gate risks with the `file:line` to re-test. A
      package with nothing in range gets one line saying so.
- [ ] **A refactor-decision table** in that record: capability, the code that hand-rolls it, the
      ruling. Per the owner's ruling 3, every item is ruled **file** unless it is a zero-behavior-change
      take with an existing test already covering it. If the take-now list would exceed two such
      items, propose a formal refactoring pass and file it rather than widening this task.
- [ ] **Held majors with their triggers**: TypeScript 7, Vitest 5, `@types/node` 26, each recorded
      with the exact condition that unblocks it. Any new major the sweep finds is added to that list
      with its own trigger, never taken. TypeScript 7's existing trigger (`svelte-check --tsgo` runs
      green, checked weekly by `tsgo.yml`) is carried forward as it stands in `docs/STATUS.md`.
- [ ] **Ranges rewritten** to `^<newest non-major>` for every dependency and devDependency in every
      manifest above. `templates/waymark` is not hand-edited; it is re-emitted, per the note above.
      Peer ranges do not move unless the survey found a reason and named it.
- [ ] **`docs/reference/supported-toolchain.md` reconciled.** The page's `Target today` column is
      derived-checked by `scripts/checks/check-target-stack.mjs` from the root `package.json`'s own
      version, `engines`, and peer ranges, and from `examples/showcase`'s `package.json`
      (wrangler, adapter, typescript) and its `wrangler.jsonc` `compatibility_date`. Every one of
      those sources is in this task's blast radius, so the page moves with them. **The criterion is
      `npm run check:target-stack` green**; the gate, not a hand reading, decides the cells.
- [ ] **`npm run check:template` green**, and the template re-emitted with `npm run emit:template`
      first if any range it derives from `examples/showcase` moved.
- [ ] **A `docs/extend/migration-notes.md` bullet** under its `## Unreleased` section for anything
      a consumer must do. That file is a per-version record outside the docs freeze and is
      maintained every pass, same as the reference arm. If the entry carries no `Consumers must:`
      line, it needs no bullet, and the task says so.
- [ ] **Lockfiles regenerated from scratch, in dependency order.** Delete `node_modules` and the
      lockfile in the root and in `examples/showcase`, then `npm install` at the root first (its
      `prepare` builds the package) and in `examples/showcase` second. Never `npm ci` after deleting
      a lockfile. Workspace members need no separate install.
- [ ] **The lockfile delta recorded** in the survey record: every resolved-version change in both
      lockfiles, since caret-satisfied packages moved silently.
- [ ] **A `CHANGELOG.md` entry under `## Unreleased`** that **lists every moved runtime
      `dependencies` floor of the published package**, since those are what a consumer's own
      install resolves against. A **`Consumers must:` line appears only when a peer range or a
      packaged asset moves** (a stylesheet, a bundled icon set, a font), not merely because a
      runtime floor moved. If nothing in either category moved, the entry says "No consumer
      action."
- [ ] **`ROADMAP.md` lines** for every filed item and for any proposed refactoring pass, each in the
      tier where it bites, naming the code, the capability, and the pass that first leans on it.

### Acceptance criteria

- The before table names every one of the four manifests in scope, and the two `npm audit` runs are
  both reported. `templates/waymark` is absent, by design, with the reason stated.
- Every package that moved has a survey section covering exactly its `current..target` range.
- Every feature-to-leverage and practice-to-change item carries a ruling, and every "file" ruling
  has a matching `ROADMAP.md` line.
- Both lockfiles are regenerated wholesale, not patched; the diff shows a full regeneration.
- Every gate-risk verification named in the survey is run by name and its result reported.
- **The full gate is green**, the whole CI list named under "Standing gate procedure", with
  `npm test`, `check:custom-surface`, and `check:consumers` run sequentially. This task is where
  the full list runs; its blast radius is every manifest, so nothing is scoped out.
- `check:target-stack` and `check:template` are both green.
- The from-scratch showcase build and e2e run green, after a from-scratch `npm install` in this
  worktree's `examples/showcase`. Every visual failure is classified per the baseline procedure.
- No major is taken. No behavior-changing refactor is taken.

### Constraints and halts

- One fix round. **A second fix round is a halt.**
- **A visual baseline move not explained by a bumped renderer is a halt.** Follow the baseline
  procedure above: classify, regenerate on CI for renderer-attributable moves, read the committed
  diff, and never commit a local baseline.
- **A red gate is a halt.**

---

## Task 2: the two cairn-guidance hardening fixes

**Runs as:** `cairn-implementer` chain, test-first, `model: sonnet`.

**The source entry:** `ROADMAP.md:845-861`, the Next-tier `cairn-guidance install` write-hardening
candidates from the extend-2 security re-read (2026-09-20). It lists six items. This task takes
items (3) and (6). Items (1), (2), (4), and (5) stay filed, with the entry's trigger unchanged.

### Fix A, item (3): carry `err.code` out of the write's catch

**File:** `src/lib/guidance/install.ts`.

**Current behavior at HEAD**, verified by reading the code:

- `installGuidance` writes each destination at `install.ts:373-382`. The write is wrapped in a bare
  `catch` at `install.ts:376-379`. **Current-state evidence, quoted so the task recognizes the
  block, not a prescription of the fix:**

  ```
  } catch {
    report.refused.push(destRelPath);
    continue;
  }
  ```

  The caught error's `code` is discarded. An `ENOSPC` or `EACCES` is therefore indistinguishable
  from a containment refusal, and the destination lands in `report.refused` alongside paths refused
  for being symlinks or lying outside `.claude/`.
- `InstallReport` (`install.ts:307-326`) has no field for an error. Its `refused` doc comment
  (`install.ts:317-321`) enumerates the refusal reasons, none of which is a failed write.
- The bin prints `report.refused` with a fixed explanatory string at `src/lib/guidance/bin.ts:94-96`:
  `refused ${path}: outside .claude/, a symlink, or not a regular file`. A disk error prints that
  sentence, which is wrong about the cause and tells the operator to look in the wrong place.

**Required outcome:** a failed write is reported as an error carrying its `err.code`, distinct from
a refusal, and the bin prints it as an error with the code. The task chooses the shape (a new
`InstallReport` field, or an entry type carrying the code) and states the choice in its report; the
plan does not prescribe it.

**Test-first acceptance criteria** (`src/tests/unit/guidance/install.test.ts`, inside the
`installGuidance` describe block that starts at `install.test.ts:174`):

- A new test makes the write fail with a non-`ENOENT` errno, asserts the destination is **not** in
  `report.refused`, and asserts the report names it as an error carrying the errno code. It fails
  before the change and passes after.
- **The mechanism is the task's choice; the criterion is that the disk-error assertion always runs
  on CI.** A mocked filesystem rejection carrying a `code` satisfies it. An environment-dependent
  `skipIf` does not, because a test that skips on the runner proves nothing at the cut. The plan
  does not prescribe a read-only destination directory, and the task should not reach for one if a
  mock is simpler.
- Every existing refusal test still passes unchanged. Line anchors, corrected against the tree:
  `install.test.ts:322` is the **EISDIR** case (the destination that already exists as a
  directory, in the `it` that opens at `:315`); `install.test.ts:341` is the **symlinked-parent
  happy path**, which asserts `report.refused` is empty rather than asserting a refusal. The
  containment and symlink refusal assertions are at `:358-361`, `:379-380`, and `:400`.

### Fix B, item (6): list a refused destination itself, not only its `.orig` sibling

**File:** `src/lib/guidance/install.ts`.

**Current behavior at HEAD**, verified by reading the code:

- `preserveOriginal` (`install.ts:404-437`) pushes only the `.orig` relative path when it refuses:
  `install.ts:413-416` for a symlink at the `.orig` path, and `install.ts:427-431` for a lost
  exclusive-create race that left a non-file there. Both return `false`.
- The caller at `install.ts:370-372` sees `false` and `continue`s **without pushing
  `destRelPath`**. The destination that was skipped is therefore absent from every list in the
  report: not `written`, not `unchanged`, not `refused`. An operator reading the install output sees
  only the `.orig` path and never learns which destination was left stale.
- The existing test proves exactly this gap: `install.test.ts:410-431` asserts
  `report.refused` contains `.claude/skills/foo/SKILL.md.orig` and asserts nothing about
  `.claude/skills/foo/SKILL.md`.

**The code is what is wrong here, not the doc.** `install.ts`'s own TSDoc already documents the
intended behavior: the `refused` field's comment at `install.ts:317-321` enumerates "a `.orig` path
whose recovery copy could not be made" among the refusal reasons, and `installGuidance`'s doc block
at `install.ts:328-336` states outright that it "refuses the destination too when the `.orig`
beside it cannot be made, so an edit is never overwritten without its recovery copy." **Fix B
reconciles the code to the doc**, so the doc block needs no rewrite; the implementation catches up
to it.

**Required outcome:** when a destination is skipped because its `.orig` could not be made, the
destination path appears in the report's refusal list alongside the `.orig` path.

**Test-first acceptance criteria:**

- `install.test.ts:410-431` gains an assertion that `report.refused` contains
  `.claude/skills/foo/SKILL.md`. It fails before the change and passes after.
- A second test covers the race branch at `install.ts:427-431` if it can be provoked
  deterministically; if it cannot, the task says so in its report rather than asserting it loosely.
- The destination's content on disk is still untouched, which
  `install.test.ts:424` already asserts and must keep asserting.

### The docs dimension (both fixes)

- [ ] **A facts-container bullet** in `docs/internal/facts/reference.md`, under its
      `## docs/reference/guidance.md` heading (the heading is at `facts/reference.md:569`). The
      existing bullet at `facts/reference.md:571` states "the destination beside it is not
      overwritten in that run"; it must be updated or joined so the container states that the
      destination is also named in the report. The write-error behavior gets its own bullet. Both
      follow the format in `docs/internal/facts/README.md`: one claim, a `Source:` resolving to
      `path:line`, exactly one status tag, tag last. Gated by `check:facts`.
- [ ] **`docs/reference/guidance.md`**, whose described output changes. Two passages are affected:
      the containment and refusal paragraph at `guidance.md:35-40` ("A refusal names the path,
      repairs nothing, and the run continues"), which must now distinguish a refusal from a write
      error; and the `.orig` paragraph at **`guidance.md:42-49`**, which currently says "A symlink
      at the `.orig` path is refused by name, and the destination beside it is left alone in that
      run" and must now say the destination is named too. The fix is agent-facing, not
      register-graded, but it is still gated by the page's own gates. Because that page carries a
      fenced output block, its gates include **`check:symbols` and `check:transcripts`** as well as
      `check:docs` and `check:vale`: a changed printed line must move in the block too, or the
      transcript gate catches it.
- [ ] **A `CHANGELOG.md` entry under `## Unreleased`** describing both fixes, stating plainly
      **"no consumer action"**. **Ruled, not left open:** the entry carries no `Consumers must:`
      line. `cairn-guidance` is a bin, not a typed export subpath (`package.json`'s `exports` has
      no `./guidance` key), so `InstallReport` is not consumer-importable; no consumer action
      exists, and no parser of the report's printed shape exists anywhere in `tool/` or
      `packages/`. No `docs/extend/migration-notes.md` bullet follows either, since that file
      records what a consumer must do.
- [ ] **`ROADMAP.md:845-861` edited** so items (3) and (6) are removed and the four remaining items
      are renumbered or renamed coherently. The entry's trigger line stays. Per `CLAUDE.md`, the
      roadmap is a pass dimension: a shipped item is not done until the roadmap stops listing it.

### Acceptance criteria

- Each fix has a test that fails at `HEAD` and passes after.
- **Fix A's disk-error assertion runs on CI unconditionally.** A test that skips on the runner does
  not satisfy this criterion.
- The gate is scoped to this task's blast radius: `npm run check`, `npm test`, `check:comments`,
  `check:facts`, `check:docs`, `check:vale`, `check:reference`, `check:reference:signatures`,
  `check:symbols`, `check:transcripts`, and `check:version`. No source outside
  `src/lib/guidance/` moves, so the surface, template, design, and norms gates are out of scope
  here and run at Task 5 and on CI.
- No item other than (3) and (6) is touched. Item (4) in particular (moving `readIfExists` and
  `mkdir` inside the write's `try`) sits adjacent to Fix A in the same block at `install.ts:364-379`
  and must **not** be taken; accretion by adjacency is the named failure mode here.

**Halt:** a second fix round, a red gate, or a `diff-reviewer` verdict that Fix B changed the
documented contract rather than reconciling the code to it.

---

## Task 3: the site upgrade brief's tools section

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Docs-only; light-lane gate.

**The brief does not exist.** Verified: a grep for "upgrade brief" across `docs/`, `ROADMAP.md`, and
`CHANGELOG.md` at `e2615a08` returns exactly one hit, `docs/STATUS.md:18`, which says the brief's
tools section lands in this pass. No file under `docs/`, `docs/internal/`, or
`docs/internal/consultations/` is that brief. The only adjacent artifacts are
`docs/extend/upgrade-cairn.md`, the published per-version upgrade record, and
`docs/extend/migration-notes.md`; neither is the site-round brief.

**Where it is created:** `docs/internal/record/2026-09-21-site-upgrade-brief.md`. It is an internal
planning artifact for the site round (aksailingclub-org, ecxc-ski, 907-life, each upgraded as a
model cairn site), so it belongs under `docs/internal/record/`, not in a published arm. It is not
register-graded.

**Scope limit:** this task writes **the tools section only**, plus whatever front matter the
document needs to stand alone (a one-paragraph statement of what the brief is for and which sites it
covers). The rest of the brief is not this pass's work, and the task does not invent it.

### What the tools section must list

Every command a site runs during its upgrade, each verified against the package's actual `bin`
entries and scripts at `HEAD`. The five bins, from `package.json`'s `bin` block:

| Command | Bin target | Purpose in an upgrade |
| --- | --- | --- |
| `npx cairn-guidance install` | `./dist/guidance/bin.js` | copies the shipped skills, the `cairn-extension-reviewer` agent, and the `CLAUDE.md` fragment into `.claude/`, writing `<dest>.orig` beside anything the site edited and a `MANIFEST` of what it wrote. Never deletes. |
| `npx cairn-guidance check` | same bin | reports whether the installed guidance tree, the `CLAUDE.md` import line, the `check:cairn` script, `cairn-audit.config.json`, the CI workflow, the `.claude/` Tailwind-source exclusion, and any leftover `.orig` match what the package expects. Exits 0 by default; `--strict` exits 1 when the tree is stale or missing. |
| `npx cairn-doctor` | `./dist/doctor/bin.js` | the adoption and configuration check `docs/extend/upgrade-cairn.md:50` already names |
| `npx cairn-audit` | `./dist/audit/bin.js` | the admin-surface audit |
| `npx cairn-manifest` | `./dist/vite/bin.js` | the manifest generator |
| `npx cairn-media-seed` | `./dist/media-seed/bin.js` | media seeding |

The two the owner named explicitly, `npx cairn-guidance install` and `npx cairn-guidance check`,
must both appear. The task verifies each row against `package.json`'s `bin` block and against the
bin's own usage string before writing it; `cairn-guidance`'s usage is at
`src/lib/guidance/bin.ts:13-23`.

**Out of scope for the section:** the Go `cairn` operator CLI under `tool/`. It is not part of the
npm package a site installs, ships no operator-facing command yet, and has no released binary.
The task says so in one line rather than listing it.

### Acceptance criteria

- The file exists at the named path, opens with a paragraph stating what the brief is for and which
  sites it covers, and carries a tools section listing every command above with its purpose.
- Every command and every bin target matches `package.json` at `HEAD`. No command is listed that
  the package does not ship.
- `npx cairn-guidance install` and `npx cairn-guidance check` are both present with their behavior
  stated, including `check`'s exit-code contract.
- The gate passes: `check:docs` (link integrity) and `check:vale`, run light-lane. The file is
  under `docs/internal/`, which `.vale.ini` excludes from the Google package, so Vale's role here is
  spelling and link hygiene only.
- If Task 2 changes what `cairn-guidance install` prints, this section reflects the post-Task-2
  behavior. Task 3 runs after Task 2 by the serial order, so read the post-Task-2 code.

**Halt:** a red gate, or a bin whose usage string contradicts what this section would claim.

---

## Task 4: the Blueprint pre-cut admin audit

**Runs in the conductor's own turns.** The licensed daisyUI Blueprint MCP server reaches only the
main loop, never a subagent, so this cannot be dispatched. It is the reason this task is not an
implementer chain.

**Files in scope**, counted at `e2615a08`:

- `src/lib/components/**/*.svelte`: **48 files**.
- `src/lib/components/cairn-admin.css`: **1 file**.
- Total: **49 files**. (`src/lib/components/` has two subdirectories, `fonts/` and
  `spellcheck-assets/`, neither of which contains a `.svelte` file.)

**This task stays in the pass because the owner approved it in scope.** It gates nothing: no
finding blocks the cut, and every finding is filed.

**Mechanics.** It runs in the conductor's own turns, so the conductor's context is the constrained
resource and the procedure is built around spending it thinly:

- **One lowercase `workflowId`** for the whole audit, reused across every call.
- **`daisyui_setup_expert` first**, which stores the project root, then `daisyui_rules_enforcer`.
- **`daisyui_quality_inspector` with `auditIntent: "report_only"`**, never `fix_changes`. This is a
  read-only audit, which is also what ruling 3 requires.
- **Batch the inspector at eight to ten files per call**, each `files[].path` relative to the
  project root the setup expert stored, never an absolute path. Forty-nine files is five or six
  calls.
- **The conductor writes counts and findings to the record file as it goes** and keeps nothing else
  in context. A finding that reaches the record does not need to stay in the conversation.

**The deferral clause.** If the conductor's remaining context or the battery makes the audit
unaffordable, **Task 4 defers to a follow-up session**, and Task 5's close says so plainly rather
than implying it ran. The deferral is not a halt and does not block the cut.

### Outcomes

- [ ] **An audit record** at `docs/internal/record/2026-09-21-blueprint-pre-cut-audit.md`, carrying
      the tool's findings verbatim in substance, the file count audited, and one ruling per finding.
- [ ] **Every finding ruled "file" to `ROADMAP.md`**, unless it is a zero-behavior fix. A
      zero-behavior fix is a markup or class change that alters no rendered pixel, no baseline, and
      no public prop; anything else is filed.
- [ ] **`ROADMAP.md` lines** for each filed finding, in the tier where it bites.

### Constraints

- **The admin design system wins over the tool on conflict.** Where
  `docs/internal/admin-design-system.md` and a Blueprint finding disagree, the doc governs and the
  record says so with the doc's own line cited. Two of its rules are load-bearing and invisible in
  markup: `data-theme` goes on a bare wrapper, never on a styled element, and scoped overrides go in
  `@layer components`. A finding against either is a false positive unless the doc is wrong, and
  "the doc is wrong" is a separate decision, not this task's.
- A finding that duplicates an item already in `ROADMAP.md` is noted as a duplicate, not filed
  twice.
- No visual baseline moves in this task. If a would-be zero-behavior fix moves a baseline, it was
  not zero-behavior; file it.

**Halt:** none of its own. A tool failure or an exhausted context triggers the deferral clause
above, not a stop-and-ask.

---

## Task 5: close

The `cairn-pass` consolidation ritual, in its own order:

- [ ] **`code-simplifier`** (plugin agent, pins Opus) over the code this pass changed. That is
      Task 2's `src/lib/guidance/` diff. Task 1 changed manifests and lockfiles, which the simplifier
      does not read.
- [ ] **Review fan-out matched to what changed.** Task 2 touches the `cairn-guidance` write path,
      which is a filesystem-containment surface, so `web-auth-security-reviewer` is the matched
      lens. `svelte-reviewer`, `daisyui-a11y-reviewer`, and `cloudflare-workers-reviewer` are **not**
      dispatched: no Svelte component, no admin markup, and no Worker code changed. If Task 1's
      sweep moved Svelte, Kit, DaisyUI, or Tailwind, add `svelte-reviewer` and
      `daisyui-a11y-reviewer` over the resulting diff and say so.
- [ ] **Friction-log triage** on `docs/internal/docs-friction-log.md`, complete-or-move: fixed and
      deleted, promoted to the `ROADMAP.md` tier where it bites, or deleted as no longer true after
      verifying against the code.
- [ ] **`docs/STATUS.md` rewritten** present tense, at or under 60 lines, with the cut as the
      immediate next action and the Go tool Pass B2 entry preserved as the other track. Anything
      past tense moves to `docs/HISTORY.md`.
- [ ] **`docs/HISTORY.md`** gains this pass's entry, newest first: what landed, what the gate caught,
      and what a later pass would be wrong to rediscover from scratch.
- [ ] **A post-mortem** appended to this plan file, with both budget scores: tokens against the 2.5M
      ceiling (`/cost`), and attended time as two counts (planning misses, execution sittings). If
      Task 4 deferred, the post-mortem says so plainly.
- [ ] **One `ROADMAP.md` line filing the `publish.yml` install-command question.** A reviewer
      proposed switching `publish.yml`'s `npm install --no-audit --no-fund` to `npm ci`. **Declined
      for tonight:** `npm install` with a committed lockfile honors that lockfile, and changing the
      release pipeline is outside the owner's four rulings. File it as a chore, do not take it.
- [ ] **`git merge origin/main`** into `pre-cut`, resolving whatever the overnight STATUS push and
      any merge of PR #68 changed. `docs/STATUS.md` is the expected conflict.
- [ ] **Re-gate after the merge with the FULL gate list**, the whole CI list named under "Standing
      gate procedure", sequentially where the sequencing rule applies. Then open the PR and merge
      it on green CI.

### Acceptance criteria

- The PR is merged and CI on `main` is fully green afterward, on the exact merge SHA.
- `ROADMAP.md` lists no item this pass shipped, and lists every item this pass filed, including the
  `publish.yml` chore.
- `docs/STATUS.md` is at or under 60 lines and carries no past tense.

**Halt:** a red gate after the merge, or a merge conflict in anything other than `docs/STATUS.md`,
`docs/HISTORY.md`, or `ROADMAP.md`.

---

## Task 6: the cut

**Runs through the `cairn-release` skill**, which re-derives the release size and the number from
the window's contents. `check:version` enforces the `release-size` marker against the CHANGELOG,
and the `## Unreleased` block currently carries `<!-- release-size: minor -->` (`CHANGELOG.md:3`).

**`0.97.0` is the EXPECTED number, and the owner approved it.** The skill still re-derives at the
cut, and the two can disagree. **If the skill derives anything other than `0.97.0`, that is a
halt**, with the release staged and nothing tagged: the owner approved a specific number, so a
different one is a decision to bring him, not a correction to apply. A merely confirmatory
re-derivation is not a halt.

**Two of the skill's own requirements, already satisfied by this plan.** Its section 2 requires
the release window to be on `main` with the dependency sweep as the last merge before the cut and
no worktree live: **Task 5's merge to `main` satisfies both**, since the sweep is Task 1 of the
same PR. The only other live worktree tonight is the Go tool's `cairn-tool-b2`, whose Go module
carries no npm lockfile and so cannot collide with the sweep's installs.

### The two-manifest version, which a root bump does not reach

**`packages/cairn-cms-dev/package.json` carries its own `version` field**, `0.96.0` at `e2615a08`.
`publish.yml`'s `publish-dev` job reads that file's version, not the root's, and its
already-published guard **exits 0 green** when that version is already on the registry. So a root
bump alone produces a green publish run that ships nothing new for the dev backend, and the
failure is silent. The steps below exist for that.

- [ ] All five cut gates above are green. Ruling 1: if any is red, **stop** with the release staged
      and the notes written. No publish, no tag.
- [ ] `0.97.0` is confirmed free with `npm view @glw907/cairn-cms versions --json`. Published
      numbers are immutable and every sub-`0.68` number is taken, so the check runs at the cut, not
      from memory.
- [ ] **Both manifests are bumped to the same number in one commit:** the root `package.json` and
      `packages/cairn-cms-dev/package.json`. The version is set at the cut, not before, and the
      CHANGELOG heading moves with it, per `check:version`'s rule.
- [ ] **Assert the two versions are equal before tagging.** A mismatch stops the cut:
      `test "$(node -p "require('./package.json').version")" = "$(node -p "require('./packages/cairn-cms-dev/package.json').version")"`.
      `npm run check:dev-package` runs alongside it.
- [ ] **Re-emit the template only once both manifests carry the cut number**, since the emitter
      derives `templates/waymark`'s `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` specs from
      them: `npm run emit:template`, then `npm run check:template` green. Do not hand-edit
      `templates/waymark/package.json`; the next emit would discard the edit.
- [ ] `npm run check:target-stack` green, since `docs/reference/supported-toolchain.md`'s "The
      cairn package" row derives from the root version and moves with the bump.
- [ ] **Pin the tag to a SHA.** `SHA=$(git rev-parse origin/main)`, verify CI fully green on that
      exact SHA per cut gate 1, then `gh release create v<x.y.z> --target $SHA`. Never
      `--target main`: `main` can move between the gate check and the tag. If `origin/main` moved
      after the gates ran, re-verify on the new SHA first.
- [ ] The release body is the changelog window since the last published tag, carrying every
      `Consumers must:` line.
- [ ] **Post-cut verify, both packages:** `npm view @glw907/cairn-cms@<v> version` **and**
      `npm view @glw907/cairn-cms-dev@<v> version` both resolve to `<v>`. Only then, a clean
      install of the published artifacts into a scratch directory (a `create-cairn-site` scaffold,
      or the `templates/waymark` tree) resolves and builds. Provenance is attested for both.
- [ ] **On a partial publish, follow the playbook in Halts:** never bump the number to retry, never
      retry blindly, stop and record which package published, and report.
- [ ] **No site's pin is bumped.** Not ecxc-ski, not 907-life, not aksailingclub-org, not
      xcathletes-org, not cairn-pub. The site round does that, and it is a later initiative.

**Halts in this task:** a skill-derived number other than `0.97.0`; a version mismatch between the
two manifests; any red cut gate; a reviewer hedge on the release notes; a partial publish; and
entering the unsafe window without mains power or 40 percent battery with the inhibitors held.

---

## Readings, all ruled

The three-lens plan review closed every item below. None is open at dispatch.

1. **RULED, out of scope. Whether the 2026-09-14 plan's three accepted admin defaults are still open.** That plan's
   Tasks 2 and 3 named the pagination current-page cue, the two destructive dialogs' backdrops, and
   the `AdminTable` accessible name, sourced to `ROADMAP.md:912-929` (verified at
   `e2615a08`; the superseded plan cited `896-914`, which the file has since moved past). The plan
   never ran, but the
   admin motion pass, extend-1, and extend-2 all landed after it, and any of them may have taken
   one. This pass does not carry them either way; Task 4's audit and Task 5's roadmap sweep are
   where a still-open item would surface. **Out of scope, deliberately.**
2. **RULED, left to the task. The shape of Fix A's report field.** Whether a failed write gets a
   new `InstallReport` field or an entry type carrying the code is Task 2's choice, stated in its
   report. The plan specifies the outcome, not the structure.
3. **RULED. Fix A's disk-error test does not depend on provoking a real errno.** The criterion is
   that the assertion always runs on CI, which a mocked filesystem rejection carrying a `code`
   satisfies. An environment-dependent `skipIf` does not, because a test that skips on the runner
   proves nothing at the cut. The prescribed read-only-directory mechanism is withdrawn.
4. **RULED. Task 2's entry carries no `Consumers must:` line.** No consumer action exists
   (`cairn-guidance` is a bin, not an export subpath), and no parser of the report's printed shape
   exists in `tool/` or `packages/`. The entry says "no consumer action". Task 1's rule is
   separate and stated in Task 1: it lists every moved runtime `dependencies` floor, and carries a
   `Consumers must:` line only when a peer range or a packaged asset moves.
5. **RULED as a procedure, which stands. The exact set of gate-risk re-tests Task 1 must run.** It
   is derived from the extended survey,
   which does not exist yet. The 2026-09-13 record names three `<select>` call sites
   (`src/lib/admin-toolkit/ListToolbar.svelte:364` and `:393`,
   `src/lib/admin-toolkit/Pagination.svelte:74`) for the Svelte 5.57 bump; those carry forward, and
   the extension adds to them. **Resolved as a procedure, not a list.**
