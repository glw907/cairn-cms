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
one fresh-agent probe. The close merges `main` in and leaves the branch unmerged for pass C. Plans
specify outcomes and acceptance, never implementation code.

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
touches every surface, and the plan names it). Task 5 is `docs` (shipped guidance prose). Task 6
is `engine-logic` with a scoped gate, since it adds one unit test and changes no file under
`src/lib` (gate economy's blast-radius rule). Tasks 2, 3, and 4 change engine TypeScript behavior,
so they carry the engine gate. The close runs the union: `code-simplifier` once, the full gate,
`svelte-reviewer`, one Opus read of the new audit code, and one `prose-voice-reviewer` read of the
changed guidance. The `sweep` class's spot captures are CI's two visual specs at the segment A
boundary, which read every captured screen.

**Execution mode:** `pass-execute` (by name) for tasks 1 to 6, one invocation per segment, and
**sequential** (`parallel` unset). The runner does no worktree isolation, so parallel tasks would
share one index, one `base..HEAD` range, and one `cairn-run-gate` key. Task 2 is independent of
tasks 3 to 6 (disjoint files) and is marked so, but it runs in sequence for the same reason. The
contended files are `docs/reference/cairn-audit.md` (tasks 1, 3, 4), `skills/cairn-admin-screens/SKILL.md`
(tasks 3, 5), `templates/waymark/**` (every task that runs `emit:template`: 1, 3, 5),
`docs/internal/facts/*.md` (task 1 repoints citations; the close adds bullets), and
`src/lib/audit/config.ts` (task 1 only). Every heavy gate also queues on one machine-wide lock.

Args: `repo` the worktree's absolute path, `implementer: "cairn-implementer"`,
`reviewer: "diff-reviewer"`, `passClass: "engine-logic"`, `gate` set to **the engine string**
(see Gates), `reducedGate` set to **the reduced string**, `commonNotes` carrying the Global
constraints and the sentinel note below, and each task's `passClass`, `gateTier`, `gate`,
`gateLane`, and `model` as the task states. Each task's `criteria` carries its acceptance lines
verbatim, including its gate string, its task-check strings, and the rule that a missing or red
task check is blocking, because the reviewer never sees `commonNotes`. Under `engine-logic`,
`sweep`, and `docs`, the runner moves a finding the reviewer marks `coverageOnly` to `nonBlocking`
and returns it as `batchedNotes`; the conductor lists those in the boundary ledger and acts on
none mid-segment. Task 7 is a one-task `pass-execute` run, dispatched only if the probe returns a
guidance gap. Step S1 is conductor-led. Task 8 is the close.

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
behavior the parent spec fixes stated in the task. `diff-reviewer` runs at the class default:
Sonnet for task 1 (`sweep`), `claude-opus-5-5` for every other task. The pre-flight agents, gate
agents, the probe, and the probe's audit agent are Sonnet at `high`. CI probes are Haiku. The
close is drafted by a Sonnet agent and read by one Opus `diff-reviewer`; the close's review
fan-out is Opus.

**Token ceiling:** 17M, flag at 13.6M (80%). The projection:

| Item | Spend |
| --- | --- |
| Task 0: worktree, `main` merge, pre-flight agent, dependency state, baseline gate agent | 1.1M |
| Task 1 (`sweep`: the rename, `./public`, the Names section; heavy gate) | 2.0M |
| Task 2 (`engine-logic`, small: the insert padding, its unit table, the e2e) | 0.6M |
| Task 3 (`engine-logic`: `radius-scale`, three arms, the own-tree and guidance test) | 1.2M |
| Task 4 (`engine-logic`: the recipe source and the norms print) | 0.7M |
| Task 5 (`docs`: three guidance files and the exemplar) | 0.8M |
| Task 6 (the sync test) | 0.5M |
| Fix rounds on about a third of the chains, most on the reduced gate | 1.2M |
| Three segment boundaries (pre-flight, push, Haiku CI read, ledger) and one merge-forward | 0.8M |
| S1: probe 1 in a scratch worktree, its audit agent, one retry budgeted | 1.0M |
| Task 7 (conditional guidance fix, one run) | 0.4M |
| The close: `code-simplifier` and the full gate agent | 0.5M |
| The close: review fan-out (Svelte, the audit read, the guidance read) | 0.6M |
| The close: Sonnet draft and one Opus review, hard cap | 0.6M |
| The close: the `main` merge and the merged-head checks | 0.3M |
| The conductor sessions | 1.0M |
| **Projected total** | **about 13.3M** |

The projection sits just under the 13.6M flag. If the flag trips, the conductor asks the global
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
- Segment B: tasks 2 to 4. The insert fix, the rule and arms, the recipe source.
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
   detection carries an edit to `src/lib/components/<file>` onto `src/lib/admin/<file>`). Resolve
   `docs/STATUS.md` to this branch's side, keep both sides of `docs/HISTORY.md`, and keep both
   sides of any plan-ledger text.
3. Re-run the rename's post-condition greps (task 1, "Acceptance"). A pass A commit that added a
   new file or path under the old folder shows up here; one Sonnet `cairn-implementer` dispatch
   (class `sweep`, the task 1 reviewer bar) moves it and repoints it.
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
- **The norms check** (heavy; it renders the admin): `cairn-run-gate 'npm run norms:check'`.
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
   default and why. The stale "middle root" comment is rewritten.
2. **Pass B implements no half of the named-root rule, since it has one scope.** The rule ("a root
   a site names explicitly for one scope is removed from the other scope's defaults") needs two
   scopes, and the public scope arrives in pass C's task 7, which implements and tests both
   directions. Pass B's docs state the rule in a form true on this branch and at the release: a
   root a site names under `static.scope` is an admin root, and the audit treats it as one wherever
   another scope's defaults would also reach it. Pass C's task 0 reads this decision as its answer
   to "whether pass B implemented the admin half".
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
6. **The rename's acceptance adds three greps to the spec's.** The spec's grep misses three live
   forms, measured at plan time: relative imports of the old folder (30 lines in 11 files under
   `src/lib`, such as `'../components/CairnLogo.svelte'`), the subpath in backticked prose
   (`` `/components` `` and `` `./components` ``, 19 files), and links to the old reference page
   (`components.md`, 28 lines in 17 files). Task 1's acceptance runs all four greps with the spec's
   exclusion list; each prints nothing.
7. **Test files named for the barrel are renamed with it** (`components-barrel.test.ts` and
   `components-barrel-prune.test.ts` become `admin-barrel*.test.ts`); every other test keeps its
   name. Task 1 names one new test, as the `sweep` mandate requires: a barrel test asserting that
   `./public` exports exactly `PreviewBanner` and that `./admin` does not export it.
8. **The Names section's Vale enforcement follows the freeze.** `Cairn.Names` (error) gains only
   retired compounds that match no page on a frozen narrative arm at execution: at plan time,
   "engine public component", "public engine component", "chassis component", and "site
   component" (the last has two hits, both on the reference arm, `core.md:1079` and
   `sveltekit.md:2043`, which task 1 rewrites to "custom public component"). `Cairn.NamesRetired`
   (warning) gains "engine component" and "custom component", since each can be right in a sense a
   writer must check. A token that would fire on a frozen page goes to the warning rule instead,
   because the Names section sweeps frozen pages only at the docs rebuild. The `` `/components` ``
   subpath cannot be a Vale token (Vale skips code spans), so decision 6's grep carries it.
9. **The audit's reach narrowing is disclosed, not hidden.** Removing `src/lib/components` from
   `DEFAULT_STATIC_SCOPE` also removes a consumer's own `src/lib/components` from every static rule,
   including `stripe-trim-parity` and `unlayered-font-clobber`, whose comments
   (`stripe-trim-parity.ts:13-16`, `unlayered-font-clobber.ts:9-14`) justify their reach by that
   root. Task 1 rewrites both comments to the new reach. The close's migration note names the
   narrowing and how a site restores it (name the root under `static.scope`). The spec's admin
   scope change implies this; the spec does not state it.
10. **The insert padding, exactly.** The outcome in task 2 states Geoff's ruling precisely: a blank
    line separates the inserted block from any adjacent non-blank text, before it when non-blank
    text precedes the caret on its line or sits on the line directly above, and after it when
    non-blank text follows the caret on its line or sits on the line directly below. Nothing is
    added at the document's start or end, or beside a blank line already there, so no insert ever
    produces a double blank line. The caret lands at the end of the block's closing fence, as it
    does today when nothing follows, so the existing round trip ("the caret enables Edit block")
    holds. The padding is one pure internal function, unit-tested table-driven, that both
    `insertAtCursor` paths call (the mounted path and the pre-mount fallback). The behavior belongs
    to the public `EditorApi.insert`, which today already prefixes a blank line at any caret past 0,
    so it is block insertion already; `docs/reference/admin.md` states it.
11. **`radius-scale`'s shape.** A static rule, tier `advisory`, sibling of `type-scale` and
    `gap-scale`, reading each class token through `utilityBase()`, so `md:rounded-lg` is caught. It
    flags bare `rounded`, the fixed sizes (`xs` through `4xl`), any arbitrary radius
    (`rounded-[...]`), and each side or corner form of those (`t`, `b`, `l`, `r`, `s`, `e`, `tl`,
    `tr`, `br`, `bl`, `ss`, `se`, `es`, `ee`): the parent spec's post-condition pattern. It passes
    the three role classes and their side forms (`rounded-selector`, `rounded-field`, `rounded-box`,
    `rounded-t-box`), `rounded-full`, `rounded-none`, and structural side zeros (`rounded-l-none`).
    It flags `rounded-full` on an element that also carries `badge` (chips leave the pill). The
    message names the replacement role class: the one class when the element carries a daisyUI
    class whose role the parent spec's Corners mapping fixes (`badge` to `rounded-selector`; `btn`,
    `input`, `select`, `textarea` to `rounded-field`; `card`, `modal-box`, `dropdown-content` to
    `rounded-box`), the exact class for an arbitrary `rounded-[var(--radius-<role>)]`, and otherwise
    the three-role mapping in one sentence. It reads class tokens only; a `border-radius` literal in
    a `<style>` block is outside it, and the reference page says so.
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
    segment), which must stay silent.
13. **The promotion version is `0.99.0`, with no version tripwire in this pass.** The parent spec
    promotes the new findings "for the next minor, as the guarded arm did"; the guarded arm shipped
    in `0.97.0` and named `0.98.0`, and these ship in `0.98.0`, so they name `0.99.0` through one
    constant each, the way `log-event-grammar.ts:20` does. A test that fails once `package.json`'s
    version reaches a promotion constant would be the right tripwire, but three existing constants
    already name `0.98.0` (`log-event-grammar.ts:20`, `log-secret-field.ts:25`,
    `stock-default-hazards.ts:45`), so it would red pass C's release commit on promises pass C's
    plan does not handle. The close files the tripwire in `ROADMAP.md` and writes a STATUS watch
    listing all five promises and their versions, so the `0.98.0` cut decides the three due then.
14. **Cairn's own tree and the shipped guidance report zero, proven by a test.** No gate runs
    `stock-default-hazards` or a new rule over the engine's own admin today
    (`check:invisible-craft` owns six rules, `check:admin-css-classes` one). Task 3 adds one unit
    test that runs `radius-scale` and `stock-default-hazards` statically over `src/lib/admin`,
    `src/lib/admin-toolkit`, and `examples/showcase/src/routes/admin`, and over every fenced
    `svelte` or `html` code block in `skills/**/*.md` and `claude/agents/*.md`, and asserts zero
    findings of either. A retired pattern in guidance may appear only in a prose code span, never in
    a fence. This is the parent spec's "the fixture fails if the sweep missed a site or a guidance
    file still teaches a patch".
15. **The recipe source.** `src/lib/audit/norms.ts` gains `ROLE_RECIPES` beside `RATIFIED_NORMS`:
    each row is a class string to write, a one-line look it produces, and an optional `role` (a
    `NORM_ROLES` id). It also gains `RECIPE_MODEL`, the one-sentence model every guidance copy
    quotes verbatim. The rows cover every ratified role (at plan time eight distinct roles across
    `RATIFIED_NORMS`' twelve rows: `page-title`, `eyebrow`, `nav-item`, `button-primary`,
    `button-ghost`, `input-text`, `select`, `card`), exactly one row each; the plain `btn`, the
    ink opener `btn-neutral`, the soft primary, and the selected segment; and the three radius
    role classes by role. Each class string comes from `docs/internal/admin-design-system.md` as
    pass A left it or from the `/admin/theme-kit` fixture, and the diff review checks each row
    against those. A ratified role a screen never writes itself (a nav item, which
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
    exemplar fence quotes, fails it.
20. **Probe 1's brief, setup, and criteria.** One fresh Sonnet agent, in a detached scratch
    worktree at the segment C head, reads only the shipped guidance as a consumer receives it
    (`templates/waymark/.claude/`) and the showcase source, and gets one line: "Add an owner-only
    admin settings screen at `/admin/probe` in the showcase: a segmented filter, a short form with
    two fields and a switch, a status chip per row of a small table, and one primary action." A
    separate Sonnet audit agent then runs the static audit from the showcase and the rendered audit
    against a preview on port 4391 with `/admin/probe` added to `rendered.extraPages` in the
    scratch tree. Pass: zero error findings on the probe's files and page, and zero `radius-scale`
    or retired-patch findings, both modes. Findings elsewhere in the showcase do not count and are
    reported separately. The scratch worktree is removed after; nothing from it merges.
21. **Probe retry.** A failed probe names a guidance gap. Task 7 fixes the gap on its shipped page,
    and a fresh agent re-runs the probe once. A second failure is recorded in the ledger with both
    audit summaries, filed in `ROADMAP.md`, and raised at the next owner sitting (pass C's S3); the
    pass closes with the finding disclosed in STATUS, since it is a guidance gap, not a product
    fork.
22. **No dependency bump in this pass.** Pass C's decision 28 sweeps dependencies at its own task
    0, before its equivalence capture, so every piece of pass C's evidence rides the release's
    dependencies; a sweep here would be redone there. Task 0 records `npm outdated` for the root,
    the showcase, and `packages/*` in the ledger as the state pass C inherits.
23. **The changelog's `Consumers must:` line** is one line with the spec's four parts, verbatim in
    task 8. The migration note says the same, plus decision 2's named-root sentence, decision 9's
    narrowing, and the `DEFAULT_ADMIN_SCOPE` change (decision 1) with the motion rules it brings to
    a site's `src/lib/admin`.
24. **The user-scoped `cairn-release` skill names the old folder** (`~/.dotfiles/claude/.claude/skills/cairn-release/SKILL.md:107`,
    "`src/lib/components/*.svelte`"). The close repoints it in one dotfiles commit and runs
    `claude-tooling-sync verify`. No other user-scoped agent or skill names the old paths at plan
    time; task 0 re-checks.

## Rulings for Geoff

None. The review found no product fork and no architectural question the spec leaves unsettled.
Decision 13's three `0.98.0` promises belong to the release, which pass C's close cuts; this pass
only surfaces them in STATUS.

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

Pass C's plan assumes one thing this pass cannot produce: its task 0 item 1 requires "`main`
contains pass A's merge". Under the 2026-09-27 ruling pass A stays unmerged until pass C's close,
so pass C's task 0 must read that item as "pass B's branch contains pass A's closed head and a
`main` merge", and its close merges A, B, and C together (closing pass A's PR #92 and pass B's PR
as superseded). Task 8 writes this into STATUS for pass C's conductor.

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
   rule reads them after the upgrade; with the root named under `static.scope`, every static rule
   reads them again. A `config.test.ts` case pins both. Task 1.
3. **A pass A correction merged across the rename.** An edit to `src/lib/components/cairn-admin.css`
   on pass A must land on `src/lib/admin/cairn-admin.css`, and a new file under the old folder must
   be caught by the post-condition greps. The merge-forward protocol, step 3.
4. **A custom caller of `EditorApi.insert` mid-sentence.** The insert now stands as its own block
   with blank lines on both sides, which the reference page states. Task 2's unit table carries the
   case.
5. **`radius-scale` on the shapes the ladder exempts.** A `rounded-full` avatar with no `badge`,
   `rounded-none`, `rounded-l-none` in a join, and `rounded-t-box` on a bottom sheet pass;
   `md:rounded-lg` and `rounded-[0.55rem]` flag. Task 3's fixtures.
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
   - The spec's acceptance grep (task 1) at plan time: 181 files, 486 lines. Decision 6's three
     greps: 30 lines in 11 files, 19 files, 28 lines in 17 files.
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
     ladder, and `/admin/theme-kit/+page.svelte` (159 lines at plan time, no `<style>` block, `<h1
     class="type-title font-bold">`).
   - The insert: `insertAtCursor` at `MarkdownEditor.svelte:1133-1143`, prefixing `\n\n` when the
     caret is past 0 and appending nothing; `serializeComponent` at
     `src/lib/render/component-grammar.ts:44`; the e2e's opening-line-only assertion at
     `examples/showcase/e2e/golden-path.spec.ts:449-453`; `EditorApi.insert`'s row in
     `docs/reference/components.md:680`.
   - The guidance: `SKILL.md` sizes (plan time: `cairn-admin-screens` 7,027 characters, about
     1,757 estimated tokens; `cairn-extend` about 1,037; `cairn-consult` about 548; budget 3,500);
     no retired recipe or fixed radius in any fenced block of `skills/**` or `claude/agents/**`;
     `daisyui-first.md`'s "Segmented-control contrast" section describing the pinned
     `.btn-active` ring pass A retired.
   - `examples/showcase/playwright.config.ts` honors `E2E_PORT` (pass A's decision 14).
   - User scope: `grep -rln` for the old paths under `~/.dotfiles/claude/.claude/` finds only
     `skills/cairn-release/SKILL.md:107` and a dated record (decision 24).
   - The three `0.98.0` promotion constants (decision 13).
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
list. Decisions 1 to 9.

**Files:** `git mv src/lib/components src/lib/admin` (every file); a new `src/lib/public/`
holding `PreviewBanner.svelte` (moved) and a new `index.ts`; `package.json` (exports); every file
the four greps name, among them `src/lib/admin-toolkit/**` and `src/lib/reproductions/**` imports,
`src/lib/sveltekit/content-routes-shell.ts`, `src/lib/audit/config.ts` and the four audit
comments that name the old folder (`color.ts`, `screen-anatomy.ts`, `stripe-trim-parity.ts`,
`unlayered-font-clobber.ts`),
`src/tests/**`, `vitest.config.ts`, `eslint.config.js`, `scripts/build/{admin-css.input.css,build-admin-css.mjs,build-mockup-css.mjs,update-admin-sheet-inventory.mjs}`,
`scripts/checks/{check-invisible-craft.mjs,check-admin-prose.mjs,check-cm-internals.mjs,cm-internals-allowlist.json,check-surface-leaks.mjs,check-surface-leaks.json,check-symbols-allowlist.mjs,check-tool-heuristics.mjs,custom-surface-budget.json,gate-tier.mjs,reference-coverage.mjs}`,
`examples/showcase/{cairn-audit.config.json,src/routes/admin/**,src/routes/(site)/preview/[token]/+page.svelte,src/theme/theme.css}`,
`claude/snippets/cairn-audit.config.json`, `claude/CLAUDE.md`,
`skills/cairn-admin-screens/references/exemplar-list.md`, `tool/internal/doctor/check_mount_test.go`,
`git mv docs/reference/components.md docs/reference/admin.md`, a new `docs/reference/public.md`,
`docs/reference/{README.md,cairn-audit.md,core.md,islands.md,sveltekit.md,admin-routes.md,admin-toolkit.md,auth-store.md}`,
`docs/internal/**` pages the greps name (`admin-design-system.md`, `public-design-system.md`,
`pass-gate-tiers.md`, `src-lib-map.md`, `code-idioms.md`, `README.md`, and the rest the greps
list, with `docs/internal/api-surface.md` regenerated, not hand-edited), `docs/internal/facts/*.md`
(citations repointed), `docs/internal/docs-register.md` (the Names section),
`.vale/styles/Cairn/Names.yml`, `.vale/styles/Cairn/NamesRetired.yml`, the frozen pages the greps
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
  `src/routes/admin`, `src/lib/admin`, `src/lib/admin-toolkit` (the latter conditional on the
  measurement); `DEFAULT_SHEET_CANDIDATES` names `dist/admin/cairn-admin.css` and
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
  named-root sentence once.
- **The Names section.** `docs/internal/docs-register.md`'s Names section gains the spec's two-axis
  grid (admin or public, built-in or custom), each cell's home, rulebook, audit scope, and
  guidance as the spec's table gives them, the noun "component" with its surface adjective, "site"
  as the whole project, and "custom admin screen" for a whole route; plus the barrel rule
  (`./admin` exports only admin components; `./public` exports every built-in public component that
  renders styled markup; `./admin-toolkit` keeps its name). The two Vale rules gain decision 8's
  tokens, and the reference pages it names use "custom public component".
- **Every other live mention** (the internal docs, `CLAUDE.md`, `CONTRIBUTING.md`, `claude/CLAUDE.md`,
  the shipped exemplar, the showcase theme comment, the frozen extend pages as deficiency fixes)
  names the new path or subpath. Records keep the old paths (the spec's excluded list).
- **The surface.** `docs/internal/api-surface.md` is regenerated with the surface regeneration
  command and shows `/admin` and `/public` in place of `/components`.

**Acceptance:**
- These four greps each print nothing (the spec's exclusion list on all four):
  ```sh
  X=(':!docs/internal/history' ':!docs/internal/record' ':!docs/internal/design' ':!docs/superpowers' ':!docs/HISTORY.md' ':!CHANGELOG.md' ':!docs/extend/migration-notes.md' ':!docs/internal/engine-rulings.md')
  git grep -nE "lib/components|dist/components|cairn-cms/components|['\"]\.?/components['\"]" -- "${X[@]}"
  git grep -n '\.\./components/' -- src/lib
  git grep -nE '`\.?/components`' -- "${X[@]}"
  git grep -n 'components\.md' -- "${X[@]}"
  ```
  and `git grep -n PreviewBanner -- src/lib/admin` prints nothing. The report quotes each command
  with its empty output and the plan-time counts it cleared.
- `package.json` exports `./admin` and `./public` and no `./components`; the new barrel test
  (decision 7) passes; `ls src/lib/components` fails.
- Decision 1's measurement: the report quotes `check:invisible-craft`'s findings and suppressed
  counts before and after the move, identical, with zero unsuppressed findings from
  `motion-property`, `motion-vocabulary`, and `motion-hover-gate` on `src/lib/admin`, and states
  whether `DEFAULT_ADMIN_SCOPE` took the root.
- The compiled admin sheet's class inventory is identical before and after (the report states the
  inventory diff, empty or each safelisted class), and `admin-sheet-inventory.test.ts` passes.
- `config.test.ts` covers the new defaults and a config naming `src/lib/components` under
  `static.scope` bringing that root back under every static rule, and `run.test.ts:241`'s
  named-sheet hard error passes on the new candidates (Review focus 1 and 2).
- A scratch file (never committed) containing each new Vale token raises the expected `Cairn.Names`
  or `Cairn.NamesRetired` alert; the report quotes `vale` on it. `npm run check:vale` is green.
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
  caret on an empty line directly under a paragraph line; and a caller's inline text inserted
  mid-sentence (Review focus 4). Each row asserts the resulting document and the caret offset.
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
and existing unit tests under `src/tests/unit/audit/rules/` with fixtures, a new unit test for
decision 14 under `src/tests/unit/audit/`, `src/tests/unit/audit/run.test.ts`,
`docs/reference/cairn-audit.md`, `skills/cairn-admin-screens/SKILL.md` (the tier map and its count
sentence), and `templates/waymark/**` through `npm run emit:template`.

**Outcome:**
- `radius-scale` is registered after `gap-scale`, at `advisory` tier, behaving as decision 11
  states, each message naming its replacement and the `0.99.0` promotion.
- `stock-default-hazards` gains the three arms decision 12 states, each `advisory`, each message
  naming its replacement (or, for `shadow-none`, that nothing replaces it) and the `0.99.0`
  promotion. The five existing arms do not change.
- Decision 14's test proves cairn's own admin tree and the shipped guidance's fences report zero
  findings from both rules.
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
  `rounded-[var(--radius-field)]` (names `rounded-field`); `rounded-t-2xl`; `badge rounded-full`
  (`rounded-selector`). Passing fixtures, each raising nothing: `rounded-field`, `rounded-t-box`,
  a `rounded-full` avatar with no `badge`, `rounded-none`, `rounded-l-none` on a `join-item`.
- Arm fixtures: `btn bg-neutral text-neutral-content` (names `btn btn-neutral`);
  `btn hover:bg-[var(--cairn-ink-hover)]`; `btn bg-primary/10 text-primary` (names
  `btn btn-soft btn-primary`); `btn shadow-none` and `btn sm:shadow-none`. Silent: `btn btn-neutral`,
  `btn btn-soft btn-primary`, and a `span` carrying `bg-primary/10 text-primary` (decision 12's
  non-button case). Each arm finding's tier is `advisory`, asserted per finding.
- The existing `stock-default-hazards.test.ts` cases pass unmodified.
- Decision 14's test passes and its mutation proof is quoted: planting `rounded-lg` on one engine
  button, and a `btn shadow-none` inside one guidance fence, each fails it.
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
- `src/lib/audit/norms-manifest.json` is unchanged.
- `gateTier: "engine"`. Task checks, each quoted with its `gate exit:` line: the norms check
  (heavy); the idioms and comments checks.

---

### Task 5: The shipped guidance and its exemplar

**Pass class:** `docs`. **Spec:** parent spec "G2", "Shipped guidance" (the one-sentence model, the
table, the tier-map counts, the exemplar, the extension reviewer's new checks). Decisions 17 and 18.

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
- No shipped guidance file teaches `bg-neutral` on a `btn`, the Publish tint, `shadow-none` on a
  `btn`, a fixed Tailwind radius, or a `rounded-full` chip, in prose or in a fence; the report
  quotes the grep.

**Acceptance:**
- Every `SKILL.md` stays under the 3,500-token budget; the report lists each skill's estimated
  tokens before and after.
- Decision 14's test still passes (the guidance fences carry no patch).
- `gateTier: "targeted"`, `gateLane: "light"`, `gate` the docs string (Gates). A missing or red
  task check is blocking.

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
  `norms.ts` alone; one class changed on a fixture-route line an exemplar fence quotes. Each fails
  the test with a message naming the file and the row or fence.
- `gateTier: "targeted"`, `gateLane: "light"`, `gate` the sync string (Gates).

---

### S1: Probe 1 (conductor-led)

**Outcome:** Decision 20's probe runs once on the segment C head: the conductor creates the
detached scratch worktree, installs it (`npm ci` at the root and in the showcase, then
`npm run package`), dispatches the probe agent with the one-line brief, then dispatches the audit
agent. The audit agent serves the probe's showcase build on port 4391 through `BASE_URL`, stops it
on exit, and returns the static and rendered counts on the probe's files and page by rule and
tier, plus a separate list of any finding outside them. The conductor records both in the ledger
and removes the scratch worktree.

**Acceptance:** zero error findings and zero `radius-scale` or retired-patch findings on the probe's
files and page, in both modes. On a failure, the ledger names the guidance gap each failing finding
points at, and task 7 runs (decision 21).

### Task 7: Guidance fix (conditional)

**Pass class:** `docs`. Dispatched only when S1 fails. **Outcome:** each gap S1 named is fixed on
the shipped page that should have prevented it, and decision 17's rows change only through
`ROLE_RECIPES` plus all three copies, so task 6's test stays green. Then a fresh probe agent re-runs
S1 once (decision 21). **Acceptance:** the docs string green (`gateTier: "targeted"`,
`gateLane: "light"`), the sync test green, and the re-run's counts recorded.

---

### Task 8: Close

**Outcome:** First, `code-simplifier:code-simplifier` runs once over the scope named under
`code-simplifier` and commits. Then the full gate on that commit, in one gate agent:
`npm run check:close && npm run test:node-projects && npm run test:component -- --no-file-parallelism && npm --prefix examples/showcase run test:unit`,
then the tool gate. The consumer-build proof is CI's `e2e` run on the pushed head. Then the review
fan-out, in parallel: `svelte-reviewer` (the editor insert and the `PreviewBanner` move and
barrel), one Opus `general-purpose` read of `radius-scale`, the three arms, and the recipe source
against the parent spec's "G2" and "Corners" sections, and one `prose-voice-reviewer` read of the
changed shipped guidance against the agent-guidance standard the `writing-voice` skill routes to.
Findings fold through one task 7 run in `engine-logic` or `docs` class as the finding requires.

Then one Sonnet agent drafts the close and commits it; one Opus `diff-reviewer` reads that diff,
and the drafter folds its findings once. Hard cap about 0.6M tokens for draft, review, and fold.
The cairn-pass ritual:
- **`CHANGELOG.md`** under `## Unreleased` (created if absent), pass B's entry: the rename and the
  new `./public` subpath, with this `Consumers must:` line verbatim: "Consumers must: import admin
  components from `@glw907/cairn-cms/admin` instead of `@glw907/cairn-cms/components`; import
  `PreviewBanner` from `@glw907/cairn-cms/public`; move any custom admin components out of
  `src/lib/components` into `src/lib/admin`, or name `src/lib/components` under the admin scope
  (`static.scope`) in `cairn-audit.config.json`; and, if that config names
  `dist/components/cairn-admin.css` under `sheet`, change it to `dist/admin/cairn-admin.css`." It
  also names the audit's new default roots and the reach narrowing (decision 9), `radius-scale` and
  the three arms at advisory tier with their `0.99.0` promotion, the norms print's recipe line, the
  shipped guidance's table and exemplar, and a "Fixed" line for the insert.
- **`docs/extend/migration-notes.md`** and **`upgrade-cairn.md`**: the same four actions, the
  old subpath named, decision 2's named-root sentence, decision 9's narrowing and its restore, and
  `DEFAULT_ADMIN_SCOPE`'s new root with the three motion rules it brings to a site's
  `src/lib/admin`.
- **Facts** in `docs/internal/facts/`: the rename, the `./public` subpath and its barrel rule, the
  audit's default roots, `radius-scale` and the arms and their tier, the norms recipe line, and the
  insert's padding (the editors arm too, since an author sees it). `check:facts` green.
- **Reference pages:** verified current (tasks 1 to 4 wrote them); `check:reference` green.
- **`check:surface`:** verified current (task 1 regenerated `api-surface.md`); the full gate runs it.
- **`ROADMAP.md`**: the F12 Now entry removed; the "Theme identity, passes A, B, and C" entry says
  pass B is finished on `theme-identity-b` (pass C removes the entry); a new entry for decision 13's
  version tripwire; the promotion of `radius-scale` and the arms at `0.99.0`; and any gap S1 left
  open.
- **`docs/internal/docs-friction-log.md`** triaged, complete-or-move.
- **The dotfiles** (decision 24): one commit in `~/.dotfiles` repointing `cairn-release`'s
  admin-surface line to `src/lib/admin/*.svelte`; `claude-tooling-sync verify` green; the report
  quotes the line.
- **`docs/HISTORY.md`**: the pass entry (what landed, what the gates caught, spend against the 17M
  ceiling, and what a later pass would be wrong to rediscover: the spec grep's three blind forms,
  the reach narrowing, `PreviewBanner`'s kept coverage, the merge-forward across a rename, and the
  three `0.98.0` promises).
- **The plan's post-mortem** appended here, with the pass score (tokens against the ceiling,
  planning misses, execution sittings).

**The branch close (conductor, after the close's review):**
1. Run the merge-forward protocol a last time (pass A's head).
2. `git fetch` and merge `origin/main` into `theme-identity-b` if `main` moved; resolve STATUS to
   this branch's close text and keep both sides of HISTORY.
3. Re-run task 1's four greps, then `check:facts`, `check:reference`, `check:docs`, `check:vale`,
   `check:rulings-format`, and `check:template` on the merged head (one light gate agent), and let
   CI go green on the pushed head; one Haiku probe reads it.
4. **STATUS** on this branch, present tense, at or under 60 lines: pass B finished and unmerged,
   its head and base SHAs and merge commits; "What pass C receives" verified, with its topology
   note (pass A unmerged; pass C's task 0 item 1 reads as this branch containing pass A's closed
   head and a `main` merge); the STATUS watch from decision 13; any open S1 gap; and pass C's
   resume prompt naming `theme-c-plan`'s plan and this branch as its base. The conductor then
   records the same next action on `main`'s STATUS in one `docs(status)` commit, after the
   executor check, the way this repo records stream state there.
5. The draft PR stays open and unmerged. The worktree stays for pass C to branch from.

**Acceptance:** the full gate green on the branch before the `main` merge and CI green on the
final pushed head; the four rename greps empty on the final head; STATUS at or under 60 lines;
`check:facts`, `check:reference`, `check:docs`, `check:vale`, `check:rulings-format`, and
`check:template` green on the final head; the pass score recorded.

## Ledger

(written by the conductor at each segment boundary)
