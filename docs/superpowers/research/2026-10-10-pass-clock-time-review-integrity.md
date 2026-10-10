# Pass clock time: integrity and failure-risk review

Reviewed 2026-10-10. Target: `docs/superpowers/specs/2026-10-10-pass-clock-time-design.md` at `449f5d69`
("the spec" below; locations are `spec:<line>`). Lens: data integrity and failure risk only. What happens on a
crash, a concurrent process, a partial write, the live rename, a restore, or a workflow resume, and whether work or
git history can be lost or silently corrupted. Context read: the evidence and prior-art docs, `~/.local/bin/cairn-run-gate`,
`~/.local/bin/ci-green`, both runners, `pass-core`, pass B's plan and branch state, and cairn's `.github/workflows`.

Bottom line: the lane split, slots, and receipts are sound in shape. The staging queue (section 4) states its
invariant ("the pass branch only receives CI-proven commits") but not the mechanics that keep it under concurrency
and crash, and pairs make concurrent staging the common case rather than an edge. Most findings fold into one
paragraph: a **pass-stage contract** (B1, M1, M2) plus four fixture proofs. One claim in section 10 is false on this
machine (M7, tested).

Counts: 1 blocker, 10 major (one an OWNER FORK), 8 minor; 4 over-ceremony items.

## Correctness gaps, ranked by consequence

### B1 (blocker). Queue mutations are neither serialized nor compare-and-swap

**Location:** spec:103-107, spec:122-124; proof list spec:210-213.

**Defect.** Stage reads "the tip of the queue" and pushes on top of it; promote fast-forwards the pass branch. With
two chains, both reviewers can accept within seconds of each other, so two `pass-stage stage` calls race: both read
tip T, both rebase onto T, both push. The queue then holds two refs each parented on T, each CI-proven alone and
never together. Promoting the second is a non-fast-forward. If `pass-stage` pushes without force, the push is
rejected and a Haiku agent is left to improvise (`git pull --rebase && git push` lands an untested combination on
the pass branch, which is the exact failure the queue exists to prevent). If it uses `--force` or a local
`update-ref`, the first task's promotion is erased. The same race applies to red handling: a re-stage of the ref
behind a red (spec:109) and a fresh stage from the other chain can interleave. The fixture proofs (spec:211-213)
cover a pair dispatching and a red re-staging, but not two stages arriving together.

**Fold.** Add a pass-stage contract to section 4:
1. `pass-stage` is the queue's only writer. Every mutating command takes a per-repo `flock` (on the repo's git
   common dir, so both worktrees share it) for its whole run.
2. Every ref update is compare-and-swap: stage and re-stage push with
   `--force-with-lease=refs/heads/stage/<pass>/<task>:<expected>` and `--atomic`; promote is a plain, never-forced
   push of `<staged sha>:refs/heads/<pass>`, and `pass-stage` first asserts the staged commit's parent chain
   contains the current remote pass tip (`git merge-base --is-ancestor`). A rejected push is a stop with a
   distinct exit, never a retry with a different strategy.
3. Queue order is git ancestry, not names or timestamps: each staged ref must descend from the ref ahead of it.
4. Fixture proof added to spec:211: two stage calls issued concurrently end with the second stacked on the first,
   and a promote with a stale expected SHA refuses.

### M1 (major). Resume and agent echo: the runner's queue state can go stale

**Location:** spec:122-124, spec:187; the "check the record, not the echo" claim at spec:166-170.

**Defect.** The runner has no exec, so "the script's JSONL record" reaches it only through the same Haiku agent's
report, which is the echo the design means to stop trusting (R1's probe answered before its tool result). A
fabricated "promoted" starts a dependent task on a base that lacks N. On a workflow resume after a session dies
mid-queue, the runner can also hold SHAs from before a red re-stage (N rebased to N'), and read CI on a superseded
SHA. A re-run `stage` for a task already pushed before the crash rebases it again onto a tip that may already
include it. Separately, run-gate's records are best effort by design (`cairn-run-gate` lines 64-67), so a JSONL
line cannot be the system of record for promotion.

**Fold.** Into the pass-stage contract: (a) git is the system of record: the stage ref name carries the task id,
and each staged commit carries a `Pass-Task: <id>` trailer, so `pass-stage status <pass>` derives the queue and the
promoted set from `git ls-remote` and the pass branch log alone; the JSONL is telemetry. (b) The runner calls
`status` before every queue decision and never acts on a SHA from its own memory or a prior agent's report.
(c) `stage` is idempotent by task id: an existing `stage/<pass>/<task>` whose trailer and source range match is
reported, not re-rebased. (d) A dependent task's dispatch verifies `merge-base --is-ancestor <N's promoted sha>
HEAD` in its worktree before the implementer starts. With CAS from B1, a hallucinated report can stall the queue
but cannot corrupt a ref. Fixture proof: kill the session between push and promote, resume, and the run completes
with no duplicate stage and no lost task.

### M2 (major). The two-worktree base and sync model is unspecified

**Location:** spec:103-105, spec:114-116, spec:172-175.

**Defect.** The merged runner keeps one worktree per chain on its own branch (`pass-execute-chains.js` lines 2-3,
370). Staging rewrites SHAs, so after N promotes as N', the chain branch still holds N. Three things are then
undefined:
1. **The rebase range.** "The task commit" is singular, but a task is an implement commit plus fix commits.
   Computing the range from a merge base with the pass branch picks up N again (N and N' are not ancestors of
   each other), so the next task's stage replays N onto a tip that has N'.
2. **The next task's base.** A dependent starts "after N promotes" (spec:114), which means from the pass tip, so
   the chain worktree must be moved to a tip that is not a fast-forward of its branch. A `reset --hard` there
   destroys any uncommitted work (see M10) and races a still-running agent from a prior attempt (the "one executor
   per worktree" rule).
3. **A rebase interrupted mid-way.** If `pass-stage` rebases inside the task's worktree and dies, the worktree is
   left mid-rebase, and the next implementer dispatched there commits onto it.

**Fold.** Each task gets a fresh worktree created at dispatch from the queue tip (independent) or the pass tip
(dependent), with its base SHA recorded in the dispatch. Staging is `rebase --onto <queue tip> <base> <head>`
performed with plumbing that touches no working tree (`git replay`, or `git merge-tree --write-tree` plus
`commit-tree`), so a crash leaves no half-rebased checkout. A worktree is removed only after its task promotes and
`git status --porcelain` is empty. This also removes the chain-branch sync question entirely.

### M3 (major). Disjoint `Files:` lists do not make conflicts rare in this repo

**Location:** spec:114-116, spec:253-254.

**Defect.** Independence is checked on the plan's declared `Files:` lists, but tasks routinely edit files the list
omits. Pass B's plan has several tasks writing `CHANGELOG.md`, `docs/extend/migration-notes.md`, and
`docs/internal/facts/*.md` (plan lines 1037, 1108, 1162, 1215), and per-task entries go into the plan's own
`## Ledger` (plan line 425; entries at 1415-1578). Two paired tasks appending to the same section conflict on
rebase nearly every time. The spec routes a conflict to "drop like a red, and the task re-dispatches", which
throws away a reviewed, gated task for an append collision, and the window rule (spec:112-113) then serializes the
queue. That breaks the projection in section 9, which assumes about half the tasks pair.

**Fold.** (a) The runner's pairing check also compares the actual changed paths (`git diff --name-only base..head`)
at stage time, not just the declared lists. (b) Append-only shared files take a union merge in `pass-stage`
(CHANGELOG and migration-notes are the standard `.gitattributes merge=union` case), with CI as the proof of the
merged result. (c) The plan Ledger is not edited inside tasks during a paired run (see M4). (d) A residual
conflict re-dispatches as a rebase-only round on the task's own commits, not a re-implementation.

### M4 (major). The clock ledger written into the plan moves the pass branch under the queue

**Location:** spec:185-187, spec:117-118.

**Defect.** "Writes it into the plan's Ledger at the end of each run" needs a commit, and the spec does not say on
which ref. Committed in a chain worktree, it rides the next task's stage and conflicts with the other chain's
ledger write (M3). Committed on the pass branch directly, it is an unproven commit on a branch the design promises
holds only CI-proven ones, and if the queue is not drained it moves the pass tip so every staged ref's promotion
becomes non-fast-forward and has to re-stage and re-run CI. Pass B's Ledger also records commit SHAs
(`## Task 4 (commit 4597aa49)`), which staging now rewrites, so the Ledger would point at orphaned pre-rebase SHAs.

**Fold.** Make the ledger generated, not accumulated: `run-gate --records --pass <id> --ledger` renders it on demand
from the records, so a crash loses nothing and the conductor's wakeup reads the command, not the file. The plan's
Ledger is written once per segment at the drained boundary, as a fast-forward commit on the pass branch, and
records promoted SHAs (pass-stage records the source-to-promoted mapping). This also removes the per-run write
(O1 below).

### M5 (major). Reprint from the receipt widens a known false-green surface to every gate call

**Location:** spec:159-160.

**Defect.** Today a receipt is consulted only by an explicit `--receipt` lookup, and a plain call always runs the
gate (`cairn-run-gate` lines 8-11). The spec makes every plain call reprint any finished result for the same
fingerprint, from receipts that live 14 days (line 325), workstation-wide. Three problems follow:
1. **Staleness.** The fingerprint is cairn-shaped: it hashes `examples/*` lockfiles and engine links only. In a
   consumer site, a root `node_modules/@glw907/*` link to a local engine checkout (the `link:consumer` path) or
   any ignored build input is outside it, so a gate after an engine change reprints an old green.
2. **Flakes.** If reds reprint, the durable-gotchas flake rerun (pass B plan line 422) can never rerun on an
   unchanged tree. If only greens reprint, the spec should say so.
3. **Records.** A reprint must write a `receipt` record, not `exit`, or the clock ledger double counts the run.

R4 itself was a re-issue seven seconds after the run finished, caused by a `| tail -30` pipe that cut the
`gate exit:` line (evidence, lines 134-137). That needs a short window, not a 14-day cache.

**Fold.** Keep the finished status in the per-run state directory for a short window (about 30 minutes), keyed by
the end fingerprint, so a re-issue on the same tree reprints and writes a `receipt` record; after the window, a call
runs fresh. Also print `gate exit: N` as the last line of output as well as the first, so a `tail` keeps it.
`RUN_GATE_FRESH=1` forces a run. The receipt stays what it is today: the second party's explicit lookup.

### M6 (major). The live rename moves lock and state paths that old copies still use

**Location:** spec:157-158, spec:214.

**Defect.** The script keeps the heavy lock's original file name on purpose, "so a gate started by an older copy of
this script and one started by this copy still exclude each other" (lines 263-264). The spec moves locks to
`/run/user/$UID/run-gate/`. "Swap when no gate holds a lock" (spec:214) misses a gate the old copy has queued: its
detached subshell is blocked in `flock` on the old path, acquires it after the swap, and runs beside a new-path
heavy gate. Two concurrent heavy gates cost the GNOME session on 2026-09-14 (lines 243-246). A session mid exit-75
loop re-issues through the symlink into the new script, which looks for the per-run state in the new place, finds
no pidfile, and starts a duplicate run (R4 again). The records file also splits: `ci-green` defaults to
`~/.local/state/cairn-run-gate/runs.jsonl` (ci-green lines 25-27), so CI waits land in the old file and the clock
ledger misses them.

**Fold.** Rename the command only. Keep the lock paths and the per-run state path unchanged, since nothing reads
them by name and moving them buys nothing; if the move is wanted, the new script takes both the old and new heavy
lock for a transition period. Move records and receipts with a symlink from the old directory, and change
`ci-green`'s default in the same commit. Add to the swap precondition: no queued gate (`pgrep -af 'flock .*cairn-gate'`).

### M7 (major). A scope does not tear down a leaked grandchild (tested)

**Location:** spec:251-252, spec:132-135, spec:142-144, proof spec:208-209.

**Defect.** The risk note says "the scope's teardown kills the tree when the gate exits." It does not. Tested on
this machine: `systemd-run --user --scope bash -c 'setsid sleep 20 & exit 0'` leaves the scope `active (running)`
after its main process exits; a scope stops only when its last process exits or it is stopped. `flock(1)` passes
the lock fd to the command it runs (no `-o` today, line 290), so a leaked dev server or Playwright web server holds
the heavy lock or a slot indefinitely. With the defer exit, the failure is silent: every targeted lane on the
machine defers "to CI" forever, and a repo with no CI waits forever.

**Fold.** Name the scope (`--unit=run-gate-<key>`) and run `systemctl --user stop` on it after the gate command
exits, before writing the status file; that kills the whole cgroup and closes every inherited lock fd. Add a test
to spec:208: a gate that leaks a `setsid` grandchild leaves its slot free once the gate exits.

### M8 (major). The queue has no path for CI unavailable

**Location:** spec:106-107, spec:196.

**Defect.** Promotion needs CI green. `ci-green` exits 3 on an API failure or no terminal result 60 minutes after
the push (ci-green lines 22-23), which is a realistic GitHub outage. The spec defines the exit-3 fallback only for
the close (spec:196). Mid-pass, a staged ref with CI unavailable has no rule, so either the queue stalls the pass
or an agent promotes without proof.

**Fold.** `pass-stage promote` requires either a green `ci-green` read on the exact staged SHA or a passing local
full-gate receipt whose fingerprint matches that staged tree (gated in a scratch worktree at that SHA through the
heavy lane), and refuses otherwise. The runner treats exit 3 as "run the local full gate on the staged SHA".

### M9 (major, OWNER FORK). The draft PR doubles CI on every promotion, and `ci-green` cannot read a stage ref

**Location:** spec:104-105, spec:117-118, spec:196; pass-core "CI shadows the pass".

**Defect.** Pass B keeps draft PR #111 open on the pass branch, and cairn's workflows all trigger on
`pull_request` (`test.yml`, `e2e.yml`, and the rest). Each promotion pushes the pass branch, which fires a second
full CI run on a SHA the stage ref already proved. `ci-green` reads every run for a `head_sha` and needs all of them
green (ci-green lines 19-20), so the boundary and close reads on the pass head wait about 10 more minutes for the
duplicate, and a flake in the duplicate reads red on an already promoted commit. That contradicts "the boundary
read is the last promotion, not a separate wait" (spec:117-118). Separately, `ci-green` requires `--pr <n>` and uses
it to fetch the head (lines 11-12, 354); a stage ref has no PR. Pass W's list (spec:204-206) does not include a
`ci-green` change, and the fixture's stubbed `ci-green` (spec:212) would hide the gap until pass C runs live.

**Options.**
- (a) Open the draft PR only at the close, so only stage refs run CI during the run. Cleanest; loses the in-flight
  PR view Geoff ruled for on 2026-10-08.
- (b) Keep the PR; `ci-green` gains `--ref <stage ref>` and `--event push`, reads only push runs on the SHA for
  queue and boundary decisions, and the PR runs become informational. Keeps the view; doubles CI minutes and
  runner concurrency (cairn is public, so minutes are free, but the shard matrix adds jobs).
- (c) Keep the PR and add `concurrency` with `cancel-in-progress` keyed on the PR, so superseded PR runs cancel.
  Does not remove the duplicate on the final head.

**Recommendation:** (a), with the `ci-green --ref` mode added to Pass W either way, since stage refs need it.

### M10 (major). An over-budget stop can lose uncommitted work

**Location:** spec:182-184.

**Defect.** The implementer stops at twice its budget and returns "done, left, gate state". Nothing says the work
is committed. The conductor's options (split, upshift, re-dispatch) dispatch into a worktree that M2's sync, or a
fresh worktree, would reset or abandon. Uncommitted edits are not in the reflog, so they are gone. Pass B's own
WIP commit `dbdc4556` exists only because a conductor committed by hand.

**Fold.** An `over-budget` return requires a `WIP:` commit on the task's worktree branch (never staged), its SHA in
the report; the runner refuses the report without one. A follow-up dispatch starts from that SHA.

## Minor

- **m1. Slot ownership must live in the detached run.** spec:132-134, test spec:208-209. Today the lock is held by
  the detached subshell (line 290), which outlives the exit-75 caller. A slot loop written in the foreground part
  of the script would release the slot when the caller returns 75, with the gate still running. Fold: add the test
  "the slot stays held after the starting call exits 75".
- **m2. Slice names nest on hyphens.** spec:136-137. systemd reads `-` in a slice name as hierarchy, so
  `gate-cairn-cms.slice` and `gate-cairn-pub.slice` share a parent `gate-cairn.slice`, and both cairn projects split
  one share against `gate-ecxc.slice`. Every family repo name has a hyphen. Fold: escape the project with
  `systemd-escape`, and key the project on the git common dir so two worktrees of one repo share one slice.
- **m3. flock is neither FIFO nor queue-visible.** spec:135, spec:142-144. `flock(2)` wakes waiters in no
  guaranteed order, and a waiter is not visible through the lock file, so "held or queued" reduces to "held"
  unless `/proc/locks` is parsed. The defer check must keep the lock it took with `flock -n` rather than test and
  then acquire. Fold: say "held"; drop "FIFO"; a deferred call writes a `deferred` record so the reviewer can check
  the implementer's "deferred to CI" claim against the record.
- **m4. Records cannot attribute gate time to a task.** spec:185-187. A record carries toplevel and branch
  (lines 189-194); `--records` filters on both, so it misses the other chain's worktree and every stage ref. Fold:
  the dispatch exports `RUN_GATE_PASS` and `RUN_GATE_TASK`, `run-gate` and `pass-stage` record them, and the ledger
  groups by them.
- **m5. Reviewed SHA differs from promoted SHA.** spec:103-107. The diff-reviewer accepts commits that staging then
  rewrites. Fold: `pass-stage` records the source-range-to-promoted-SHA mapping; the Ledger cites the promoted SHA.
- **m6. Retiring `pass-execute-chains.js` while a run uses it.** spec:172-175, spec:214. A workflow is invoked by
  name, so a resume after the file is replaced runs new code against an old journal. Fold: add to the swap
  precondition that no run of either runner is live (journal mtimes), and keep the old file until then.
- **m7. Tier selection is no longer checked independently.** spec:166-170. The implementer picks the gate string,
  and the receipt proves only that the chosen string ran. CI backstops everything, so the cost is clock, not
  assurance. Fold: the diff-reviewer reruns `gate-tier.mjs --lanes --range <base>..HEAD` (deterministic, seconds)
  and compares it with the reported string.
- **m8. Pass B's WIP is local-only on the pass branch.** spec:224-225. `dbdc4556` sits on local `engine-pre-2b-b`
  over `1ce14d3b` and is not pushed (STATUS line 31). The first promotion moves the remote branch past it, and any
  `reset --hard origin/...` in that worktree orphans it to the reflog. It also mixes Tasks 1 and 2 in one commit,
  which the per-task queue cannot stage. Fold: before the resume, push it as `wip/engine-pre-2b-b`, reset the local
  pass branch to `1ce14d3b`, and have the Task 1 and Task 2 dispatches restore from the WIP ref.

## Over-ceremony, ranked by cost

1. **O1. The per-run ledger write into the plan.** It costs one agent dispatch and one commit per run, and causes
   the conflicts and branch movement in M3 and M4. Generate the ledger on demand instead (M4's fold). Saves a
   dispatch per run and removes a conflict source.
2. **O2. One Haiku dispatch per queue operation.** Stage, check, promote, and drop as separate agent calls, plus
   repeated `ci-green --wait` calls, come to about 4 to 6 dispatches per task (about 40 to 60 for pass B), several
   of them on a dependent task's critical path. Fold: one blocking `pass-stage advance <task>` that stages, waits on
   CI up to the tool cap, and promotes, re-issued on 75 exactly like `run-gate`. That is one agent loop per task,
   and fewer echo points for M1.
3. **O3. PSI admission.** spec:139-141. It is the third capacity mechanism on top of slots and slices, its
   thresholds are invented policy, and a wait on a pressure reading that the heavy gate itself raises has no bound,
   which is a liveness risk. Fold: log PSI at gate start in the record, and add admission only if the records show
   slots and slices failing to protect the machine. If it stays, cap the wait and start anyway after the cap.
4. **O4. The draft PR's duplicate CI runs.** Covered in M9; it costs about 10 minutes per boundary read and a
   flake surface on every promotion.

## Proofs to add to Pass W's fixture (spec:210-213)

Each is one scenario on the existing throwaway repo and bare remote:

1. Two stage calls at once: the second stacks on the first (B1).
2. Kill the session between a push and its promote, then resume: no duplicate stage, no lost task (M1).
3. A promote with a stale expected SHA refuses with its distinct exit (B1).
4. Two paired tasks that both append to `CHANGELOG.md` promote without a re-dispatch (M3).
5. Stubbed `ci-green` exit 3 on a staged ref: the local full gate runs on that SHA, and promote waits for its
   receipt (M8).
