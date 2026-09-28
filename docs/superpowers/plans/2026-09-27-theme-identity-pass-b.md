# Theme identity pass B: the rename and the admin agent path

**Goal:** Give cairn's two surfaces their own homes and names, then teach agents the admin look
pass A built. The engine's admin folder `src/lib/components/` becomes `src/lib/admin/`, exported
at `@glw907/cairn-cms/admin`, and `PreviewBanner` moves to a new `src/lib/public/` exported at
`@glw907/cairn-cms/public`, with no compatibility alias. `cairn-audit` gains the advisory
`radius-scale` rule and three retired-patch arms, the ratified norms gain a recipe line, and the
shipped guidance teaches "write this plain class, get this look" from one source, guarded by a
sync test. The editor's block insert stops fusing a closing fence onto the text after the caret.
One fresh-agent probe proves the guidance at the close. The branch stays unmerged.

**Spec:** `docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md`, approved by Geoff
2026-09-27. This plan covers pass B only: the spec's "Names", "Pass B: the rename and the admin
agent path", probe 1 under "Proof", the pass B paragraph of "Documentation and records", and
"Delivery"'s pass B paragraph. For the agent path's rules and guidance the parent spec governs,
`docs/superpowers/specs/2026-09-26-theme-identity-design.md`, sections "G2: easy for agents",
"Corners", "Buttons", "The markup sweep", and "Delivery"'s pass B bullet; the pass B spec governs
names and paths. Evidence and record: the fold record
`docs/superpowers/research/2026-09-27-theme-pass-b-fold.md` (its fifth fold's "Trim: what moved
where" holds the rename's file list and the probe-retry process), pass A's plan and ledger
`docs/superpowers/plans/2026-09-26-theme-identity-pass-a.md` (the final class vocabulary, the
`/admin/theme-kit` fixture, decisions 14 to 18), and pass C's reviewed plan on branch
`theme-c-plan`, `docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md`, whose inputs this
pass produces (see "What pass C receives"). Executors read the spec sections their task names.
Where this plan and a spec disagree, stop and report, except the decisions recorded under
"Decisions this plan takes".

**Approach:** The rename runs first and alone, and its segment boundary puts it through CI's full
suite, both visual specs included, before anything else lands on top of it. Then the small editor
fix, then the agent path in dependency order: the audit rule and arms, the recipe source and the
norms print, the shipped guidance and its exemplar, and the sync test that binds them. Settle is
one fresh-agent probe, run headless against the emitted template outside the repo. The close
merges `main` in and leaves the branch unmerged for pass C. Plans specify outcomes and acceptance,
never implementation code.

**Plan review:** three lenses (contract, mechanics, risk) reviewed this plan at `07035110`; the
fold record is `docs/superpowers/research/2026-09-27-theme-pass-b-plan-fold.md`, and Geoff's three
rulings on it (2026-09-27) sit under "Rulings for Geoff".

**Branch topology (Geoff, 2026-09-27; task 0 verifies it).** Pass B branches from pass A's
closed but unmerged head, never from `main` after A merges. Pass C later branches from pass B's
head. Corrections from pass A's owner sitting (S3) land on `theme-identity-a` and merge forward
into this branch (see "Merge-forward protocol"). Passes A, B, and C merge to `main` together at
pass C's close, with one `0.98.0` cut. This supersedes the spec's "Pass B starts after pass A
merges" and "Pass A merges to `main` as planned" (Sequencing and release); the ruling postdates
the spec. Plan-time facts were verified on branch `theme-b-plan` at `1486f3f7`, which is pass A's
segment D head. Task 0 re-verifies every path, count, and line reference on the real base and
amends this plan before segment A.

**Pass class:** `engine-logic` by default. Per-task overrides: task 1 is `sweep` (a mechanical
rename and move, with grep post-conditions; its gate is heavier than the class floor because it
touches every surface, and the plan names it). Task 1 also changes four behaviors (the audit
defaults in `config.ts`, the props check in `reference-coverage.mjs`, the classifier in
`gate-tier.mjs`, and the new barrel test), so its reviewer runs on `claude-opus-5-5` and holds
those four at the `engine-logic` bar, the rest at the `sweep` grep bar (see Models). Task 5 is
`docs` (shipped guidance prose). Task 6 is `engine-logic` with a scoped gate, since it adds one
unit test and changes no file under `src/lib` (gate economy's blast-radius rule). Tasks 2, 3, and 4
change engine TypeScript behavior, so they carry the engine gate. The close runs the union:
`code-simplifier` once, the full gate, `svelte-reviewer`, and one `prose-voice-reviewer` read of
the changed guidance. The close takes no separate Opus read of the audit code: tasks 3 and 4
already run an Opus `diff-reviewer` against the same parent-spec sections (Geoff, 2026-09-27,
ruling F1). The `sweep` class's spot captures are CI's two visual specs at the segment A boundary,
which read every captured screen.

**Execution mode:** `pass-execute` (by name) for tasks 1 to 6, one invocation per segment, and
**sequential** (`parallel` unset). The runner does no worktree isolation, so parallel tasks would
share one index, one `base..HEAD` range, and one `cairn-run-gate` key. Task 2 is independent of
tasks 3 to 6 (disjoint files) and is marked so, but it runs in sequence for the same reason. The
contended files are `docs/reference/cairn-audit.md` (tasks 1, 3, 4),
`skills/cairn-admin-screens/SKILL.md` (tasks 3, 5),
`skills/cairn-admin-screens/references/exemplar-list.md` (tasks 1, 3), `templates/waymark/**`
(every task that runs `emit:template`: 1, 3, 5), `docs/internal/facts/*.md` (task 1 repoints citations; the close adds bullets), and
`src/lib/audit/config.ts` (task 1 only). Every heavy gate also queues on one machine-wide lock.

Args: `repo` the worktree's absolute path, `implementer: "cairn-implementer"`,
`reviewer: "diff-reviewer"`, `passClass: "engine-logic"`, `gate` set to **the engine string**
(see Gates), `reducedGate` set to **the reduced string**, `commonNotes` carrying the Global
constraints and the sentinel note below, and each task's `passClass`, `gateTier`, `gate`,
`gateLane`, and `model` as the task states. Segment A's invocation also sets
`reviewerModel: "claude-opus-5-5"`, since the runner reads the reviewer model from the args and
the class, never from a task.

**What each task's `criteria` carries.** `pass-execute.js` hands `diff-reviewer` only the task's
`criteria` and the implementer's report; the reviewer never sees `notes`, `commonNotes`, or this
plan. So the conductor builds each task's `criteria` from four parts, verbatim: the task's
**Outcome**; its **Acceptance**, including its gate string, its task-check strings, and the rule
that a missing or red task check is blocking; the **full text of every numbered decision** the
task names in its header or body; and, for a task pinned to `targeted`, the sentinel note under
Gates. A reviewer holding a decision's text can block on any part of it. Each task's `notes`
carries this plan's path and the spec sections the task header names. Under `engine-logic`,
`sweep`, and `docs`, the runner moves a finding the reviewer marks `coverageOnly` to `nonBlocking`
and returns it as `batchedNotes`; the conductor lists those in the boundary ledger and acts on
none mid-segment. Task 7 is a one-task `pass-execute` run, dispatched only if the probe returns a
guidance gap or the close's review returns a finding. Step S1 is conductor-led. Task 8 is the
close.

**`code-simplifier`:** `code-simplifier:code-simplifier` runs once, at the close, over the pass's
authored TypeScript, Svelte, and script changes: `src/lib/audit/**`, the insert helper and
`src/lib/admin/MarkdownEditor.svelte`, `src/lib/public/index.ts`, `src/lib/admin/index.ts`, and
the changed `scripts/**/*.mjs` logic (`reference-coverage.mjs`, `gate-tier.mjs`,
`check-invisible-craft.mjs`). Path-only rename edits, CSS, tests, the Go test fixture, docs, and
skills are out of its scope. Its changes take one commit, and the close's full gate runs on that
commit.

**The gate agent:** every heavy gate the conductor needs outside a `pass-execute` chain (task 0's
baseline, a merge-forward's re-gate, and the close's full gate) runs inside one Sonnet
`general-purpose` agent per call, dispatched at `high`. The agent runs
`cairn-run-gate '<string>'` in the worktree, re-issuing the same command on exit 75 until it
prints `gate exit:`, and returns the `gate exit:` line and the tail of the log. The main loop never
runs a heavy gate itself.

**Models:** Sonnet `cairn-implementer` at `high` for every task. No task upshifts: the rename is
mechanical, and the one rule and three arms follow `type-scale` and the guarded arm with every
behavior the parent spec fixes stated in the task. `diff-reviewer` runs on `claude-opus-5-5` for
every task, task 1 included (an override of the `sweep` class's Sonnet default, set through
segment A's `reviewerModel`). The pre-flight agents, gate agents, the probe's setup and audit
agents, and the headless probe session itself (`--model sonnet`) are Sonnet at `high`. CI probes
are Haiku. The close is drafted by a Sonnet agent and read by one Opus `diff-reviewer`; the close's
review fan-out is Opus.

**Token ceiling:** 19M, flag at 15.2M (80%) (Geoff, 2026-09-27, ruling F1). The projection:

| Item | Spend |
| --- | --- |
| Task 0: worktree, `main` merge, pre-flight agent, dependency state, baseline gate agent | 1.1M |
| Task 1 (`sweep`: the rename, `./public`, the Names section; heavy gate; Opus reviewer) | 2.2M |
| Task 2 (`engine-logic`, small: the insert padding, its unit table, the e2e) | 0.6M |
| Task 3 (`engine-logic`: `radius-scale`, three arms, the own-tree and guidance test, the fence repairs, the promotion tripwire) | 1.4M |
| Task 4 (`engine-logic`: the recipe source and the norms print) | 0.6M |
| Task 5 (`docs`: three guidance files and the exemplar) | 0.8M |
| Task 6 (the sync test) | 0.5M |
| Fix rounds on about a third of the chains, most on the reduced gate | 1.2M |
| Three segment boundaries (pre-flight, push, Haiku CI read, ledger) and one merge-forward | 0.8M |
| S1: the emitted template, the headless probe, its audit agent, one retry budgeted | 1.1M |
| Task 7 (conditional guidance fix, one run) | 0.4M |
| The close: `code-simplifier` and the full gate agent | 0.5M |
| The close: review fan-out (Svelte, the guidance read) | 0.4M |
| The close: Sonnet draft and one Opus review, hard cap | 0.6M |
| The close: the `main` merge and the merged-head checks | 0.3M |
| The conductor sessions | 1.0M |
| **Projected total** | **about 13.5M** |

The projection sits 1.7M under the 15.2M flag. If the flag trips, the conductor asks the global
80% question at the next segment boundary; the close never halts on budget once task 6 lands.

**Counting rule:** the conductor's counter is the sum of subagent and workflow token counts from
task notifications, plus its own sessions as `/cost` reports them.

**Segments and checkpoints:** the checkpoint interval is four tasks, and every checkpoint falls on
a segment boundary. A boundary is the merge-forward check, the pre-flight for the next segment,
the push, the draft PR's CI read by one Haiku probe, and the ledger. There is no local engine
re-gate and no `code-simplifier` at a boundary; CI runs the full suite on each push.
- Segment A: task 0 (conductor), then task 1 alone. **Override of the three-to-four rule,
  stated:** the spec runs the rename alone and committed green before task 2 starts, and the rename
  is the pass's one change that touches every surface. Its boundary is the only point where CI's
  full e2e, both visual specs included, can prove the rename moved no render before later tasks
  mix other changes into the diff.
- Segment B: tasks 2 to 4. The insert fix, the rule and arms, the recipe source. Its boundary
  also dispatches CI's `norms` workflow on the branch (Gates).
- Segment C: tasks 5 and 6. The guidance and the sync test.
- Segment D: S1 (probe 1), then task 7 if the probe returns a gap, then task 8 (the close).

At each boundary the conductor pushes the branch, writes the ledger at the foot of this file
(tasks, spend, decisions, verdicts, each task's `batchedNotes`, next task), and reads CI through
one Haiku probe. The probe reports failing jobs, failing spec file names, and, for each failure
inside a visual spec, whether it is a `toHaveScreenshot` mismatch or a missing baseline.

**The expected-red set:** whatever task 0 item 9's CI probe finds red on the inherited base (pass
A's closed head plus the `main` merge), with its owner named. Plan-time expectation: empty, since
pass A's S4 regenerates both visual baseline sets before its close. Pass B changes no render, so
from the segment A push any failure outside the inherited set is red: a `site-visual` or
`admin-visual` mismatch then means the rename or a later task moved paint, and it re-dispatches
the task that owns it. A merge-forward that brings a pass A render correction also brings that
correction's own baselines, since pass A regenerates on its branch. A crash, a timeout, or a
missing locator inside a visual spec is always red.

**Merge-forward protocol (pass A's S3 corrections).** At every segment boundary, and once more
at the close before the `main` merge, the conductor runs `git fetch` and compares
`theme-identity-a`'s head with the base the ledger last recorded. When pass A has moved:
1. Confirm no executor is live on `theme-identity-a` (the global executor check) and that its new
   head is committed and pushed. Never merge warm work.
2. Merge `theme-identity-a` into `theme-identity-b` (the default `ort` strategy; its rename
   detection carries an edit to `src/lib/components/<file>` onto `src/lib/admin/<file>`). The
   conductor resolves only three files: `docs/STATUS.md` to this branch's side, both sides of
   `docs/HISTORY.md`, and both sides of any plan-ledger text. Any other conflict aborts the
   merge (`git merge --abort`), and one Sonnet `cairn-implementer` dispatch (class `sweep`, the
   task 1 reviewer bar) performs the merge and resolves it. Two conflicts are expected there:
   a pass A edit to a line task 1 rewrote (a path-bearing comment, the barrel header), and a new
   pass A file under the old folder, which git reports as `CONFLICT (file location): ... added
   in theme-identity-a inside a directory that was renamed in HEAD, suggesting it should perhaps
   be moved to src/lib/admin/<file>`. The implementer accepts git's `src/lib/admin/` location, or
   moves the file to `src/lib/public/` when it is public markup, then repoints it.
3. Re-run the rename's post-condition greps (task 1, "Acceptance"), and `test ! -e
   src/lib/components`. A remaining hit goes to one Sonnet `cairn-implementer` dispatch (class
   `sweep`, the task 1 reviewer bar) that moves or repoints it.
4. One gate agent runs the engine string on the merged head, and the push's CI read follows.
5. The ledger records the new base SHA and the merge commit.

**Worktree:** `.claude/worktrees/theme-identity-b`, branch `theme-identity-b` (the name pass C's
plan assumes), cut from `theme-identity-a`'s closed head. Task 0 creates it after the start
conditions hold. The draft PR is opened against `main` at task 0; its diff carries pass A's
commits until A merges, and reviewers read pass B's range from the base SHA the ledger records.

**Gates:** the runner picks the string as pass A's and pass C's plans record (`pass-execute.js`):
whenever `scripts/checks/gate-tier.mjs` exists, the implementer runs the classifier (with
`--pin <gateTier>` when the task pins one) and runs the string it prints instead of the task's
`gate`. Only a classifier that exits non-zero or prints nothing sends the implementer to
`t.gate || a.gate`. So:
- **A targeted task** (tasks 1, 5, 6) carries its own `gate` and the sentinel pin
  **`gateTier: "targeted"`**. The classifier rejects the unknown tier and exits 1 with empty
  stdout, so the implementer falls back to `t.gate`. The reviewer, seeing a pin, expects `t.gate`.
  The sentinel note in `commonNotes`: "`--pin targeted` is deliberate. The classifier rejects it
  and exits 1, which is the runner's documented fallback. Run the task's Gate command verbatim
  through `cairn-run-gate`; a classifier error here is not a finding." Tasks 5 and 6 also set
  `gateLane: "light"`, since their gates launch no browser.
- **An `engine-logic` task on the engine gate** (tasks 2, 3, 4) pins `gateTier: "engine"` and sets
  no `gate`.

Gate strings never contain a single quote. Every string that launches a browser runs in the heavy
lane (no `CAIRN_GATE_LANE` prefix); a check that launches none runs light. The heavy lane
serializes on one machine-wide lock. The local gates never run `admin-visual.spec.ts` or
`site-visual.spec.ts`: their baselines are CI-canonical and this workstation's Chromium renders
them slightly off (`docs/internal/durable-gotchas.md`), so the boundary's CI read is their proof.
- **The engine string**, which `gate-tier.mjs --pin engine` prints (task 0 item 5 confirms it; a
  different string replaces it and is recorded):
  `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:reference:signatures && npm run check:facts && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism`.
- **The reduced string** (`args.reducedGate`), run by a fix round whose blocking findings are all
  comment-only or test-only, each leg dropped when it has no file (a bare
  `vitest run --project unit` with no file list runs the whole project, so it is never run bare):
  `npm run check && npx vitest run --project unit <touched unit test files> && npm run test:component -- --no-file-parallelism <touched component test files> && E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- <touched e2e specs>`.
- **The rename string** (task 1's `gate`):
  `npm run check:close && npm run test:node-projects && npm run test:component -- --no-file-parallelism && E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- preview.spec.ts custom-screen.spec.ts theme-kit.spec.ts admin-sheet.spec.ts golden-path.spec.ts`.
  `check:close` is CI's check list minus the unit and e2e suites; it contains every leg of the
  engine string's first half.
- **The docs string** (task 5's `gate`):
  `npm run check:docs && npm run check:vale && npm run check:reference && npm run check:facts && npm run check:package && npm run check:template`.
- **The sync string** (task 6's `gate`):
  `npm run check && npx vitest run --project unit src/tests/unit/guidance-recipes-sync.test.ts && npm run check:package`.
- **The showcase legs** (packaged first, since the showcase's `cairn-audit` bin and its type check
  read the engine's `dist`):
  `npm run package && npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check && npm --prefix examples/showcase run test:unit`.
  As a light task check (the showcase set): `CAIRN_GATE_LANE=light cairn-run-gate '<the showcase legs>'`.
- **The tool gate** (light): `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.
- **The package check** (light): `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:package'`
  (it runs `check-skill-budget.mjs`, which binds the admin-screens tier map to the registries).
- **The audit wrappers** (light): `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:invisible-craft && npm run check:admin-css-classes'`.
- **The idioms and comments checks** (light):
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:idioms && npm run check:comments'`.
- **The template check** (light), always after `npm run emit:template`:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:template'`.
- **The surface regeneration**, for a task that changes a typed export (task 1):
  `npm run package && node scripts/checks/check-surface.mjs --update`, then commit
  `docs/internal/api-surface.md` with the export. The direct form works whatever npm's
  argument forwarding does.
- **The guidance tests** (light), for a task whose gate runs no vitest:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npx vitest run --project unit src/tests/unit/audit/own-tree-and-guidance.test.ts src/tests/unit/guidance-recipes-sync.test.ts'`,
  each file dropped while it does not exist yet (decision 14's test lands in task 3, the sync test
  in task 6). The file name `own-tree-and-guidance.test.ts` is fixed here so every task names the
  same file.
- No task runs `norms:check` locally. It needs a showcase preview it does not start, it is
  CI-only by design (`.github/workflows/norms.yml`, dispatched or called by the publish
  workflow, never on push), and no pass B change reaches the manifest (decision 15). Task 4
  proves the manifest unchanged by diff; at segment B's boundary the conductor also runs
  `gh workflow run norms.yml --ref theme-identity-b`, and the boundary's Haiku probe reads it.
- **A showcase e2e run** is heavy and always carries `E2E_PORT=4392`:
  `E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- <spec>`, preceded by the port check
  (Global constraints).

Every string here runs the component project serialized (`--no-file-parallelism`). A component
test stall under a concurrent gate is contention, so rerun that file alone before calling it red.
The conductor runs no heavy gate itself.

## Spec task numbering

The spec's Delivery lists task 1 (the rename, `./public`, and the Names section) and then the
parent spec's agent-path items. Geoff's ruling adds the insert fix as its own task. The mapping:

| Spec item | Plan task |
| --- | --- |
| Task 1: the rename, `./public`, the Names section | 1 |
| (ruling, 2026-09-27) the insert fence fix, ROADMAP Now, friction F12 | 2 |
| `radius-scale` and the retired-patch arms | 3 |
| The recipe source and `cairn-audit norms` | 4 |
| The shipped guidance and exemplar | 5 |
| The sync test | 6 |
| Probe 1 | S1 (task 7 if it returns a gap) |
| Pass B's close | 8 |

## Decisions this plan takes

The spec's "Open for the plan" items that concern pass B, the parent spec's agent-path details it
leaves open, and the gaps this plan found while verifying the spec against the tree. Each is
settled here so no implementer invents it.

1. **`DEFAULT_ADMIN_SCOPE` gains `src/lib/admin`.** The spec's condition ("only if those rules
   already pass on the engine's admin components") is already measured: `check:invisible-craft`
   runs the three `adminOnly` motion rules over `src/lib/components` today (its `ADMIN_SCOPE`,
   `scripts/checks/check-invisible-craft.mjs:67-71`), and pass A kept that gate green through
   segment D. Task 1 re-proves it on the moved tree: the gate's findings and suppressed counts for
   the three rules are identical before and after the move, with zero unsuppressed findings, and
   the report quotes both runs. If that measurement fails, the fallback the spec names applies:
   `DEFAULT_ADMIN_SCOPE` stays without `src/lib/admin` and task 1 files the gap in `ROADMAP.md`.
   The new defaults: `DEFAULT_STATIC_SCOPE` and `DEFAULT_ADMIN_SCOPE` are both `src/routes/admin`,
   `src/lib/admin`, `src/lib/admin-toolkit`. They stay two constants and two config keys, since a
   site can still narrow one without the other; the comment above them says they now agree by
   default and why. The stale "middle root" comment is rewritten. Only `src/lib/admin`'s place in
   `DEFAULT_ADMIN_SCOPE` is conditional on the measurement; `DEFAULT_STATIC_SCOPE` takes all three
   roots unconditionally.
2. **Pass B implements no half of the named-root rule, since it has one scope.** The rule ("a root
   a site names explicitly for one scope is removed from the other scope's defaults") needs two
   scopes, and the public scope arrives in pass C's task 7, which implements and tests both
   directions. Pass B's docs state the rule in a form true on this branch and at the release: a
   root a site names under `static.scope` is an admin root, and the audit treats it as one wherever
   another scope's defaults would also reach it. The same sentence carries decision 23's restore
   form (a configured list replaces the defaults; a configured root the tree lacks fails the run).
   Pass C's task 0 reads this decision as its answer to "whether pass B implemented the admin
   half".
3. **`PreviewBanner` keeps every check it had when it leaves the admin tree.** `check:invisible-craft`'s
   `SCAN_SCOPE` gains `src/lib/public` (not `ADMIN_SCOPE`: it is public markup), so its eight
   `token-colors` suppressions stay exercised; the gate's findings and suppressed totals are
   unchanged, and the report quotes both. `check:prose` (`check-admin-prose.mjs`) also scans
   `src/lib/public`, since the banner ships user-facing copy. ESLint's Svelte block
   (`eslint.config.js:82`) globs both `src/lib/admin/**/*.svelte` and `src/lib/public/**/*.svelte`.
   The admin sheet's `@source` (`scripts/build/admin-css.input.css:14`) moves to
   `src/lib/admin/**` and leaves `src/lib/public` out, since the banner writes no utility class;
   the compiled admin sheet's class inventory must come out identical, and any class whose only
   source was the banner joins the compatibility safelist per pass A's decision 10, so
   `admin-sheet-inventory.test.ts` stays green.
4. **The gate classifier learns both folders.** In `scripts/checks/gate-tier.mjs`,
   `src/lib/admin/` takes the old folder's `admin-visual` tier, and `src/lib/public/` takes `full`,
   the tier `src/lib/render/` has, since it renders on the public site. `gate-tier.test.ts` and the
   table in `docs/internal/pass-gate-tiers.md` change with it.
5. **`check:reference` checks component props on both Svelte barrels.** The per-component props
   check in `scripts/checks/reference-coverage.mjs` (today special-cased to `/components`,
   `:844-880`) runs for `/admin` against `docs/reference/admin.md` and for `/public` against
   `docs/reference/public.md`, so `PreviewBanner`'s props stay checked after the move.
   `reference-coverage.test.ts` covers the second barrel.
6. **The rename's acceptance adds four greps to the spec's, and names what may stay.** The spec's
   grep misses four live forms, measured at plan time: relative imports of the old folder (30
   lines in 11 files under `src/lib`, such as `'../components/CairnLogo.svelte'`), the subpath in
   backticked or `<code>` prose (`` `/components` `` and `` `./components` ``, 19 files, plus the
   mermaid node at `docs/extend/architecture.md:19`), links to the old reference page
   (`components.md`, 28 lines in 17 files), and bare folder-relative paths and `'components'`
   literals under `src`, `scripts`, and the showcase (14 lines at plan time, among them
   `check-admin-prose.mjs:23`'s `join(ROOT, 'src', 'lib', 'components')`, the test paths at
   `check-editor-quotes.test.ts:100,118`, `engine-isolation.test.ts:36,71`, and
   `editor-boundary.test.ts:101`, and `components-barrel-prune.test.ts:44-46`'s demoted export
   keys, which would pass vacuously unless repointed to `./admin/...`). Task 1's acceptance runs
   all five greps with the spec's exclusion list plus `ROADMAP.md` (history lines describe the old
   tree; task 1 repoints the live-tree mentions by reading) and `docs/STATUS.md`.

   Some lines must name the old path after the rename, because this plan requires them. They form
   **the rename allowlist**, and every grep's post-condition is "prints nothing outside the
   allowlist"; the report lists each remaining hit beside its allowlist item:
   1. `src/tests/unit/audit/config.test.ts` or `src/tests/unit/audit/run.test.ts`: the restore
      cases naming `src/lib/components` (Review focus 2; the both-roots proof is run-level, since
      `readScope` in `run.ts` walks the roots and `config.ts` only resolves the list).
   2. The new barrel test and `admin-barrel-prune.test.ts`: an assertion that `package.json`
      carries no `./components` export.
   3. `docs/reference/cairn-audit.md`: the one restore sentence naming `src/lib/components`.
   4. `docs/internal/docs-register.md`: the Names section's retired-names line, if it names the
      old subpath.
   5. `docs/internal/facts/*.md`: the close's bullets that record the rename or the narrowing
      (the old path as what changed, never as a citation).
   6. `ComponentInsertDialog.svelte`'s plural UI string (`'component' : 'components'`), and the
      daisyUI group directory in `scripts/build/daisyui-classes.mjs` and
      `src/tests/unit/daisyui-classes.test.ts`, which the fifth grep excludes by pathspec.
   `docs/extend/upgrade-cairn.md` is not on it: the per-version text goes to
   `migration-notes.md` alone (task 8).
7. **Test files named for the barrel are renamed with it** (`components-barrel.test.ts` and
   `components-barrel-prune.test.ts` become `admin-barrel*.test.ts`); every other test keeps its
   name. Task 1 names one new test, as the `sweep` mandate requires: a barrel test asserting that
   `./public` exports exactly `PreviewBanner` and that `./admin` does not export it.
8. **The Names section's Vale enforcement follows the freeze, in two new rule files.** The
   component-name tokens do not go into `Cairn/Names.yml` or `Cairn/NamesRetired.yml`: `Names.yml`
   is case-sensitive by necessity (it must match capital `Cairn` exactly) and its message is about
   the Go tool and the capital wordmark, so a sentence-initial "Site component" would slip and a
   hit would print the wrong advice. Two new files under `.vale/styles/Cairn/` carry them, both
   `ignorecase: true`, each message pointing at the Names grid in `docs-register.md`:
   `ComponentNames.yml` (error) gains only retired compounds that match no page on a frozen
   narrative arm at execution: at plan time, "engine public component", "public engine
   component", "chassis component", and "site component" (the last has two hits, both on the
   reference arm, `core.md:1079` and `sveltekit.md:2043`, which task 1 rewrites to "custom public
   component"). `ComponentNamesRetired.yml` (warning) gains "engine component" and "custom
   component", since each can be right in a sense a writer must check. A token that would fire on
   a frozen page goes to the warning rule instead, because the Names section sweeps frozen pages
   only at the docs rebuild. `.vale.ini`'s `BasedOnStyles = ..., Cairn` already loads every file in
   the style. The Names section's "Enforcement and scope" paragraph names the two new rules. The
   `` `/components` `` subpath cannot be a Vale token (Vale skips code spans), so decision 6's greps
   carry it.
9. **The audit's reach narrowing is disclosed, not hidden.** Removing `src/lib/components` from
   `DEFAULT_STATIC_SCOPE` also removes a consumer's own `src/lib/components` from every static rule,
   including `stripe-trim-parity` and `unlayered-font-clobber`, whose comments
   (`stripe-trim-parity.ts:13-16`, `unlayered-font-clobber.ts:9-14`) justify their reach by that
   root. Task 1 rewrites both comments to the new reach. The close's migration note names the
   narrowing and how a site restores it (decision 23's restore form). The spec's admin scope
   change implies this; the spec does not state it. **Ruled (Geoff, 2026-09-27, A1):**
   `stripe-trim-parity` and `unlayered-font-clobber` stay admin-only. The narrowing is accepted and
   disclosed, and it is permanent: under pass C's one-scope-per-file rule, a root the public scope
   claims leaves the admin scope, so these two rules never read a site's public components again.
   The rewritten comments and the migration note say so; pass C's task 7 does not add them to the
   public scope.
10. **The insert padding, exactly.** The outcome in task 2 states Geoff's ruling precisely: a blank
    line separates the inserted block from any adjacent non-blank text, before it when non-blank
    text precedes the caret on its line or sits on the line directly above, and after it when
    non-blank text follows the caret on its line or sits on the line directly below. Nothing is
    added at the document's start or end, or beside a blank line already there, so no insert ever
    produces a double blank line. The caret lands at the end of the block's closing fence, as it
    does today when nothing follows, so the existing round trip ("the caret enables Edit block")
    holds. A line holding only whitespace counts as blank. The padding is one pure internal
    function, unit-tested table-driven, that both `insertAtCursor` paths call: the mounted path
    with the editor's caret, and the pre-mount fallback with the caret at the end of `value`
    (today's append behavior, now padded by the same rule). The behavior belongs
    to the public `EditorApi.insert`, which today already prefixes a blank line at any caret past 0,
    so it is block insertion already; `docs/reference/admin.md` states it.
11. **`radius-scale`'s shape.** A static rule, tier `advisory`, sibling of `type-scale` and
    `gap-scale`, reading each class token through `utilityBase()`, so `md:rounded-lg` is caught. It
    flags bare `rounded`, the fixed sizes (`xs` through `4xl`), any arbitrary radius in either of
    Tailwind v4's forms (`rounded-[...]` and the variable shorthand `rounded-(--x)`, which Tailwind
    4.3.3 compiles to `border-radius: var(--x)`), and each side or corner form of those (`t`, `b`,
    `l`, `r`, `s`, `e`, `tl`, `tr`, `br`, `bl`, `ss`, `se`, `es`, `ee`): the parent spec's
    post-condition pattern, widened to the shorthand. It raises one finding per offending token. It
    passes
    the three role classes and their side forms (`rounded-selector`, `rounded-field`, `rounded-box`,
    `rounded-t-box`), `rounded-full`, `rounded-none`, and structural side zeros (`rounded-l-none`).
    It flags `rounded-full` on an element that also carries `badge` (chips leave the pill). The
    message names the replacement role class: the one class when the element carries a daisyUI
    class whose role the parent spec's Corners mapping fixes (`badge` to `rounded-selector`; `btn`,
    `input`, `select`, `textarea` to `rounded-field`; `card`, `modal-box`, `dropdown-content` to
    `rounded-box`), the exact class for an arbitrary `rounded-[var(--radius-<role>)]` or
    `rounded-(--radius-<role>)`, and otherwise the three-role mapping in one sentence. Every
    message names the `0.99.0` promotion (decision 13). It reads class tokens only; a
    `border-radius` literal in a `<style>` block is outside it, and the reference page says so.
12. **The retired-patch arms' shape.** Three new arms on `stock-default-hazards`, each on an element
    that carries `btn`, each an `advisory` finding: the ink-opener recipe (the element carries
    `bg-neutral` or a `bg-[var(--cairn-ink-hover)]` utility and no `btn-neutral`) names
    `btn btn-neutral`; the Publish tint recipe (the element carries `bg-primary/10` and no
    `btn-soft`) names `btn btn-soft btn-primary`; `shadow-none` names nothing to add and says the
    theme's depth is already zero. The new arms compare `utilityBase()` of each token, so a
    variant-prefixed patch (`hover:bg-[var(--cairn-ink-hover)]`, `sm:shadow-none`) is caught. The
    five existing arms keep their raw comparison, since widening them is the deliberate decision
    their `WATCH` comment reserves. An element without `btn` never fires an arm: at plan time the
    engine carries `bg-primary/10` on six non-button elements (icon medallions, a nav item, a radio
    segment), which must stay silent. One `btn` element raises at most one retired-patch finding: a
    recipe arm (ink opener or Publish tint) takes precedence, and the `shadow-none` arm stays silent
    on an element where a recipe arm fired, since writing the named replacement drops the
    `shadow-none` with the rest. So the parent spec's two full recipes (`btn border-transparent
    bg-neutral text-neutral-content shadow-none hover:bg-[var(--cairn-ink-hover)]` and `btn
    border-transparent bg-primary/10 text-primary shadow-none`) each raise exactly one finding.
    Every arm message names the `0.99.0` promotion.
13. **The promotion version is `0.99.0`, guarded by a version tripwire this pass lands.** The parent
    spec promotes the new findings "for the next minor, as the guarded arm did"; the guarded arm
    shipped in `0.97.0` and named `0.98.0`, and these ship in `0.98.0`, so they name `0.99.0`
    through one constant in `radius-scale.ts` (`RADIUS_SCALE_PROMOTION_VERSION`) and one for the
    three arms in `stock-default-hazards.ts` (`RETIRED_PATCH_PROMOTION_VERSION`), the way `log-event-grammar.ts:20` does, each constant's name ending
    in `PROMOTION_VERSION`. Three existing constants already name `0.98.0`
    (`log-event-grammar.ts:20` and `log-secret-field.ts:25`, both `PROMOTION_VERSION`, and
    `stock-default-hazards.ts:45`, `GUARDED_RETIREMENT_PROMOTION_VERSION`). Task 3 adds
    `src/tests/unit/audit/promotion-versions.test.ts`: it reads every `*PROMOTION_VERSION = '<x>'`
    constant in `src/lib/audit/**/*.ts` as source text and `package.json`'s `version`, asserts it
    found at least one constant and, while the package version is below `0.99.0`, both
    `RADIUS_SCALE_PROMOTION_VERSION` and `RETIRED_PATCH_PROMOTION_VERSION` by name
    (non-vacuity that survives pass C deleting a promoted `0.98.0` constant), and fails when any
    constant's version is at or below the package version, naming each constant's file, its
    version, and the choice owed: promote the finding to error (and delete the constant) or
    re-date it with a disclosed changelog line. It is green on pass B (`package.json` stays
    `0.97.0`) and turns red on pass C's `0.98.0` version commit unless the three due promises have
    been decided. **Ruled (Geoff, 2026-09-27, F2):** the three `0.98.0` promises are decided per
    rule at pass C's owner sitting (S3) from measured finding counts on the five sites; pass B
    lands the tripwire and names the question in "What pass C receives". The test reads no git
    ref, so CI's depth-1 checkout runs it.
14. **Cairn's own tree and the shipped guidance report zero retired-patch findings, proven by a
    test.** No gate runs `stock-default-hazards` or a new rule over the engine's own admin today
    (`check:invisible-craft` owns six rules, `check:admin-css-classes` one). Task 3 adds
    `src/tests/unit/audit/own-tree-and-guidance.test.ts`, which runs `radius-scale` and
    `stock-default-hazards` statically over `src/lib/admin`, `src/lib/admin-toolkit`, and
    `examples/showcase/src/routes/admin`, and over every fenced `svelte` or `html` code block in
    `skills/**/*.md` and `claude/agents/*.md`. It asserts zero `radius-scale` findings, zero
    findings from the three new arms, and zero error-tier findings from `stock-default-hazards`.
    **One stated exemption:** the guarded-retirement arm's advisory findings (identified by its
    message) are not counted. At plan time it fires four times in `EditPage.svelte` (`:1630`,
    `:1918`, `:2014`, `:2394`), because the engine keeps `cairn-btn-guarded` on those four controls
    by design (`stock-default-hazards.ts:139-143`); that arm's future is one of the three `0.98.0`
    questions decision 13 routes to pass C, and the test's comment says a promotion to error must
    retire those four sites first.

    **The fence strategy.** The test parses each fence through the audit's own parser after two
    normalizations: an elided expression `{...}` becomes `{_}` and a line holding only `...` is
    dropped, and each fence is prefixed with `<script lang="ts"></script>` so a TypeScript snippet
    parameter parses. A fence that still does not parse fails the test, naming the file and line;
    it is never skipped. At plan time 13 fences exist, all under `skills/cairn-admin-screens/`;
    five fail raw, and two still fail after normalization (`exemplar-detail.md:100`, "`<div>` was
    left open", and `exemplar-list.md:177`, "`<section>` was left open"). Task 3 repairs both by
    closing their elements. The `exemplar-detail.md:100` fence also teaches the retired
    `badge-ghost` chip (its line with `badge-ghost badge-sm font-medium opacity-60`), which the
    error-tier arm flags: task 3 rewrites that line to the ratified quiet chip
    (`<StatusChip label="Archived" />`, whose default register is `quiet`, per
    `BADGE_GHOST_MESSAGE`). The prose at `:129-134` keeps naming `badge-ghost` in a code span, now
    as the pattern the source screen wrote and cairn retires, beside the fence's cairn-native form.
    A retired pattern in guidance may appear only in a prose code span, never in a fence.

    **Non-vacuity.** The test asserts a nonzero engine file count and a fence count of at least 13,
    so it cannot go green by reading nothing. This is the parent spec's "the fixture fails if the
    sweep missed a site or a guidance file still teaches a patch".
15. **The recipe source.** `src/lib/audit/norms.ts` gains `ROLE_RECIPES` beside `RATIFIED_NORMS`:
    each row is a class string to write, a one-line look it produces, and an optional `role` (a
    `NORM_ROLES` id). It also gains `RECIPE_MODEL`, the one-sentence model every guidance copy
    quotes verbatim. The rows cover every ratified role (at plan time eight distinct roles across
    `RATIFIED_NORMS`' twelve rows: `page-title`, `eyebrow`, `nav-item`, `button-primary`,
    `button-ghost`, `input-text`, `select`, `card`), exactly one row each; the plain `btn`, the
    ink opener `btn-neutral`, the soft primary, and the selected segment; and the three radius
    role classes by role. Each class string comes from `docs/internal/admin-design-system.md` as
    pass A left it or from the `/admin/theme-kit` fixture, and the diff review checks each row
    against those. A unit test also catches a typo mechanically: every class token in each row's
    Write string appears in the committed admin sheet inventory
    (`src/tests/unit/fixtures/admin-sheet-inventory.txt`) or in the theme-kit fixture's source
    (`examples/showcase/src/routes/admin/theme-kit/+page.svelte`), and the failure names the row
    and the token. A ratified role a screen never writes itself (a nav item, which
    `CairnAdminShell` renders) says which engine component renders it. The rows live outside the
    norms manifest, read at print time the way `findRatified` reads `RATIFIED_NORMS`, so the
    manifest and `norms:check` do not change. The recipe table is internal to the audit module; it
    adds no package export.
16. **The norms print.** `formatNormsQuery` prints one `recipe:` line under a role's header when a
    row names that role. `docs/reference/cairn-audit.md`'s norms section shows one example of the
    line and does not reproduce the table, so no fourth hand copy exists outside the sync test's
    reach.
17. **The guidance table's form.** Each of `skills/cairn-admin-screens/SKILL.md`,
    `skills/cairn-extend/references/daisyui-first.md`, and `claude/agents/cairn-extension-reviewer.md`
    carries `RECIPE_MODEL` verbatim and a section headed `Write this, get this` whose first table
    has two columns, `Write` (a code span) and `Get`, with the rows of `ROLE_RECIPES` in source
    order.
18. **The exemplar.** A new `skills/cairn-admin-screens/references/exemplar-kit.md`, listed in that
    folder's `README.md`, excerpts the `/admin/theme-kit` fixture's kit sections (buttons, joins,
    alerts, controls, a chip, a field, a card). Every `svelte` fence in it must appear in
    `examples/showcase/src/routes/admin/theme-kit/+page.svelte` after whitespace normalization,
    with `data-testid` attributes and HTML comments removed (test hooks and fixture notes are not
    guidance). The fixture's `<h1>` writes `type-title font-bold`, while the ratified page heading
    is `PageHeader`'s `type-title font-[550]`, so the exemplar excerpts no heading and teaches the
    heading through the recipe table's `page-title` row. The fixture itself does not change, so
    its `admin-visual` baselines stay.
19. **The sync test** is a new `src/tests/unit/guidance-recipes-sync.test.ts`. It reads the source
    guidance (`skills/` and `claude/`), never the template's baked copies, which `check:template`
    already binds to the source. It asserts `RECIPE_MODEL` and the table rows in all three files,
    the exemplar's fences against the fixture route, and that every ratified role has exactly one
    recipe row. Its mutation proof: editing one guidance copy alone, or one fixture line an
    exemplar fence quotes, fails it. It cannot go vacuous: a guidance file missing the `Write this,
    get this` heading or carrying an empty table fails naming the file; a malformed row fails
    naming the file and the row; the exemplar must hold at least the seven kit sections decision
    18 names; and the test collects every mismatch before failing, never stopping at the first.
20. **Probe 1's brief, setup, and criteria.** The probe must see only what a consumer receives. A
    subagent of the conductor would inherit this repo's `CLAUDE.md` (which points at
    `admin-design-system.md`), could read `docs/internal/**`, and would find the showcase's
    `/admin/theme-kit`, a near answer key that the template deliberately excludes. So the probe
    runs as a separate headless Claude Code process in an emitted template outside the repo:
    - **Setup** (one Sonnet setup agent, from the pass worktree at the segment C head): `npm run
      package`; pack the engine and `packages/cairn-cms-dev` with `npm pack --pack-destination
      <probe dir>` (so no tarball lands in the worktree); emit the template with
      `node scripts/build/emit-template.mjs <probe dir>/site file:<engine.tgz> file:<dev.tgz>
      probe-site`, the way `.github/workflows/scaffold.yml` does. The probe dir is
      `<session scratchpad>/pass-b-probe/`, outside `~/Projects`; the agent checks the `/tmp` user
      quota first (`quota -s -f /tmp`, the `tmpfs-user-quota-go-link` memory). In the site: `npm
      install`, then `git init` and one commit of the clean tree, so the probe's own changes read
      from `git ls-files -mo --exclude-standard` afterwards (tracked edits plus every untracked
      file; plain `git status --porcelain` lists a new folder, not its files).
    - **The probe** (the same setup agent runs it and returns its final message): `claude -p
      --model sonnet --setting-sources project,local --permission-mode acceptEdits --allowedTools
      'Bash(npm run:*)' 'Bash(npx cairn-audit:*)' < <probe dir>/brief.txt` with the site as its
      working directory, so it loads the template's `CLAUDE.md` and `.claude/` and no user-scope
      settings, may edit files, and may run the site's own scripts and audit as a consumer's agent
      would. The brief goes on stdin because `--allowedTools` is variadic and would read a trailing
      prompt as a third tool. The agent writes `brief.txt` in the probe dir (outside the site, so
      it never reads as a probe change) with a quoted heredoc (`cat > brief.txt <<'EOF'`), so the
      brief's backticks reach the model verbatim instead of executing. The brief is one line: "Add
      an owner-only admin settings screen at `/admin/probe` in this site: a segmented filter, a
      short form with two fields and a switch, a status chip per row of a small table, and one
      primary action." Whatever user-scope
      context still loads (for example user-scope skills) is recorded in the ledger as the probe's
      stated limit.
    - **The audit** (a separate Sonnet audit agent): adds `/admin/probe` to the site's
      `rendered.extraPages`; runs `npm run check:cairn` (the static audit, after the site's own
      `build:admin-css`); builds with `VITE_CAIRN_E2E=1 npm run build` and serves
      `CAIRN_DEV_BACKEND=1 npm run preview -- --port 4391` detached (the `norms.yml` recipe,
      without which every admin page redirects to login); runs
      `BASE_URL=http://localhost:4391 npx cairn-audit --rendered` (installing the site's Playwright
      Chromium first if it is missing); stops the preview.
    - **Pass:** zero error findings on the probe's files and page, and zero `radius-scale` or
      retired-patch findings, in both modes. **The audit read what the probe wrote:** the list
      `git ls-files -mo --exclude-standard` prints in the site is nonempty and contains
      `src/routes/admin/probe/+page.svelte` (so the check cannot pass by reading nothing), every
      `.svelte` file on it lies under a root of the effective `static.scope`, and the rendered
      run's page list includes `/admin/probe`. A probe file
      outside every scanned root fails the probe as a guidance gap (the guidance did not say where
      a custom admin component lives). Findings elsewhere in the site do not count and are
      reported separately.
    - The probe dir is deleted after the ledger records the counts; nothing from it merges.
21. **Probe retry.** A failed probe names a guidance gap. Task 7 fixes the gap on its shipped page,
    and a fresh headless probe (decision 20's setup, a new probe dir) re-runs it once. A second failure is recorded in the ledger with both
    audit summaries, filed in `ROADMAP.md`, and raised at the next owner sitting (pass C's S3); the
    pass closes with the finding disclosed in STATUS, since it is a guidance gap, not a product
    fork.
22. **No dependency bump in this pass.** Pass C's decision 28 sweeps dependencies at its own task
    0, before its equivalence capture, so every piece of pass C's evidence rides the release's
    dependencies; a sweep here would be redone there. Task 0 records `npm outdated` for the root,
    the showcase, and `packages/*` in the ledger as the state pass C inherits.
23. **The changelog's `Consumers must:` line** is one line with the spec's four parts, verbatim in
    task 8, with two parts made exact. **The restore form (part 3).** `static.scope` replaces the
    defaults rather than adding to them (`config.ts:215`, `asPathList`), and a configured root the
    tree lacks fails the run (`run.ts:64-72`). So "name `src/lib/components` under the admin scope"
    followed literally (`["src/lib/components"]`) silently drops `src/routes/admin` from every
    static rule, and copying the full new default list fails on a site without `src/lib/admin`.
    The line therefore says to set `static.scope` to the default roots the site has plus
    `src/lib/components`, with an example, and names why. It also stops calling `static.scope`
    "the admin scope", since `static.adminScope` is a separate key: the three `adminOnly` motion
    rules read that key, and they never read `src/lib/components` before either. The move branch
    of part 3 also names the `@source "./lib/admin";` line a site's own admin stylesheet needs
    (decision 25), since a site's `admin.css` is its own file, not the template's. **The dist path
    (part 4)** covers every channel a consumer can hold the old path in: an audit config
    (including one passed with `--config`) or a site script (for example
    `aksailingclub-org/scripts/verify-chip-registers.mjs:55`). The migration note says the same,
    plus decision 2's named-root sentence, decision 9's narrowing and Geoff's A1 ruling, and the
    `DEFAULT_ADMIN_SCOPE` change (decision 1) with the motion rules it brings to a site's
    `src/lib/admin`. This sharpens the spec's clause without changing its four parts; the fold
    record lists it as an owed spec erratum.
24. **The user-scoped `cairn-release` skill names the old folder** (`~/.dotfiles/claude/.claude/skills/cairn-release/SKILL.md:107`,
    "`src/lib/components/*.svelte`"). Pass B does not edit it. A user-scope skill is live the
    moment it is committed, and `main` keeps `src/lib/components/` until pass C merges A, B, and C,
    so a cut from `main` before then (a hotfix) must still read the old path. Pass C's close, which
    already edits `cairn-release` in one dotfiles commit, repoints the line; "What pass C
    receives" says so. No other user-scoped agent or skill names the old paths at plan time; task 0
    re-checks.
25. **The showcase compiles the new custom-admin home.** The Names grid puts a custom admin
    component in `src/routes/admin` or `src/lib/admin`, but the showcase's `src/admin.css` (and,
    through `emit:template`, the template's) imports utilities with `source(none)` and scans only
    `@source "./routes/admin"`. A site that follows the `Consumers must:` line into `src/lib/admin`
    would get no utility that appears only there, and `no-uncompiled-class` would fail its
    `check:cairn` without naming the missing `@source`. Task 1 adds `@source "./lib/admin";` beside
    the existing line. Tailwind 4.3.3 ignores an `@source` path that does not exist (verified by
    the risk review), so the showcase's compiled admin CSS stays byte-identical and no render
    moves.

## Rulings for Geoff

Settled, 2026-09-27; no fork remains open.

- **F1, the token ceiling (Geoff, 2026-09-27):** pass B's ceiling rises to 19M, flag 15.2M, and the
  close drops its separate Opus read of the audit code (tasks 3 and 4 already run an Opus
  `diff-reviewer` against the same sections). Recorded in the header.
- **A1, the two Tailwind-general rules (Geoff, 2026-09-27):** `stripe-trim-parity` and
  `unlayered-font-clobber` stay admin-only. The narrowing is accepted and disclosed, and it is
  permanent under pass C's one-scope-per-file rule. Recorded in decision 9.
- **F2, the three `0.98.0` promises (Geoff, 2026-09-27, the recommended default accepted without
  objection):** each is decided per rule at pass C's owner sitting from measured finding counts on
  the five sites. Pass B lands the version tripwire that stays green here and forces the decision
  before a `0.98.0` cut, and names the question in "What pass C receives". Recorded in decision
  13.

## What pass C receives

Pass C branches from this pass's head and reads these as its inputs. Task 8 verifies each and the
ledger lists them with SHAs.

- The engine folder `src/lib/admin/` (holding `preview-doc.ts`, `cairn-admin.css`, and
  `MarkdownEditor.svelte`), shipped as `dist/admin/`, with the compiled sheet at
  `dist/admin/cairn-admin.css`.
- `src/lib/public/PreviewBanner.svelte` and `src/lib/public/index.ts`, exported from
  `@glw907/cairn-cms/public`; `package.json` exports `./admin` and `./public` and no `./components`.
- `docs/reference/admin.md` (renamed from `components.md`) and `docs/reference/public.md`.
- `src/lib/audit/config.ts` with `DEFAULT_STATIC_SCOPE`, `DEFAULT_ADMIN_SCOPE` (decision 1's
  outcome, recorded in the ledger), `DEFAULT_SHEET_CANDIDATES` naming `dist/admin/cairn-admin.css`,
  and `DEFAULT_PALETTE_CSS_FILES` naming `src/lib/admin/cairn-admin.css`. No named-root mechanism
  (decision 2).
- `check-invisible-craft.mjs`'s `SCAN_SCOPE` and `ADMIN_SCOPE` on the new paths, `SCAN_SCOPE`
  including `src/lib/public` (decision 3).
- `radius-scale` registered: the static registry at eighteen rules and the total at thirty-five,
  `run.test.ts`'s `NUMBER_WORDS` and counts, `docs/reference/cairn-audit.md`'s count sentences, and
  the admin-screens tier map listing it under "Static, advisory tier".
- `docs/internal/api-surface.md` regenerated for `/admin` and `/public`.
- `CHANGELOG.md` `## Unreleased` carrying pass B's entry, which pass C leaves as written.
- `ROADMAP.md`'s Now entry "Theme identity, passes A, B, and C" still live, updated to say pass B
  is finished (pass C removes it); the F12 entry removed.
- The branch `theme-identity-b`, merged with `main` and with `theme-identity-a`'s latest head at
  the close, green on CI, its draft PR open (pass C closes it as superseded).
- STATUS on this branch naming the head, the base SHAs, the merge commits, and pass C's resume.
- **The `0.98.0` question, forced by a test (ruling F2).** `promotion-versions.test.ts` is green
  here and turns red on the `0.98.0` version commit while any of the three due promises stands:
  `log-event-grammar`, `log-secret-field` (both `PROMOTION_VERSION`), and the guarded-retirement
  arm (`GUARDED_RETIREMENT_PROMOTION_VERSION`). Pass C's owner sitting (S3) decides each per rule
  from measured finding counts on the five sites: promote it to error, or re-date it with a
  disclosed changelog line. One fact bears on the guarded arm: the engine itself keeps
  `cairn-btn-guarded` on four `EditPage.svelte` controls, so promoting that arm first retires
  those four sites, and `own-tree-and-guidance.test.ts`'s stated exemption follows the decision.
  The two `0.99.0` constants this pass adds fall under the same test at the next minor.
- **A1, settled:** pass C's public scope does not run `stripe-trim-parity` or
  `unlayered-font-clobber` (decision 9).
- **The dotfiles repoint (decision 24):** pass C's close repoints
  `~/.dotfiles/claude/.claude/skills/cairn-release/SKILL.md:107` from `src/lib/components/*.svelte`
  to `src/lib/admin/*.svelte` in its existing `cairn-release` dotfiles commit, once `main` carries
  the new folder, and runs `claude-tooling-sync verify`.
- **A cairn-pub carry-forward:** cairn.pub derives its docs routes from the tarball's files, so
  `/docs/reference/components` returns 404 once it pins `0.98.0`. Its pin bump adds a redirect to
  `/docs/reference/admin`. The engine needs no change.

Pass C's plan assumes one thing this pass cannot produce: its header paragraph "Branch topology"
(pass C plan `:34-36` on `theme-c-plan`) still reads "Pass A has merged to `main`". Its task 0 item
1 already reads the 2026-09-27 topology: pass A stays unmerged until pass C's close, pass B's
branch contains pass A's closed head and a `main` merge, and pass C's close merges A, B, and C
together (closing pass A's PR #92 and pass B's PR as superseded). Task 8 writes into STATUS that
pass C's conductor reads the header paragraph under task 0 item 1's topology.

## Global constraints

- **No render moves.** Pass B changes no admin or public paint. Task 1 moves files and repoints
  paths, task 2 changes editor text only, and tasks 3 to 6 change the audit and guidance. A task
  that moves a computed style or a capture stops and reports.
- **No compatibility alias.** `./components` is removed, not re-exported, and no shim file keeps
  `src/lib/components/` alive (Geoff, 2026-09-27: breaking changes are cheap before the site
  rebuilds).
- **Moves use `git mv`**, so history follows each file.
- **The template is generated, never hand-edited.** Every task that edits an emitted showcase file,
  a shipped skill, or a shipped agent runs `npm run emit:template` in the same task, and
  `check:template` stays green at every commit.
- **Each public export adds its reference entry in the same task** (`check:reference`), and a task
  that changes a typed export regenerates `docs/internal/api-surface.md` with the surface
  regeneration command and commits it with the export, so CI's `check:surface` stays green.
- **A rule change lands with its reference entry, its tier-map line, and its counts in the same
  task.** `run.test.ts` pins the rule-count sentences in `docs/reference/cairn-audit.md`, and
  `check-skill-budget.mjs` fails when the admin-screens tier map misses a registered rule.
- **The frozen narrative arms.** `docs/admin/`, `docs/editors/`, and `docs/extend/` (outside the
  per-version records) are frozen against rewrites. A sentence this pass makes wrong (an import
  path, a subpath name) is a deficiency fixed on the page in the same task, gated by that page's
  own gates, and filed as a facts bullet at the close. Task 0 re-reads the rule in `CLAUDE.md` on
  the branch and records it.
- **Draft docs pass 0+1 stays out of scope.** It is paused on `draft-docs-0` and later merges
  `main`, which carries the renamed pages; no task edits that branch.
- **Ports.** Every preview a task, capture agent, or the conductor serves outside Playwright runs on
  a port other than 4173 and 4392 (4391 for a showcase preview), is reached through `BASE_URL`, and
  is stopped on exit; the report says so. Every local showcase e2e runs with `E2E_PORT=4392`.
  Before it, the runner confirms nothing listens on 4392 (`ss -ltnp 'sport = :4392'` prints no
  listener) and quotes the output under Task checks, because the showcase's Playwright config
  reuses any server already there.
- Every showcase build outside `test:e2e` runs `npm run package` first.
- `docs/internal/admin-design-system.md` is read before any edit under `src/lib/admin/`, the recipe
  rows, or the guidance.
- `go-conventions` is read before the one Go edit (task 1's test fixture string).
- A test that asserts a changed number is updated deliberately; the report lists each with its old
  and new value and the spec line that moved it.
- Code comments follow TSDoc; no em dash in comments; a comment never claims what its assertion
  does not prove; no process citations (plan, pass, or task numbers) in shipped comments, the
  shipped guidance, or the emitted template. The labeled report block is verbatim; counts are
  reported as found, changed, deferred.
- No release, no version bump, no publish, and no merge to `main`. No committed check or test reads
  a git ref or tag: CI checks out at depth 1.
- Never `git add -A`; commit named paths. Conventional Commits; imperative mood.

## Review focus

The inputs most likely to bite a user that the per-task tests would not exercise, each pinned to a
test or check in its owning task:

1. **A consumer whose `cairn-audit.config.json` names `dist/components/cairn-admin.css` under
   `sheet`.** After upgrading, the run must fail naming that path, never fall back silently. The
   existing "locks the named-sheet hard error" test in `src/tests/unit/audit/run.test.ts:241` stays
   green on the new candidates, and `config.test.ts`'s candidate-fallback cases name the new paths.
   Task 1.
2. **A consumer with custom admin components in `src/lib/components`.** With no config, no static
   rule reads them after the upgrade. With `static.scope` set to the documented restore form
   (`["src/routes/admin", "src/lib/components"]`), every non-`adminOnly` static rule reads both
   roots. With `static.scope` naming only `src/lib/components`, `src/routes/admin` goes unread:
   the documented trap, pinned so the docs keep warning about it. `config.test.ts` or
   `run.test.ts` pins all three (the both-roots read is run-level).
   Task 1.
3. **A pass A correction merged across the rename.** An edit to `src/lib/components/cairn-admin.css`
   on pass A must land on `src/lib/admin/cairn-admin.css`, and a new file under the old folder must
   be caught by the post-condition greps. The merge-forward protocol, step 3.
4. **A custom caller of `EditorApi.insert` mid-sentence.** The insert now stands as its own block
   with blank lines on both sides, which the reference page states. Task 2's unit table carries the
   case.
5. **`radius-scale` on the shapes the ladder exempts.** A `rounded-full` avatar with no `badge`,
   `rounded-none`, `rounded-l-none` in a join, and `rounded-t-box` on a bottom sheet pass;
   `md:rounded-lg`, `rounded-[0.55rem]`, and `rounded-(--my-radius)` flag. Task 3's fixtures.
6. **The recipe table drifting.** One guidance copy edited alone fails the sync test, and the
   template's baked copy drifting fails `check:template`. Tasks 5 and 6.

---

### Task 0: Pre-flight (conductor, no gate)

**Outcome:** The conductor verifies the start conditions and records each in the ledger. Task 0
takes no tier gate. Item 7's baseline runs in a gate agent.

1. **Pass A is closed and unmerged.** Pass A's plan ledger records its close (task 16) and names
   its head SHA; `theme-identity-a` is not merged to `main`; its head is pushed. If its ledger does
   not yet record the close, stop: pass B branches only from the closed head. Record pass A's S3
   state (done, or pending on async review) so the merge-forward protocol knows to watch.
2. **No live executor.** Per the global "one executor per worktree" rule: `pgrep -af` on
   `.claude/worktrees/theme-identity-a` and on `theme-identity-b` finds nothing (never a pattern
   that appears in the command's own text; see the `pgrep-self-match` memory), `git status
   --porcelain` in pass A's worktree is empty, and no `theme-identity-b` branch or worktree exists.
3. **Worktree:** create `.claude/worktrees/theme-identity-b` on a new `theme-identity-b` from pass
   A's closed head. Merge `theme-b-plan` (this plan's commits; it branches from `1486f3f7`, an
   ancestor of pass A's head, so it brings only this file). If pass A's head does not contain
   `origin/main`, merge `origin/main` too, with `docs/STATUS.md` resolved to `main`'s side and both
   sides of `docs/HISTORY.md` kept. Then `npm ci` and `npm ci --prefix examples/showcase`, and
   confirm with `realpath` that the showcase's `node_modules/@glw907/cairn-cms` resolves into this
   worktree (the `a-worktree-showcase-e2e-proves-mains-engine` gotcha).
4. **Re-verify the plan's facts** (one Sonnet pre-flight agent, read-only), recording each against
   its plan-time value and amending the plan where one moved:
   - The spec's acceptance grep (task 1) at plan time: 181 files, 493 lines (task 0 re-verification,
     2026-09-28: line count moved from the plan's 486 to 493; file count held). Decision 6's four
     greps: 30 lines in 11 files; 18 files, 24 lines for the `<code>`/backtick form (task 0
     re-verification: moved from the plan's "19 files plus the one `<code>` form" — `architecture.md`
     carries two hits on one file, not a 19th file); 27 lines in 16 files for the `components.md`
     link form (task 0 re-verification: moved from the plan's 28 lines in 17 files); 14
     lines for the fifth (before the rename, with `src/lib/components/` hits filtered out).
   - `src/lib/components/`: 93 entries, 103 files; `index.ts` with 22 export statements, the last
     `PreviewBanner` with its exception comment at `:40-44`; `PreviewBanner.svelte` importing
     `../sveltekit/preview.js` and carrying eight `token-colors` suppressions and no utility class.
   - `package.json`: `./components` export at `dist/components/index.*`; no `./admin` or `./public`.
   - `src/lib/audit/config.ts`: `DEFAULT_STATIC_SCOPE` at `:15-19`, the "middle root" comment at
     `:27-31`, `DEFAULT_ADMIN_SCOPE` at `:32`, `DEFAULT_SHEET_CANDIDATES` at `:37-40`,
     `DEFAULT_PALETTE_CSS_FILES` at `:51`.
   - `scripts/checks/check-invisible-craft.mjs`: `SCAN_SCOPE` at `:49-55`, `ADMIN_SCOPE` at
     `:67-71`, `CSS_FILES` at `:81`. `scripts/build/admin-css.input.css`: `@source` at `:14`,
     `@import` at `:94`. `src/lib/admin-sources.css`: `@source "."` (no folder path; nothing to
     rename there, contrary to the fold record's file list).
   - `scripts/checks/reference-coverage.mjs`: `SUBPATH_SETTINGS` `/components` at `:561`, the
     props check at `:844-880`. `scripts/checks/gate-tier.mjs:99`. `check-tool-heuristics.mjs:39`.
     `check-surface-leaks.json:17` and `check-surface-leaks.mjs:280`.
     `check-symbols-allowlist.mjs:134`. `custom-surface-budget.json:4-5`.
     `cm-internals-allowlist.json:9-12`. `check-admin-prose.mjs:23`. `eslint.config.js:82`.
     `vitest.config.ts:14-15`. `build-admin-css.mjs:15-16`. `build-mockup-css.mjs:17`.
   - `tool/internal/doctor/check_mount_test.go:20` imports `@glw907/cairn-cms/components` in a
     fixture string; the Go heuristic keys on the name `CairnAdminShell`, never the path.
   - The audit: 17 static and 17 rendered rules; `run.test.ts`'s `NUMBER_WORDS` (`seventeen`,
     `thirty-four`) and its `toHaveLength(17)`; `docs/reference/cairn-audit.md`'s "Seventeen rules
     run" and "All 34 registered rules"; the admin-screens tier map ("thirty-four rules ...
     seventeen static, fifteen error tier and two advisory"). `stock-default-hazards.ts`: five
     arms, the `WATCH` at `:107-111`, `GUARDED_RETIREMENT_PROMOTION_VERSION` at `:45`.
     `RATIFIED_NORMS`: twelve rows over eight roles, at `norms.ts:208-282`. `formatNormsQuery` in
     `norms.ts`.
   - The ratified vocabulary pass A left: `admin-design-system.md`'s corner ladder and emphasis
     ladder, and `/admin/theme-kit/+page.svelte` (164 lines, no `<style>` block, `<h1
     class="type-title font-[550]">`; task 0 re-verification, 2026-09-28: moved from the plan's
     "159 lines at plan time" and `font-bold` — pass A's late commits `3a2c0f21` and neighbors gave
     the fixture's heading the ratified 550 weight after this plan's verification base).
   - The insert: `insertAtCursor` at `MarkdownEditor.svelte:1133-1143`, prefixing `\n\n` when the
     caret is past 0 and appending nothing; `serializeComponent` at
     `src/lib/render/component-grammar.ts:44`; the e2e's opening-line-only assertion at
     `examples/showcase/e2e/golden-path.spec.ts:449-453`; `EditorApi.insert`'s row in
     `docs/reference/components.md:680`.
   - The guidance: `SKILL.md` sizes (plan time: `cairn-admin-screens` 7,027 characters, about
     1,757 estimated tokens; `cairn-extend` about 1,037; `cairn-consult` about 548; budget 3,500);
     the 13 `svelte`/`html` fences under `skills/**` (none under `claude/agents/**`), the two that
     fail to parse after decision 14's normalization (`exemplar-detail.md:100`,
     `exemplar-list.md:177`), the one retired pattern in a fence (`badge-ghost` at
     `exemplar-detail.md:115`), and no fixed radius in any fence; `daisyui-first.md`'s
     "Segmented-control contrast" section describing the pinned `.btn-active` ring pass A retired;
     no `src/lib` placement line in `cairn-admin-screens` or `cairn-extend` (task 5 adds one).
   - The guarded-retirement arm's four findings on `EditPage.svelte` (decision 14's exemption; task
     0 re-verification, 2026-09-28: not confirmable by static grep alone — `EditPage.svelte` carries
     the `cairn-btn-guarded` pattern extensively and no literal `badge-ghost`, consistent with the
     exemption story, but the exact count of four findings needs a live `cairn-audit` run against
     the file, which task 0 did not run; task 1's implementer confirms the count when it re-proves
     the audit).
   - `examples/showcase/src/admin.css`: one `@source "./routes/admin"` and utilities imported
     with `source(none)` (decision 25).
   - **Pass A's late commits.** List the files pass A changed between `1486f3f7` (this plan's
     verification base) and its closed head, and re-verify every plan fact that sits in one of
     them, among them the theme-kit fixture's line count and its exclusion from the emitted
     template (pass A's `cfab5c4c`).
   - `examples/showcase/playwright.config.ts` honors `E2E_PORT` (pass A's decision 14).
   - User scope: `grep -rln` for the old paths under `~/.dotfiles/claude/.claude/` finds only
     `skills/cairn-release/SKILL.md:107` and a dated record (decision 24).
   - The three `0.98.0` promotion constants and their names (decision 13), and `package.json` at
     `0.97.0`.
   - `docs/reference/cairn-audit.md:73` (the static count sentence, which task 3 changes) and
     `:275` (the rendered count sentence, which it must not).
5. **The engine string:** run `node scripts/checks/gate-tier.mjs --range HEAD~1..HEAD --pin engine`
   and confirm it prints the engine string under Gates.
6. **The freeze rule:** read the narrative-arm rule in `CLAUDE.md` on the branch and record it.
7. **Baseline gate:** one gate agent runs `cairn-run-gate '<the engine string>'` in the worktree
   and returns the `gate exit:` line and the tail. The conductor quotes it to task 1's reviewer as
   task 0's gate evidence. A red that the `main` merge caused is fixed on this branch by one Sonnet
   dispatch before task 1; any other red, or a stall in the serialized component run on the rerun,
   stops the pass with one message to Geoff.
8. **Dependency state** (decision 22): `npm outdated` at the root, `examples/showcase`, and each
   `packages/*` manifest, recorded in the ledger. No bump.
9. **The draft PR and the inherited CI set.** After item 7's green baseline, the conductor pushes
   `theme-identity-b` and opens its PR against `main` as a draft. One Haiku probe reads that SHA's
   CI; its failures, each named with its owner (pass A, or the `main` merge), are the inherited
   expected-red set, recorded before task 1 starts.
10. **Counter:** record spend through task 0.

**Acceptance:** the ledger carries items 1 to 10, and the plan is amended and committed where item
4 moved a fact. A stop condition in item 1, 2, or 7 halts the pass with one message to Geoff.

---

### Task 1: The rename, `./public`, and the Names section

**Pass class:** `sweep`. **Spec:** "Names"; "The rename, first and alone"; "The audit scopes";
"Consumers must" (for the paths it names); the fold record's fifth fold, "Trim", the rename's file
list. Decisions 1 to 9, 23 (the restore form, for `cairn-audit.md` and `config.test.ts`), and 25.
**Reviewer:** `claude-opus-5-5` (segment A's `reviewerModel`); `config.ts`,
`reference-coverage.mjs`, `gate-tier.mjs`, and the new barrel test are held at the `engine-logic`
bar (block on behavior defects and unmet outcomes), every other file at the `sweep` grep bar. The
task's `criteria` says so.

**Files:** `git mv src/lib/components src/lib/admin` (every file); a new `src/lib/public/`
holding `PreviewBanner.svelte` (moved) and a new `index.ts`; `package.json` (exports); every file
the five greps name, among them `src/lib/admin-toolkit/**` and `src/lib/reproductions/**` imports,
`src/lib/sveltekit/content-routes-shell.ts`, `src/lib/audit/config.ts` and the four audit
comments that name the old folder (`color.ts`, `screen-anatomy.ts`, `stripe-trim-parity.ts`,
`unlayered-font-clobber.ts`),
`src/tests/**`, `vitest.config.ts`, `eslint.config.js`, `scripts/build/{admin-css.input.css,build-admin-css.mjs,build-mockup-css.mjs,update-admin-sheet-inventory.mjs}`,
`scripts/checks/{check-invisible-craft.mjs,check-admin-prose.mjs,check-cm-internals.mjs,cm-internals-allowlist.json,check-surface-leaks.mjs,check-surface-leaks.json,check-symbols-allowlist.mjs,check-tool-heuristics.mjs,custom-surface-budget.json,gate-tier.mjs,reference-coverage.mjs}`,
`examples/showcase/{cairn-audit.config.json,src/admin.css,src/routes/admin/**,src/routes/(site)/preview/[token]/+page.svelte,src/theme/theme.css}`,
`claude/snippets/cairn-audit.config.json`, `claude/CLAUDE.md`,
`skills/cairn-admin-screens/references/exemplar-list.md`, `tool/internal/doctor/check_mount_test.go`,
`git mv docs/reference/components.md docs/reference/admin.md`, a new `docs/reference/public.md`,
`docs/reference/{README.md,cairn-audit.md,core.md,islands.md,sveltekit.md,admin-routes.md,admin-toolkit.md,auth-store.md}`,
`docs/internal/**` pages the greps name (`admin-design-system.md`, `public-design-system.md`,
`pass-gate-tiers.md`, `src-lib-map.md`, `code-idioms.md`, `README.md`, and the rest the greps
list, with `docs/internal/api-surface.md` regenerated, not hand-edited), `docs/internal/facts/*.md`
(citations repointed), `docs/internal/docs-register.md` (the Names section),
two new Vale rules `.vale/styles/Cairn/{ComponentNames.yml,ComponentNamesRetired.yml}`, the frozen pages the greps
name (`docs/extend/build-a-site-by-hand.md`, `docs/extend/share-a-draft-preview.md`,
`docs/extend/architecture.md`), `CLAUDE.md`, `CONTRIBUTING.md`, `ROADMAP.md` (path mentions of the
live tree only), and `templates/waymark/**` through `npm run emit:template`.

**Outcome:**
- **The admin folder.** Every file under `src/lib/components/` lives under `src/lib/admin/` with
  its content unchanged except path references. `svelte-package` emits it as `dist/admin/`, and
  the admin build writes the compiled sheet to `dist/admin/cairn-admin.css` beside
  `dist/admin/fonts/`. `@glw907/cairn-cms/admin` replaces `@glw907/cairn-cms/components` in
  `package.json` with the same conditions (`types`, `svelte`, `default`), and `./components` is
  gone. The barrel's header comment calls it the `/admin` barrel and drops the `PreviewBanner`
  exception paragraph; the `check:tool-heuristics` `WATCH` comment stays on the `CairnAdminShell`
  export and its watch points at `src/lib/admin/index.ts`.
- **The public folder.** `src/lib/public/PreviewBanner.svelte` is the moved file, unchanged except
  paths (its styling stays until pass C). `src/lib/public/index.ts` exports `PreviewBanner` with a
  header comment stating the barrel's rule: every built-in public component that renders styled
  markup, with `CairnHead` staying at `./delivery/head`. `package.json` exports `./public` with the
  same three conditions. The showcase's and, through `emit:template`, the template's preview route
  import `PreviewBanner` from `@glw907/cairn-cms/public`.
- **The audit's defaults** follow decision 1: `DEFAULT_STATIC_SCOPE` and `DEFAULT_ADMIN_SCOPE` are
  `src/routes/admin`, `src/lib/admin`, `src/lib/admin-toolkit`, with `src/lib/admin`'s place in
  `DEFAULT_ADMIN_SCOPE` alone conditional on decision 1's measurement; `DEFAULT_SHEET_CANDIDATES` names `dist/admin/cairn-admin.css` and
  `node_modules/@glw907/cairn-cms/dist/admin/cairn-admin.css`; `DEFAULT_PALETTE_CSS_FILES` names
  `src/lib/admin/cairn-admin.css`. The comments above them are rewritten to the new reach, and so
  are the two rule comments decision 9 names. The showcase's and the snippet's `sheet` entries
  name `dist/admin/cairn-admin.css`.
- **The gates** follow decisions 3 to 5: the invisible-craft gate, the prose gate, ESLint, the
  admin sheet's `@source`, the classifier, and the reference-coverage props check all name the new
  folders; every other check the greps list points at the new path; `check-surface-leaks.json`'s
  standing entry names `/admin`.
- **The Go fixture.** `check_mount_test.go`'s fixture imports `CairnAdminShell` from
  `@glw907/cairn-cms/admin`; its test still passes, since the heuristic reads the component name.
- **Reference pages.** `docs/reference/admin.md` is the renamed page, titled for
  `@glw907/cairn-cms/admin`, with its `PreviewBanner` section ("Public preview", `:819-868` at plan
  time) moved to the new `docs/reference/public.md`, which opens with the barrel's rule and
  documents `PreviewBanner`'s props and override properties as the old page did. Every link to the
  old page or its anchors points at the new page that holds the section. `docs/reference/README.md`
  lists both pages. `cairn-audit.md`'s configuration table carries the new `static.scope` and
  `static.adminScope` defaults and the `sheet` example path, and the page states decision 2's
  named-root sentence once, with decision 23's restore form (the default roots the site has plus
  `src/lib/components`; a configured list replaces the defaults; a configured root the tree lacks
  fails the run).
- **The showcase admin sheet** gains `@source "./lib/admin";` (decision 25), and its compiled
  admin CSS is byte-identical before and after.
- **The Names section.** `docs/internal/docs-register.md`'s Names section gains the spec's two-axis
  grid (admin or public, built-in or custom), each cell's home, rulebook, audit scope, and
  guidance as the spec's table gives them, the noun "component" with its surface adjective, "site"
  as the whole project, and "custom admin screen" for a whole route; its "Enforcement and scope"
  paragraph names the two new Vale rules (decision 8); plus the barrel rule
  (`./admin` exports only admin components; `./public` exports every built-in public component that
  renders styled markup; `./admin-toolkit` keeps its name). The two new Vale rules carry decision
  8's tokens, and the reference pages it names use "custom public component".
- **Every other live mention** (the internal docs, `CLAUDE.md`, `CONTRIBUTING.md`, `claude/CLAUDE.md`,
  the shipped exemplar, the showcase theme comment, the frozen extend pages as deficiency fixes)
  names the new path or subpath. Records keep the old paths (the spec's excluded list).
- **The surface.** `docs/internal/api-surface.md` is regenerated with the surface regeneration
  command and shows `/admin` and `/public` in place of `/components`.

**Acceptance:**
- These five greps each print nothing outside the rename allowlist (decision 6), with the spec's
  exclusion list plus `ROADMAP.md` and `docs/STATUS.md`:
  ```sh
  X=(':!docs/internal/history' ':!docs/internal/record' ':!docs/internal/design' ':!docs/superpowers' ':!docs/HISTORY.md' ':!CHANGELOG.md' ':!docs/extend/migration-notes.md' ':!docs/internal/engine-rulings.md' ':!ROADMAP.md' ':!docs/STATUS.md')
  git grep -nE "lib/components|dist/components|cairn-cms/components|['\"]\.?/components['\"]" -- "${X[@]}"
  git grep -n '\.\./components/' -- src/lib
  git grep -nE '(`|<code>)\.?/components(`|</code>)' -- "${X[@]}"
  git grep -n 'components\.md' -- "${X[@]}"
  git grep -nE "(^|[^-a-z_/.])(\./)?components/|'components'" -- src scripts examples/showcase/src examples/showcase/e2e docs/internal/src-lib-map.md ':!scripts/build/daisyui-classes.mjs' ':!src/tests/unit/daisyui-classes.test.ts'
  ```
  and `git grep -n PreviewBanner -- src/lib/admin` prints nothing. The report quotes each command
  with its output, names the allowlist item for each remaining line, and states the plan-time
  counts it cleared.
- `git grep -n "@glw907/cairn-cms/public" -- examples/showcase/src/routes templates/waymark/src/routes`
  prints exactly the two preview routes (the spec's positive import check).
- `package.json` exports `./admin` and `./public` and no `./components`; the new barrel test
  (decision 7) passes; `test ! -e src/lib/components` succeeds; the renamed
  `admin-barrel-prune.test.ts`'s demoted keys name `./admin/...` paths.
- Decision 1's measurement: the report quotes `check:invisible-craft`'s findings and suppressed
  counts before and after the move, identical, with zero unsuppressed findings from
  `motion-property`, `motion-vocabulary`, and `motion-hover-gate` on `src/lib/admin`, and states
  whether `DEFAULT_ADMIN_SCOPE` took the root.
- The compiled admin sheet's class inventory is identical before and after (the report states the
  inventory diff, empty or each safelisted class), and `admin-sheet-inventory.test.ts` passes.
- `config.test.ts` covers the new defaults, and `config.test.ts` or `run.test.ts` covers Review
  focus 2's three cases: the documented restore form (`["src/routes/admin",
  "src/lib/components"]`) brings both roots under every non-`adminOnly` static rule, and a config naming only `src/lib/components` leaves
  `src/routes/admin` unread. `run.test.ts:241`'s named-sheet hard error passes on the new
  candidates (Review focus 1).
- The showcase's compiled admin CSS is byte-identical before and after decision 25's `@source`
  line; the report quotes the `cmp`.
- A scratch file (never committed) containing each new Vale token, one of them capitalized at a
  sentence start, raises the expected `Cairn.ComponentNames` or `Cairn.ComponentNamesRetired`
  alert; the report quotes `vale` on it. `npm run check:vale` is green.
- `gateTier: "targeted"`, `gate` the rename string (Gates), preceded by the port check quoted under
  Task checks. Task checks, each quoted with its `gate exit:` line: the tool gate;
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:tool-heuristics && npm run test:emit'`; the
  template check after `npm run emit:template`. A missing or red task check is blocking.

---

### Task 2: The insert stops fusing its closing fence

**Pass class:** `engine-logic`. **Ruling:** Geoff, 2026-09-27 (ROADMAP Now, "Inserting a component
fuses its closing fence onto the text after the caret"; the designer friction log's F12).
Decision 10. Independent of tasks 3 to 6.

**Files:** `src/lib/admin/MarkdownEditor.svelte`, one new internal module under `src/lib/admin/`
for the pure padding function (its name is the implementer's; it is exported from no barrel), a
new unit test beside the existing editor unit tests under `src/tests/unit/`,
`examples/showcase/e2e/golden-path.spec.ts`, and `docs/reference/admin.md` (the `EditorApi.insert`
row).

**Outcome:**
- `insertAtCursor` separates the inserted text from adjacent non-blank text by exactly one blank
  line on each side, under decision 10's rule, in both its mounted path and its pre-mount fallback,
  through one pure function. The caret lands at the end of the block's closing fence.
- The golden-path e2e asserts the whole inserted block: with the caret at the start of a body that
  already has text, inserting the callout yields every line of the serialized directive (its
  four-colon opening line, its content, its closing fence), then a blank line, then the body's
  first line unchanged. The existing "the component round-trips" test stays green unmodified.
- The reference row for `EditorApi.insert` says it inserts a block at the cursor, separated from
  adjacent text by a blank line where text touches it.

**Acceptance:**
- A table-driven unit test over the pure function covers, at least: an empty document; the caret
  at the document start before body text (the F12 repro); the caret mid-line with text on both
  sides; the caret at a line's end with a non-blank line below; the caret on a blank line already
  between two paragraphs (no double blank line); the caret at the document's end after text; the
  caret on an empty line directly under a paragraph line; a caret beside a line holding only
  whitespace (treated as blank); the pre-mount fallback's case, the caret at the end of a non-empty
  `value`; and a caller's inline text inserted mid-sentence (Review focus 4). Each row asserts the
  resulting document and the caret offset. The reviewer confirms both `insertAtCursor` paths call
  the pure function.
- Test-first: the report quotes the new e2e assertion failing against the unfixed editor, then
  passing.
- The editor's existing component tests pass unmodified.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line:
  `E2E_PORT=4392 npm --prefix examples/showcase run test:e2e -- golden-path.spec.ts` (heavy,
  preceded by the port check); the idioms and comments checks.

---

### Task 3: `radius-scale` and the retired-patch arms

**Pass class:** `engine-logic`. **Spec:** parent spec "G2: easy for agents" (the `cairn-audit`
rules bullet), "Corners", "The markup sweep"'s post-condition. Decisions 11 to 14.

**Files:** a new `src/lib/audit/rules/static/radius-scale.ts`,
`src/lib/audit/rules/static/index.ts`, `src/lib/audit/rules/static/stock-default-hazards.ts`, new
and existing unit tests under `src/tests/unit/audit/rules/` with fixtures, two new unit tests
under `src/tests/unit/audit/` (`own-tree-and-guidance.test.ts` for decision 14 and
`promotion-versions.test.ts` for decision 13), `src/tests/unit/audit/run.test.ts`,
`docs/reference/cairn-audit.md` (the static count sentence at `:73` and "All 34" at `:31`; the
rendered count sentence at `:275` does not change), `skills/cairn-admin-screens/SKILL.md` (the tier
map and its count sentence), `skills/cairn-admin-screens/references/exemplar-detail.md` and
`exemplar-list.md` (decision 14's fence repairs and the `badge-ghost` line), and
`templates/waymark/**` through `npm run emit:template`.

**Outcome:**
- `radius-scale` is registered after `gap-scale`, at `advisory` tier, behaving as decision 11
  states, each message naming its replacement and the `0.99.0` promotion.
- `stock-default-hazards` gains the three arms decision 12 states, each `advisory`, each message
  naming its replacement (or, for `shadow-none`, that nothing replaces it) and the `0.99.0`
  promotion. The five existing arms do not change.
- Decision 14's test proves cairn's own admin tree and the shipped guidance's fences report zero
  `radius-scale` findings, zero new-arm findings, and zero error-tier `stock-default-hazards`
  findings, with the guarded-retirement exemption stated in its comment. The two unparseable
  fences are repaired and the `badge-ghost` fence line teaches the quiet `StatusChip`.
- Decision 13's tripwire is green on `0.97.0` and names every constant it found.
- `docs/reference/cairn-audit.md`: a `radius-scale` row, the `stock-default-hazards` row naming the
  eight arms and which three are advisory until `0.99.0`, the rule-count sentences ("Eighteen rules
  run: fifteen error tier, and three advisory"; "All 35 registered rules"), and the `radius-scale`
  coverage limit (class tokens only). The admin-screens tier map lists `radius-scale` under "Static,
  advisory tier", its count sentence reads thirty-five rules with eighteen static (fifteen error,
  three advisory), and its advisory paragraph states each advisory rule's own promotion version.
- `run.test.ts` counts eighteen static rules, and its `NUMBER_WORDS` knows `eighteen` and
  `thirty-five`.

**Acceptance:**
- Fixtures, each raising exactly the named finding with the named replacement: `rounded-lg` on a
  `btn` (names `rounded-field`); `rounded-xl` on a `card` (`rounded-box`); bare `rounded` on a
  plain `div` (the three-role sentence); `md:rounded-lg`; `rounded-[0.55rem]`;
  `rounded-[var(--radius-field)]` (names `rounded-field`); `rounded-(--radius-field)` (names
  `rounded-field`); `rounded-(--my-radius)` (the three-role sentence); `rounded-t-2xl`;
  `badge rounded-full` (`rounded-selector`); one element carrying `rounded-lg md:rounded-xl`
  (exactly two findings). Passing fixtures, each raising nothing: `rounded-field`, `rounded-t-box`,
  a `rounded-full` avatar with no `badge`, `rounded-none`, `rounded-l-none` on a `join-item`.
- One table test over decision 11's class-to-role mapping: `badge`, `btn`, `input`, `select`,
  `textarea`, `card`, `modal-box`, and `dropdown-content`, each with `rounded-lg`, names its role
  class.
- Every `radius-scale` and new-arm finding's message contains `0.99.0`, asserted per finding.
- Arm fixtures: `btn bg-neutral text-neutral-content` (names `btn btn-neutral`);
  `btn hover:bg-[var(--cairn-ink-hover)]`; `btn bg-primary/10 text-primary` (names
  `btn btn-soft btn-primary`); `btn shadow-none` and `btn sm:shadow-none`. Silent: `btn btn-neutral`,
  `btn btn-soft btn-primary`, and a `span` carrying `bg-primary/10 text-primary` (decision 12's
  non-button case). The parent spec's two full recipes each raise exactly one finding: `btn
  border-transparent bg-neutral text-neutral-content shadow-none hover:bg-[var(--cairn-ink-hover)]`
  names `btn btn-neutral`, and `btn border-transparent bg-primary/10 text-primary shadow-none`
  names `btn btn-soft btn-primary`. Each arm finding's tier is `advisory`, asserted per finding.
- The existing `stock-default-hazards.test.ts` cases pass unmodified.
- Decision 14's test passes and its mutation proof is quoted: planting `rounded-lg` on one engine
  button, a `btn shadow-none` inside one guidance fence, and an unclosed element in one fence each
  fails it (the last naming the file and line).
- Decision 13's tripwire mutation proof is quoted: setting `package.json`'s version to `0.98.0` in
  the working tree fails it naming the three `0.98.0` constants; reverted after.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line: the package check (the
  tier map binding); the audit wrappers; the idioms and comments checks; the template check after
  `npm run emit:template`.

---

### Task 4: The recipe source and the norms print

**Pass class:** `engine-logic`. **Spec:** parent spec "G2", "Shipped guidance" (the recipe field
beside `RATIFIED_NORMS`, "what `cairn-audit norms <role>` prints"). Decisions 15 and 16.

**Files:** `src/lib/audit/norms.ts`, `src/lib/audit/index.ts` (if the bin needs the new names),
the norms unit tests under `src/tests/unit/audit/`, and `docs/reference/cairn-audit.md` (the norms
section).

**Outcome:**
- `ROLE_RECIPES` and `RECIPE_MODEL` exist beside `RATIFIED_NORMS` with decision 15's rows and
  coverage.
- `cairn-audit norms <role>` prints a `recipe:` line under each role a row names; a role with no row
  prints as today.
- The reference page's norms section shows one example of the line.

**Acceptance:**
- A unit test asserts every ratified role has exactly one row and every row's `role`, when set, is a
  `NORM_ROLES` id.
- `formatNormsQuery`'s tests cover a role with a recipe line and one without; the existing
  expectations pass unmodified.
- After `npm run package`, `node dist/audit/bin.js norms button-primary` prints the recipe line;
  the report quotes the output.
- The typo check (decision 15): every class token in each row's Write string appears in the
  committed admin sheet inventory or the theme-kit fixture's source; its mutation proof (one
  misspelled token) is quoted.
- `git diff --exit-code src/lib/audit/norms-manifest.json` exits 0; the report quotes it.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line: the idioms and comments
  checks. No local `norms:check` (Gates).

---

### Task 5: The shipped guidance and its exemplar

**Pass class:** `docs`. **Spec:** parent spec "G2", "Shipped guidance" (the one-sentence model, the
table, the tier-map counts, the exemplar, the extension reviewer's new checks). Decisions 14 (the
fence rule), 17, and 18.

**Files:** `skills/cairn-admin-screens/SKILL.md`, a new
`skills/cairn-admin-screens/references/exemplar-kit.md`,
`skills/cairn-admin-screens/references/README.md`,
`skills/cairn-extend/references/daisyui-first.md`, `claude/agents/cairn-extension-reviewer.md`, any
other shipped guidance file under `skills/` or `claude/` that teaches a retired recipe or a fixed
radius in its prose, and `templates/waymark/.claude/**` through `npm run emit:template`.

**Outcome:**
- Each of the three guidance files carries `RECIPE_MODEL` verbatim and the "Write this, get this"
  table with `ROLE_RECIPES`' rows in source order (decision 17).
- `cairn-extension-reviewer.md`'s "What it checks" also checks for a fixed Tailwind radius and for
  each retired patch, naming `radius-scale` and `stock-default-hazards` as the audit's own net.
- `daisyui-first.md` corrects what pass A's theme made wrong: its "Segmented-control contrast"
  section describes the selected segment pass A ratified (the neutral wash, weight 600, and the
  state hairline on all five selected forms) in place of the retired pinned ring, and every other
  section is checked against `admin-design-system.md` as pass A left it.
- `SKILL.md` points at `references/exemplar-kit.md` for the plain-class kit; the exemplar follows
  decision 18.
- `cairn-admin-screens/SKILL.md` and `daisyui-first.md` each gain one line saying where a custom
  admin component lives: under `src/routes/admin` or `src/lib/admin`, the roots the audit reads by
  default and the site's admin sheet compiles (decision 25). The spec's Names grid gives that
  home; without the line, a probe that puts a shared component in `src/lib/components` passes an
  audit that never read it.
- No shipped guidance file recommends `bg-neutral` on a `btn`, the Publish tint, `shadow-none` on a
  `btn`, a fixed Tailwind radius, a `rounded-full` chip, or `badge-ghost`. In a fence none may
  appear at all (decision 14's test is the check). In prose, a code span may name one as a pattern
  to flag or avoid, as the extension reviewer's checks must; the report quotes
  `git grep -nE "badge-ghost|bg-primary/10|shadow-none|bg-neutral|rounded-(xs|sm|md|lg|xl|[234]xl|\[|\()|rounded-full" -- skills claude`
  and classifies each hit as a flag-or-avoid mention.

**Acceptance:**
- Every `SKILL.md` stays under the 3,500-token budget; the report lists each skill's estimated
  tokens before and after.
- Decision 14's test still passes (the guidance fences carry no patch).
- `gateTier: "targeted"`, `gateLane: "light"`, `gate` the docs string (Gates). Task check, quoted
  with its `gate exit:` line: the guidance tests (Gates), which run decision 14's test. A missing
  or red task check is blocking.

---

### Task 6: The sync test

**Pass class:** `engine-logic` (scoped gate; it changes no file under `src/lib`). **Spec:** parent
spec "G2" ("A test asserts that each guidance table carries the same rows and that the exemplar's
markup matches the fixture route. It fails when one copy is edited alone."). Decision 19.

**Files:** a new `src/tests/unit/guidance-recipes-sync.test.ts`.

**Outcome:** The test holds decision 19's four assertions against the real files: the model
sentence and the table rows in all three guidance files, the exemplar's fences against the fixture
route, and one recipe row per ratified role.

**Acceptance:**
- The test passes on the tree.
- Its mutation proof is quoted, each mutation reverted after: one row edited in `daisyui-first.md`
  alone; one row deleted from `cairn-extension-reviewer.md` alone; `RECIPE_MODEL` reworded in
  `norms.ts` alone; one class changed on a fixture-route line an exemplar fence quotes; the `Write
  this, get this` heading removed from one copy. Each fails the test with a message naming the
  file and the row, fence, or heading, and a mutation that breaks two copies reports both.
- `gateTier: "targeted"`, `gateLane: "light"`, `gate` the sync string (Gates).

---

### S1: Probe 1 (conductor-led)

**Outcome:** Decision 20's probe runs once on the segment C head. The conductor dispatches the
setup agent (the emitted template outside the repo, installed and committed, then the headless
`claude -p` probe with the one-line brief), then the audit agent. The audit agent serves the
probe site's build on port 4391 through `BASE_URL`, stops it on exit, and returns the static and
rendered counts on the probe's files and page by rule and tier, the list of files `git ls-files
-mo --exclude-standard` shows the probe created or edited with each file's scanned root, whether the
rendered run visited `/admin/probe`, and a separate list of any finding outside the probe's
files. The conductor records all of it in the ledger, with the probe's stated limit, and the setup
agent deletes the probe dir.

**Acceptance:** zero error findings and zero `radius-scale` or retired-patch findings on the probe's
files and page, in both modes; the probe's changed-file list nonempty and containing
`src/routes/admin/probe/+page.svelte`; every probe `.svelte` file inside a scanned root;
`/admin/probe` in the rendered run's pages. On a failure, the ledger names the guidance gap each failing finding (or
unscanned file) points at, and task 7 runs (decision 21).

### Task 7: Guidance fix (conditional)

**Pass class:** `docs` (or `engine-logic` when a close-review finding touches code). Dispatched
when S1 fails, and once more at the close if its review returns findings. **Outcome:** each gap S1
named is fixed on the shipped page that should have prevented it, and decision 17's rows change
only through `ROLE_RECIPES` plus all three copies, so task 6's test stays green. After an S1 fix, a
fresh headless probe re-runs S1 once (decision 21). **Acceptance:** the docs string green
(`gateTier: "targeted"`, `gateLane: "light"`); task check, quoted with its `gate exit:` line: the
guidance tests (Gates), which run both decision 14's test and the sync test; and the re-run's
counts recorded.

---

### Task 8: Close

**Outcome:** First, `code-simplifier:code-simplifier` runs once over the scope named under
`code-simplifier` and commits. Then the full gate on that commit, in one gate agent:
`npm run check:close && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm --prefix examples/showcase run test:unit`,
then the tool gate. The consumer-build proof is CI's `e2e` run on the pushed head. Then the review
fan-out, in parallel: `svelte-reviewer` (the editor insert and the `PreviewBanner` move and
barrel) and one `prose-voice-reviewer` read of the changed shipped guidance against the
agent-guidance standard the `writing-voice` skill routes to. No separate Opus read of the audit
code (ruling F1): tasks 3 and 4's Opus `diff-reviewer` reads already held it to the parent spec's
"G2" and "Corners" sections. Findings fold through one task 7 run in `engine-logic` or `docs`
class as the finding requires.

Then one Sonnet agent drafts the close and commits it; one Opus `diff-reviewer` reads that diff,
and the drafter folds its findings once. Hard cap about 0.6M tokens for draft, review, and fold.
The cairn-pass ritual:
- **`CHANGELOG.md`** under `## Unreleased` (created if absent), pass B's entry: the rename and the
  new `./public` subpath, with this `Consumers must:` line verbatim (decision 23): "Consumers
  must: import admin components from `@glw907/cairn-cms/admin` instead of
  `@glw907/cairn-cms/components`; import `PreviewBanner` from `@glw907/cairn-cms/public`; move any
  custom admin components out of `src/lib/components` into `src/lib/admin` and add
  `@source "./lib/admin";` to the site's admin stylesheet, or keep them there and set
  `static.scope` in `cairn-audit.config.json` to the default roots the site has plus
  `src/lib/components` (for example `["src/routes/admin", "src/lib/components"]`), since a
  configured list replaces the defaults and a configured root that does not exist fails the run;
  and change any path into `dist/components/` to `dist/admin/`, whether an audit config's `sheet`
  (including a config passed with `--config`) or a site script names it." It also names the
  audit's new default roots and the reach narrowing with Geoff's A1 ruling (decision 9),
  `radius-scale` and the three arms at advisory tier with their `0.99.0` promotion, the norms
  print's recipe line, the shipped guidance's table, placement line, and exemplar, and a "Fixed"
  line for the insert.
- **`docs/extend/migration-notes.md`** only, under `## Unreleased`: the same four actions, the old
  subpath named, decision 2's named-root sentence, decision 9's narrowing and its restore form,
  and `DEFAULT_ADMIN_SCOPE`'s new root with the three motion rules it brings to a site's
  `src/lib/admin`. `upgrade-cairn.md` is a version-free procedure whose steps already send a
  reader to the `Consumers must:` lines and the guidance refresh, so it takes no per-version text
  (and it sits outside the rename allowlist).
- **Facts** in `docs/internal/facts/`: the rename, the `./public` subpath and its barrel rule, the
  audit's default roots and the restore form, `radius-scale` and the arms and their tier, the
  promotion tripwire, the norms recipe line, the insert's padding (the editors arm too, since an
  author sees it), and one bullet per frozen-page deficiency task 1 fixed
  (`docs/extend/build-a-site-by-hand.md`, `share-a-draft-preview.md`, `architecture.md`), as the
  Global constraints require. `check:facts` green.
- **Reference pages:** verified current (tasks 1 to 4 wrote them); `check:reference` green.
- **`check:surface`:** verified current (task 1 regenerated `api-surface.md`); the full gate runs it.
- **`ROADMAP.md`**: the F12 Now entry removed; the "Theme identity, passes A, B, and C" entry says
  pass B is finished on `theme-identity-b` (pass C removes the entry); the promotion of
  `radius-scale` and the arms at `0.99.0`, noting that `promotion-versions.test.ts` enforces it;
  and any gap S1 left open.
- **`docs/internal/docs-friction-log.md`** triaged, complete-or-move.
- **No dotfiles edit** in this pass (decision 24; pass C's close repoints `cairn-release`).
- **`docs/HISTORY.md`**: the pass entry (what landed, what the gates caught, spend against the 19M
  ceiling, and what a later pass would be wrong to rediscover: the spec grep's four blind forms
  and the rename allowlist, `static.scope` replacing rather than adding, the reach narrowing and
  its A1 ruling, `PreviewBanner`'s kept coverage, the merge-forward across a rename, the guidance
  fences the audit parser could not read, and the promotion tripwire).
- **The plan's post-mortem** appended here, with the pass score (tokens against the ceiling,
  planning misses, execution sittings).

**The branch close (conductor, after the close's review):**
1. Run the merge-forward protocol a last time (pass A's head).
2. `git fetch` and merge `origin/main` into `theme-identity-b` if `main` moved; resolve STATUS to
   this branch's close text and keep both sides of HISTORY.
3. Re-run task 1's five greps (outside the rename allowlist) and `test ! -e src/lib/components`,
   then `check:facts`, `check:reference`, `check:docs`, `check:vale`,
   `check:rulings-format`, and `check:template` on the merged head (one light gate agent), and let
   CI go green on the pushed head; one Haiku probe reads it.
4. **STATUS** on this branch, present tense, at or under 60 lines: pass B finished and unmerged,
   its head and base SHAs and merge commits; "What pass C receives" verified, with its topology
   note (pass A unmerged; pass C's header paragraph "Branch topology" still says pass A merged to
   `main`, so pass C's conductor reads it under task 0 item 1's topology: this branch contains
   pass A's closed head and a `main` merge); the `0.98.0` question the tripwire forces at pass C's
   owner sitting (ruling F2); the dotfiles repoint and the cairn-pub redirect carried to pass C;
   any open S1 gap; and pass C's
   resume prompt naming `theme-c-plan`'s plan and this branch as its base. The conductor then
   records the same next action on `main`'s STATUS in one `docs(status)` commit, after the
   executor check, the way this repo records stream state there.
5. The draft PR stays open and unmerged. The worktree stays for pass C to branch from.

**Acceptance:** the full gate green on the branch before the `main` merge and CI green on the
final pushed head; the five rename greps print nothing outside the rename allowlist on the final
head; STATUS at or under 60 lines;
`check:facts`, `check:reference`, `check:docs`, `check:vale`, `check:rulings-format`, and
`check:template` green on the final head; the pass score recorded.

## Ledger

(written by the conductor at each segment boundary)

### Task 0: Pre-flight (2026-09-28, conductor)

1. **Pass A closed and unmerged, verified.** Pass A's plan ledger records its close at task 16;
   the ledger's own close entry says "the closed head is the commit that adds this entry," which
   is `a9bef091`, but a later fold commit, `7e64a388`, sits on top of it on `theme-identity-a`
   (its own message: "fold the close review into pass A's changelog and ledgers") and is the true
   closed head — recorded here per the conductor's brief. `theme-identity-a` is not merged to
   `main` (`git merge-base --is-ancestor origin/main origin/theme-identity-a` fails) and its head
   is pushed. S3 (Geoff's before-and-after) is pending on async review per pass A's ledger; the
   merge-forward protocol watches `theme-identity-a` for its corrections.
2. **No live executor, with one non-blocking finding.** `pgrep -af` on `theme-identity-b` found
   nothing. `pgrep -af` on `theme-identity-a` found one stray process: a `workerd` server
   (`examples/showcase/node_modules/@cloudflare/workerd-linux-64/bin/workerd serve ...`, PID
   3515430, running since Sep 27, over four hours old at check time), with no parent Claude or
   workflow process attached — a leaked e2e/dev-server process from a prior run, not a live
   editing executor. `git status --porcelain` in pass A's worktree is empty. Left running (not
   killed) since it is harmless to this branch's work and not this conductor's worktree to clean;
   flagging for whoever next touches `theme-identity-a`. The `theme-identity-b` worktree and
   branch already existed at dispatch time (created by an earlier session step, head `f462cd9d`),
   superseding this item's plan-time "no worktree exists" precondition.
3. **Worktree.** Already created at `.claude/worktrees/theme-identity-b` from pass A's closed head
   with `theme-b-plan`'s plan file already merged in (byte-identical to `origin/theme-b-plan`'s
   tip). `origin/main` was not yet contained (35 commits ahead), so merged it in: `git merge
   origin/main --no-edit` produced merge commit `e48c97e7` with **zero conflicts** (`docs/STATUS.md`
   and `docs/HISTORY.md` both took `main`'s side automatically since pass B's branch had not
   touched them). Cleared the reinstall's lockfile churn (`git checkout --
   examples/showcase/package-lock.json`, then `npm ci` at the root and `npm ci --prefix
   examples/showcase`, not `npm install`, which avoided the lockfile's local-package-version
   churn); `git status --short` is clean and `realpath
   examples/showcase/node_modules/@glw907/cairn-cms` resolves inside this worktree.
4. **Facts re-verified** (one Sonnet pre-flight agent, read-only). About 30 of roughly 35 checked
   facts matched exactly (file:line references for `config.ts`, `check-invisible-craft.mjs`,
   `reference-coverage.mjs`, `gate-tier.mjs`, the various `check-*.mjs`/`.json` files, the audit's
   17/17/34 rule counts and doc sentences, `RATIFIED_NORMS`, the insert mechanics, the SKILL.md
   sizes and fence facts, the dotfiles grep, the `0.98.0` promotion constants). Four moved, amended
   in place above:
   - The spec's acceptance grep: 493 lines, not 486 (file count 181 held).
   - Decision 6's `<code>`/backtick grep: 18 files, 24 lines, not "19 files plus the one `<code>`
     form" (`architecture.md` carries two hits on one file, not a 19th file).
   - Decision 6's `components.md` link grep: 27 lines in 16 files, not 28 lines in 17 files.
   - `/admin/theme-kit/+page.svelte`: 164 lines with `<h1 class="type-title font-[550]">`, not the
     plan's "159 lines at plan time" and `font-bold` — pass A's late commits (`3a2c0f21` and
     neighbors, landed after this plan's `1486f3f7` verification base) gave the fixture's heading
     the ratified 550 weight.
   One item, the guarded-retirement arm's "four findings on `EditPage.svelte`," could not be
   confirmed by static grep (needs a live `cairn-audit` run); flagged in place for task 1's
   implementer to confirm when it re-proves the audit. No other correction needed.
5. **The engine string confirmed.** `node scripts/checks/gate-tier.mjs --range HEAD~1..HEAD --pin
   engine` prints exactly the plan's engine string.
6. **The freeze rule confirmed.** `CLAUDE.md` on the branch: the three narrative arms and
   `why-cairn.md` stay frozen against rewrites for the finalization window; a deficiency a pass
   finds on a frozen page is fixed in place, gated by that page's own gates, agent-facing and not
   register-graded.
7. **Baseline gate green.** One gate agent ran the engine string via `cairn-run-gate` on the merged
   head (`e48c97e7`); one re-issue on exit 75 (still running at ~540s), then **`gate exit: 0`**.
   `test:node-projects`: 395 files passed, 5203 tests passed. `test:component`
   (`--no-file-parallelism`, serialized): 89 files passed, 1757 tests passed, 2 skipped. No
   failures; only benign Vite/Svelte teardown warnings. No red caused by the `main` merge, so no
   fix dispatch was needed.
8. **Dependency state** (no bump): root has 13 packages behind wanted/latest
   (`@cloudflare/workers-types`, `@lezer/common`, `@lezer/highlight`, `@lucide/svelte`,
   `@types/node`, `@vitest/browser`, `@vitest/browser-playwright`, `daisyui`, `devalue`,
   `typescript`, `vite`, `vitest`, `wrangler`); `examples/showcase` mirrors the same set (8 of the
   13 apply there); `packages/cairn-cms-dev` is current; `packages/create-cairn-site` shows
   `@clack/prompts` as its one dependency, not separately installed (no local `node_modules` there).
   Held majors (`devalue` 6, TypeScript 7, Vitest 5, `@types/node` 26) match `docs/STATUS.md`.
9. **Draft PR opened, CI green, expected-red set empty.** Pushed `theme-identity-b`
   (`f462cd9d..e48c97e7`) and opened `#95` as a draft against `main`. One Haiku probe read CI on
   that head: `create-site`, `design`, `e2e` (with its embedded `norms` freshness and audit jobs),
   `scaffold`, and `test` all passed. **The inherited expected-red set is empty**, matching the
   plan's plan-time expectation.
10. **Counter.** Spend through task 0: pre-flight fact-check agent ~140K tokens, baseline gate
    agent ~65K tokens, CI-read Haiku probe ~48K tokens, this conductor session's own usage on top
    (not separately metered). Well inside the 1.1M task 0 projection and the 19M ceiling.

**Acceptance:** items 1 to 10 recorded above; the plan is amended in place (task 0 item 4's four
bullets) rather than re-typed, since the corrections are small and local. No stop condition in
items 1, 2, or 7 was hit.

### Task 1: The rename, `./public`, and the Names section (2026-09-28)

1. **The rename landed and its own fix round.** `git mv` moved every file under
   `src/lib/components/` to `src/lib/admin/` and `PreviewBanner.svelte` to a new
   `src/lib/public/`; `package.json` exports `./admin` and `./public` in place of `./components`.
   Committed as `17299cc5`, with every gate, doc, and script named in the task's Files section
   retargeted (the audit's default scopes, the gate classifier, the reference-coverage props
   check, the invisible-craft and prose gates, ESLint's Svelte glob, the admin sheet's `@source`,
   the Go doctor fixture, `docs/reference/admin.md`/`public.md`, the Names section's two-axis grid
   and two new Vale rules, the facts container's citations, and `templates/waymark/**` via
   `npm run emit:template`). A review round found three comment-only defects (a ROADMAP trigger
   line that named the destination instead of the rename, `config.ts`'s "three library
   directories" miscounting a site route as a library directory, and `admin-css.input.css`'s
   history comment naming the new folder for an event that happened in the old one); fixed, plus
   the parallel mistake in `admin-css-safelist.ts`'s own history comment, one test fixture rename
   (`PublicWidget.svelte` to `AdminWidget.svelte`, since the fixture lives under `src/lib/admin`
   and names an admin role), three dropped process citations in `run.test.ts`, and two ROADMAP
   historical-measurement lines restored to the old path they actually measured against
   (`src/lib/components`, both predating this rename). Committed as the fix commit on top of
   `17299cc5`.
2. **Decision 1's measurement.** `check:invisible-craft` before the move (a scratch worktree at
   `43ab1626`): 977 files scanned, 6 rules run, 0 errors, 0 advisories, 16 suppressed (all
   `token-colors` on `PreviewBanner.svelte`, then under `src/lib/components`). After: 978 files
   scanned, 0 errors, 0 advisories, the same 16 suppressed findings, now on
   `src/lib/public/PreviewBanner.svelte`. Zero unsuppressed findings from `motion-property`,
   `motion-vocabulary`, or `motion-hover-gate` either time, so `DEFAULT_ADMIN_SCOPE` took
   `src/lib/admin` unconditionally; no ROADMAP fallback filing was needed.
3. **Decision 25's byte-identical check.** The engine's own `dist/admin/cairn-admin.css`: `cmp`
   before/after the move reports identical (654045 bytes). The showcase's own compiled admin CSS,
   built with and without the new `@source "./lib/admin";` line (temporarily removed, rebuilt,
   restored): `cmp` reports identical, 55013 bytes both times.
4. **Decision 14's live audit count.** `node dist/audit/bin.js --rule stock-default-hazards
   --config <scope: src/lib/admin>` on the moved tree: exactly 4 advisory findings, at
   `EditPage.svelte:1630,1918,2014,2394`, confirming the plan's stated count live rather than by
   grep.
5. **The preview.spec.ts exception, proven and accepted.** The targeted gate's e2e run failed 8 of
   67 tests, all in `e2e/preview.spec.ts`, all `expect(status).toBe(200)` receiving 404 on a
   minted preview URL. Root cause traced to `examples/showcase/wrangler.jsonc`'s hardcoded
   `PUBLIC_ORIGIN: "http://localhost:4173"` (untouched by this diff) feeding `requireOrigin`
   independent of `E2E_PORT`, colliding with an unrelated process already holding port 4173 on
   this workstation (confirmed with `ss -ltnp` and a `curl` to that port returning a bare 404 on
   every path). CI's full e2e run on PR #95, where no such port collision exists, passed, closing
   the question: this is a pre-existing, workstation-specific defect, not a regression from the
   rename. The conductor accepted the gate with this exception recorded.
6. **Allowlist notes not covered by decision 6's own list.** `docs/reference/sveltekit.md:1405`
   and `docs/extend/share-a-draft-preview.md:61` correctly keep
   `$lib/components/ArticleView.svelte`: it names a site's own custom public component under its
   own `$lib/components` convention (the Names grid's "custom (a site writes it)" column), matched
   by the acceptance grep's `lib/components` substring only by coincidence of naming, not a stale
   engine-path reference. `docs/internal/README.md:44` links `daisyui-v5-hard-components.md`, an
   unrelated file whose name happens to contain "components"; also a grep false positive, not a
   stale reference.

**Acceptance:** the five acceptance greps (decision 6) print only allowlisted or explained lines
(item 6 above covers the two the decision's own list does not name); the two barrel tests, the new
`DEFAULT_ADMIN_SCOPE` and restore-form coverage, and `check:vale`'s scratch-file proof all pass;
the targeted gate is green except the proven-environmental `preview.spec.ts` exception in item 5.
