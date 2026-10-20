# Code Polish Pass Implementation Plan

> **For agentic workers:** Orchestrated from the main loop: Tasks 2 and 4 are Workflow launches
> (Geoff's multi-agent opt-in recorded 2026-07-01), the riders are `cairn-implementer`
> dispatches, and the charter synthesis is main-loop work. Steps use checkbox (`- [ ]`) syntax.
> Tasks specify outcomes, constraints, and acceptance criteria; implementers own the code.

**Goal:** Execute the approved design at
`docs/superpowers/specs/2026-07-01-code-polish-pass-design.md`: one idiom per pattern across the
engine, the gate scripts, the tests, the Wayfinder showcase, and the dev package, with zero
unjustified dead code and the frozen public surface byte-identical throughout.

**Architecture:** Charter first, then measurement, then a sweep that mutates sequentially and
verifies adversarially in parallel. The spec's Invariants section is binding on every task and
is not restated per task.

## Global constraints

- Feature worktree off `main` (suggested branch: `code-polish-1`); all edits target the
  worktree; symlink `node_modules` (root and showcase); `npm run package` before `npm test`.
- Per-cluster/per-task gate: targeted tests, `npm run check` 0/0, `npm test` exit 0,
  `npm run check:surface` unchanged, `npm run check:reference:signatures` unchanged,
  `npm run check:comments`. Full e2e at consolidation (the two `admin-visual` pixel flakes are
  known; verify against `main` if they appear).
- Log event names never change. Error-message text changes only where the charter standardizes
  a format, tests updated in the same commit; the pruning pass's loud-boundary messages keep
  their wording.
- Surface-change wants go to `docs/superpowers/plans/2026-07-01-code-polish-surface-wants.md`
  (create on first want), one batched decision for Geoff at consolidation. The sweep never
  changes the public surface.
- No version bump, no publish; changelog under `## Unreleased`.
- Conventional commits, one per cluster or task. **Deliberate deviation, recorded here:** the
  per-commit `code-simplifier` convention is replaced in this pass by the sweep's own
  adversarial verifiers (the pass is itself simplification with stronger review); one
  `code-simplifier` run over the full pass diff happens at consolidation as the backstop.

---

### Task 1: Worktree, measurement baseline, and the triaged work-list

**Dispatch:** `cairn-implementer`.

**Files:** create `docs/superpowers/plans/2026-07-01-code-polish-measurements.md`; tool configs
only if a tool needs one (e.g. a `knip.json`), committed with a comment saying it serves the
polish pass.

**Outcome:** The worktree exists and builds. knip (dead exports, dead files, unused
dependencies), jscpd (duplication), and a file-size/complexity outlier scan have run over the
spec's full scope (src/lib, scripts, src/tests, examples/showcase, packages/cairn-cms-dev) as
one-shot `npx` runs (no new standing devDependencies). The measurements doc records: each
tool's version and invocation (reproducibility), the raw counts, and a triaged work-list where
every finding is marked fix-in-sweep (with its cluster), justify, or file-for-decision.
Expected known entries the triage must place: the `ComponentForm`/`FieldInput` duplication
(Task 7's rider), any dead code the surface prune stranded (demoted symbols whose engine
callers vanished), and knip noise from the exports map and bins (configure entry points from
`package.json` exports + `bin` + the vitest projects, and justify what remains).

**Acceptance:** measurements doc committed; every finding dispositioned; tool invocations
re-runnable verbatim; full per-task gate green.

- [ ] Create worktree, symlinks, package build
- [ ] Run the three tools, capture raw reports
- [ ] Write the triaged work-list, commit

### Task 2: Idiom survey (Workflow)

**Dispatch:** main loop launches the survey workflow.

**Outcome:** ~10 read-only Sonnet agents, one per subsystem (content, sveltekit routes,
components/editor, components/admin-screens, media, delivery, auth+github+email+env+log,
nav/site-config, vite+doctor+bins+scripts, tests, showcase+dev-package — merge or split to
land near ten), each returning a schema-forced catalogue: per pattern family (error and result
shapes, validation, factory anatomy, module layout and barrel conventions, naming, async
patterns, logging discipline, test structure, Svelte component anatomy), the variants found,
file:line exemplars of each variant, and the agent's nomination for the best-in-repo exemplar
with one-line reasoning. Agents catalogue; they do not judge beyond the nomination.

**Acceptance:** all subsystem catalogues returned and persisted to the scratchpad, with a
committed evidence summary (`docs/superpowers/plans/2026-07-01-code-polish-survey.md`) listing
each divergence the synthesis must resolve. No repo mutation.

- [ ] Launch the survey workflow, collect catalogues
- [ ] Commit the evidence summary

### Task 3: Charter synthesis (main loop)

**Files:** create `docs/internal/code-idioms.md`.

**Outcome:** The main loop resolves each catalogued divergence by picking the winner already in
the code (the survey's nominations are input, not verdicts), and writes the charter:
agent-facing, exemplar-driven (every rule names the canonical file), organized by pattern
family, carrying the deliberately-not-standardized list with reasons, and a header stating the
doc is a standing pass dimension (kept current like `admin-design-system.md`). Product-level
taste forks, if any survive the pick-the-winner rule, are batched to Geoff in one question
before the charter commits. The charter also assigns the Task 4 cluster partition (disjoint
file sets, ~6-8 clusters, ordered so the riskiest clusters run while attention is freshest).

**Acceptance:** charter committed; every survey divergence either resolved by a rule or on the
not-standardized list; cluster partition table present; `check:docs` green (link hygiene).

- [ ] Synthesize, batch any forks to Geoff, commit the charter

### Task 4: The sweep (Workflow, clusters in sequence)

**Dispatch:** main loop launches the sweep workflow after Task 3.

**Outcome:** Per cluster, in the charter's order: one polish agent (Sonnet,
`agentType: cairn-implementer`) applies the charter and the cluster's work-list findings,
behavior-preserving, runs the targeted tests plus `npm run check` plus `npm run check:surface`,
and commits (one commit per cluster, message naming the cluster); then two parallel read-only
Opus verifiers attack the diff — one prompted to refute behavior preservation (find an input
whose output changed), one to refute charter conformance (find churn that matches no rule, or
a rule applied wrong). A refuted diff goes back to the polish agent (bounded: two fix rounds,
then the cluster is flagged for main-loop intervention and the workflow continues to the next
cluster). A full-gate agent (`npm test` exit 0 plus the showcase build) runs after every second
cluster and after the final one. The workflow returns per-cluster verdicts, flagged clusters,
and any surface-wants filed.

**Constraints:** clusters own disjoint file sets (cross-cluster fixes queue to the owning
cluster); the spec's invariants bind every agent; a `check:surface` or signatures diff at any
point is a hard stop for that cluster.

**Acceptance:** every cluster committed with verifier sign-off or explicitly resolved by the
main loop; no flagged cluster left open; full gate green at sweep end; the measurements
work-list's fix-in-sweep items all closed.

- [ ] Launch the sweep workflow
- [ ] Resolve any flagged clusters in the main loop
- [ ] Verify the work-list closure

### Task 5: Rider — the consumer-typecheck root gate

**Dispatch:** `cairn-implementer`.

**Outcome:** A public reshape can no longer silently break the showcase or the dev package
(the Task 6 incident from the pruning pass). A root script (suggested name:
`check:consumers`) runs the showcase `svelte-check` and a typecheck of
`packages/cairn-cms-dev`, wired into CI's test or check job. Verify empirically where it can
run: the known worktree dual-install collision makes the showcase typecheck unreliable under a
symlinked-`node_modules` worktree (ROADMAP "Small DX debt"), so the gate must be proven in a
clean-checkout context (CI, or a from-scratch local install), and its script must either work
in a worktree or fail with a message naming the limitation — silent worktree false-failures
are not acceptable.

**Acceptance:** a deliberately-introduced dev-package type error (test it, then revert) fails
the new gate; CI configuration updated; the gate's worktree behavior documented in the script
header; full per-task gate green.

- [ ] Failing proof (inject, observe, revert), implement, wire CI, commit

### Task 6: Rider — admin-build content scope

**Dispatch:** `cairn-implementer`, executing the already-written plan at
`docs/superpowers/plans/2026-06-30-admin-build-content-scope.md` verbatim (test-first, restrict
the admin CSS build's Tailwind content detection to the components glob, the no-foreign-token
sheet test, the `admin-visual` baseline as the no-utility-dropped proof).

**Acceptance:** that plan's own acceptance criteria; its post-mortem note appended there; the
`tailwind-scans-docs-bad-candidate` workaround retired in the docs that teach it.

- [ ] Dispatch, verify against the sub-plan's criteria, commit

### Task 7: Rider — the form-renderer merge (guarded, final)

**Dispatch:** `cairn-implementer` with `model: opus` (novel correctness-critical UI refactor).

**Outcome:** `ComponentForm.svelte` and `FieldInput.svelte` render leaf fields through one
shared renderer, removing the duplicated per-type switches and the double IconPicker wiring
(3c decision 9). Guards, in order: component tests FIRST covering both current renderers'
observable behavior (per-type rendering, validation display, IconPicker integration, and
specifically multi-instance focus behavior — the phase-3a hazard); then the merge; then the
`admin-visual` baseline unchanged and the e2e suite green. **Escape hatch:** if the guards
cannot all be satisfied, revert the merge commits entirely, record the findings in the pass
post-mortem and a ROADMAP Later entry update, and the pass completes without it.

**Acceptance:** either the merge lands with all guards green, or the revert-and-record path is
taken cleanly; no third state.

- [ ] Guard tests first, then the merge, then baselines and e2e; or revert-and-record

### Task 8: Consolidation and pass end

**Outcome:** knip and jscpd re-run with Task 1's exact invocations, deltas recorded in the
measurements doc (the before/after is the pass's quantitative result). The surface-wants list
(if non-empty) goes to Geoff as one batched decision. `code-simplifier` runs once over the full
pass diff as the backstop. Changelog entry under `## Unreleased` (behavior-preserving internal
window; expected zero `Consumers must:` lines — the renderer merge touches only demoted
internals; state that explicitly). ROADMAP: polish entry removed, riders' entries resolved
(form-renderer Later entry per Task 7's outcome). Full gate plus e2e. Then the `cairn-pass`
end ritual: post-mortem with both budget numbers appended here, STATUS rolled on `main` at
merge, merge decision to Geoff.

**Acceptance:** measurement deltas committed; all gates and e2e green; changelog and ROADMAP
consistent with what actually landed; post-mortem present; tree clean.

- [ ] Re-measure, batch surface-wants, simplifier backstop
- [ ] Changelog + ROADMAP, full gate + e2e
- [ ] Pass-end ritual, merge decision

---

## Self-review notes

- Task 4's sequential-mutation design deliberately trades wall-clock for gate reliability
  (same-worktree writes and concurrent `npm test` runs do not compose); the parallelism lives
  in Tasks 2's survey and 4's verifiers, per the spec.
- The per-commit `code-simplifier` deviation is stated in Global constraints with its
  justification and backstop, so the convention's skip is conscious, not forgotten.
- The docs-rewrite Stage 1 research may run concurrently with Tasks 1-4 (no file contention),
  gated on Geoff's docs-spec sign-off, which is still open as of this writing.

---

## Post-mortem (2026-07-02)

**Built.** The idiom charter (`docs/internal/code-idioms.md`, now a standing pass dimension),
the measured baseline and its closing deltas, the nine-step sweep (61 workflow agents, zero
errors: the content-routes decomposition, the idiom convergences, the shared-helper
extractions, the test-harness dedup), three riders (the `check:consumers` gate proven against
an injected error; the admin-css content scope with a 31% shipped-sheet reduction; the
form-renderer merge taken to its revert-and-record outcome, correcting the ROADMAP entry and
banking 23 guard tests), and the consolidation (the two ruled surface changes, the retheme
lockage fix, the changelog window). Final commits `da9d83c..bc43ba7` on `code-polish-1`.

**Verified.** Full gate green at close (285 files, 3,000 tests, exit 0; every check:* gate;
showcase + dev package via the new `check:consumers`); the full e2e flake-free including both
visual baselines; a targeted security review of the two auth-adjacent consolidation commits
(no findings; one awareness note: a no-op accepted mutation emits a success-shaped event,
matching the action's own semantics); the simplifier backstop (one micro-convergence, `asString`).

**Quantified return.** knip findings 61 → 15 (remainder justified in the charter); jscpd clone
pairs 86 → 64 (the `CairnMediaLibrary` html cluster deliberately deferred, filed to ROADMAP);
`content-routes.ts` 3,435 → 128 lines; the shipped admin sheet 416KB → 287KB; the surface
snapshot changed by exactly the nine ruled action renames.

**Budgets.** Subagent tokens ≈ 9.5M (survey 1.43M, baseline 0.22M, sweep 6.89M, riders 0.41M,
consolidation 0.33M, verifiers + backstop 0.27M), of which an estimated 0.4–0.5M was the
memory-maintenance runaway (now guarded by doctrine: the transcript-size + stall watchdog, the
skip-memory-maintenance prompt rule). Main-loop tokens additional; see `/cost`. Human
interaction points attributable to the pass: the plan approval, two front-loaded surface-want
rulings, zero corrections to landed work.

**Durable lessons.** (1) The runaway guard incident and its doctrine (global CLAUDE.md +
memory). (2) The guarded-merge escape hatch converted a wrong ROADMAP idea into an accurate
one plus permanent guard tests — the format earns its ceremony. (3) Sequential mutation with
parallel adversarial verify held: verifiers forced amendments on five of nine steps and caught
a CI-only e2e break pre-CI; the verify:produce token ratio near 1:1 is the deliberate cost.
(4) Calendar time is explicitly not a budget; tokens and attended time are (Geoff, 2026-07-02).
