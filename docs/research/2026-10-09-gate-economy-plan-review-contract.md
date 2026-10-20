# Gate economy plan review: contract and criteria lens

Target: `docs/superpowers/plans/2026-10-09-gate-economy.md` at `211b1a37`. Spec:
`docs/superpowers/specs/2026-10-09-gate-economy-design.md` with both rulings; owed minors from
`docs/superpowers/research/2026-10-09-gate-economy-spec-fold.md`. Lens: is each acceptance criterion
testable by a `diff-reviewer`, does it name its fixture and its failure reason, can it pass
vacuously, does the plan cover the spec and the owed errata, and is the ceremony proportionate.
Per Anthropic's reviewer guidance, findings are limited to gaps that affect correctness or a stated
requirement. Everything else is marked optional.

Facts checked for this review: the CI test steps run `npm test` with the default reporter, and
`examples/showcase/playwright.config.ts` leaves `reporter` unset (CI falls back to `dot`). Neither
emits a machine-readable retry record today. Vitest 4.1.11's JSON reporter writes `retryCount` and
`flaky` per assertion (`node_modules/vitest/dist/chunks/cli-api.CnMVyzaz.js:11749-11751`). The
component project sets `retry: 2` (`vitest.config.ts:194`). The current `gate-tier.mjs` `parseArgs`
ignores unknown flags (`scripts/checks/gate-tier.mjs:223-241`). Besides the six dist-surface checks,
at least ten other `check:*` scripts start with `npm run package` (`package.json:37-82`).

## Counts

0 blockers, 5 majors, 11 minors. Nothing here is an owner fork.

## Majors

### M1. The e2e map's fail-open defaults have no criterion (plan:478-481, 488-507)

**Defect.** Leg 6 carries three safety defaults: an unmapped `src/lib/**` path selects
`golden-path`, `access-map`, and `csrf-origin`; `src/lib/admin/**` takes the admin-visual floor;
`--paint yes` adds the admin-visual spec. No acceptance line tests any of them. The reachability
test is satisfied by any map that names every spec once, so a map whose unmapped default is empty
passes every listed criterion. Task 7 cannot catch this either, because its required miss-rate rows
are static-check reds, not e2e reds. Two more legs are untested: leg 5 (create-cairn-site on its
four input globs) and Decision 3's `E2E_PORT` on the emitted e2e leg. This is the only place the
targeted gate can drop a browser suite, and it is the spec's stated replacement for the
admin-visual tier ("an admin diff adds the admin-visual floor through the e2e map").

**Fold.** Add one table-driven case per default to Task 3's acceptance, each naming its fixture
path and its failure reason:

- `src/lib/cloudflare/turnstile.ts` selects exactly the three auth specs. Fails on an empty
  unmapped default.
- `src/lib/admin/CairnAdminShell.svelte` includes the admin-visual spec. Fails without the floor.
- `--paint yes` on `README.md` includes it.
- `examples/showcase/package.json` selects the create-cairn-site leg, and
  `src/lib/foo/bar.ts` does not.
- Every emitted e2e leg sets `E2E_PORT`.

### M2. The retry path has no reporter source, no absent state, and no `ci-green` fixture (plan:419-427, 433-436, 571-572, 575-585)

**Defect.** Ruling 2 ("green and logged") rests on the annotation. Three gaps make it either
unbuildable as written or fail-open:

1. **No reporter to read.** Task 4a's Outcome says "the existing reporters and their outputs
   stay", and its Files list only "a retries step after each test step". Today neither test step
   writes a report that records retries. The default Vitest reporter and Playwright's `dot` print
   text. The task must add a JSON reporter (`--reporter=default --reporter=json --outputFile=...`
   for Vitest, a second Playwright reporter) to each test step. The plan never says so, and it
   never quotes the field each reporter uses: Vitest's `retryCount`/`flaky` at
   `cli-api.CnMVyzaz.js:11749`, and Playwright's per-result `retry` with test status `flaky`. An
   implementer held to "outputs stay" may parse console text instead.
2. **Absent reads as `none`.** The retry script has no stated report for an absent, empty, or
   malformed report file, for example when a test step crashes before writing. Emitting `none`
   there hides retries. The same hole sits in `ci-green`: a job with no `retries` annotation
   (scaffold, create-site, a cancelled step) has no stated report.
3. **Untested print path.** Task 4b's fixtures are all run-level, so the green-path retry print,
   the thing Ruling 2 builds, has no case.

**Fold.**

- In Task 4a, name the reporter additions in Files and quote both fields in the Outcome.
- Add acceptance: a missing or malformed report emits `retries: unknown (<reason>)`, never `none`.
  Fails if absence yields `none`.
- In Task 4b, add fixtures for an annotation listing one retried test, an annotation reading
  `none`, and an expected test job with no annotation. The last prints "retries not reported" for
  that job. Each fails if the printed retry list differs.

### M3. `ci-green` can read zero runs as green (plan:148-150, 563-566; spec "Expected set")

**Defect.** Green means "every run on the SHA concluded success and the expected set is present."
For a diff whose every path sits under `ignorePrefixes` (`tool/`), the expected set is empty and
the tool workflows are "judged only when present." A probe that lands before GitHub creates the
`tool` runs sees zero runs. Every run concluded success vacuously, so the probe exits 0. That is a
red read as green, which the plan's own "Fail closed" constraint (plan:167-169) forbids. The
`3ef9a8d9` fixture covers the opposite case: tool workflows absent on a non-tool diff.

**Fold.** One sentence in Task 4b's Outcome: zero runs on the SHA is never green. It is pending
until the 5-minute missing clock, then missing. A diff with an `ignorePrefixes` path expects the
`judgedWhenPresent` workflows whose `paths` filter it matches. Add a fixture: a tool-only file list
with zero runs exits 75 (and 2 past 5 minutes). Fails if it exits 0.

### M4. Two spec mechanisms have no standing home, and this close drops one (plan:641-663, 781-793)

**Defect.** The spec defines two close-time duties:

- Ruling 2: "the close lists every retried test".
- "Selection misses": "The close counts them; two in one pass reopen the bucket table."

This pass's close counts misses (plan:791-792) but never lists retried tests. Neither duty reaches
a standing rule. Erratum 2 (`cairn-pass` Closing step 2) covers only `ci-green` and the fallback,
erratum 1 only the conditional CI rule, and erratum 9 (pass B's plan) neither. Under "a rule lives
where it executes," pass B would run on the new gate without counting the misses that are the
audit's only reopen signal (Ruling 1: "the audit's reopen signal becomes the selection-miss count").

**Fold.**

- Task 6a, erratum 2: `cairn-pass` Closing step 6 lists every retried test from the `ci-green`
  records and counts selection misses (a CI red on a commit whose targeted gate was green); two
  reopen the bucket table. Add a `grep` post-condition for both phrases.
- Close step 6 here: add "every retried test, from `ci-green`'s output".

### M5. Task 7's "fewer rows than the known events fails" has no independent count (plan:705-707, 744-750)

**Defect.** The same agent that writes the miss-rate table enumerates the known events, so the
guard against a vacuous table checks the agent against itself. A reviewer has only the table. The
S3 pre-flight already reads "PR #108's run list" and "the archive directory's existence and
count," but the plan never turns those reads into a floor handed to the reviewer.

**Fold.** The S3 pre-flight records the floor: the count of non-success runs on PR #108 by
workflow and SHA, plus HISTORY's "What the gates caught" items for pass A. The conductor pastes
that count into Task 7's dispatch and the reviewer's criteria. Acceptance becomes "the included
rows plus the excluded rows equal the pre-flight's count, each excluded row with its reason." The
check fails if the totals differ.

## Minors

### m1. Plan:467 contradicts itself on the dist-surface checks

"Every check whose script starts with `npm run package` inherits the engine bucket" includes the
six dist-surface checks, which the next clause selects "on the export-surface bucket only." The
spec says "Every **other** check." Acceptance plan:492-493 resolves the conflict, but the Outcome
the reviewer reads verbatim does not. **Fold:** restore "other."

### m2. The unknown-class criterion does not pin the known classes (plan:503-504)

"An unknown class exits non-zero with empty stdout" passes even when the classifier rejects
`engine-logic`. That rejection silently pushes every classed task onto the plan-gate fallback,
because Task 5 makes both runners pass `--class` on every classed task. **Fold:** add "each of the
six `PASS_CLASSES` names is accepted, and only `auth-data` changes the output." Fails if any known
name exits non-zero.

### m3. Task 3's self-gate criterion gives the wrong reason (plan:506-507)

Task 3's Files (`gate-tier.mjs`, its table, `src/tests/unit/` tests, the doc) match no entry in
`COMPONENT_RERUN_TRIGGERS`. The whole component project would run through the empty-selection
rule, not because "the trigger list is a trigger". If the implementer edits the trigger file, the
reason becomes true by accident. **Fold:** drop the parenthetical, or say "(an empty selection on a
non-docs diff)". Fixture: the task's own range.

### m4. Nothing tests the "no-check list" (plan:469)

A path on the list runs no static check, and with Decision 2 it can also skip leg 4. Nothing
bounds the list's membership, so an implementer can grow it into a fail-open escape. **Fold:** the
Outcome names the list's members (or caps it at paths no check reads), and a unit test pins it.
Fails on an added entry.

### m5. Lint and comment coverage of the new `scripts/` files has no criterion (plan:170-171, 381-382)

The `lint` glob (`package.json:79`) excludes `scripts/` today, and nothing would fail if it still
did. **Fold:** add acceptance "`npm run lint` and `npm run check:comments` each report a seeded
violation in `scripts/checks/close-prebuilt.mjs`; quote the red, then revert."

### m6. The trigger canary is a recurring clock cost (plan:500-502)

The canary runs in the node projects on every per-task gate and every CI run from now on. One
`createVitest` per trigger entry is about 17 instances at 4 s or more each (spec probe: 4 s for
`package.json`). That is over a minute added forever, in a pass whose purpose is cutting clock.
Glob entries such as `src/tests/**/fixtures/**` also need a concrete instance path. **Fold:** one
Vitest instance re-queried per entry. Name one real path per glob. Report the canary's seconds.

### m7. Decision 1 leaves pass-core's `docs` row without a gate (plan:211-215, 641-646)

Once the targeted gate is the default output, "the docs tier" in pass-core's class table comes only
from `--pin docs`. A docs-class task run through `pass-execute` now gets the package build plus the
full node projects (about 4 minutes) instead of the docs gate. **Fold:** one of two lines.

- Erratum 1 updates the `docs` row to name the targeted gate or `--pin docs`.
- `--class docs` prints the docs tier, with one acceptance case.

### m8. Task 4a's live-CI criterion has no failure route (plan:444-445)

The `retries` notice "on each test job" is checked only at the S1 boundary, after the review
accepted the task. If a notice is absent, no stop or fix rule applies. **Fold:** under "Running
unattended," an absent notice is a Task 4a fix round.

### m9. Missing states in Task 4b's inputs and Task 1's summary (plan:197-200, 537-539)

`ci-green` has no stated report for an absent or malformed `.github/ci-green.json` at the SHA, for
example a SHA from before Task 4a. A crash exits 1 and reads as red with a misleading cause.
`cairn-run-gate --records` has no stated report for an absent records file. **Fold:** absent or
malformed expected-set file exits 3 with the reason (one fixture). An absent records file prints
zero sums and exit 0.

### m10. Task 5 has no case for missing (plan:613-618)

The state machine treats "red or missing" alike (spec step 4), but acceptance has no case for
`ci-green` exit 2. **Fold:** add "missing (exit 2) halts with the `ciRed` record."

### m11. Class fit for Tasks 7 and 6b (plan:678, 718)

- Task 7 is declared `engine-logic`, but it writes one research record and no code, so the
  test-first mandate has nothing to apply to.
- Task 6b is `docs`, whose bar is the register chain. The plan reviews it with `diff-reviewer`,
  correctly, since the register governs published docs and not internal plans, but it does not say
  so.

**Fold:** name Task 7 "measurement, no test mandate" and state 6b's reviewer as a deliberate
departure. Optional; the wording affects only what the reviewer is told.

## Proportionality and over-ceremony (ranked by clock and token cost)

1. **The Task 0 clock exclusion** (plan:54-58). The plan does not count about 25 minutes of setup
   and baselines toward the 4.25 h figure. The baseline is itself a haiku dispatch, so "from the
   first execution dispatch" arguably includes it. In a pass whose headline metric is clock, the
   score should report it on its own line instead of dropping it. Minor, scoring only.
2. **Pre-flight breadth** (plan:337-363, 744-750). About 30 fact checks over three haiku agents, many
   already re-verified by the fold (trigger shapes, timeouts from PR #109, the Vitest paths). The
   cost is low (about 0.2M, run in parallel with setup), and pass-core's pre-flight owns staleness.
   Optional trim: drop the items the fold record lists as re-verified on 2026-10-09.
3. **Mutation proofs in `engine-logic` tasks** (Tasks 2, 3, 4a, 6a). pass-core requires mutation
   proofs only under `auth-data`. Here each one guards a pin test whose failure mode is a vacuous
   pass, at a few implementer minutes apiece. Proportionate; keep.
4. **The plan's length** (819 lines). The interfaces, decisions, and unattended rules are
   load-bearing for a two-track run, and no agent but the conductor reads the plan. No cut is
   recommended beyond item 2.

The gates, review bars, and close steps otherwise match each declared class. The S1 boundary on
CI follows Geoff's settled ruling, and D is the dotfiles full gate.

## Spec coverage map

| Spec item | Plan home | Status |
|---|---|---|
| Run records, summary filter | Task 1, interface 1 | Covered (m9: absent file) |
| Per-task gate legs 1 to 6 | Task 3 | Legs 5 and 6 defaults untested (M1) |
| Check buckets, dot prefixes, unmatched path | Task 3 | Covered (m1, m4) |
| `auth-data` gate plus CI wait | Interface 5, Task 5 | Covered (m2) |
| Trigger canary | Task 3 | Covered (m6 cost) |
| One build per local gate, CI-covers-close test | Task 2 | Covered (m5) |
| Timeout test, retry annotation | Task 4a | Reporter gap (M2) |
| `ci-green` states and exit codes | Task 4b | Zero-run green (M3), retry print (M2) |
| Pipelining state machine | Task 5 | Covered (m10) |
| Selection-miss count; two reopen | This close only | No standing rule (M4) |
| Ruling 1 (probe dropped) | Task 7 | Covered |
| Ruling 2 (green, logged; close lists retries) | 4a, 4b | Close listing missing (M4) |
| Rules where they execute, errata 1 to 8 and 13 | Task 6a | Covered (M4, m7) |
| Errata 9, 11 | Task 6b | Covered |
| Erratum 10 | Task 3 | Covered |
| Erratum 12 | Close step 6 | Covered |
| Draft-branch amendments | Task 2 | Covered (m5) |
| Acceptance: timed ranges, miss rate, projection | Task 7, Decisions 8 and 9 | Miss-rate floor (M5) |
| Owed m2, m3 | Task 4b Outcome | Covered; m2's `--job` versus `--failed` split has no case (optional) |
| Owed m6 | Task 2 | Covered |
| Owed m8 | n/a | Moot under Ruling 2's yes |
| Owed m9 | Decision 4, Task 4a | Covered |

One note for Task 7, no fold required: if the S2 `check:self-use` red came from a non-index
`src/lib` path, the export-surface-only rule misses it. The spec's "every included row is selected"
then forces adding `self-use` to the engine bucket through a Task 3 fix round. Stating that outcome
in advance as the expected fix keeps it from arriving as an `escalate` that stops the run.
