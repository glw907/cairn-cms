# Pass clock time: design

Status: draft for review, 2026-10-10. Owner: Geoff. Scope: workstation-wide pass machinery, with cairn's own lanes
as the first consumer.

Inputs: the evidence doc (`docs/superpowers/research/2026-10-10-pass-clock-time-evidence.md`, "Evidence" below) and
the prior-art record (`docs/superpowers/research/2026-10-10-pass-clock-time-prior-art.md`, "Prior art"). Every
mechanism here names its published source in Prior art; anything with no source is marked as this design's own
policy.

## 1. Goal

A pass's wall clock is set by its task count, not by contention or rework. The target, measured with other
projects gating on the machine at the same time:

- **About 30 minutes per runner task**, from dispatch to an accepted, CI-proven task.
- **A close of 90 minutes or less.**

For pass B (10 runner tasks) that is about 6.5 hours; the model in section 9 lands at 6.5 to 7.6, at or just over. The gate
economy pass projected 14.8 to 19.0 hours against a 9-hour target and missed it; this design is accepted only when
the replay in section 8 confirms the projection on measured inputs.

Geoff's rulings from the brainstorm, recorded as the design's constraints:

| Ruling | Source |
| --- | --- |
| The target is a per-task budget plus a fixed close, measured under realistic load | 2026-10-10, "whatever best practice is" |
| Independent items run in pairs by default; load is re-read at every decision, never once per run | 2026-10-10 |
| Projects coordinate shared resources with each other, any mix of projects, cairn or not | 2026-10-10 |
| The posture is workstation-wide, and a new project gets it with zero setup | 2026-10-10 |
| Adopt the published method for each sub-problem; invent nothing already solved | 2026-10-10 |

Out of scope: pass B's engine content, which stays as planned; the targeted gate and CI green as the boundary proof,
which are settled and kept (this design changes when and where their legs run, not whether they run).

## 2. Why the gate economy pass did not deliver

From Evidence, sections 2 to 6:

1. A haiku probe answered "classifier absent" before its own `test -f` returned, so every gate fell back to the full
   tier. Fixing it saves only about 9 minutes on chain 1+2, because the classifier also selects whole suites.
2. Whole suites run locally on four of ten tasks: the whole e2e suite (10 minutes, one worker) and the whole
   component project (about 4 minutes). CI runs the same work in 11.7 minutes of wall clock, in parallel jobs, with
   no local lock (`gh run list`, Task 0's run on `1ce14d3b`).
3. Reds surface late. `check:facts` and the component project failed only inside the full gate; each red cost a
   whole rerun plus a lock wait (29 minutes for two reds).
4. A lost `gate exit:` line started a duplicate 36-minute run (R4).
5. The heavy lock is shared with dubplate; this run waited 22 minutes on it.
6. Task work, review, CI waits, and the close are 8 to 11.5 of the projected 11.4 to 17.2 hours, and the close alone
   is 217 minutes of three local full gates, serial reviewers, and serial fix chains.

The structural fix is the presubmit and postsubmit split every large CI shop runs (Prior art 1a): a fast local lane
before commit, the whole suite after, with a staging ref so trunk only receives proven commits (1b).

## 3. Lanes

Each task's gate splits into three lanes. A **lane** is a gate string plus where it runs.

| Lane | Runs | Contents | Budget |
| --- | --- | --- | --- |
| Fast | locally, in the implementer, before the review | docs gate first, then static checks, then the selected unit and component files, with bail flags | about 5 minutes |
| Targeted | locally, after Fast is green, only when the heavy lane is free | the e2e specs the path map names | a few minutes |
| CI | on the task's staging ref (section 4) | everything, including every leg a classifier would run as a whole suite | about 10 minutes, off-machine |

Rules:

1. **No whole suite runs locally inside a task.** When a repo's classifier would select a whole suite, that leg is
   moved to the CI lane. CI runs every leg on every staged commit, so nothing is dropped; the proof arrives about 10
   minutes after commit instead of before it. Source: Google's presubmit and TAP split, Chromium's CI-only tests
   (Prior art 1a).
2. **Fail-fast order.** Cheap and recently failing legs run first: the docs gate (`check:facts` caught R1), static
   checks, then test files, with `--bail`/`-x`. Source: Prior art 1d. Ordering by recorded failure history is a
   later refinement, not this design.
3. **The targeted lane never waits.** If the heavy lane is held or queued when the targeted lane would start,
   `run-gate` defers it (section 5) and the implementer reports the leg as deferred to CI. It is only an early-red
   optimization, since CI runs the same specs.
4. **Escape hatch.** A plan task may set `lanes: full` to force every leg locally, for a change whose CI proof would
   come too late to be useful. Source: Chromium's `Include-Ci-Only-Tests` footer (Prior art 1a).
5. **The slow lane feeds the fast lane.** When CI catches a red that the fast lane missed, the fix chain also files a
   classifier or map fix so the fast lane catches it next time. Source: Fowler's secondary-build rule (Prior art 1a).

**Repo interface.** A repo with a classifier exposes `--lanes`, printing JSON `{fast, targeted, deferred}`. cairn's is
`scripts/checks/gate-tier.mjs --lanes`. A repo without one gets its plan's gate string as the fast lane and its CI
as the deferred proof; a repo with no CI keeps every leg local, coordinated through section 5.

**cairn's selection.** The component and unit selection moves to Vitest's own module-graph selection
(`vitest --changed <base>` with `forceRerunTriggers` covering the shared inputs) if the replay in section 8 shows it
selects at least what `gate-tier.mjs`'s hand map selects on every replayed range; otherwise the hand map stays.
Source: Prior art 1c. The e2e path map stays, since no standard tool maps app source to Playwright specs (1c); it
keeps its run-everything fallback for unmapped paths, and a test asserts every path under `src/` and
`examples/showcase/src/` matches a map entry or the fallback.

**CI sharding.** cairn's e2e job adopts Playwright's documented shard matrix verbatim: three shards, the `blob`
reporter, artifact upload with `if: ${{ !cancelled() }}`, and a `merge-reports` job (Prior art 1e). Sharding stays
per file; `workers: 1` stays inside each shard, since each shard has its own runner and its own backend singleton.

## 4. Staging queue

The pass branch only receives CI-proven commits. This is the Bors pattern (a staging branch, promoted when green)
with Zuul's speculative ordering and window (Prior art 1b). GitHub's merge queue does the same for PRs into a
protected branch; a pass has no per-task PRs, so the Bors shape is the lean fit.

1. **Stage.** When the diff-reviewer accepts task N, the task commit is rebased onto the tip of the queue (the last
   staged ref, or the pass branch when the queue is empty) and pushed as `stage/<pass>/<task>`. CI runs on that
   ref. Each repo's CI workflows gain a `push` trigger on `stage/**`.
2. **Promote.** When a staged ref is CI-green and every ref ahead of it has promoted, the pass branch is
   fast-forwarded to it, and the staging ref is deleted.
3. **Red.** A staged ref that goes red after CI's own retries (Prior art 1g) leaves the queue, so nothing ever lands
   on the pass branch to revert. The refs behind it are rebased onto its predecessor and re-pushed, and only CI
   re-runs. Task N is re-dispatched as a fix chain carrying the CI failure, counted against `maxFix`. This is
   revert-first in effect, since the pass branch never held N (Prior art 1a).
4. **Window.** At most two staged refs are unpromoted at once. After a red, no new ref stages until the queue is
   green again. Source: Zuul's window, which halves on failure (Prior art 1b).
5. **Dependence.** A task that depends on N starts only after N promotes. An independent task may start while N is
   staged. Independence is a plan mark, checked mechanically: two tasks are independent only when the plan marks
   them so and their `Files:` lists are disjoint. The runner refuses a pair whose lists overlap.
6. **Boundaries and the close.** A segment boundary needs every task in the segment promoted. That is the existing
   rule ("CI green is the boundary proof"); here the boundary read is the last promotion, not a separate wait.
7. **Strict waits.** The `auth-data` class's strict CI wait becomes "dependents and the boundary wait for
   promotion." Every task now gets a CI proof before the pass branch holds it, so the class loses no assurance.

The git operations run in a small workstation script, `pass-stage` (stage, check, promote, drop), called by a haiku
agent, since a workflow script cannot run shell. The runner checks each step against the remote ref's SHA through
the same agent's report and the script's JSONL record (section 6), not the agent's prose.

## 5. Shared capacity

All coordination lives in `run-gate` (today `cairn-run-gate`), which every pass gate in every repo already goes
through or will. The runner reads no load and keeps no board. Each mechanism is an existing kernel or systemd
feature (Prior art part 2).

1. **Slots.** The light lane today serializes on one `flock` file. It becomes N slot files
   (`/run/user/$UID/run-gate/light.<i>.lock`), taken with `flock -n` in turn, then `flock -w` in a short loop. The
   kernel frees a slot when its holder dies, so no heartbeat or expiry exists (Prior art 2a, tested). N starts at 3
   and is tuned from the records. The heavy lane keeps its single FIFO lock.
2. **Fair share.** Each gate's transient scope joins a per-project slice, `gate-<project>.slice`, with an equal
   `CPUWeight`. A lone project gets the whole CPU; two projects split it evenly under contention, whichever two they
   are (Prior art 2c, tested on this machine). The existing `MemoryHigh`/`MemoryMax` caps stay.
3. **Admission.** Before taking a slot, `run-gate` reads `/proc/pressure/cpu` and `/proc/pressure/memory` (`some
   avg10`). Above a threshold it waits for a slot rather than starting; the starting thresholds are this design's
   own policy, recorded in the tool and tuned from records. Source: PSI over load average (Prior art 2e).
4. **Defer on a busy heavy lane.** With `RUN_GATE_IF_BUSY=defer`, a heavy-lane gate whose lock is held or queued
   exits at once with a distinct status (proposed 76, "deferred: heavy lane busy") instead of queuing. The targeted
   lane always sets it. No board is needed for this: the lock's own state is the signal.
5. **Messages are for exceptions.** A conductor messages a peer session (`ListAgents`, `SendMessage`) only when it
   needs the heavy lane for longer than about 15 minutes (a `lanes: full` task, or a repo with no CI), or when the
   heavy lock's holder looks stuck. Routine sharing needs no message, because the slots, slices, and pressure check
   apply to every project equally.

Pairs then follow from the plan alone: the runner launches two independent chains whenever the plan allows, and
contention shows up only as slot waits on light gates, which are short because no whole suite runs locally.

## 6. The gate tool and the runner

**`run-gate` fixes** (Evidence sections 3, 6, 7):

1. Rename to `run-gate`, state under `~/.local/state/run-gate/`, locks under `/run/user/$UID/run-gate/`. A
   `cairn-run-gate` symlink stays so running sessions and missed references keep working.
2. A finished result for the same tree and gate string prints again on the next call, from the receipt, instead of
   starting a fresh run (R4's 13-minute duplicate).
3. An unknown argument beginning with `-` is an error, not a gate string (Evidence section 7).
4. The default wait drops below the 600-second tool cap with margin for lock wait, so a call returns exit 75 instead
   of being moved to the background (Evidence section 6).
5. `--lanes` mode accepts a lane name, so one call runs one lane and records it.

**Proof by record, not echo.** The classifier probe agent is deleted. A plan header carries `classifier:` (the
template sets it for a repo that has one), and the implementer runs the classifier itself and reports its stdout.
The runner's independent check is the diff-reviewer reading `run-gate --receipt` and the run record for the reported
gate string, which is the system of record the published practice recommends (Prior art 2f). The runner never acts
on an agent's unverified claim that a file or a result exists.

**One runner.** `pass-execute.js` and `pass-execute-chains.js` mirror each other in about 2,200 lines, and the
classifier bug sat in both. With pairs as the default, the chains runner's scheduling (independent chains in their
own worktrees) becomes the only mode, merged into `pass-execute.js`, and `pass-execute-chains.js` retires. Width is
two by default; a plan may set `concurrency: 1`.

## 7. Clock budget and the close

**Budget.** The plan header template gains `Clock: 30 min per task; close ≤ 90 min`, overridable per task. The
numbers are this design's own policy; no published standard prescribes an agent clock budget (Prior art 1f).

1. The implementer's prompt carries the budget and the dispatch time. Before each lane it checks `date`; if the next
   lane would take the task past twice its budget, it stops and returns an `over-budget` report (done, left, gate
   state). The conductor then splits, upshifts, re-dispatches, or stops.
2. The runner records a clock ledger per task (dispatch, each lane's start and end, slot wait, CI wait, review and
   fix rounds) from the timestamps in `run-gate` and `pass-stage` records, and writes it into the plan's Ledger at
   the end of each run. The next evidence doc then needs no transcript reading.
3. The conductor's wakeup reads that ledger. A task past twice its budget, or any gate running a whole suite
   locally without `lanes: full`, is a stop-or-fix event.
4. Every CI job carries a `timeout-minutes` near 1.5 times its median (Prior art 1f).

**Close, from 217 to 90 minutes or less:**

| Item | Today | New |
| --- | --- | --- |
| Close gates | three local full gates, 67 min | the last promotion already proved the pass branch head; the local full tier runs only when `ci-green` exits 3 |
| Domain reviewers and smoke | 90 min | the four reviewers fan out in parallel, the smoke beside them, about 20 to 30 min |
| Close fix chains | 60 min, serial | through the same runner, in pairs, each on the 30-minute budget |

## 8. Build order and verification

Two passes, workstation first.

**Pass W (dotfiles, workstation).** `run-gate` with section 5 and 6's changes; `pass-stage`; the merged runner;
`pass-core`'s template, rules, and close; the global `CLAUDE.md` posture line; and a `check-drift` probe that flags a
pass plan whose gates bypass `run-gate`. Proofs:

1. A `run-gate` test suite covering the reprint, the unknown-flag rejection, the wait staying under the cap, slot
   release on `kill -9`, the defer exit, and two fake projects sharing slots.
2. The merged runner on a throwaway fixture repo with a four-task plan (two independent), a local bare remote, and a
   stubbed `ci-green` that can be set red. It must show a pair dispatching, a staged ref promoting, a red leaving
   the queue with the ref behind it re-staged, a dependent task waiting for promotion, and the clock ledger landing
   in the plan.
3. The live swap happens when no gate holds a lock; the conductor messages live peer sessions first.

**Pass C (cairn-cms).** `gate-tier.mjs --lanes`; the e2e map coverage test; the `stage/**` CI trigger and the shard
matrix; `timeout-minutes`; `cairn-pass` updates. Proofs:

1. **The replay comes first.** Pass A's 18 ranges and pass B's WIP range are priced through the new lanes, with the
   Vitest `--changed` comparison from section 3. Pass C continues only if the replay lands pass B at or under 6.5
   hours under load. Otherwise it stops and returns to design.
2. The shard matrix proves itself on pass C's own PR: three green shards whose test count sums to 337.

**Resuming pass B.** A diff-reviewer reads WIP `dbdc4556` against Tasks 1 and 2 before anything builds on it; the
resumed run then uses the new runner, and its first chain re-gates that WIP through the lanes.

## 9. Projection for pass B

A model, to be replaced by the replay. Per task: 20 minutes of implementer work and review (pass A's measure), about
5 minutes of fast lane, 0 to 4 minutes of targeted lane; CI runs off the critical path except where a dependent task
waits for a promotion (about 12 minutes each).

| Row | Minutes |
| --- | --- |
| 10 tasks at about 27 minutes, about half running in pairs | 190 to 230 |
| Dependent waits on promotion (assume 4) | 48 |
| Fix rounds (2 at 30) | 60 |
| Contention: local lanes run slower under a CPU split (10 x 3) | 0 to 30 |
| Close | 90 |
| **Total** | **388 to 458 (6.5 to 7.6 h)** |

That sits at or just over the 6.5-hour target. The two levers if the replay lands high: more pairs (the plan's
independence marks) and fewer dependent waits (task order). This is why the replay gates pass C.

## 10. Risks

- **Selection unsoundness.** A missed e2e map entry lets a red reach CI instead of the targeted lane. CI still runs
  everything, so the cost is clock, not assurance; the coverage test and rule 5 of section 3 shrink it.
- **Flaky reds stall the queue.** CI's own retries absorb most (e2e retries twice); a flake that survives is a red
  and costs one fix round.
- **A leaked grandchild holds a slot.** A dev server that inherits a slot fd keeps it held. The slot fd is passed
  only to the gate's own process tree, and the scope's teardown kills the tree when the gate exits.
- **Rebase conflicts in the queue.** Disjoint `Files:` lists make them rare; a conflict drops the ref from the queue
  like a red, and the task re-dispatches.

## 11. Seats

| Part | Produced by |
| --- | --- |
| Lanes, staging queue, capacity, budget, close (sections 3 to 7) | Opus 5.5 at `xhigh`, this session, revised after the prior-art research |
| Prior-art research | two Sonnet agents at `high` |
| Adversarial critique | one Fable dispatch (pending), per STATUS's escalation path |
| Lens reviews, fold, verification | `spec-plan-review`, Opus 5.5 at `high` |
