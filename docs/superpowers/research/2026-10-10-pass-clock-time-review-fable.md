# Pass clock time: adversarial review of the design (Fable seat)

Written 2026-10-10 against `docs/superpowers/specs/2026-10-10-pass-clock-time-design.md` at `449f5d69`.
Inputs read in full: the evidence doc, the prior-art record, the gate economy plan's post-mortem and
Ledger, the gate economy replay (parts 2 to 4), pass B's plan header and task list in the worktree, pass
A's clock post-mortem, `pass-execute.js` and `pass-execute-chains.js` (structure only), `cairn-run-gate`'s
header, and `pass-core`. No gate or suite was run.

**Verdict: redesign.** The design is well-sourced and most of its small parts are right. Its shape is wrong
for the problem. It spends two passes of build on a merge queue and a capacity scheduler, which together
address about 70 minutes of the measured clock, while leaving the rows that set the clock (agent time,
fix rounds, serial legs, serial review) untouched. Its own projection reaches 6.5 to 7.6 hours only on
inputs the evidence does not support. Priced on the evidence, the design lands pass B at about 9 to 15
hours, most likely 11 to 12, which is roughly where the evidence doc already places today's machinery
(11.4 to 17.2). A leaner cut, mostly of parts the design already contains plus two levers it omits,
reaches about 7 to 9 hours for one small pass of build.

## 1. Will it hit the target? Attacking section 9

Section 9's model: 10 tasks at about 27 minutes, half in pairs (190 to 230), 4 dependent waits (48), 2
fix rounds (60), contention (0 to 30), close (90): 388 to 458 minutes. Each row, against the record.

### 1a. "20 minutes of implementer work and review (pass A's measure)" is a residual, not a measure

The 20 comes from Replay part 4: "a 60-minute chain less the 40-minute midpoint of its 30-to-50-minute
gate." Pass A's own post-mortem says gate time was "not summed, because `cairn-run-gate` ... records no run
durations." So the 20 is 60 minus a guessed midpoint, with a plus or minus 10 spread the design drops. The
only direct measurements are the gate economy Ledger's task clocks, for tasks a fifth the size of pass B's
(0.1 to 0.3M tokens each against pass B's 0.55M budget per chain):

| Task | Chain clock | Gate inside it | Work plus review, derived |
|---|---|---|---|
| GE Task 2 | 57 min | two heavy gates at about 21 | about 15 min |
| GE Task 3 | 31 min plus a 16-min fix round | about 12 min | about 19 min, then 16 more |
| GE Task 7 | 10 min | light | about 8 min |
| Pass B chain 1+2 (87 min, no review) | 8.0 min of edits plus 4.2 of light gates before the first full gate, 2.6 more of fix edits | | about 15 min of implementer time for a 34-file WIP that never reached review |

The design's per-task sequence also contains the runner's own agent dispatches: `pass-execute.js` makes
nine `model: "haiku"` dispatches per run (base SHA, touched files, the independent gate run, the gate-tier
probes, push, CI read), each a fresh agent at 30 to 120 seconds, and the design adds two to four
`pass-stage` dispatches per task. For a pass B-sized task, 22 to 35 minutes of work, review, and runner
overhead before any red is the honest range. That is 20 to 150 minutes over the design across ten tasks.

### 1b. The 5-minute fast lane is 8 to 12 minutes on the measured legs

Section 3 puts "static checks, then the selected unit and component files" in the fast lane at "about 5
minutes." Replay part 2 prices those legs: the `check:close` subset at 364 to 490 seconds (35 to 39 checks
at 11.5 s each; the five heaviest alone are 265 s), the node projects at a fixed 265 to 271 seconds, and
the fixed boot at 71 seconds. Static checks plus node projects is 11 to 13 minutes serial. Vitest `--changed`
could shrink the node leg, if the replay proves it, but the static subset stays. Rule 1 moves only whole
suites to CI, so nothing in the design shortens the static leg. The fast lane as specified is 8 to 12
minutes, 30 to 70 minutes over the design across ten tasks.

### 1c. Fix rounds: the record says four to five, not two

Reviewer fix rounds drawn, per pass: gate economy 5 of 10 tasks (4a, 4b, 5, 3, 6b) plus one reopen and a
fix chain on both close reviews; pass A 4 of 12 tasks (1, 2, 6, 11) plus three S2 boundary fix rounds and
close fix chains of about 3.5 hours. The rate is 40 to 50 percent of tasks, and every close has drawn at
least one chain. On ten tasks that is four or five rounds. A round costs fix work (2 to 16 minutes
measured, 15 priced), a reduced re-gate (5 to 12 minutes under the lanes), and an Opus re-read (5 to 10):
20 to 35 minutes. So 80 to 175 minutes against the design's 60.

Separately, gate reds inside the implementer loop are not in the model at all. Chain 1+2 drew two (R1
`check:facts`, R2 the component project) and GE Task 2 drew one (`svelte-check`). Under fail-fast ordering
each costs a lane rerun of 5 to 10 minutes rather than a full gate. Expect six to ten across the pass: 30
to 100 minutes the model omits.

### 1d. Dependent waits: the plan's shape gives six to eight, and the design makes them longer than today

Section 4 rule 5: "A task that depends on N starts only after N promotes." Independence is mechanical: a
plan mark plus disjoint `Files:`. Pass B's plan marks exactly two: Task 6 independent of 4 and 5, and Task
8 of 7 and 9 only if the S3 pre-flight finds no overlap. Tasks 1 and 2 are disjoint but must land
together, and the plan says "All tasks still run in sequence." So at most two tasks can pair, and
seven or eight transitions are dependent. At 12 minutes (the test job's 663 s, with CI e2e assumed sharded
and a zero queue) that is 84 to 96 minutes; at the measured worst queue (1,232 s) it reaches 200. The
design counts 48.

This row is also a regression against today's runner. The gate economy pass landed pipelining: task N+1
dispatches at N's accept and the runner reads N's CI before N+2 (pass B plan, "CI behind the runner").
The design makes every dependent N+1 wait for N's CI instead. The queue therefore adds 12 to 30 minutes
of pure wait to most transitions that today cost nothing. Zuul and Bors speculatively stack dependent
changes; that is the point of a queue. The design adopts the queue's mechanics and declines its benefit.

### 1e. "About half running in pairs" has no plan support

With two pairable tasks, pairing takes about 55 minutes off the critical path, not the roughly 135 the
190-to-230 row implies. Nothing in the design makes plans mark more pairs; pass B's plan is settled and
out of scope.

### 1f. Contention

The target is measured "with other projects gating at the same time." Under an equal `CPUWeight` split, a
local lane runs at about half speed while the peer gates, and the peer in the evidence held the heavy lock
for 7 to 9 minute stretches three times in 90 minutes. Expect 20 to 60 minutes across ten tasks of 8 to 12
minute lanes, against 0 to 30.

### 1g. The 90-minute close

The gate economy close, on a pass a third of pass B's size, ran from the simplifier at 09:56 to the fold at
12:13: about 137 minutes, with a fix chain on each of two tracks. Pass A's close fix chains alone were
about 3.5 hours. Pass B's close carries the simplifier, a CI read, a from-scratch showcase install and
build, four reviewer seats plus `visual-verifier`, a fix chain, the auth smoke, and the ledgers. The
design's table credits 60 minutes to running the reviewers in parallel; `pass-core` already says "Fan them
out in parallel," and nothing in the evidence shows pass A ran them serially (Replay part 4 says only "1.5
hours as reported"). A realistic close is 120 to 200 minutes. Ninety is reachable only with no fix chain.

### 1h. The staging queue's own mechanics are priced at zero

Per task: a rebase onto the queue tip, a push to `stage/<pass>/<task>`, a CI run, a promotion push, a ref
delete, each through a haiku agent calling `pass-stage`, and on the promotion push a second CI run on the
same SHA (the PR's `pull_request` event fires when the pass branch moves; `test.yml` and `e2e.yml` run on
both events). That is 3 to 6 minutes per task of agent and git latency, 30 to 60 across the pass, plus
doubled CI load, which is the one thing that lengthens the queue the waits depend on.

### 1i. My projection for pass B under the design as written

| Row | Design | Evidence-priced |
|---|---|---|
| Work, review, runner dispatches, 10 tasks | 200 | 220 to 350 |
| Fast lane, 10 | 50 | 80 to 120 |
| Targeted lane | 0 to 40 | 0 to 40 |
| In-chain gate reds | 0 | 30 to 100 |
| Reviewer fix rounds | 60 | 80 to 175 |
| Dependent CI waits | 48 | 72 to 200 |
| Pairing credit | about minus 135 | about minus 55 |
| Staging mechanics | 0 | 30 to 60 |
| Contention | 0 to 30 | 20 to 60 |
| Close | 90 | 120 to 200 |
| **Total** | **388 to 458 (6.5 to 7.6 h)** | **about 600 to 1,250; central 650 to 800 (11 to 13 h)** |

Low end about 9 hours if every optimistic case lands together. The target is missed by roughly two
times, and the design is no better than the evidence doc's own projection for today's machinery once the
dependent-wait regression is counted. Section 8's gate ("continue only if the replay lands pass B at or
under 6.5 hours") cannot catch this: the replay prices gate legs, and the rows that miss are agent time,
fix rounds, waits, and the close, none of which a replay of gate strings can price.

## 2. The biggest clock sink the design does not address

Two, and they are linked.

**The per-task serial chain outside the gate.** In the evidence-priced table above, work, review, runner
dispatches, in-chain reds, and fix rounds are 330 to 625 minutes, half or more of the pass, and the design
leaves every one of them as pass A had them. Within this, the review runs strictly after the fast lane
("locally, in the implementer, before the review"), so the Opus read's 5 to 10 minutes and the lane's 8 to
12 minutes are summed when they could overlap: the implementer commits, the gate starts, the reviewer
reads the same commit while it runs, and the verdict waits only for the gate's exit. Google runs presubmit
beside review in Critique for this reason; the prior-art record cites the SWE book and misses this half of
it. That overlap alone is 50 to 100 minutes on ten tasks and is a runner-only change.

**Serial legs inside every local gate.** The emitted gate is one `&&` chain: static subset, node
projects, component, e2e, in sequence. CI runs the same work in 11.7 minutes because it runs the legs as
parallel jobs. Locally, the static subset (364 to 490 s) and the node projects (270 s) are independent
processes with no browser; run concurrently under the existing memory scope they cost max rather than
sum, about 8 minutes saved per gate. With 12 to 15 local gates a pass (tasks, reds, fix rounds) that is 90
to 120 minutes, from a change to the string `gate-tier.mjs` emits (two process groups joined with `wait`)
or a 40-line `run-legs` helper. The design never mentions it, and it is the single largest lever per unit
of build effort in the whole problem.

Smaller unaddressed sinks, in order: the nine haiku dispatches per task in the runner (the design deletes
one and adds two to four); plan granularity (pass B's Tasks 6, 7, 9 carry 16-minute gates and sub-0.3M
budgets, so their per-task fixed cost of boot, probes, and review setup is a third of their clock; a plan
that merged them into neighbours would save 2 to 3 chain overheads outright); and the fix-round rate, which
no mechanism here lowers (a self-check against the acceptance block before the commit, in the implementer
prompt, is the cheap experiment).

## 3. Where it is over-built for a solo developer

**The staging queue (section 4): cut it.** Bors, Zuul, GitHub's queue, SubmitQueue, and Shopify's queue
exist to keep a trunk green that many contributors land on without coordination. The pass branch has one
writer, a draft PR, and a merge into `main` that is already gated by CI and the close. Nothing consumes the
pass branch mid-pass. The queue's benefit, "nothing ever lands on the pass branch to revert," is worth one
`git revert` commit on a single-writer branch that will be squash-merged. Its cost is a new script, a new
agent seat in the git-critical path, `stage/**` triggers in every repo's CI, doubled CI runs, a fixture
harness with a bare remote and a stubbed `ci-green`, the rebase-conflict failure mode, and the dependent-wait
regression of section 1d. The simpler alternative is what the gate economy pass just built: push each
accepted task commit to the pass branch, let CI shadow it, read N's CI before N+2, and on a red stop the
line and either fix forward in the next chain or `git revert` (Fowler's default). That keeps every task's
CI proof, keeps dependents pipelined, and needs no new code.

**Shared capacity (section 5): keep the cheap half.** Once whole suites leave the local lanes, the heavy
lock's hold time drops from 36 minutes to a few, and the 22-minute lock wait in the evidence mostly
dissolves on its own. Keep the light-lane slots (a few lines of `flock -n` over N files, tested) and the
`defer` exit, both small. Cut PSI admission: its thresholds are "this design's own policy, tuned from
records," which is a new way for a gate never to start under sustained load, and the design offers no
evidence that admission, as opposed to lock wait, cost any clock. `CPUWeight` slices are tested and about
ten lines; keep them if they come free, drop them if they need a test suite.

**Merging the runners (section 6): defer.** The sequential runner is 1,265 lines, the chains runner 931,
and `pass-core` records that the chains runner "disables the push, the reads, and every CI wait." Merging
means adding CI, push, and the protected-path wait to the chains scheduler, then re-proving both modes,
with the stale-copy hazard the gate economy plan names for editing the runner that runs the pass. The
payoff is pairs, and pass B's plan has two. Fix the classifier probe in both files now (the implementer
reports the classifier's stdout; the reviewer checks the receipt, exactly as section 6 says) and merge
when a plan arrives with enough independent tasks to pay for it, as a dedup into a shared module rather
than a scheduling rewrite.

**The `run-gate` rename and state move:** touches every skill, doc, and plan that names the tool, saves no
clock, and the symlink it needs is an admission. Keep the name. Land the four behaviour fixes.

**The fixture-repo harness for the merged runner (section 8, proof 2):** goes with the queue and the
merge. Without them the runner's existing `pass-execute-runners.test.mjs` covers the probe fix.

What remains after the cuts is one dotfiles task (run-gate fixes, slots, defer, over-budget stop, clock
ledger) and one cairn-cms task (lanes in `gate-tier.mjs`, parallel legs, the e2e map coverage test, the
shard matrix), plus prompt text in `pass-core` and the implementer. That is a short pass, not two.

## 4. Divergence from the cited prior art

- **Zuul and Bors (1b).** Both test dependent changes speculatively on top of unmerged predecessors;
  Zuul's whole design is that a change behind N is built as if N had merged. Section 4 rule 5 makes
  dependents wait for promotion, so the design takes the queue's bookkeeping and refuses its speculation.
  The "window of 2" cites Zuul's window, which starts at 20 and halves on failure; at 2 the citation is
  decorative. Every cited queue also serves many contributors on a shared trunk, which the pass branch is
  not.
- **Google presubmit and TAP (1a).** TAP's postsubmit is asynchronous and blocks no later change; the
  design's promotion blocks dependents. Google's presubmit also runs beside code review, which the design
  serialises. "Revert-first in effect" is claimed for a scheme in which nothing lands, so there is nothing to
  revert; the claim is a stretch, and the practice it names (Fowler's revert by default on the slow build's
  red) is the lean alternative the design passed over.
- **Fowler's commit build (1a, 1f).** Ten minutes, fast and reliable, then a secondary build that does not
  block. The design's fast lane claims five minutes and prices at eight to twelve on the record, and its
  slow lane blocks dependents.
- **Playwright sharding (1e).** Faithful. Three shards over 43 spec files with `workers: 1` and
  `fullyParallel: false` per shard will leave the longest shard at about half the single-job time, not a
  third; the design's "about 10 minutes, off-machine" for the whole CI lane already assumes this.
- **Chromium `Include-Ci-Only-Tests` (1a) as `lanes: full`.** Fits.
- **PSI over load average (2e).** `make -l` and `parallel --load` are about not starting new jobs on a loaded
  host, and both are tuned by decades of use. PSI thresholds here are untuned policy on a two-project
  laptop. The citation justifies the metric, not the mechanism.
- **Proof by record (2f).** The principle is right. The runner, by its own header comment, "has no
  filesystem or exec access, so every git/node call here goes through a small probe agent." The design's
  "the runner checks each step against the remote ref's SHA through the same agent's report and the
  script's JSONL record" therefore reads the record through the agent it set out not to trust. Until the
  workflow runtime can read a file itself, the check is the echo. The honest mitigation is to make the
  implementer and reviewer, who do have a shell, check receipts, which section 6 already says for gates.
- **Missing prior art the design should have used.** Presubmit beside review (Critique, above); parallel
  CI jobs as the model for parallel local legs (the repo's own `test.yml`); GitHub Actions `concurrency`
  groups with `cancel-in-progress` for superseded pushes, needed the moment two events run the same SHA;
  Bazel-style cached green legs per tree, which `cairn-run-gate`'s receipts already implement at the
  gate-string grain and could implement per leg so a red in leg 3 does not rerun legs 1 and 2 (evidence
  question 5, unanswered by the design).

## 5. From scratch with the same evidence, ranked by clock saved per unit of build

1. **Run local gate legs concurrently.** Static subset and node projects in parallel, component after
   (shares Vitest's cache), e2e last under the same memory cap. One change to the emitted string or a
   small helper. Saves 90 to 120 minutes a pass.
2. **Whole suites to CI (design section 3, rule 1), fail-fast order, and the docs gate first.** Keep as
   written. Saves 100 to 160 minutes.
3. **Review beside the gate.** The implementer commits, the gate starts, the reviewer reads the commit
   while it runs, the verdict joins at the gate's exit. Runner change in one file. Saves 50 to 100
   minutes.
4. **Keep push-and-shadow pipelining; no staging queue.** Dependents start at accept; CI red is
   stop-the-line with `git revert` or a fix-forward chain. Saves the 84 to 240 minutes the queue would add
   and all of its build.
5. **The four `cairn-run-gate` fixes** (reprint the finished result, reject unknown flags, wait under the
   harness cap, `defer` exit) plus light-lane slots. Saves 15 to 40 minutes of duplicates and waits.
   Small.
6. **Shard the CI e2e job** (design 1e). Cuts the CI wait that remains on the path by about six minutes
   each; 25 to 50 minutes. Copy the YAML.
7. **Per-leg receipts** so a red in leg k reruns only legs k onward. Modest script work; 20 to 60 minutes a
   pass given six to ten in-chain reds.
8. **Plan granularity rule in `pass-core`:** a task whose computed gate is under 20 minutes and whose
   budget is under 0.3M merges into a neighbour unless a seam forbids it. Zero build. Two to three chain
   overheads a pass.
9. **Clock ledger from records and the over-budget stop** (design section 7). No direct clock, but the
   next evidence doc is free and the conductor's wake-up has a number to rule on. Small.
10. **Close:** reviewers in parallel (confirm, since `pass-core` already says so), one batched fix chain,
    CI green on the head in place of any local full gate (already the rule), and a 120-minute budget
    rather than 90, so the first miss is not scored as a defect of the ritual.

Not taken: PSI admission, `CPUWeight` slices unless free, the rename, the runner merge, `pass-stage`,
`stage/**` triggers, the fixture harness, and Vitest `--changed` as a replacement rather than a
replay-gated experiment.

Priced on the same evidence, items 1 to 10 land pass B at about 420 to 560 minutes (7 to 9.5 hours):
work and review 220 to 300 with the overlap, local gates 60 to 90, reds and fix rounds 90 to 200, CI waits
on the path 25 to 60, contention 15 to 40, close 120 to 150. Still over 6.5. The remaining gap is the
fix-round rate and the close, and no mechanism in either design moves those; the honest per-task figure
for a pass B-sized engine task, with a 40 percent chance of a 25-minute fix round, is 40 to 45 minutes
expected, and the target should say so or the plans should carry fewer, larger tasks.

## Summary

Projection under the design as written: 9 to 15 hours for pass B, central 11 to 12, against the 6.5-hour
target; the optimistic inputs are the 20-minute work-and-review residual, the 5-minute fast lane, two fix
rounds, four dependent waits, and a 90-minute close. The top cut is the staging queue, which regresses
dependent waits against today's pipelining and protects a branch nobody shares. The top missing lever is
parallelism the design leaves on the table: concurrent local gate legs and review beside the gate, worth
140 to 220 minutes for two small changes. Verdict: redesign around items 1 to 10 above, as one short pass.
