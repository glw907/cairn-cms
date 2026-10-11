# Engine pass B lean plan: fold verification

Verification read of the fold at `7355bf61` (`git diff 69bf3e60 7355bf61 -- docs/superpowers/plans/`),
against the fold record, the three reviews, the old plan's binding blocks, `pass-core`, `cairn-pass`,
and the process spec. Read-only. Probes ran under `$HOME/.cache/plan-verify/` or as `git show
origin/main:` reads against `aacaa46c` (PR #112 merged). No suite or gate ran.

Counts: 0 blocker, 1 major, 12 minor.

## 1. Did each blocker and major close where the fold record says?

Each of the 27 blockers and majors was checked against the cited location. All but one closed.

| Review item | Closed at | Verdict |
| --- | --- | --- |
| Contract 1 (blocker) | Plan `:450-452` (overrules), `:465`, `:484-485` (`Blocking findings open: 0`), `:496-500` | Closed. Acceptance omits the `CHANGELOG.md` finalization (V7). |
| Contract 2 | `:88-91` | Closed. |
| Contract 3 | `:104-122`, each task's Extra commands | Closed. Every command exists on `origin/main` (see section 3). |
| Contract 4 | `:300-307`, `:313`, `:121-122` | Closed in substance. The port-busy guard was dropped (V10). |
| Contract 5 | `:100-103` | Closed. |
| Contract 6 | `:134-145`, `:226-227` | Closed. |
| Contract 7 | `:128-133`, `:136-137` | Closed. |
| Contract 8 | `:276-285` | Closed. All 34 non-`docs/superpowers` paths on the branch are WIP paths. Probe: `comm` of the branch diff against `git diff --name-only 1ce14d3b dbdc4556` printed nothing. |
| Contract 9 | `:44-66` | Closed: all 15 rows have a lean meaning. The `/tmp` row is narrow (V11). |
| Contract 10 | `:357-361` | Closed in part, and the refusal holds: `scaffold.yml:39-44` installs and builds the emitted template. |
| Contract 11 | `:84-87`, `:465-473` | Closed. |
| Contract 12 | `:238-242`, `:504-506` | Closed. D6's home is decided in the plan. |
| Contract 13 | `:189-192`, prompt `:2-6` | Closed. The refusal of the git-dir skip holds (EnterWorktree contract, quoted in section 3). |
| Contract 14 | `:430-449` | Closed: one blocking CI read, at merge sequence step 5. |
| Mechanics B1 | `:100-103`, `:289-292` | Closed. |
| Mechanics M1 | `:134-145` | Closed. |
| Mechanics M2 | `:368-373` | Closed (probe in section 3). |
| Mechanics M3 | Prompt `:2-13`, `:189-192` | Closed. |
| Mechanics M4 | `:44-66`, `:108-111` | Closed. |
| Integrity B1 (blocker) | `:163-172`, `:475`, prompt `:6-8`, `:17-18` | Closed. The relaunch-after-stop path is underdocumented (V5). |
| Integrity B2 (blocker) | `:100-103`, `:289-292` | Closed. Probe: `git merge-tree --write-tree origin/main engine-pre-2b-b` merges clean. |
| Integrity M1 | `:474-489` | Closed. The base check sits before the CI wait (V3), and `mergeable` can read `UNKNOWN` (V4). |
| Integrity M2 | `:184-185`, `:459-463`, `:477-481` | Closed. The ruling text is still "pending" (V8). |
| Integrity M3 | `:189-206` | **Not closed for the stale clock** (V1). Steps 1, 3, 4, 5, and the PB-C resume closed. |
| Integrity M4 | `:519-549`, prompt `:10-12` | Closed in part. The `pgrep` refusal holds. |
| Integrity M5 | `:92-97` | Closed. |
| Integrity M6 | `:396-402` | Closed in part. The refusal holds. |
| Integrity M7 | `:123-127`, `:243-244` | Closed. |
| Integrity M8 | `:530-532` | Closed in part. The refusal holds: the worktree branches from the commit, and a dirty checkout that conflicts fails `git merge --ff-only`. |
| Integrity M9 | `:139-141`, `:226-227` | Closed. |

The record's count is correct: 34 + 20 + 22 = 76 findings, of which 74 were folded, 1 refused
(integrity m5), and 1 went to the owner (OF1).

## 2. Contradictions and build order

The order builds. PB-T5 follows the PB-T4 merge that it needs. PB-T10 follows PB-T4's `dist/` move.
Every `emit:template` task is serial. The pair seams hold at `aacaa46c`: each symbol and line in
`:218-228` matched (`ACCESS_FIXED_SCREENS` `:280`, `normalizePublishActions` `:38`,
`normalizeConcepts` `:135`, `RESERVED_SEGMENTS` `:33`, `itemLabel` `:21`/`:28`, `checkSiteFacts`
`:577`, `buildSiteManifest` `:18`). Old Task 4's Files, including `.gitignore` and the root
`package` script, share no path with old Task 6's.

The prompt and the plan agree on the worktree entry, the stop check, the absolute plan paths, the
pairs, the merge grant, and the end. Departures from `pass-core`: the session merges (owner-fixed),
the clock file gets a fourth line (safe, section 3), and the close review runs beside CI instead of
after it. That last one holds, because merge sequence step 5 still requires `pass-core`'s "full-suite
home is green on the head" before the merge. The contradictions found are V1 (Stops against Resume),
V2 (CI reads against merge step 5), and V6 (pair watchdog against ruling 13's clock stop).

## 3. New mechanisms: probe results

- **Launch block.** `bash -n` passes. Each guard was traced:
  - The subshell confines `cd`.
  - `claude agents --json` (its help reads "Print active sessions (interactive and background)")
    fails closed: `jq -e 'type=="array"'` exits 4 on empty input, and `jq -e` on `{"a":1}` exits 5
    in the filter step.
  - The `any(...)` filter returns 1 on `[]`, 1 on null fields, 1 on `engine-pass-b (2)`, 0 on a
    `cwd` under `.claude/worktrees/engine-pass-b/src`, and 1 on the live list. The live list holds
    `lean-step2` (idle, `done`) and the planning session, whose `cwd` is `~/.dotfiles`, so the
    launch does not refuse itself.
  - `gh pr view 112` prints `MERGED` (`aacaa46c`).
  - The main checkout is on `main`, 0 ahead and 13 behind, so `--ff-only` advances it and the
    `origin/main..HEAD` count is 0.
  - `git check-ignore -q .claude/worktrees/x` exits 0.
  - `engine-pre-2b-b` is `7355bf61` against `origin` `1ce14d3b`, so the launch refuses until the
    fold is pushed, which is the intended behavior.

  This verification file is untracked, so the clean-tree guard also refuses until it is committed.
- **`pass-stop`.** The prompt (`:6-8`, `:17-18`) and the plan (`:163-172`, `:475`) agree on the
  path and on who clears the file. See V1 and V5 for the gaps.
- **`base=` line.** `claude-clock-stop` reads `task=`, `start=`, and `estimate=` with `sed -n
  's/^key=//p' | head -n 1`, so a fourth `base=` line is ignored. Confirmed safe. It is wired as a
  PostToolUse hook (`~/.claude/settings.json:113`) and fires after every tool call, the first one
  after EnterWorktree included. That is the root of V1.
- **`gh pr merge --match-head-commit`.** gh 2.102.0 `--help` lists `--match-head-commit SHA` and
  `-m, --merge`.
- **Extra commands, on `origin/main`.**
  - `test:integration` is `vitest run --project integration`.
  - The `unit` project includes `packages/cairn-cms-dev/src/**/*.test.ts` (`vitest.config.ts:90-96`).
  - `create-cairn-site`'s `test` is `node --test ...`, and `bake-template.mjs` takes `--to`,
    `--engine-spec`, and `--dev-spec` (`:372-382`).
  - The showcase has `pretest:e2e` and `test:e2e`, and `playwright.config.ts:6` reads `E2E_PORT`.
  - `check:surface` and `check:facts` exist.
  - The bake string's quoting, run through `bash -c` as `cairn-run-gate:335` runs it, printed
    `^0.98.0`.
- **D6's home.** `buildSiteManifest` (`src/lib/delivery/manifest.ts:18`) loops the descriptors and
  calls `parseMarkdown` per file. It is already exported through `delivery/data.ts:71`, so a warning
  there adds no export. No consumer repo under `~/Projects` calls it, so the warning cannot reach a
  Worker's runtime log.
- **EnterWorktree `path`.** The tool contract reads: "Pass `path` instead of `name` to switch the
  session into a worktree that already exists"; "the path must appear in `git worktree list`";
  "Switching with `path` also works when the session is already in a worktree"; and "the target must
  be a worktree under `.claude/worktrees/` of the same repository". All four hold for
  `.claude/worktrees/engine-pass-b`.
- **Not probed by the fold.** The pair watchdog's "agents' transcript mtimes" (`:147-148`) names no
  path and no command (V6).

## 4. Can Geoff rule on the evidence?

Both rulings are decidable as written, but each omits that its reviewer recommended the other side.

- **Ruling 1.** Integrity M2's own recommendation for a clean merge-in that touches an `auth-data`
  glob was (b), re-run the review and the smoke. The record recommends (c), CI green alone, and does
  not say it departs from the reviewer. It also leaves out the reviewer's cheaper middle option:
  re-run the review and the smoke over the merged-in range only. The record also does not say that
  CI's e2e runs under `wrangler dev` with `CAIRN_DEV_BACKEND:1` (`playwright.config.ts:44-48`), so it
  never runs the real magic-link round trip that the smoke runs.
- **Ruling 2.** Mechanics OF1 recommended (b), `-u critical` for stops, on the ground that a stop
  blocks the 9-hour test. The record recommends normal and frames "No" as "critical except the clock
  stop", which differs from the reviewer's option. Whether a stop's wait counts against the 9-hour
  clock is the deciding fact, and the plan does not state it (V9).

## 5. Leanness

Most of the growth from 322 to 549 lines is binding mechanics that cost the executor seconds: the
launch guards, the merge sequence, the Resume steps, and the Retired phrases table. Each closes a
measured gap. Two items cost more than they remove: V6 (the transcript-mtime watchdog) and V12 (an
unscoped PB-T0 re-check against a 30-minute clock). The rest is proportionate for an `auth-data` pass
that merges itself unattended.

## 6. Clock honesty

The arithmetic holds:

- The estimates sum to 605 minutes: 550 on the critical path, plus PB-T6's 25 and PB-T7's 30 off it.
- The critical path is 30 + 55 + 55 + 50 + 40 + 50 + 45 + 80 + 45 + 100 = 550.
- The success clock covers about 525 of those minutes.

The plan says the test "holds only if the close review lands near zero fix rounds". That is
accurate but soft. At the spec's own price for fix rounds (40 to 90 minutes, its expected band), the
expected clock is about 9.4 to 10.3 hours, a miss. The plan also leaves out a fact that decides the
result: the spec excludes "Geoff's read wait and pauses he orders", and nothing else. A stop's wait
is neither, so under Ruling 2's normal urgency a single overnight stop fails the test (V9).

## Findings

### V1 (major). A relaunch or a "go on" turn fires a stale clock stop before Resume rewrites `start=`

- **Location.** Plan `:189-203` (`start=` is rewritten at step 6), `:167-172`, `:173`; prompt `:6-8`.
- **Defect.** `claude-clock-stop` is a PostToolUse hook, and it fires after every tool call once the
  cwd is the pass worktree. After a crash, the leftover `pass-task-clock` usually sits past twice its
  estimate. EnterWorktree's own call, the stop check, `gh pr list`, `git status`, and `git branch`
  each return "Clock stop: ... Write STATUS, run `notify-send -u normal`, and wait for Geoff" before
  step 6 rewrites `start=`. Stops lists "A fired clock stop", so a faithful executor writes
  `pass-stop` and ends, which turns every crash relaunch into an attended stop. The "go on" turn has
  the same hazard: its first tool call, before it rewrites `start=`, gets the stale stop line.
  Integrity M3's "Stale clock" item is therefore not closed.
- **Evidence.** `claude-clock-stop:13-27`, `~/.claude/settings.json:111-115`; `pass-core` "A resume
  rewrites `start=`".
- **Fix.** Make the stop check and the clock reset one Bash call, the first after EnterWorktree, in
  both the prompt and Resume step 2:
  `g=$(git rev-parse --absolute-git-dir); if test -e "$g/pass-stop"; then cat "$g/pass-stop"; elif test -f "$g/pass-task-clock"; then sed -i "s/^start=.*/start=$(date +%s)/" "$g/pass-task-clock"; fi`.
  Add one sentence: "A clock-stop line that arrives before this call, or in the same turn as it, is
  stale and is not a stop." The "go on" turn removes `pass-stop` and rewrites `start=` (or
  `estimate=`) in one call. Drop the rewrite from step 6.

### V2 (minor). Merge step 5 contradicts "CI reads" on `ci-green` exit 3

- **Location.** Plan `:123-125`, `:175`, `:483`.
- **Defect.** "CI reads" says that exit 3 at PB-C means the local full gate, and Stops treats only a
  red local gate as a stop. Merge step 5 requires exit 0 and stops at the first failure. An executor
  can resolve this by merging after a local gate, with no CI read of the final head.
- **Fix.** Merge step 5: "exits 0. Exit 3 here is a stop: no self-merge without CI on the head."
  Scope the "CI reads" sentence to the fix chain.

### V3 (minor). The base check runs before the CI wait

- **Location.** Plan `:477-483`.
- **Defect.** `main` can move during step 5's wait (8 to 11 minutes of e2e plus queueing) and step
  7, and the merge then joins a pair of heads that no one tested together. Integrity M1 named "too
  early".
- **Fix.** Add step 7a: `git fetch origin && [ "$(git merge-base origin/main HEAD)" = "$(git
  rev-parse origin/main)" ]`, and on a failure return to step 3.

### V4 (minor). `mergeable` can read `UNKNOWN` right after `gh pr ready`

- **Location.** Plan `:486-488`.
- **Defect.** GitHub computes `mergeable` lazily, so the first read often prints `UNKNOWN`. Under
  "stopping at the first failure", that read is a false stop.
- **Fix.** "Re-read up to three times, 10 seconds apart, while it prints `UNKNOWN`."

### V5 (minor). The relaunch-after-stop path and the stop commit's subject

- **Location.** Plan `:165`, `:167-170`, `:201`, `:205-206`; prompt `:7-8`.
- **Defect.** A relaunched session with `pass-stop` present ends at once (correct), but nothing tells
  Geoff that the "go on" goes through `claude attach engine-pass-b`. The stop commit's subject
  `Record the <task> stop in STATUS` also carries the task id that Resume step 6 keys on.
- **Fix.** End the notify text with "resume: `claude attach engine-pass-b`". Name the commit
  `Record a stop in STATUS (<task>)` and have step 6 skip subjects that start with `Record a stop`.

### V6 (minor, over-ceremony). The pair watchdog's transcript-mtime check is unprobed and contradicts the clock stop

- **Location.** Plan `:146-148`.
- **Defect.** The text names no transcript path and no command, and the fold record lists no probe.
  It also keeps a pair alive past twice its estimate whenever the agents are busy, which every other
  task treats as a stop (ruling 13, `:173`).
- **Fix.** "If the sleep exits before both agents return, that is the pair's clock stop." Delete the
  mtime sentence.

### V7 (minor). PB-C's acceptance omits the `CHANGELOG.md` finalization

- **Location.** Plan `:496-500`; contract 1 asked for it.
- **Fix.** Add: "`git show origin/main:CHANGELOG.md` carries pass B's `## Unreleased` lines."

### V8 (minor). Ruling 1 ships as "pending", and both rulings hide the reviewer's dissent

- **Location.** Plan `:480-481`; fold record `:145-156`.
- **Defect.** An unattended Sonnet that reads "pending Geoff" at merge time can reasonably stop. The
  record also omits that integrity M2 recommended (b) and that OF1 recommended critical urgency.
- **Fix.** Before launch, replace the parenthetical with Geoff's ruling and its date. In the record,
  add one line per ruling naming the reviewer's recommendation, plus Ruling 1's range-only option
  and the fact that CI's e2e never runs the real magic link.

### V9 (minor). The 9-hour statement omits stop waits and understates the expected miss

- **Location.** Plan `:508-517`, `:471-473`.
- **Fix.** Add two sentences: "At the spec's fix-round price of 40 to 90 minutes, the expected clock
  is 9.4 to 10.3 hours, so the test passes only with zero fix rounds and no red. A stop's wait for
  Geoff counts against the clock, since the spec excludes only his read wait and pauses he orders,
  and the Score states each stop's wait separately." If Geoff rules that stop waits are excluded,
  state that instead.

### V10 (minor). The one-spec e2e reuses whatever server holds port 4392

- **Location.** Plan `:121-122`, `:304-307`.
- **Defect.** `reuseExistingServer: !process.env.CI` (`playwright.config.ts:51`) means that a
  leftover server on 4392, such as the scratch capture script's, is reused, and the run tests a stale
  build. The contract's port guard was dropped without a note. The capture script's server is also
  unnamed.
- **Fix.** Prefix the command with `! ss -Htln "sport = :4392" | grep -q . &&`. Have the capture
  script serve on a different `E2E_PORT` (4394) with the config's `webServer` command, and stop it
  after the captures.

### V11 (minor). The `/tmp` replay row covers only `--outdir`

- **Location.** Plan `:54`.
- **Defect.** Each replayed step also runs `rm -rf /tmp/dev-fold-*` and greps `/tmp/dev-fold-*`
  (`e2e.yml:96-98`, `:144-147`).
- **Fix.** "Every `/tmp/dev-fold-<x>` in the replayed steps (the `rm`, the `--outdir`, the `grep`)
  becomes `$HOME/.cache/engine-pre-2b-b/dev-fold-<x>`."

### V12 (minor, over-ceremony). PB-T0's re-check scope is unbounded against a 30-minute clock

- **Location.** Plan `:238-240`.
- **Defect.** "Every path, line number, symbol, and script that PB-T1 to PB-T11 ... name" can be
  read to include the old task bodies that those tasks bind, which hold hundreds of line claims. The
  broad reading overruns into a clock stop at 60 minutes.
- **Fix.** Insert "in this plan's own text". The old bodies' lines are re-checked by each task as it
  reads them.

### V13 (minor). Where the pair's `Pass-Clock:` trailer goes when no record moved

- **Location.** Plan `:150-153`.
- **Fix.** "If no record moved, commit `--allow-empty` with the same subject and trailer."

## Verdict

Not launch-ready yet, and one major blocks it. V1 turns the first crash relaunch, and every "go on"
turn, into a spurious clock stop, which defeats the Resume convention that integrity M3 required.
The fix is a one-call reorder in the prompt and in Resume. Every other blocker and major closed at
the cited location, and every mechanism that matters probed true: the launch guards, `base=`,
`--match-head-commit`, the extra commands, D6's home, and EnterWorktree `path`. The rest are minors.
Once V1 and the minors are folded, Geoff has ruled on both rulings (V8), and this file is committed
and pushed so the clean-tree guard passes, the plan is launch-ready.
