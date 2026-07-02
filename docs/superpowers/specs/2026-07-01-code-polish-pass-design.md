# Code polish pass: design

Approved by Geoff 2026-07-01 (combined brainstorm with the docs rewrite). Executes before the
docs rewrite: polish is the last cheap-break window, and the docs snippets should imitate the
polished idiom.

## Goal

Consistent, clean, idiomatic code across the whole repo, with a Go-tool-like boringness: one
obvious way per pattern, no cleverness, no bloat, no dead weight. The pass is
behavior-preserving and surface-preserving; the frozen public contract from the surface-pruning
pass (merge `4136cb2`) is a machine-checked invariant, not a discipline.

## Scope

- `src/lib` (the engine), `scripts` (the gate scripts), `src/tests`
- `examples/showcase` (the Wayfinder template; the code a developer copies is where boringness
  matters most) and its tests
- `packages/cairn-cms-dev` (the dev sibling package)

Out of scope: docs prose (the docs-rewrite pass owns it), any public-surface change (filed,
never done; see Invariants), new features, dependency upgrades.

## Phases

### Phase A: the idiom charter

A survey workflow (~10 read-only agents, one per subsystem: content, sveltekit routes,
components/editor, media, delivery, auth+github, nav/site-config, vite/doctor/bins,
scripts/gates, tests, showcase) catalogues where the code does the same thing more than one
way, per pattern family: error and result shapes, validation, factory anatomy, module layout
and barrel conventions, naming, async patterns, logging discipline, test structure (doubles,
event builders, assertion idioms), and Svelte component anatomy (runes idioms).

The main loop synthesizes `docs/internal/code-idioms.md`: agent-facing, exemplar-driven (each
rule names the existing file that is its canonical form; imitating an exemplar beats consulting
a rule), and thereafter a standing pass dimension kept current like the admin design system
doc. Divergences are resolved by picking the winner already in the code wherever one exists;
genuine taste forks that rise to product level are batched to Geoff once. The charter also
carries the "deliberately not standardized" list, so future passes do not re-litigate.

### Phase B: deterministic measurement

One-shot tool runs (npx, no new standing dependencies this pass): knip for dead exports, dead
files, and unused dependencies; jscpd for duplication; a file-size and complexity outlier scan.
Output is a triaged work-list attached to the plan: each finding is fix-in-sweep, justify (with
the justification recorded in the charter), or file-for-decision. A standing dead-code gate is
a candidate the post-mortem weighs, not a deliverable of this pass.

### Phase C: the sweep

A workflow (Geoff's opt-in recorded 2026-07-01) processes module clusters sequentially for
mutation, with parallel read-only verification per cluster:

1. Modules partition into ~6-8 disjoint clusters (by subsystem, matching Phase A's map).
2. Per cluster, in order: one polish agent applies the charter and the cluster's measurement
   findings, behavior-preserving, and runs the targeted tests plus `npm run check`; then
   parallel read-only verifiers check the diff adversarially (one for behavior preservation,
   one for charter conformance, prompted to refute the diff rather than approve it); the main
   loop reviews and the cluster commits (conventional message, one commit per cluster).
3. The full gate (`npm test`, `check:surface`, `check:reference:signatures`, `check:comments`,
   showcase build) runs at minimum every second cluster and always before a commit that
   touched more than one package.

Sequential mutation avoids same-worktree write conflicts and concurrent-gate flakiness; the
parallelism lives in the survey and the verifiers, where it is safe.

## Invariants (machine-checked)

- `npm run check:surface` and `npm run check:reference:signatures` byte-identical throughout:
  a diff in either means the sweep broke the frozen contract and reverts.
- `npm test` exit 0 per cluster; the e2e suite green at pass end (the two known `admin-visual`
  pixel flakes excepted, verified against `main` if they appear).
- Log event names never change (the public-observable contract). Error-message text changes
  only where the charter standardizes a format, with tests updated in the same commit; the
  loud-boundary messages from the pruning pass keep their documented wording.
- Anything that wants a public-surface change goes to a `surface-wants.md` decisions list in
  the pass plan, presented to Geoff once at pass end.

## Riders (land inside this pass)

1. **The `check:dev-package` gate** (friction log, with the Task 6 incident as evidence): wire
   the showcase `svelte-check` and the dev package's typecheck into the root gate so a public
   reshape can never silently break them again.
2. **The admin-build content-scope plan** (already written:
   `docs/superpowers/plans/2026-06-30-admin-build-content-scope.md`): scope the admin CSS
   build's Tailwind content detection to the components glob, with the no-foreign-token test.
3. **The form-renderer merge** (`ComponentForm`/`FieldInput`, ROADMAP Later): the largest known
   duplication, as a guarded final task with its own constraints — component tests first, the
   `admin-visual` baseline as the no-regression proof, and the phase-3a multi-instance focus
   hazard as an explicit design constraint. If the merge cannot satisfy the guards, it reverts
   and returns to Later with the findings recorded; the pass does not block on it.

## Acceptance

- `docs/internal/code-idioms.md` exists, committed, exemplar-driven, covering every pattern
  family the survey catalogued (including the deliberately-not-standardized list).
- The measurement work-list is fully dispositioned: fixed, justified in the charter, or filed.
- knip reports zero unjustified dead code at pass end; jscpd duplication is below the threshold
  the plan sets or justified per instance.
- All gates green, surface snapshot unchanged, e2e green, showcase and dev package typecheck in
  the root gate.
- Post-mortem with both budget numbers; ROADMAP's polish entry removed; STATUS rolled.

## Execution notes

- Feature worktree off `main`, one pass, `cairn-pass` start/end ritual.
- Workflow agents inherit models per the token economy: survey and sweep agents on Sonnet,
  verifiers on Opus (cross-model review diversity), synthesis and triage in the main loop.
- The docs rewrite's Stage 1 research may run concurrently (no file contention); its Stage 2
  waits for this pass to merge.
