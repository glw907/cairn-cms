# Pass 1b plan review: domain risk (measurement integrity)

**Target:** `docs/superpowers/plans/2026-09-24-docs-reset-pass-1b.md` at `dc37e38b`. **Spec
(fixed):** `docs/superpowers/specs/2026-09-24-docs-reset-pass-1b-validation-design.md`. **Lens:**
where execution can leak into or corrupt the pre-registered measurement despite the spec.
**Reviewer:** one `claude-opus-5-5` read, checked against the runner in `scripts/docs-readers/`.

**Counts:** 3 blockers, 7 majors, 7 minors. Two OWNER FORKs (M3, m7).

The spec's design holds up. The risk is in the plan's mechanics. Several score-affecting inputs
have no author and no builder. Several post-freeze inputs have no enforced hash. The judges and
every blind agent run outside the runner's controls, so their blindness depends only on the
instructions they are given.

## Blockers

### B1. No task authors or builds the planting side of the freeze

- **Where:** plan:275-284 (Task 8) and plan:298-309 (Task 10), against spec:136-138 and
  spec:226-233.
- **Defect:** the spec's freeze list requires the planter prompt, the miner prompt, the miner's
  exclusion script, and the plant-type definitions. Task 10 also uses a validity script, a plant
  check prompt, and (Task 7) a read-pages script. No task builds or authors any of them:
  - Tasks 1 to 4 build none of them.
  - Task 5's rubric author drafts only the judges' prompts.
  - Task 8 only hashes what exists.

  So Task 8's acceptance ("the reviewer names none missing") cannot pass. The likely workaround is
  that the conductor writes the planter, miner, and plant-check prompts into its dispatches. That
  breaks plan:72-73: the conductor has read the development set, and it would be authoring a
  score-affecting prompt after the tag. The exclusion script also needs a table of each
  development item's page and line span, carried to a common commit. Nobody is assigned to build
  it.
- **Fold:**
  - Add the scripts to a build task. The exclusion script plus its development-item location
    table, the validity script, and the read-pages script go into Task 3, or into a new Task 4b
    lane. The location table is derived by script from the records, and the implementer may read
    the records.
  - Add a pre-freeze authoring step: Task 5's rubric author, or a second fresh `claude-opus-5-5`
    agent, drafts the planter, miner, and plant-check prompts and the plant-type definitions from
    the spec alone. A `diff-reviewer` checks them against the bans.
  - Task 8's acceptance lists each file by path.
  - Every blind dispatch after the freeze is a fixed wrapper rendered by script: "read `<frozen
    file>`, whose sha256 is `<x>`, and follow it." The conductor adds no text of its own.

### B2. The automatic single rerun does not exist, and no task builds it

- **Where:** plan:293 (Task 9: "reruns follow the spec's rule"), plan:323 (Task 11), against
  spec:152-156.
- **Defect:** `lib/runner.ts` has no attempt or rerun logic. Pass 1 ran its reruns as a separate,
  hand-built batch (`batches/validation-rerun.json`). If the pass works the same way, the
  conductor chooses which runs to rerun. That is the selection lever the spec closed at IN-M7
  ("Reruns are the runner's alone").
  - A `rateLimit`, `auth`, or `budget` stop is also a hazard. The runner marks every job it has not
    started as `notStarted` (runner.ts:239-241). Under the scoring rules, a gated planted run that
    never produces a report catches nothing, so a batch that stops early fails sensitivity through
    the harness, not the reader.
- **Fold:** add the runner mechanism to Task 4. Its scope is `lib/runner.ts`, which Task 4 already
  touches.
  - An unverified, crashed, or timed-out run, or one with no report, gets exactly one automatic
    rerun inside the same batch. Every attempt is kept and indexed.
  - A batch-level stop is not an attempt. The runner resumes only the jobs it had not started, and
    the record lists the stop.
  - Gated batches set `budgetTokens` above their expected spend. The spec's cuts are the only
    budget mechanism.
  - Acceptance: a fixture batch with one crashed job reruns it exactly once. A second crash is
    final. A fixture rate-limit stop resumes without consuming an attempt.

### B3. The plan gives held-out criteria to the blind planter, after the held-out runs

- **Where:** plan:305-306 (Task 10: the planter writes "criteria for the nine held-out defects"),
  plan:290-291 (Task 9 runs the held-out scripter runs), against spec:240-241 ("before their
  runs") and spec:214-217.
- **Defect:** the plan has two faults here.
  - **Timing:** the criteria are written in Task 10, after Task 9 has already run the held-out
    scripter runs. The spec says the criteria are written before those runs.
  - **Blindness:** the nine held-out defects (D01 and the others) are development-set items. The
    planter can write criteria for them only by reading pass A's ground truth, and the spec forbids
    the planter from seeing development-set records. The blind planter would then place the 42
    gated plants with those defects in mind.
- **Fold:** Task 5's rubric author, who is already allowed to read the development set, writes
  the held-out criteria beside the round-0 criteria. They are hashed into the freeze manifest. The
  planter's inputs return to the spec's list.

## Majors

### M1. Post-freeze inputs have no enforced manifest

- **Where:** plan:206-209 (Task 4), plan:289-296 (Task 9), plan:308-309 (Task 10: "the record's
  hash enters the planted batch's manifest"), plan:182-187 (Task 3 scorer).
- **Defect:** `freeze.ts` writes one manifest at the tag. Several score-affecting inputs are
  created after the tag:
  - the path maps;
  - any recomputed thresholds;
  - the planted batch file, since Task 8 builds only the mapping batches;
  - the planted overlays and prepared trees in `~/.cache`;
  - the test plant record and its criteria;
  - the mapping-run results that feed the adjudicator and the precision pool.

  No mechanism adds any of these to a manifest. If the manifest is rewritten, the tag no longer
  covers it, and verifying against it proves nothing. The scorer checks only that a report carries
  a stamp. It never checks the plant record, the maps, the thresholds, or the rulings files it
  reads against a hash. So a criterion edited after the planted runs, or a report swapped for a
  later stamped attempt, passes every check.
- **Fold:**
  - `freeze.ts --extend` writes an append-only addendum. It may add new keys but never change a
    frozen key. Each addendum is committed, and the runner stamps the latest addendum's hash into
    every gated report.
  - Hash each prepared tree by its synthetic commit's tree id. This is cheap once B2's export is in.
  - Hash each batch's results index (every attempt, and which attempt is final) at batch end.
  - The scorer verifies every input it reads against the addendum chain and refuses on drift.
  - Acceptance: a fixture where one criterion changes after the addendum makes the scorer refuse
    and name the input.

### M2. The judges and the Fable read run outside every control the runner has

- **Where:** plan:229-236 (Task 5), plan:328-330 (Task 12), against spec:256-267 and spec:354-365.
- **Defect:** the catch judge, the adjudicator, and the agreement read are Agent dispatches, not
  runner batches. The runner's refusal and stamp therefore never apply to them. The plan leaves
  four gaps:
  - Nothing proves a dispatch used the frozen prompt text.
  - Nothing says who assembles each judge's inputs. The default is the conductor, which counts as
    authoring score-affecting input.
  - The saved reports carry `model` and `id`, which is how the Sonnet arm is identified. A judge
    given a report file, or a path into `~/.cache/docs-readers/results/<batch>/`, sees both.
  - Nothing limits re-dispatching a judge whose ruling looks wrong. That makes an unbounded
    re-roll lever.
- **Fold:** build `judge-packets.ts` in Task 3.
  - It renders each dispatch from the frozen prompt file and records the prompt's sha256.
  - It builds anonymized packets holding only the spec's inputs. Item ids are shuffled with a
    seeded shuffle, and `model`, run id, and batch name are removed.
  - It writes a rulings file per packet.
  - Each packet gets one judge read. It gets exactly one rerun only when the output fails to parse,
    and the rerun is logged.
  - The rulings files are hashed into the addendum (M1) before the scorer runs and before the
    agreement sample is drawn.
  - Pin the agreement pool before any ruling exists. For example: development and transfer
    mapping runs for findings, and development planted Opus runs for catch calls. A pool chosen
    after the rulings exist can move kappa.

### M3. Blindness depends on instructions alone, and the miner's full history reads everything

- **Where:** plan:67-71, plan:300 (miner: "full git history"), plan:264-267 (Task 7), plan:301-303
  (planter), against spec:226-229.
- **Defect:** every blind agent is an Agent subagent with Read, Grep, and Bash on the host. Each one
  can reach the following:
  - the worktree's `docs/internal/record/` development records;
  - `scripts/docs-readers/batches/`, where Task 8 puts the transfer and test job texts;
  - `~/.cache/docs-readers/results/`, the reports;
  - the reader prompt in `lib/runner.ts`.

  The miner is the sharpest case. The spec gives it "the full git history", and the development
  records are committed in that history. `git log -p -- docs/` returns pass 1's planted-defects
  record verbatim, and the batch files in the tree hold every job text the spec keeps from the
  miner. The only barrier is the dispatch prompt. The Agent tool also loads this project's
  `CLAUDE.md` and the `MEMORY.md` index into every subagent. That leak is mild: the index names the
  docs reset but no development item.
- **Mitigations already in place:** the exclusion script (commit and span) and the blind plant
  check (shared subject) catch the most direct result, a plant that overlaps a development item.
  They do not catch the planter tuning placement to job texts or reports.
- **Fold:**
  - Run the miner in a mirror built with `git filter-repo --invert-paths`. The mirror drops
    `docs/internal/record`, `docs/superpowers`, `scripts/docs-readers`, `docs/HISTORY.md`,
    `docs/STATUS.md`, `ROADMAP.md`, `docs/internal/docs-friction-log.md`, and
    `src/tests/unit/docs-readers-*` from all history. Build it at the freeze commit, and put the
    mirror's head commit in the addendum.
  - The planter, the plant check, and the transfer job author get a working directory that holds
    only their granted inputs.
  - **OWNER FORK:** choose how blindness is enforced.
    - **(a) Transcript audit (recommended).** A script scans each blind agent's subagent transcript
      for tool calls on forbidden paths, and a hit discards that agent's output. It is cheap, and
      it makes each blindness claim checkable after the fact.
    - **(b) Run the blind agents as containerized jobs through the reader harness,** with only
      their inputs mounted. This is the strongest option, but it is a new build task and costs
      more tokens.

### M4. The threshold recompute fires on the wrong trigger and too early

- **Where:** plan:291 and plan:295 (Task 9), against spec:196-209.
- **Defect:** Task 9 recomputes thresholds only "if any map cannot hold seven plants". The
  achieved plant count is known only after Task 10: the planter can fall short, a failed plant can
  prove unreplaceable, and the mapping-run finding spans reduce capacity further. Nothing
  recomputes the thresholds at the achieved counts before Task 11. The scorer would then gate 40
  plants at 31 of 42, or someone would compute the thresholds after seeing results.
  `path-map.ts` also has no capacity function: it does not apply the spacing rules minus the
  finding spans. Without one, "cannot hold seven" in Task 9 has no mechanical test.
- **Fold:**
  - Add a capacity function to Task 3's `path-map.ts`.
  - At the end of Task 10, after the validity check, run `oc-curve.ts` at the achieved per-job
    and per-class counts every time, not only on a shortfall.
  - Commit the output, hash it into the addendum before Task 11, and have the scorer read the
    thresholds only from that file.

### M5. The close omits the spec's frozen-path check, and its replay creates a second score set

- **Where:** plan:341-349 (Task 13), against spec:147-148 and spec:403-405.
- **Defect:** the plan has two faults here.
  - **The missing check:** the spec requires the close's `diff-reviewer` to confirm that no
    frozen path changed after the tag. Task 13's only `diff-reviewer` reads the fold's diff.
  - **The replay:** "The regression batch (the frozen test batch) replays through the runner"
    reruns about 24 planted runs (about 1.1M tokens, which the budget does not include) and
    produces a second result set after the verdict. Nothing says the replay cannot be scored or
    quoted against the record. The spec asks only that the frozen batch become the floor for later
    changes.
- **Fold:**
  - Task 13 runs a mechanical check: the paths from `git diff --name-only
    docs-reset-1b-freeze..HEAD`, intersected with the manifest and addendum paths, must be empty.
    It also runs `freeze.ts --verify` at HEAD. The `diff-reviewer` confirms both results.
  - Replace the replay with a load-and-verify dry run of the regression batch. If a replay is
    wanted, label it a smoke test that never enters pass 1b's record.

### M6. Task 12's dispute path allows post-hoc re-ruling

- **Where:** plan:334-335 ("a disputed verdict goes to `xhigh`, then one `fable` read").
- **Defect:** after the scores are visible, the plan lets a verdict be taken to `xhigh` and then
  to Fable. The plan does not say what may be disputed. That leaves room to re-rule items, a
  judge, or a class toward "validated". The spec allows exactly one replacement of a primary
  ruling: Fable's rulings on the agreement sample. It also forbids any fix after the freeze.
- **Fold:**
  - Limit disputes to transcription: whether the record matches the scorer's committed output.
  - The scorer's output decides every class verdict. No agent overrides an item ruling or a class
    verdict.
  - Any suspected judge defect found after the freeze is recorded as a finding for pass 2a and
    never corrected in pass 1b.

### M7. The plan never pins the repository-class commit, and the export carries pass 1b material

- **Where:** plan:142-149 (Task 2), plan:136-137 (Task 1 fixture), plan:76-77.
- **Defect:** the plan never names the commit that the repository and docs-and-site trees export,
  or the commit behind the planter's export. If the pin is a `docs-reset-1b` commit, three things
  leak into the reader's tree, because none of them is in `REPOSITORY_EXCLUDED_PATHS`
  (prepare-class.ts:414):
  - `src/tests/unit/docs-readers-*.test.ts`, which describes planted overlays and harness
    mechanics;
  - Task 1's development-set subject fixture, if it is placed under `src/tests/`;
  - `docs/internal/docs-friction-log.md`, which names pass 1b and "the real page defects its
    readers found".

  Those test files also import the excluded `scripts/docs-readers/`, so `npm test` fails on them
  inside the export. That is the pass 1 harness artifact the spec cites at spec:26. The maps,
  plants, and planted runs must also share one commit, or `page:line` spans drift between mapping
  and planting.
- **Fold:**
  - Pin one pre-pass commit for every page export, and record it in the freeze. The candidate is
    `main` at `3a7485dd`. The planter's export uses the same commit.
  - Put every new fixture under `scripts/docs-readers/fixtures/`.
  - Add `src/tests/unit/docs-readers-*` and the friction log to the gated export exclusions, and
    therefore to the absent lists. This is a pre-freeze harness fix and falls under the
    conductor's delegated methodology.

## Minors

### m1. The Task 1 ban grep should cover every frozen text

- **Where:** plan:136-137, plan:251-253, plan:271-272.
- **Fold:** run the same test over the round-2 bundle, the transfer job texts, and every frozen
  prompt, as a mechanical floor under the `diff-reviewer`'s judgment.
- **Why:** a round-2 tuner can paraphrase a development item past a word list, so the reviewer's
  read remains the real check. Hand that reviewer the full development-item list.

### m2. The synthetic commit is not checked for neutrality

- **Where:** plan:157.
- **Fold:** the acceptance also checks that the commit message is neutral (never "planted" or
  "control"), that the date is fixed, and that control and planted trees carry identical commit
  metadata.

### m3. The keep rule and the round-2 trigger are not assigned to the scorer

- **Where:** plan:250-253.
- **Fold:** the scorer computes both the keep rule and the round-2 trigger, and the record quotes
  its output. The conductor does not compute either.

### m4. Fixes to the judge prompts during tuning are unaudited

- **Where:** plan:229-244, spec:117-119.
- **Defect:** the spec allows a judge defect to be fixed during tuning. Because the rescore runs
  on the development set, a fix can quietly tune the judge on that set.
- **Fold:** log each change with the misruling class it fixes. A `diff-reviewer` confirms the
  change names no development item and was applied to every round.

### m5. The scorer's unstamped mode is an escape hatch

- **Where:** plan:183, plan:236.
- **Defect:** Round 0, rounds 1 and 2, and pass 1's saved reports are unstamped, so Task 5 needs
  a development mode.
- **Fold:** the development mode's output is labeled and can never emit a bar verdict. Gated mode
  requires both a stamp and a gated batch name.

### m6. The read-pages list misses pages outside the docs set

- **Where:** plan:266-267.
- **Defect:** `derivePagesRead` (transcript.ts:388) counts only pages in the docs set. Repository
  and docs-and-site readers read other docs, so a transfer job can land on a page a development
  run read.
- **Fold:** derive the list from the raw Read and Grep calls.

### m7. OWNER FORK: the ceiling during gated work

- **Where:** plan:28-31.
- **Defect:** after the three cuts, nothing covers spend that reaches 10M during Task 11 or Task
  12. Stopping there leaves a partial gated batch or a partial set of rulings, and that corrupts
  sensitivity.
- **Recommendation:** finish the development Opus planted batch, the judging, and the agreement
  read past the ceiling, and report the overrun. The alternative is to stop and record every class
  advisory.

## Checked and sound

- **The development-set exclusion in the existing export.** `docs/internal/record`,
  `docs/superpowers`, and `scripts/docs-readers` are excluded, and an assertion enforces it
  (prepare-class.ts:414-428).
- **Reader mounts.** Only the per-run copy is mounted. The docs-only, docs-and-site, and
  repository classes have Anthropic-only egress.
- **The cuts.** They drop only non-gated items: round 2, the Sonnet arm, and transfer planting.
  The gate's development mapping and planted runs are never cut.
- **Task 4's acceptance.** It pins the spec's recomputed thresholds exactly.
