## Fold: draft-docs 2b part 1 plan

This record folds the mechanics review (`2026-10-11-draft-docs-2b-part1-review-mechanics.md`) into the plan and its launch prompt, both uncommitted in `overnight-2b-plan` on top of `59d09fa05`. The review raised 25 findings: 1 blocker, 12 majors, 11 minors, and 1 over-ceremony item. The fold takes 23 of them and drops 2 optional ones. No owner fork remains: the conductor ruled M10. No finding changes the approved design (`2026-10-11-overnight-2b-design.md`), which names none of the mechanisms changed here.

### Conductor rulings recorded (not re-opened)

- **Token unit.** Every figure is input + output + cache-creation tokens, excluding cache reads. Workflow figures come from the completion notification's `subagent_tokens`, never the runner's `spent`. The conductor (session 415b194c) writes `night_tokens_at_launch` in that unit from transcript `usage` fields. The executor counts its own loop from `<total_tokens>` deltas.
- **M10: option (a).** Merge condition 3 is dropped. A question with one clearly correct answer is not a fork.
- **DT1 and T0(e).** The dotfiles tooling branch also edits `claude/.claude/agents/cairn-register-editor.md`, and `editorPrompt` carries S1 with "S1 governs over your definition's cap line". So T0(e) allows that one agent file and still stops on `cairn-docs-drafter.md`, `cairn-figure`, and `cairn-docs-outline`.

### Probes

- **B1, the readable-script rule.** The Workflow docs (<https://code.claude.com/docs/en/workflows>, "How a workflow runs") say: "Claude can start a workflow only from a script file the session is already allowed to read. To run a script kept outside your working directory, add its directory with `/add-dir` or a Read allow rule first." The refusal the review quotes names "the working directory or a directory you have added".
- **B1, the `--add-dir` alternative.** It is proven but not used. The agent-view docs (<https://code.claude.com/docs/en/agent-view>, "What carries over when you background") list `--add-dir` and `--settings` among the "Configuration flags from the original launch [that] carry through to the backgrounded session". `claude --help` (v2.1.296) mentions both in `--bg`'s entry.
- **B1, the chosen fold: an in-worktree pinned copy.** It is readable by the docs' own rule, and it serves M11's pin too, so one mechanism covers both. `.superpowers/` is git-ignored (`.gitignore:12`, confirmed with `git check-ignore -v`). The chain script needs no sibling file: it has no `import`, `require`, or `__dirname`, so a relocated copy runs unchanged. It also has no `export const meta`, and it already ran by `scriptPath` in 2a.
- **M2, the guard refusals.** The quoted refusal texts are in transcripts `bcabc73b` and `0d52ae78`.
- **M2, the git dir naming.** `git rev-parse --absolute-git-dir` in the plan worktree prints `/var/home/glw907/Projects/cairn-cms/.git/worktrees/overnight-2b-plan`, so the admin directory takes the worktree's basename. `.git/worktrees/` holds no `draft-docs-2b-part1` today. L0 check 6 confirms the literal path before launch.
- **M3, the prompt extraction.** It ran on R5's `wf_27395374-42e` agent `a4ffbdf718b3520ee`:
  - one string-typed user message;
  - the first line `[Workflow harness — computed task] ...`;
  - every following line two-space indented (0 lines otherwise);
  - no footer.
- **M3, the A/B script.** `sed -n '/^const FRAMING_SCHEMA = {/,/^};/p'` extracts a schema that evaluates under `node` (6 properties). The `jq -Rsr '"const P = " + tojson + ";"'` form was run and emits a valid JS string literal. The `started` journal lines carry `label`.
- **M1 and M5, resume and usage limits.** The workflows docs quote:
  - "In a session you start fresh, Claude has no earlier run to relaunch and starts the workflow over as a new run".
  - The `nothing to resume` error.
  - Replay "in the order agents started".
  - A run "doesn't pause ... in a background session".

  The agent-view docs confirm `claude attach <id>` restarts a stopped session from its saved conversation, and that `CLAUDE_JOB_DIR` is `~/.claude/jobs/<id>`.
- **M6, notification usage.** Agent and Workflow completion notifications both carry `<usage><subagent_tokens>` (R5 session `271e0a93`).
- **M7, the audit report.** `report.ts:12` prints `${finding.ruleId}`, and `config.ts:403` USAGE has `--rule <id>`. ROADMAP:1131-1133 reads "no stable finding codes".
- **M8, the background environment.** The agent-view docs promise only `PATH` and provider variables to a background session, and they list `--settings` as carried.
- **M9, how tellgrader is found.** Both callers find `tellgrader` by PATH lookup, not by an absolute path. `check-tellgrader.mjs:68,80` calls `spawnSync("tellgrader", ...)`, and `cairn-register-editor.md:65` says "`tellgrader --register docs <file>` (on PATH)". So the PATH-prepend fold works for both the chain seat and `check:tellgrader`. The build target is the Makefile's `build` recipe (`go build -o $(BINARY) ./cmd/tellgrader`), with the output moved off the tree.
- **M12, the result file.** Existing workflow task output files (`/tmp/claude-1000/.../tasks/w*.output`) are JSON objects with `summary`, `agentCount`, `logs`, `result`, and `workflowProgress`. So the page records are `.result.pages[]`, and the chain's return is `{ pages, accepted, escalated, spent }` (`:2025`), each record with `id` (`:1942`).
- **m3, the gate wrapper.** `scripts/gate.sh` exports `CAIRN_GATE_LANE=light` before `cairn-run-gate 'bash scripts/check.sh'`.
- **m4, `extraChecks`.** The only `extraChecks` hit in the chain is the comment at `:63`.
- **m7, `ci-green` exit codes.** The header defines exits 1, 2, 3, and 75. The tooling plan's rule (its `:67`) is copied.
- **m10, the pending rows.** `pendingCount` is 104, and the per-slug `pending` rows sum to 102.

### Dispositions

| Id | Disposition | Where the revision carries it |
| --- | --- | --- |
| B1 | Folded: the pinned in-worktree copy, no `--add-dir` | Plan-review fold note; "Arguments for every run"; L0 Files and check 7; hand-run seat dispatch; LP run paragraph; launch-line notes |
| M1 | Folded | "How a stop runs" steps 3 and 5; "Resume"; T0(i) records the session id from `CLAUDE_JOB_DIR`; LP |
| M2 | Folded: literal git-dir paths, the clock reset split into two calls | Stop steps 2 and 6; "Command forms"; LP opening; L0 check 6 |
| M3 | Folded: `jq` plus `sed` extraction, a generated `scriptPath` script, the runner's schema, label, and phase | T2 Method 2 to 4; Acceptance |
| M4 | Folded: T2 runs under T3's clock (T3 at 130), writes the A/B directory's `README.md` (never the stage record), and commits as `2b1-T2:` | T2 Files, Risk/Clock, Method 6; T3 Clock; clock total; LP |
| M5 | Folded | "Escalations": the usage-limit bullet |
| M6 | Folded per the conductor's unit ruling | "Counting"; Budget's executor-loop row; L0 launch facts |
| M7 | Folded: the D8b input reworded to the code. The owner ruling's "no stable finding codes" is carried as "not yet a designed contract" | "Arguments", the D8b line |
| M8 | Folded: `--settings` `env`; a T0(d) miss is a stop | Guards; T0(d); launch line |
| M9 | Folded: L0 builds tellgrader into `.cache/.../bin`, which the launch line puts first on PATH | Guards; L0 check 8; T0(d); launch line; a note on conductor ruling 4 |
| M10 | Folded, conductor ruling (a): condition 3 is dropped | T11 "Merge on approve"; the fold note |
| M11 | Folded: L0 pins the head's script; T0(c) cmps `git show` against the pin and its sha; T1 cmps the persisted script against the pin | L0 check 7; T0(c); T1 step 4 |
| M12 | Folded (tagged optional, but a one-step fix on a proven path) | T1 step 6 |
| m1 | Folded: a hand-run seat takes the runner call's `model`, `effort`, and `agentType` | Hand-run seat dispatch bullet |
| m2 | Folded: no checkout pull; the notification flags a stale checkout for the conductor | T11 merge condition 4 |
| m3 | Folded: `bash scripts/gate.sh` alone | L0 check 2 |
| m4 | Folded: `p.extraChecks` on non-comment lines | T0(f); "Arguments" |
| m5 | Folded: copy from the WIP commit with `git show`; the plan-read asymmetry is recorded | T2 Method 1; Acceptance |
| m6 | Folded: non-empty intros starting with the H1; "not checked: parked" | T2 Acceptance; T3 step 2 |
| m7 | Folded | "Pushes" |
| m8 | Folded: a `/tmp` failure blocks launch, and the conductor asks Geoff about the dubplate data | L0 check 4 and the blocking list |
| m9 | Dropped (optional): the desk's Firefox launch from a supervisor session is unverified, and review-desk is the established hand-over | none |
| m10 | Folded (trivial) | "Map rows pending" |
| m11 | Folded through M4's recount: T2's 30 sits inside T3's 130, and the executor path stays 1,110 | Clock total |
| o1 | Refused: T0(b) already runs `ci-green` without `--wait`, so it is the no-wait read the finding asks for | none |

### Owed

- **ROADMAP D8b erratum (owed, not edited).** ROADMAP.md:1131-1133 says `cairn-audit` has "no stable finding codes", but every finding line prints a rule id, and `--rule <id>` selects by it. The accurate statement is that the report shape is not yet a designed contract. Part 2 or 2b's close should correct the ROADMAP line. The plan's owner-ruling text at "Owner rulings" is left verbatim, and the corrected wording lives in the page input.
- **Seen outside the review, not folded.** The worktree guard refuses `cairn-run-gate '<string>'` in an isolated session, as the dotfiles `scripts/gate.sh` header records. T3 step 2 and T10 still dispatch a `cairn-implementer` with `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate'`. This form ran under 2a's implementers, so the fold leaves it as precedent. If the guard refuses it, the "runner artifact" contract line covers a re-verify.
- **Probe side effect.** While probing `--bg`'s flag handling, the fold ran `claude --bg --help`. That launched an idle background session, `67023f90`, instead of printing help. The fold's attempt to stop it was refused by the permission classifier, so the conductor should run `claude stop 67023f90` and `claude rm 67023f90`. Never probe `--bg` options that way.
