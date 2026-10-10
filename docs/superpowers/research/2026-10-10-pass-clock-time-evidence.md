# Pass clock time: evidence from engine pass B's stopped S1 run

Written 2026-10-10 for the owner and a fresh brainstorm session. Facts and arithmetic only. Times are AKDT
(the run transcripts store UTC; AKDT is UTC minus 8 hours) unless a cell says UTC. "R1" to "R4" name the
four full-gate runs of the one runner chain defined below.

Sources, short names:

- **Run dir:** `~/.claude/projects/-var-home-glw907-Projects-cairn-cms/37332955-28cf-48ec-9e44-d2ff44192385/subagents/workflows/wf_8f149224-e76/`
  (`journal.jsonl`, `agent-a01a1ce18ca4f4bf3.jsonl` classifier probe, `agent-a5ffeed2a1048d132.jsonl` base-SHA
  probe, `agent-ae994036817a0b889.jsonl` implementer).
- **Records:** `~/.local/state/cairn-run-gate/runs.jsonl`, read with `jq`/`python3 -I` and
  `cairn-run-gate --records /var/home/glw907/Projects/cairn-cms/.claude/worktrees/engine-pre-2b-b engine-pre-2b-b`
  (prints `gate 3014s (5 runs), lock wait 785s, ci wait 692s (2 waits), malformed 0`).
- **Runner:** `~/.claude/workflows/pass-execute.js`.
- **Replay:** `docs/superpowers/research/2026-10-09-gate-economy-replay.md`.
- **Plan B:** `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` (in the worktree).
- **Plan GE:** `docs/superpowers/plans/2026-10-09-gate-economy.md`.

## 1. What happened

Run `wf_8f149224-e76` launched S1 of pass B at 13:00. Its journal (`journal.jsonl`, 6 lines) holds three agents:
the classifier probe, the base-SHA probe, and one implementer for the combined runner task "1+2" (plan Tasks 1
and 2, `passClass: "auth-data"`, Plan B lines 139-142). The implementer's transcript runs 13:00:38 to 14:27:54
(87.3 minutes; the last record is the owner's rejection of its tool call). The owner counts 95 minutes from the
launch to the stop at about 14:35; the 7 minutes after the transcript's last record are not in any file I read.
The chain never reached a commit, a diff-reviewer read, or a CI wait. Its edits are WIP commit `dbdc4556` (34
files, 765 insertions, 562 deletions, `git diff --stat 1ce14d3b..dbdc4556`).

Timeline of the implementer. Gate rows come from the transcript's tool calls cross-checked against Records.

| Start | End | Duration | Phase | Result |
|---|---|---|---|---|
| 13:00:28 | 13:00:31 | 3 s | Classifier probe (haiku) | answered `{"exists": false}` (section 2) |
| 13:00:33 | 13:00:37 | 3 s | Base-SHA probe (haiku) | `1ce14d3b5b65` |
| 13:00:38 | 13:03:47 | 3.2 min | Implementer reads and edits (showcase, template, exemplars, create-cairn-site) | |
| 13:03:48 | 13:04:48 | 60 s | Light gate `npm test -w packages/create-cairn-site` | exit 1 (fixture assertions) |
| 13:04:48 | 13:05:34 | 0.8 min | Fix edits, `emit:template` | |
| 13:05:34 | 13:06:07 | 33 s | Light gate `npm run package` | exit 0 |
| 13:06:07 | 13:06:58 | 0.8 min | Builds a scratch consumer site under `~/.cache/engine-pre-2b-b/bake/site` | |
| 13:06:58 | 13:09:11 | 133 s | Light gate `npm install ... && npm run check; npm run build` in the scratch site | CHECK_EXIT and BUILD_EXIT 0 |
| 13:09:17 | 13:09:45 | 28 s | Light gate `npm run check` in the scratch site | exit 0 |
| 13:09:53 | 13:19:27 | 574 s | **R1**, full gate F (string below). Lock wait 362 s, run 212 s | exit 1, failing step `check:docs-gate`, leg `check:facts` ("1 check(s) failed: check:facts") |
| 13:19:34 | 13:21:27 | 1.9 min | Facts edits, `emit:template` | |
| 13:21:34 | 13:37:17 | 943 s | **R2**, full gate F. Lock wait 420 s, run 523 s | exit 1, failing step the component project: "Test Files 2 failed \| 441 passed (443)", one failure `src/tests/unit/audit/own-tree-and-guidance.test.ts:121` (`script_duplicate` in `skills/cairn-admin-screens/references/exemplar-list.md:274`); component Vitest `Duration 275.81s` |
| 13:37:21 | 13:38:02 | 0.7 min | Fix edit to `skill-references-compile.test.ts` | |
| 13:38:03 | 14:14:32 | 2,189 s | **R3**, full gate F. Lock wait 2 s, run 2,187 s (36.5 min) | exit 0 (Records). The last e2e leg printed `337 passed (10.0m)` |
| 14:14:40 | stopped 14:27:54 | 794 s | **R4**, the same F string on the same tree `70b7e1f6`, queued 14:14:40, heavy lock acquired 14:23:43 (about 543 s of wait), 251 s into its run when stopped | never finished; no record (a record is written at the end) |

The F string (`args.gate`, the runner's fallback) is the `full` tier: `check:docs-gate`, `check`, node projects,
the whole component project serialized, `create-cairn-site`'s suite, `admin-visual.spec.ts`, 25 further static
checks, three showcase checks, and last the whole showcase e2e with `--grep-invert "site home|archive page 2"`.
Its full text is in the implementer transcript (tool call at 21:09:53 UTC) and equals `TIER_GATES.full` in
`scripts/checks/gate-tier.mjs`; `docs/internal/pass-gate-tiers.md` ("The pinned tiers") lists it.

Calls on the F string (10 `cairn-run-gate` invocations for 4 runs):

| Call (AKDT) | Returned | Outcome |
|---|---|---|
| 13:09:53 | 13:19:28 | exit 75 ("gate still running after 540s more") |
| 13:19:34 | 13:19:35 | R1 result, exit 1 |
| 13:21:27 | 13:31:28 | harness 600 s tool cap hit, call moved to background (exit not shown) |
| 13:31:36 | 13:37:18 | R2 result, exit 1 |
| 13:38:02 | 13:48:03 | harness 600 s cap, moved to background |
| 13:48:07 | 13:57:08 | exit 75 |
| 13:57:12 | 14:06:13 | exit 75 |
| 14:06:17 | 14:14:33 | returned with the last 30 lines, all e2e test lines, no `gate exit:` line |
| 14:14:40 | 14:24:41 | harness cap, moved to background (R4, a duplicate) |
| 14:24:47 | 14:27:54 | owner rejected the call |

Gate runs recorded for the branch (Records, 5 runs): `create-cairn-site` tests 60 s (exit 1), `npm run package`
33 s (exit 0), R1 574 s (lock wait 362), R2 943 s (lock wait 420), R3 2,189 s (lock wait 2). Sum 3,799 s elapsed;
minus 785 s lock wait gives the tool's "gate 3014s". The two scratch-site gates (133 s, 28 s) carry an empty
branch field, so `--records` does not count them. The tool's `ci wait 692s (2 waits)` belongs to two CI reads
at 20:47 to 20:59 UTC that Task 0 made on `1ce14d3b` before this run launched; the run itself waited on no CI.

## 2. Root cause of the F fallback

One haiku probe decides whether the whole run uses the classifier. The chain of events, with line numbers in
`~/.claude/workflows/pass-execute.js`:

1. `main()` calls `resolveClassifier(args)` once per run (line 1192). `resolveClassifier` (lines 862-875)
   returns `args.classifier` when it is a boolean (lines 863-865); otherwise it spawns a haiku agent at low effort
   with a schema `{exists: boolean}` and returns `!!(probe && probe.exists)` (line 875). Plan B's args list
   (Plan B lines 96-101) names `repo`, `implementer`, `reviewer`, `passClass`, `gate`, `ci`, `maxFix`,
   `stopOnEscalate`, `commonNotes`, and does not set `classifier`, so the probe ran.
2. The probe agent made two tool calls in **one assistant message** (`msg_011CfuEHLczQN6rbTVfkH1GV`, a01a1ce...
   transcript): a `Bash` call `test -f .../scripts/checks/gate-tier.mjs && echo "exists: true" || echo "exists:
   false"` at 21:00:30.872 UTC and a `StructuredOutput` call `{"exists": false}` at 21:00:30.999 UTC, 127 ms later.
   The Bash result `exists: true` arrived at 21:00:31.227 UTC, 228 ms after the verdict was already submitted. The
   haiku model batched its answer with the check and guessed. The file exists
   (`scripts/checks/gate-tier.mjs` in the worktree, listed by `ls`).
3. `classifierExists` is therefore false for the whole run. Consequences:
   - `resolveGate` returns `{gate: t.gate || a.gate, source: "fallback", tier: "default"}` for every task
     (lines 916-918). The runner's independent gate is F.
   - `implementPrompt` renders `""` for the classifier paragraph (lines 527-532): the ternary at 530 renders the
     classifier instruction only when `classifierExists` is true. The implementer's prompt says only "Gate command:
     <F>" (line 524) and "Run the gate through `cairn-run-gate`" (line 533).
   - The caching comment (lines 103-107) calls the probe "run once for the whole run and reused for every task".
     That makes one wrong answer a run-wide answer.
4. Nothing logs or surfaces the probe result in the run output. The implementer never saw the word "classifier".

The single point of failure is therefore `pass-execute.js:862-875` (a probabilistic agent answering a question
`test -f` already answers) feeding `:1192` and read at `:530` and `:916`. The same probe is mirrored in
`pass-execute-chains.js` per the comment at line 860.

What the classifier would have printed, run read-only on the WIP range: `node scripts/checks/gate-tier.mjs
--range 1ce14d3b..dbdc4556 --class auth-data` exits 0 and prints a targeted gate of `npm run package`, `check:close`
with 33 labels, the showcase checks, `test:emit`, showcase `test:unit`, tellgrader, vale rules, node projects, **the
whole component project** (stderr: "whole (nothing under src/ to select from)"), `create-cairn-site`'s suite, and
**the whole showcase e2e** (`test:e2e -- --retries=0 --grep-invert "site home|archive page 2"`). `--protected` prints
nothing (no protected path in the diff). So for this chain the fixed classifier selects nearly the same legs as F
(the admin-visual spec and about 25 CI-only checks are the differences). Arithmetic on the replay's fitted leg
prices (Replay part 4 "Inputs"): fixed 71 s + static about 490 s (range B's 39 checks) + node 270 s + whole
component 235 s + `create-cairn-site` 10 s + whole e2e (188 s + 1.14 s x 337 = 572 s) = 1,648 s, 27.5 minutes,
against R3's measured 2,187 s (36.5 minutes). The F fallback cost this chain about 9 minutes on its one green
run, and nothing on the two red runs, which failed before reaching the e2e leg and would also fail under the
classifier's gate (R1's `check:facts` is in the docs bucket, R2's component project is whole).

## 3. Where the 87.3 minutes went

Implementer window 13:00:38 to 14:27:54 = 5,236 s.

| Bucket | Seconds | Minutes | Share | Basis |
|---|---|---|---|---|
| Full-gate run time (R1 212, R2 523, R3 2,187, R4 partial 251) | 3,173 | 52.9 | 60.6% | Records `end - start - lockWaitSeconds`; R4 from log dir stamps |
| Heavy-lock wait (R1 362, R2 420, R3 2, R4 543) | 1,327 | 22.1 | 25.3% | Records; R4 from `queued` 14:14:40 and `acquired` 14:23:43 in `/tmp/cairn-gate-1000/d060b91a2664b159/` |
| Light gates (60 + 33 + 133 + 28) | 254 | 4.2 | 4.9% | Records and transcript |
| Implementer reading, editing, fixing (residual) | 482 | 8.0 | 9.2% | 5,236 minus the three rows above; the transcript's non-gate spans (3.2 + 0.8 + 0.8 + 1.9 + 0.7 min plus short gaps) agree |
| Other (probes, before implementer start) | 6 | 0.1 | | Run dir timestamps |

Of those 87 minutes, the part that reruns work already done: R4 is a duplicate of a passing run, 794 s (13.2 min,
15%). R1 and R2 are reds that each cost a whole gate (574 s and 943 s, 29 min together, 12 of it lock wait).
R4's cause, as far as the files establish: R3's record shows `exit 0` at 14:14:32; the 14:06:17 call returned at
14:14:33 with the final e2e lines and no `gate exit:` line (the command piped `| tail -30`); the implementer re-issued
at 14:14:40 with a `grep -E "gate exit|..."` filter. The tool header says a finished result "is printed once and then
cleared, so a later call with the same string starts a fresh run" (`cairn-run-gate` lines 8-9), and the log directory
shows a fresh run queued at 14:14:40. I could not establish which of the overlapping calls consumed the `gate exit:`
line. The gate economy post-mortem records the same defect class on the simplifier gate ("`tail` and `grep` cut the
`gate exit:` line, so the gate was issued four times and ran fully two or three times", Plan GE rework table).

## 4. Pass B's plan: what each runner task gate is expected to run, and a projection

Source: each task's `Gate:` paragraph (Plan B lines 619, 664, 719, 783, 841, 870, 914, 966, 1008, 1117, 1231) and
the CI paragraph (lines 132-142). "Whole comp" is the whole component project (about 235 s in the replay, 22 s for
a selected run). "Whole e2e" is the whole showcase suite (337 tests, `playwright test --list` per Replay part 4).

| Runner task | Plan tasks | Whole comp | Whole e2e | Other e2e | CI wait | Why (Plan B) |
|---|---|---|---|---|---|---|
| 1+2 | 1, 2 | yes | yes | | yes | no `src/` path; `wrangler.jsonc` and `.cairn-template.json` select every spec; `auth-data` |
| 3 | 3 | no (selected) | yes | | no | `.cairn-template.json` unmapped showcase path |
| 4 | 4 | yes | no | `golden-path`, `access-map`, `csrf-origin` | yes | `package.json` rerun trigger; `publish.yml` is protected, so the probe reports `ciWait` |
| 5 | 5 | no (selected) | yes | plus the 3 `auth-data` specs | yes | `vite.config.ts` selects every spec; `auth-data` |
| 6 | 6 | no | no | `tidy`, `spellcheck` | no | |
| 7 | 7 | no | no | `src/lib/content/`, `sveltekit/` map entries | no | |
| 8 | 8 | no | no | ten `render/` specs plus 3 `auth-data` specs | yes | `auth-data` |
| 9 | 9 | no | no | theme, content, sveltekit, `audit/` entries | no | |
| 10 | 10 | yes | yes | | no | `CairnAdminShell.svelte` matches `src/lib/admin/**`; `hooks.server.ts` selects every spec |
| 11 | 11 | yes | no | `golden-path`, `access-map`, `csrf-origin` | no | two package READMEs; docs checks |

Per-chain gate floor, built from the replay's two timed ranges (A: 977 s, 6 component files, 56 e2e tests; B:
1,506 s, whole component, 216 tests; Replay part 2), swapping legs at the fitted prices. The e2e count of the
spec-selected rows is not in any file; those rows use range A or B as an upper bound and are marked "est".

| Runner task | Base | Swaps | Seconds | Minutes |
|---|---|---|---|---|
| 1+2 | B 1,506 | e2e 435 to 572 (+137), `create-cairn-site` +10 | 1,653 | 27.6 (matches the 1,648 s classifier arithmetic in section 2) |
| 3 | A 977 | e2e 252 to 572 (+320) | 1,297 | 21.6 |
| 4 | A 977 | comp 22 to 235 (+213), e2e 252 to about 202 (-50, est 12 tests), ccs +10 | 1,150 | 19.2 |
| 5 | A 977 | e2e 252 to 572 (+320), ccs +10 | 1,307 | 21.8 |
| 6 | A 977 | none (upper bound) | 977 | 16.3 (est) |
| 7 | A 977 | none (upper bound) | 977 | 16.3 (est) |
| 8 | A 977 | none (upper bound), 13 specs about 60 tests | 990 | 16.5 (est) |
| 9 | A 977 | ccs +10 | 987 | 16.5 (est) |
| 10 | B 1,506 | e2e 435 to 572 (+137), ccs +10 | 1,653 | 27.6 |
| 11 | A 977 | comp +213, e2e about -50 (est), ccs +10 | 1,150 | 19.2 (est) |
| **Sum** | | | **12,141** | **202.6 (3.4 h), mean 20.3 min** |

With the fallback on every chain: 10 chains x R3's 36.5 min = 365 min; the classifier saves about 162 minutes (2.7
h) of gate run time across the pass at these prices, on top of whatever reds and reruns add.

Non-gate rows and CI, with their sources:

- Task work and review: 20 minutes per task, 11 tasks = 220 minutes (Replay part 4: "a 60-minute chain less the
  40-minute midpoint of its 30-to-50-minute gate"; `2026-10-09-gate-economy-pass-inputs.md` line 17: 8 chains,
  about 8 h, about 60 min each). This run's own implementer work for tasks 1+2 was 8.0 minutes of edits plus 4.2
  minutes of light gates before its first full gate (section 3); no reviewer ran, so review time is not measured here.
- CI wait per strict read: 692 s for the two Task 0 reads (this branch, Records), or 663 s test job (Replay part 4);
  worst case 1,895 s = 663 s plus the longest queue seen, 1,232 s (Replay part 4). Plan B makes four strict task
  waits (runner tasks 1+2, 4, 5, 8; Plan B lines 134-142, 783-790) and four segment-boundary reads (Plan B lines
  62-68).
- Lock wait: this run saw 785 s over 3 recorded runs (4.4 minutes per run), plus 543 s for R4.
- Fix rounds: `maxFix: 1`; pass A had four reviewer fix rounds in 12 tasks and three S2 fix rounds (Replay part 4),
  priced there at 15 minutes of work each; I price a reduced re-gate at 16 minutes.
- Close: Replay part 4 rows, three close gates 67 minutes, reviewers and smoke 90 minutes, fix-chain work 60 minutes,
  total 217 minutes.

Projection with the classifier working. A model, not a measurement.

| Row (minutes) | Low | Mid | High |
|---|---|---|---|
| Chain gates (section 4 sum) | 203 | 203 | 203 |
| Task work and review (11 x 20) | 220 | 220 | 220 |
| Strict task CI waits (4 x 11.5 low and mid; 4 x 31.6 high) | 46 | 46 | 126 |
| Boundary CI reads (4 x 11.5 mid; 4 x 31.6 high) | 0 | 46 | 126 |
| Fix rounds (3 x (15 work + 16 gate), mid and high) | 0 | 93 | 93 |
| Lock wait (10 x 4.4, mid and high) | 0 | 44 | 44 |
| Close (67 + 90 + 60) | 217 | 217 | 217 |
| **Total minutes** | **686** | **869** | **1,029** |
| **Hours** | **11.4** | **14.5** | **17.2** |

Low assumes the runner pipelines boundary reads behind review and nothing goes red. For reference, the conductor's
projection that stopped the run was 12 to 18 hours, and the pass A projection on the new gates was 14.8 to 19.0
hours (Replay part 4), with a 9-hour target that Replay part 4 and Plan GE (line 975) both record as missed.

## 5. Historical clock

| Pass | Wall or clock | Estimate | Source |
|---|---|---|---|
| Gate economy (PR #110) | 4 h 37 min from first implementer dispatch to the fold; 662 s lock wait; about 12 min strict CI wait; about 37 min itemized rework; Task 0 about 13 min | 4.8 h | `docs/HISTORY.md:73-76`; Plan GE lines 1146-1156 |
| Engine pass A (PR #108) | about 28 h wall from first commit 10-08 07:49 to the last close fix round 10-09 about 11:30; about 17 h executing from Task 3's relaunch; about 5.5 h rework (S2 reds about 1 h, Task 11 about 1 h, close fix chains about 3.5 h); gate time and lock wait not summed (records did not exist) | none (first pass scored on clock) | `docs/HISTORY.md:159-163`; Plan A lines 1699-1713 |
| SvelteKit 3 upgrade (PR #103) | S1 alone about 3.5 h of clock, "most of it three full gates with an 11-minute e2e each, one doubled by a re-issue" | none found | `docs/superpowers/plans/2026-10-03-sveltekit-3-upgrade.md:1364-1365` |
| Stage 2a unattended finish | a weekly rate-limit outage cost "roughly 8 hours of wall clock and one duplicated dispatch" (clock total not stated in the HISTORY entry) | not found in HISTORY | `docs/HISTORY.md:3128-3129` |

Two of the four entries carry a re-issue or duplicated dispatch as a named clock cost, and the gate economy
entry's rework table names the `gate exit:` cut line as a process miss.

What the gate economy pass promised for clock: its goal was "about half of pass A's" gate clock (Plan GE line 3)
with a 4.8 h estimate for itself, and Replay part 2 measured the per-task targeted gate at 16.3 min (range A, 6
component files, 56 e2e tests) and 25.2 min (range B, whole component, 216 e2e tests, plus 11.0 min lock wait),
both over the 10-minute target. Plan B repeats those two numbers (Plan B lines 150-155). The CI `test` job
takes about 11 min (663 s, Replay part 4); the local full gate takes about 45 min (Replay part 4 calls pass A's
boundary gates "about 45 minutes each"; this run's R3 measured 36.5 min of run time without the dubplate session
overlapping).

## 6. Other contributors

- **Lock contention with the dubplate session.** The heavy lock is machine-wide. Records show dubplate gates on
  the lock around R1 to R3: 13:08:31 to 13:15:55 (held while R1 waited), 13:19:29 to 13:28:33 (held while R2 waited),
  13:37:18 to 13:38:04 (46 s), and dubplate's `scripts/check.sh` gate queued 13:38:34, waited 2,158 s behind R3,
  and ran 14:14:32 to 14:23:42 (550 s). R4 then waited 543 s behind that run.
  Pass B's lock waits this run total 785 s recorded plus 543 s unrecorded; dubplate's total in the same window is
  496 + 204 + 2,158 s. The two projects' gates also queued behind each other, so the 36.5 min R3 cost dubplate 36 min
  of wait.
- **Whole-suite selection on showcase paths.** Per the plan's own Gate lines, four of ten runner tasks (1+2, 3, 5,
  10) run the whole e2e suite (about 10 min, `337 passed (10.0m)` in R3) and four (1+2, 4, 10, 11) the whole
  component project, because `examples/showcase/**` source paths, `wrangler.jsonc`, `.cairn-template.json`,
  `vite.config.ts`, `hooks.server.ts`, and any `packages/**` README with no `src/` path select them
  (`docs/internal/pass-gate-tiers.md`, "The component project" item 4 and "The e2e map"). The classifier run on the
  WIP range confirms it for chain 1+2 (section 2). Replay part 4 recorded five of 18 pass A ranges running the whole
  e2e suite and eight the whole component project.
- **The fix rerun of the whole gate.** R1 failed in its first docs-gate leg, 212 s into the run, and R2 reran every
  leg from the start. R2's failure was in the component leg, after about 12 minutes of preceding legs; R3 reran
  those again. `cairn-run-gate` has no resume. Each fix cost a full gate plus a lock wait (R1 to R2: 943 s; R2 to R3:
  2,189 s). Two reds came from legs the implementer's light gates did not run (`check:facts`, the component
  project). The light gates it chose were `create-cairn-site` tests, `package`, and a scratch-site check and build.
- **Harness 600 s tool cap.** Three of the ten full-gate calls (13:21:27, 13:38:02, 14:14:40) hit the shell tool's
  600 s timeout and were moved to background, which `cairn-run-gate` (540 s default wait) does not plan for. The
  background task output files carry only the "gate started / still running" lines, not the exit.
- **Duplicate `gate exit:` loss.** Section 3. Same class as the gate economy post-mortem's simplifier incident.
- **No reviewer, no CI wait ran.** The 87 minutes are a lower bound on the S1 chain; the diff-reviewer read, a fix
  round, and the strict CI wait for tasks 1+2 would all follow.

## 7. The `cairn-run-gate` argument snag

`~/.local/bin/cairn-run-gate` has no `--help`. Its usage block (lines 23-26) lists the gate form, `--receipt
'<gate string>'`, and `--records <toplevel> <branch>`. Any other first argument is taken as a gate string and
queued on the heavy lock. The task brief records that this happened today with a `--help`-style argument. I found
no `"gate": "-..."` line in `runs.jsonl` (the run had not finished, or was killed, so no record was written) and
did not reproduce it. The tool header states the contract: "`cairn-run-gate '<gate string>'`" starts a detached
gate keyed by string and working directory (header lines 4-9). This is a cairn friction candidate for
`docs/internal/docs-friction-log.md` (a DX snag: an unrecognized flag becomes a gate).

## 8. Questions for the brainstorm

1. Should the classifier-exists decision be a `test -f` in the runner (no agent), given the probe lost a race
   between its own tool call and its own verdict?
2. If the classifier had worked, chain 1+2 still selects the whole component project and the whole e2e suite
   (about 27.5 minutes); is a showcase source path the right trigger for the whole suite, or should the e2e map name
   specs for `wrangler.jsonc`, `.cairn-template.json`, and `vite.config.ts`?
3. Should `cairn-run-gate` print the `gate exit:` line again (or refuse a duplicate run of a tree it just passed) so
   `tail`/`grep` pipes and a lost result cannot start a fresh 36-minute run?
4. Both reds (R1 `check:facts`, R2 the component project) were caught only by the full gate; should the implementer
   run the docs gate and the selected component files before the first heavy gate, so a red costs seconds?
5. Should the runner run the gate legs in dependency order and cache green legs per tree, so a fix to one leg does
   not rerun the legs before it?
6. The projection with a working classifier is 11.4 to 17.2 hours and 8.0 to 11.5 of those hours are task work,
   review, close, and CI waits (220 + 217 + 46 to 252 minutes); is the 9-hour target still the target, and which row moves?
7. The heavy lock is shared across projects and cost this run 22 minutes: do cairn passes need a second lane, a
   queue priority, or a rule about when another project's session may run?
8. The harness cap (600 s) splits every full gate across several calls; should `CAIRN_GATE_WAIT` default below 600
   s minus the lock wait so the first call returns exit 75 instead of being backgrounded?

9. The conductor's two fallback ticks (13:31 and 14:02) checked only that the implementer was alive, and the
   12-to-18-hour projection went to the owner as an estimate. `pass-core` now makes a chain past twice its estimate,
   or a running fallback gate, a stop-or-fix event (dotfiles `7b40996`); should the runner itself enforce a per-chain
   clock budget, since a plan header carries an estimate?

## 9. Not established

- The reviewer's time per chain: no diff-reviewer ran in this run, so the 20-minute task-work-and-review figure is
  pass A's, not this run's.
- Which of the overlapping calls consumed R3's `gate exit:` line.
- The per-leg times inside R3 (its log directory was overwritten by R4, which reuses `d060b91a2664b159`); only R3's
  e2e total (10.0 min) and R2's component total (275.8 s) were captured.
- The exact e2e test counts for the spec-selected tasks (4, 6, 7, 8, 9, 11); their rows use upper-bound bases.
- Whether the harness 600 s cap interacts with the lock wait the way I describe; the transcripts show the cap
  firing but not why the first call's 540 s wait did not return earlier.
- The owner's 14:35 stop time versus the transcript's 14:27:54 end.
