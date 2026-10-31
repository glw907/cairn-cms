# Docs finalization review: data integrity, failure risk, contract, and criteria

Target: `docs/plans/2026-10-30-docs-finalization.md` and
`docs/specs/2026-10-30-docs-finalization-design.md`, both uncommitted. Read on 2026-10-30, host
`pavilion`. Every finding below was probed against source unless it says otherwise.

Tag `correctness` means the plan fails or misreports without the fold. Tag `optional` means it
still works, at more cost or risk. Findings run in order of consequence.

## Blockers

### B1. Capture runs against code that may not be on `main` (correctness)

Location: plan "The capture sitting"; design "Capture".

The set point is pass 2 PR-ready, and the run deliberately does not wait for merges. Both
capture paths read `main`: the design's `npm pack` of `main`, and `cairn-release` ("The release
publishes from `main`", "a pass branch is never pushed to `main` to stage a cut"). If passes 1 and
2 are unmerged, the fixtures show old behavior, including the doctor PASS lines and retired
conditions pass 2 changed. That recreates the fixture depicting "a run no reader ever gets".

Fold: state the precondition. Pass 1's and pass 2's PRs (tooling and pages) are merged, in order,
before the capture. The packet says so and the sitting's steps start with a head check: the
capture commit contains pass 2's head. Record the capture commit in the fixtures README. Pass 4's
acceptance verifies it.

### B2. Moving pages in task 4.1 flips the admin arm red before any page exists (correctness)

Location: plan task 4.1, acceptance "Go gate".

`arm-state.mjs`: an arm is `rebuilt` once it holds any page outside the kept set.
`tool/docs/credentials.md` and `tripwire.md` moved into `docs/admin/` flip it. Then:

- `TestFixLineAnchorsResolveInDocs` returns "the admin arm holds pages but
  docs/admin/is-it-working.md does not exist" (`tool/internal/health/fixes_test.go:238`).
- `check:readiness` reports the missing checklist.
- `check:transcripts` applies its floors and uncited-fixture rule.
- `check:arm-indexes` and `check-package-files` require `docs/admin/README.md`.

So 4.1's acceptance cannot pass as sequenced. Red stops the line in an unattended run.

Fold: move the two files after the 4.2 and 4.3 pair merges (a new task 4.3b), keeping 4.1 to the
map, outline, and tool repoint that stay green.

### B3. Pair acceptance is unreachable inside each pair worktree (correctness)

Location: tasks 3.2/3.3 and 4.2/4.3.

- 3.2's `check:editor-quotes`: any editors page rebuilds the arm, and the pinned
  `when-something-goes-wrong.md` lives in 3.3, so the gate fails by design
  (`check-editor-quotes.mjs` header).
- 3.3 has no `README.md`, so `check:arm-indexes` fails. 3.2's README links pages in 3.3, so
  `check:docs` fails.
- 4.2 has no `is-it-working.md`: readiness, the floor of 1, and the Go test all fail. 4.3 has no
  `create-your-site.md`: the floor of 3 fails.

Fold: write each pair's acceptance as page-scoped (`check:docs-gate -- --page <path>`, plus a
check that the page exists), and put the whole-arm gates on a named post-merge step. Alternatively
create one index-and-stubs commit first, but stubs would publish on a failed run, so the
post-merge step is safer.

The relinks have the same fault. 3.1 (14 entries), 4.1 (33) and 5.1 (26) run before the pages they
repoint to exist, and `check:docs` fails on a dead target. Move relinks to after drafting.

### B4. Mid-pass send-back merges into a branch a live executor holds (correctness)

Location: standing answer "Geoff sends a page back"; plan "Branches and PRs"; `pass-core`
"Conductor".

The conductor "merges up the stack" while the top pass is executing. That is a second writer on a
live branch, against "One executor per worktree", and the next executor push is non-fast-forward.
It also moves every upper PR's head. A queued docs review then refuses ("A refused approve means
the PR moved ... queue again"), and an approved packet part's `--match-head-commit` fails. One
send-back on pass 1 can requeue up to eight items. Geoff's in-review edits (`commit` differs from
`head`) cause the same moves, with no standing answer.

Fold: do not merge up as a routine step. A fix lands on its own pass's branch and only that PR
requeues. A plain merge keeps the fix on `main` when the upper PR later merges, by three-way merge,
so upper branches take it only on a conflict, or when an upper page depends on the changed text.
In that case the conductor messages the live executor, which merges the branch itself at a task
boundary, and the conductor never writes to its worktree. Requeue upper items only when their head
actually moved.

### B5. No resume protocol for conductor or executor (correctness)

Location: plan has no such section; "Pre-flight".

The pre-flight is written for the first launch: clean `main`, 0 behind, no live session, PR #155
closed. A relaunched conductor has no statement of how to find the current pass. Per-pass STATUS
edits sit on stacked branches, so `main`'s STATUS shows nothing. Mechanisms that do not survive:

- A self-paced `/loop` stops if its wakeup comes due while the process is down, and is not
  restored on resume. Background Bash and monitors do not restart (Claude Code scheduled-tasks
  docs, "Limitations"). Every `approval-queue` background wait dies with them; `approval-queue
  collect <id>` recovers them only if the ids were recorded.
- Pair subagents' uncommitted worktrees are lost, and a mid-task clock file goes stale.
- `pass-core` "Execute" says call `EnterWorktree` once, which makes a new worktree rather than
  re-entering the old one.
- The August plan records one capture already "lost ... to a power cut mid-flight".

Fold: add a "Crash and relaunch" section.

- Keep one committed run ledger outside the stack, for example a gitignored or state-directory
  file named in the prompt. It holds the pass in flight, session ids, PR numbers, queue item ids,
  and capture step.
- The conductor's first act on any start reads that ledger, re-arms the full guard set per
  `unattended-work-guards.md` "Restart recovery", and runs `collect` on each queue id.
- A relaunched executor works in its existing worktree by path and resumes at the first task whose
  acceptance fails.
- Pre-flight splits into first launch and relaunch.

### B6. Capture and prerelease have no failure answer (correctness)

Location: plan "The capture sitting" and "Standing answers".

No row covers a capture failing halfway, a teardown, or a prerelease half-published. Risks:

- A real Worker, D1 databases, a GitHub App, a repository, and minted tokens stay live with nobody
  tracking them. The August brief required appending each teardown item "at once, not at" the end.
  The plan's step list omits teardown, the secret sweep, and the environment preflight.
- `create-cairn-site` resumes were non-idempotent in August (`01b`, `01c`, `01d`). A partial run
  leaves fixtures that must be recaptured whole, and `check:transcripts` rejects any fixture left
  uncited and undeclared.
- A publish cannot be undone. If one package publishes and the other fails, the version is burned.
- The first publish of `@glw907/cairn-cms-dev` is no longer an issue (`0.98.0` shipped), so the
  August OIDC note does not apply.

Fold: add standing answers. A failed run writes its resource ledger as it goes, tears down, and
reruns once in the same sitting from a fresh site name. A second failure writes a bounded
escalation, keeps pass 3 going, and holds pass 4 as a new packet. A partial prerelease takes the
next free `-rc.N`, never a re-publish, with `latest` verified unchanged. Copy in the August
environment wrapper, secret sweep, and `script`-free capture method. Set the fixture landing
branch (see M1).

## Majors

### M1. The capture harness is gone, and nobody owns the sitting (correctness)

Location: tasks 2.2 and capture steps. `ptycapture.py` and `~/Projects/cairn-scratch` do not exist
(find over `$HOME` is empty). The README's method (100 by 40 pty, pattern-matched prompt driver)
cannot be reproduced without rewriting it. 2.2 assumes it, inside 80 minutes, for a fixture that
"is never edited". No session is named as the driver: executors are `-1` to `-5`, the conductor
holds the queue and cannot `EnterWorktree`. The plan does not say where the fixtures commit.

Fold: 2.2 rebuilds the harness outside the repo, with 30 added minutes. Name a capture session
`cairn-cms-docs-final-capture` launched by the conductor, whose branch `docs-final-capture` sits
between pass 3's top and pass 4.

### M2. Prerelease ask contradicts the plan and comes mid-run (correctness; OWNER FORK)

Location: plan "The capture sitting"; "Global constraints" ("A pass never bumps the version or
publishes"); design "Capture" still says local pack.

A prerelease is a version commit on `main` and a `## Unreleased` move, so it conflicts with every
stacked `CHANGELOG.md` entry and with the sequence "no release before stage 5". The plan knows the
question at plan time, so raising it mid-run is a planning miss by `pass-core`.

OWNER FORK: publish `--tag next`, or a local pack with the difference recorded.

Recommendation: prerelease, asked now in the pre-launch batch, not in the sitting packet. Add a
carve-out to the constraint: the conductor runs `cairn-release`, not a pass, and takes the release
commit. Name the dependency sweep as skipped for an rc, or state the cost. The design's text needs
amending either way.

### M3. Stops without a standing answer (correctness)

- The clock stop is per task, at twice the task's estimate. The answer covers "a pass". A 30-minute
  task stops at 60. Wall-clock lock waits count too. Fold: the conductor rewrites `estimate=` on any
  task clock stop while the path is inside the ceiling.
- A reject or `defer` on a tooling packet. `approval-packet` says record the id and end; a
  conductor must not end. Fold: defer leaves the wait to `collect` and the run continues.
- A pair merge conflict "stops the line". Fold: the session resolves one; a repeat follows the
  loop guard.
- CI `norms` red twice; a held run from another actor; `ci-green` exit 3 (see M6).
- Main checkout dirty, behind, or occupied at a later launch (M4).
- PR #155 still open at 00:01. It is open now, the pre-flight needs it closed, and a conductor
  failing that check at 00:01 has no notice path. Fold: planner closes it and verifies before
  arming.

### M4. Sunday cycle: the design's claim is wrong (correctness)

Location: design "The monthly docs cycle"; plan pre-flight.

`model-review-notify` launches `cairn-docs-cycle` on `pavilion` around midnight. Its prompt runs
"from the cairn-cms main checkout", pulls it, and step 3 writes `sources.md` there. Suites run
"from the main checkout". So "it works in worktrees" is false as written, and the conductor's "on
`main`, clean" check can fail on launches of passes 3 to 5 with no answer. The cycle stays live for
days until its ruling, which also blocks `pass-core`'s pull ("no live session"), which then fails
the `rev-list` 0 check. Its triage may also change `cairn-docs` mid-series, and `model-review`
self-merges dotfiles, so the live skills and agents can change under a running executor.

Fold: the launch check ignores `.claude/skills/cairn-docs/evals/sources.md`, tolerates a live
cycle, and launches from an updated `origin/main` worktree when the checkout is stale. The cycle's
Sunday run pins nothing; the conductor rereads changed skills at each pass launch. Rename the
pre-flight session check to cover `cairn-docs-cycle-*`. `claude agents` also lists `cairn-cms-b7`
as busy from the main checkout (no matching process seen; verify before arming).

### M5. Phonebook shares the lanes at the same minute (correctness)

`phonebook-pass-5-launch.timer` fires at 00:01 too. Its pass is `auth-data` and `live-account`
and runs Chromium. Heavy-gate waits re-issue every ten minutes as paid turns and run the task clock.
Coordination rule 1 needs `SendMessage`, but each executor refuses any session but its conductor.

Fold: set `RUN_GATE_IF_BUSY=defer` in cairn executors (CI is the full-suite home; no `auth-data`
class) and stagger this launch, for example to 00:31. Tell `gate-tier`'s light legs to stay light.
Say in the prompt that lane coordination messages are informational and may be sent.

### M6. Conductor alive for days (correctness)

- Recurring tasks and loops expire at 7 days (docs, "Seven-day expiry"). The run has no named
  limit, and 35 path hours plus reviews can exceed it. Fold: recreate the wake-up each pass launch,
  and put a dated check in the ledger.
- A bare `/loop` runs the built-in prompt, including "cleanup passes such as bug hunts or
  simplification when nothing else is pending". No `loop.md` exists. On an idle conductor that means
  unrequested edits and paid turns. Fold: `/loop <exact watch prompt>`, ended in "do nothing else".
- A transient timer dies on reboot and has no `Persistent=`, and the plan names no verification.
  Fold: the planner checks `systemctl --user list-timers` before ending, and includes
  `env -u ANTHROPIC_API_KEY` (as phonebook's unit does) or the run bills the API.
- STATUS says `CAIRN_GATE_READ_TOKEN` "expires 2026-10-19". Not probed further; verify the CI
  read path before arming, since exit 3 falls back to local gates on the heavy lane.

### M7. Acceptance checks that cannot fail, or pass vacuously (correctness)

- 2.2 `check:transcripts`: the admin arm is absent, so no block exists and floors wait. Passes
  regardless. Fold: name a diff of fixture 04 showing the PASS title.
- 2.3 `check:readiness` and the Go test: list mode only checks live anchors are shipped, and
  deleting a condition cannot fail it. Fold: assert both ids are gone from `conditions.ts`,
  `conditions.json`, and `condition.go`, and both anchors remain in `shipped-anchors.json`. The
  real proof is 4.3, which the task should name.
- 1.2 and the relinks: nothing reads "open". The only `relink` mention in `docs-links.mjs` is
  prose. Fold: a stated count, entries of that stage lacking `restoredIn` equal 0. Add it to 3.1,
  4.1, 5.1, and 5.4 for stages `4`, `3`, `5`, which have none.
- 1.3 `pendingCount` 0: reachable by turning rows into `exclude <reason>`. Fold: no row moves to
  `exclude` without a reason in the PR, and report the count.
- 5.4 and the design's end-to-end check: every gate passes on an absent arm, and no gate counts
  pages. Fold: assert `readArmStates` prints `rebuilt` for all five arms, and list the expected
  page set with any held page named.
- 3.4 "Verdict per figure" passes on a fail verdict. Fold: every figure passes or is replaced.
- 2.4 "Each named in the PR", 3.1 "Outline covers each page's job", and 5.2 "Register check" name
  an activity. Fold: 5.2 "no blocking finding"; 3.1 one row per page against its register job; 2.4
  adds a test for each engine change.
- 4.1 "Fixtures 01, 01d, 04 cited or declared unconsumed" is satisfiable by declaring all, and uses
  August names a recapture replaces. Fold: "every fixture in the new run".

### M8. Tooling and pages PRs cannot always split (correctness)

Location: "Branches and PRs". The base branch must be green alone. Tool tests read the moved docs
(`permissions_test.go`, `messages_test.go`), so 4.1's move splits a test from its file. Pass 2's
2.1 page change depends on the fixture. Fold: a change whose test reads a doc goes in the tooling
PR with that doc, and the page PR keeps only prose. Also, the moved pages must be rebuilt from a
brief, per "never edited up from a harvest", which the plan treats as a move.

### M9. Plan weakens a design standing answer (correctness; OWNER FORK)

Design: a held page stops being held-out "unless a gate needs that page", read as a stop. Plan: a
gate-needed page "ships with what can be verified and an escalation". OWNER FORK: ship reduced, or
stop. Recommendation: ship reduced with the unverified claims cut, since a stop strands the arm;
amend the design line and record it as a ruling. Check the list's completeness: `docs-links.mjs`
targets are all listed, and `check:transcripts` adds `is-it-working` and `create-your-site`.

## Minors

- Header "Path estimate 2,100" is the task sum. Counting pairs once, as `pass-core` requires, gives
  510, 300, 330, 330, 240, or 1,710. Line 104 claims the once-count that 600 does not apply.
  Correct the figure; keep 4,200 only if Geoff's number stands (correctness).
- "53 relinks ... then the 10 fact re-arms": `relink.json` has 53 open at stage 2b, and the 10
  `facts` entries are inside them (correctness).
- The design says each pass runs to twice its estimate; the plan lifts past that up to 4,200.
  State the plan's reading in the design (correctness).
- 2.4 is `ordinary`, but a pulled save-path or `commit-log` item would be `auth-data`. Add a
  re-derive on entry and the live admin smoke if hit (correctness).
- 1.6: 94 engine entries, verified, in 60 minutes likely trips the clock (optional).
- "Registers `docs-final-<n>`" is undefined, and "this plan's branch" for 1.6 depends on where the
  plan lives once merged. Name the branch (optional).
- Pass-close STATUS verdicts on stacked branches conflict on merge-up. One owner, or ledger-only
  until merge (optional).
