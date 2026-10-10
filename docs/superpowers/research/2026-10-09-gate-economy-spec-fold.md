# Gate economy spec review: fold record

Target: `docs/superpowers/specs/2026-10-09-gate-economy-design.md` at `71ceb10b`. Reviews:
`2026-10-09-gate-economy-review-{contract,mechanics,risk,consistency,practice}.md` in this
directory. One disposition per finding. Convergent findings fold once, at the root, and list every
ID. Facts re-verified before folding: every PR workflow already sets `cache: npm`; no workflow sets
`timeout-minutes`; `test.yml` never calls `check:close`; `check:package` runs `attw --pack .` while
`prepare` is `npm run package`; `check-audit-pack.mjs:179` packs with `--ignore-scripts`;
Playwright retries 2 on CI and 0 locally (`playwright.config.ts:30`); the five filter-out
workflows and the two filter-in tool workflows all trigger on `pull_request`; `norms` is
`workflow_call` only, `tsgo` schedule only, `publish` release only; pass A ran 8 of 12 tasks as
`auth-data` (plan lines 28 and 29); no coverage provider under `node_modules/@vitest/`; pass A's
gate logs are archived at `~/.local/state/cairn-gate-archive/2026-10-09-pass-a` (336 dirs).

ID prefixes: C contract, X mechanics, R risk, S consistency, P practice.

## Roots folded once

| # | Root defect | Finding IDs | Disposition |
|---|---|---|---|
| 1 | `ci-green`'s expected set used the wrong diff and ignored unexpected reds; conclusions undefined | C-M4, X-M1, X-m6, R-M1, S-M6 | Folded: "`ci-green`", Red and Expected set. Any non-success run on the SHA is red; the expected set is the five filter-out workflows on the PR's three-dot file list; tool workflows judged when present; a workflow-shape pin test. The proposed YAML glob evaluation is not taken: the run objects carry the filter outcome, so a fixed classification plus a pin is leaner. |
| 2 | Pending, missing, and unreachable had no behavior or wait protocol | C-B1 (pending, missing, unreachable parts), R-M3, P7 | Folded: Pending, Missing, Unavailable, `--wait` on the exit-75 convention, a 60-minute deadline, the conductor's `run_in_background` wait. |
| 3 | Infrastructure reds and hangs stop the line on a non-defect | X-M2 (candidate fork), R-M3 (timeouts), C-m3 | Folded as the spec's decision, not a fork: one automatic `gh run rerun --failed` on an infra-classified red, second red is red; job and step timeouts with a parse test; `norms` timeouts inside `norms.yml`. Dominant answer: with about 50% odds of a hang per pass (5 of 631 runs), "every infra red waits on a human" defeats the unattended goal. |
| 4 | Push point, red with N+1 in flight, fix-round owner, CI-red rules | C-B1 (push and red parts), R-m2, X-M4, R-M4, S-M5 | Folded: the six-step state machine. Push after the implementer's commit; N+1 finishes; the runner stops with a `ciRed` record; the conductor dispatches one CI-fix chain counted as N's one `fix`; a second red stops the pass. X-M4's in-runner fix chain is not taken: the runner's existing stop path plus a relaunch needs no new runner code. |
| 5 | Chains, parallel mode, and default-branch runs cannot pipeline | C-B2 (chain and deploy parts), R-B1, X-M3 | Folded: pipelining is opt-in through `ci: { pr }`, sequential mode only; chains and parallel read `ci-green` at boundaries. R-B1's draft PR per chain branch is not taken (CI load on a shared job pool, R-m5). |
| 6 | "CI and local both build once" was false; the extra builds are certain | C-M5, X-M6, S-M2, S-O2, S-m4, S-O3, X-m4 | Folded: CI keeps per-step checks (S-M2's option, the claim struck); `check:package` packs with `--ignore-scripts`; `docs-gate --prebuilt`; the list moves into the runner as an exported array; no "verify whether" probe. X-M6's CI rewire is filed, not done: about 2 min a cycle, against a list reconciliation and lost per-step timing. |
| 7 | Install caching is already done or against vendor advice | C-O2, X-O2, R-O1, S-O1 | Folded: the item is dropped; the spec says why. |
| 8 | The replay's red set was ephemeral, unattributed, and could be vacuous | C-M1, X-M8, R-M8, S-M8 | Folded: an enumerated table from the runs API on PR #108, HISTORY, and the archive; S2's three reds required; last-green..first-red attribution; exclusions listed; `vitest list` for component selection; fewer rows than known events fails. The archive keeps only the latest log per gate string, so GitHub is named the SHA-attributed record. |
| 9 | The projection had no inputs, no bar, and no CI wait | C-M3, S-M7 | Folded: a labeled model, 9-hour bar, `ci-green` wait records, pass B as the real measure. |
| 10 | `auth-data`'s per-task gate undefined; "reduced" overloaded | C-B3 (candidate fork), R-m1, S-m2 | Folded as the spec's decision, not a fork: the targeted gate plus the auth e2e specs, then CI green; "reduced" keeps its fix-round meaning. Dominant answer: every `auth-data` commit gets the full suite on CI before the next task, which exceeds pass A's boundary-only full gate; the local duplicate doubles the run on 8 of 12 tasks for no added coverage. |
| 11 | Timed ranges unnamed; admin-visual and full tiers undefined; 10 min unreachable on engine ranges | C-M2, X-M9 | Folded: named ranges chosen before timing; one gate replaces the tier strings; dist-surface checks select on an export-surface bucket; a miss revisits the table once, then is recorded and carried. |
| 12 | Task graph and "dotfiles only" claims contradicted the tasks | C-M6, S-M3 | Folded: per-check timing moves to Task 2; graph restated. |
| 13 | Run records cannot separate passes or catch abandoned runs | C-M7, R-M7, S-m1 | Folded: toplevel, branch, HEAD, lane, outcome; written by the detached run; `jq` plus one `printf` under `flock`; `model-economy.md` erratum. |
| 14 | The coverage probe cannot measure workerd with V8; no provider; "thin" undefined | X-M5, C-m1, S-m6 | Owner fork: Ruling 1. The "no" answer carries the istanbul, `--no-save`, named-globs fix. |
| 15 | The input map fails open on unmatched paths and dot globs, and costs more than it saves | R-M6, X-m1, X-O3 | Folded: coarse buckets, unmatched path runs every check, literal dot prefixes with a match test, dist checks inherit the engine bucket mechanically. |
| 16 | A selection can drop the only build | X-M7 | Folded: `npm run package` is the gate's unconditional first leg. |
| 17 | Empty `related` selection exits 0; deletes never selected | X-m2 | Folded: `vitest list` detects empty; delete or rename forces the whole component project. |
| 18 | Retry counts unreadable by `ci-green` | X-m3, C-O3 | Folded: `::notice` annotations through the check-runs annotations API. |
| 19 | A CI retry hides a defect the zero-retry local gate would catch | R-M2 | Owner fork: Ruling 2. |
| 20 | Local Vitest component retry also hides | R-m6 | Refused: the component project retries twice locally and on CI today; this pass moves no assurance on it. |
| 21 | The e2e map has no unmapped default and rots | C-m4, X-m5, R-m4, R-O2 | Folded: a coarse directory-prefix table, the admin floor, three auth specs for unmapped `src/lib/**`, a reachability test. |
| 22 | pass-core is shared with site-pass | S-M1 | Folded: the conditional rule; cairn mechanics in `cairn-pass`; site-pass unchanged. |
| 23 | ROADMAP inputs undispositioned; the canary precondition missing | S-M4 | Folded: the trigger canary joins Task 3; erratum 11 dispositions the rest. |
| 24 | Merge-ref base moves; base reds misattributed; close green can be stale | R-M5, P9, X-M2 (external-red part), C-B2 (conflict part) | Folded: on red, `ci-green` prints `main`'s latest conclusion; the close's green must sit on `origin/main`'s head. The separate `conflict` exit code is not taken; conflict is printed as the cause of Missing. |
| 25 | tellgrader is blind on CI | S-m3 | Folded: the docs bucket selects it; marked local-only. |
| 26 | Source drift in the motivating numbers | S-m5 | Folded: 17 h cited to the inputs' netted figure; "25 times" dropped; the 111-file sentence reworded. |
| 27 | `pass-gate-tiers.md` changed but unlisted | S-m7 | Folded: erratum 10. |
| 28 | Nothing pins CI covering every close component | C-m2 | Folded: one test in Task 2. |
| 29 | Nothing pins the `auth-data` CI wait between table and runner | C-m5 | Folded: Task 6 extends the PASS_CLASSES pin. |
| 30 | Acceptance lines lack a fail consequence | C-m6 | Folded: every line names one. |
| 31 | Tasks 2 and 4 would classify as the 45-minute full tier | C-O1 | Folded: each task's gate is pinned in the outline. |
| 32 | The implementer rule cannot be tested | C-O4 | Folded: one line, no criterion. |
| 33 | Live red, pending, and missing pushes cost a CI cycle each | X-O1 | Folded: recorded-JSON fixtures plus one live call. |
| 34 | The 3.5-hour estimate is unreachable as scoped | X-O4 (candidate fork) | Folded as the spec's decision: 4 hours with the tally. A forecast is not a choice; the cuts that bring 5 to 5.5 h down to 4 are method calls, and 4 h sits well under the 7 h Geoff called excessive. |
| 35 | Fallback local gate inherits the visual-baseline trap | R-m3 | Folded: the rule is quoted in the Unavailable bullet. |
| 36 | Per-task pushes load a shared job pool | R-m5 | Folded: queue time in the `ci-green` record; concurrency stays off. |
| 37 | An agent can weaken a test or narrow its own gate | P1 | Folded in part: the `diff-reviewer` blocking finding and the holdout statement. Refused in part: protected paths forcing the full gate and a removed-lines metric (new machinery, no measured instance). |
| 38 | Red handling should park the in-flight task and prefer revert | P2 | Refused: N+1 finishes and is re-reviewed only if the fix touches its files, which wastes less than parking; revert stays the conductor's option. |
| 39 | Close should be bound to `ci-green` by a hook | P3 | Refused: no measured close without its gate; a Stop hook is overridden after eight blocks; `cairn-pass` names the step. |
| 40 | Miss-rate zero is a floor, and needs a standing metric | P4 | Folded: selection misses counted at the close; two reopen the bucket table. |
| 41 | A known-flaky red halts dispatch | P5 | Refused: Playwright and the component project already retry twice, so a flake that reaches red failed three attempts; the infra rerun (root 3) covers setup reds; a quarantine list is new state with no measured halt. |
| 42 | Pipeline state lives in the conductor's context | P6 | Folded: the `ci-green` wait records and the `ciRed` record persist it; `ci-green` is stateless. |
| 43 | Fresh-context subagent review | P8 | Refused: the source agrees with the spec; nothing to fold. |
| 44 | The suite audit Geoff asked for | S-F1 | Refused: settled. Geoff: "If there's nothing to suggest any issues with test coverage or performance, then the audit isn't necessary." |
| 45 | Owed errata unlisted | S errata list | Folded: the spec's "Owed errata" section, 13 items, none edited here. |

## Counts

84 finding IDs across the five reviews (contract 20, mechanics 19, risk 17, consistency 19,
practice 9). Folded 74, refused 6 (R-m6, P2, P3, P5, P8, S-F1), owner fork 4 (X-M5, C-m1, S-m6 as
Ruling 1; R-M2 as Ruling 2). Of the four candidate forks raised, two were taken as the spec's own
decision with a reason (`auth-data` gate, infra reruns), the clock estimate became a revised
forecast, and the retry question stays a ruling.

## Measures

**New-mechanism findings folded (9), each with its source and measured defect:**

1. `ci-green --wait` on the exit-75 re-issue convention. Source: `cairn-run-gate`, this
   workstation's gate protocol since 2026-09-09. Defect: the workflow runtime has no exec access
   (`pass-execute.js:65`), a Bash call caps at 10 minutes, and the CI test job runs 663 s.
2. The 60-minute unavailable deadline. Source: GitHub merge queue's status-check timeout (default
   60 minutes). Defect: run 37988147542 sat `in_progress` over five hours; a 1,232 s queue on
   2026-10-09.
3. One automatic rerun of an infra red. Source: GitHub's stock `gh run rerun --failed`; Meta's
   predictive test selection reruns failures to separate flakes. Defect: 5 of 631 runs hung about
   six hours, about 50% odds per pass.
4. Job and step timeouts. Source: GitHub workflow syntax. Defect: the same five hangs (three on
   `npm ci`, one on `playwright install`).
5. Run-record attribution fields and the `flock` append. Source: the existing `cairn-run-gate`
   lock and util-linux `flock`. Defect: lock waits of 14 to 33 minutes from other sessions in pass
   A, so two passes' runs interleave in one file.
6. `ci-green` wait records. Source: Anthropic's long-running-agent harness post (a JSON progress
   log). Defect: the close score would miss the CI wait the design moves onto the critical path,
   8 of pass A's 12 tasks.
7. Retry annotations. Source: GitHub workflow commands and the check-runs annotations API. Defect:
   CI retries Playwright twice (`playwright.config.ts:30`), so a pass on retry is invisible.
   Contingent on Ruling 2.
8. The selection-miss count. Source: Meta, predictive test selection. Defect: S2's two
   static-check reds the per-task gate skipped, about one hour.
9. The `main` comparison on red. Source: Google TAP's culprit finding (Memon et al., 2017).
   Defect: `tool` went red on govulncheck on every push from `5549fda8`, seven reds with no defect
   in the pass.

**New-mechanism findings refused (10):** YAML glob evaluation for the expected set; a separate
`conflict` exit code; an in-runner CI-fix chain; a draft PR per chain branch; rewiring CI to build
once; parking or rebasing the in-flight task; a close-binding Stop hook; protected paths forcing the
full gate plus a removed-lines metric; a flaky quarantine list; local Vitest retry reporting.

**Spec length:** 150 lines before, 352 after. The growth is the `ci-green` and state-machine
definitions the lenses found missing, the owed errata list, and two rulings.

**Ceiling:** 4.0M tokens, unchanged (settled). The cuts (chains pipelining, install caching,
live-push tests, the per-check map, and the coverage probe if Ruling 1 is yes) lower the expected
spend. Clock estimate revised from 3.5 to about 4 hours on the critical path.
