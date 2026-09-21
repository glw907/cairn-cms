# Pre-Cut Pass Implementation Plan (the dependency sweep, two guidance hardening fixes, the site upgrade brief's tools section, the Blueprint audit, and the `0.97.0` cut)

> **For agentic workers:** six deliverable units across five plan tasks plus the cut. Execution is
> a per-task chain (`cairn-implementer`, then `diff-reviewer`, then the gate), dispatched one task
> at a time with the Agent tool. Below six implementer-driven tasks, so no workflow runner. Task 4
> runs in the conductor's own turns, and Task 6 is the release skill, not an implementer dispatch.
> Every `file:line` below was verified against the tree at `e2615a08`; re-verify at dispatch.

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
| **Execution mode** | Per-task chain via the Agent tool (`cairn-implementer`, then `diff-reviewer`), below six tasks. No `pass-execute.js`. |
| **Worktree** | `pre-cut`, branch `pre-cut`, off `origin/main`, at `.claude/worktrees/pre-cut`. No task touches the main checkout or any other worktree. |
| **Merge** | By PR. Before the PR, `git merge origin/main` into `pre-cut`: another session pushes a STATUS update to `main` overnight, so `main` will have moved. Resolve, re-gate, then open the PR and merge on green CI. |
| **Segment boundaries** | After Task 1 (irreversible), after Task 3 (Files seam: Tasks 4 through 6 touch no source), and at Task 5's merge. |

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

## Halts

Stop and write STATUS, then ask one combined question, on any of:

- The sweep needing more than one fix round.
- Any red gate.
- A reviewer hedge on the release notes.

Everything else runs to completion with no check-in.

## Cut gates (Task 6)

All five must be green before the publish fires:

1. CI on `main` fully green after this pass's PR merges.
2. The from-scratch consumer build: `examples/showcase` reinstalled from scratch and built against
   the packed engine, not a symlinked `node_modules`.
3. `npm run check:version`.
4. `npm view @glw907/cairn-cms versions --json` showing `0.97.0` free.
5. One independent reviewer (`claude-opus-5`, fresh context, not the conductor and not the agent
   that wrote them) reading the rolled release notes against the whole `## Unreleased` window,
   confirming every `Consumers must:` line survived into the notes and that none contradicts
   another. The window is large: about 2,420 lines of `CHANGELOG.md` between `## Unreleased` and
   the `0.96.0` heading. Size the dispatch for that.

## Task ordering and independence

| Task | Runs as | Files | Independent of |
| --- | --- | --- | --- |
| 1, dependency sweep | `cairn-implementer` chain | every `package.json` and lockfile, `docs/internal/record/2026-09-13-minor-bump-features.md`, `CHANGELOG.md`, `ROADMAP.md` | — |
| 2, guidance hardening | `cairn-implementer` chain | `src/lib/guidance/install.ts`, `src/lib/guidance/bin.ts`, `src/tests/unit/guidance/install.test.ts`, `docs/reference/guidance.md`, `docs/internal/facts/reference.md`, `CHANGELOG.md`, `ROADMAP.md` | — |
| 3, upgrade brief tools section | `cairn-implementer` chain | one new file under `docs/internal/record/` | **Tasks 1 and 2.** Disjoint. |
| 4, Blueprint audit | conductor's own turns | one new record under `docs/internal/record/`, `ROADMAP.md` | Tasks 1 through 3 for reading; shares `ROADMAP.md` for writing |
| 5, close | ritual | STATUS, HISTORY, post-mortem, friction log | — |
| 6, the cut | `cairn-release` skill | `package.json`, `CHANGELOG.md`, the tag | — |

**Disjointness, stated precisely.** Task 3's Files are disjoint from Tasks 1 and 2, so Task 3 is
genuinely independent and may be dispatched concurrently with Task 1. Tasks 1 and 2 are **not**
disjoint: both write `CHANGELOG.md` under `## Unreleased` and both write `ROADMAP.md`. They run
sequentially for that reason, not because of a logical dependency.

**Why the sweep runs first here, against the 2026-09-14 plan's sweep-last rule.** That rule existed
so newly created visual baselines would not be born on a toolchain the sweep then moved. Task 2
touches `src/lib/guidance/`, which ships no Svelte component and renders no surface; it creates and
moves no baseline. The rule does not bite, so the sweep goes first and every later gate in the pass
runs on the toolchain the cut will read.

**Gate contention.** Task 3 is a docs-only task whose gate is light-lane
(`CAIRN_GATE_LANE=light`); Task 1's gate is browser-bearing. Run at most one browser-bearing gate
at a time. If Task 3 is dispatched concurrently with Task 1, its gate must be light-lane or it
queues.

## Standing gate procedure (every task)

- Gates run through `cairn-run-gate '<command>'`. **On exit 75, re-issue the same command
  unchanged until it prints `gate exit:`.** Never poll a log.
- A gate that launches no browser sets `CAIRN_GATE_LANE=light`.
- The full gate for this pass is: `npm run check` (svelte-check, 0 errors and 0 warnings),
  `npm test`, and the CI-only checks the `cairn-pass` skill names: `check:comments`,
  `check:reference`, `check:reference:signatures`, `check:surface`, `check:snippets`,
  `check:transcripts`, `check:symbols`, `check:arm-indexes`, `check:package`, `check:docs`,
  `check:facts`, `check:version`.
- **Worktree gotcha, mandatory for Task 1.** `examples/showcase/node_modules` symlinks back to the
  main checkout, so the showcase resolves `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` to
  **main's** build and silently proves the wrong engine. A from-scratch `npm install` in this
  worktree's `examples/showcase` is required before any showcase build or e2e run is trusted.
- **Baseline gotcha.** Visual baselines are CI-canonical. A local `CI=1 test:e2e` is green when its
  only visual failures are exactly the files the latest baseline regen commit rewrote. Anything
  else is a real red. Committing a locally biased baseline is forbidden.

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
| `templates/waymark/package.json` | **no lockfile** | the emitted starter template, `private: true`, not a workspace. Its ranges are still rewritten; it pins `@glw907/cairn-cms: ^0.96.0` and `@glw907/cairn-cms-dev: ^0.96.0`, which Task 6 bumps, not this task |

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
      manifest above, including `templates/waymark`. Peer ranges do not move unless the survey found
      a reason and named it.
- [ ] **Lockfiles regenerated from scratch, in dependency order.** Delete `node_modules` and the
      lockfile in the root and in `examples/showcase`, then `npm install` at the root first (its
      `prepare` builds the package) and in `examples/showcase` second. Never `npm ci` after deleting
      a lockfile. Workspace members need no separate install.
- [ ] **The lockfile delta recorded** in the survey record: every resolved-version change in both
      lockfiles, since caret-satisfied packages moved silently.
- [ ] **A `CHANGELOG.md` entry under `## Unreleased`.** It carries a `Consumers must:` line only if
      something the consumer compiles or renders moved: a packaged stylesheet, a bundled icon set, a
      peer range, or the DaisyUI/Tailwind/Svelte/Kit versions the showcase and template declare. If
      nothing consumer-facing moved, the entry says "No consumer action."
- [ ] **`ROADMAP.md` lines** for every filed item and for any proposed refactoring pass, each in the
      tier where it bites, naming the code, the capability, and the pass that first leans on it.

### Acceptance criteria

- The before table names every one of the five manifests, and the two `npm audit` runs are both
  reported.
- Every package that moved has a survey section covering exactly its `current..target` range.
- Every feature-to-leverage and practice-to-change item carries a ruling, and every "file" ruling
  has a matching `ROADMAP.md` line.
- Both lockfiles are regenerated wholesale, not patched; the diff shows a full regeneration.
- Every gate-risk verification named in the survey is run by name and its result reported.
- The full gate is green: `npm run check` at 0 errors and 0 warnings, `npm test` exit 0, and all
  twelve CI-only checks.
- The from-scratch showcase build and e2e run green, after a from-scratch `npm install` in this
  worktree's `examples/showcase`. Any visual failure outside the files the latest baseline regen
  commit rewrote is a red and a halt.
- No major is taken. No behavior-changing refactor is taken.

### Constraints

- One fix round. A second is a halt.
- Baseline moves a bump causes are declared before the run as intended moves, regenerated by file
  path on CI, and read. An undeclared move is a stop.

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
  `catch` at `install.ts:376-379`:

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

- A new test makes the write fail with a non-`ENOENT` errno (for example a read-only destination
  directory yielding `EACCES`), asserts the destination is **not** in `report.refused`, and asserts
  the report names it as an error carrying the errno code. It fails before the change and passes
  after.
- Every existing refusal test still passes unchanged, in particular `install.test.ts:322`, `:341`,
  `:358-361`, `:379-380`, and `:400`, which assert containment and symlink refusals land in
  `report.refused`.
- The test skips on a platform where the errno cannot be provoked, using the existing `skipIf`
  idiom already in the file.

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
      error; and the `.orig` paragraph at `guidance.md:42-47`, which currently says "A symlink at
      the `.orig` path is refused by name, and the destination beside it is left alone in that run"
      and must now say the destination is named too. The fix is agent-facing, not register-graded,
      but it is still gated by the page's own gates (`check:docs`, `check:vale`).
- [ ] **A `CHANGELOG.md` entry under `## Unreleased`** describing both fixes. `cairn-guidance` is a
      bin, not a typed export subpath (`package.json`'s `exports` has no `./guidance` key), so
      `InstallReport` is not part of the consumer-importable surface. The entry carries a
      `Consumers must:` line only if the printed CLI output changes in a way a site's CI could be
      parsing; otherwise "No consumer action."
- [ ] **`ROADMAP.md:845-861` edited** so items (3) and (6) are removed and the four remaining items
      are renumbered or renamed coherently. The entry's trigger line stays. Per `CLAUDE.md`, the
      roadmap is a pass dimension: a shipped item is not done until the roadmap stops listing it.

### Acceptance criteria

- Each fix has a test that fails at `HEAD` and passes after.
- The full gate is green, including `check:facts`, `check:docs`, `check:reference`, and
  `check:comments`.
- No item other than (3) and (6) is touched. Item (4) in particular (moving `readIfExists` and
  `mkdir` inside the write's `try`) sits adjacent to Fix A in the same block at `install.ts:364-379`
  and must **not** be taken; accretion by adjacency is the named failure mode here.

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
  behavior. Dispatch Task 3 after Task 2, or re-verify it at Task 5.

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

**Procedure.** Follow the Blueprint server's own sequential workflow: `daisyui_setup_expert` with a
lowercase `workflowId` first, then `daisyui_rules_enforcer`, then `daisyui_quality_inspector` with
`auditIntent: "report_only"`. Every `files[].path` is relative to the project root the setup expert
stored; never an absolute path. `report_only` is correct here and is what the owner's ruling 3
requires: this is a read-only audit, not a fix round.

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
      ceiling (`/cost`), and attended time as two counts (planning misses, execution sittings).
- [ ] **`git merge origin/main`** into `pre-cut`, resolving whatever the overnight STATUS push
      changed. `docs/STATUS.md` is the expected conflict.
- [ ] **Re-gate after the merge**, then open the PR and merge it on green CI.

### Acceptance criteria

- The PR is merged and CI on `main` is fully green afterward.
- `ROADMAP.md` lists no item this pass shipped, and lists every item this pass filed.
- `docs/STATUS.md` is at or under 60 lines and carries no past tense.

---

## Task 6: the cut

**Runs through the `cairn-release` skill**, which re-derives the release size from the window's
contents. The plan does not pre-derive it: the skill owns that judgment, and `check:version`
enforces the `release-size` marker against the CHANGELOG. The `## Unreleased` block currently
carries `<!-- release-size: minor -->` (`CHANGELOG.md:3`); the skill confirms or corrects it.

- [ ] All five cut gates above are green. Ruling 1: if any is red, **stop** with the release staged
      and the notes written. No publish, no tag.
- [ ] `0.97.0` is confirmed free with `npm view @glw907/cairn-cms versions --json`. Published
      numbers are immutable and every sub-`0.68` number is taken, so the check runs at the cut, not
      from memory.
- [ ] The version is set at the cut, not before: `package.json` and the CHANGELOG heading move
      together, per `check:version`'s rule.
- [ ] `templates/waymark/package.json`'s `@glw907/cairn-cms` and `@glw907/cairn-cms-dev` ranges move
      from `^0.96.0` to the cut version, and `npm run check:template` passes.
- [ ] The release body is the changelog window since the last published tag, carrying every
      `Consumers must:` line. Cut with `gh release create v0.97.0 --target main`, which fires the
      OIDC publish workflow.
- [ ] **Post-cut verify:** the registry shows `0.97.0` on `latest` for both `@glw907/cairn-cms` and
      `@glw907/cairn-cms-dev`; provenance is attested; a clean install of the published tarball into
      a scratch directory resolves and builds.
- [ ] **No site's pin is bumped.** Not ecxc-ski, not 907-life, not aksailingclub-org, not
      xcathletes-org, not cairn-pub. The site round does that, and it is a later initiative.

---

## Open readings

Resolved before dispatch, or named for the conductor to rule:

1. **Whether the 2026-09-14 plan's three accepted admin defaults are still open.** That plan's
   Tasks 2 and 3 named the pagination current-page cue, the two destructive dialogs' backdrops, and
   the `AdminTable` accessible name, sourced to `ROADMAP.md:912-929` (verified at
   `e2615a08`; the superseded plan cited `896-914`, which the file has since moved past). The plan
   never ran, but the
   admin motion pass, extend-1, and extend-2 all landed after it, and any of them may have taken
   one. This pass does not carry them either way; Task 4's audit and Task 5's roadmap sweep are
   where a still-open item would surface. **Unresolved, and deliberately out of scope.**
2. **The shape of Fix A's report field.** Whether a failed write gets a new `InstallReport` field or
   an entry type carrying the code is left to Task 2, which states its choice. The plan specifies
   the outcome, not the structure. **Deliberately open.**
3. **Whether Fix A's errno can be provoked deterministically on every platform this repo's CI
   runs.** The existing test file already uses a `SYMLINKS` capability flag with `skipIf`, so the
   idiom exists, but whether a read-only directory yields `EACCES` reliably on the CI runner was not
   verified while drafting. Task 2 verifies it and falls back to the `skipIf` idiom if not.
4. **Whether Task 2's printed-output change warrants a `Consumers must:` line.** It depends on
   whether any consumer site's CI parses `cairn-guidance install`'s stdout or stderr. Not verified
   across the four consumer repos while drafting, and those repos are out of this worktree's reach.
   Task 2 rules it, defaulting to including the line, since a `Consumers must:` line that turns out
   unnecessary costs a reader one sentence and a missing one costs a site a broken pipeline.
5. **The exact set of gate-risk re-tests Task 1 must run.** It is derived from the extended survey,
   which does not exist yet. The 2026-09-13 record names three `<select>` call sites
   (`src/lib/admin-toolkit/ListToolbar.svelte:364` and `:393`,
   `src/lib/admin-toolkit/Pagination.svelte:74`) for the Svelte 5.57 bump; those carry forward, and
   the extension adds to them. **Resolved as a procedure, not a list.**
