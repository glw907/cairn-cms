## Review: draft-docs 2b part 1 plan (mechanics and feasibility)

The plan won't run overnight as written. Its first chain launch (T1) fails, because the Workflow tool refuses a `scriptPath` the session can't already read. I found 1 blocker, 12 majors and 11 minors; one major (M10) is an owner fork.

I reviewed `overnight-2b-plan` at `59d09fa05`, which matches `origin/overnight-2b-plan`. Neither tooling worktree exists yet: both `pre2b-tooling` worktrees are absent from `git worktree list`. So I checked runner claims against dotfiles `main` `2912c95` `claude/.claude/workflows/docs-page-chain.js`, and the tooling plan's DT1 for what it will change.

Files:
- Plan: `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/overnight-2b-plan/docs/plans/2026-10-11-draft-docs-2b-part1.md` (P)
- Launch prompt: `.../plans/2026-10-11-draft-docs-2b-part1-prompt.txt` (LP)
- Design: `.../specs/2026-10-11-overnight-2b-design.md`

### Blocker

**B1 (blocker, correctness): the Workflow tool refuses the dotfiles-worktree `scriptPath`.** At P:23, P:155, P:266 (T1 step 2) and LP:47-49.
- The prior refusal in transcript `33c17165` reads verbatim: `scriptPath must be a script path this tool returned, or a file you can already read (the working directory or a directory you have added): /var/home/glw907/.dotfiles/claude/.claude/workflows/docs-page-chain.js`.
- The workflows docs say: "Claude can start a workflow only from a script file the session is already allowed to read. To run a script kept outside your working directory, add its directory with `/add-dir` or a Read allow rule first."
- After EnterWorktree the executor's working directory is the cairn worktree. `~/.claude/settings.json` has no `additionalDirectories`, and neither do the cairn project settings.
- Every successful past `scriptPath` I found was a session scratchpad or a persisted `workflows/scripts/` path. R5 ran by name.
- Effect: T1 fails as a "script error" stop at the night's first chain act.
- Fold:
  - Add `--add-dir /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling` to the launch line (P:414). The agent-view docs say `claude --bg` passes every configuration flag through to the session.
  - Relax LP:51-52 ("only through git -C") to allow the Workflow tool's read and the hand-run seats' Read of that one file.
  - The pinning fold is M11.

### Major

**M1 (major, correctness): a fresh-session relaunch cannot use `resumeFromRunId`.** At P:98, P:136 and LP:21.
- The docs say: "In a session you start fresh, Claude has no earlier run to relaunch", and a relaunch whose saved results it can't find "fails with a `nothing to resume` error".
- Saved results live under the original session's directory.
- The Resume rule ("A relaunch runs the launch prompt again ... resumes with that resumeFromRunId") therefore produces a run-level failure stop.
- Fold:
  - The resume line is `claude attach draft-docs-2b-part1` or `claude respawn <id>` on the same session. Record the session id in STATUS per pass-core.
  - A fresh-session relaunch re-runs that run's uncommitted pages as a new run, with the projection recomputed.
  - Note that resume replays agents in start order. With three concurrent workers the start order can differ, so a resume can re-run most of a fan-out. Budget it as a re-run.

**M2 (major, correctness): the worktree-isolation guard refuses the prompt's first act, the tick, and the stop write.** At LP:8, LP:13, P:97 and P:101.
- Transcripts `bcabc73b` (alignment-pass) and `0d52ae78` (engine-pass-b) show it.
- The identical `g=$(git rev-parse --absolute-git-dir); if test -e "$g/pass-stop" ...` was refused: "runs sed with a value computed at runtime (the variable g)".
- `test -e "$(git rev-parse --absolute-git-dir)/pass-stop" ...` was refused: "names git in a form too complex to verify".
- Both executors recovered only by rewriting with literal paths.
- Fold:
  - Use literal paths: `/var/home/glw907/Projects/cairn-cms/.git/worktrees/draft-docs-2b-part1/pass-stop` and `.../pass-task-clock`.
  - Split the clock reset into two calls: `date +%s`, then `sed -i 's/^start=.*/start=<literal>/' <literal path>`.
  - Apply the same rule to every "Write `$(git rev-parse ...)`" in the stop procedure.

**M3 (major, correctness): T2's prompt recovery fails its own acceptance, so the A/B gets recorded "not run".** At P:283-295.
- Probe on the R5 run `wf_27395374-42e`: the transcript's first user message starts with the line `[Workflow harness — computed task] The task text below was computed ...`. Every prompt line after it is indented two spaces.
- The check "first line begins `Frame the introduction of ...`" therefore fails. By the plan's own rule, the owner-ruled A/B is then recorded as not run.
- Step 3 passes a roughly 170-line prompt through `args`, so the model re-types it. That is the hand-copy step 1 forbids.
- The options list omits the runner's `schema: FRAMING_SCHEMA` (:1321). That makes structured output a second variable beside effort.
- Fold:
  - Extract with `jq -r 'select(.type=="user") | .message.content | select(type=="string")' agent-<id>.jsonl > raw.txt`, then `sed '1d; s/^  //' raw.txt > prompt.txt`. The probe showed no trailing footer.
  - Generate the one-agent script file with `jq -Rs` (`const P = <json>;`) in an allowed directory and run it by `scriptPath`, so no model copies the text.
  - Pass the same `schema`, `label` and `phase` as the runner.
  - Run the diff check on the de-wrapped original against the variant.

**M4 (major, correctness): T2 and T3 aren't disjoint, and they share one clock file.** At P:274, P:278 and P:309.
- Both write `2026-10-11-draft-docs-2b-part1-record.md`: T2 adds the A/B section and T3's implementer writes the run section, concurrently.
- `pass-task-clock` is a single file. If T2 writes its 30-minute estimate over T3's, a false clock stop fires at 60 minutes, which needs Geoff. If T2 removes the file at its end, T3 runs unclocked.
- T2 also has no commit. A resume would redo it, and T4's WIP sweep of `git status` would pick up its files.
- Fold:
  - T2 writes no clock file and runs under T3's, with T3's estimate raised to 130.
  - Its A/B section goes in `...-ab/README.md`, which the record links at T11.
  - T2 commits as `2b1-T2:`.

**M5 (major, correctness): a usage-limit failure has no named state.**
- The docs say a run pauses at a usage limit only in an interactive session, never "in a background session". Otherwise the affected agent fails.
- At a 45M night the 5-hour window is plausible. Null seats then route into "a seat that returned nothing" (P:76), and the hand-run seats hit the same limit.
- Fold: name it. An agent error whose journal entry or transcript names a usage limit is a pause, not an escalation. No hand-run; record it, let the `/loop` tick wait for the reset, then `resumeFromRunId` in the same session, where failed agents re-run.

**M6 (major, correctness): the token unit is undefined, so the first projection can trip the stop at once.** At P:25 and P:105-110.
- `/cost` (documented as `/usage`) prints four counts per model: input, output, cache read and cache write.
- The completion notification's `<usage><subagent_tokens>7200217` matches input + output + cache write over the run's transcripts (6.98M). It excludes cache reads (171M).
- If `night_tokens_at_launch` includes cache reads, the first projection exceeds 36M.
- The tooling sessions run `--bg` and can't run `/cost`; the tooling plan meters them from transcripts (:74).
- The runner's `spent` is in another unit; its header says "never a count against a pass ceiling".
- Fold:
  - Define one unit: input + output + cache write, excluding cache reads.
  - The conductor computes every figure from transcript `usage` fields.
  - The executor takes Workflow figures from `subagent_tokens`, never `spent`.
  - Replace the 0.15M-per-task proxy with the executor's own `<total_tokens>N tokens left` reminder delta. On alignment it tracked the same unit: 277k by reminder against 328k by usage.

**M7 (major, correctness): the D8b input sentence contradicts the code.** At P:171.
- `report.ts:12` prints `${finding.ruleId}` on every finding line.
- `config.ts:403` USAGE reads `cairn-audit [--rendered] [--config <path>] [--rule <id>]... [--fail-on error|advisory] [--help]`. Rule ids are a user-facing selector.
- "No stable finding codes", filed as a `[verified]` fact, is false. Either the fact read blocks the page, which forces an escalation, or the page states it.
- Fold: reword to "plain-text report (report.ts:1-4), one line per finding with file:line, tier, rule id, and message (:12), then a summary (:40-52). The flags are config.ts:403's; there is no machine-readable output. ROADMAP D8b (:1131-1133) records that the line format is not a designed contract."
- D7, the adapter path, the figure story and the register citations all verified as cited.

**M8 (major, correctness): `TMPDIR` and `NODE_OPTIONS` may not reach the `--bg` session.** At P:115, P:414 and T0(d) at P:245.
- The agent-view docs promise only PATH, plus provider variables, for a background session run by the supervisor. They don't cover TMPDIR or NODE_OPTIONS.
- T0(d) checks them but names no action on failure.
- Fold: carry them as `--settings '{"env":{"TMPDIR":"/var/home/glw907/.cache/draft-docs-2b-part1/tmp","NODE_OPTIONS":"--max-old-space-size=6144"}}'` on the launch line, and make a T0(d) failure a stop.

**M9 (major, correctness): the "showcase" tellgrader artifact reaches the chain's register seat.** The conductor ruling at P:50 covers only the executor.
- `cairn-register-editor.md:64-67` runs `tellgrader` and says "Its findings are facts; carry them into your report without re-litigating them."
- My probe found slop-hard doesn't gate `check:tellgrader` (exit 0, "OK").
- Every page naming the example site can still draw a register `fix`. That costs a round or an escalation, and a redraft may rename the site.
- Fold: L0 runs `go build` of tellgrader from the dotfiles tooling worktree into `/var/home/glw907/.cache/draft-docs-2b-part1/bin/` (not `make install`). The launch line prepends that directory to PATH, which is documented as inherited.

**M10 (major, optional), OWNER FORK: merge-on-approve condition 3 can't pass without a new commit.** At P:398.
- The tooling PR merges with `--merge`, which leaves a merge commit on `main` that the 2b head lacks. So `merge-base --is-ancestor origin/main <head>` always fails.
- GitHub requires nothing here: `main` is unprotected (API 404) and `delete_branch_on_merge` is false.
- Effect: every approve forces a merge of `main`, a push, CI, and a second desk round.
- Options:
  - (a) Drop condition 3. pass-core asks only that a PR be "safe under a plain merge followed by a pull".
  - (b) Let the approval cover a clean merge of `origin/main` that adds only the tooling commits.
  - (c) Keep it, accepting a second read.
- Recommendation: (a).

**M11 (major, correctness): the dotfiles script can change under later runs.**
- Execution runs about 900 to 1,110 minutes, into the day when Geoff reads the tooling PRs. A desk reject means fix-forward commits in that worktree.
- T1 step 4 compares the persisted copy with the current worktree file, so it passes on a changed chain. T0(c) checks the head only once.
- Fold: write `git -C /var/home/glw907/.dotfiles/.claude/worktrees/pre2b-tooling show <dotfiles_tooling_head>:claude/.claude/workflows/docs-page-chain.js` to scratch at T0, and compare every persisted script against that copy; a mismatch is a stop. This also removes the plain read of a dotfiles path that LP:51 forbids.

**M12 (major, optional): the chain result arrives truncated, and T1 step 6 names no source.**
- R5's notification carried about 8KB, then "(truncated 188264 chars, full result in /tmp/claude-1000/.../tasks/<id>.output)".
- A thin Sonnet executor may Read about 250KB, or hand-write the per-page JSON files (P:270).
- Fold: copy `<output-file>` to `.../run-N/result.json`, then split it with `jq -c '.pages[] | select(.id=="<slug>")'` per page, or read the journal's `type=="result"` lines.

### Minor

- **m1 (correctness), P:77:** hand-run seat dispatches carry no effort; the runner runs framing at `xhigh` and the plan step at `high`. Run each seat as a one-agent inline Workflow with the runner's exact model, effort, agentType and schema.
- **m2 (correctness), P:400:** the post-merge `git -C /var/home/glw907/Projects/cairn-cms pull` is the shared-checkout form the guard refuses (alignment probe). Report the checkout stale for the conductor to pull.
- **m3 (correctness), P:223:** `cairn-run-gate --receipt 'bash scripts/check.sh'` misses `gate.sh`'s receipt, because `gate.sh` sets `CAIRN_GATE_LANE=light` and the lane is in the fingerprint. Use `bash scripts/gate.sh` alone.
- **m4 (correctness), P:248 (T0 f):** a plain grep for `extraChecks` matches the header comment at `:63` and reads as "used". Grep for `p.extraChecks` on non-comment lines.
- **m5 (correctness), P:278:** copy `framing-xhigh.md` from the T1 WIP commit with `git show`. A T3 hand-run may rewrite the on-disk record first, and a plan-read escalation would re-frame on a revised plan; record that asymmetry.
- **m6 (correctness), P:293 and P:314:** two checks can pass vacuously. "All four files exist" should require non-empty files whose intro starts with the H1. A caveat check on a parked or reverted page should report "not checked: parked".
- **m7 (correctness), P:134:** `ci-green` exits 2 and 3 have no named handling on the 2b PR; the tooling plan names them.
- **m8 (correctness), P:229:** L0 check 4 (`/tmp`) failing has no stated action; only checks 1 and 2 block. It reads 2.8G now, but the live `dubplate-54` session shares the quota.
- **m9 (optional), P:392:** `review-desk` opens Firefox through `setsid` from a supervisor-run session whose display variables are unverified. Have the notification name `http://127.0.0.1:7907`.
- **m10 (optional), P:176:** `pendingCount` is 104, but the map holds 102 `pending` rows, matching the per-slug list. It's harmless because `check:options` fails only above the count, but state it so the post-run row arithmetic doesn't misread.
- **m11 (optional), P:408:** T2's 30 minutes are already inside the 1,110, so the critical path is 1,080.

### Over-ceremony

- **o1 (minor, optional), T0(b):** it repeats L0's `ci-green` on the same head minutes later. Drop it, or make it a no-wait read.

### Checked and holds

- The risk class (`ordinary`, `runner` on an allowlist entry) fits. Every task carries a clock estimate, and the sum of 1,130 is right.
- Runner citations hold: `:526` `FRAMING_EFFORT`, `:942-944` inputs rendering, `:1251` the existing-record read, `:1321` the framing agent's options, and `:63` `extraChecks` documented but never read.
- The queue is FIFO with no barrier, so the A/B page starts first.
- The transcript directory, `journal.jsonl` and `agent-<id>.jsonl` exist as T2 assumes. The inline `script` and `resumeFromRunId` parameters are real.
- CI's `pull_request` trigger has no branch filter, so the stacked PR gets CI.
- `review-desk triage` rows are `{item, disposition: now|defer|drop, reason}`.
- `docs/` is outside the link gate, so the A/B files are safe there.
- Workflow consent is already recorded (`skipWorkflowUsageWarning: true`), so the first launch won't prompt.
- The executor's `<total_tokens>` budget reminder (15M) tracks the main loop only, so it doesn't cap the night.
